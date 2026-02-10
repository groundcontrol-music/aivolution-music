import { createClient } from '@/utils/supabase/server';

/**
 * Debug-Seite zur Fehlersuche beim Admin-Zugriff.
 * Nach dem Debug entfernen: app/debug/
 */
export default async function DebugPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-12 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-black uppercase">Admin Debug</h1>
        <div className="bg-red-100 border-2 border-red-600 p-6 font-mono text-sm">
          Nicht eingeloggt. Bitte zuerst einloggen, dann /debug aufrufen.
        </div>
      </div>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: roleViaRpc } = await supabase.rpc('get_my_role');

  return (
    <div className="p-12 max-w-2xl mx-auto space-y-8 font-mono text-sm">
      <h1 className="text-2xl font-black uppercase">Admin Debug</h1>

      <section className="border-2 border-black p-6 space-y-3">
        <h2 className="font-black uppercase text-red-600">1. Auth User</h2>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.email ?? '—'}</p>
        <p><strong>Auth Error:</strong> {authError?.message ?? 'keiner'}</p>
      </section>

      <section className="border-2 border-black p-6 space-y-3">
        <h2 className="font-black uppercase text-red-600">2. Profiles Query</h2>
        <p><strong>Profile Error:</strong> {profileError?.message ?? 'keiner'}</p>
        <p><strong>Profile Error Code:</strong> {profileError?.code ?? '—'}</p>
        <p><strong>Profile Daten:</strong></p>
        <pre className="bg-gray-100 p-4 overflow-auto text-xs whitespace-pre-wrap">
          {profile ? JSON.stringify(profile, null, 2) : 'null (kein Eintrag gefunden)'}
        </pre>
      </section>

      <section className="border-2 border-black p-6 space-y-3">
        <h2 className="font-black uppercase text-red-600">3. Admin-Check</h2>
        <p><strong>profile?.role:</strong> {String(profile?.role ?? 'undefined/null')}</p>
        <p><strong>get_my_role() RPC:</strong> {String(roleViaRpc ?? 'null')}</p>
        <p><strong>Würde Zugriff gewährt (via RPC):</strong> {roleViaRpc === 'admin' ? 'JA' : 'NEIN'}</p>
      </section>

      <p className="text-xs opacity-50">Diese Seite nach dem Debug entfernen.</p>
    </div>
  );
}
