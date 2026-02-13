# Creator-Signup & Kuration Flow

## 🎯 Übersicht

Der Anmeldeprozess für neue Creator läuft in 3 Phasen:

```
User Registrierung → Bewerbung einreichen → Admin prüft → Freischaltung
```

---

## 📋 Schritt-für-Schritt

### 1. **User registriert sich** (`/creator-signup`)

**Was passiert:**
- User erstellt Account mit Email/Passwort
- Profil wird angelegt mit:
  - `role: 'user'` (noch KEIN Creator)
  - `onboarding_status: 'pending'` (Startphase)

**Code:** `src/app/creator-signup/page.tsx` → `handleAuth()` (Zeile 41-77)

---

### 2. **User füllt Profil aus & lädt Songs hoch**

**Was passiert:**
- Avatar, Bio, Tech-Stack, Socials
- 2 Probe-Songs (MP3)
- **Bad-Word-Filter** prüft alle Texte (Künstlername, Bio, Song-Titel)
- Profil wird upgedatet:
  - `onboarding_status: 'submitted'` → **Bewerbung eingereicht!**
  - Songs werden mit `is_probe: true` gespeichert (noch nicht im Shop)

**Hinweis für User:**
> ⏱️ Freischaltung erfolgt in der Regel **innerhalb von 48 Stunden**. Du wirst per Email benachrichtigt!

**Code:** `src/app/creator-signup/page.tsx` → `handleSubmit()` (Zeile 100-169)

---

### 3. **Admin prüft Bewerbung** (`/admin/applications`)

**Was der Admin sieht:**
- Alle Profile mit `onboarding_status = 'submitted'`
- Avatar, Bio, Tech-Stack, Songs (zum Anhören)

**Was passiert bei Freischaltung:**
- Profil wird upgedatet:
  - `onboarding_status: 'approved'` → **Freigegeben!**
  - `role: 'creator'` → **Jetzt ein Creator!**
- Songs werden freigegeben:
  - `is_probe: false` → Erscheinen jetzt in //THE LAB (Shop)

**Code:** `src/app/admin/actions.ts` → `updateApplicationStatus()` (Zeile 6-53)

---

### 4. **Creator erscheint auf Startseite**

**Filter:**
- `role = 'creator'` UND
- `onboarding_status = 'approved'`

**Code:** `src/app/page.tsx` (Zeile 13-18)

---

## 🔒 Sicherheit & Filter

### Bad-Word-Filter (aktiv)
- Prüft: Künstlername, Bio, Song-Titel
- Blockiert unzulässige Begriffe (z.B. Hass, Gewalt, illegale Inhalte)
- **Client-Side** (sofortiges Feedback)
- Liste kann in `BAD_WORDS` erweitert werden

**Code:**
- `src/app/creator-signup/page.tsx` (Zeile 15-23)
- `src/app/onboarding/page.tsx` (Zeile 12-20)

---

## ⚠️ WICHTIG: Admin-RLS fehlt noch!

**Problem:**
Die Admin-Rechte für das Lesen/Updaten von Bewerbungen fehlen noch in der Datenbank.

**Lösung:**
Führe `supabase_admin_profiles_rls.sql` im Supabase SQL Editor aus.

**Was das SQL macht:**
- Admins dürfen ALLE Profile lesen (für Kuration)
- Admins dürfen ALLE Profile updaten (für Freischaltung)
- Admins dürfen Songs updaten (`is_probe` ändern)

**Ohne dieses SQL:** Admin sieht keine Bewerbungen in `/admin/applications`!

---

## 🎛️ Status-Übersicht

| Status | Bedeutung | Startseite | Admin-Panel |
|--------|-----------|------------|-------------|
| `pending` | Registriert, Profil leer | ❌ Nein | ❌ Nein |
| `submitted` | Bewerbung eingereicht | ❌ Nein | ✅ Ja (Kuration) |
| `approved` | Freigegeben | ✅ Ja | ❌ Nein (verschwindet) |
| `rejected` | Abgelehnt | ❌ Nein | ❌ Nein |

---

## 🔧 Dateien

| Datei | Zweck |
|-------|-------|
| `src/app/creator-signup/page.tsx` | Registrierung + Profil-Erstellung |
| `src/app/admin/applications/page.tsx` | Kuration / Bewerbungen |
| `src/app/admin/actions.ts` | Freischaltungs-Funktion |
| `src/app/page.tsx` | Startseite (Neue Creator) |
| `supabase_admin_profiles_rls.sql` | **MUSS AUSGEFÜHRT WERDEN!** |

---

## ✅ Was wurde heute gefixt

- [x] Bad-Word-Filter aktiviert (war deaktiviert)
- [x] 48h-Hinweis hinzugefügt
- [x] Startseite: Nur freigeschaltete Creator anzeigen
- [x] Fehlerbehandlung verbessert (konkrete Error-Messages)
- [x] Admin-Benachrichtigungen erstellt (Trigger bei neuer Bewerbung)
- [x] RPC-Funktion `get_my_role()` hinzugefügt
- [ ] **TODO:** SQL-Skripte ausführen (siehe `SQL_SETUP_ANLEITUNG.md`)
