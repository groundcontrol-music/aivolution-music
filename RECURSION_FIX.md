# 🔁 Infinite Recursion Fix

## ❌ Problem

**Fehlermeldung:**
```
infinite recursion detected in policy for relation "profiles"
```

**Ursache:**
Eine RLS Policy auf der `profiles`-Tabelle macht eine Subquery auf `profiles` selbst:

```sql
CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    ↑                     ↑
    └─────────────────────┘
    Endlosschleife!
  );
```

**Was passiert:**
1. User versucht, ein Profil zu lesen
2. PostgreSQL prüft die RLS Policy
3. Policy macht `SELECT role FROM profiles...`
4. Für diesen SELECT muss PostgreSQL wieder die Policy prüfen
5. Policy macht wieder `SELECT role FROM profiles...`
6. **→ Endlosschleife!**

---

## ✅ Lösung

Verwende eine **Funktion mit `SECURITY DEFINER`**, die die RLS-Policies umgeht:

```sql
-- Funktion mit SECURITY DEFINER (umgeht RLS)
CREATE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Läuft mit erhöhten Rechten, umgeht RLS
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- Policy verwendet die Funktion (keine Recursion mehr!)
CREATE POLICY "Admins can read all profiles" 
  ON public.profiles FOR SELECT 
  USING (
    get_my_role() = 'admin'  -- ← Keine Recursion!
  );
```

**Warum funktioniert das?**
- `SECURITY DEFINER` läuft mit erhöhten Rechten
- Umgeht RLS-Checks beim Lesen von `profiles`
- Keine Recursion mehr!

---

## 🔧 Fix ausführen

### Schritt 1: `supabase_security_fixes.sql`
Erstellt die `get_my_role()` Funktion.

### Schritt 2: `supabase_fix_recursion.sql`
Ersetzt alle problematischen Policies durch sichere Varianten.

**Betroffene Tabellen:**
- ✅ `profiles`
- ✅ `songs`
- ✅ `messages`
- ✅ `promo_slots`

---

## 🎯 Nach dem Fix

**Vorher (Fehler):**
```
Error: infinite recursion detected in policy for relation "profiles"
```

**Nachher (funktioniert):**
```
✅ Profile gespeichert
✅ Admin kann Bewerbungen sehen
✅ Freischaltung funktioniert
```

---

## 🧪 Testen

```sql
-- Test: Lies dein eigenes Profil (sollte funktionieren)
SELECT * FROM profiles WHERE id = auth.uid();

-- Test: Admins können alle Profile lesen
SELECT * FROM profiles LIMIT 5;

-- Test: Freischaltung
UPDATE profiles SET role = 'creator', onboarding_status = 'approved' WHERE id = '...';
```

---

## 📋 Checkliste

- [ ] `supabase_security_fixes.sql` ausgeführt
- [ ] `supabase_fix_recursion.sql` ausgeführt
- [ ] Fehler verschwindet beim Speichern
- [ ] Admin kann Bewerbungen sehen (`/admin/applications`)
- [ ] Freischaltung funktioniert

---

## 🔍 Troubleshooting

**"function get_my_role() does not exist"**
→ Führe zuerst `supabase_security_fixes.sql` aus

**"permission denied for table profiles"**
→ Prüfe, ob dein User `role = 'admin'` hat in der `profiles`-Tabelle

**Fehler tritt weiterhin auf**
→ Prüfe in Supabase Dashboard → Database → Policies, ob alte Policies noch existieren
→ Lösche sie manuell oder führe das SQL nochmal aus

---

## 🛡️ Warum war das gestern kein Problem?

**Mögliche Gründe:**
1. Gestern hattest du noch keine Admin-Policies (wurden erst heute hinzugefügt)
2. Die alten Policies verwendeten eine andere Struktur
3. Du warst noch nicht als Admin eingeloggt (Policies wurden nicht getriggert)

**Wichtig:** Die neuen Admin-Policies (`supabase_admin_profiles_rls.sql`) enthielten die Recursion-Problematik. Das wurde jetzt behoben!
