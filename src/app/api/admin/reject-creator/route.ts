import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

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
    
    // Get email
    const { data: email } = await supabase.rpc('get_email_for_user', { user_uuid: user_id })
    
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
    
    // TODO: Send Rejection Email via Resend
    // await sendRejectionEmail(email, profile.artist_name)
    
    return NextResponse.redirect(new URL('/admin/applications', request.url))
    
  } catch (error: any) {
    console.error('Reject error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
