import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FilePlus, History, FileText, Settings } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: utilisateur } = await admin
    .from('utilisateurs')
    .select('*, organisations(*)')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle()

  const org = utilisateur?.organisations as { id: string; nom: string; nom_feuillet: string } | null

  const { data: feuillets } = await admin
    .from('feuillets')
    .select('id, numero, paracha_fr, date_shabbat, statut')
    .eq('organisation_id', org?.id || '')
    .order('created_at', { ascending: false })
    .limit(5)

  const { count } = await admin
    .from('feuillets')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', org?.id || '')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">{org?.nom}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-[#2e6da4]">{count ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Feuillets créés</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-[#c9a84c]">
            {feuillets?.filter(f => f.statut === 'publie').length ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Feuillets publiés</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-gray-400">
            {feuillets?.filter(f => f.statut === 'brouillon').length ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Brouillons</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/feuillet/nouveau"
          className="bg-[#2e6da4] text-white rounded-xl p-6 flex items-center gap-4 hover:bg-[#245a8a] transition group">
          <div className="bg-white/20 rounded-lg p-3">
            <FilePlus className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-lg">Nouveau feuillet</div>
            <div className="text-blue-100 text-sm">Créer le feuillet de cette semaine</div>
          </div>
        </Link>

        <Link href="/historique"
          className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4 hover:border-[#2e6da4]/30 hover:bg-blue-50/30 transition group">
          <div className="bg-gray-100 rounded-lg p-3">
            <History className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <div className="font-semibold text-lg text-gray-800">Historique</div>
            <div className="text-gray-400 text-sm">Voir et re-télécharger les anciens feuillets</div>
          </div>
        </Link>
      </div>

      {feuillets && feuillets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Derniers feuillets
            </h2>
            <Link href="/historique" className="text-sm text-[#2e6da4] hover:underline">Voir tout</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {feuillets.map(f => (
              <div key={f.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800">
                    #{f.numero} — {f.paracha_fr || 'Sans titre'}
                  </span>
                  {f.date_shabbat && (
                    <span className="text-gray-400 text-sm ml-2">
                      {new Date(f.date_shabbat).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    f.statut === 'publie' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {f.statut === 'publie' ? 'Publié' : 'Brouillon'}
                  </span>
                  <Link href={`/feuillet/${f.id}`}
                    className="text-sm text-[#2e6da4] hover:underline">Modifier</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!feuillets || feuillets.length === 0) && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun feuillet créé</p>
          <p className="text-gray-400 text-sm mt-1">Commencez par créer votre premier feuillet de Chabbat</p>
          <Link href="/feuillet/nouveau"
            className="inline-flex items-center gap-2 mt-4 bg-[#2e6da4] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#245a8a] transition">
            <FilePlus className="w-4 h-4" />
            Créer le premier feuillet
          </Link>
        </div>
      )}
    </div>
  )
}
