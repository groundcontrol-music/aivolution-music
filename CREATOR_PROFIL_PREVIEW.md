# 🎸 Creator-Profil – Besuchersicht

## 🔗 URL-Struktur

```
/creator/[slug]
```

**Beispiele:**
- `/creator/dj-beatmaster`
- `/creator/synthwave-producer`
- `/creator/ai-music-lab`

---

## 📋 Was Besucher sehen (nach Freischaltung)

### 1. **Header-Bereich**
- Avatar (groß, rund)
- Künstlername (H1)
- Bio
- Tech-Stack (Pills)
- Social Links (Spotify, Instagram, SoundCloud, TikTok, YouTube)

### 2. **//THE LAB (Shop)**
- Alle Songs des Creators (nur `is_probe = false`)
- Preis-Anzeige
- Genre-Tags
- "In den Warenkorb"-Button
- Audio-Player (Vorschau)

### 3. **Mini-Forum**
- Besucher können Kommentare hinterlassen
- Creator kann antworten
- Chronologisch sortiert
- Login erforderlich zum Kommentieren

---

## 🧪 So kannst du ein Test-Profil sehen:

### Option 1: Schnell-Demo (ohne Registrierung)

**Erstelle einen Demo-Creator in der Datenbank:**

```sql
-- 1. Erstelle Demo-User (manuell in Supabase)
-- Gehe zu: Authentication → Users → Add User
-- Email: demo-creator@aivolution.test
-- Password: (dein Testpasswort)

-- 2. Füge Profil hinzu
INSERT INTO public.profiles (id, artist_name, artist_name_slug, bio, tech_stack, role, onboarding_status, avatar_url)
VALUES (
  'USER_ID_VON_OBEN', -- Kopiere die UUID vom erstellten User
  'Demo Creator',
  'demo-creator',
  'Ich bin ein Test-Creator für die Vorschau. Erstellt mit KI-Tools!',
  ARRAY['Suno', 'Udio'],
  'creator',
  'approved',
  NULL -- Oder URL zu einem Test-Avatar
);

-- 3. Füge Test-Songs hinzu
INSERT INTO public.songs (user_id, title, genres, price, is_probe, file_url)
VALUES 
  ('USER_ID_VON_OBEN', 'Cyberpunk Nights', ARRAY['Synthwave', 'Electronic'], 2.99, false, 'https://example.com/song1.mp3'),
  ('USER_ID_VON_OBEN', 'AI Dreams', ARRAY['Ambient', 'Lo-Fi'], 1.99, false, 'https://example.com/song2.mp3');
```

**Dann:**
- Öffne `/creator/demo-creator`
- Du siehst das Profil aus Besuchersicht!

---

### Option 2: Echter Creator-Flow (empfohlen)

1. **Registriere dich als Test-Creator:**
   - Gehe zu `/creator-signup`
   - Nutze eine Test-Email (z.B. `test@example.com`)
   - Fülle das Profil aus
   - Lade 2 MP3s hoch (oder nutze Dummy-Files)

2. **Schalte dich selbst frei (als Admin):**
   - Gehe zu `/admin/applications`
   - Deine Bewerbung sollte erscheinen
   - Klicke "Freischalten"

3. **Öffne dein Profil:**
   - Gehe zu `/creator/[dein-slug]`
   - Du siehst das Profil aus Besuchersicht!

---

## 📸 Screenshot-Vorschau (Struktur)

```
┌─────────────────────────────────────┐
│  [Avatar]  DJ BEATMASTER            │
│            Bio: "AI Music Producer" │
│            [Suno] [Udio] [AIVA]    │
│            🎵 Spotify | 📷 IG      │
├─────────────────────────────────────┤
│  //THE LAB (Shop)                   │
│  ┌──────────┐ ┌──────────┐         │
│  │ Song 1   │ │ Song 2   │         │
│  │ 2.99€    │ │ 1.99€    │         │
│  │ [Warenkorb]│[Warenkorb]│         │
│  └──────────┘ └──────────┘         │
├─────────────────────────────────────┤
│  MINI-FORUM                         │
│  💬 "Geiler Track!" - User123       │
│  💬 "Danke!" - DJ Beatmaster       │
│  [Kommentar schreiben...]           │
└─────────────────────────────────────┘
```

---

## 🎯 Was funktioniert JETZT:

✅ **Creator-Profil-Seite** (`/creator/[slug]`)
✅ **Shop-Integration** (Songs mit Preis, Warenkorb-Button)
✅ **Mini-Forum** (Kommentare, Antworten)
✅ **Social Links** (Spotify, Instagram, etc.)
✅ **Tech-Stack-Anzeige**

---

## 🚧 Was noch kommt (nach Freischaltung testen):

- [ ] **Audio-Player** (MP3-Vorschau/Play)
- [ ] **TikTok-Integration** (Creator kann TikTok-Videos einbetten)
- [ ] **Verkaufsstatistiken** (für Creator im Dashboard)
- [ ] **Download-Bereich** (nach Kauf)

---

## 🔄 Workflow für vollständigen Test:

1. ✅ SQL-Skripte ausführen (`supabase_security_fixes.sql`, `supabase_admin_profiles_rls.sql`)
2. ✅ Creator-Signup testen (`/creator-signup`)
3. ✅ Admin-Freischaltung testen (`/admin/applications`)
4. ✅ Creator-Profil öffnen (`/creator/[slug]`)
5. ✅ Song in Warenkorb legen
6. ✅ Mini-Forum testen (Kommentar schreiben)

---

## 💡 Tipp: Quick-Access

Wenn du das erste Creator-Profil freigeschaltet hast, erscheint es automatisch auf der Startseite unter **"Neue Creator"**. Einfach darauf klicken!
