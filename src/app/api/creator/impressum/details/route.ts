import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildImpressumSvg(input: {
  legal_name: string
  street: string
  zip_city: string
  country?: string
  email?: string
  phone?: string
  website?: string
}) {
  const lines = [
    input.legal_name,
    input.street,
    input.zip_city,
    input.country || '',
    input.email ? `E-Mail: ${input.email}` : '',
    input.phone ? `Telefon: ${input.phone}` : '',
    input.website ? `Web: ${input.website}` : '',
  ].filter(Boolean)

  const lineEls = lines
    .map((line, i) => `<text x="68" y="${170 + i * 54}" font-size="30" font-family="Arial, Helvetica, sans-serif" fill="#111">${esc(line)}</text>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <pattern id="dotGrid" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="0.8" fill="#111" opacity="0.06"/>
    </pattern>
    <pattern id="noise" width="120" height="120" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="18" r="1.2" fill="#000" opacity="0.05"/>
      <circle cx="84" cy="14" r="1" fill="#000" opacity="0.04"/>
      <circle cx="42" cy="66" r="1.4" fill="#000" opacity="0.05"/>
      <circle cx="98" cy="78" r="1.2" fill="#000" opacity="0.04"/>
      <circle cx="26" cy="96" r="1" fill="#000" opacity="0.04"/>
    </pattern>
    <pattern id="diagLines" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
      <line x1="0" y1="0" x2="0" y2="36" stroke="#111" stroke-width="1" opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="#f4f4f5"/>
  <rect x="32" y="32" width="1536" height="836" rx="36" fill="#ffffff" stroke="#111" stroke-width="2"/>
  <rect x="32" y="32" width="1536" height="836" rx="36" fill="url(#dotGrid)"/>
  <rect x="32" y="32" width="1536" height="836" rx="36" fill="url(#noise)" opacity="0.35"/>
  <rect x="32" y="32" width="1536" height="836" rx="36" fill="url(#diagLines)" opacity="0.25"/>

  <text x="68" y="120" font-size="48" font-weight="700" font-family="Arial, Helvetica, sans-serif" fill="#dc2626">Creator Impressum</text>
  <rect x="68" y="136" width="420" height="6" rx="3" fill="#111" opacity="0.08"/>

  ${lineEls}

  <g opacity="0.24">
    <text x="1180" y="120" font-size="12" font-family="Arial, Helvetica, sans-serif" fill="#111" transform="rotate(-8 1180 120)">
      AIVOLUTION • SCHUTZLAYER
    </text>
    <text x="1120" y="820" font-size="12" font-family="Arial, Helvetica, sans-serif" fill="#111" transform="rotate(-8 1120 820)">
      AIVOLUTION • SCHUTZLAYER
    </text>
  </g>
  <g opacity="0.12">
    <text x="220" y="520" font-size="18" font-family="Arial, Helvetica, sans-serif" fill="#111" transform="rotate(-18 220 520)">
      AIVOLUTION • CREATOR IMPRESSUM • NICHT MASCHINELL AUSLESEN
    </text>
    <text x="680" y="640" font-size="16" font-family="Arial, Helvetica, sans-serif" fill="#111" transform="rotate(-18 680 640)">
      AIVOLUTION • CREATOR IMPRESSUM • NICHT MASCHINELL AUSLESEN
    </text>
  </g>
  <g opacity="0.35">
    <text x="1180" y="760" font-size="10" letter-spacing="2" font-family="Arial, Helvetica, sans-serif" fill="#111" transform="rotate(-8 1180 760)">
      AIVOLUTIONMUSIC • CREATOR • LEGAL • SECURE • AIVOLUTIONMUSIC • CREATOR • LEGAL • SECURE
    </text>
  </g>

  <text x="68" y="840" font-size="16" font-family="Arial, Helvetica, sans-serif" fill="#666">Aivolution Music · geschützte Darstellung gegen automatisches Auslesen</text>
  <g opacity="0.09">
    <circle cx="1460" cy="140" r="72" fill="#dc2626"/>
    <circle cx="1360" cy="760" r="58" fill="#111"/>
  </g>
</svg>`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const legal_name = String(body?.legal_name || '').trim()
  const street = String(body?.street || '').trim()
  const zip_city = String(body?.zip_city || '').trim()
  const country = String(body?.country || 'Deutschland').trim()
  const email = String(body?.email || '').trim()
  const phone = String(body?.phone || '').trim()
  const website = String(body?.website || '').trim()

  if (!legal_name || !street || !zip_city) {
    return NextResponse.json({ error: 'Name, Straße und PLZ/Ort sind Pflicht.' }, { status: 400 })
  }

  const svg = buildImpressumSvg({ legal_name, street, zip_city, country, email, phone, website })
  const storagePath = `${user.id}/impressum-generated.svg`

  const { error: uploadError } = await supabase.storage
    .from('creator-impressum')
    .upload(storagePath, new Blob([svg], { type: 'image/svg+xml' }), {
      upsert: true,
      contentType: 'image/svg+xml',
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { error: detailsError } = await supabase
    .from('creator_impressum_details')
    .upsert({
      creator_id: user.id,
      legal_name,
      street,
      zip_city,
      country,
      email: email || null,
      phone: phone || null,
      website: website || null,
      is_active: true,
    }, { onConflict: 'creator_id' })

  if (detailsError) {
    return NextResponse.json({ error: detailsError.message }, { status: 400 })
  }

  const { error: assetError } = await supabase
    .from('creator_impressum_assets')
    .upsert({
      creator_id: user.id,
      storage_path: storagePath,
      mime_type: 'image/svg+xml',
      is_active: true,
      protection_level: 'standard',
    }, { onConflict: 'creator_id' })

  if (assetError) {
    console.error('Impressum Asset Error:', assetError)
    // Fallback: Nur Details speichern, wenn Asset fehlschlägt
    return NextResponse.json({ 
      ok: true, 
      warning: 'Asset konnte nicht gespeichert werden, aber Details sind gesichert' 
    })
  }

  return NextResponse.json({ ok: true })
}
