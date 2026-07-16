/**
 * Dashboard greeting logic — the words and Klay read the same clock.
 *
 * One source of truth: getGreetingSlot() buckets the hour into four
 * dayparts. GREETINGS picks the copy (rotating daily within the slot),
 * KLAY_BY_SLOT picks the posture. Because both derive from the same
 * slot, the greeting can never say "The quiet hours" while Klay is
 * wide awake tapping his feet.
 *
 * Decision record: docs/design-mockups/dashboard-klay-options-v2.html (B).
 */

export const GREETINGS = {
  morning: ['Clear the board', 'Ship it', 'Fresh columns'],
  afternoon: ["Momentum's yours", 'Keep the flow', 'Halfway through'],
  evening: ['Close it out', 'Wrap the day', 'One more move'],
  night: ['Still at it', 'Locked in', 'The quiet hours'],
}

// Klay matches the slot's mood: sprouting into the morning, heads-down
// through the afternoon, winding down in the evening, asleep at night.
export const KLAY_BY_SLOT = {
  morning: 'grow',
  afternoon: 'tap',
  evening: 'idle',
  night: 'sleep',
}

export function getGreetingSlot(hour) {
  if (hour >= 5 && hour <= 11) return 'morning'
  if (hour >= 12 && hour <= 16) return 'afternoon'
  if (hour >= 17 && hour <= 20) return 'evening'
  return 'night'
}

// Rotates within the slot by day-of-epoch, so the same daypart doesn't
// repeat its line two days running.
export function pickGreeting(slot) {
  const options = GREETINGS[slot]
  const dayIndex = Math.floor(Date.now() / 86400000)
  return options[dayIndex % options.length]
}
