'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Feuillet } from '@/types'
import { FileDown, Edit, Trash2 } from 'lucide-react'

interface Props {
  feuillets: Feuillet[]
}

export default function HistoriqueClient({ feuillets: initial }: Props) {
  const [feuillets, setFeuillets] = useState(initial)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDownload(id: string, numero: number, paracha: string) {
    setDownloading(id)
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feuilletId: id }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feuillet-${numero}-${paracha || 'chabbat'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors de la génération du PDF')
    } finally {
      setDownloading(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce feuillet définitivement ?')) return
    setDeleting(id)
    try {
      await fetch(`/api/feuillets/${id}`, { method: 'DELETE' })
      setFeuillets(prev => prev.filter(f => f.id !== id))
    } catch {
      alert('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  if (feuillets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-400">Aucun feuillet dans l'historique</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-5 py-3 font-semibold text-gray-600">N°</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Paracha</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Date Chabbat</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Rubriques</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Statut</th>
            <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {feuillets.map(f => (
            <tr key={f.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-3 font-medium text-gray-700">#{f.numero}</td>
              <td className="px-5 py-3">
                <div className="font-medium text-gray-800">{f.paracha_fr || '—'}</div>
                {f.paracha_he && <div className="text-gray-400 text-xs" dir="rtl">{f.paracha_he}</div>}
              </td>
              <td className="px-5 py-3 text-gray-600">
                {f.date_shabbat
                  ? new Date(f.date_shabbat).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1">
                  {(f.rubriques_p1 || []).filter((r: any) => r.actif).map((r: any) => (
                    <span key={r.id} className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">{r.titre}</span>
                  ))}
                  {(f.encadres_p4 || []).map((e: any) => (
                    <span key={e.id} className="text-xs bg-yellow-50 text-yellow-700 rounded px-1.5 py-0.5">{e.titre}</span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  f.statut === 'publie' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {f.statut === 'publie' ? 'Publié' : 'Brouillon'}
                </span>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDownload(f.id, f.numero, f.paracha_fr)}
                    disabled={downloading === f.id}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    {downloading === f.id ? '…' : 'PDF'}
                  </button>
                  <Link href={`/feuillet/${f.id}`}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                    <Edit className="w-3.5 h-3.5" />
                    Modifier
                  </Link>
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={deleting === f.id}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
