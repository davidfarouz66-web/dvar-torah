'use client'

import type { Dedicace } from '@/types'

interface Props {
  dedicace: Dedicace
  onChange: (d: Dedicace) => void
}

export default function DedicaceForm({ dedicace, onChange }: Props) {
  function update(patch: Partial<Dedicace>) {
    onChange({ ...dedicace, ...patch })
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={dedicace.actif}
          onChange={e => update({ actif: e.target.checked })}
          className="rounded" />
        <span className="text-sm font-medium text-gray-700">Ajouter une dédicace</span>
      </label>

      {dedicace.actif && (
        <div className="space-y-3 pl-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Texte de la dédicace</label>
            <input type="text" value={dedicace.texte}
              onChange={e => update({ texte: e.target.value })}
              placeholder="Dédié à la mémoire de… / En l'honneur de…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6da4]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Placement</label>
            <div className="flex gap-4">
              {[
                { value: 'page1', label: 'Bas de page 1 (couverture)' },
                { value: 'page4', label: 'Bas de page 4 (famille)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio"
                    checked={dedicace.placement === opt.value}
                    onChange={() => update({ placement: opt.value as 'page1' | 'page4' })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
