---
title: Does the AI train on my boards?
---

No. Kolumn does not use your boards, cards, or chat messages to train any AI model — not Anthropic's, not anyone else's.

## What actually gets sent

When you use the pill or chat, the message you typed and the board context the feature needs go to Anthropic's API to generate that one response — the boards, columns, and cards your account can already see, nothing more. That request-scoped context is built fresh each time and exists only to answer you.

## What never gets sent

- Boards or cards you're not a member of. Every query the AI's context is built from runs through the same row-level security as the rest of the app, so the AI only ever sees rows your account is already allowed to read.
- Anything from another account's boards, workspaces, or chat history.

## Who else is involved

Anthropic processes the messages and board context you send to the assistant, in order to generate the response — that's the only reason your content leaves Kolumn's own database. See the full list of services Kolumn runs on at [Security](/security).

## Where this is written down

Kolumn's [privacy policy](/privacy) states plainly that your content is not used to train AI models. If that ever changed, it would be a material change to that policy, announced in-app or by email, not a silent shift.

## Your controls either way

Whether or not you use the AI at all, you can export every board and card as JSON, or delete your account outright, from Settings → Privacy and Settings → Account.
