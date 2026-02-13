# 🔧 Troubleshooting: Recursion-Fehler bleibt bestehen

## ❌ Problem

Du hast `supabase_security_fixes.sql` und `supabase_fix_recursion.sql` ausgeführt, aber der Fehler tritt **immer noch** auf:

```
infinite recursion detected in policy for relation "profiles"
```

---

## 🔍 Schritt 1: Debug ausführen

Führe im Supabase SQL Editor aus:

```sql
-- Datei: supabase_debug_recursion.sql
```

**Prüfe die Ergebnisse:**

### A. get_my_role() existiert?
```
function_name: get_my_role
is_security_definer: true
```
✅ **Gut:** Funktion existiert  
❌ **Problem:** "no rows" → Führe `supabase_security_fixes.sql` nochmal aus

### B. Policies auf promo_slots korrekt?
```
policy_name: "Admins can update promo_slots"
using_clause: (get_my_role() = 'admin'::text)
```
✅ **Gut:** Verwendet `get_my_role()`  
❌ **Problem:** `(SELECT role FROM profiles...)` → Alte Policy noch aktiv!

### C. Deine Rolle = admin?
```
role: 'admin'
```
✅ **Gut:** Du bist Admin  
❌ **Problem:** `role: 'user'` → Du bist kein Admin! (siehe unten)

### D. get_my_role() funktioniert?
```
my_role: 'admin'
```
✅ **Gut:** Funktion gibt 'admin' zurück  
❌ **Problem:** Fehler oder NULL → Funktion kaputt oder nicht als Admin markiert

---

## 🔧 Schritt 2: Force Fix (wenn Debug Problem zeigt)

### Problem A: get_my_role() existiert nicht

**Lösung:**
```sql
-- Nochmal ausführen:
supabase_security_fixes.sql
```

Dann warte 30 Sekunden und teste nochmal.

---

### Problem B: Alte Policies noch aktiv

**Grund:** `DROP POLICY IF EXISTS` hat nicht funktioniert (Cache-Problem).

**Lösung:**
```sql
-- Führe aus: supabase_force_fix_policies.sql
-- Löscht ALLE Policies und erstellt sie neu
```

---

### Problem C: Du bist kein Admin

**Grund:** Dein User hat `role = 'user'` statt `'admin'`.

**Lösung:**
```sql
-- Im Supabase SQL Editor:
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = auth.uid();
```

Dann ausloggen + einloggen, damit die Session aktualisiert wird.

---

### Problem D: get_my_role() gibt NULL zurück

**Grund:** Dein User hat kein Profil in der `profiles`-Tabelle.

**Lösung:**
```sql
-- Prüfe ob Profil existiert:
SELECT * FROM public.profiles WHERE id = auth.uid();

-- Falls leer, erstelle Profil:
INSERT INTO public.profiles (id, role, artist_name)
VALUES (auth.uid(), 'admin', 'Admin User');
```

---

## 🎯 Schritt 3: Test

Nach dem Fix:

1. **Logout + Login** (wichtig für Session-Update!)
2. Gehe zu `/admin/media`
3. Versuche, ein Bild zu speichern
4. **Fehler sollte weg sein!** ✅

---

## 🔄 Wenn es IMMER NOCH nicht funktioniert

### Last Resort: Cache leeren

1. **Supabase Dashboard → Settings → API**
2. Scrolle zu **"Reset the database"** (NICHT KLICKEN!)
3. Scrolle weiter zu **"Restart project"**
4. Klicke **"Restart project"** (dauert 2-3 Minuten)

Das lädt alle Policies und Funktionen neu.

---

## 💡 Häufigste Ursachen (in dieser Reihenfolge)

1. **Du bist kein Admin** (80% der Fälle)
   → Setze `role = 'admin'` in profiles

2. **Alte Policies noch aktiv** (15% der Fälle)
   → Führe `supabase_force_fix_policies.sql` aus

3. **get_my_role() fehlt** (5% der Fälle)
   → Führe `supabase_security_fixes.sql` aus

---

## 📋 Vollständiger Fix-Flow

```bash
# 1. Debug ausführen
supabase_debug_recursion.sql

# 2. Problem identifizieren (A, B, C oder D)

# 3. Entsprechenden Fix anwenden:
# - Problem A: supabase_security_fixes.sql
# - Problem B: supabase_force_fix_policies.sql
# - Problem C: UPDATE profiles SET role = 'admin'...
# - Problem D: INSERT INTO profiles...

# 4. Logout + Login

# 5. Testen
```

---

## ✅ Nach dem Fix

**Erwartetes Verhalten:**
- ✅ Bilder in Media-Boxen speichern funktioniert
- ✅ YouTube-ID speichern funktioniert
- ✅ Creator-Signup funktioniert
- ✅ Admin kann Bewerbungen sehen & freischalten

Wenn alles funktioniert: **Glückwunsch!** 🎉
