'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Flag, Trash2, Edit2, Send } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface ForumPost {
  id: string
  author_id: string
  content: string
  created_at: string
  is_edited: boolean
  author?: {
    artist_name: string
    avatar_url?: string
  }
}

export default function CreatorMiniForum({ creatorId, isCreatorOwner }: { creatorId: string, isCreatorOwner: boolean }) {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchPosts()
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('creator_forum_posts')
      .select(`
        id,
        author_id,
        content,
        created_at,
        is_edited,
        profiles!creator_forum_posts_author_id_fkey (artist_name, avatar_url)
      `)
      .eq('creator_id', creatorId)
      .eq('is_deleted', false)
      .is('parent_id', null) // Nur Top-Level Posts (keine Replies)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setPosts(data.map((p: any) => ({
        ...p,
        author: p.profiles
      })))
    }
  }

  const handleSubmit = async () => {
    if (!newPost.trim()) return
    if (!user) {
      alert('Bitte logge dich ein!')
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('creator_forum_posts')
        .insert({
          creator_id: creatorId,
          author_id: user.id,
          content: newPost.trim()
        })

      if (error) throw error

      setNewPost('')
      fetchPosts()
    } catch (error: any) {
      console.error('Post Error:', error)
      alert('Fehler beim Posten.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Wirklich löschen?')) return

    const { error } = await supabase
      .from('creator_forum_posts')
      .update({ is_deleted: true })
      .eq('id', postId)

    if (!error) fetchPosts()
  }

  const handleReport = async (postId: string) => {
    if (!user) {
      alert('Bitte logge dich ein!')
      return
    }

    const reason = prompt('Grund der Meldung (optional):')
    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_content_type: 'creator_forum_post',
        reported_content_id: postId,
        reason: reason || null
      })

    if (!error) {
      alert('✓ Gemeldet! Danke für dein Feedback.')
    } else {
      alert('Fehler beim Melden.')
    }
  }

  return (
    <section className="bg-white border-2 border-black rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-3">
        <MessageCircle className="text-red-600" size={28} />
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">
          Community <span className="text-red-600">Board</span>
        </h2>
        <span className="text-xs font-bold uppercase opacity-40 ml-auto">{posts.length} Beiträge</span>
      </div>

      {/* New Post Form */}
      {user && (
        <div className="mb-6 bg-zinc-50 border border-black rounded-sm p-4">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Schreibe einen Kommentar..."
            className="w-full p-3 border-2 border-black rounded-sm font-medium focus:border-red-600 outline-none resize-none"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !newPost.trim()}
            className="mt-2 bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={14} />
            {loading ? 'Laden...' : 'Absenden'}
          </button>
        </div>
      )}

      {!user && (
        <div className="mb-6 bg-zinc-100 border border-dashed border-zinc-300 rounded-sm p-4 text-center">
          <p className="text-sm font-medium text-zinc-600">
            Bitte <a href="/login" className="text-red-600 font-bold underline">logge dich ein</a>, um zu kommentieren.
          </p>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="border-l-4 border-red-600 pl-4 py-2">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-zinc-200 rounded-full border border-black flex-shrink-0 overflow-hidden">
                  {post.author?.avatar_url ? (
                    <img src={post.author.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-500">
                      {post.author?.artist_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-sm uppercase">{post.author?.artist_name || 'User'}</span>
                    <span className="text-[10px] font-mono opacity-50">
                      {new Date(post.created_at).toLocaleString('de-DE', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {post.is_edited && <span className="text-[9px] italic opacity-40">(bearbeitet)</span>}
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{post.content}</p>

                  {/* Actions */}
                  <div className="flex gap-3 mt-2">
                    {(isCreatorOwner || user?.id === post.author_id) && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-[10px] font-bold uppercase text-red-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Löschen
                      </button>
                    )}
                    {user && user.id !== post.author_id && (
                      <button
                        onClick={() => handleReport(post.id)}
                        className="text-[10px] font-bold uppercase text-zinc-500 hover:text-black flex items-center gap-1"
                      >
                        <Flag size={10} /> Melden
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-sm font-medium text-zinc-400">
            Noch keine Beiträge. Sei der Erste!
          </div>
        )}
      </div>
    </section>
  )
}
