import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: utilisateur } = await admin
    .from('utilisateurs')
    .select('*, organisations(*)')
    .eq('id', user.id)
    .single()

  const org = utilisateur?.organisations as { nom: string; nom_feuillet: string } | null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        nomOrg={org?.nom || 'Ma communauté'}
        nomFeuillet={org?.nom_feuillet || 'Feuillet Communautaire'}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
