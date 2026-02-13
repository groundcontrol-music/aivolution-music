# Creator-Signup Flow - Finale Version

## ✅ Was wurde implementiert?

### 1. **Schlanker 2-Schritte-Flow** (`/join`)

**Schritt 1: Rechtliche Daten + Basis-Info**
- Künstlername
- Email
- Passwort
- 6 Checkboxen (Alter, Rechte, KI, AGB, Löschung, etc.)
- Bad-Word-Filter aktiv

**Schritt 2: Song-Upload**
- 1-2 MP3s hochladen (max. 10MB)
- Songs werden als `is_probe = true` gespeichert
- Admin bekommt Benachrichtigung
- Redirect zu `/?signup=success`

### 2. **KEINE Adressdaten im Signup!**
✅ Adressdaten werden **erst später** abgefragt, wenn Creator:
- Freigeschaltet wurde
- Im Profil-Builder ist (`/profile-builder`)
- Etwas verkaufen möchte

### 3. **Alte Routen redirecten**
- `/creator-signup` → Redirect zu `/join` ✅
- `/creator-signup-slim` → **Gelöscht** (nicht mehr nötig)
- `/join` → **Neuer 2-Schritte-Flow** ✅
- `/onboarding` → **Bleibt bestehen** (für existierende User)

### 4. **Links aktualisiert**
- Header: "Creator werden" → `/join`
- Homepage: "Creator werden" → `/join`

---

## 📋 Nächste Schritte (für später)

### 1. **Impressum/TMG** (nach Freischaltung)
Wenn Creator freigeschaltet ist und im Profil-Builder:
- **Impressum-Upload als Bild** (geschützt, nur für Behörden/Abmahnungen)
- TMG-konform (§5 TMG Anbieterkennzeichnung)
- Speichern in `storage.buckets.impressum` (private bucket!)
- Nur Admin kann zugreifen (bei Anfragen)

**Technisch:**
```sql
ALTER TABLE profiles ADD COLUMN impressum_url TEXT;
-- Bucket: impressum (private)
```

**UI:**
```tsx
// In /profile-builder
<div>
  <label>Impressum (Bild hochladen)</label>
  <input type="file" accept="image/*" />
  <p className="text-xs text-gray-500">
    TMG-konform: Dein Impressum wird geschützt gespeichert und 
    nur bei rechtlichen Anfragen weitergegeben.
  </p>
</div>
```

### 2. **Adressdaten** (nach Freischaltung)
Wenn Creator etwas verkaufen möchte:
- **Adresse** (für Rechnungen, Steuer)
- **Steuernummer** (optional, bei > 30 Verkäufen/Jahr Pflicht)
- **IBAN** (für Auszahlungen)

**Technisch:**
```sql
ALTER TABLE profiles ADD COLUMN address JSONB; -- {street, city, zip, country}
ALTER TABLE profiles ADD COLUMN tax_id TEXT;
ALTER TABLE profiles ADD COLUMN iban TEXT;
```

**UI:**
```tsx
// In /profile-builder oder /profile/settings
<div className="bg-yellow-50 border-2 border-yellow-600 p-4">
  <h3>⚠️ Verkäufer-Daten erforderlich</h3>
  <p>Um Songs verkaufen zu können, benötigen wir deine Adresse und Zahlungsdaten.</p>
  <button>Jetzt hinterlegen</button>
</div>
```

---

## 🔐 Datenschutz & Sicherheit

### Was wird gespeichert?

**Beim Signup:**
- ✅ Künstlername
- ✅ Email (für Login)
- ✅ Passwort (verschlüsselt via Supabase Auth)
- ✅ 2 Songs (als Arbeitsprobe)

**NICHT beim Signup:**
- ❌ Adressdaten
- ❌ Steuernummer
- ❌ IBAN
- ❌ Impressum

### Wann kommen weitere Daten?

**Nach Freischaltung (im Profil-Builder):**
- Avatar
- Bio
- Tech-Stack
- Social Links
- **Impressum** (optional, TMG-konform)

**Beim ersten Verkauf:**
- Adresse (für Rechnungen)
- IBAN (für Auszahlungen)
- Steuernummer (bei > 30 Verkäufen/Jahr)

---

## ⚖️ TMG & Impressumspflicht

### Wer braucht ein Impressum?

**Grundsätzlich:** Jeder Creator, der gewerblich (nicht privat) handelt.

**§5 TMG Pflichtangaben:**
1. Name
2. Anschrift (postalisch erreichbar)
3. Kontaktdaten (Email)
4. ggf. Steuernummer (bei > 30 Verkäufen/Jahr)
5. ggf. Handelsregister-Nummer

**Für Aivolution Creators:**
- **Option 1:** Impressum als Bild hochladen (geschützt gespeichert)
- **Option 2:** Impressum-Formular ausfüllen (wird als Bild generiert)

**Wichtig:** Impressum ist **nicht öffentlich** sichtbar, nur bei rechtlichen Anfragen!

### Technische Umsetzung

**Storage Bucket:**
```sql
CREATE BUCKET impressum PRIVATE;
```

**RLS Policies:**
```sql
-- Nur Creator kann eigenes Impressum hochladen
CREATE POLICY "Creators can upload own impressum"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'impressum' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND get_my_role() = 'creator'
  );

-- Nur Admins können Impressum lesen (Behördenanfragen)
CREATE POLICY "Admins can read impressum"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'impressum' 
    AND get_my_role() = 'admin'
  );
```

**Audit-Log:**
```sql
-- Jeder Zugriff wird protokolliert
CREATE TABLE impressum_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  reason TEXT, -- "Abmahnung", "Polizei-Anfrage", etc.
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Testing-Checklist

### Signup-Flow:
- [ ] `/join` öffnet sich korrekt
- [ ] Schritt 1: Rechtliche Checkboxen funktionieren
- [ ] Bad-Word-Filter funktioniert (teste mit "nazi" oder "fuck")
- [ ] Schritt 2: Song-Upload funktioniert (1-2 MP3s)
- [ ] Admin bekommt Benachrichtigung
- [ ] Redirect zu `/?signup=success` funktioniert
- [ ] KEINE Adressdaten werden abgefragt

### Alte Routen:
- [ ] `/creator-signup` → Redirect zu `/join`
- [ ] Header "Creator werden" → führt zu `/join`
- [ ] Homepage "Creator werden" → führt zu `/join`

### Nach Freischaltung:
- [ ] Grüner Button erscheint
- [ ] `/profile-builder` öffnet sich
- [ ] Avatar, Bio, Tech-Stack können eingegeben werden
- [ ] Profil wird gespeichert
- [ ] Redirect zu eigenem Profil funktioniert

---

## 📝 Zusammenfassung

✅ **Signup:** 2 Schritte (Legal + Songs) - KEINE Adressdaten  
✅ **Login:** Mit Künstlername oder Email  
✅ **Kuration:** Admin bekommt Link zum Profil  
✅ **Freischaltung:** Creator baut Profil aus (Avatar, Bio, etc.)  
✅ **Impressum:** Später, als geschütztes Bild (TMG-konform)  
✅ **Adressdaten:** Erst beim ersten Verkauf  

**Datenschutz:** Minimal (DSGVO-konform)  
**Rechtssicherheit:** TMG-konform (Impressum geschützt)  
**User Experience:** Schlank & einfach! 🚀
