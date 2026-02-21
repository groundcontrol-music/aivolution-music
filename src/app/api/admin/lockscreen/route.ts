import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('lockscreen_announcements')
    .select('id, content, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ rows: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const content = String(body?.content || '').trim()

  if (!content) {
    return NextResponse.json({ error: 'Inhalt fehlt.' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: 'Text zu lang (max. 500 Zeichen).' }, { status: 400 })
  }

  const { error } = await supabase
    .from('lockscreen_announcements')
    .insert({
      content,
      is_active: true,
      created_by: user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const id = String(body?.id || '')
  const isActive = Boolean(body?.is_active)
  if (!id) return NextResponse.json({ error: 'ID fehlt.' }, { status: 400 })

  const { error } = await supabase
    .from('lockscreen_announcements')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
