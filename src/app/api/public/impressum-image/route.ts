import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

function sanitizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const slug = sanitizeSlug(request.nextUrl.searchParams.get('slug') || '')
    if (!slug) {
      return NextResponse.json({ error: 'Slug fehlt.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id, visibility, role')
      .eq('artist_name_slug', slug)
      .single()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: role } = user ? await supabase.rpc('get_my_role') : { data: null }
    const isOwner = Boolean(user?.id) && creator?.id === user?.id
    const isAdmin = role === 'admin'

    if (creatorError || !creator || creator.role !== 'creator') {
      return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
    }
    if (!isOwner && !isAdmin && creator.visibility !== 'public') {
      return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 })
    }

    const { data: asset, error: assetError } = await supabase
      .from('creator_impressum_assets')
      .select('storage_path, mime_type, is_active')
      .eq('creator_id', creator.id)
      .eq('is_active', true)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Kein Impressum hinterlegt.' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: fileData, error: fileError } = await admin.storage
      .from('creator-impressum')
      .download(asset.storage_path)

    if (fileError || !fileData) {
      return NextResponse.json({ error: 'Bild konnte nicht geladen werden.' }, { status: 404 })
    }

    const bytes = await fileData.arrayBuffer()
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': asset.mime_type || 'image/webp',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'X-Robots-Tag': 'noimageindex, noarchive',
        'Content-Disposition': 'inline; filename="creator-impressum"',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unerwarteter Fehler.' }, { status: 500 })
  }
}
