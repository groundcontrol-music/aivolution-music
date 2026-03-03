import { createClient } from '@/utils/supabase/server';
import EventManagerClient from '@/components/admin/EventManagerClient';

export const metadata = {
  title: 'Events verwalten | Aivolution Music Admin',
  description: 'Verwalte globale Events und Feiertage für Aivolution Music.',
};

export default async function EventsPage() {
  const supabase = await createClient();

  // Hier könnten initial Daten für den EventManagerClient geladen werden, falls nötig
  // const { data: initialEvents, error } = await supabase.from('platform_events').select('*');

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-6">
        <span className="text-red-600">Events</span> verwalten
      </h1>
      <p className="text-sm text-zinc-600 mb-8">Hier kannst du globale Events und Feiertage für verschiedene Länder einstellen.</p>
      <EventManagerClient />
    </div>
  );
}