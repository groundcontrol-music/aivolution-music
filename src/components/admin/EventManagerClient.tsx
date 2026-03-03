'use client';

import { useState, useEffect } from 'react';
import { Plus, Save, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type PlatformEvent = {
  id: string;
  event_name: string;
  country_code: string;
  start_date: string;
  end_date: string;
  theme_color_hex: string;
  aivo_skin_id: string;
  is_active: boolean;
  created_at?: string;
};

const COUNTRY_OPTIONS = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'FR', label: 'Frankreich' },
  { value: 'ES', label: 'Spanien' },
  { value: 'US', label: 'USA' },
  { value: 'GB', label: 'Großbritannien' },
];

const AIVO_SKIN_OPTIONS = [
  { value: 'default', label: 'Standard' },
  { value: 'ostern', label: 'Ostern' },
  { value: 'xmas', label: 'Weihnachten' },
  { value: 'national', label: 'Nationalfeiertag' },
];

export default function EventManagerClient() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // Event ID, das gerade gespeichert wird
  const [deleting, setDeleting] = useState<string | null>(null); // Event ID, das gerade gelöscht wird
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('platform_events').select('*').order('start_date', { ascending: true });
    if (error) {
      console.error('Fehler beim Laden der Events:', error);
      alert('Fehler beim Laden der Events.');
      setEvents([]);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleNewEvent = () => {
    setEvents([
      ...events,
      {
        id: `new-${events.length}`,
        event_name: '',
        country_code: 'DE',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 24h später
        theme_color_hex: '#FF0000',
        aivo_skin_id: 'default',
        is_active: true,
      },
    ]);
  };

  const handleChange = (id: string, field: keyof PlatformEvent, value: any) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) => (event.id === id ? { ...event, [field]: value } : event))
    );
  };

  const handleSave = async (eventToSave: PlatformEvent) => {
    setSaving(eventToSave.id);
    const { id, created_at, ...dataToSave } = eventToSave; // created_at entfernen, id ist für insert/update entscheidend

    try {
      if (id.startsWith('new-')) {
        // Neuer Event
        const { data, error } = await supabase.from('platform_events').insert([dataToSave]).select();
        if (error) throw error;
        alert('Event erfolgreich erstellt!');
        setEvents((prevEvents) => prevEvents.map((e) => (e.id === eventToSave.id ? data[0] : e)));
      } else {
        // Bestehender Event
        const { error } = await supabase.from('platform_events').update(dataToSave).eq('id', id);
        if (error) throw error;
        alert('Event erfolgreich aktualisiert!');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Events:', error);
      alert('Fehler beim Speichern: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(null);
      fetchEvents(); // Events neu laden, um die IDs für neue Einträge zu erhalten
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sicher, dass du dieses Event löschen willst?')) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('platform_events').delete().eq('id', id);
      if (error) throw error;
      alert('Event erfolgreich gelöscht!');
      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== id));
    } catch (error) {
      console.error('Fehler beim Löschen des Events:', error);
      alert('Fehler beim Löschen: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-500 py-4">Events werden geladen...</p>;
  }

  return (
    <div className="space-y-8">
      {events.map((event) => (
        <div key={event.id} className="bg-white border-2 border-black rounded-[1.5rem] p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Event Name</label>
              <input
                type="text"
                value={event.event_name}
                onChange={(e) => handleChange(event.id, 'event_name', e.target.value)}
                className="w-full border-2 border-black rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Land Code</label>
              <select
                value={event.country_code}
                onChange={(e) => handleChange(event.id, 'country_code', e.target.value)}
                className="w-full border-2 border-black rounded px-3 py-2 text-sm"
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Start Datum & Zeit</label>
              <input
                type="datetime-local"
                value={event.start_date.slice(0, 16)}
                onChange={(e) => handleChange(event.id, 'start_date', e.target.value + ':00.000Z')}
                className="w-full border-2 border-black rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">End Datum & Zeit</label>
              <input
                type="datetime-local"
                value={event.end_date.slice(0, 16)}
                onChange={(e) => handleChange(event.id, 'end_date', e.target.value + ':00.000Z')}
                className="w-full border-2 border-black rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Theme Farbe (Hex)</label>
              <input
                type="color"
                value={event.theme_color_hex}
                onChange={(e) => handleChange(event.id, 'theme_color_hex', e.target.value)}
                className="w-full h-10 border-2 border-black rounded px-1 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Aivo Skin</label>
              <select
                value={event.aivo_skin_id}
                onChange={(e) => handleChange(event.id, 'aivo_skin_id', e.target.value)}
                className="w-full border-2 border-black rounded px-3 py-2 text-sm"
              >
                {AIVO_SKIN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-full flex items-center gap-2">
              <input
                type="checkbox"
                id={`is_active-${event.id}`}
                checked={event.is_active}
                onChange={(e) => handleChange(event.id, 'is_active', e.target.checked)}
                className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <label htmlFor={`is_active-${event.id}`} className="text-sm text-zinc-700">Aktiv</label>
            </div>
          </div>
          <div className="mt-6 flex justify-between gap-4">
            <button
              onClick={() => handleSave(event)}
              disabled={saving === event.id}
              className="px-6 py-3 bg-black text-white font-bold uppercase text-xs hover:bg-red-600 flex items-center gap-2 rounded-lg transition-colors"
            >
              {saving === event.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {event.id.startsWith('new-') ? 'Event erstellen' : 'Event speichern'}
            </button>
            {!event.id.startsWith('new-') && (
              <button
                onClick={() => handleDelete(event.id)}
                disabled={deleting === event.id}
                className="px-6 py-3 bg-red-600 text-white font-bold uppercase text-xs hover:bg-red-700 flex items-center gap-2 rounded-lg transition-colors"
              >
                {deleting === event.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Löschen
              </button>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={handleNewEvent}
        className="mt-8 px-6 py-3 bg-red-600 text-white font-bold uppercase text-sm hover:bg-red-700 flex items-center gap-2 rounded-lg mx-auto"
      >
        <Plus size={20} />
        Neues Event hinzufügen
      </button>
    </div>
  );
}
