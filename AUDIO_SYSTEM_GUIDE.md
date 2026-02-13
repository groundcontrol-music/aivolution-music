# Audio System: WAV (Verkauf) + MP3 (Preview)

## 🎯 Konzept

**Beim Upload (Bewerbung):**
- 📀 Creator lädt **WAV-Dateien** hoch (hochwertig, max. 50MB)
- ⏸️ **KEINE** MP3-Generierung sofort (spart Storage bei Ablehnungen)

**Bei Freischaltung:**
- 🔄 **Automatische MP3-Generierung** (30 Sek., 128kbps) via Edge Function
- 🔒 **WAV bleibt geschützt** (nur für Käufer zugänglich)
- 🎧 **MP3 für öffentliches Anhören** (Startseite, Profil)

**Zentraler Player:**
- 📊 **Weiße Leiste unten** (sticky footer)
- 🔄 **Song lädt NICHT neu** bei Navigation (Global State)
- 🎮 **Play/Pause, Skip, Volume**

---

## 📁 Neue Dateien

### Frontend:
- `src/contexts/PlayerContext.tsx` → Global Player State
- `src/components/GlobalPlayer.tsx` → Sticky Player UI
- `src/app/join/page.tsx` → Upload auf WAV umgestellt

### Backend:
- `supabase_audio_system.sql` → Spalten, Buckets, RLS Policies
- `supabase/functions/generate-mp3-previews/index.ts` → Edge Function

---

## 🔧 Setup-Schritte

### 1. **Storage Buckets erstellen**

In **Supabase Dashboard → Storage**:

**Bucket 1: `songs-wav`** (PRIVATE)
- Public: **NO**
- Allowed MIME types: `audio/wav`, `audio/wave`, `audio/x-wav`
- Max file size: 50MB

**Bucket 2: `songs-mp3`** (PUBLIC)
- Public: **YES**
- Allowed MIME types: `audio/mpeg`, `audio/mp3`
- Max file size: 5MB

### 2. **SQL ausführen**

```sql
-- In Supabase SQL Editor:
-- (Kopiere Inhalt von supabase_audio_system.sql)
```

**Was passiert:**
- Spalten `wav_url`, `mp3_preview_url`, `preview_generated` werden hinzugefügt
- RLS Policies für WAV (geschützt) und MP3 (öffentlich)
- Trigger für automatische MP3-Generierung
- Stats-Function `get_audio_storage_stats()`

### 3. **Edge Function deployen**

**Voraussetzungen:**
- Supabase CLI installiert: `npm install -g supabase`
- FFmpeg in Edge Function Environment

**Deployment:**
```bash
# Login
supabase login

# Link Projekt
supabase link --project-ref YOUR_PROJECT_ID

# Deploy Function
supabase functions deploy generate-mp3-previews

# Set Secrets
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**FFmpeg Installation (Edge Function):**
```typescript
// In index.ts Header:
// FFmpeg via Deno.Command requires FFmpeg binary in environment
// Add FFmpeg Layer: https://github.com/supabase/supabase/discussions/9918
```

### 4. **Trigger konfigurieren**

Die Edge Function wird automatisch getriggert, wenn ein Creator freigeschaltet wird:

```sql
-- Bereits in supabase_audio_system.sql enthalten:
CREATE TRIGGER trigger_mp3_generation_on_approval
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mp3_generation();
```

**Manuelle Trigger:**
```sql
-- Für Testing:
SELECT trigger_mp3_generation();
```

**Via HTTP:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-mp3-previews \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "UUID_HERE"}'
```

---

## 🎮 Player-Usage (Frontend)

### In jeder Komponente:

```tsx
import { usePlayer } from '@/contexts/PlayerContext'

export default function SongCard({ song }: { song: any }) {
  const { play } = usePlayer()

  return (
    <button onClick={() => play({
      id: song.id,
      title: song.title,
      artist: song.artist_name,
      preview_url: song.mp3_preview_url, // 30 Sek. MP3
      cover: song.cover_url
    })}>
      🎵 Abspielen
    </button>
  )
}
```

**Player-Controls:**
```tsx
const { 
  currentTrack,  // Aktueller Song
  isPlaying,     // true/false
  progress,      // Sekunden
  duration,      // Gesamt-Länge
  play,          // (track) => void
  pause,         // () => void
  resume,        // () => void
  seek,          // (time) => void
  setVolume      // (0-1) => void
} = usePlayer()
```

---

## 📊 Storage & Kosten

### Speicherbedarfbeispiel:

**1 Song:**
- WAV (44.1kHz, 16bit, Stereo, 3 Min.): ~30 MB
- MP3 (128kbps, 30 Sek.): ~480 KB

**100 Songs:**
- WAV: 3 GB (geschützt)
- MP3: 48 MB (öffentlich)

**1000 Songs:**
- WAV: 30 GB
- MP3: 480 MB

**Supabase Free Tier:**
- Storage: 1 GB (für ~33 WAVs)
- Pro Plan: 100 GB ($25/month)

**Kosten-Optimierung:**
- Bei Ablehnung: WAV wird sofort gelöscht ✅
- MP3 nur bei Freischaltung generiert ✅
- Alte/inaktive Songs archivieren (nach 1 Jahr)

---

## 🔐 Sicherheit

### WAV-Dateien (geschützt):
- ✅ **Private Bucket** (`songs-wav`)
- ✅ **RLS Policies:** Nur Creator & Käufer können zugreifen
- ✅ **Audit-Log:** Jeder Download wird protokolliert (TODO)

### MP3-Previews (öffentlich):
- ✅ **Public Bucket** (`songs-mp3`)
- ✅ **Nur 30 Sekunden** (Copyright-Safe)
- ✅ **Watermark möglich** (Optional: "Preview von aivolution-music.de")

### Download-Schutz:
```sql
-- WAV nur für Käufer
CREATE POLICY "Buyers can download purchased WAVs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'songs-wav' 
    AND EXISTS (
      SELECT 1 FROM public.purchases
      WHERE song_id = ... AND buyer_id = auth.uid()
    )
  );
```

---

## 🚀 Testing

### 1. Creator-Signup testen:
```bash
# 1. Gehe zu /join
# 2. Registriere dich als Creator
# 3. Lade 1-2 WAV-Dateien hoch
# 4. Prüfe: Songs in DB mit wav_url
```

### 2. Admin-Approval testen:
```bash
# 1. Login als Admin
# 2. Gehe zu /admin/applications
# 3. Klicke "Freischalten"
# 4. Prüfe: Edge Function wird getriggert
# 5. Warte 30-60 Sek. (FFmpeg-Konvertierung)
# 6. Prüfe: Songs haben jetzt mp3_preview_url
```

### 3. Player testen:
```bash
# 1. Gehe zur Startseite
# 2. Klicke auf "Play" bei einem Song
# 3. Prüfe: Player erscheint unten
# 4. Navigiere zu anderer Seite
# 5. Prüfe: Song spielt weiter (kein Reload!)
```

### 4. Storage Stats:
```sql
SELECT * FROM get_audio_storage_stats();

-- Ergebnis:
-- total_songs | songs_with_wav | songs_with_mp3 | wav_storage_mb | mp3_storage_mb
-- ------------|----------------|----------------|----------------|---------------
--          10 |             10 |             10 |          300.5 |           4.8
```

---

## ⚠️ Known Issues & TODOs

### Issues:
- [ ] FFmpeg muss in Edge Function Environment verfügbar sein
- [ ] Große WAV-Dateien (>50MB) können Upload-Timeout verursachen
- [ ] MP3-Generierung dauert 30-60 Sek. (async, User wartet)

### TODOs:
- [ ] Watermark für MP3-Previews hinzufügen
- [ ] Download-Audit-Log für WAV-Käufe
- [ ] Playlist-Funktion im Player
- [ ] Shuffle & Repeat Buttons
- [ ] Equalizer (optional)
- [ ] Share-Button (Song teilen)

---

## 📝 Zusammenfassung

✅ **Upload:** WAV-Dateien (hochwertig, max. 50MB)  
✅ **Preview:** MP3 (30 Sek., automatisch generiert bei Freischaltung)  
✅ **Player:** Global, sticky, kein Reload bei Navigation  
✅ **Sicherheit:** WAV geschützt, MP3 öffentlich  
✅ **Ressourcen:** Effizient (nur bei Approval MP3 generieren)

**Next Steps:**
1. Storage Buckets erstellen
2. SQL ausführen
3. Edge Function deployen
4. Testen!

🚀 **Ready to rock!**
