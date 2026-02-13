// ============================================================
// EDGE FUNCTION: MP3-Preview-Generierung (30 Sek.)
// ============================================================
// Triggered bei Creator-Approval
// Konvertiert WAV → MP3 (30 Sek., 128kbps)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// FFmpeg via Deno.Command (requires FFmpeg in environment)
async function generateMP3Preview(
  inputWavPath: string,
  outputMp3Path: string
): Promise<void> {
  const command = new Deno.Command('ffmpeg', {
    args: [
      '-i', inputWavPath,          // Input WAV
      '-t', '30',                  // 30 Sekunden
      '-codec:a', 'libmp3lame',    // MP3 Codec
      '-b:a', '128k',              // 128 kbps Bitrate
      '-ar', '44100',              // 44.1 kHz Sample Rate
      '-ac', '2',                  // Stereo
      '-y',                        // Overwrite
      outputMp3Path
    ],
    stdout: 'piped',
    stderr: 'piped',
  })

  const { code, stdout, stderr } = await command.output()

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr)
    throw new Error(`FFmpeg failed: ${errorText}`)
  }

  console.log('✅ MP3 generated:', outputMp3Path)
}

serve(async (req) => {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Supabase Client (Service Role Key für Admin-Zugriff)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Hole alle Songs des Users (nicht-Proben)
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, title, wav_url, user_id')
      .eq('user_id', user_id)
      .eq('is_probe', false)
      .is('mp3_preview_url', null)

    if (songsError) throw songsError
    if (!songs || songs.length === 0) {
      return new Response(JSON.stringify({ message: 'No songs to process' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`🎵 Processing ${songs.length} songs for user ${user_id}`)

    // 2. Für jeden Song: WAV → MP3
    for (const song of songs) {
      if (!song.wav_url) continue

      try {
        // Extract filename from URL
        const wavFileName = song.wav_url.split('/').pop()!
        const mp3FileName = wavFileName.replace(/\.wav$/i, '.mp3')

        // Download WAV from Storage
        const { data: wavBlob, error: downloadError } = await supabase.storage
          .from('songs-wav')
          .download(`${user_id}/${wavFileName}`)

        if (downloadError) throw downloadError

        // Save WAV temporarily
        const tempWavPath = `/tmp/${wavFileName}`
        const tempMp3Path = `/tmp/${mp3FileName}`
        await Deno.writeFile(tempWavPath, new Uint8Array(await wavBlob.arrayBuffer()))

        // Generate MP3 (30 sec preview)
        await generateMP3Preview(tempWavPath, tempMp3Path)

        // Upload MP3 to Storage
        const mp3Data = await Deno.readFile(tempMp3Path)
        const { error: uploadError } = await supabase.storage
          .from('songs-mp3')
          .upload(`${user_id}/${mp3FileName}`, mp3Data, {
            contentType: 'audio/mpeg',
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('songs-mp3')
          .getPublicUrl(`${user_id}/${mp3FileName}`)

        // Update Song in DB
        await supabase
          .from('songs')
          .update({
            mp3_preview_url: publicUrl,
            preview_generated: true,
          })
          .eq('id', song.id)

        console.log(`✅ Processed: ${song.title}`)

        // Cleanup
        await Deno.remove(tempWavPath)
        await Deno.remove(tempMp3Path)

      } catch (error) {
        console.error(`❌ Failed to process song ${song.id}:`, error)
        // Continue with next song
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${songs.length} songs`,
        user_id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
