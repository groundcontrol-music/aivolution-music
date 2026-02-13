# Messages-System: DSGVO & Rechtliche Aufbewahrung

## 📋 Rechtliche Grundlage

### DSGVO-Prinzipien
1. **Datenminimierung:** Nur notwendige Daten speichern
2. **Speicherbegrenzung:** Daten nur so lange aufbewahren wie nötig
3. **Löschpflicht:** User können Daten löschen (Recht auf Vergessenwerden)
4. **Auskunftspflicht:** Behörden können Daten bei Rechtsverstößen anfordern

---

## ⏰ Aufbewahrungsfristen

### Private Nachrichten (User ↔ User)
- **Empfehlung:** **30 Tage** nach Erhalt
- **Grund:** Nach 30 Tagen ist die geschäftliche Relevanz vorbei
- **User-Kontrolle:** User können jederzeit manuell löschen
- **Auto-Delete:** Optional nach 30 Tagen (Soft-Delete für 7 Tage Behördenanfragen)

### System-Nachrichten (Freischaltung, Ablehnung)
- **Empfehlung:** **90 Tage**
- **Grund:** Historische Nachvollziehbarkeit bei Streitfällen
- **Beispiel:** "Du wurdest freigeschaltet" → Beweissicherung bei Rechtsstreit

### Admin-Benachrichtigungen (Bewerbungen)
- **Empfehlung:** **7 Tage** nach Bearbeitung
- **Grund:** Keine dauerhafte Speicherung nötig, da Profiländerung protokolliert wird
- **Auto-Archive:** Nach 7 Tagen archiviert oder gelöscht

### Forum-Nachrichten (öffentlich)
- **Empfehlung:** **Unbegrenzt** (solange User aktiv)
- **Grund:** Öffentlicher Content, Teil des Platforms-Contents
- **User-Kontrolle:** User kann eigene Beiträge jederzeit löschen

---

## 🗑️ Löschkonzept

### 1. **Soft-Delete** (7 Tage)
Wenn User eine Nachricht löscht:
```sql
UPDATE messages SET
  deleted_at = NOW(),
  deleted_by = [user_id]
WHERE id = [message_id];
```

**Vorteil:** Behörden können bei Rechtsverstoß noch zugreifen (innerhalb 7 Tage)

### 2. **Hard-Delete** (nach 7 Tagen)
```sql
DELETE FROM messages
WHERE deleted_at < NOW() - INTERVAL '7 days';
```

**Automatisch per Cron-Job oder Supabase Function**

### 3. **Auto-Archive** (alte Nachrichten)
```sql
-- Private Messages älter als 30 Tage
UPDATE messages SET
  archived = true
WHERE message_type = 'private'
  AND created_at < NOW() - INTERVAL '30 days'
  AND archived = false;

-- System Messages älter als 90 Tage
UPDATE messages SET
  archived = true
WHERE message_type = 'system'
  AND created_at < NOW() - INTERVAL '90 days'
  AND archived = false;
```

**Archivierte Nachrichten sind nicht sichtbar, aber noch vorhanden (für Behördenanfragen)**

---

## 👮 Behördenanfragen (Admin-Zugriff)

### Wann brauchen wir Admin-Zugriff?
- ✅ **Bei rechtlichen Anfragen:** Polizei, Staatsanwaltschaft
- ✅ **Bei Urheberrechtsverletzungen:** GEMA, Rechteinhaber
- ✅ **Bei Verdacht auf Betrug:** Fake-Profile, Geldwäsche
- ✅ **Bei Gewaltdrohungen/Hate Speech**

### Was muss Admin sehen können?
1. **Alle Nachrichten zwischen zwei Usern** (auch gelöschte, innerhalb 7 Tage)
2. **Metadaten:** Sender, Empfänger, Zeitstempel, IP-Adresse (falls geloggt)
3. **Gelöschte Nachrichten:** Innerhalb der 7-Tage-Soft-Delete-Frist

### Admin-Panel: `/admin/messages-inspector`
**Zugriff nur für role='admin'**

Funktionen:
- 🔍 Suche nach User-ID oder Künstlername
- 📊 Alle Nachrichten eines Users anzeigen
- 🗑️ Auch soft-deleted Messages anzeigen
- 📥 Export als CSV (für Behördenanfragen)
- 🔒 Audit-Log: Wer hat wann was abgerufen?

---

## 🔐 Datensicherheit

### RLS Policies (Row Level Security)
```sql
-- User sehen nur ihre eigenen Messages
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (recipient_id = auth.uid() AND deleted_at IS NULL);

-- User können eigene Messages löschen (Soft-Delete)
CREATE POLICY "Users can delete own messages"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (deleted_by = auth.uid());

-- Admins sehen ALLE Messages (auch gelöschte, für 7 Tage)
CREATE POLICY "Admins can read all messages"
  ON messages FOR SELECT
  USING (get_my_role() = 'admin');
```

### Verschlüsselung
- ✅ **In Transit:** HTTPS (automatisch via Supabase)
- ✅ **At Rest:** PostgreSQL-Verschlüsselung (automatisch via Supabase)
- ❌ **End-to-End:** NICHT implementiert (zu komplex für Text-Messages)

**Hinweis:** Bei sensiblen Daten (z.B. Bankdaten) NIEMALS per Message austauschen!

---

## 📊 Speicherplatz

### Rechenbeispiel
```
1 Nachricht = ca. 500 Zeichen (inkl. Metadaten)
500 Zeichen = 500 Bytes = 0.5 KB

10.000 Nachrichten = 5 MB
100.000 Nachrichten = 50 MB
1.000.000 Nachrichten = 500 MB
```

**Fazit:** Selbst bei 1 Million Nachrichten nur 500 MB. **Sehr ressourcenschonend!**

---

## ✅ Empfehlungen für Aivolution

### 1. **Aufbewahrungsfristen festlegen**
- Private Messages: **30 Tage**
- System Messages: **90 Tage**
- Admin-Benachrichtigungen: **7 Tage** nach Bearbeitung
- Forum-Beiträge: **Unbegrenzt**

### 2. **Soft-Delete implementieren**
- User können Nachrichten löschen
- Soft-Delete für **7 Tage** (Behördenanfragen)
- Dann Hard-Delete (endgültig)

### 3. **Auto-Archive aktivieren**
- Alte Nachrichten automatisch archivieren
- Nicht löschen, aber ausblenden
- Per Supabase Edge Function (täglich laufen lassen)

### 4. **Admin-Panel bauen**
- `/admin/messages-inspector`
- Nur für Behördenanfragen nutzen
- Audit-Log: Wer hat wann was abgerufen?
- **WICHTIG:** In Datenschutzerklärung erwähnen!

### 5. **Datenschutzerklärung anpassen**
Hinzufügen:
```
"Nachrichten zwischen Usern werden nach 30 Tagen archiviert und nach 
90 Tagen gelöscht. Bei rechtlichen Anfragen können Behörden innerhalb 
von 7 Tagen nach Löschung noch auf Nachrichten zugreifen."
```

### 6. **AGB-Ergänzung**
```
"User verpflichten sich, keine illegalen Inhalte über das 
Nachrichtensystem auszutauschen. Bei Verdacht auf Rechtsverstöße 
können Nachrichten an Behörden weitergegeben werden."
```

---

## 🚀 Implementierung

### Schritt 1: Spalten hinzufügen
```sql
ALTER TABLE messages 
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN archived BOOLEAN DEFAULT false;
```

### Schritt 2: RLS Policies anpassen
```sql
-- User sehen keine gelöschten/archivierten Messages
CREATE POLICY "Users see only active messages"
  ON messages FOR SELECT
  USING (
    recipient_id = auth.uid() 
    AND deleted_at IS NULL 
    AND archived = false
  );

-- Admins sehen ALLES
CREATE POLICY "Admins see all messages"
  ON messages FOR SELECT
  USING (get_my_role() = 'admin');
```

### Schritt 3: Auto-Archive-Function
```sql
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Private Messages > 30 Tage
  UPDATE messages SET archived = true
  WHERE message_type = 'private'
    AND created_at < NOW() - INTERVAL '30 days'
    AND archived = false;

  -- System Messages > 90 Tage
  UPDATE messages SET archived = true
  WHERE message_type = 'system'
    AND created_at < NOW() - INTERVAL '90 days'
    AND archived = false;

  -- Hard-Delete: Soft-deleted > 7 Tage
  DELETE FROM messages
  WHERE deleted_at < NOW() - INTERVAL '7 days';
END;
$$;
```

### Schritt 4: Cron-Job (täglich)
Via **Supabase Edge Function** oder **pg_cron**:
```sql
SELECT cron.schedule(
  'archive-old-messages',
  '0 2 * * *', -- Täglich um 2 Uhr nachts
  $$SELECT archive_old_messages()$$
);
```

---

## ⚖️ Rechtliche Absicherung

### In Datenschutzerklärung:
```
§X Nachrichtensystem

(1) Nachrichten zwischen Nutzern werden verschlüsselt übertragen.

(2) Private Nachrichten werden nach 30 Tagen archiviert und nach 
    90 Tagen endgültig gelöscht.

(3) Nutzer können Nachrichten jederzeit manuell löschen. Eine 
    Wiederherstellung ist nicht möglich.

(4) Bei begründetem Verdacht auf Rechtsverstöße können gelöschte 
    Nachrichten innerhalb von 7 Tagen an Behörden weitergegeben werden.

(5) Administratoren haben zu Sicherheitszwecken Zugriff auf alle 
    Nachrichten. Dieser Zugriff wird protokolliert.
```

### In AGB:
```
§X Verhaltensregeln

(1) Nutzer verpflichten sich, das Nachrichtensystem nicht für 
    illegale Zwecke zu nutzen.

(2) Verboten sind insbesondere:
    - Beleidigungen und Hate Speech
    - Urheberrechtsverletzungen
    - Betrug und Phishing
    - Gewaltandrohungen

(3) Bei Verstößen behält sich der Betreiber vor, Nachrichten an 
    Behörden weiterzugeben.
```

---

## 📝 Zusammenfassung

✅ **User können Nachrichten löschen** (bereits implementiert)  
✅ **Soft-Delete für 7 Tage** (Behördenanfragen) → TODO  
✅ **Auto-Archive nach 30/90 Tagen** → TODO  
✅ **Admin-Panel für Behördenanfragen** → TODO  
✅ **Datenschutzerklärung anpassen** → TODO  
✅ **AGB-Ergänzung** → TODO  

**Speicherplatz:** Minimal (max. 500 MB bei 1 Mio Messages)  
**Rechtssicherheit:** Hoch (DSGVO-konform + Behördenzugriff)  
**User-Kontrolle:** Hoch (manuelle Löschung jederzeit möglich)
