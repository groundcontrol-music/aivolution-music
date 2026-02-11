import { createClient } from '@/utils/supabase/server'

export default async function TestRolePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let roleResult = 'Kein User eingeloggt'
  let roleError = null

  if (user) {
    const { data, error } = await supabase.rpc('get_my_role')
    roleResult = data
    roleError = error
  }

  return (
    <div className="p-12 font-mono">
      <h1 className="text-xl font-bold mb-4">Admin Check</h1>
      <p>User: {user ? user.email : 'Nicht eingeloggt'}</p>
      <p>ID: {user ? user.id : '-'}</p>
      <div className="mt-8 p-4 border-2 border-black">
        <p><strong>Ergebnis get_my_role():</strong> {JSON.stringify(roleResult)}</p>
        <p><strong>Fehler:</strong> {JSON.stringify(roleError)}</p>
      </div>
    </div>
  )
}
