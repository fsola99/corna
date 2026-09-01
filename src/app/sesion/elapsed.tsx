'use client'

import { useEffect, useState } from 'react'

/** Cronómetro desde el arranque. Queda vacío hasta montar para no romper la hidratación. */
export function Elapsed({ since }: { since: string }) {
  const [text, setText] = useState('')

  useEffect(() => {
    const start = new Date(since).getTime()
    const tick = () => {
      const total = Math.max(0, Math.floor((Date.now() - start) / 1000))
      const pad = (n: number) => String(n).padStart(2, '0')
      setText(`${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [since])

  return <span className="tabular-nums">{text || '··:··:··'}</span>
}
