'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Feuillet, Organisation } from '@/types'
import BandeauForm from './BandeauForm'
import RubriquesP1Form from './RubriquesP1Form'
import DvarTorahForm from './DvarTorahForm'
import DedicaceForm from './DedicaceForm'
import EncadresP4Form from './EncadresP4Form'
import { Save, FileDown, AlertCircle, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'

interface Props {
  feuillet: Partial<Feuillet>
  organisation: Organisation
  mode: 'nouveau' | 'edition'
}

function estimerRemplissage(dev: string): 'court' | 'bon' | 'long' {
  const chars = dev.length
  if (chars < 1000) return 'court'
  if (chars > 6000) return 'long'
  return 'bon'
}

const LOCAL_KEY = (id?: string) => `feuillet_draft_${id || 'nouveau'}`

export default function FeuilletEditor({ feuillet: initial, organisation, mode }: Props) {
  const router = useRouter()
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  const defaultData: Partial<Feuillet> = {
    paracha_fr: '',
    paracha_he: '',
    date_shabbat: '',
    heure_entree: '',
    heure_sortie: '',
    roch_hodech: { actif: false, nom_mois: '', jours: '', nolad: '' },
    rubriques_p1: [],
    dvar_torah: {
      verset_hebreu: '',
      traduction: '',
      developpement: '',
      signataire: organisation.signataire_defaut || ''
    },
    dedicace: { actif: false, texte: '', placement: 'page1' },
    encadres_p4: [],
    ...initial,
  }

  const [data, setData] = useState<Partial<Feuillet>>(defaultData)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(initial.id || null)
  const [error, setError] = useState('')

  // Charger le brouillon local au démarrage
  useEffect(() => {
    const key = LOCAL_KEY(initial.id)
    const draft = localStorage.getItem(key)
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        // Seulement proposer le brouillon si c'est un nouveau feuillet ou si le draft est plus récent
        if (mode === 'nouveau') {
          setData(parsed)
          setHasDraft(true)
        }
      } catch {}
    }
  }, [])

  // Auto-sauvegarde locale à chaque changement (500ms debounce)
  const update = useCallback((patch: Partial<Feuillet>) => {
    setData(prev => {
      const next = { ...prev, ...patch }
      // Sauvegarder dans localStorage avec debounce
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      autoSaveRef.current = setTimeout(() => {
        localStorage.setItem(LOCAL_KEY(initial.id), JSON.stringify(next))
      }, 500)
      return next
    })
    setSaved(false)
  }, [initial.id])

  function clearDraft() {
    localStorage.removeItem(LOCAL_KEY(initial.id))
    setHasDraft(false)
    setData(defaultData)
  }

  const remplissage = estimerRemplissage(data.dvar_torah?.developpement || '')

  async function handleSave(statut: 'brouillon' | 'publie' = 'brouillon') {
    setSaving(true)
    setError('')
    try {
      const payload = { ...data, statut }
      let res
      if (savedId) {
        res = await fetch(`/api/feuillets/${savedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/feuillets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) throw new Error(await res.text())
      const saved_data = await res.json()
      setSavedId(saved_data.id)
      setSaved(true)
      // Effacer le brouillon local après sauvegarde réussie
      localStorage.removeItem(LOCAL_KEY(initial.id))
      setHasDraft(false)
      if (mode === 'nouveau' && !savedId) {
        router.replace(`/feuillet/${saved_data.id}`)
      }
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    setError('')
    try {
      // Sauvegarder d'abord si pas encore sauvegardé
      let id = savedId
      if (!id) {
        const payload = { ...data, statut: 'brouillon' }
        const saveRes = await fetch('/api/feuillets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!saveRes.ok) throw new Error('Erreur sauvegarde')
        const saved_data = await saveRes.json()
        id = saved_data.id
        setSavedId(id)
      }

      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feuilletId: id }),
      })
      if (!res.ok) throw new Error('Erreur génération PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feuillet-${data.numero || ''}-${data.paracha_fr || 'chabbat'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message || 'Erreur génération PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'nouveau' ? 'Nouveau feuillet' : `Feuillet #${data.numero} — ${data.paracha_fr || 'Sans titre'}`}
          </h1>
          {saved && (
            <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3.5 h-3.5" /> Sauvegardé
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave('brouillon')} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
          <button onClick={handleGeneratePdf} disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-medium hover:bg-[#b8963e] transition disabled:opacity-50">
            <FileDown className="w-4 h-4" />
            {generatingPdf ? 'Génération…' : 'Générer le PDF'}
          </button>
        </div>
      </div>

      {/* Brouillon local détecté */}
      {hasDraft && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>📋 Brouillon local récupéré — tes données ont été restaurées automatiquement.</span>
          <button onClick={clearDraft} className="flex items-center gap-1 text-blue-500 hover:text-blue-700 ml-4">
            <RotateCcw className="w-3.5 h-3.5" /> Effacer
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Section titre="Bandeau — Informations générales">
          <BandeauForm data={data} onChange={update} />
        </Section>

        <Section titre="Page 1 — Rubriques modulaires">
          <RubriquesP1Form
            rubriques={data.rubriques_p1 || []}
            onChange={r => update({ rubriques_p1: r })}
          />
        </Section>

        <Section titre="Dédicace (optionnelle)">
          <DedicaceForm
            dedicace={data.dedicace!}
            onChange={d => update({ dedicace: d })}
          />
        </Section>

        <Section titre="Pages 2 & 3 — Dvar Torah">
          <div className="mb-3">
            {remplissage === 'long' && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                Texte trop long — réduire le contenu
              </div>
            )}
            {remplissage === 'court' && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4" />
                Texte court — la page aura de l'espace blanc
              </div>
            )}
            {remplissage === 'bon' && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4" />
                Bonne longueur de texte
              </div>
            )}
          </div>
          <DvarTorahForm
            dvarTorah={data.dvar_torah!}
            remplissage={remplissage}
            onChange={dt => update({ dvar_torah: dt })}
          />
        </Section>

        <Section titre="Page 4 — Page famille">
          <EncadresP4Form
            encadres={data.encadres_p4 || []}
            dedicace={data.dedicace!}
            onChange={e => update({ encadres_p4: e })}
          />
        </Section>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button onClick={() => handleSave('brouillon')} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
            <Save className="w-4 h-4" />
            Enregistrer brouillon
          </button>
          <button onClick={() => handleSave('publie')} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2e6da4] text-white rounded-lg text-sm font-medium hover:bg-[#245a8a] transition disabled:opacity-50">
            Publier
          </button>
          <button onClick={handleGeneratePdf} disabled={generatingPdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a84c] text-white rounded-lg text-sm font-medium hover:bg-[#b8963e] transition disabled:opacity-50">
            <FileDown className="w-4 h-4" />
            {generatingPdf ? 'Génération…' : 'Télécharger PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800 text-sm">{titre}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
