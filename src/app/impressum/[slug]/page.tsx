import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

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
              <p className="text-sm md:text-base text-zinc-700 mb-4">
                Angaben für <strong>{creator.artist_name}</strong>. Zur Abschirmung gegen automatisches Scraping wird das Impressum als geschütztes Bild ausgeliefert.
              </p>
              <div className="border-2 border-black rounded-[1.5rem] p-3 bg-zinc-100 relative overflow-hidden">
                <img
                  src={`/api/public/impressum-image?slug=${encodeURIComponent(creator.artist_name_slug)}`}
                  alt={`Creator Impressum von ${creator.artist_name}`}
                  className="w-full h-auto rounded-xl select-none pointer-events-none"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0)_0%,rgba(255,255,255,0.06)_100%)] pointer-events-none" />
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
