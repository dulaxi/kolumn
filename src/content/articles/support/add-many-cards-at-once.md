---
title: Add many cards at once
---

Paste or type a list into the pill and Kolumn turns each line into its own card — without asking the AI to do it.

## How to trigger it

Open the pill at the bottom of a board and type or paste more than one item, separated either by:

- **Newlines** — one item per line, or
- **Commas** — a single line with items separated by commas.

Press Enter (or the send button) and each item becomes a card in one go, landing in the board's first column. Titles are used as typed, except the first letter is capitalized automatically (so "buy milk" becomes "Buy milk").

## Why this matters

This split happens entirely in the browser — it's simple text splitting, not a model call. It's instant, it doesn't touch your daily AI message allowance (see [Why did the AI say I hit my daily limit?](/support/daily-limit)), and it works even if you're out of messages for the day.

## When it doesn't apply

Newline-separated text always splits, no exceptions. Comma-separated text is treated as a list *unless* one of the comma-separated parts reads like a sentence — starting with a word like "Add," "Create," "Make," "New," or "I need/want/would." In that case Kolumn assumes you're describing one request in prose (e.g. "Add a card for Tuesday's call, due Friday") and sends the whole thing to the AI instead of slicing it on the comma.

A single item with no comma or newline also goes to the AI, since there's nothing to split.

## What you don't get with the fast path

Cards created this way get only a title — no description, priority, due date, or labels. If you want the AI to fill those in from context, phrase your request as prose instead of a bare list (or add the details afterward — see [Anatomy of a card](/support/anatomy-of-a-card)).
