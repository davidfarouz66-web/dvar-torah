'use client'

import type { DvarTorah } from '@/types'
import RichTextarea from '@/components/ui/RichTextarea'

interface Props {
  dvarTorah: DvarTorah
  remplissage: 'court' | 'bon' | 'long'
  onChange: (dt: DvarTorah) => void
}

function BarreRemplissage({ remplissage }: { remplissage: 'court' | 'bon' | 'long' }) {
  const pct = remplissage === 'court' ? 25 : remplissage === 'bon' ? 65 : 95
  const color = remplissage === 'court' ? 'bg-orange-400' : remplissage === 'bon' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className="mt-1">
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">
        {remplissage === 'court' ? 'Texte court' : remplissage === 'bon' ? 'Bon remplissage' : 'Texte trop long'}
      </p>
    </div>
  )
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6da4]'

export default function DvarTorahForm({ dvarTorah: dt, remplissage, onChange }: Props) {
  function update(patch: Partial<DvarTorah>) {
    onChange({ ...dt, ...patch })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Verset hébreu</label>
        <input type="text" value={dt.verset_hebreu}
          onChange={e => update({ verset_hebreu: e.target.value })}
          dir="rtl" placeholder="…" className={input} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Traduction / source</label>
        <input type="text" value={dt.traduction}
          onChange={e => update({ traduction: e.target.value })}
          placeholder="Traduction du verset…" className={input} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Développement <span className="text-gray-400 font-normal">(pages 2 & 3)</span>
        </label>
        <RichTextarea
          value={dt.developpement}
          onChange={v => update({ developpement: v })}
          rows={14}
          placeholder="Développement du Dvar Torah…"
        />
        <BarreRemplissage remplissage={remplissage} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Signataire</label>
        <input type="text" value={dt.signataire}
          onChange={e => update({ signataire: e.target.value })}
          placeholder="Rav Prénom Nom" className={input} />
        <p className="text-xs text-gray-400 mt-1">
          Apparaît en bas de page 3 : "Chabbat Chalom · {dt.signataire || 'signataire'}"
        </p>
      </div>
    </div>
  )
}
