import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params
  if (!key || !['agb', 'datenschutz', 'hilfe', 'impressum'].includes(key)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const titles: Record<string, string> = { agb: 'AGB', datenschutz: 'Datenschutz', hilfe: 'Hilfe', impressum: 'Impressum' }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('legal_pages')
      .select('key, title, content, updated_at')
      .eq('key', key)
      .single()
    if (error || !data) {
      return NextResponse.json({ title: titles[key] || key, content: 'Kein Inhalt hinterlegt. Bearbeite unter Kommandozentrale → Terms verwalten.' })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ title: titles[key] || key, content: 'Tabelle legal_pages noch nicht angelegt. Führe supabase_legal_pages.sql in Supabase aus.' })
  }
}
