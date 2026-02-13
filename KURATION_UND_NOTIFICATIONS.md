# 🎨 Kuration & Notifications System

## ✅ Implementiert

### 1. **Freischaltung (Grünes Icon)**

**Was passiert bei "Freischalten":**
1. Profil-Update:
   - `role: 'creator'`
   - `onboarding_status: 'approved'`
2. Songs freischalten:
   - `is_probe: false` → Erscheinen in //THE LAB
3. **Notification an Creator:**
   - Icon oben rechts wird **GRÜN** 🟢
   - Message Badge: grün + animiert (pulse)
   - Nachricht: "🎉 Willkommen bei Aivolution!"

---

### 2. **Ablehnung (Rotes Icon + Daten-Löschung)**

**Was passiert bei "Ablehnen":**
1. **Notification an Creator:**
   - Icon oben rechts wird **ROT** 🔴
   - Message Badge: rot + animiert (pulse)
   - Nachricht: "❌ Bewerbung abgelehnt"

2. **Daten-Löschung:**
   - ✅ Songs löschen (Storage + DB)
   - ✅ Avatar löschen (Storage + DB)
   - ✅ Profil zurücksetzen:
     ```sql
     artist_name: NULL
     bio: NULL
     tech_stack: NULL
     social_links: NULL
     avatar_url: NULL
     onboarding_status: 'rejected'
     role: 'user'
     ```

3. **Was bleibt?**
   - ✅ User-Account (auth.users)
   - ✅ Profil-Eintrag (profiles) → wegen AGB-Akzeptanz
   - ✅ Notification-Message (30 Tage Sperrfrist)

---

## 📋 Rechtliche Aspekte

### Was speichern wir bei Ablehnung?

**JA (rechtlich notwendig):**
- ✅ User-ID (auth.users)
- ✅ Profil-Eintrag mit `onboarding_status: 'rejected'`
- ✅ Ablehnungs-Nachricht (30 Tage)
- ✅ Zeitstempel (für Sperrfrist)

**NEIN (gelöscht):**
- ❌ Künstlername, Bio, Tech-Stack
- ❌ Songs (MP3-Dateien + DB-Einträge)
- ❌ Avatar (Bild-Datei + DB-Link)
- ❌ Social Links

---

### Warum speichern wir das Profil?

**Gründe:**
1. **AGB-Akzeptanz:** User hat AGBs akzeptiert → Rechtlicher Nachweis
2. **Sperrfrist:** Verhindert sofortige Neu-Bewerbung (30 Tage)
3. **Missbrauchsprävention:** Mehrfach-Accounts erkennen
4. **DSGVO-Konform:** Nur notwendige Daten (keine persönlichen Inhalte)

---

### Sperrfrist (30 Tage)

**Implementierung (später):**
```sql
-- Bei Ablehnung:
UPDATE profiles 
SET rejected_at = NOW() 
WHERE id = user_id;

-- Bei erneuter Bewerbung prüfen:
SELECT * FROM profiles 
WHERE id = user_id 
AND onboarding_status = 'rejected'
AND rejected_at > NOW() - INTERVAL '30 days';
```

**Falls Sperrfrist aktiv:**
```
❌ Du kannst dich erst ab [DATUM] erneut bewerben.
```

---

## 🎨 Visuelle Darstellung

### Messages-Icon (Header)

**Grün (Freischaltung):**
```
┌─────────┐
│ 💬 🟢 1  │  ← Grüner Badge, pulse-Animation
└─────────┘
   ↓
Icon-Border: grün
Icon-Farbe: grün
```

**Rot (Ablehnung):**
```
┌─────────┐
│ 💬 🔴 1  │  ← Roter Badge, pulse-Animation
└─────────┘
   ↓
Icon-Border: rot
Icon-Farbe: rot
```

**Normal (System-Message):**
```
┌─────────┐
│ 💬 ⚫ 1  │  ← Grauer Badge
└─────────┘
```

---

## 🔧 SQL Setup

### 1. **Status-Spalte hinzufügen** (WICHTIG!)

```sql
-- Führe aus: supabase_notifications_status.sql
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status TEXT;
```

**Werte:**
- `'approved'` → Grün (Freischaltung)
- `'rejected'` → Rot (Ablehnung)
- `NULL` → Normal (System-Message)

---

### 2. **Rejected-At Spalte hinzufügen** (für Sperrfrist)

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_rejected 
ON public.profiles(rejected_at) 
WHERE onboarding_status = 'rejected';
```

---

## 🧪 Testen

### Test 1: Freischaltung

1. Creator bewirbt sich (`/creator-signup`)
2. Admin geht zu `/admin/applications`
3. Klickt "Freischalten"
4. **Creator sieht:**
   - Grünes Icon oben rechts 🟢
   - Notification: "🎉 Willkommen bei Aivolution!"
5. **Songs erscheinen** in //THE LAB

---

### Test 2: Ablehnung

1. Creator bewirbt sich
2. Admin geht zu `/admin/applications`
3. Klickt "Ablehnen"
4. **Creator sieht:**
   - Rotes Icon oben rechts 🔴
   - Notification: "❌ Bewerbung abgelehnt"
5. **Daten sind gelöscht:**
   - Songs: ❌ (Storage + DB)
   - Avatar: ❌ (Storage + DB)
   - Profil: Zurückgesetzt (artist_name = NULL)

---

## 📊 Dashboard (für Creator)

**Später implementieren:**
- Creator-Dashboard zeigt Status:
  - ✅ Approved: "Dein Profil ist aktiv"
  - ⏳ Submitted: "Deine Bewerbung wird geprüft"
  - ❌ Rejected: "Bewerbung abgelehnt. Neu-Bewerbung ab [DATUM]"

---

## 🎯 Nächste Schritte

1. **SQL ausführen:**
   - `supabase_notifications_status.sql`

2. **Code pullen & testen:**
   - Dev-Server neu starten
   - Creator-Signup durchführen
   - Als Admin freischalten/ablehnen
   - Notifications prüfen

3. **Optional: Sperrfrist implementieren**
   - `rejected_at` Spalte hinzufügen
   - Check beim Creator-Signup
   - Error-Message anzeigen

---

## ✅ Rechtliche Dokumentation (AGB-Ergänzung)

**Folgende Punkte in AGB aufnehmen:**

### Bewerbungsprozess
> Bei Ablehnung deiner Bewerbung werden alle hochgeladenen Inhalte (Songs, Avatar, Profil-Daten) sofort und unwiderruflich gelöscht. Dein Account bleibt bestehen, sodass du dich nach Ablauf einer Sperrfrist von 30 Tagen erneut bewerben kannst.

### Datenspeicherung bei Ablehnung
> Bei Ablehnung speichern wir:
> - User-ID und Account-Daten (wegen AGB-Akzeptanz)
> - Ablehnungs-Zeitstempel (für Sperrfrist)
> - Keine persönlichen Inhalte (Songs, Bilder, Texte)
> 
> Diese Daten werden nach Ablauf der Sperrfrist (30 Tage) gelöscht, falls keine erneute Bewerbung erfolgt.

### Widerspruchsrecht
> Du kannst jederzeit deinen Account inklusive aller Daten löschen lassen. Kontakt: [Email/Support]
