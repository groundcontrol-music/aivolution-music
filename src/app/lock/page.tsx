'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
  const [cellSize, setCellSize] = useState(DESKTOP_CELL_SIZE)
  const [snake, setSnake] = useState<Pos[]>(createInitialSnake)
  const [food, setFood] = useState<Pos>({ x: 15, y: 10 })
  const [dir, setDir] = useState<Dir>('right')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
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
      if (gameOver || showLogin) return
      const d = dirRef.current
      if (e.key === 'ArrowUp' && d !== 'down') setDir('up')
      else if (e.key === 'ArrowDown' && d !== 'up') setDir('down')
      else if (e.key === 'ArrowLeft' && d !== 'right') setDir('left')
      else if (e.key === 'ArrowRight' && d !== 'left') setDir('right')
      e.preventDefault()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameOver, showLogin])

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
    })
    const data = await res.json().catch(() => ({}))
    setLoginLoading(false)
    if (res.ok && data.redirect) {
      window.location.href = data.redirect
      return
    }
    setLoginError(data.error || 'Login fehlgeschlagen')
  }

  const w = GRID_SIZE * cellSize
  const h = GRID_SIZE * cellSize

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 gap-6">
      <div className="relative pt-20">
        <button
          type="button"
          onClick={() => setShowLogin(true)}
          className="absolute left-1/2 -translate-x-1/2 -top-10 z-20 transition-transform hover:scale-105"
          aria-label="Aivo Login"
          title="Aivo"
        >
          <img
            src="/aivo-robot.png"
            alt="Aivo"
            className="h-16 w-auto sm:h-20 md:h-24 lg:h-28 object-contain drop-shadow-[0_0_18px_rgba(220,38,38,0.45)] animate-[pulse_3s_ease-in-out_infinite]"
          />
        </button>
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

      {/* Snake zeichnen */}
      <SnakeCanvas
        canvasRef={canvasRef}
        snake={snake}
        food={food}
        gameOver={gameOver}
      />

      {/* Secret Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLogin(false)}
        >
          <form
            onSubmit={handleLogin}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-black border-2 border-red-600 rounded-[2.5rem] p-8 space-y-4"
          >
            <h2 className="text-red-500 font-black text-lg uppercase text-center">
              Secret Login
            </h2>
            <div>
              <label className="block text-[10px] text-white/60 uppercase mb-1">
                Künstlername oder Email
              </label>
              <input
                type="text"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full p-3 bg-black border-2 border-white text-white rounded-xl focus:outline-none focus:border-red-600"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/60 uppercase mb-1">
                Passwort
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full p-3 bg-black border-2 border-white text-white rounded-xl focus:outline-none focus:border-red-600"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="flex-1 py-3 border-2 border-white/50 text-white/80 rounded-[2.5rem] text-sm font-bold uppercase hover:bg-white/10"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loginLoading}
                className="flex-1 py-3 bg-red-600 text-white rounded-[2.5rem] text-sm font-bold uppercase hover:bg-red-500 disabled:opacity-50"
              >
                {loginLoading ? '...' : 'Einloggen'}
              </button>
            </div>
          </form>
        </div>
      )}
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
