import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim()
  return request.headers.get('x-real-ip') || request.ip || ''
}

const hashIp = (ip: string) => {
  if (!ip) return null
  const salt = process.env.IP_HASH_SALT || 'aivolution'
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

const isMp3Header = (bytes: Uint8Array) => {
  if (bytes.length < 2) return false
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33
  const frameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
  return id3 || frameSync
}

const isWavHeader = (bytes: Uint8Array) => {
  if (bytes.length < 12) return false
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF'
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WAVE'
  return riff && wave
}

const getFileSizeFromHeaders = (res: Response) => {
  const contentRange = res.headers.get('content-range')
  if (contentRange && contentRange.includes('/')) {
    const total = contentRange.split('/')[1]
    const size = Number(total)
    return Number.isFinite(size) ? size : null
  }
  const contentLength = res.headers.get('content-length')
  if (!contentLength) return null
  const size = Number(contentLength)
  return Number.isFinite(size) ? size : null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
  }

  const { songIds } = await request.json()
  if (!Array.isArray(songIds) || songIds.length === 0) {
    return NextResponse.json({ error: 'Keine Song-IDs erhalten' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('artist_name')
    .eq('id', user.id)
    .single()

  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('id, title, file_url, mp3_preview_url, wav_url')
    .in('id', songIds)
    .eq('user_id', user.id)

  if (songsError || !songs?.length) {
    return NextResponse.json({ error: 'Songs nicht gefunden' }, { status: 404 })
  }

  const { data: filters } = await supabase
    .from('content_filters')
    .select('word')

  const blockedWords = (filters || [])
    .map((f: any) => String(f.word || '').trim().toLowerCase())
    .filter(Boolean)

  const ip = getClientIp(request)
  const ipHash = hashIp(ip)
  const hashExpiresAt = ipHash ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null

  const results: any[] = []

  for (const song of songs) {
    const reasons: string[] = []
    const needsReviewReasons: string[] = []

    const title = String(song.title || '')
    const artistName = String(profile?.artist_name || '')
    const combinedText = `${title} ${artistName}`.toLowerCase()

    const matchedBadword = blockedWords.find((word) => combinedText.includes(word))
    if (matchedBadword) {
      reasons.push(`badword:${matchedBadword}`)
    }

    const fileUrl = song.file_url || song.wav_url || song.mp3_preview_url
    let formatOk = false
    let sizeBytes: number | null = null

    if (fileUrl) {
      try {
        const rangeRes = await fetch(fileUrl, { headers: { Range: 'bytes=0-31' } })
        const buffer = new Uint8Array(await rangeRes.arrayBuffer())
        sizeBytes = getFileSizeFromHeaders(rangeRes)
        formatOk = isMp3Header(buffer) || isWavHeader(buffer)
      } catch {
        needsReviewReasons.push('file_access_failed')
      }
    } else {
      needsReviewReasons.push('missing_file_url')
    }

    if (!formatOk) {
      reasons.push('invalid_audio_header')
    }

    if (sizeBytes !== null) {
      if (sizeBytes < 50 * 1024) {
        reasons.push('file_too_small')
      } else if (sizeBytes < 200 * 1024) {
        needsReviewReasons.push('suspicious_size')
      }
    }

    if (/(cover|remix|mashup|bootleg)/i.test(title)) {
      needsReviewReasons.push('copyright_check')
    }

    const status = reasons.length > 0 ? 'blocked' : needsReviewReasons.length > 0 ? 'needs_review' : 'pending'
    const reviewReason = [...reasons, ...needsReviewReasons].join(' | ') || null
    const confidenceScore = Math.max(0, 100 - (reasons.length * 35 + needsReviewReasons.length * 15))

    await supabase
      .from('songs')
      .update({
        upload_status: status,
        review_reason: reviewReason,
        confidence_score: confidenceScore,
      })
      .eq('id', song.id)

    if (status !== 'pending') {
      await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_content_type: 'song',
        reported_content_id: song.id,
        reason: reviewReason,
        status: 'pending',
        ip_hash: ipHash,
        ip_hash_expires_at: hashExpiresAt,
      })
    }

    results.push({ id: song.id, status, reviewReason })
  }

  return NextResponse.json({ ok: true, results })
}
