import { useState, useEffect } from 'react'

export default function SplitFlapTile({ value, label, danger = false, delay = 0 }) {
  const [flipped, setFlipped] = useState(false)

  const isDanger = danger && value > 0
  const formatted = String(value).padStart(2, '0')

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  const tileBg = isDanger ? 'bg-red-950' : 'bg-gray-900'
  const labelColor = isDanger ? 'text-red-500' : 'text-amber-600'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`text-[10px] font-mono font-semibold uppercase tracking-widest ${labelColor}`}
      >
        {label}
      </span>
      <div className="w-14 h-16" style={{ perspective: '200px' }}>
        <div className={`relative w-full h-full ${tileBg} rounded-lg overflow-hidden`}>
          {/* Static bottom half (new value) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-2xl font-bold text-white">
              {flipped ? formatted : '00'}
            </span>
          </div>

          {/* Hairline through the middle */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-black/30 z-20" />

          {/* Top half flap */}
          <div
            className={`absolute inset-x-0 top-0 h-1/2 ${tileBg} overflow-hidden z-10`}
            style={{
              transformOrigin: 'bottom',
              transform: flipped ? 'rotateX(-90deg)' : 'rotateX(0deg)',
              transition: 'transform 0.4s ease-in',
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="w-full h-[200%] flex items-center justify-center">
              <span className="font-mono text-2xl font-bold text-white">00</span>
            </div>
          </div>

          {/* Bottom half flap (reveals new value) */}
          <div
            className={`absolute inset-x-0 bottom-0 h-1/2 ${tileBg} overflow-hidden z-10`}
            style={{
              transformOrigin: 'top',
              transform: flipped ? 'rotateX(0deg)' : 'rotateX(90deg)',
              transition: `transform 0.4s ease-out ${flipped ? '0.2s' : '0s'}`,
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="w-full h-[200%] flex items-end justify-center">
              <span className="font-mono text-2xl font-bold text-white">{formatted}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
