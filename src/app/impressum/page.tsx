export const metadata = {
  title: 'Impressum | Aivolution Music',
  description: 'Rechtliche Anbieterkennzeichnung von Aivolution Music.',
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white border-2 border-black rounded-[2.5rem] p-6 md:p-10 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-6">
            Im<span className="text-red-600">pressum</span>
          </h1>

          <div className="space-y-5 text-sm md:text-base leading-relaxed">
            <section>
              <h2 className="text-lg font-black uppercase mb-1">Angaben gemäß § 5 TMG</h2>
              <p className="opacity-80">
                <strong>Aivolution Music Hosting</strong>
                <br />
                Landstrasse 73
                <br />
                31717 Nordsehl
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase mb-1">Kontakt</h2>
              <p className="opacity-80">
                E-Mail: folgt
                <br />
                Telefon: folgt
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase mb-1">Verantwortlich für den Inhalt</h2>
              <p className="opacity-80">
                Aivolution Music Hosting
                <br />
                Landstrasse 73
                <br />
                31717 Nordsehl
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black uppercase mb-1">Hinweis Creator-Impressum</h2>
              <p className="opacity-80">
                Dies ist die zentrale Impressums-Seite der Plattform. Creator-spezifische
                Impressumsangaben werden als nächster Schritt ergänzt.
                <br />
                Geplantes Modell: Creator-Impressum als Bild mit Schutzschicht gegen
                automatisches Auslesen.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
