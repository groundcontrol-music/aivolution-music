'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * MASTER-CHECK (Frage 2): Sicherheits-Check auf dem Server.
 * Nur wer in der Tabelle 'profiles' als 'admin' markiert ist, darf schreiben.
 */
export async function updateWelcomeText(formData: FormData) {
  const supabase = await createClient();
  
  // 1. Wer ist eingeloggt?
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht autorisiert");

  // 2. Admin-Check via RPC (umgeht RLS/Spalten-Probleme)
  const { data: role } = await supabase.rpc('get_my_role');
  if (role !== 'admin') throw new Error("Zugriff verweigert: Admin-Status fehlt");

  const title = formData.get('title') as string;
  const subtitle = formData.get('subtitle') as string;

  // 3. Datenbank-Update für den Willkommenstext (Slot 99)
  const { error } = await supabase
    .from('promo_slots')
    .update({ title, subtitle })
    .eq('slot_id', 99);

  if (error) throw error;

  // 4. Cache-Reset: Damit die Startseite sofort die neuen Daten zeigt
  revalidatePath('/');
  revalidatePath('/admin');
  
  return { success: true };
}