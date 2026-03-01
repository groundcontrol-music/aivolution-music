import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('legal_pages')
    .select('key, title, content, updated_at')
    .in('key', ['impressum', 'agb', 'datenschutz', 'hilfe'])
    .order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { key, title, content } = body
  if (!key || !['impressum', 'agb', 'datenschutz', 'hilfe'].includes(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const { error } = await supabase
    .from('legal_pages')
    .upsert(
      { key, title: title ?? '', content: content ?? '', updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
