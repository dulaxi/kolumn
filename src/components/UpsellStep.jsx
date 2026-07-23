import { createRef, useRef } from 'react'
import { addDays, format } from 'date-fns'
import Button from './ui/Button'
import KlayStatic from './klay/KlayStatic'
import KlayJourney from './klay/KlayJourney'
import useKlayJourney from './klay/useKlayJourney'
import { UPSELL_REST_PROPS, COARSE_COLS, COARSE_ROWS } from './klay/klayAnimations'

const KLAY_SCALE = 7
const KLAY_W = COARSE_COLS * KLAY_SCALE
const KLAY_H = COARSE_ROWS * KLAY_SCALE

const FEATURES = [
  {
    tag: 'For thinking',
    title: 'Chat with your boards',
    body: 'Plan sprints, draft cards, break goals into checklists.',
    rest: UPSELL_REST_PROPS.chat,
  },
  {
    tag: 'For complex work',
    title: 'Agentic moves',
    body: 'Move, complete, and update columns in one sentence.',
    rest: UPSELL_REST_PROPS.agentic,
  },
  {
    tag: 'For your stack',
    comingSoon: true,
    title: 'Connect your tools',
    body: 'Google Calendar, Slack, Notion, and your code.',
    rest: UPSELL_REST_PROPS.tools,
  },
]

const SCENES = ['converse', 'tick-sweep', 'handshake']

/**
 * The onboarding Pro upsell. One Klay walks a continuous floor across the
 * three feature cards (KlayJourney), performing each card's scene; vacated
 * cards show their resting props (KlayStatic). Reduced motion parks him at
 * the first card, static.
 */
export default function UpsellStep({ onTryPro, onSkip }) {
  const trialEnd = format(addDays(new Date(), 7), 'MMMM d')
  const journey = useKlayJourney(FEATURES.length)
  const containerRef = useRef(null)
  const stationRefs = useRef(FEATURES.map(() => createRef())).current
  // Klay stands at a station only while performing there — during travel
  // every card shows its resting props (his walk carries no props).
  const klayAt = journey.phase === 'perform' ? journey.station : null

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-9 px-4 py-10">
      <header className="flex flex-col gap-2 text-center max-w-2xl">
        <h1 className="text-[32px] font-[425] text-[var(--text-primary)] font-logo leading-[1.15] tracking-tight">
          Get more out of Kolumn with Pro
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          AI on every board, automations, and your tools — connected.
        </p>
      </header>

      <div ref={containerRef} className="relative w-full max-w-[900px]">
        <ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-sand)] border border-[var(--color-sand)] bg-[var(--surface-card)] rounded-3xl overflow-hidden shadow-sm list-none p-0 m-0"
        >
          {FEATURES.map((f, i) => {
            const active = klayAt === i
            return (
              <li key={f.title} className="flex flex-col overflow-hidden">
                <div className="flex flex-col p-6 pb-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-xs font-medium border transition-colors duration-500 ${
                        active
                          ? 'border-[var(--accent-lime)]/40 bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                          : 'border-[var(--color-sand)] bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {f.tag}
                    </span>
                    {f.comingSoon && (
                      <span className="inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border border-[var(--color-sand)] text-[var(--text-muted)]">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h2 className="text-[var(--text-primary)] mt-4 text-base font-semibold">{f.title}</h2>
                  <p className="text-[var(--text-secondary)] mt-2 text-sm leading-normal">{f.body}</p>
                </div>
                <div
                  className={`relative h-[170px] w-full overflow-hidden mt-2 transition-opacity duration-500 ${
                    active ? 'opacity-100' : 'opacity-70'
                  }`}
                  aria-hidden="true"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle, color-mix(in srgb, var(--text-primary) 12%, transparent) 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to bottom, var(--surface-card) 0%, transparent 40%)',
                    }}
                  />
                  <div
                    ref={stationRefs[i]}
                    data-klay-station={i}
                    className="absolute left-1/2 bottom-3 -translate-x-1/2"
                    style={{ width: KLAY_W, height: KLAY_H }}
                  >
                    <KlayStatic
                      hi={f.rest}
                      scale={KLAY_SCALE}
                      className={`transition-opacity duration-500 ${active ? 'opacity-0' : 'opacity-100'}`}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <KlayJourney
          journey={journey}
          containerRef={containerRef}
          stationRefs={stationRefs}
          scenes={SCENES}
          scale={KLAY_SCALE}
          label="Klay demonstrating Kolumn Pro features"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[450px] flex-col items-center gap-3">
        <Button type="button" size="xl" onClick={onTryPro} className="w-full">
          Get Pro free for 1 week
        </Button>
        <p className="text-xs text-[var(--text-muted)]">Free until {trialEnd}. Cancel anytime.</p>
        <Button type="button" variant="ghost" size="xl" onClick={onSkip} className="w-full">
          Skip
        </Button>
      </div>
    </div>
  )
}
