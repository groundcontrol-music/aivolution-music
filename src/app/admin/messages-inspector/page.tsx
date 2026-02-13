'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, Download, Shield, AlertTriangle, Eye } from 'lucide-react'

interface Message {
  id: string
  message_type: string
  subject?: string
  content: string
  sender_id?: string
  recipient_id: string
  created_at: string
  is_read: boolean
  deleted_at?: string
  deleted_by?: string
  archived: boolean
}

export default function MessagesInspectorPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      // 1. Finde User per Künstlername oder Email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, artist_name')
        .or(`artist_name.ilike.%${searchQuery}%,id.eq.${searchQuery}`)
        .limit(1)
        .single()

      if (!profiles) {
        alert('User nicht gefunden')
        setLoading(false)
        return
      }

      setTargetUserId(profiles.id)

      // 2. Hole ALLE Messages des Users (via RPC, auch gelöschte!)
      const { data: userMessages, error } = await supabase
        .rpc('admin_get_user_messages', { target_user_id: profiles.id })

      if (error) throw error

      setMessages(userMessages || [])

      // 3. Log Admin-Zugriff
      await supabase.rpc('log_admin_access', {
        action_type: 'view_messages',
        target_user: profiles.id,
        meta: { search_query: searchQuery }
      })

    } catch (error: any) {
      console.error('Search Error:', error)
      alert(`Fehler: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    const { data } = await supabase.rpc('get_messages_stats')
    if (data && data.length > 0) {
      setStats(data[0])
    }
  }

  const exportMessages = () => {
    if (messages.length === 0) return

    // CSV Export
    const csvHeader = 'ID,Type,Subject,Content,Sender ID,Recipient ID,Created At,Is Read,Deleted At,Archived\n'
    const csvRows = messages.map(m => 
      `${m.id},"${m.message_type}","${m.subject || ''}","${m.content.replace(/"/g, '""')}",${m.sender_id || ''},${m.recipient_id},${m.created_at},${m.is_read},${m.deleted_at || ''},${m.archived}`
    ).join('\n')

    const csvContent = csvHeader + csvRows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `messages_export_${targetUserId}_${Date.now()}.csv`
    link.click()

    // Log Export
    supabase.rpc('log_admin_access', {
      action_type: 'export_messages',
      target_user: targetUserId,
      meta: { message_count: messages.length }
    })
  }

  return (
    <div className="space-y-8">
      
      {/* Header + Warning */}
      <div className="bg-yellow-50 border-2 border-yellow-600 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={32} />
          <div>
            <h2 className="text-xl font-black uppercase mb-2">⚠️ Behörden-Zugriff</h2>
            <p className="text-sm font-medium">
              Dieser Bereich dient ausschließlich zur Einsicht von Nachrichten bei <strong>rechtlichen Anfragen</strong> 
              (Polizei, Staatsanwaltschaft, GEMA, etc.). Jeder Zugriff wird protokolliert.
            </p>
            <p className="text-xs text-yellow-700 mt-2 font-bold">
              DSGVO-konform: User-Daten nur bei begründetem Verdacht auf Rechtsverstöße einsehen!
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black uppercase">Nachrichten-Statistiken</h3>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-zinc-100 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
          >
            Aktualisieren
          </button>
        </div>
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black">{stats.total_messages}</div>
              <div className="text-xs font-bold uppercase text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-green-600">{stats.active_messages}</div>
              <div className="text-xs font-bold uppercase text-gray-500">Aktiv</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-orange-600">{stats.archived_messages}</div>
              <div className="text-xs font-bold uppercase text-gray-500">Archiviert</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-red-600">{stats.deleted_messages}</div>
              <div className="text-xs font-bold uppercase text-gray-500">Gelöscht</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-blue-600">{stats.estimated_size_mb} MB</div>
              <div className="text-xs font-bold uppercase text-gray-500">Speicher</div>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">
              Messages <span className="text-red-600">Inspector</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1">
              Suche User-Nachrichten für Behördenanfragen
            </p>
          </div>
          <Shield className="text-red-600" size={40} />
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Künstlername oder User-ID eingeben..."
            className="flex-1 p-3 border-2 border-black font-mono text-sm focus:outline-none focus:border-red-600"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-black text-white font-black uppercase hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? 'Suche...' : <><Search size={18} /> Suchen</>}
          </button>
        </div>
      </div>

      {/* Results */}
      {messages.length > 0 && (
        <div className="bg-white border-2 border-black rounded-lg p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black">
            <h2 className="text-2xl font-black uppercase">
              {messages.length} Nachrichten gefunden
            </h2>
            <button
              onClick={exportMessages}
              className="px-4 py-2 bg-green-600 text-white font-bold uppercase text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download size={16} /> CSV Export
            </button>
          </div>

          {/* Messages List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`border-2 p-4 rounded-sm ${
                  msg.deleted_at ? 'border-red-600 bg-red-50' :
                  msg.archived ? 'border-orange-600 bg-orange-50' :
                  'border-gray-300 bg-white'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase px-2 py-0.5 border rounded-sm ${
                      msg.deleted_at ? 'bg-red-600 text-white border-red-600' :
                      msg.archived ? 'bg-orange-600 text-white border-orange-600' :
                      'bg-zinc-100 border-black'
                    }`}>
                      {msg.message_type}
                    </span>
                    {msg.deleted_at && (
                      <span className="text-xs font-bold text-red-600">🗑️ GELÖSCHT</span>
                    )}
                    {msg.archived && !msg.deleted_at && (
                      <span className="text-xs font-bold text-orange-600">📦 ARCHIVIERT</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-gray-500">
                    {new Date(msg.created_at).toLocaleString('de-DE')}
                  </div>
                </div>

                {/* Content */}
                {msg.subject && (
                  <h3 className="text-sm font-black mb-1">{msg.subject}</h3>
                )}
                <p className="text-sm font-medium whitespace-pre-wrap mb-3">
                  {msg.content}
                </p>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-600">
                  <span>Von: {msg.sender_id || 'SYSTEM'}</span>
                  <span>An: {msg.recipient_id}</span>
                  <span>Gelesen: {msg.is_read ? '✅' : '❌'}</span>
                  {msg.deleted_at && (
                    <span className="text-red-600 font-bold">
                      Gelöscht: {new Date(msg.deleted_at).toLocaleString('de-DE')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legal Notice */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300">
            <div className="flex items-start gap-3 text-xs text-gray-600">
              <Eye size={16} className="flex-shrink-0 mt-0.5" />
              <p>
                <strong>Rechtlicher Hinweis:</strong> Diese Daten wurden für eine Behördenanfrage abgerufen. 
                Der Zugriff wurde protokolliert. Gelöschte Nachrichten sind nur für 7 Tage nach Löschung verfügbar.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
