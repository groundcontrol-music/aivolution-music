import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SecretLoungeClient from '@/components/creator/SecretLoungeClient'

export default async function SecretLoungePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { slug } = await params
  const slugLower = slug.toLowerCase()

  const { data: creatorRows } = await supabase
    .from('profiles')
    .select('id,artist_name,artist_name_slug,role,visibility')
    .ilike('artist_name_slug', slugLower)
    .eq('role', 'creator')
    .limit(1)

  const creator = creatorRows?.[0]
  if (!creator) return notFound()
  if (creator.visibility !== 'public' && creator.visibility !== 'pending') return notFound()

  const { data: roleData } = await supabase.rpc('get_my_role')
  const isAdmin = roleData === 'admin'

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Link
          href={`/creator/${creator.artist_name_slug || slugLower}`}
          className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 rounded-full text-xs font-black uppercase hover:bg-black hover:text-white transition-colors"
        >
          ← Zurück zum Profil
        </Link>

        <SecretLoungeClient
          creatorId={creator.id}
          creatorName={creator.artist_name || 'Creator'}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
