import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Impressum | Aivolution Music',
  description: 'Rechtliche Anbieterkennzeichnung von Aivolution Music.',
}

const FALLBACK_TITLE = 'Impressum'
const FALLBACK_CONTENT = `Aivolution Music Hosting
Landstrasse 73
31717 Nordsehl

Kontakt: folgt

Texte unter Kommandozentrale → Terms verwalten bearbeiten.`

export default async function ImpressumPage() {
  let title = FALLBACK_TITLE
  let content = FALLBACK_CONTENT
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('legal_pages')
      .select('title, content')
      .eq('key', 'impressum')
      .single()
    if (data?.title) title = data.title
    if (data?.content) content = data.content
  } catch {
    // Tabelle legal_pages ggf. noch nicht angelegt – Fallback oben
  }

  return (
    <div className="text-black">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-6 md:p-10 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-6">
            <span className="text-red-600">{title}</span>
          </h1>
          <div className="prose prose-sm max-w-none text-zinc-800 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
          <p className="mt-8 text-xs font-bold uppercase text-zinc-400">
            <Link href="/" className="hover:text-red-600 transition-colors">← Zurück zur Startseite</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
