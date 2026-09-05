---
title: Where is my data stored?
---

Kolumn stores every board, column, and card you create in a Postgres database run by Supabase. That's the one place it lives — there's no separate copy anywhere else to fall out of sync.

## In transit

Every request between your browser and Kolumn's backend travels over HTTPS. The app is also served with a Content Security Policy that only lets it talk to Kolumn's own backend and the handful of services below — it can't be embedded in another site's frame, and browsers are told not to guess at content types or leak the page you came from.

## Row-level security, not app-level guessing

Every table in the database — boards, columns, cards, and the rest — has row-level security switched on. The database itself checks who's asking before it returns a row, using rules like "only members of this board can read its cards." Those rules apply the same way no matter what's making the request — the app, the AI, or a direct database connection all see the same restricted view. [Who can see my boards?](/support/who-can-see-my-boards) walks through what "member" means in practice.

## Who else touches it

A short list:

- **Supabase** runs the database, sign-in, and realtime sync. It holds your account and everything on your boards.
- **Anthropic** runs the AI behind the pill and chat, and sees the message and board context of the request you just sent it — nothing you haven't asked it to look at. See [Does the AI train on my boards?](/support/does-the-ai-train-on-my-boards)
- **Sentry** receives error reports, so crashes can be found and fixed.
- **PostHog** receives product analytics, in aggregate.

Nobody else is in the loop. The fuller version of this list, with what each one is allowed to see, is on the [security page](/security).

## Related

- [Who can see my boards?](/support/who-can-see-my-boards)
- [How do I export or delete my data?](/support/export-or-delete-your-data)
- [Does the AI train on my boards?](/support/does-the-ai-train-on-my-boards)
