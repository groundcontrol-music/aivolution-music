import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] text-center space-y-6">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="text-white" size={32} />
        </div>
        <h1 className="text-2xl font-black uppercase italic">Fehler</h1>
        <p className="text-sm font-medium text-gray-600">
          Etwas ist schiefgelaufen. Bitte versuche es erneut.
        </p>
        <Link 
          href="/" 
          className="inline-block bg-black text-white px-6 py-3 font-black uppercase text-sm hover:bg-red-600 transition-colors"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
