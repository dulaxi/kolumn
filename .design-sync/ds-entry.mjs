// Design-sync bundle entry — the components Kolumn syncs to claude.ai/design.
// Hand-curated (the repo is an app, not a packaged library): exactly the
// scoped design-system surface, nothing else. embed-flag must stay the first
// import — it disarms src/lib/env.js's fail-fast throw before the store
// graph loads (Card/ChatMessage import stores → supabase → env).
import './embed-flag.js'

// Primitives (src/components/ui)
export { default as Avatar } from '../src/components/ui/Avatar.jsx'
export { default as Button } from '../src/components/ui/Button.jsx'
export { default as Input } from '../src/components/ui/Input.jsx'
export { default as Modal } from '../src/components/ui/Modal.jsx'
export { default as Popover } from '../src/components/ui/Popover.jsx'
export { default as Menu } from '../src/components/ui/Menu.jsx'
export { default as Tooltip } from '../src/components/ui/Tooltip.jsx'
export { default as Skeleton } from '../src/components/ui/Skeleton.jsx'
export { default as SegmentedControl } from '../src/components/ui/SegmentedControl.jsx'
export { default as InlineNotice } from '../src/components/ui/InlineNotice.jsx'
export { default as FieldError } from '../src/components/ui/FieldError.jsx'

// Board
export { default as Card } from '../src/components/board/Card.jsx'

// Chat
export { default as ChatMessage } from '../src/components/chat/ChatMessage.jsx'
export { default as ChatInput } from '../src/components/chat/ChatInput.jsx'
export { default as TypingIndicator } from '../src/components/chat/TypingIndicator.jsx'

// Preview provider — ChatMessage renders <Link>, which needs a router.
export { MemoryRouter } from 'react-router-dom'
