import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TermsEditor from '@/components/admin/TermsEditor'
import LegalEditor from '@/components/admin/LegalEditor'

export default async function AdminTermsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') redirect('/')

  const { data: terms } = await supabase
    .from('onboarding_terms')
    .select('*')
    .order('sort_order')

  let legalPages: { key: string; title: string; content: string }[] = []
  try {
    const { data } = await supabase
      .from('legal_pages')
      .select('key, title, content')
      .in('key', ['impressum', 'agb', 'datenschutz', 'hilfe'])
    legalPages = data ?? []
  } catch {
    // Tabelle legal_pages ggf. noch nicht angelegt – SQL aus supabase_legal_pages.sql ausführen
  }

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end border-b-2 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Terms <span className="text-red-600">verwalten</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1">
            Onboarding-Checkboxen, AGB und Hilfe
          </p>
        </div>
      </div>

      {/* Onboarding-Checkboxen: klein, nebeneinander */}
      <section>
        <h2 className="text-lg font-black uppercase mb-4">Onboarding-Checkboxen</h2>
        <TermsEditor initialTerms={terms || []} />
      </section>

      {/* AGB & Hilfe: breit, Din-A4-Style editierbar */}
      <section className="pt-8 border-t-2 border-black">
        <h2 className="text-lg font-black uppercase mb-4">AGB &amp; Hilfe</h2>
        <p className="text-xs font-bold uppercase text-zinc-500 mb-6">
          Breite Boxen für Din-A4-Ansicht. Texte erscheinen auf /agb, /datenschutz und /hilfe.
        </p>
        <LegalEditor initial={legalPages} />
      </section>
    </div>
  )
}
