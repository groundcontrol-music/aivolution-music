# Neuer Creator-Signup Flow (DSGVO-optimiert)

## Übersicht

Der neue Signup-Prozess ist **ultra-schlank** und **datenschutzfreundlich**:
- Minimale Datenerfassung beim Signup
- Profilaufbau erst NACH Freischaltung
- Login mit Künstlername (statt Email)
- Automatische Löschung bei Ablehnung

---

## 1. Creator-Signup (SLIM)

**Route:** `/creator-signup-slim`

### Phase 1: Rechtliche Checks + Basis-Daten
Creator gibt an:
- ✅ Künstlername
- ✅ Email (nur für Login & Kontakt)
- ✅ Passwort (min. 6 Zeichen)
- ✅ 6 rechtliche Checkboxen:
  - Alter 18+
  - Rechte an Songs
  - KI-erstellt
  - Keine Gesetzesverstöße
  - AGB akzeptiert
  - Löschung bei Ablehnung verstanden

**Ergebnis:**
```sql
INSERT INTO profiles (
  id, 
  artist_name, 
  role = 'user', -- NOCH KEIN CREATOR!
  onboarding_status = 'pending',
  visibility = 'pending'
)
```

### Phase 2: Song-Upload (MINIMAL)
Creator lädt hoch:
- ✅ Song 1 (Pflicht, max. 10MB MP3)
- ✅ Song 2 (Optional, max. 10MB MP3)

**Ergebnis:**
```sql
INSERT INTO songs (
  user_id,
  title,
  file_url,
  is_probe = true, -- PROBE! Nicht im Shop sichtbar
  price = 2.99
)
```

**Benachrichtigung an Admins:**
```sql
INSERT INTO messages (
  recipient_id = [admin_ids],
  message_type = 'application',
  subject = '🎸 Neue Bewerbung: [KÜNSTLERNAME]',
  content = 'Creator hat sich beworben. Songs: 1-2',
  related_slug = [artist_name_slug]
)
```

---

## 2. Admin-Kuration

### Kuration-Workflow
1. Admin bekommt Nachricht in der Kommandozentrale
2. Admin klickt auf Creator-Link → `/creator/[slug]`
3. Admin sieht **minimales Profil**:
   - Künstlername
   - 2 Songs (als Arbeitsprobe)
   - Keine Bio, kein Avatar, keine Social Links (kommt nach Freischaltung!)
4. Admin entscheidet:
   - ✅ **FREISCHALTEN**: Creator wird aktiviert
   - ❌ **ABLEHNEN**: Alles wird gelöscht

### Bei Freischaltung
```sql
UPDATE profiles SET
  role = 'creator',
  onboarding_status = 'approved',
  visibility = 'public'
WHERE id = [creator_id];

UPDATE songs SET
  is_probe = false -- Jetzt im Shop sichtbar!
WHERE user_id = [creator_id];
```

**Benachrichtigung an Creator:**
```sql
INSERT INTO messages (
  recipient_id = [creator_id],
  status = 'approved',
  subject = '🎉 Du wurdest freigeschaltet!',
  content = 'Baue jetzt dein Profil aus (Bio, Avatar, etc.)'
)
```

### Bei Ablehnung
```sql
-- Lösche Songs (DB + Storage)
DELETE FROM songs WHERE user_id = [creator_id];

-- Lösche Avatar (Storage)
DELETE FROM storage.objects WHERE name LIKE '[creator_id]/%';

-- Setze Profil zurück
UPDATE profiles SET
  role = 'user',
  onboarding_status = 'rejected',
  visibility = 'rejected',
  artist_name = NULL,
  bio = NULL,
  tech_stack = NULL,
  social_links = NULL,
  avatar_url = NULL
WHERE id = [creator_id];
```

**Benachrichtigung an Creator:**
```sql
INSERT INTO messages (
  recipient_id = [creator_id],
  status = 'rejected',
  subject = '❌ Bewerbung abgelehnt',
  content = 'Leider...'
)
```

---

## 3. Login mit Künstlername (DSGVO!)

**Problem:** Email im Login-Feld = Datenschutz-Risiko (sichtbar für Dritte)

**Lösung:** Login mit Künstlername!

### Technische Umsetzung
```sql
-- Lookup-Tabelle
CREATE TABLE artist_logins (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  artist_name_lower TEXT UNIQUE -- lowercase für case-insensitive
);

-- Trigger: Auto-sync mit profiles.artist_name
CREATE TRIGGER sync_artist_login
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_artist_login();
```

### Login-Flow
1. User gibt Künstlername + Passwort ein
2. Backend:
   ```ts
   const userId = await supabase.rpc('find_user_by_artistname', { name })
   const email = await supabase.rpc('get_email_for_user', { user_uuid: userId })
   await supabase.auth.signInWithPassword({ email, password })
   ```
3. User ist eingeloggt ✅

**Vorteil:** Email ist NICHT sichtbar im UI!

---

## 4. Onboarding-Helper (Grüner Button)

### Was ist das?
Ein **grün blinkender Button** (unten rechts), der beim **ersten Profil-Besuch** erscheint:
```tsx
<OnboardingHelper />
```

### Wann wird er angezeigt?
- ✅ `role = 'creator'`
- ✅ `onboarding_status = 'approved'`
- ✅ Erster Besuch (LocalStorage-Check: `onboarding_helper_seen_[user_id]`)

### Was passiert beim Klick?
→ Navigiert zu `/profile-builder`

---

## 5. Profil-Builder (NACH Freischaltung)

**Route:** `/profile-builder`

### Was macht der Creator hier?
Baut sein **vollständiges Profil** aus:
- ✅ **Avatar** hochladen (max. 2MB)
- ✅ **Bio** schreiben (max. 500 Zeichen)
- ✅ **Tech-Stack** angeben (z.B. "Udio, Suno")
- ✅ **Social Links** hinzufügen (Instagram, YouTube, etc.)

### Speichern
```sql
UPDATE profiles SET
  bio = [...],
  tech_stack = [...],
  social_links = [...],
  avatar_url = [...],
  updated_at = NOW()
WHERE id = [creator_id];
```

**Ergebnis:**
→ Navigiert zu `/creator/[slug]` (eigenes Profil!)

---

## 6. SQL-Setup

### Dateien
1. `SQL_QUICK_SETUP.sql` (Basis: RLS, visibility, messages)
2. `supabase_login_with_artistname.sql` (Login mit Künstlername)

### Reihenfolge
```bash
# 1. Basis-Setup (aus vorherigem Prozess)
-- In Supabase SQL Editor ausführen

# 2. Login-Setup (NEU!)
-- supabase_login_with_artistname.sql ausführen
```

---

## 7. Vorteile des neuen Flows

### Datenschutz (DSGVO)
- ✅ Minimale Datenerfassung beim Signup
- ✅ Email nicht sichtbar im Login
- ✅ Automatische Löschung bei Ablehnung
- ✅ Keine Datenleichen

### Performance
- ✅ Schlanker Signup-Prozess (weniger Datenbank-Writes)
- ✅ Profil-Builder nur bei Freischaltung (weniger Storage)

### User Experience
- ✅ Klarer Prozess: Bewerbung → Warten → Freischaltung → Profilaufbau
- ✅ Grüner Button zeigt: "Jetzt bist du dran!"
- ✅ Login mit Künstlername (einfacher zu merken!)

### Admin Experience
- ✅ Minimales Profil zur Prüfung (nur Songs + Name)
- ✅ Direkter Link zum Profil
- ✅ Ein-Klick-Freischaltung/-Ablehnung

---

## 8. Testing-Checklist

### Creator-Signup
- [ ] Rechtliche Checkboxen funktionieren
- [ ] Email + Passwort + Künstlername werden validiert
- [ ] Song-Upload funktioniert (1-2 MP3s)
- [ ] Admin bekommt Benachrichtigung
- [ ] Profil wird mit `role='user'`, `visibility='pending'` erstellt

### Admin-Kuration
- [ ] Admin sieht neue Bewerbung in Kommandozentrale
- [ ] Link führt zu `/creator/[slug]`
- [ ] Songs sind hörbar
- [ ] Freischaltung funktioniert (Profil + Songs werden `public`)
- [ ] Ablehnung funktioniert (Alles wird gelöscht)
- [ ] Creator bekommt grün/rot-Benachrichtigung

### Login
- [ ] Login mit Künstlername funktioniert
- [ ] Login mit Email funktioniert (Fallback)
- [ ] Fehlermeldung bei falschem Künstlernamen

### Onboarding-Helper
- [ ] Grüner Button erscheint beim ersten Besuch
- [ ] Button verschwindet nach Klick/Dismiss
- [ ] Button führt zu `/profile-builder`

### Profil-Builder
- [ ] Creator kann Avatar hochladen
- [ ] Creator kann Bio, Tech-Stack, Social Links eingeben
- [ ] Speichern funktioniert
- [ ] Navigiert zu eigenem Profil

---

## 9. Nächste Schritte

1. ✅ SQL-Scripts in Supabase ausführen
2. ✅ Dev-Server neu starten
3. ✅ Logout + Login (Session refresh!)
4. 🚀 **Testen!**

---

**Fragen?** → Siehe `SETUP_FINALE_SCHRITTE.md` oder `KURATION_UND_NOTIFICATIONS.md`
