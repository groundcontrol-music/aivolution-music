'use server';

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  // Wir nutzen signInWithPassword – das braucht keine E-Mail-Bestätigung!
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase Login Error:", error.message);
    return { error: "Login fehlgeschlagen: " + error.message };
  }

  // Master-Frage 3 (Stabilität): Wenn der Login klappt, direkt zum Admin
  console.log("Login erfolgreich für:", email);
  
  // Wichtig: redirect() darf nicht im try/catch stehen, falls du eines nutzt
  redirect('/admin');
}