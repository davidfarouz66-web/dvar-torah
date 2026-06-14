'use client'

import { useState, useRef } from 'react'
import type { Organisation, Utilisateur } from '@/types'
import { createClient } from '@/lib/supabase'
import { Save, Upload, UserPlus, Trash2, CheckCircle } from 'lucide-react'
import AperçuFeuillet from '@/components/feuillet/AperçuFeuillet'

interface Props {
  organisation: Organisation
  utilisateurActuel: Utilisateur
  membres: Utilisateur[]
}

const isAdmin = (u: Utilisateur) => u.role === 'admin' || u.role === 'super_admin'

export default function ParametresClient({ organisation: orgInit, utilisateurActuel, membres: membresInit }: Props) {
  const [org, setOrg] = useState(orgInit)
  const [membres, setMembres] = useState(membresInit)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'redacteur'>('redacteur')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function updateOrg(patch: Partial<Organisation>) {
    setOrg(prev => ({ ...prev, ...patch }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('organisations')
      .update({
        nom: org.nom,
        nom_feuillet: org.nom_feuillet,
        couleur_principale: org.couleur_principale,
        couleur_secondaire: org.couleur_secondaire,
        couleur_fond: org.couleur_fond,
        signataire_defaut: org.signataire_defaut,
        numero_depart: org.numero_depart,
      })
      .eq('id', org.id)

    if (err) setError(err.message)
    else setSaved(true)
    setSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)

    const path = `${org.id}/logo-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      await supabase.from('organisations').update({ logo_url: publicUrl }).eq('id', org.id)
      updateOrg({ logo_url: publicUrl })
    }
    setUploadingLogo(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    // En production, envoyer un email d'invitation via une API route
    alert(`Invitation envoyée à ${inviteEmail} avec le rôle "${inviteRole}". (Fonctionnalité à relier à votre système d'email)`)
    setInviteEmail('')
  }

  async function handleRemoveMembre(id: string) {
    if (id === utilisateurActuel.id) return
    if (!confirm('Retirer ce membre ?')) return
    await supabase.from('utilisateurs').delete().eq('id', id)
    setMembres(prev => prev.filter(m => m.id !== id))
  }

  const canEdit = isAdmin(utilisateurActuel)

  return (
    <div className="space-y-6">
      {/* Informations générales */}
      <Card titre="Informations générales">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom de la synagogue / communauté">
            <input type="text" value={org.nom} onChange={e => updateOrg({ nom: e.target.value })}
              disabled={!canEdit} className={input(canEdit)} />
          </Field>
          <Field label="Nom du feuillet">
            <input type="text" value={org.nom_feuillet} onChange={e => updateOrg({ nom_feuillet: e.target.value })}
              disabled={!canEdit} className={input(canEdit)} />
          </Field>
          <Field label="Signataire par défaut">
            <input type="text" value={org.signataire_defaut} onChange={e => updateOrg({ signataire_defaut: e.target.value })}
              disabled={!canEdit} className={input(canEdit)} placeholder="Rav Prénom Nom" />
          </Field>
          <Field label="Numéro de départ des feuillets">
            <input type="number" min={1} value={org.numero_depart} onChange={e => updateOrg({ numero_depart: parseInt(e.target.value) || 1 })}
              disabled={!canEdit} className={input(canEdit)} />
          </Field>
        </div>
      </Card>

      {/* Logo */}
      <Card titre="Logo de l'organisation">
        <div className="flex items-center gap-4">
          {org.logo_url ? (
            <img src={org.logo_url} alt="Logo" className="w-20 h-20 object-contain border border-gray-200 rounded-lg" />
          ) : (
            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center">
              Pas de logo
            </div>
          )}
          {canEdit && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingLogo}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                <Upload className="w-4 h-4" />
                {uploadingLogo ? 'Upload…' : 'Choisir un logo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG ou SVG recommandés</p>
            </div>
          )}
        </div>
      </Card>

      {/* Couleurs + aperçu */}
      <Card titre="Couleurs & aperçu">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <ColorField label="Couleur principale" value={org.couleur_principale}
              onChange={v => updateOrg({ couleur_principale: v })} disabled={!canEdit} />
            <ColorField label="Couleur secondaire (dorée)" value={org.couleur_secondaire}
              onChange={v => updateOrg({ couleur_secondaire: v })} disabled={!canEdit} />
            <ColorField label="Couleur de fond" value={org.couleur_fond}
              onChange={v => updateOrg({ couleur_fond: v })} disabled={!canEdit} />
          </div>
          <AperçuFeuillet organisation={org} />
        </div>
      </Card>

      {/* Bouton sauvegarder */}
      {canEdit && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2e6da4] text-white rounded-lg font-medium hover:bg-[#245a8a] transition disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde…' : 'Sauvegarder les paramètres'}
          </button>
          {saved && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Sauvegardé
            </span>
          )}
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      )}

      {/* Membres */}
      <Card titre="Membres de l'organisation">
        <div className="space-y-2 mb-4">
          {membres.map(m => (
            <div key={m.id} className="flex items-center justify-between px-3 py-2 border border-gray-100 rounded-lg">
              <div>
                <span className="font-medium text-gray-800">{m.nom || m.email}</span>
                <span className="text-gray-400 text-sm ml-2">{m.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.role === 'admin' || m.role === 'super_admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {m.role === 'super_admin' ? 'Super Admin' : m.role === 'admin' ? 'Admin' : 'Rédacteur'}
                </span>
                {canEdit && m.id !== utilisateurActuel.id && (
                  <button onClick={() => handleRemoveMembre(m.id)}
                    className="text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canEdit && (
          <form onSubmit={handleInvite} className="flex gap-2">
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@exemple.fr" required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6da4]" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6da4]">
              <option value="redacteur">Rédacteur</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit"
              className="flex items-center gap-1 px-3 py-2 bg-[#2e6da4] text-white rounded-lg text-sm font-medium hover:bg-[#245a8a] transition">
              <UserPlus className="w-4 h-4" />
              Inviter
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}

function Card({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800 text-sm">{titre}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ColorField({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <div className="flex items-center gap-2">
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className="w-10 h-9 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed" />
          <input type="text" value={value} onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={`w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2e6da4] ${disabled ? 'bg-gray-50' : ''}`} />
        </div>
      </div>
    </div>
  )
}

const input = (enabled: boolean) =>
  `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6da4] ${!enabled ? 'bg-gray-50 cursor-not-allowed' : ''}`
