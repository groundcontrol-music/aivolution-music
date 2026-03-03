import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const { data: role } = await supabase.rpc('get_my_role')
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const planId = String(body?.planId || '')
    const subject = String(body?.subject || '').trim()
    const content = String(body?.content || '').trim()

    if (!planId || !subject || !content) {
      return NextResponse.json({ error: 'Plan, Betreff und Inhalt sind Pflicht.' }, { status: 400 })
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('subscription_plan_id', planId)

    if (recipientsError) throw recipientsError

    const rows = (recipients || []).map((profile) => ({
      recipient_id: profile.id,
      sender_id: null,
      message_type: 'system',
      subject,
      content,
    }))

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('messages').insert(rows)
      if (insertError) throw insertError
    }

    return NextResponse.json({ sent: rows.length })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}
