import { useState, useEffect } from 'react'

export function TVClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="text-right">
      <p className="text-3xl font-bold text-white tabular-nums leading-none">{time}</p>
      <p className="text-xs text-white/40 mt-1 capitalize">{date}</p>
    </div>
  )
}
