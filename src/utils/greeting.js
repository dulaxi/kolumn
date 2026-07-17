/**
 * Dashboard greeting logic — the words and Klay read the same clock.
 *
 * Two sources feed one index: getGreetingSlot() buckets the hour into four
 * dayparts, and the day-of-epoch picks position 0-2 within the slot.
 * GREETINGS[slot][i] is the line, KLAY_BY_SLOT[slot][i] is its work scene —
 * paired by construction, so "Ship it" day always shows the shipping scene
 * and "The quiet hours" always sleeps.
 *
 * Decision records: docs/design-mockups/dashboard-klay-options-v2.html (B),
 * dashboard-klay-worksets.html + dashboard-klay-freshcolumns-r2.html (A).
 */

export const GREETINGS = {
  morning: ['Clear the board', 'Ship it', 'Fresh columns'],
  afternoon: ["Momentum's yours", 'Keep the flow', 'Halfway through'],
  evening: ['Close it out', 'Wrap the day', 'One more move'],
  night: ['Still at it', 'Locked in', 'The quiet hours'],
}

// One work scene per greeting line, same order as GREETINGS — index i of a
// slot's lines pairs with index i of its animations. Keep the two arrays in
// lockstep when editing either.
export const KLAY_BY_SLOT = {
  morning: ['sweep', 'ship', 'sprout-columns'],
  afternoon: ['push-card', 'flow', 'progress'],
  evening: ['checklist', 'box-lid', 'last-move'],
  night: ['lamplight', 'night-focus', 'moonsleep'],
}

export function getGreetingSlot(hour) {
  if (hour >= 5 && hour <= 11) return 'morning'
  if (hour >= 12 && hour <= 16) return 'afternoon'
  if (hour >= 17 && hour <= 20) return 'evening'
  return 'night'
}

// Day-of-epoch — the shared rotation clock. Both pickers derive their index
// from this so the line and the scene can never drift apart.
function dayIndex() {
  return Math.floor(Date.now() / 86400000)
}

// Rotates within the slot by day-of-epoch, so the same daypart doesn't
// repeat its line two days running.
export function pickGreeting(slot) {
  const options = GREETINGS[slot]
  return options[dayIndex() % options.length]
}

// The paired picker: same slot, same day → the scene that matches today's
// line.
export function pickKlay(slot) {
  const options = KLAY_BY_SLOT[slot]
  return options[dayIndex() % options.length]
}
