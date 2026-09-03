import { Link } from 'react-router-dom'
import TemplateIcon from './TemplateIcon'
import { templateCardCount } from '../../content/templates'

// Gallery + "More like this" tile — templates spec §G3 / §D5. bg-card,
// 12px radius (Kolumn's raised tier, not the source's 16px border-only),
// column-title strip standing in for a screenshot preview.
export default function TemplateTile({ template }) {
  const cardCount = templateCardCount(template)
  return (
    <Link
      to={`/templates/${template.slug}`}
      className="group flex flex-col gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 hover:bg-[var(--surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-raised)] shrink-0">
          <TemplateIcon name={template.icon} size={18} className="text-[var(--text-primary)]" />
        </span>
        <h3 className="text-[15px] font-medium text-[var(--text-primary)] leading-tight">{template.name}</h3>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">{template.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {template.columns.map((col) => (
          <span
            key={col.title}
            className="font-mono text-[11px] px-1.5 py-0.5 rounded-[6px] bg-[var(--surface-raised)] text-[var(--text-secondary)] truncate max-w-[8rem]"
          >
            {col.title}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-0.5 text-xs text-[var(--text-muted)]">
        <span>
          {template.use === 'team' ? 'Team' : 'Personal'} · {template.area}
        </span>
        <span>{cardCount} starter card{cardCount === 1 ? '' : 's'}</span>
      </div>
    </Link>
  )
}
