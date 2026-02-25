import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Datei fehlt.' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Nur JPG, PNG oder WEBP erlaubt.' }, { status: 400 })
    }

    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'Datei zu groß (max. 3 MB).' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'webp').toLowerCase()
    const storagePath = `${user.id}/impressum.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('creator-impressum')
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const { data: role } = await supabase.rpc('get_my_role')
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile || (role !== 'admin' && profile.id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const upsertPayload = {
      creator_id: user.id,
      storage_path: storagePath,
      mime_type: file.type,
      is_active: true,
      protection_level: 'standard',
    }

    const { error: upsertError } = await supabase
      .from('creator_impressum_assets')
      .upsert(upsertPayload, { onConflict: 'creator_id' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload fehlgeschlagen.' }, { status: 500 })
  }
}
