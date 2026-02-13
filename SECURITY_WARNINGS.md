# 🔒 Supabase Security Warnings – Erklärt & Behoben

## 📊 Aktuelle Warnings (vor Fix)

Dein Supabase Security Advisor zeigt **6 Warnings**:

### 1. ⚠️ Function Search Path Mutable (4x)

**Was bedeutet das?**
PostgreSQL-Funktionen mit `SECURITY DEFINER` (erhöhte Rechte) sollten mit `SET search_path = ''` erstellt werden, um **Schema-Injection-Angriffe** zu verhindern.

**Betroffene Funktionen:**
- `public.get_my_role`
- `public.notify_admins_new_application`
- `public.increment_thread_reply_count`
- `public.check_report_threshold`

**Risiko:**
Ein Angreifer könnte eine Funktion mit gleichem Namen in einem eigenen Schema erstellen und die `SECURITY DEFINER`-Funktion manipulieren.

**Lösung:**
Alle Funktionen mit `SET search_path = ''` neu erstellen (siehe `supabase_security_fixes.sql`).

---

### 2. ⚠️ RLS Policy Always True (1x)

**Was bedeutet das?**
Es gibt eine Row Level Security (RLS) Policy auf der Tabelle `public.artists`, die immer `true` zurückgibt → **jeder kann alles sehen/ändern**.

**Betroffene Policy:**
`USING (true)` auf `public.artists`

**Risiko:**
Wenn die Tabelle sensible Daten enthält, sind diese ungeschützt.

**Lösung:**
- Wenn Tabelle leer/ungenutzt → löschen
- Wenn gebraucht → Policy auf sinnvolle Bedingung ändern (z.B. `is_active = true`)

---

### 3. ⚠️ Leaked Password Protection Disabled (1x)

**Was bedeutet das?**
Supabase kann Passwörter gegen die **HaveIBeenPwned-Datenbank** prüfen (bekannte geleakte Passwörter). Diese Funktion ist aktuell deaktiviert.

**Risiko:**
User könnten Passwörter verwenden, die bereits in Datenleaks aufgetaucht sind.

**Lösung:**
- Im Supabase Dashboard aktivieren: **Authentication → Settings → Password Policy → "Check for leaked passwords"**
- Alternativ: Client-seitige Prüfung vor Registrierung

---

## ✅ Fixes

### Schritt 1: SQL ausführen

Führe diese Datei im Supabase SQL Editor aus:

```sql
supabase_security_fixes.sql
```

**Was passiert:**
1. ✅ Alle 4 Funktionen werden mit `SET search_path = ''` neu erstellt
2. ✅ Trigger werden neu zugewiesen
3. ✅ Tabelle `public.artists` wird geprüft und ggf. gelöscht (falls leer)

---

### Schritt 2: Dashboard-Einstellung

1. Öffne **Supabase Dashboard**
2. Gehe zu **Authentication → Settings**
3. Scrolle zu **Password Policy**
4. Aktiviere: **"Check for leaked passwords"**

---

## 🛡️ Nach den Fixes

**Erwartetes Ergebnis:**
- ✅ **0 Errors**
- ✅ **0-1 Warnings** (nur noch Password Protection, falls nicht im Dashboard aktiviert)
- ✅ **0 Suggestions**

---

## 📚 Technische Details

### Function Search Path

**Vorher (unsicher):**
```sql
CREATE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ ... $$;
```

**Nachher (sicher):**
```sql
CREATE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- ✅ Verhindert Schema-Injection
AS $$ ... $$;
```

---

### RLS Policy

**Vorher (zu permissiv):**
```sql
CREATE POLICY "Public can read artists" 
  ON public.artists FOR SELECT
  USING (true);  -- ⚠️ Jeder kann alles lesen
```

**Nachher (sicher):**
```sql
-- Option 1: Tabelle löschen (falls ungenutzt)
DROP TABLE IF EXISTS public.artists CASCADE;

-- Option 2: Sinnvolle Policy (falls gebraucht)
CREATE POLICY "Public can read active artists" 
  ON public.artists FOR SELECT
  USING (is_active = true);  -- ✅ Nur aktive Artists
```

---

## 🎯 Warum ist das wichtig?

1. **Schema-Injection verhindern:** Angreifer können keine Funktionen manipulieren
2. **Daten schützen:** RLS Policies sollten immer sinnvolle Bedingungen haben
3. **Passwort-Sicherheit:** Geleakte Passwörter frühzeitig erkennen
4. **Best Practices:** Supabase empfiehlt diese Fixes für Produktions-Deployments

---

## ✅ Checkliste

- [ ] `supabase_security_fixes.sql` ausgeführt
- [ ] Supabase Security Advisor geprüft (sollte nur noch 0-1 Warning zeigen)
- [ ] "Leaked Password Protection" im Dashboard aktiviert
- [ ] Refresh der Warnings (kann 1-2 Minuten dauern)

---

## 📞 Troubleshooting

**"Trigger already exists"**
→ Normal, `DROP TRIGGER IF EXISTS` wird das beheben

**"Table artists does not exist"**
→ Gut! Tabelle wurde bereits gelöscht oder existierte nie

**"Function does not exist"**
→ Normal, wird neu erstellt

**Warnings verschwinden nicht**
→ Warte 1-2 Minuten, Supabase aktualisiert Security Advisor verzögert
