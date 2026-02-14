import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { CURATION_TEMPLATE_DEFAULTS, loadTemplateBySlot, sendTransactionalMail } from '@/lib/curation-email'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Check admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { data: userRole } = await supabase.rpc('get_my_role')
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Get user_id from form
  const formData = await request.formData()
  const user_id = formData.get('user_id') as string
  
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }
  
  try {
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('artist_name')
      .eq('id', user_id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Generate slug
    const slug = profile.artist_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    // Approve creator
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'creator',
        visibility: 'public',
        onboarding_status: 'approved',
        artist_name_slug: slug
      })
      .eq('id', user_id)
    
    if (updateError) throw updateError
    
    // Update songs (is_probe = false → now in shop)
    await supabase
      .from('songs')
      .update({ is_probe: false })
      .eq('user_id', user_id)

    const { data: creatorEmail } = await supabase.rpc('get_email_for_user', { user_uuid: user_id })
    
    // Send notification to creator
    await supabase
      .from('messages')
      .insert({
        recipient_id: user_id,
        sender_id: null,
        message_type: 'system',
        subject: '🎉 Du wurdest freigeschaltet!',
        content: 'Glückwunsch! Dein Creator-Profil wurde freigegeben. Bitte richte jetzt dein Profil ein: /profile-builder',
        status: 'unread'
      })

    const approvalTemplate = await loadTemplateBySlot(
      supabase,
      CURATION_TEMPLATE_DEFAULTS.approval.slotId,
      CURATION_TEMPLATE_DEFAULTS.approval.subject,
      CURATION_TEMPLATE_DEFAULTS.approval.body
    )

    const approvalText = `${approvalTemplate.body}\n\nNächster Schritt: Profil einrichten unter /profile-builder`
    await sendTransactionalMail({
      to: creatorEmail || '',
      subject: approvalTemplate.subject,
      text: approvalText,
      mediaUrl: approvalTemplate.mediaUrl,
    })
    
    return NextResponse.redirect(new URL('/admin/applications', request.url))
    
  } catch (error: any) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
