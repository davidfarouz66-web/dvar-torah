import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import ParametresClient from './ParametresClient'
import type { Organisation, Utilisateur } from '@/types'

export default async function ParametresPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: utilisateur } = await admin
    .from('utilisateurs')
    .select('*, organisations(*)')
    .eq('id', user.id)
    .single()

  const org = utilisateur?.organisations as Organisation | null
  if (!org) redirect('/dashboard')

  const { data: membres } = await admin
    .from('utilisateurs')
    .select('*')
    .eq('organisation_id', org.id)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres de l'organisation</h1>
      <ParametresClient
        organisation={org}
        utilisateurActuel={utilisateur as Utilisateur}
        membres={(membres || []) as Utilisateur[]}
      />
    </div>
  )
}
