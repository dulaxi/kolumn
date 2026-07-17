// One settings row: title (+ optional muted description) on the left,
// control on the right. Pass htmlFor when the control is a labelable input.
export default function SettingsRow({ title, description, htmlFor, children }) {
  const Title = htmlFor ? 'label' : 'span'
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0 flex-1">
        <Title htmlFor={htmlFor} className="block text-sm text-[var(--text-primary)]">
          {title}
        </Title>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}
