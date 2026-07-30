// The Kolumn logo mark: Klay's sprout, sprite-exact — rows y1–y3 of the
// BASE pose in klayAnimations.js. Lime tip + leaf row on an olive stem px.
// Shared by every brand surface (sidebar, reload shell, auth pages, landing,
// typing indicator) so they can't drift apart.
// Colors are the sprite's fixed palette: like PixelKlay, the mark renders
// the same hexes in both themes. Mauve stays Klay's alone — never here.
export default function KolumnLogo({ size = 30, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 3 3"
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect x="1" y="0" width="1" height="1" fill="#C2D64A" />
      <rect x="0" y="1" width="3" height="1" fill="#C2D64A" />
      <rect x="1" y="2" width="1" height="1" fill="#8BA32E" />
    </svg>
  )
}
