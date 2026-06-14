import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const { feuilletId } = body

  const admin = createAdminClient()

  const { data: feuillet } = await admin
    .from('feuillets')
    .select('*')
    .eq('id', feuilletId)
    .single()

  if (!feuillet) return NextResponse.json({ error: 'Feuillet introuvable' }, { status: 404 })

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

  const inputData = JSON.stringify({ feuillet, organisation: org })

  // Écrire dans un fichier temporaire pour éviter les problèmes d'échappement shell
  const tmpFile = path.join(tmpdir(), `feuillet-${Date.now()}.json`)
  writeFileSync(tmpFile, inputData, 'utf8')

  const scriptPath = path.join(process.cwd(), 'python', 'generate_pdf.py')

  try {
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      const errChunks: Buffer[] = []

      const proc = spawn('python3', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      // Envoyer le JSON via stdin
      proc.stdin.write(inputData)
      proc.stdin.end()

      proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
      proc.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk))

      proc.on('close', (code) => {
        if (code !== 0) {
          const errMsg = Buffer.concat(errChunks).toString()
          console.error('PDF error:', errMsg)
          reject(new Error(errMsg))
        } else {
          resolve(Buffer.concat(chunks))
        }
      })

      proc.on('error', reject)
    })

    try { unlinkSync(tmpFile) } catch {}

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="feuillet-${feuillet.numero}-${feuillet.paracha_fr || 'chabbat'}.pdf"`,
      },
    })
  } catch (err: any) {
    try { unlinkSync(tmpFile) } catch {}
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Erreur génération PDF: ' + err.message }, { status: 500 })
  }
}
