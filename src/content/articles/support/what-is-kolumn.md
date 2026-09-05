---
title: What is Kolumn?
---

Kolumn is a kanban board — boards, columns, cards, drag-and-drop — with an AI layered on top that can operate the same board through plain-language requests. It stays a kanban first: no required custom fields, no setup ritual before you can drag a card from one column to another.

## The board

A board has columns, and each column holds cards. A card carries a title, description, Phosphor icon, priority, due date, labels, a checklist, and assignees. You drag cards between columns and reorder them within one, the same as any kanban tool. See [Anatomy of a card](/support/anatomy-of-a-card) for the full field list.

## The AI, as a teammate

Two separate surfaces put the AI to work on your boards:

- **The pill** — a small input at the bottom of every board. Type an intent ("add a card for tomorrow's standup") and the AI creates, moves, updates, or completes cards on that board. A plain comma- or newline-separated list skips the AI entirely and turns straight into cards — see [Add many cards at once](/support/add-many-cards-at-once).
- **Chat** — a separate conversational surface for asking questions about your boards and getting summaries. Chat never edits anything; it only reads.

## Workspaces and sharing

Boards can be personal (yours, optionally shared with specific people) or live inside a workspace — a container with its own member list for team boards. Changes sync in real time to everyone with access to a board.

## Getting started

New accounts get a seeded "Welcome" board that walks through the basics by having you do them — see [Your getting-started board](/support/your-getting-started-board). From there, **New board** in the sidebar creates a blank board any time; a set of starter templates tailored to your role is offered once, during onboarding.

## Your data

Boards live in a Postgres database with row-level security, so only members of a board can read it. Kolumn does not train any AI model on your board content. You can export your data or delete your account at any time from Settings.
