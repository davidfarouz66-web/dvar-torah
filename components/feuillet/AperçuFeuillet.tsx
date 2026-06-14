'use client'

import type { Organisation } from '@/types'

interface Props {
  organisation: Pick<Organisation, 'couleur_principale' | 'couleur_secondaire' | 'couleur_fond' | 'nom_feuillet' | 'logo_url'>
}

export default function AperçuFeuillet({ organisation: org }: Props) {
  const cp = org.couleur_principale
  const cs = org.couleur_secondaire
  const cf = org.couleur_fond

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ background: cf }}>
      {/* Bandeau */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: cp }}>
        {org.logo_url ? (
          <img src={org.logo_url} alt="logo" className="h-8 w-8 object-contain" />
        ) : (
          <div className="w-8 h-8 rounded bg-white/20" />
        )}
        <div className="text-center">
          <div className="text-white font-bold text-sm">בְּרֵאשִׁית</div>
          <div className="text-white/80 text-xs">Béréchit</div>
        </div>
        <div className="text-right">
          <div className="text-white text-xs">Chabbat 01/01/2025</div>
          <div className="text-xs font-medium" style={{ color: cs }}>Entrée 17h45</div>
        </div>
      </div>

      {/* Corps */}
      <div className="p-3 space-y-2">
        {/* Rubrique exemple */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${cp}` }}>
          <div className="px-2 py-1 text-white text-xs font-bold" style={{ background: cp }}>
            Dvar Torah
          </div>
          <div className="px-2 py-2" style={{ background: cf }}>
            <div className="h-1.5 rounded bg-gray-300 mb-1.5 w-3/4" />
            <div className="h-1.5 rounded bg-gray-300 mb-1.5 w-full" />
            <div className="h-1.5 rounded bg-gray-300 w-1/2" />
          </div>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${cp}` }}>
          <div className="px-2 py-1 text-white text-xs font-bold" style={{ background: cp }}>
            Agenda
          </div>
          <div className="px-2 py-2" style={{ background: cf }}>
            <div className="h-1.5 rounded bg-gray-300 mb-1.5 w-full" />
            <div className="h-1.5 rounded bg-gray-300 w-2/3" />
          </div>
        </div>

        {/* Dédicace */}
        <div className="text-center text-xs italic py-1" style={{ color: cs }}>
          {org.nom_feuillet}
        </div>
      </div>
    </div>
  )
}
