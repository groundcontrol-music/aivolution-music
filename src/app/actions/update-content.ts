'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateWelcomeText(formData: FormData) {
  const supabase = await createClient();
  
  // Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht autorisiert");

  // Role Check
  const { data: role } = await supabase.rpc('get_my_role');
  if (role !== 'admin') throw new Error("Kein Admin");

  const title = formData.get('title') as string;
  const subtitle = formData.get('subtitle') as string;

  // Update Slot 99 (Welcome Text)
  const { error } = await supabase
    .from('promo_slots')
    .update({ title, subtitle })
    .eq('slot_id', 99);

  if (error) throw error;

  revalidatePath('/');
  revalidatePath('/admin/media');
  
  return { success: true };
}
