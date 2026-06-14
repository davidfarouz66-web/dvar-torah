import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import FeuilletEditor from '@/components/feuillet/FeuilletEditor'
import type { Organisation } from '@/types'

export default async function NouveauFeuilletPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: utilisateur } = await admin
    .from('utilisateurs')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  const { data: org } = await admin
    .from('organisations')
    .select('*')
    .eq('id', utilisateur?.organisation_id)
    .single()

  if (!org) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <FeuilletEditor
        feuillet={{}}
        organisation={org as Organisation}
        mode="nouveau"
      />
    </div>
  )
}
