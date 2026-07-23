import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createRef, useRef } from 'react'
import KlayJourney from '../components/klay/KlayJourney'

afterEach(cleanup)

const SCENES = ['converse', 'last-move', 'connect']

function Harness({ journey }) {
  const containerRef = useRef(null)
  const stationRefs = useRef([createRef(), createRef(), createRef()]).current
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {stationRefs.map((ref, i) => (
        <div key={i} ref={ref} />
      ))}
      <KlayJourney
        journey={journey}
        containerRef={containerRef}
        stationRefs={stationRefs}
        scenes={SCENES}
        label="Klay demonstrating Kolumn Pro features"
      />
    </div>
  )
}

describe('KlayJourney', () => {
  it('renders an accessible Klay sprite while performing', () => {
    render(<Harness journey={{ station: 0, phase: 'perform', reduced: false }} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
  })

  it('renders while traveling (walk phase)', () => {
    render(<Harness journey={{ station: 1, phase: 'travel', reduced: false }} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
  })

  it('renders when reduced motion parks the journey', () => {
    render(<Harness journey={{ station: 0, phase: 'perform', reduced: true }} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
  })
})
