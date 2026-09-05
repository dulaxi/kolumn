// Card — kanban card surface. Labels come from selectCardLabels() against
// the (empty-in-preview) board store, so no labels render here; priority,
// due date, checklist, and assignees all read straight off the card prop.
import { useState } from 'react'
import { Card } from 'kolumn'

const iso = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }

export const Basic = () => {
  const [selected, setSelected] = useState(false)
  const card = {
    id: 'card-1',
    board_id: 'board-1',
    title: 'Fix onboarding drop-off',
    description: '',
    priority: 'medium',
    due_date: null,
    checklist: [],
    completed: false,
    icon: null,
    assignees: [],
    assignee_name: '',
  }
  return (
    <div style={stack}>
      <Card card={card} onClick={() => setSelected((s) => !s)} onComplete={() => {}} isSelected={selected} />
    </div>
  )
}

export const FullDetail = () => {
  const card = {
    id: 'card-2',
    board_id: 'board-1',
    title: 'Redesign the pricing page',
    description: 'Simplify tiers to three plans and lead with the annual discount.',
    priority: 'high',
    due_date: iso(1),
    checklist: [
      { id: 'c1', text: 'Audit current conversion funnel', done: true },
      { id: 'c2', text: 'Draft new tier copy', done: true },
      { id: 'c3', text: 'Get pricing sign-off from finance', done: false },
    ],
    completed: false,
    icon: 'CurrencyDollar',
    assignees: ['Priya Chandran', 'Marcus Webb'],
    assignee_name: 'Priya Chandran',
    assignee_refs: [
      { name: 'Priya Chandran', id: null },
      { name: 'Marcus Webb', id: null },
    ],
  }
  return (
    <div style={stack}>
      <Card card={card} onClick={() => {}} onComplete={() => {}} isSelected={false} />
    </div>
  )
}

export const Completed = () => {
  const card = {
    id: 'card-3',
    board_id: 'board-1',
    title: 'Ship the referral program',
    description: 'Launched to 10% of users; monitoring signup lift.',
    priority: 'low',
    due_date: iso(-3),
    checklist: [
      { id: 'c1', text: 'Write launch announcement', done: true },
      { id: 'c2', text: 'Enable feature flag', done: true },
    ],
    completed: true,
    icon: 'Rocket',
    assignees: ['Sofia Ibarra'],
    assignee_name: 'Sofia Ibarra',
  }
  return (
    <div style={stack}>
      <Card card={card} onClick={() => {}} onComplete={() => {}} isSelected={false} />
    </div>
  )
}

export const Overdue = () => {
  const [selected, setSelected] = useState(true)
  const card = {
    id: 'card-4',
    board_id: 'board-1',
    title: 'Migrate legacy webhook handlers',
    description: 'Old handlers still write to the deprecated events table.',
    priority: 'high',
    due_date: iso(-2),
    checklist: [
      { id: 'c1', text: 'Inventory active webhook consumers', done: false },
      { id: 'c2', text: 'Write migration script', done: false },
      { id: 'c3', text: 'Cut over and monitor for 24h', done: false },
    ],
    completed: false,
    icon: 'PlugsConnected',
    assignees: ['Devon Okafor'],
    assignee_name: 'Devon Okafor',
  }
  return (
    <div style={stack}>
      <Card card={card} onClick={() => setSelected((s) => !s)} onComplete={() => {}} isSelected={selected} />
    </div>
  )
}
