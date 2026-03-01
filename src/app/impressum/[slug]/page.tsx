import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import ImpressumImage from '@/components/impressum/ImpressumImage'

export const metadata = {
  title: 'Creator Impressum | Aivolution Music',
  description: 'Rechtliche Angaben eines Creators auf Aivolution Music.',
}

export default async function CreatorImpressumPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: creator } = await supabase
    .from('profiles')
    .select('artist_name, artist_name_slug, visibility, role')
    .eq('artist_name_slug', slug.toLowerCase())
    .single()

  const isVisible = creator && creator.visibility === 'public' && creator.role === 'creator'

  return (
    <div className="min-h-screen bg-zinc-50 text-black">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-3">
            Creator <span className="text-red-600">Impressum</span>
          </h1>

          {!isVisible ? (
            <p className="text-sm md:text-base text-zinc-700">
              Dieser Creator ist aktuell nicht öffentlich verfügbar oder es wurde noch kein Impressum veröffentlicht.
            </p>
          ) : (
            <>
              <p className="text-sm md:text-base font-black uppercase tracking-wide text-zinc-800 mb-2">
                Creator-Shop geschützt durch Aivolution Music
              </p>
              <p className="text-sm md:text-base text-zinc-700 mb-4">
                Verantwortlicher Creator: <strong>{creator.artist_name}</strong>
                <br />
                Plattform-Host &amp; Technischer Dienstleister: <strong>Aivolution Digital Service</strong>
                <br />
                Inhaber: <strong>Matthias Aue</strong>
                <br />
                Landstrasse 73, 31717 Nordsehl
                <br />
                Hinweis: Die Inhalte liegen in der Verantwortung des jeweiligen Creators.
              </p>
              <div className="border-2 border-black rounded-[1.5rem] p-3 bg-zinc-100 relative overflow-hidden min-h-[120px]">
                <ImpressumImage slug={creator.artist_name_slug} alt={`Creator Impressum von ${creator.artist_name}`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0)_0%,rgba(255,255,255,0.09)_100%)] pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-multiply bg-[linear-gradient(45deg,#000_0%,transparent_12%,#000_24%,transparent_36%,#000_48%,transparent_60%,#000_72%,transparent_84%,#000_100%)]" />
              </div>
              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src="/aivo-robot.png" alt="Aivo" className="h-12 w-auto object-contain" />
                  <p className="text-xs md:text-sm bg-white border border-black rounded-xl px-3 py-2">
                    Aivo: „Ich passe nur auf die Technik auf! Die Inhalte liegen in der Verantwortung des Creators.“
                  </p>
                </div>
                <a
                  href={`mailto:folgt?subject=${encodeURIComponent('Urheberrechtsverletzung melden')}&body=${encodeURIComponent(`Bitte Link und Details melden: ${process.env.NEXT_PUBLIC_SITE_URL || ''}/creator/${creator.artist_name_slug}`)}`}
                  className="inline-flex items-center justify-center text-xs font-black uppercase px-3 py-2 rounded-full border-2 border-black hover:bg-black hover:text-white transition-colors"
                >
                  Urheberrechtsverletzung melden
                </a>
              </div>
            </>
          )}

          <div className="mt-6">
            <Link
              href="/impressum"
              className="text-sm font-bold underline underline-offset-4 hover:text-red-600 transition-colors"
            >
              Zur zentralen Impressums-Seite
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
