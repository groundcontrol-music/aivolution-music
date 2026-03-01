'use client'

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'

type Key = 'impressum' | 'agb' | 'datenschutz' | 'hilfe'

type Props = {
  variant: 'home' | 'creator'
  creatorImpressumLink?: string
  creatorImpressumLabel?: string
}

const FRAME_CLASS = 'bg-white border-2 border-black rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]'

export default function FooterWithModal({ variant, creatorImpressumLink, creatorImpressumLabel = 'Creator Impressum (klick)' }: Props) {
  const [open, setOpen] = useState<Key | null>(null)
  const [content, setContent] = useState<{ title: string; body: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const openModal = useCallback(async (key: Key) => {
    setOpen(key)
    setContent(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/public/legal/${key}`)
      const data = await res.json()
      setContent({
        title: data?.title || key.charAt(0).toUpperCase() + key.slice(1),
        body: data?.content || 'Kein Inhalt hinterlegt. Bearbeite unter Kommandozentrale → Terms verwalten.',
      })
    } catch {
      const titles: Record<Key, string> = { impressum: 'Impressum', agb: 'AGB', datenschutz: 'Datenschutz', hilfe: 'Hilfe' }
      setContent({
        title: titles[key] || key,
        body: 'Inhalt wird geladen…',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const linkClass = 'hover:text-black transition-colors cursor-pointer'
  const sep = <span className="text-zinc-300">·</span>

  return (
    <>
      <footer className={variant === 'home' ? 'col-span-12 pt-6 pb-4 px-4 md:px-6 border-t border-zinc-200 mt-6' : 'px-4 md:px-6 pb-6 text-center'}>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">
          {variant === 'creator' && creatorImpressumLink && (
            <>
              <a href={creatorImpressumLink} className="underline underline-offset-4 hover:text-red-600">
                {creatorImpressumLabel}
              </a>
              {sep}
            </>
          )}
          {variant === 'home' && (
            <>
              <button type="button" onClick={() => openModal('impressum')} className={linkClass}>
                Impressum
              </button>
              {sep}
            </>
          )}
          <button type="button" onClick={() => openModal('agb')} className={linkClass}>
            AGB
          </button>
          {sep}
          <button type="button" onClick={() => openModal('datenschutz')} className={linkClass}>
            Datenschutz
          </button>
          {sep}
          <button type="button" onClick={() => openModal('hilfe')} className={linkClass}>
            Hilfe
          </button>
        </div>
      </footer>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className={`${FRAME_CLASS} w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b-2 border-black">
              <h2 className="text-xl font-black uppercase italic">
                <span className="text-red-600">{loading ? '…' : content?.title || open}</span>
              </h2>
              <button
                onClick={() => setOpen(null)}
                className="p-2 border-2 border-black rounded-full hover:bg-black hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 text-sm md:text-base leading-relaxed whitespace-pre-wrap text-zinc-800">
              {loading ? 'Laden…' : content?.body}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
