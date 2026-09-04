---
title: Who can see my boards?
---

The people who are members of that specific board. Nothing else decides it — not who you work with, not what workspace it sits in. Kolumn checks this in the database itself, with row-level security, so the rule applies the same way whether the request comes from the app, the AI, or anything else. See [Where is my data stored?](/support/where-is-my-data-stored) for how that's enforced.

## What makes someone a member

Every board keeps its own member list, separate from the board itself. Two things add someone to it:

- **Creating the board.** Whoever creates it is added automatically, as owner.
- **Being invited to it, by email**, from that board's own **Share** panel (or **Board members**, if you're not the owner). Each invite is scoped to that one board.

If you're not on a board's member list, its columns and cards simply aren't returned to you — there's no in-between state where a board is hidden but still reachable.

## Workspaces are a separate membership list

A workspace has its own members — the roster you build from workspace settings. That list controls who can see the workspace and who else is on it. It does **not**, by itself, add anyone to the boards inside that workspace. A board created inside a workspace still keeps its own member list, exactly like a personal board, and only its owner is added automatically when it's created. So a teammate can be in your workspace and still not be able to open a specific board there — they need to be added to that board too, the same way anyone else would be.

Workspace membership and board membership are two coexisting systems in Kolumn, tracked and enforced separately. Either one works on its own — a personal board can be shared with individual people without ever creating a workspace.

## Checking who has access right now

Open the board and click **Share** (or **Board members**). That list is exactly who row-level security is letting in — not an approximation of it.

## Related

- [Where is my data stored?](/support/where-is-my-data-stored)
- [How do I export or delete my data?](/support/export-or-delete-your-data)
