// Shared body renderer for the content-block system used by blog posts and
// customer stories (src/content/{blog,customers}.js). Deliberately NOT a
// markdown pipeline — every article body here is a plain JS array of
// blocks: { type: 'heading' | 'paragraph' | 'list' | 'code', ... }. This
// keeps content in ordinary data modules (no build-time markdown dep)
// while the existing prerenderer picks these pages up unchanged.
//
// Tutorials moved off this block system to markdown bodies (see
// src/content/tutorials.js, src/lib/content.js) — TutorialPage.jsx now
// renders via react-markdown, with its own component map styled to match
// the type scale below exactly. If blog/customers ever move to markdown
// too, they should follow that same pattern rather than reintroducing a
// block system.
//
// Block shapes:
//   { type: 'heading', level: 2 | 3, text }
//   { type: 'paragraph', text, quote?: boolean }   // quote: true renders as a pull quote
//   { type: 'list', items: string[], ordered?: boolean }
//   { type: 'code', text }
//
// Type scale matches the tutorials/blog spec: body 17/28, h2 28px, h3 20px.

function Heading({ level, text }) {
  const className =
    level === 3
      ? 'font-heading font-[425] text-xl text-[var(--text-primary)] tracking-tight mt-8 mb-3'
      : 'font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight mt-12 mb-4'
  if (level === 3) return <h3 className={className}>{text}</h3>
  return <h2 className={className}>{text}</h2>
}

function Paragraph({ text, quote }) {
  if (quote) {
    return (
      <blockquote className="border-l-2 border-[var(--border-default)] pl-5 my-6 text-[17px] leading-7 text-[var(--text-secondary)] italic">
        {text}
      </blockquote>
    )
  }
  return <p className="text-[17px] leading-7 text-[var(--text-primary)]">{text}</p>
}

function ListBlock({ items, ordered }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={`pl-6 flex flex-col gap-2 text-[17px] leading-7 text-[var(--text-primary)] ${ordered ? 'list-decimal' : 'list-disc'} marker:text-[var(--text-muted)]`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  )
}

function CodeBlock({ text }) {
  return (
    <pre className="font-mono text-[14px] leading-6 text-[var(--text-primary)] bg-[var(--surface-input)] border border-[var(--border-default)] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
      {text}
    </pre>
  )
}

function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return <Heading level={block.level || 2} text={block.text} />
    case 'list':
      return <ListBlock items={block.items} ordered={block.ordered} />
    case 'code':
      return <CodeBlock text={block.text} />
    case 'paragraph':
    default:
      return <Paragraph text={block.text} quote={block.quote} />
  }
}

export default function Prose({ blocks, className = '' }) {
  if (!blocks || blocks.length === 0) return null
  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}
