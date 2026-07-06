import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  code: ({ inline, children, className }) => {
    if (inline) {
      return (
        <code className="bg-[var(--surface-raised)] px-1.5 py-0.5 rounded text-[13px] font-mono">
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] px-4 py-3.5 rounded-[10px] text-[13px] font-mono leading-relaxed overflow-x-auto my-3">
        <code className={className}>{children}</code>
      </pre>
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
