import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MediaSlotEditor from '@/components/admin/MediaSlotEditor'
import LockscreenAnnouncementEditor from '@/components/admin/LockscreenAnnouncementEditor'
import { ImageIcon } from 'lucide-react'
import { CURATION_TEMPLATE_DEFAULTS } from '@/lib/curation-email'

export default async function AdminMediaPage() {
  const supabase = await createClient()

  // Admin Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'admin') redirect('/')

  // Ensure Template-Slots für Kuration-Mails vorhanden sind
  await supabase.from('promo_slots').upsert(
    [
      {
        slot_id: CURATION_TEMPLATE_DEFAULTS.approval.slotId,
        title: CURATION_TEMPLATE_DEFAULTS.approval.subject,
        subtitle: 'Kuration Zusage-Mail',
        body_text: CURATION_TEMPLATE_DEFAULTS.approval.body,
        media_type: 'none',
      },
      {
        slot_id: CURATION_TEMPLATE_DEFAULTS.rejection.slotId,
        title: CURATION_TEMPLATE_DEFAULTS.rejection.subject,
        subtitle: 'Kuration Ablehnungs-Mail',
        body_text: CURATION_TEMPLATE_DEFAULTS.rejection.body,
        media_type: 'none',
      },
    ],
    { onConflict: 'slot_id', ignoreDuplicates: true }
  )

  // Fetch Media Slots: 1–3 Startseite, 5=Highlight (an Stelle von Slot 4), 99=Welcome, 201/202=Kuration-Mailtexte.
  const { data: rawSlots } = await supabase
    .from('promo_slots')
    .select('*')
    .in('slot_id', [1, 2, 3, 5, 99, 201, 202])
    .order('slot_id')
  const filtered = (rawSlots ?? []).filter((s: { slot_id: number }) => s.slot_id !== 4)
  // Reihenfolge: 1, 2, 3, 5 (Highlight rutscht in die vierte Editierbox-Position), dann 99, 201, 202
  const order = [1, 2, 3, 5, 99, 201, 202]
  const slots = order
    .map((id) => filtered.find((s: { slot_id: number }) => s.slot_id === id))
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white border-2 border-black rounded-lg p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                Media <span className="text-red-600">Boxen</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1">
                Bild • YouTube • TikTok
              </p>
            </div>
            <ImageIcon className="text-red-600" size={48} />
          </div>
        </div>

        <div className="bg-zinc-100 border-2 border-black rounded-lg p-4 mb-6">
          <p className="text-xs font-bold uppercase">
            Kuration-Mailtexte: Slot 201 (Zusage), Slot 202 (Ablehnung). Optional kann ein Bild (z. B. Aivo 👍) gesetzt werden.
          </p>
        </div>

        {/* Erste Zeile: 3 Media-Boxen + Highlight-Box (an Stelle von Slot 4), danach Welcome/Kuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {slots && slots.map((slot: any) => (
            <MediaSlotEditor key={slot.id ?? `slot-${slot.slot_id}`} slot={slot} />
          ))}
        </div>

        <div className="mt-8">
          <LockscreenAnnouncementEditor />
        </div>

      </div>
    </div>
  )
}
