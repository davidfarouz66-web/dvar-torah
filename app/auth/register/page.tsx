'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterPage() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nomOrg, setNomOrg] = useState('')
  const [nomFeuillet, setNomFeuillet] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom } }
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Erreur lors de la création du compte.')
      setLoading(false)
      return
    }

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({ nom: nomOrg, nom_feuillet: nomFeuillet || nomOrg })
      .select()
      .single()

    if (orgError || !org) {
      setError('Erreur lors de la création de l\'organisation.')
      setLoading(false)
      return
    }

    const { error: userError } = await supabase
      .from('utilisateurs')
      .insert({ id: authData.user.id, email, nom, organisation_id: org.id, role: 'admin' })

    if (userError) {
      setError('Erreur lors de la configuration du compte.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#fffdf8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2e6da4]">Feuillet Communautaire</h1>
          <p className="text-gray-500 mt-2">Créer votre espace communautaire</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="border-b pb-4 mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Votre compte</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
                  <input type="text" value={nom} onChange={e => setNom(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2e6da4]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2e6da4]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2e6da4]" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Votre communauté</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la synagogue / communauté</label>
                  <input type="text" value={nomOrg} onChange={e => setNomOrg(e.target.value)} required
                    placeholder="ex : Synagogue Beth El"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2e6da4]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du feuillet <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input type="text" value={nomFeuillet} onChange={e => setNomFeuillet(e.target.value)}
                    placeholder="ex : Lev Avot"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2e6da4]" />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[#2e6da4] text-white rounded-lg py-2.5 font-medium hover:bg-[#245a8a] transition disabled:opacity-50">
              {loading ? 'Création…' : 'Créer mon espace'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-[#2e6da4] font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
