'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import FooterWithModal from '@/components/footer/FooterWithModal'

const SNAKE_LABEL = 'AIVOLUTION MUSIC'
const GRID_SIZE = 20
const DESKTOP_CELL_SIZE = 20
const INITIAL_SPEED = 120

type Dir = 'up' | 'down' | 'left' | 'right'
type Pos = { x: number; y: number }

function getLetterAt(index: number) {
  return SNAKE_LABEL[index % SNAKE_LABEL.length] || '?'
}

function createInitialSnake(): Pos[] {
  const centerY = Math.floor(GRID_SIZE / 2)
  const startX = Math.floor(GRID_SIZE / 2) + 2
  const length = Math.min(SNAKE_LABEL.length, GRID_SIZE - 2)
  return Array.from({ length }, (_, i) => ({ x: startX - i, y: centerY }))
}

export default function LockPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const [cellSize, setCellSize] = useState(DESKTOP_CELL_SIZE)
  const [snake, setSnake] = useState<Pos[]>(createInitialSnake)
  const [food, setFood] = useState<Pos>({ x: 15, y: 10 })
  const [dir, setDir] = useState<Dir>('right')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [showBypass, setShowBypass] = useState(false)
  const [bypassUser, setBypassUser] = useState('')
  const [bypassPassword, setBypassPassword] = useState('')
  const [bypassError, setBypassError] = useState('')
  const [bypassLoading, setBypassLoading] = useState(false)
  const [announcements, setAnnouncements] = useState<Array<{ id: string; content: string; created_at: string }>>([])
  const dirRef = useRef<Dir>(dir)
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const placeFood = useCallback((currentSnake: Pos[]) => {
    let x: number, y: number
    do {
      x = Math.floor(Math.random() * GRID_SIZE)
      y = Math.floor(Math.random() * GRID_SIZE)
    } while (currentSnake.some(s => s.x === x && s.y === y))
    return { x, y }
  }, [])

  const tick = useCallback(() => {
    setSnake(prev => {
      const head = prev[0]
      const next: Pos = { ...head }
      const d = dirRef.current
      if (d === 'up') next.y -= 1
      else if (d === 'down') next.y += 1
      else if (d === 'left') next.x -= 1
      else if (d === 'right') next.x += 1

      if (next.x < 0 || next.x >= GRID_SIZE || next.y < 0 || next.y >= GRID_SIZE) {
        setGameOver(true)
        return prev
      }
      if (prev.some(s => s.x === next.x && s.y === next.y)) {
        setGameOver(true)
        return prev
      }

      const eaten = next.x === food.x && next.y === food.y
      const newSnake = [next, ...prev]
      if (!eaten) newSnake.pop()

      if (eaten) {
        setScore(s => s + 1)
        setFood(placeFood(newSnake))
      }

      return newSnake
    })
  }, [food, placeFood])

  useEffect(() => {
    dirRef.current = dir
  }, [dir])

  useEffect(() => {
    if (gameOver) return
    gameLoopRef.current = setInterval(tick, INITIAL_SPEED)
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [tick, gameOver])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver || showBypass) return
      const d = dirRef.current
      if (e.key === 'ArrowUp' && d !== 'down') setDir('up')
      else if (e.key === 'ArrowDown' && d !== 'up') setDir('down')
      else if (e.key === 'ArrowLeft' && d !== 'right') setDir('left')
      else if (e.key === 'ArrowRight' && d !== 'left') setDir('right')
      e.preventDefault()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameOver])

  useEffect(() => {
    const updateCellSize = () => {
      const width = window.innerWidth
      if (width < 420) {
        setCellSize(14)
      } else if (width < 768) {
        setCellSize(16)
      } else {
        setCellSize(DESKTOP_CELL_SIZE)
      }
    }

    updateCellSize()
    window.addEventListener('resize', updateCellSize)
    return () => window.removeEventListener('resize', updateCellSize)
  }, [])

  useEffect(() => {
    const loadAnnouncements = async () => {
      const { data, error } = await supabase
        .from('lockscreen_announcements')
        .select('id, content, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error && data) {
        setAnnouncements(data as Array<{ id: string; content: string; created_at: string }>)
      }
    }

    void loadAnnouncements()
  }, [supabase])

  async function handleBypass(e: React.FormEvent) {
    e.preventDefault()
    setBypassError('')
    setBypassLoading(true)
    const res = await fetch('/api/auth/lock-bypass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: bypassUser.trim(), password: bypassPassword }),
      redirect: 'follow',
      credentials: 'include',
    })
    setBypassLoading(false)
    if (res.ok) {
      // Nach erfolgreichem Bypass zur Startseite weiterleiten
      // Dies ermöglicht es Admins, Testprofile zu erstellen
      window.location.href = '/'
      return
    }
    const data = await res.json().catch(() => ({}))
    setBypassError(data.error || 'Fehlgeschlagen')
  }

  const w = GRID_SIZE * cellSize
  const h = GRID_SIZE * cellSize

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 gap-6">
      <div className="relative pt-20">
        <Link
          href="/login"
          className="absolute left-1/2 -translate-x-1/2 -top-10 z-20 transition-transform hover:scale-105"
          aria-label="Login"
          title="Login"
        >
          <img
            src="/aivo-robot.png"
            alt="Aivo"
            className="h-16 w-auto sm:h-20 md:h-24 lg:h-28 object-contain drop-shadow-[0_0_18px_rgba(220,38,38,0.45)] animate-[pulse_3s_ease-in-out_infinite]"
          />
        </Link>
        <h1 className="text-white text-2xl md:text-4xl font-black italic uppercase tracking-tight">
          Aivolution<span className="text-red-600">Music</span>
        </h1>
      </div>
      <h2 className="text-white/60 text-sm font-mono uppercase tracking-[0.3em]">
        BETA · DEMNÄCHST LIVE
      </h2>

      <div className="relative">
        {/* Spielfeld-Rahmen */}
        <div
          className="relative rounded-[2.5rem] border-4 border-white p-2"
          style={{ width: w + 16, height: h + 16 }}
        >
          <canvas
            ref={canvasRef}
            width={w}
            height={h}
            className="bg-black rounded-[1.5rem]"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-[2.5rem]">
            <div className="text-center">
              <p className="text-red-500 font-black text-xl uppercase mb-2">Game Over</p>
              <p className="text-white/80 text-sm">Score: {score}</p>
              <button
                type="button"
                onClick={() => {
                  setSnake(createInitialSnake())
                  setFood({ x: 15, y: 10 })
                  setDir('right')
                  setScore(0)
                  setGameOver(false)
                }}
                className="mt-4 px-6 py-2 border-2 border-white text-white hover:bg-white hover:text-black transition-colors rounded-[2.5rem] text-sm font-bold uppercase"
              >
                Nochmal
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-white/40 text-xs font-mono max-w-sm text-center">
        Nutze die Pfeiltasten. Die Schlange zeigt &quot;Aivolution Music&quot;.
      </p>

      {announcements.length > 0 && (
        <div className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-2xl p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">
            Meldungen zur Sperrseite
          </h3>
          <div className="space-y-2">
            {announcements.map((item) => (
              <div key={item.id} className="border-l-2 border-red-600 pl-3 py-1">
                <p className="text-[10px] font-mono text-white/50">
                  {new Date(item.created_at).toLocaleString('de-DE')}
                </p>
                <p className="text-sm text-white/90">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snake zeichnen */}
      <SnakeCanvas
        canvasRef={canvasRef}
        snake={snake}
        food={food}
        gameOver={gameOver}
      />

      <div className="pt-1 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setShowBypass((v) => !v)}
          className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          {showBypass ? 'Sperre umgehen ausblenden' : 'Sperre umgehen'}
        </button>
        {showBypass && (
          <form
            onSubmit={handleBypass}
            className="w-full max-w-sm bg-black border border-white/30 rounded-[1.5rem] p-4 space-y-3"
          >
            <p className="text-[10px] text-white/60 uppercase text-center">
              Anmeldename + Passwort (aus .env) → Sperre deaktivieren
            </p>
            <input
              type="text"
              value={bypassUser}
              onChange={(e) => setBypassUser(e.target.value)}
              placeholder="Anmeldename"
              className="w-full p-2 bg-black border border-white/50 text-white rounded-lg text-sm focus:outline-none focus:border-red-500"
              required
            />
            <input
              type="password"
              value={bypassPassword}
              onChange={(e) => setBypassPassword(e.target.value)}
              placeholder="Passwort"
              className="w-full p-2 bg-black border border-white/50 text-white rounded-lg text-sm focus:outline-none focus:border-red-500"
              required
            />
            {bypassError && <p className="text-red-500 text-xs text-center">{bypassError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowBypass(false)} className="flex-1 py-2 border border-white/50 rounded-lg text-xs uppercase text-white/80">
                Abbrechen
              </button>
              <button type="submit" disabled={bypassLoading} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs uppercase font-bold disabled:opacity-50">
                {bypassLoading ? '...' : 'Sperre deaktivieren'}
              </button>
            </div>
          </form>
        )}
        <Link
          href="/api/auth/lock-bypass-clear"
          className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-red-500 transition-colors"
        >
          Sperre wieder aktivieren (Cookie löschen)
        </Link>
        <footer className="pt-2 border-t border-white/20 w-full max-w-xs">
          <FooterWithModal variant="lock" />
        </footer>
      </div>
    </div>
  )
}

function SnakeCanvas({
  canvasRef,
  snake,
  food,
  gameOver,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  snake: Pos[]
  food: Pos
  gameOver: boolean
}) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const cellW = w / GRID_SIZE
    const cellH = h / GRID_SIZE

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)

    if (gameOver) return

    snake.forEach((seg, i) => {
      const x = seg.x * cellW
      const y = seg.y * cellH
      if (i === 0) {
        ctx.fillStyle = '#dc2626'
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2)
      } else {
        ctx.fillStyle = '#fff'
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4)
        ctx.font = `${Math.min(cellW, cellH) - 4}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#000'
        const letter = getLetterAt(i - 1)
        ctx.fillText(letter, x + cellW / 2, y + cellH / 2)
      }
    })

    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.arc(
      food.x * cellW + cellW / 2,
      food.y * cellH + cellH / 2,
      cellW / 2 - 2,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }, [snake, food, gameOver, canvasRef])

  return null
}
