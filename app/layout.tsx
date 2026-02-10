import './globals.css';
import Header from '@/components/Header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-white text-black antialiased flex flex-col min-h-screen">
        {/* Die oberste Zeile der Schablone */}
        <Header />
        
        {/* Der Inhaltsbereich: Festes Raster, maximale Breite */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto border-x border-black bg-white">
          {children}
        </main>

        <footer className="w-full border-t border-black bg-white py-4 text-center">
          <p className="text-[10px] font-black uppercase italic opacity-30 tracking-widest">
            System_Core_v2.6 // Terminal_Active
          </p>
        </footer>
      </body>
    </html>
  );
}