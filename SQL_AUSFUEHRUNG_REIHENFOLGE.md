# SQL-Scripts Ausführungsreihenfolge

## 🎯 Schritt-für-Schritt-Anleitung

Öffne **Supabase Dashboard → SQL Editor** und führe die Scripts in **dieser Reihenfolge** aus:

---

## 1️⃣ **SQL_QUICK_SETUP.sql** (WICHTIGSTE!)

**Was macht es:**
- ✅ `get_my_role()` Funktion (für Admin-Checks)
- ✅ `visibility` Spalte auf `profiles`
- ✅ `status` & `related_slug` auf `messages`
- ✅ Alle RLS Policies für `profiles`, `songs`, `messages`, `promo_slots`
- ✅ Indizes für Performance
- ✅ Migration bestehender Daten

**Kopieren aus:** `SQL_QUICK_SETUP.sql`

**Ergebnis:** `✅ Quick Setup abgeschlossen!`

---

## 2️⃣ **supabase_login_with_artistname.sql** (Login-System)

**Was macht es:**
- ✅ `artist_logins` Tabelle (für Login mit Künstlername)
- ✅ `get_email_for_user()` Funktion
- ✅ `find_user_by_artistname()` Funktion
- ✅ Auto-Sync Trigger

**Kopieren aus:** `supabase_login_with_artistname.sql`

**Ergebnis:** `✅ Login mit Künstlername aktiviert!`

---

## 3️⃣ **supabase_audio_system.sql** (WAV + MP3 System)

**Was macht es:**
- ✅ `wav_url`, `mp3_preview_url`, `preview_generated` Spalten auf `songs`
- ✅ RLS Policies für WAV (geschützt) und MP3 (öffentlich)
- ✅ Trigger für automatische MP3-Generierung
- ✅ `get_audio_storage_stats()` Funktion

**Kopieren aus:** `supabase_audio_system.sql`

**Ergebnis:** `✅ Audio System aktiviert (WAV + MP3 Preview)`

---

## 4️⃣ **supabase_messages_retention.sql** (Optional, aber empfohlen)

**Was macht es:**
- ✅ `deleted_at`, `deleted_by`, `archived` Spalten auf `messages`
- ✅ Soft-Delete System
- ✅ Auto-Archive Funktion
- ✅ Admin-Zugriff für Behördenanfragen
- ✅ Audit-Log

**Kopieren aus:** `supabase_messages_retention.sql`

**Ergebnis:** `✅ Messages Retention System aktiviert!`

---

## ⚠️ Wichtige Hinweise

### Bei Fehlern:
- **"already exists"**: Überspringen, weiter zum nächsten Script
- **"infinite recursion"**: Logout + Login, dann nochmal versuchen
- **"column does not exist"**: Script 1 (SQL_QUICK_SETUP.sql) noch nicht ausgeführt

### Nach jedem Script:
1. Warte bis "Success" angezeigt wird
2. Prüfe: Keine roten Fehler im SQL Editor
3. Fahre mit nächstem Script fort

### Reihenfolge ist wichtig!
- Script 1 MUSS zuerst (erstellt Basis-Funktionen)
- Script 2-4 können in beliebiger Reihenfolge (nach Script 1)

---

## 🎯 Nach der Ausführung

### Testen:
1. **Logout + Login** (Session refresh)
2. Gehe zu `/admin/applications`
3. Du solltest jetzt neue Bewerbungen sehen!
4. Klicke auf eine Bewerbung → Creator-Profil
5. "Freischalten" oder "Ablehnen" sollte funktionieren

### Verifikation:
```sql
-- Prüfe ob alles funktioniert:
SELECT get_my_role(); -- Sollte 'admin' zurückgeben

SELECT * FROM profiles WHERE visibility = 'pending'; -- Zeigt offene Bewerbungen

SELECT * FROM artist_logins; -- Zeigt Login-Mappings

SELECT * FROM get_audio_storage_stats(); -- Zeigt Audio-Stats
```

---

## 📝 Zusammenfassung

| Script | Pflicht? | Was? |
|--------|----------|------|
| 1. SQL_QUICK_SETUP.sql | ✅ JA | Basis (Funktionen, Policies) |
| 2. supabase_login_with_artistname.sql | ✅ JA | Login mit Künstlername |
| 3. supabase_audio_system.sql | ✅ JA | WAV/MP3 System |
| 4. supabase_messages_retention.sql | ⭐ Empfohlen | DSGVO-konforme Messages |

**Geschätzte Zeit:** 5-10 Minuten

**Bei Problemen:** Schreib mir die Fehlermeldung, ich helfe!
