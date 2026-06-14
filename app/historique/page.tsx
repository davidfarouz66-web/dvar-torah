import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HistoriqueClient from './HistoriqueClient'

export default async function HistoriquePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: utilisateur } = await admin
    .from('utilisateurs')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  const { data: feuillets } = await admin
    .from('feuillets')
    .select('*')
    .eq('organisation_id', utilisateur?.organisation_id)
    .order('date_shabbat', { ascending: false })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historique des feuillets</h1>
        <Link href="/feuillet/nouveau"
          className="px-4 py-2 bg-[#2e6da4] text-white rounded-lg text-sm font-medium hover:bg-[#245a8a] transition">
          + Nouveau feuillet
        </Link>
      </div>
      <HistoriqueClient feuillets={feuillets || []} />
    </div>
  )
}
