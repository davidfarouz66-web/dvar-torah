import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!utilisateur?.organisation_id) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 400 })
  }

  const body = await request.json()

  const { count } = await supabase
    .from('feuillets')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', utilisateur.organisation_id)

  const { data: org } = await supabase
    .from('organisations')
    .select('numero_depart')
    .eq('id', utilisateur.organisation_id)
    .single()

  const numero = (org?.numero_depart || 1) + (count || 0)

  const { data, error } = await supabase
    .from('feuillets')
    .insert({
      organisation_id: utilisateur.organisation_id,
      numero,
      ...body,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
