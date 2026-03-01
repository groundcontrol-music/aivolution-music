# Creator Shop – Spezifikation (Stand nach Skizze + Chat)

## 1. Öffentlicher Shop-Bereich (links / Hauptbereich)

### Überschrift
- **„Creator Shop“** prominent
- Daneben (rechts vom Schriftzug): **Suchfeld**

### Suche
- Eine Suchzeile, die durchsucht:
  - **Songname** (Titel)
  - **Artist** (Creator-Name)
  - **Erstellungstool** (z. B. Suno, Udio, …)
  - **Genre**
- Umsetzung: Ein Suchbegriff durchsucht alle genannten Felder (oder Filter „Suche in: Titel / Artist / Tool / Genre“).

### Kategorien / Filter
- **Single** | **EP** | **Album** (wie bisher, Filter-Buttons)
- Zusatz: **„Only at Aivolution Music“** als Marken-Badge/Text sichtbar (z. B. unter den Kategorien oder neben dem Shop-Titel)

### Anzeige
- Tracks als Karten (z. B. `CompactSongCard`), gefiltert nach Kategorie und Suchbegriff.

---

## 2. Kommandozentrale (rechts, nur für Creator-Owner)

### Überschrift
- **„Kommandozentrale“** (persönlicher Bereich)

### Upload
- **Upload** von Songs (mehrere Dateien gleichzeitig)
- Nach dem Upload: Möglichkeit, Tracks als **Single**, **EP** oder **Album** zu kennzeichnen (z. B. „Zu EP hinzufügen“ / „Als Album veröffentlichen“)
- Zukünftig: **MP3 vom Handy** in denselben Shop laden  
  → Vorschlag: Gleiche Upload-API nutzen; im Frontend `input type="file" accept="audio/*"` und ggf. `capture="environment"` weglassen, damit auf dem Handy die Dateiauswahl (inkl. MP3 aus dem Speicher) genutzt werden kann – keine separate „Handy-App“ nötig.

### Liste
- **Songs** aufgelistet (einzeln)
- **EP-** und **Album-Ordner** sichtbar (gruppiert oder als eigene Sektionen)

### Pro Song – Klick zum Spezifizieren
- **MP3 / WAV**: automatisch ausgefüllt (aus Datei-URL/MIME oder Speicherort ableiten)
- **Erstellungstool**: Dropdown (Suno, Udio, andere gängige Anbieter, „Sonstige“)
- **Preis**: editierbares Feld
- **Genre**: Genrebestimmung (z. B. Tags/Dropdown, Mehrfachauswahl wie bisher `genres text[]`)

Weitere Felder (z. B. Cover, Beschreibung) können hier ergänzt werden.

### Optional / später
- **Statistik** (Plays, Downloads)
- **Stripe**-Integration (Checkout)
- **Besucher** (einfache Besucherstatistik)

---

## 2b. Einkaufswagen & Rollen (Header oben rechts)

### Konzept
- **Creator = Verkäufer oder Käufer.** Verkäufer managen alles im **Creator-Profil** (Kommandozentrale, Einnahmen, Songs). Käufer-Seite: **Einkaufswagen** oben rechts.
- **Einkaufswagen-Symbol** (Header): Führt zu einer Seite, auf der eingeloggte Nutzer ihre **Käufe gelistet** bekommen. Bezahlung zukünftig über **Stripe**.
- **Nur Käufer-relevante Dinge** oben rechts: Profil-Icon (eigenes Profil), E-Mail (eingeloggt), **Warenkorb** (Käufe / Checkout), Exit. Verkäufer-Daten und Einnahmen bleiben im Creator-Profil.
- **Kundenkonto:** Noch offen; wahrscheinlich sinnvoll (z. B. Bestellhistorie, Downloads, Rechnungen). Kann später als eigene Seite oder Bereich „Meine Käufe“ angebunden werden.

### Technik (später)
- Cart/Warenkorb: Tabelle z. B. `cart_items` oder `orders`; Stripe Checkout für Zahlung; nach Kauf → Eintrag in „Meine Käufe“ / Kundenkonto.

---

## 3. Technik (Kurz)

- **DB:** `songs` hat u. a. `title`, `genres`, `price`, `file_url`, `mp3_preview_url`, `wav_url`.  
  Falls noch nicht vorhanden: Spalten `release_type` (single | ep | album), `creation_tool` (text), ggf. `album_id` / `ep_id` für Gruppierung.
- **Suche:** Client-seitig oder per Postgres-`ilike`/`text_search` auf Titel, Artist (über `profiles`), `creation_tool`, `genres`.
- **Upload:** Bestehender Flow (z. B. `creator-signup-slim`) erweiterbar: Mehrere Dateien, dann pro Song Metadaten (release_type, creation_tool, price, genre) in der Kommandozentrale pflegen.
- **Mobile:** Gleicher Upload-Endpunkt; File-Input mit `accept="audio/*"` unterstützt auf Mobilgeräten die Auswahl von MP3 aus dem Gerät.

---

## 4. Design

- An Skizze angelehnt: **Links** = Creator Shop (Suche, Single/EP/Album, „Only at Aivolution Music“, Track-Karten).  
- **Rechts** = Kommandozentrale (Upload, Song-Liste, EP/Album-Ordner, Klick auf Song → Bearbeiten: Erstellungstool, Preis, Genre, MP3/WAV-Anzeige).
- Ecken **2.5rem**, Schwarz/Rot/Weiß, brutalistisch (Aivolution-Stil).
