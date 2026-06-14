'use client'

import { useState } from 'react'
import type { RubriqueP1 } from '@/types'
import { TYPES_RUBRIQUES_P1 } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import RichTextarea from '@/components/ui/RichTextarea'

interface Props {
  rubriques: RubriqueP1[]
  onChange: (rubriques: RubriqueP1[]) => void
}

export default function RubriquesP1Form({ rubriques, onChange }: Props) {
  function addRubrique(type: RubriqueP1['type']) {
    const label = TYPES_RUBRIQUES_P1.find(t => t.value === type)?.label || type
    const newR: RubriqueP1 = {
      id: crypto.randomUUID(),
      type,
      actif: true,
      titre: label,
      contenu: '',
    }
    onChange([...rubriques, newR])
  }

  function updateRubrique(id: string, patch: Partial<RubriqueP1>) {
    onChange(rubriques.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function removeRubrique(id: string) {
    onChange(rubriques.filter(r => r.id !== id))
  }

  function toggleActif(id: string) {
    onChange(rubriques.map(r => r.id === id ? { ...r, actif: !r.actif } : r))
  }

  const typesDisponibles = TYPES_RUBRIQUES_P1.filter(
    t => !rubriques.some(r => r.type === t.value)
  )

  return (
    <div className="space-y-3">
      {rubriques.map(r => (
        <div key={r.id} className={`border rounded-lg overflow-hidden transition ${r.actif ? 'border-[#2e6da4]/30' : 'border-gray-200 opacity-60'}`}>
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50">
            <input type="checkbox" checked={r.actif} onChange={() => toggleActif(r.id)}
              className="rounded" />
            <input type="text" value={r.titre}
              onChange={e => updateRubrique(r.id, { titre: e.target.value })}
              className="flex-1 text-sm font-medium bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400"
              placeholder="Titre de l'encadré…" />
            <span className="text-xs text-gray-400 bg-gray-200 rounded px-2 py-0.5">
              {TYPES_RUBRIQUES_P1.find(t => t.value === r.type)?.label}
            </span>
            <button onClick={() => removeRubrique(r.id)}
              className="text-gray-400 hover:text-red-500 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {r.actif && (
            <div className="p-3">
              <RichTextarea
                value={r.contenu}
                onChange={v => updateRubrique(r.id, { contenu: v })}
                rows={4}
                placeholder="Contenu de la rubrique…"
              />
            </div>
          )}
        </div>
      ))}

      {typesDisponibles.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {typesDisponibles.map(t => (
            <button key={t.value} onClick={() => addRubrique(t.value as RubriqueP1['type'])}
              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-dashed border-[#2e6da4] text-[#2e6da4] rounded-lg hover:bg-[#2e6da4]/5 transition">
              <Plus className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {rubriques.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Aucune rubrique ajoutée — cliquez sur un bouton ci-dessous pour en ajouter
        </p>
      )}
    </div>
  )
}
