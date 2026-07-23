import { PALETTE, COARSE_COLS, COARSE_ROWS } from './klayAnimations'

/**
 * KlayStatic — renders a sparse fine-grid prop layer (the `hi` shape from
 * klayAnimations frames) as a still SVG on the same canvas PixelKlay uses,
 * so static props line up exactly with where animated scenes draw them.
 * Decorative by definition: a station's resting props while Klay is away.
 */
export default function KlayStatic({ hi, scale = 8, className = '' }) {
  const half = scale / 2
  const rects = []
  for (const yStr in hi) {
    const y = +yStr
    ;[...hi[yStr]].slice(0, COARSE_COLS * 2).forEach((ch, x) => {
      const fill = PALETTE[ch]
      if (fill) rects.push(<rect key={`f${x}-${y}`} x={x * half} y={y * half} width={half} height={half} fill={fill} />)
    })
  }
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={COARSE_COLS * scale}
      height={COARSE_ROWS * scale}
      style={{ shapeRendering: 'crispEdges', display: 'block' }}
    >
      {rects}
    </svg>
  )
}
