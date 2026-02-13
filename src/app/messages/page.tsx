'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { MessageSquare, Mail, Globe, Settings, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  message_type: 'system' | 'private' | 'forum' | 'global' | 'application'
  subject?: string
  content: string
  sender_id?: string
  is_read: boolean
  created_at: string
  status?: 'approved' | 'rejected' | null
  related_slug?: string | null // Link zum Creator-Profil
  sender?: {
    artist_name: string
  }
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<'all' | 'system' | 'private' | 'forum' | 'global'>('all')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchMessages()
  }, [filter])

  const fetchMessages = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_sender_id_fkey (artist_name)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('message_type', filter)
    }

    const { data, error } = await query

    if (!error && data) {
      setMessages(data.map((m: any) => ({
        ...m,
        sender: m.profiles
      })))
    }
    setLoading(false)
  }

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
    
    fetchMessages()
    router.refresh() // Update header badge
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Nachricht löschen?')) return

    await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)

    setSelectedMessage(null)
    fetchMessages()
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return <Settings className="text-red-600" size={16} />
      case 'application': return <Settings className="text-orange-600" size={16} />
      case 'private': return <Mail className="text-blue-600" size={16} />
      case 'forum': return <MessageSquare className="text-green-600" size={16} />
      case 'global': return <Globe className="text-purple-600" size={16} />
      default: return <Mail size={16} />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'system': return 'System'
      case 'application': return 'Bewerbung'
      case 'private': return 'Privat'
      case 'forum': return 'Forum'
      case 'global': return 'Global'
      default: return type
    }
  }

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white border-2 border-black rounded-lg p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                Nach<span className="text-red-600">richten</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1">
                {unreadCount} ungelesen
              </p>
            </div>
            <MessageSquare className="text-red-600" size={48} />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'system', 'private', 'forum', 'global'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              className={`px-4 py-2 text-xs font-bold uppercase border-2 rounded-sm transition-all whitespace-nowrap ${
                filter === type
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-black hover:bg-zinc-100'
              }`}
            >
              {type === 'all' ? 'Alle' : getTypeLabel(type)}
              {type === 'all' && ` (${messages.length})`}
            </button>
          ))}
        </div>

        {/* Messages Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Message List */}
          <div className="md:col-span-1 space-y-3">
            {loading ? (
              <div className="text-center py-12 text-sm font-medium text-zinc-400">Laden...</div>
            ) : messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg)
                    if (!msg.is_read) markAsRead(msg.id)
                  }}
                  className={`bg-white border-2 border-black rounded-sm p-4 cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    !msg.is_read ? 'bg-yellow-50 border-yellow-600' : ''
                  } ${selectedMessage?.id === msg.id ? 'ring-2 ring-red-600' : ''}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {getTypeIcon(msg.message_type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black uppercase truncate">
                        {msg.sender?.artist_name || getTypeLabel(msg.message_type)}
                      </div>
                      <div className="text-[10px] font-mono opacity-50">
                        {new Date(msg.created_at).toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    {!msg.is_read && (
                      <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-medium line-clamp-2">{msg.subject || msg.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm font-medium text-zinc-400">
                Keine Nachrichten
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="md:col-span-2">
            {selectedMessage ? (
              <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start justify-between mb-4 border-b-2 border-black pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeIcon(selectedMessage.message_type)}
                      <span className="text-xs font-black uppercase px-2 py-0.5 bg-zinc-100 border border-black rounded-sm">
                        {getTypeLabel(selectedMessage.message_type)}
                      </span>
                    </div>
                    {selectedMessage.subject && (
                      <h2 className="text-2xl font-black uppercase italic tracking-tight mb-1">
                        {selectedMessage.subject}
                      </h2>
                    )}
                    <div className="text-xs font-mono opacity-50">
                      Von: {selectedMessage.sender?.artist_name || 'System'} •{' '}
                      {new Date(selectedMessage.created_at).toLocaleString('de-DE')}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="p-2 border-2 border-black hover:bg-red-600 hover:text-white transition-colors rounded-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.content}
                  </p>

                  {/* Link zum Creator-Profil (bei Bewerbungen) */}
                  {selectedMessage.related_slug && (
                    <div className="mt-6 pt-4 border-t-2 border-black">
                      <a
                        href={`/creator/${selectedMessage.related_slug}`}
                        className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 font-black uppercase text-sm hover:bg-red-600 transition-colors rounded-sm"
                      >
                        🎸 Profil ansehen
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-lg p-12 text-center h-full flex items-center justify-center">
                <div>
                  <MessageSquare className="mx-auto mb-4 text-zinc-400" size={48} />
                  <p className="text-sm font-bold uppercase text-zinc-500">
                    Wähle eine Nachricht aus
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
