import { useEffect, useState } from 'react'
import { ANIMATIONS, PALETTE, COARSE_COLS, COARSE_ROWS } from './klayAnimations'

/**
 * PixelKlay — plays a Klay animation as crisp SVG pixel frames.
 *
 *   <PixelKlay animation="tap" scale={8} />
 *
 * `animation`: key of ANIMATIONS (idle, blink, look, tap, walk, hop, grow,
 *   wilt, sleep, delight, sit, deliver, …). Unknown keys fall back to idle.
 * `scale`: size of one coarse Klay pixel in px (fine prop pixels are half).
 * `label`: accessible name; the sprite itself is presentational.
 */
export default function PixelKlay({ animation = 'idle', scale = 8, label = 'Klay', className = '' }) {
  const frames = ANIMATIONS[animation] || ANIMATIONS.idle
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(0)
  }, [animation])

  useEffect(() => {
    const timer = setTimeout(() => setIdx((i) => (i + 1) % frames.length), frames[idx].ms)
    return () => clearTimeout(timer)
  }, [idx, frames])

  const { map, hi } = frames[idx] || frames[0]
  const half = scale / 2
  const rects = []
  map.forEach((row, y) => {
    ;[...row].slice(0, COARSE_COLS).forEach((ch, x) => {
      const fill = PALETTE[ch]
      if (fill) rects.push(<rect key={`c${x}-${y}`} x={x * scale} y={y * scale} width={scale} height={scale} fill={fill} />)
    })
  })
  if (hi) {
    for (const yStr in hi) {
      const y = +yStr
      ;[...hi[yStr]].slice(0, COARSE_COLS * 2).forEach((ch, x) => {
        const fill = PALETTE[ch]
        if (fill) rects.push(<rect key={`f${x}-${y}`} x={x * half} y={y * half} width={half} height={half} fill={fill} />)
      })
    }
  }

  return (
    <svg
      role="img"
      aria-label={label}
      className={className}
      width={COARSE_COLS * scale}
      height={COARSE_ROWS * scale}
      style={{ shapeRendering: 'crispEdges', display: 'block' }}
    >
      {rects}
    </svg>
  )
}
