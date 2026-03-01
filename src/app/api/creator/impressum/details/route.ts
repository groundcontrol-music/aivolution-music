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
    .map((line, i) => `<text x="36" y="${110 + i * 48}" font-size="30" font-family="Arial, Helvetica, sans-serif" fill="#111">${esc(line)}</text>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#f4f4f5"/>
  <rect x="24" y="24" width="1552" height="852" rx="30" fill="#fff" stroke="#111" stroke-width="4"/>
  <text x="36" y="70" font-size="42" font-weight="700" font-family="Arial, Helvetica, sans-serif" fill="#dc2626">Creator Impressum</text>
  ${lineEls}
  <text x="36" y="850" font-size="16" font-family="Arial, Helvetica, sans-serif" fill="#666">Aivolution Music · geschützte Darstellung gegen automatisches Auslesen</text>
  <g opacity="0.08">
    <circle cx="1460" cy="120" r="72" fill="#dc2626"/>
    <circle cx="1360" cy="780" r="58" fill="#111"/>
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
