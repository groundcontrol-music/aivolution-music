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
    // Get profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('artist_name')
      .eq('id', user_id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Get email before deletion
    const { data: creatorEmail } = await supabase.rpc('get_email_for_user', { user_uuid: user_id })

    const rejectionTemplate = await loadTemplateBySlot(
      supabase,
      CURATION_TEMPLATE_DEFAULTS.rejection.slotId,
      CURATION_TEMPLATE_DEFAULTS.rejection.subject,
      CURATION_TEMPLATE_DEFAULTS.rejection.body
    )

    await sendTransactionalMail({
      to: creatorEmail || '',
      subject: rejectionTemplate.subject,
      text: rejectionTemplate.body,
      mediaUrl: rejectionTemplate.mediaUrl,
    })
    
    // Delete songs first (because of foreign key)
    await supabase
      .from('songs')
      .delete()
      .eq('user_id', user_id)
    
    // Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user_id)
    
    // Delete auth user (DSGVO: complete data deletion)
    // Note: This requires admin privileges on auth.users
    // Alternative: Set profile to 'rejected' status instead of deleting
    
    return NextResponse.redirect(new URL('/admin/applications', request.url))
    
  } catch (error: any) {
    console.error('Reject error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
