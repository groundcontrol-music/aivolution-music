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
    const target = String(body?.target || 'plan')
    const planId = String(body?.planId || '')
    const planNumber = Number(body?.planNumber || 0)
    const subject = String(body?.subject || '').trim()
    const content = String(body?.content || '').trim()

    if ((!planId && !planNumber && target === 'plan') || !subject || !content) {
      return NextResponse.json({ error: 'Plan, Betreff und Inhalt sind Pflicht.' }, { status: 400 })
    }

    let recipientsQuery = supabase
      .from('profiles')
      .select('id')

    if (target === 'all') {
      recipientsQuery = recipientsQuery.eq('role', 'creator')
    } else if (planId) {
      recipientsQuery = recipientsQuery.eq('subscription_plan_id', planId)
    } else if (planNumber) {
      const { data: planRow, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('plan_number', planNumber)
        .single()
      if (planError || !planRow?.id) {
        return NextResponse.json({ error: 'Abo-Modell nicht gefunden.' }, { status: 404 })
      }
      recipientsQuery = recipientsQuery.eq('subscription_plan_id', planRow.id)
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery

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
