# Pre-Launch Deep-Dive Checklist
## Umfassende Code-Review & Self-Healing-Systeme

> **Ziel:** System das sich selbst überwacht, Fehler meldet und wo möglich selbst heilt.

---

## 🔐 SECURITY (Kritischster Bereich!)

### ✅ Fragenkatalog: RLS Policies

**Frage 1:** Kann ein Creator Daten anderer Creator sehen?
```sql
-- Test-Query (als Creator A eingeloggt):
SELECT * FROM profiles WHERE id != auth.uid();
-- Erwartung: 0 Zeilen (außer public creator profiles)
```

**Frage 2:** Kann ein Creator Songs anderer Creator ändern?
```sql
-- Test-Query (als Creator A eingeloggt):
UPDATE songs SET title = 'HACKED' WHERE user_id != auth.uid();
-- Erwartung: ERROR (Policy violation)
```

**Frage 3:** Kann ein User sich selbst zum Admin machen?
```sql
-- Test-Query (als User eingeloggt):
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
-- Erwartung: ERROR (Policy violation)
```

**Frage 4:** Können unauthentifizierte User Songs hochladen?
```sql
-- Test: Logout → Storage Upload versuchen
-- Erwartung: ERROR 401 Unauthorized
```

**Frage 5:** Sind Message-Inhalte vor anderen Usern geschützt?
```sql
-- Test-Query (als User A):
SELECT * FROM messages WHERE recipient_id != auth.uid();
-- Erwartung: 0 Zeilen (außer Admin)
```

### 🛠️ Self-Healing für Security

**Automatische Alerts:**
```sql
-- Funktion: Meldet verdächtige Aktivitäten
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Wenn jemand >10 failed login attempts in 5 Min
  IF (SELECT COUNT(*) FROM auth.audit_log_entries 
      WHERE created_at > NOW() - INTERVAL '5 minutes' 
      AND user_id = NEW.user_id 
      AND event_type = 'login_failed') > 10 THEN
    
    -- Sende Alert an Admin
    INSERT INTO admin_alerts (type, message, metadata)
    VALUES ('security', 'Possible brute force attack', jsonb_build_object('user_id', NEW.user_id));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Automatische Account-Sperre:**
```sql
-- Nach 10 failed logins → 1h Sperre
-- (Supabase macht das schon automatisch!)
```

---

## 📊 PERFORMANCE (100 gleichzeitige User)

### ✅ Fragenkatalog: Skalierung

**Frage 1:** Wie viele DB-Queries pro Page-Load?
```bash
# Tool: Supabase Dashboard → Performance → Slow Queries
# Erwartung: <10 Queries pro Page
# Ist-Zustand: ?
```

**Frage 2:** Gibt es N+1 Query-Probleme?
```typescript
// SCHLECHT (N+1):
const creators = await supabase.from('profiles').select('*')
for (const creator of creators) {
  const songs = await supabase.from('songs').select('*').eq('user_id', creator.id)
  // → 100 Creators = 100 Queries! 💥
}

// GUT (Join):
const creators = await supabase.from('profiles')
  .select('*, songs(*)')
  .eq('role', 'creator')
// → 1 Query! ✅
```

**Frage 3:** Sind Indizes auf allen Filter-Spalten?
```sql
-- Prüfe: Welche Queries laufen oft?
SELECT * FROM profiles WHERE visibility = 'public'; -- Index da?
SELECT * FROM songs WHERE is_probe = false; -- Index da?
SELECT * FROM messages WHERE recipient_id = '...' AND is_read = false; -- Index da?

-- Unsere Indizes (aus SQL_QUICK_SETUP.sql):
✅ idx_profiles_visibility
✅ idx_messages_status
✅ idx_messages_related
✅ idx_artist_logins_name
```

**Frage 4:** Wie groß werden Storage-Objekte?
```sql
-- Test: WAV-Upload mit 50MB
-- Erwartung: Upload dauert <30 Sek.
-- Timeout gesetzt? (aktuell: Standard 60 Sek.)
```

**Frage 5:** Wie viele gleichzeitige Connections?
```sql
-- Supabase Free Tier: 60 connections
-- Bei 100 gleichzeitigen Usern: Jeder braucht 1-2 connections
-- Erwartung: 100 User = 100-200 connections → PROBLEM!
-- Lösung: Connection Pooling (Supabase macht automatisch!)
```

### 🛠️ Self-Healing für Performance

**Automatische Query-Optimierung:**
```sql
-- Funktion: Findet langsame Queries
CREATE OR REPLACE FUNCTION find_slow_queries()
RETURNS TABLE(query TEXT, avg_time INTERVAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_statements.query,
    pg_stat_statements.mean_exec_time * INTERVAL '1 millisecond'
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000 -- >1 Sekunde
  ORDER BY mean_exec_time DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Cronjob: Täglich prüfen, Admin benachrichtigen
```

**Automatische Cache-Invalidierung:**
```typescript
// Wenn Creator-Profil updated wird → Cache löschen
// (Vercel macht das automatisch mit ISR!)
```

**Rate Limiting:**
```typescript
// Middleware: Max 60 Requests/Minute pro User
// Verhindert: Jemand spammt API
```

---

## 🐛 ERROR HANDLING (Fehler sichtbar machen)

### ✅ Fragenkatalog: Error-Tracking

**Frage 1:** Werden alle Fehler geloggt?
```typescript
// SCHLECHT:
try {
  await supabase.from('songs').insert(data)
} catch (error) {
  alert('Fehler!') // User sieht, aber DU NICHT!
}

// GUT:
try {
  await supabase.from('songs').insert(data)
} catch (error) {
  // 1. User-freundliche Message
  alert('Song-Upload fehlgeschlagen. Bitte versuche es erneut.')
  
  // 2. Fehler an Sentry senden (DU siehst es!)
  Sentry.captureException(error, {
    extra: {
      user_id: user.id,
      song_title: data.title,
      action: 'song_upload'
    }
  })
}
```

**Frage 2:** Gibt es "Silent Failures"?
```typescript
// Test: Was passiert wenn:
// - DB down ist?
// - Storage voll ist?
// - Network timeout?
// - Browser blocked Storage API?

// Erwartung: User sieht Fehlermeldung + du kriegst Alert!
```

**Frage 3:** Sind Error-Messages user-freundlich?
```typescript
// SCHLECHT:
"Error: 23503 Foreign key violation on table songs"

// GUT:
"Song konnte nicht hochgeladen werden. Bitte stelle sicher, dass du eingeloggt bist."
```

**Frage 4:** Werden Frontend-Fehler geloggt?
```typescript
// Console.errors → Sentry
window.addEventListener('error', (event) => {
  Sentry.captureException(event.error)
})

// Unhandled Promise Rejections → Sentry
window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason)
})
```

### 🛠️ Self-Healing für Errors

**Automatische Retry-Logik:**
```typescript
async function uploadWithRetry(file: File, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await supabase.storage.from('songs').upload(file)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      // Exponential Backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }
}
```

**Automatische Fallbacks:**
```typescript
// Wenn DB-Query fehlschlägt → Cache-Version zeigen
try {
  const creators = await supabase.from('profiles').select('*')
} catch (error) {
  // Zeige letzte gecachte Version
  const cachedCreators = localStorage.getItem('creators_cache')
  if (cachedCreators) return JSON.parse(cachedCreators)
  
  // Sonst: User-freundliche Fehlermeldung
  throw new Error('Creators konnten nicht geladen werden')
}
```

**Automatische Health-Checks:**
```typescript
// Cronjob: Alle 5 Min. prüfen ob alles läuft
// Edge Function: /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    auth: await checkAuth()
  }
  
  if (!checks.database || !checks.storage || !checks.auth) {
    // Alert an Admin senden!
    await sendAlert('System health check failed', checks)
  }
  
  return Response.json(checks)
}
```

---

## 💾 DATA INTEGRITY (Daten-Konsistenz)

### ✅ Fragenkatalog: Datenbank

**Frage 1:** Was passiert wenn Creator gelöscht wird?
```sql
-- Test: DELETE FROM profiles WHERE id = '...'
-- Erwartung: Songs werden auch gelöscht (ON DELETE CASCADE)
-- Erwartung: Messages bleiben (sender_id = NULL)
-- Ist das gewollt? JA ✅
```

**Frage 2:** Gibt es "Waisen"-Daten?
```sql
-- Songs ohne Creator?
SELECT * FROM songs WHERE user_id NOT IN (SELECT id FROM profiles);
-- Erwartung: 0 Zeilen

-- Messages ohne Empfänger?
SELECT * FROM messages WHERE recipient_id NOT IN (SELECT id FROM profiles);
-- Erwartung: 0 Zeilen (oder nur System-Messages)
```

**Frage 3:** Sind Backups aktiv?
```bash
# Supabase: Automatische Backups (Daily)
# Retention: 7 Tage (Free), 30 Tage (Pro)
# Test: Kann ich eine DB wiederherstellen?
```

**Frage 4:** Gibt es Duplikate?
```sql
-- Doppelte Künstlernamen?
SELECT artist_name, COUNT(*) 
FROM profiles 
WHERE artist_name IS NOT NULL
GROUP BY artist_name 
HAVING COUNT(*) > 1;
-- Erwartung: 0 Zeilen (wegen UNIQUE constraint in artist_logins)
```

**Frage 5:** Sind Constraints gesetzt?
```sql
-- Prüfe: Welche Spalten DÜRFEN NICHT NULL sein?
-- profiles: id, role, onboarding_status ✅
-- songs: id, user_id, title ✅
-- messages: id, recipient_id, content ✅
```

### 🛠️ Self-Healing für Data

**Automatische Cleanup-Jobs:**
```sql
-- Cronjob: Täglich aufräumen
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS void AS $$
BEGIN
  -- Lösche Songs ohne Creator (sollte nicht passieren, aber sicher ist sicher)
  DELETE FROM songs 
  WHERE user_id NOT IN (SELECT id FROM profiles);
  
  -- Lösche alte Preview-Files aus Storage (>1 Jahr alt, Creator gelöscht)
  -- (Manuell via Edge Function)
  
  -- Lösche alte Audit-Logs (>90 Tage)
  DELETE FROM admin_audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 🚨 MONITORING & ALERTS

### ✅ Monitoring-Stack (KOSTENLOS!)

**1. Sentry (Error-Tracking)**
```bash
# Setup: npm install @sentry/nextjs
# Config: sentry.client.config.ts

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  tracesSampleRate: 0.1, // 10% aller Requests tracken
  environment: process.env.NODE_ENV
})

# Was es zeigt:
✅ Alle Frontend-Errors (Console.errors)
✅ Alle Backend-Errors (API-Route-Failures)
✅ Performance-Probleme (langsame API-Calls)
✅ User-Context (welcher User hatte den Error?)
```

**2. Supabase Dashboard (DB-Monitoring)**
```bash
# Was du siehst:
✅ Slow Queries (>1 Sekunde)
✅ Connection Count (zu viele?)
✅ Storage Usage (läuft voll?)
✅ Auth Activity (verdächtige Logins?)

# Alerts einrichten:
→ Email wenn Storage >80%
→ Email wenn DB-Queries >1000ms
```

**3. Vercel Analytics (Performance)**
```bash
# Setup: Automatisch integriert!
# Was es zeigt:
✅ Page-Load-Times
✅ Welche Seiten sind langsam?
✅ Core Web Vitals (Google-Ranking-Faktor!)
```

**4. Uptime-Monitoring (UptimeRobot - kostenlos!)**
```bash
# Setup: uptimerobot.com → Add Monitor
# URL: https://yourdomain.com/api/health
# Check: Alle 5 Minuten

# Alert: Email wenn Site down
```

### 🛠️ Alert-System

**Kritische Alerts (sofort):**
```typescript
// 1. Site ist down
// 2. DB-Connection fehlgeschlagen
// 3. Storage voll (>90%)
// 4. Brute-Force-Attack erkannt

→ Email + SMS (via Twilio Free Tier)
```

**Wichtige Alerts (täglich):**
```typescript
// 1. >10 Fehler/Tag
// 2. Slow Queries erkannt
// 3. Storage >70%

→ Email-Zusammenfassung
```

**Info-Alerts (wöchentlich):**
```typescript
// 1. Neue Creator-Bewerbungen
// 2. Top-Fehler der Woche
// 3. Performance-Report

→ Email-Report
```

---

## 🧪 PRE-LAUNCH TESTS

### ✅ Manual Test-Checklist (mit Freunden)

**Test 1: Happy Path**
```
1. Creator registriert sich
2. Lädt 2 Songs hoch
3. Admin schaltet frei
4. Creator baut Profil aus
5. Song erscheint auf Startseite
6. Jemand klickt "Play"

Erwartung: Alles funktioniert smooth ✅
```

**Test 2: Sad Path (Fehler-Handling)**
```
1. Creator gibt bad-word im Namen ein → Abgelehnt ✅
2. Creator lädt 100MB-File hoch → Error-Message ✅
3. Creator lädt duplicate Song hoch → ?
4. Admin lehnt Creator ab → Songs+Avatar gelöscht ✅
5. User löscht Nachricht → Soft-Delete ✅
```

**Test 3: Evil User (Security)**
```
1. User A versucht Profil von User B zu ändern → ERROR ✅
2. User versucht sich zum Admin zu machen → ERROR ✅
3. User versucht Songs ohne Login hochzuladen → ERROR ✅
4. User spammt 100 Requests/Sekunde → Rate-Limited ✅
```

**Test 4: Load-Test (Performance)**
```bash
# Tool: k6.io (kostenlos)
# Script: load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // 50 User
    { duration: '2m', target: 100 },  // 100 User
    { duration: '1m', target: 0 },    // Ramp down
  ],
};

export default function () {
  const res = http.get('https://yourdomain.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}

# Erwartung: 
✅ Alle Requests <500ms
✅ 0 Errors
✅ DB-Connections <60
```

**Test 5: Browser-Compatibility**
```
✅ Chrome (Desktop + Mobile)
✅ Firefox
✅ Safari (Desktop + Mobile)
✅ Edge

Erwartung: Funktioniert überall!
(iPhone 11? "Kauf neu!" 😂)
```

---

## 📋 FINAL CHECKLIST (Tag vor Launch)

```
Security:
[ ] RLS Policies getestet
[ ] Admin-Zugriff funktioniert
[ ] User können nur eigene Daten sehen
[ ] Rate-Limiting aktiv

Performance:
[ ] Load-Test bestanden (100 User)
[ ] Alle Queries <1 Sekunde
[ ] Indizes auf wichtigen Spalten
[ ] CDN aktiv (Vercel automatisch)

Error-Handling:
[ ] Sentry eingerichtet
[ ] Alle try/catch-Blöcke haben Logging
[ ] User-freundliche Error-Messages
[ ] Health-Check-Endpoint aktiv

Data:
[ ] Backups aktiv (Supabase automatisch)
[ ] Keine Duplikate
[ ] Constraints gesetzt
[ ] Cleanup-Jobs laufen

Monitoring:
[ ] Sentry Alerts aktiv
[ ] Supabase Dashboard-Alerts aktiv
[ ] UptimeRobot überwacht Site
[ ] Email-Alerts getestet

Content:
[ ] AGB vorhanden
[ ] Datenschutzerklärung vorhanden
[ ] Impressum vorhanden
[ ] FAQ vorhanden
[ ] Onboarding-Tutorial vorhanden

Testing:
[ ] 5 Freunde haben getestet
[ ] Alle bekannten Bugs gefixt
[ ] Load-Test bestanden
[ ] Browser-Compatibility geprüft
```

---

## 🤖 SELF-HEALING: Was läuft automatisch?

### ✅ Ohne dein Zutun:

1. **Supabase skaliert automatisch** (mehr User → mehr Resources)
2. **Vercel deployed automatisch** (git push → live in 30 Sek)
3. **Backups laufen automatisch** (täglich, 7 Tage Retention)
4. **RLS schützt automatisch** (kein User sieht fremde Daten)
5. **Rate-Limiting schützt automatisch** (vor API-Spam)
6. **CDN cached automatisch** (Seiten laden schnell)
7. **Messages archivieren automatisch** (nach 30/90 Tagen)
8. **Soft-deleted Messages werden automatisch gelöscht** (nach 7 Tagen)

### ⚠️ Was du manuell machst:

1. **Creator-Kuration** (Freischalten/Ablehnen) - DU entscheidest
2. **Content-Moderation** (Bad-Word-Filter übersieht mal was) - DU schaust
3. **Support-Anfragen** (User hat Frage) - DU antwortest
4. **Security-Updates** (alle 3-6 Monate `npm update`) - 30 Min.

---

## 🎯 TL;DR

**Du brauchst KEINEN permanenten DB-Admin!** ✅

**Was du brauchst:**
1. **Monitoring** (Sentry, Supabase Dashboard, UptimeRobot) - zeigt dir Probleme
2. **Alerts** (Email wenn was wichtig ist) - du reagierst nur wenn nötig
3. **Self-Healing** (System macht 90% automatisch) - du chillst
4. **Pre-Launch-Check** (diese Checkliste!) - einmalig vor Start

**Zeitaufwand nach Launch:**
- Normale Woche: **1-2 Stunden** (Support-Anfragen, Content-Moderation)
- Wenn Problem: **2-4 Stunden** (Bug-Fix, dann wieder Ruhe)
- Security-Update: **30 Min alle 3 Monate**

**Dein Freund kann helfen mit:**
- Code-Review vor Launch (1-2 Tage)
- Wenn wirklich mal was brennt (selten!)

**Rest macht:** KI (ich!), Monitoring-Tools, Self-Healing-Code ✅

---

**Soll ich dir jetzt Sentry + Monitoring einrichten? Dann hast du sofort Augen auf dem System! 👀**
