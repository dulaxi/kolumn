// Client-side form validation for auth surfaces.
//
// Every email field in the app used to rely on the browser's `type="email"`
// + `required` and nothing else, which meant an invalid address produced the
// browser's own native tooltip instead of Kolumn's error styling — a grey
// system bubble anchored off the field, in a font we don't control, that
// vanishes on the next keystroke. This module exists so the app can catch
// those cases itself and render them through FieldError like every other
// validation message.
//
// These are deliberately permissive. Client-side email validation cannot
// prove an address is deliverable, and a regex strict enough to reject every
// malformed address also rejects real ones (plus-addressing, new TLDs,
// unicode local parts). The job here is only to catch the obvious typo
// before a network round-trip; the server remains the authority.

// One "@", something either side, and a dot in the domain. That is the whole
// contract — see the note above about not tightening it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? '').trim())
}

// Kept here rather than typed at each call site so the same wording appears
// on the landing page, the reset-password page, and anywhere added later.
export const EMAIL_INVALID_MESSAGE = 'Enter a valid email address, like you@example.com.'

// Mirrors the minimum Supabase Auth enforces. Kept as a constant so the
// message and the check can never drift apart.
export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_TOO_SHORT_MESSAGE = `Use at least ${PASSWORD_MIN_LENGTH} characters.`
export const PASSWORD_MISMATCH_MESSAGE = 'This does not match the password above.'
