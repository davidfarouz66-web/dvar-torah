'use client'

import type { Feuillet, RochHodech } from '@/types'

interface Props {
  data: Partial<Feuillet>
  onChange: (patch: Partial<Feuillet>) => void
}

export default function BandeauForm({ data, onChange }: Props) {
  const rh = data.roch_hodech || { actif: false, nom_mois: '', jours: '', nolad: '' }

  function updateRH(patch: Partial<RochHodech>) {
    onChange({ roch_hodech: { ...rh, ...patch } })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Paracha (français)">
          <input type="text" value={data.paracha_fr || ''}
            onChange={e => onChange({ paracha_fr: e.target.value })}
            placeholder="ex : Béréchit" className={input} />
        </Field>
        <Field label="Paracha (hébreu)">
          <input type="text" value={data.paracha_he || ''}
            onChange={e => onChange({ paracha_he: e.target.value })}
            placeholder="בְּרֵאשִׁית" dir="rtl" className={input} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Date du Chabbat">
          <input type="date" value={data.date_shabbat || ''}
            onChange={e => onChange({ date_shabbat: e.target.value })}
            className={input} />
        </Field>
        <Field label="Heure entrée">
          <input type="time" value={data.heure_entree || ''}
            onChange={e => onChange({ heure_entree: e.target.value })}
            className={input} />
        </Field>
        <Field label="Heure sortie">
          <input type="time" value={data.heure_sortie || ''}
            onChange={e => onChange({ heure_sortie: e.target.value })}
            className={input} />
        </Field>
      </div>

      {/* Roch Hodech */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input type="checkbox" checked={rh.actif}
            onChange={e => updateRH({ actif: e.target.checked })}
            className="rounded" />
          <span className="text-sm font-medium text-gray-700">Roch Hodech ce Chabbat</span>
        </label>
        {rh.actif && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nom du mois">
              <input type="text" value={rh.nom_mois}
                onChange={e => updateRH({ nom_mois: e.target.value })}
                placeholder="Tichri" className={input} />
            </Field>
            <Field label="Jours">
              <input type="text" value={rh.jours}
                onChange={e => updateRH({ jours: e.target.value })}
                placeholder="1er et 2e" className={input} />
            </Field>
            <Field label="Nolad">
              <input type="text" value={rh.nolad}
                onChange={e => updateRH({ nolad: e.target.value })}
                placeholder="Dimanche à 14h32" className={input} />
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6da4]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
