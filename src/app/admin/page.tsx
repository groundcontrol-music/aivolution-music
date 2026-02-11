import { Database } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="p-16 grid place-items-center h-full">
      <div className="text-center max-w-2xl space-y-6">
        <Database size={64} className="mx-auto text-black opacity-10" />
        <h2 className="text-4xl font-black uppercase italic tracking-tight">System Ready.</h2>
        <p className="font-bold text-gray-400 italic">
          Wähle ein Modul aus der oberen Navigationsleiste, um die Plattform zu steuern.
        </p>
        <div className="inline-block bg-black text-white px-4 py-2 text-[10px] font-mono uppercase tracking-widest mt-8">
          Waiting for Input_
        </div>
      </div>
    </div>
  );
}
