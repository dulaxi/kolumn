import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'

// Accordion item for the FAQ section. All items start collapsed; each
// owns its own open/closed state so multiple can be expanded at once.
// Animation uses the CSS Grid 0fr→1fr trick on the content row so the
// transition runs against the content's natural height — no JS height
// measurement, no library, just one transition rule.
export default function FaqItem({ question, answer, index }) {
  const [open, setOpen] = useState(false)
  const panelId = `faq-panel-${index}`
  const headerId = `faq-header-${index}`
  return (
    <div>
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-2.5 text-left group cursor-pointer"
      >
        <h3 className="text-base font-normal text-[var(--text-primary)] tracking-tight leading-snug">
          {question}
        </h3>
        <span
          aria-hidden="true"
          className={`shrink-0 w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
        >
          <Plus size={18} weight="light" />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-3 pr-10 text-sm font-light text-[var(--text-secondary)] leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}
