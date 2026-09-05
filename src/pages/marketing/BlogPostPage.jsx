import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import DynamicIcon from '../../components/board/DynamicIcon'
import Prose from '../../components/marketing/Prose'
import PostCard from '../../components/blog/PostCard'
import { getPost, relatedPosts, BLOG_TAGS } from '../../content/blog'

// /blog/<slug> — one component renders any post. Spec:
// docs/superpowers/specs/marketing/blog.md §3 (post). Posts are undated —
// no publication date or author name is shown, because none exist honestly.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'

function tagLabel(tag) {
  return BLOG_TAGS.find((t) => t.id === tag)?.label || tag
}

export default function BlogPostPage({ slug: slugProp }) {
  const params = useParams()
  const slug = slugProp || params.slug
  const post = getPost(slug)

  if (!post) {
    return (
      <section className={`${SECTION} py-24 text-center`}>
        <h1 className="font-heading font-[425] text-3xl text-[var(--text-primary)] mb-3">Post not found</h1>
        <p className="text-[var(--text-secondary)] mb-6">That post doesn&rsquo;t exist, or the link is wrong.</p>
        <Button asChild size="lg">
          <Link to="/blog">Back to the blog</Link>
        </Button>
      </section>
    )
  }

  const related = relatedPosts(post)

  return (
    <>
      <section className="border-b border-[var(--border-subtle)]">
        <div className={`${SECTION} pt-14 pb-10 max-w-[720px] mx-auto`}>
          <Link
            to="/blog"
            className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 mb-6 w-fit"
          >
            <ArrowLeft size={14} /> Blog
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <DynamicIcon name={post.icon} className="w-8 h-8 text-[var(--text-secondary)]" weight="duotone" />
            <span className="font-mono text-xs px-2 h-6 inline-flex items-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
              {tagLabel(post.tag)}
            </span>
          </div>
          <h1 className="font-heading font-[425] text-4xl sm:text-5xl leading-[1.1] tracking-tight text-[var(--text-primary)]">
            {post.title}
          </h1>
          <p className="text-xl text-[var(--text-secondary)] leading-relaxed mt-4">{post.summary}</p>
        </div>
      </section>

      <section className={SECTION}>
        <article className="max-w-[640px] mx-auto py-12">
          <Prose blocks={post.body} />
        </article>
      </section>

      {related.length > 0 && (
        <section className={`${SECTION} py-16 border-t border-[var(--border-subtle)]`}>
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight mb-8">More from the blog</h2>
          <div className="grid gap-8 lg:grid-cols-3">
            {related.map((p, i) => (
              <PostCard key={p.slug} post={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
