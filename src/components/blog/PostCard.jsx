import { Link } from 'react-router-dom'
import DynamicIcon from '../board/DynamicIcon'
import { BLOG_TAGS } from '../../content/blog'

// Blog index + related-posts tile. Tile glyph cycles through the app's
// label palette, one Phosphor icon per post (frontmatter-equivalent
// `icon` field), matching the tutorials/blog spec's 6-hue cycle.
const WASHES = [
  { bg: 'bg-[var(--label-purple-bg)]', text: 'text-[var(--label-purple-text)]' },
  { bg: 'bg-[var(--label-blue-bg)]', text: 'text-[var(--label-blue-text)]' },
  { bg: 'bg-[var(--label-green-bg)]', text: 'text-[var(--label-green-text)]' },
  { bg: 'bg-[var(--label-yellow-bg)]', text: 'text-[var(--label-yellow-text)]' },
  { bg: 'bg-[var(--label-pink-bg)]', text: 'text-[var(--label-pink-text)]' },
  { bg: 'bg-[var(--accent-lime-wash)]', text: 'text-[var(--accent-lime-dark)]' },
]

function tagLabel(tag) {
  return BLOG_TAGS.find((t) => t.id === tag)?.label || tag
}

export default function PostCard({ post, index = 0 }) {
  const wash = WASHES[index % WASHES.length]
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden hover:border-[var(--border-focus)] transition-colors duration-150"
    >
      <div className={`aspect-[3/2] ${wash.bg} flex items-center justify-center`}>
        <DynamicIcon name={post.icon} className={`w-12 h-12 ${wash.text}`} weight="duotone" />
      </div>
      <div className="p-5 flex flex-col gap-2">
        <h3 className="font-heading font-[425] text-lg leading-snug text-[var(--text-primary)] line-clamp-3">{post.title}</h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{post.summary}</p>
        <span className="font-mono text-[11px] px-2 h-6 inline-flex items-center w-fit rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] mt-1">
          {tagLabel(post.tag)}
        </span>
      </div>
    </Link>
  )
}
