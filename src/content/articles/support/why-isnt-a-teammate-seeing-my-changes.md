---
title: Why isn't a teammate seeing my changes?
---

Kolumn syncs boards live — most changes show up on a teammate's screen within moments, no refresh needed. When that doesn't seem to be happening, it's almost always one of a few specific things, not a broken app.

## Check access first

Realtime sync only reaches people who can already see the board. If your teammate isn't a member of the board (or, for a workspace board, not a member of the workspace), nothing will ever appear for them, live or otherwise — there's nothing to sync. See [Share a single board](/support/share-a-single-board) and [Create a workspace and invite members](/support/create-a-workspace-and-invite-members) to confirm they actually have access.

## How live sync works

While you have a board open, Kolumn keeps a live connection open for that board's cards and columns, plus a lighter one covering board names and labels everywhere. A change on one screen — yours or a teammate's — is pushed to the other screen as it happens.

A couple of things affect it:

- **It's last-write-wins.** If two people edit the same card at close to the same moment, whichever write reaches the database last is what sticks, and a very old update arriving late is dropped rather than overwriting something newer. Brief flicker when two people touch the same card at once is expected, not a bug.
- **Dragging pauses incoming card updates.** While a teammate is in the middle of dragging a card, their screen ignores incoming card changes (except deletes) until they drop it, so their own drag doesn't get yanked out from under them. Anything you changed shows up for them the moment they finish.

## If they're offline or live sync can't connect

If your teammate's connection drops, they'll see a persistent toast saying they're offline and changes may not be saved — that's the app noticing the network is down, not the sync system itself. Kolumn also detects, separately, when live sync specifically can't establish its connection (a strict network or browser setting can block it while the rest of the internet works fine); when that happens, it shows a one-time notice that live updates aren't available right now, but every other part of the app — creating, editing, moving cards — keeps working normally over the regular connection. In both cases, everything reconciles the moment the connection (or the sync channel) comes back, and a manual refresh always pulls the current state regardless of whether live sync is working.

## What to check

- Ask your teammate to refresh. This bypasses the live-sync question entirely and shows exactly what's saved in Kolumn right now.
- Confirm they're looking at the same board (not a similarly-named one) and, if it's inside a workspace, that they've joined that workspace.
- If they still don't see it after a refresh, the change likely didn't save on your end — check your own connection and try the edit again.

## Related

- [Share a single board](/support/share-a-single-board)
- [Create a workspace and invite members](/support/create-a-workspace-and-invite-members)
