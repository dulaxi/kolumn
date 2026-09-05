import TutorialCard from '../../components/tutorials/TutorialCard'
import { TUTORIAL_TOPICS, tutorialsByTopic } from '../../content/tutorials'

// /tutorials — the hub. Spec: docs/superpowers/specs/marketing/tutorials.md §3.
// Grouped by "what you're doing" (the AI, working together, getting around)
// rather than by product, since Kolumn has one product. Static: no auth.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

export default function TutorialsPage() {
  return (
    <>
      <section className={`${SECTION} pt-16 pb-12`}>
        <h1 className="font-heading font-[425] text-4xl text-[var(--text-primary)] tracking-tight mb-4">Tutorials</h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          Short guides to the parts of Kolumn worth learning on purpose. Most take under ten minutes. Each one ends
          with something on your board.
        </p>
      </section>

      {TUTORIAL_TOPICS.map((topic) => {
        const items = tutorialsByTopic(topic.id)
        if (items.length === 0) return null
        return (
          <section key={topic.id} className={`${SECTION} pb-12`}>
            <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight mb-6">{topic.label}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((tutorial, i) => (
                <TutorialCard key={tutorial.slug} tutorial={tutorial} index={i} />
              ))}
            </div>
          </section>
        )
      })}

      <div className="pb-8" />
    </>
  )
}
