# 🗄️ SQL Setup für Aivolution (Supabase)

## 📋 Reihenfolge der SQL-Skripte

Führe die folgenden SQL-Dateien **in dieser Reihenfolge** im Supabase SQL Editor aus:

---

### ✅ Bereits ausgeführt (vermutlich):

1. **`supabase_schema_update.sql`**
   - Basis-Tabellen: `profiles`, `songs`
   - Storage-Buckets: `avatars`, `songs`
   - Basis-RLS-Policies

2. **`supabase_creator_profile_v2.sql`**
   - Spalte: `artist_name_slug` (für Creator-URLs)
   - Auto-Slug-Generator (Trigger)

3. **`supabase_shop_forum_messages.sql`**
   - Tabellen: `messages`, `reports`, `cart_items`, `orders`, etc.
   - Creator-Forum, Global-Forum, Warenkorb

4. **`supabase_promo_slots_fix.sql`** + **`supabase_promo_slots_body_text.sql`** + **`supabase_promo_slots_tiktok.sql`**
   - Media-Boxen für Startseite

---

### 🔴 JETZT AUSFÜHREN (fehlt noch):

#### 1. **`supabase_admin_profiles_rls.sql`** ⚠️ WICHTIG!
**Was es macht:**
- Admins dürfen ALLE Profile lesen (für Kuration)
- Admins dürfen ALLE Profile updaten (für Freischaltung)
- Admins dürfen Songs updaten (`is_probe → false`)

**Warum wichtig:**
Ohne diese Policies kann der Admin keine Bewerbungen in `/admin/applications` sehen!

---

#### 2. **`supabase_admin_notifications.sql`** ⚠️ WICHTIG!
**Was es macht:**
- **RPC-Funktion:** `get_my_role()` (wird in `admin/actions.ts` verwendet)
- **Admin-Policies:** Admins dürfen System-Messages erstellen/lesen
- **Trigger:** Bei neuer Bewerbung (`onboarding_status = 'submitted'`) wird automatisch eine Nachricht an alle Admins gesendet

**Warum wichtig:**
- Ohne `get_my_role()` funktioniert die Admin-Freischaltung nicht
- Ohne Trigger bekommst du keine Benachrichtigungen bei neuen Bewerbungen!

---

## 🎯 Nach dem Ausführen:

### Test 1: Admin-Panel funktioniert
1. Gehe zu `/admin/applications`
2. Du solltest alle eingereichten Bewerbungen sehen (`onboarding_status = 'submitted'`)

### Test 2: Benachrichtigungen funktionieren
1. Neuer Creator registriert sich (`/creator-signup`)
2. Creator füllt Profil aus und reicht Bewerbung ein
3. **Admin bekommt automatisch eine Nachricht:**
   - Öffne `/admin` oder Header-Icon (Message-Button)
   - Es sollte eine neue Message erscheinen: "🎸 Neue Creator-Bewerbung"

### Test 3: Freischaltung funktioniert
1. Admin öffnet `/admin/applications`
2. Klickt auf "Freischalten" bei einer Bewerbung
3. Creator-Profil wird upgedatet:
   - `role: 'creator'`
   - `onboarding_status: 'approved'`
   - Songs: `is_probe: false` (erscheinen in //THE LAB)
4. Creator erscheint auf Startseite unter "Neue Creator"

---

## 📁 Alle SQL-Dateien im Überblick

| Datei | Status | Zweck |
|-------|--------|-------|
| `supabase_schema_update.sql` | ✅ Vermutlich OK | Basis-Schema |
| `supabase_creator_profile_v2.sql` | ✅ Vermutlich OK | Artist-Slugs |
| `supabase_shop_forum_messages.sql` | ✅ Vermutlich OK | Shop, Forum, Messages |
| `supabase_promo_slots_*.sql` | ✅ Vermutlich OK | Media-Boxen |
| **`supabase_admin_profiles_rls.sql`** | 🔴 **JETZT AUSFÜHREN!** | Admin-Rechte für Kuration |
| **`supabase_admin_notifications.sql`** | 🔴 **JETZT AUSFÜHREN!** | Admin-Benachrichtigungen + RPC |

---

## ⚠️ Wichtige Hinweise

1. **Reihenfolge beachten:**
   - Erst `supabase_admin_profiles_rls.sql`
   - Dann `supabase_admin_notifications.sql`

2. **Fehler beim Ausführen?**
   - Manche Policies existieren schon → `DROP POLICY IF EXISTS` verhindert Fehler
   - Falls eine Tabelle fehlt (z.B. `messages`), führe erst `supabase_shop_forum_messages.sql` aus

3. **Admin-Account:**
   - Stelle sicher, dass dein Account in der `profiles`-Tabelle `role = 'admin'` hat
   - Sonst kannst du die Admin-Funktionen nicht nutzen

---

## 🚀 Quick-Start nach SQL-Setup

```bash
# 1. Dev-Server starten
npm run dev

# 2. Als Admin einloggen
# → /admin

# 3. Test-Creator registrieren
# → /creator-signup

# 4. Bewerbung prüfen
# → /admin/applications

# 5. Freischalten
# → Creator erscheint auf Startseite
```

---

## 📞 Bei Problemen

**Fehler: "RPC function get_my_role not found"**
→ `supabase_admin_notifications.sql` ausführen

**Fehler: "permission denied for table profiles"**
→ `supabase_admin_profiles_rls.sql` ausführen

**Keine Bewerbungen sichtbar**
→ Prüfe, ob Creator `onboarding_status = 'submitted'` hat

**Keine Benachrichtigungen**
→ Prüfe, ob `messages`-Tabelle existiert und Trigger aktiv ist
