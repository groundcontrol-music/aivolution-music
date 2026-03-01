'use client'

import { useState } from 'react'

export default function ImpressumImage({ slug, alt }: { slug: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  const src = `/api/public/impressum-image?slug=${encodeURIComponent(slug)}`

  if (failed) {
    return (
      <p className="text-sm text-zinc-500 text-center py-6">
        Noch kein Impressumsbild hinterlegt. Creator kann unter „Impressum bearbeiten“ ein Bild erzeugen.
      </p>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-auto rounded-xl select-none pointer-events-none"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
