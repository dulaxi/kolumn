import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import SegmentedControl from '../../components/ui/SegmentedControl'
import PostCard from '../../components/blog/PostCard'
import { BLOG_POSTS, BLOG_TAGS } from '../../content/blog'

// /blog — the index. Spec: docs/superpowers/specs/marketing/blog.md §3.
// The eyebrow ("Blog") is the h1 for semantics, styled small — the big
// sentence below it is decorative, not a second heading. Static: no auth.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

const CHIP_OPTIONS = [{ value: 'all', label: 'All' }, ...BLOG_TAGS.map((t) => ({ value: t.id, label: t.label }))]

export default function BlogPage() {
  const [tag, setTag] = useState('all')

  const visible = useMemo(
    () => (tag === 'all' ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.tag === tag)),
    [tag],
  )

  return (
    <>
      <section className={`${SECTION} pt-16 pb-12`}>
        <h1 className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] mb-3">Blog</h1>
        <p className="font-heading font-[425] text-4xl sm:text-5xl tracking-tight leading-[1.08] max-w-3xl text-[var(--text-primary)]">
          Notes from building a kanban that stayed a kanban.
        </p>
      </section>

      <section className={`${SECTION} pb-20`}>
        <h2 className="sr-only">Posts</h2>
        <div className="mb-8">
          <SegmentedControl ariaLabel="Filter by topic" options={CHIP_OPTIONS} value={tag} onChange={setTag} />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post, i) => (
            <PostCard key={post.slug} post={post} index={i} />
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className={`${SECTION} py-20 text-center`}>
          <h2 className="font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight mb-3">
            Try the thing the posts are about.
          </h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
            Free to start. Twenty AI messages a day, every board feature, no card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/onboarding">Start a board</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
