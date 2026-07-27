import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from '@phosphor-icons/react'

// Flattens a react-markdown children tree back to plain text for copying.
function nodeText(node) {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (node.props?.children) return nodeText(node.props.children)
  return ''
}

function CodeCopyButton({ getText }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = () => {
    navigator.clipboard?.writeText(getText())
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy code"
      className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text-secondary)] focus-visible:opacity-100 group-hover/code:opacity-100"
    >
      {copied ? (
        <Check size={12} weight="bold" className="text-[var(--color-lime-dark)]" />
      ) : (
        <Copy size={12} />
      )}
    </button>
  )
}

const components = {
  h3: ({ children }) => (
    <h3 className="text-[16px] text-[var(--text-primary)] mt-4 mb-1.5" style={{ fontFamily: 'var(--font-logo)', fontWeight: 500 }}>
      {children}
    </h3>
  ),
  strong: ({ children }) => (
    <strong className="text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-logo)', fontWeight: 500 }}>
      {children}
    </strong>
  ),
  ul: ({ children }) => <ul className="pl-5 my-2 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="pl-5 my-2 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  inlineCode: ({ children }) => (
    <code className="bg-[var(--surface-raised)] px-1.5 py-0.5 rounded text-[13px] font-mono">
      {children}
    </code>
  ),
  code: ({ _inline, children, className }) => {
    const text = nodeText(children)
    const isBlock = text.includes('\n') || className != null
    if (!isBlock) {
      return (
        <code className="bg-[var(--surface-raised)] px-1.5 py-0.5 rounded text-[13px] font-mono">
          {children}
        </code>
      )
    }
    return (
      <div className="relative group/code my-3">
        <CodeCopyButton getText={() => text} />
        <pre className="bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] px-4 py-3.5 rounded-[10px] text-[13px] font-mono leading-relaxed overflow-x-auto">
          <code className={className}>{children}</code>
        </pre>
      </div>
    )
  },
  table: ({ children }) => (
    <table className="w-full border-collapse my-3 text-[13px]">{children}</table>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold text-[var(--text-primary)] px-2.5 py-1.5 border-b border-[var(--border-default)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="text-left px-2.5 py-1.5 border-b border-[var(--border-default)]">{children}</td>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-[var(--color-logo)] underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  p: ({ children }) => <p className="my-1.5">{children}</p>,
}

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
