import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import FeuilletEditor from '@/components/feuillet/FeuilletEditor'
import type { Feuillet, Organisation } from '@/types'

export default async function EditionFeuilletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  const { data: feuillet } = await supabase
    .from('feuillets')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', utilisateur?.organisation_id)
    .single()

  if (!feuillet) notFound()

  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', utilisateur?.organisation_id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <FeuilletEditor
        feuillet={feuillet as Feuillet}
        organisation={org as Organisation}
        mode="edition"
      />
    </div>
  )
}
