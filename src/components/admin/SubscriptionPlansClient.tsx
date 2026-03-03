'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type PlanRow = {
  id?: string
  plan_number: number
  name: string
  monthly_price: number
  storage_gb: number
  stripe_price_id?: string | null
}

type PromoBox = {
  slot_id: number
  title: string
  subtitle: string
  media_url?: string | null
  media_type?: 'image' | 'none'
}

const buildDefaultPlans = (): PlanRow[] =>
  Array.from({ length: 6 }).map((_, index) => ({
    plan_number: index + 1,
    name: `${index + 1}`,
    monthly_price: 0,
    storage_gb: 0,
    stripe_price_id: null,
  }))

export default function SubscriptionPlansClient() {
  const supabase = createClient()
  const [plans, setPlans] = useState<PlanRow[]>(buildDefaultPlans())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [promoBoxes, setPromoBoxes] = useState<PromoBox[]>(
    Array.from({ length: 6 }).map((_, index) => ({
      slot_id: 301 + index,
      title: `Box ${index + 1}`,
      subtitle: 'Aivolution',
      media_type: 'none',
      media_url: null,
    }))
  )
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoSaving, setPromoSaving] = useState(false)
  const [messagePlanId, setMessagePlanId] = useState<string>('')
  const [messagePlanNumber, setMessagePlanNumber] = useState<string>('')
  const [messageTarget, setMessageTarget] = useState<'plan' | 'all'>('plan')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const planOptions = useMemo(() => plans, [plans])

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('plan_number', { ascending: true })
        if (error) throw new Error(error.message || 'Unbekannter Fehler')
        if (data && data.length > 0) {
          const normalized = buildDefaultPlans().map((fallback) => {
            const match = data.find((row: any) => row.plan_number === fallback.plan_number)
            return match
              ? {
                  id: match.id,
                  plan_number: match.plan_number,
                  name: match.name || `${match.plan_number}`,
                  monthly_price: Number(match.monthly_price || 0),
                  storage_gb: Number(match.storage_gb || 0),
                  stripe_price_id: match.stripe_price_id || null,
                }
              : fallback
          })
          setPlans(normalized)
        }
      } catch (error: any) {
        const message = error?.message || 'Unbekannter Fehler'
        console.error('Plans laden fehlgeschlagen:', message)
        setLoadError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [supabase])

  useEffect(() => {
    const fetchPromoBoxes = async () => {
      try {
        setPromoLoading(true)
        const { data, error } = await supabase
          .from('promo_slots')
          .select('slot_id, title, subtitle, media_type, media_url')
          .in('slot_id', [301, 302, 303, 304, 305, 306])
          .order('slot_id', { ascending: true })
        if (error) throw error
        if (data && data.length > 0) {
          const merged = promoBoxes.map((fallback) => {
            const match = data.find((row: any) => row.slot_id === fallback.slot_id)
            return match
              ? {
                  slot_id: match.slot_id,
                  title: match.title || fallback.title,
                  subtitle: match.subtitle || fallback.subtitle,
                  media_type: match.media_type || 'none',
                  media_url: match.media_url || null,
                }
              : fallback
          })
          setPromoBoxes(merged)
        }
      } catch (error: any) {
        console.error('Promo-Boxen laden fehlgeschlagen:', error?.message || error)
      } finally {
        setPromoLoading(false)
      }
    }
    fetchPromoBoxes()
  }, [supabase])

  const updatePlan = (index: number, patch: Partial<PlanRow>) => {
    setPlans((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const updatePromoBox = (index: number, patch: Partial<PromoBox>) => {
    setPromoBoxes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const handlePromoImageUpload = async (index: number, file: File) => {
    try {
      setPromoSaving(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `promo_box_${promoBoxes[index].slot_id}_${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)
      updatePromoBox(index, { media_url: publicUrl, media_type: 'image' })
    } catch (error: any) {
      alert(`Upload fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setPromoSaving(false)
    }
  }

  const handleSavePromoBoxes = async () => {
    try {
      setPromoSaving(true)
      const payload = promoBoxes.map((box) => ({
        slot_id: box.slot_id,
        title: box.title || `Box ${box.slot_id - 300}`,
        subtitle: box.subtitle || 'Aivolution',
        media_type: box.media_type || 'none',
        media_url: box.media_url || null,
      }))
      const { error } = await supabase
        .from('promo_slots')
        .upsert(payload, { onConflict: 'slot_id' })
      if (error) throw error
      alert('Promo-Boxen gespeichert.')
    } catch (error: any) {
      alert(`Speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setPromoSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = plans.map((plan) => ({
        id: plan.id,
        plan_number: plan.plan_number,
        name: plan.name || `${plan.plan_number}`,
        monthly_price: Number(plan.monthly_price || 0),
        storage_gb: Number(plan.storage_gb || 0),
        stripe_price_id: plan.stripe_price_id || null,
      }))
      const { data, error } = await supabase
        .from('subscription_plans')
        .upsert(payload, { onConflict: 'plan_number' })
        .select('*')
      if (error) throw error
      if (data) {
        setPlans(
          data
            .sort((a: any, b: any) => a.plan_number - b.plan_number)
            .map((row: any) => ({
              id: row.id,
              plan_number: row.plan_number,
              name: row.name || `${row.plan_number}`,
              monthly_price: Number(row.monthly_price || 0),
              storage_gb: Number(row.storage_gb || 0),
              stripe_price_id: row.stripe_price_id || null,
            }))
        )
      }
      alert('Abo-Modelle gespeichert.')
    } catch (error: any) {
      alert(`Speichern fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSendMessage = async () => {
    if (messageTarget === 'plan' && !messagePlanId && !messagePlanNumber) {
      alert('Bitte ein Abo-Modell auswählen.')
      return
    }
    if (!messageSubject.trim() || !messageContent.trim()) {
      alert('Betreff und Nachricht ausfüllen.')
      return
    }
    try {
      setSendingMessage(true)
      const res = await fetch('/api/admin/subscription-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: messagePlanId || null,
          planNumber: messagePlanNumber ? Number(messagePlanNumber) : null,
          target: messageTarget,
          subject: messageSubject.trim(),
          content: messageContent.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Senden fehlgeschlagen')
      alert(`Nachrichten gesendet: ${json?.sent || 0}`)
      setMessageSubject('')
      setMessageContent('')
    } catch (error: any) {
      alert(`Senden fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
              Abo <span className="text-red-600">Modelle</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-2">
              Verwaltung der 6 Creator-Modelle
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Modelle (1–6)</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white px-4 py-2 text-xs font-black uppercase rounded-full hover:bg-red-600 transition-colors"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>

        {loading ? (
          <p className="text-xs font-mono text-zinc-500">Lade Modelle...</p>
        ) : loadError ? (
          <div className="border-2 border-red-600 bg-red-50 rounded-2xl p-4">
            <p className="text-xs font-mono text-red-700">
              Plans laden fehlgeschlagen: {loadError}
            </p>
            <p className="text-[11px] font-mono text-red-600 mt-2">
              Hinweis: Stelle sicher, dass `supabase_subscription_plans.sql` ausgeführt wurde.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan, index) => (
              <div key={plan.plan_number} className="border-2 border-black rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase">Modell {plan.plan_number}</span>
                  <span className="text-[10px] font-mono text-zinc-500">ID: {plan.id ? 'gesetzt' : 'neu'}</span>
                </div>
                <div className="space-y-2">
                  <input
                    value={plan.name}
                    onChange={(e) => updatePlan(index, { name: e.target.value })}
                    placeholder={`Name (z.B. ${plan.plan_number})`}
                    className="w-full border-2 border-black rounded-full px-4 py-2 text-xs font-bold uppercase"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={plan.monthly_price}
                      onChange={(e) => updatePlan(index, { monthly_price: Number(e.target.value) })}
                      placeholder="Preis €/Monat"
                      className="w-full border-2 border-black rounded-full px-4 py-2 text-xs"
                    />
                    <input
                      type="number"
                      value={plan.storage_gb}
                      onChange={(e) => updatePlan(index, { storage_gb: Number(e.target.value) })}
                      placeholder="Storage (GB)"
                      className="w-full border-2 border-black rounded-full px-4 py-2 text-xs"
                    />
                  </div>
                  <input
                    value={plan.stripe_price_id || ''}
                    onChange={(e) => updatePlan(index, { stripe_price_id: e.target.value })}
                    placeholder="Stripe Price ID (optional)"
                    className="w-full border-2 border-black rounded-full px-4 py-2 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Reusable Promo‑Boxen (1–6)</h2>
            <p className="text-[11px] font-mono opacity-60 mt-1">
              Hochformatig, wiederverwendbar in anderen Bereichen.
            </p>
          </div>
          <button
            onClick={handleSavePromoBoxes}
            disabled={promoSaving}
            className="bg-black text-white px-4 py-2 text-xs font-black uppercase rounded-full hover:bg-red-600 transition-colors"
          >
            {promoSaving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>

        {promoLoading ? (
          <p className="text-xs font-mono text-zinc-500">Lade Boxen...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {promoBoxes.map((box, index) => (
              <div key={box.slot_id} className="border-2 border-black rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase">Box {index + 1}</span>
                  <span className="text-[10px] font-mono text-zinc-500">slot_id: {box.slot_id}</span>
                </div>
                <div className="space-y-3">
                  <div className="w-full aspect-[9/16] rounded-[1.5rem] border-2 border-dashed border-zinc-300 bg-zinc-50 overflow-hidden flex items-center justify-center">
                    {box.media_url ? (
                      <img src={box.media_url} alt={box.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500">JPG hochladen</span>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePromoImageUpload(index, file)
                      }}
                      disabled={promoSaving}
                    />
                    <div className="w-full text-center border-2 border-black rounded-full py-2 text-[11px] font-black uppercase hover:bg-black hover:text-white transition-colors">
                      Bild wählen
                    </div>
                  </label>
                  <input
                    value={box.title}
                    onChange={(e) => updatePromoBox(index, { title: e.target.value })}
                    placeholder={`Titel Box ${index + 1}`}
                    className="w-full border-2 border-black rounded-full px-4 py-2 text-xs font-bold uppercase"
                  />
                  <input
                    value={box.subtitle}
                    onChange={(e) => updatePromoBox(index, { subtitle: e.target.value })}
                    placeholder="Subtitel"
                    className="w-full border-2 border-black rounded-full px-4 py-2 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-8">
        <h2 className="text-xl font-black uppercase tracking-tight mb-4">Nachricht an Abo‑Gruppe</h2>
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMessageTarget('plan')}
              className={`px-4 py-2 text-xs font-bold uppercase border-2 rounded-full ${
                messageTarget === 'plan' ? 'bg-black text-white border-black' : 'border-black bg-white'
              }`}
            >
              Nur Abo‑Modell
            </button>
            <button
              type="button"
              onClick={() => setMessageTarget('all')}
              className={`px-4 py-2 text-xs font-bold uppercase border-2 rounded-full ${
                messageTarget === 'all' ? 'bg-black text-white border-black' : 'border-black bg-white'
              }`}
            >
              Alle Creator
            </button>
          </div>
          {messageTarget === 'plan' && (
            <select
              value={messagePlanId || messagePlanNumber}
              onChange={(e) => {
                const value = e.target.value
                setMessagePlanId(value.startsWith('id:') ? value.replace('id:', '') : '')
                setMessagePlanNumber(value.startsWith('num:') ? value.replace('num:', '') : '')
              }}
              className="border-2 border-black rounded-full px-4 py-2 text-xs font-bold uppercase"
            >
              <option value="">Abo-Modell auswählen</option>
              {planOptions.map((plan) => (
                <option key={plan.plan_number} value={plan.id ? `id:${plan.id}` : `num:${plan.plan_number}`}>
                  {plan.name || `Modell ${plan.plan_number}`}
                </option>
              ))}
            </select>
          )}
          <input
            value={messageSubject}
            onChange={(e) => setMessageSubject(e.target.value)}
            placeholder="Betreff"
            className="border-2 border-black rounded-full px-4 py-2 text-xs"
          />
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Nachricht"
            className="border-2 border-black rounded-2xl px-4 py-3 text-xs min-h-[120px]"
          />
          <button
            onClick={handleSendMessage}
            disabled={sendingMessage}
            className="bg-black text-white px-4 py-2 text-xs font-black uppercase rounded-full hover:bg-red-600 transition-colors"
          >
            {sendingMessage ? 'Senden...' : 'Nachricht senden'}
          </button>
        </div>
      </div>
    </div>
  )
}
