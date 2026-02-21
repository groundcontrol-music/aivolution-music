'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Topic = {
  id: string
  title: string
  description: string | null
}

type Post = {
  id: string
  content: string
  created_at: string
  author_id: string
  author_name?: string
}

const EMOJIS = ['😀', '🔥', '🎧', '💬', '❤️', '🤝']

export default function SecretLoungeClient({
  creatorId,
  creatorName,
  isAdmin,
}: {
  creatorId: string
  creatorName: string
  isAdmin: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [setupMissing, setSetupMissing] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)
  const [canModerate, setCanModerate] = useState(false)
  const [accessReason, setAccessReason] = useState<string>('none')
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicDescription, setNewTopicDescription] = useState('')
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id ?? null)
      await loadAccess(data.user?.id ?? null)
      await loadTopics()
    })()
  }, [supabase])

  useEffect(() => {
    if (!selectedTopicId) {
      setPosts([])
      return
    }
    void loadPosts(selectedTopicId)
  }, [selectedTopicId])

  async function loadAccess(uid: string | null) {
    if (!uid) {
      setAccessGranted(false)
      setCanModerate(false)
      setAccessReason('none')
      return
    }
    try {
      const access = await supabase.rpc('get_secret_lounge_access_status', { p_creator_id: creatorId })
      if (access.error) throw access.error
      const row = access.data?.[0]
      setAccessGranted(Boolean(row?.access_granted))
      setCanModerate(Boolean(row?.can_moderate || isAdmin))
      setAccessReason(row?.access_reason || 'none')
    } catch {
      setSetupMissing(true)
      setAccessGranted(false)
      setCanModerate(false)
      setAccessReason('none')
    }
  }

  async function loadTopics() {
    try {
      const { data, error } = await supabase
        .from('creator_lounge_topics')
        .select('id,title,description')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(3)

      if (error) throw error
      const topicRows = (data || []) as Topic[]
      setTopics(topicRows)
      if (topicRows.length > 0) {
        setSelectedTopicId(topicRows[0].id)
      }
    } catch {
      setSetupMissing(true)
    }
  }

  async function loadPosts(topicId: string) {
    try {
      const { data, error } = await supabase
        .from('creator_lounge_posts')
        .select('id,content,created_at,author_id,author_name')
        .eq('topic_id', topicId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) throw error
      setPosts((data || []) as Post[])
    } catch {
      setSetupMissing(true)
    }
  }

  async function createTopic() {
    if (!canModerate) return
    if (!newTopicTitle.trim()) return
    if (topics.length >= 3) {
      alert('Maximal 3 Themen erlaubt.')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('creator_lounge_topics').insert({
      creator_id: creatorId,
      title: newTopicTitle.trim(),
      description: newTopicDescription.trim() || null,
      created_by: userId,
      is_active: true,
    })
    setLoading(false)
    if (error) {
      alert(`Thema konnte nicht erstellt werden: ${error.message}`)
      return
    }
    setNewTopicTitle('')
    setNewTopicDescription('')
    await loadTopics()
  }

  async function sendPost() {
    if (!accessGranted) return
    if (!selectedTopicId) return
    if (!newPost.trim()) return
    setLoading(true)
    const { error } = await supabase.from('creator_lounge_posts').insert({
      creator_id: creatorId,
      topic_id: selectedTopicId,
      author_id: userId,
      content: newPost.trim(),
      author_name: null,
    })
    setLoading(false)
    if (error) {
      alert(`Nachricht konnte nicht gesendet werden: ${error.message}`)
      return
    }
    setNewPost('')
    await loadPosts(selectedTopicId)
  }

  async function deletePost(postId: string) {
    if (!confirm('Beitrag wirklich löschen?')) return
    const { error } = await supabase
      .from('creator_lounge_posts')
      .update({ is_deleted: true })
      .eq('id', postId)
    if (error) {
      alert(`Löschen fehlgeschlagen: ${error.message}`)
      return
    }
    if (selectedTopicId) await loadPosts(selectedTopicId)
  }

  if (setupMissing) {
    return (
      <div className="bg-white border-2 border-black rounded-[2.5rem] p-6">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-3">Secret Lounge</h2>
        <p className="text-sm">
          Secret Lounge ist im Code vorbereitet. Führe zuerst die SQL-Datei
          <span className="font-mono"> supabase_secret_lounge_v1.sql </span>
          im Supabase SQL Editor aus.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black rounded-[2.5rem] p-6">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2">
          🔒 Secret Lounge · {creatorName}
        </h1>
        <p className="text-xs uppercase tracking-wider text-zinc-600">
          18+ Bereich · Checkbox reicht nicht · Zugang nur mit Verifikation (Kauf / Identität / Compliance)
        </p>
      </div>

      {!accessGranted && (
        <div className="bg-zinc-100 border-2 border-black rounded-[2rem] p-6">
          <h2 className="text-xl font-black uppercase mb-3">Zugang gesperrt</h2>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Checkbox „18+“ allein reicht nicht.</li>
            <li>Kauf-Verifikation oder Identitäts-Verifikation nötig.</li>
            <li>Auch Creator/Owner brauchen eine zusätzliche Verifikation.</li>
          </ul>
          <p className="text-xs mt-3 opacity-70">Aktueller Status: {accessReason}</p>
        </div>
      )}

      {accessGranted && (
        <>
          <div className="bg-white border-2 border-black rounded-[2rem] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase">Themen ({topics.length}/3)</h2>
              <span className="text-xs uppercase opacity-60">
                {canModerate ? 'Moderation aktiv' : 'Schreibmodus'}
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`text-left border-2 rounded-2xl p-3 transition-colors ${
                    selectedTopicId === topic.id
                      ? 'border-red-600 bg-red-50'
                      : 'border-black bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <p className="font-black uppercase text-sm">{topic.title}</p>
                  <p className="text-xs opacity-70 line-clamp-2">{topic.description || 'Kein Untertitel'}</p>
                </button>
              ))}
            </div>

            {canModerate && topics.length < 3 && (
              <div className="mt-5 border-2 border-dashed border-black rounded-2xl p-4 space-y-2">
                <p className="text-xs uppercase font-bold">Neues Thema erstellen (max. 3)</p>
                <input
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Thementitel"
                  className="w-full border-2 border-black rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  placeholder="Kurzbeschreibung"
                  className="w-full border-2 border-black rounded-xl px-3 py-2 text-sm"
                />
                <button
                  onClick={createTopic}
                  disabled={loading}
                  className="px-4 py-2 bg-black text-white rounded-full text-xs font-black uppercase hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  Thema anlegen
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-black rounded-[2rem] p-6">
            <h3 className="text-lg font-black uppercase mb-4">Beiträge</h3>
            {selectedTopicId ? (
              <>
                <div className="space-y-3 mb-4 max-h-[420px] overflow-y-auto pr-1">
                  {posts.length === 0 && (
                    <p className="text-sm opacity-60">Noch keine Beiträge in diesem Thema.</p>
                  )}
                  {posts.map((post) => (
                    <div key={post.id} className="border-l-4 border-red-600 pl-3 py-2 bg-zinc-50 rounded-r-xl">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase font-bold opacity-70">
                          {post.author_name || 'User'} · {new Date(post.created_at).toLocaleString('de-DE')}
                        </p>
                        {(canModerate || post.author_id === userId) && (
                          <button
                            onClick={() => deletePost(post.id)}
                            className="text-[10px] uppercase font-bold text-red-600 hover:underline"
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed mt-1">{post.content}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Schreibe deine Nachricht…"
                    rows={3}
                    className="w-full border-2 border-black rounded-2xl px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewPost((v) => `${v}${emoji}`)}
                        className="w-8 h-8 border border-black rounded-full bg-white hover:bg-zinc-100"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={sendPost}
                      disabled={loading || !newPost.trim()}
                      className="ml-auto px-4 py-2 bg-black text-white rounded-full text-xs font-black uppercase hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      Senden
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm opacity-60">Noch kein Thema vorhanden.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
