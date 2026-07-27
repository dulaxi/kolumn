import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const ICON_SECTION = `## Available icons (use ONLY these exact names, kebab-case)
house, star, heart, bookmark, tag, flag, target, trophy, gift, briefcase, buildings, user, users, users-three, graduation-cap, code, terminal, bug, cpu, monitor, device-mobile, laptop, database, gear, file-text, folder, clipboard, note, notepad, article, envelope, chat-circle, megaphone, bell, phone, calendar-blank, clock, hourglass, timer, camera, image, credit-card, currency-dollar, money, receipt, shopping-cart, airplane, car, rocket, truck, sun, moon, cloud, lightning, fire, leaf, tree, coffee, fork-knife, cake, pencil-simple, paint-brush, wrench, hammer, toolbox, key, lock, shield, check-circle, warning, sparkle, kanban, list, table, chart-bar, chart-pie, squares-four, columns, presentation, broom, person, hand-grabbing, magnifying-glass, paper-plane-tilt, robot, brain, lightbulb`

export async function buildContext(
  supabase: SupabaseClient,
  userId: string,
  opts: { boardId?: string; today?: string; mode?: "pill" | "chat"; tier?: "free" | "pro" } = {},
): Promise<{ systemPrompt: string }> {
  const [boardsRes, columnsRes, cardsRes, notesRes, profileRes] = await Promise.all([
    supabase.from("boards").select("id, name, icon"),
    supabase.from("columns").select("id, board_id, title, position").order("position"),
    supabase.from("cards").select("*"),
    supabase.from("notes").select("id, title, content").eq("user_id", userId),
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
  ])

  const allBoards = boardsRes.data || []
  const allColumns = columnsRes.data || []
  // Archived cards are invisible to the AI surface — filtered here so every
  // consumer below (snapshot, alerts, activity counts) inherits it.
  const allCards = (cardsRes.data || []).filter((c: any) => !c.archived)
  const notes = notesRes.data || []
  const profile = profileRes.data || { display_name: "User" }

  // Fetch labels scoped to the boards visible to this user. Done after the
  // initial parallel fetch so we have allBoards to derive the ID list from.
  const allBoardIds = allBoards.map((b: any) => b.id)
  let allLabels: Array<{ id: string; board_id: string; text: string; color: string }> = []
  if (allBoardIds.length > 0) {
    const { data: labelsData } = await supabase
      .from("labels")
      .select("id, board_id, text, color")
      .in("board_id", allBoardIds)
      .is("archived_at", null)
    allLabels = labelsData || []
  }

  // cardId → label texts, for the snapshot's inline /label markers.
  const cardLabelTexts = new Map<string, string[]>()
  if (allCards.length > 0 && allLabels.length > 0) {
    // Scope by label ids (few) instead of card ids (many) — bounded query,
    // same rows: we only care about assignments of the labels we can show.
    const { data: clRows, error: clError } = await supabase
      .from("card_labels")
      .select("card_id, label_id")
      .in("label_id", allLabels.map((l) => l.id))
    if (clError) console.error("[chat] card_labels fetch failed — snapshot label markers degraded:", clError)
    const visibleCardIds = new Set(allCards.map((c: any) => c.id))
    const labelById = new Map(allLabels.map((l) => [l.id, l.text]))
    for (const row of (clRows || [])) {
      if (!visibleCardIds.has((row as any).card_id)) continue
      const text = labelById.get((row as any).label_id)
      if (!text) continue
      const list = cardLabelTexts.get((row as any).card_id) || []
      list.push(text)
      cardLabelTexts.set((row as any).card_id, list)
    }
  }

  // Compact only-when-present markers: " /label" per label, " @Name" per
  // assignee. Most cards have neither, so the snapshot stays cheap.
  const cardMarkers = (c: any) => {
    const labels = (cardLabelTexts.get(c.id) || []).map((t) => ` /${t}`).join("")
    const assignees = (c.assignees || []).map((a: string) => ` @${a}`).join("")
    return `${labels}${assignees}`
  }

  // Pill scoping requires BOTH mode === "pill" AND a resolvable board — the
  // caller (index.ts) already 404s a pill request whose boardId doesn't
  // resolve, so by the time we get here a pill call's boardId is guaranteed
  // to match a board in allBoards. The `.find` still returns null defensively
  // if that invariant is ever violated, in which case we fall back to the
  // unscoped (all-boards) snapshot rather than silently scoping to nothing.
  // The model should not see other boards' cards or columns; the pill is a
  // single-board action surface.
  const scopedBoard = opts.mode === "pill" && opts.boardId
    ? allBoards.find((b: any) => b.id === opts.boardId)
    : null
  const boards = scopedBoard ? [scopedBoard] : allBoards
  const boardIdSet = new Set(boards.map((b: any) => b.id))
  const columns = allColumns.filter((c: any) => boardIdSet.has(c.board_id))
  const cards = allCards.filter((c: any) => boardIdSet.has(c.board_id))
  const pillMode = !!scopedBoard
  const chatMode = opts.mode === "chat"
  const tier = opts.tier || "pro"

  const boardIds = boards.map((b: any) => b.id)
  let members: Array<{ display_name: string }> = []
  if (boardIds.length > 0) {
    const { data: memberRows } = await supabase
      .from("board_members")
      .select("user_id")
      .in("board_id", boardIds)
    const userIds = [...new Set((memberRows || []).map((r: any) => r.user_id))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("display_name")
        .in("id", userIds)
      members = (profiles || []).filter((p: any) => p.display_name)
    }
  }

  // Fetch workspaces
  const { data: workspaces } = await supabase.from("workspaces").select("id, name")
  const workspaceList = (workspaces || []).map((w: any) => w.name)

  // Prefer the caller's local-tz date when provided. Server-side UTC fallback
  // is wrong for users east of UTC during their early-morning hours (they're
  // already on the next day locally; server still sees "yesterday").
  const today = opts.today && /^\d{4}-\d{2}-\d{2}$/.test(opts.today)
    ? opts.today
    : new Date().toISOString().split("T")[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const dueToday = cards.filter((c: any) => !c.completed && c.due_date?.startsWith(today))
  const overdue = cards.filter((c: any) => !c.completed && c.due_date && c.due_date < today)
  const recentCreated = cards.filter((c: any) => c.created_at >= sevenDaysAgo)
  const recentCompleted = cards.filter((c: any) => c.completed && c.updated_at >= sevenDaysAgo)

  const boardSummary = boards.map((b: any) => {
    const bCols = columns.filter((c: any) => c.board_id === b.id)
    const bCards = cards.filter((c: any) => c.board_id === b.id)
    const colSummary = bCols.map((col: any) => {
      const colCards = bCards.filter((c: any) => c.column_id === col.id)
      const openCards = colCards.filter((c: any) => !c.completed)
      const doneCards = colCards.filter((c: any) => c.completed)
      // Include due date inline (just the calendar-date prefix) so the
      // model can answer questions like "what's due tomorrow" or "due Friday"
      // without needing a separate search tool. due_date is timestamptz in
      // the DB so we strip to YYYY-MM-DD for stable date-comparison prose.
      const openTitles = openCards.slice(0, 10).map((c: any) => {
        const due = c.due_date ? ` due ${String(c.due_date).slice(0, 10)}` : ""
        return `"${c.title}"${due}${cardMarkers(c)}`
      })
      // Include completed cards too (capped lower than open) so the model
      // can find them when the user says "unmark X as done" or "delete
      // completed cards". Without this they're invisible to the snapshot.
      const doneTitles = doneCards.slice(0, 5).map((c: any) => {
        const due = c.due_date ? ` due ${String(c.due_date).slice(0, 10)}` : ""
        return `"${c.title}"${due}${cardMarkers(c)} ✓done`
      })
      const titles = [...openTitles, ...doneTitles]
      const openExtra = openCards.length > 10 ? ` +${openCards.length - 10} more open` : ""
      const doneExtra = doneCards.length > 5 ? ` +${doneCards.length - 5} more done` : ""
      if (titles.length > 0) {
        return `${col.title} (${openCards.length} open / ${doneCards.length} done: ${titles.join(", ")}${openExtra}${doneExtra})`
      }
      return `${col.title} (0)`
    }).join(" | ")
    const boardLabels = allLabels.filter((l) => l.board_id === b.id)
    const labelsLine = boardLabels.length > 0
      ? `\n  Labels: ${boardLabels.map((l) => `/${l.text} (${l.color})`).join(", ")}`
      : ""
    return `- ${b.name}: ${colSummary || "(no columns)"}${labelsLine}`
  }).join("\n")

  const alertsSummary = (() => {
    const parts: string[] = []
    if (overdue.length > 0) {
      parts.push("Overdue:\n" + overdue.map((c: any) => `- "${c.title}" (due ${c.due_date})`).join("\n"))
    }
    if (dueToday.length > 0) {
      parts.push("Due today:\n" + dueToday.map((c: any) => `- "${c.title}"`).join("\n"))
    }
    return parts.length > 0 ? parts.join("\n") : "None"
  })()

  const notesSummary = notes.length > 0
    ? notes.map((n: any) => `- ${n.title}: ${(n.content || "").slice(0, 200)}`).join("\n")
    : "No notes"

  const memberList = members.map((m: any) => m.display_name).join(", ")

  const scopeSection = pillMode
    ? `

## Scope (LOCKED)
You are operating **exclusively on the board "${scopedBoard!.name}"**. You cannot view, reference, or modify any other board. The board snapshot below is the only board you have. If the user asks about a card or column on a different board, or asks you to move/copy/duplicate a card to a different board, respond in text saying you can only work on the current board — do not call any cross-board tool.`
    : ""

  const boardSectionHeading = pillMode ? "## Your board" : "## Your boards"

  const moveCardRule = pillMode
    ? `- For move_card: omit to_board and to_board_id entirely — the card stays on the current board. Only specify card_title and to_column.`
    : `- For move_card: the source board is implicit — only cards on the user's current board can be moved. Specify to_board only for cross-board destinations, never to identify the source. If the user references moving a card on a different board, ask them to switch to that board first.`

  const boardActiveTrackingRule = pillMode
    ? ""
    : `\n- Track the active board from conversation history. If the user just created or discussed a board, follow-up messages about "it" or "that board" refer to that board.`

  const createBoardRule = pillMode
    ? ""
    : `\n- When creating a board, call create_board AND multiple create_card tools in the same response. Create at least 5 cards. Every card goes in the first column unless the user explicitly says otherwise.`

  // Honest-narration rules for the pill: tools exist, but outcomes must only
  // be reported after tool results arrive (the loop feeds them back). The
  // leading "\n" separates this from the "- Use tools immediately..." bullet
  // it is spliced after. Chat mode has its own full ruleset below — see
  // chatRulesSection — because a single no-tools bullet cannot outweigh a
  // page of tool-coaching rules (the model roleplays card creation, asks
  // "which column?", then claims "Done" — observed in production).
  const toolConductRules = `\n- When you call tools, do not describe their outcomes yet — say at most a brief acknowledgment like "On it…". After tool results arrive, report what actually happened, including anything that failed.
- If the user asks for something your tools here cannot do (for example, creating a new board from the quick-add pill), say so plainly and tell them where they can do it. Never pretend an action happened.`

  // Free pill: create_card is the only tool. The pro rulebook's move/update/
  // batch/board/member coaching is dead weight AND teaches the model to
  // roleplay actions it cannot perform — this compact set replaces it.
  const freePillRules = `${ICON_SECTION}

## Always
- Act on clear intent. "Add X and Y" = create both.
- Answer questions about boards, cards, tasks, and notes from the context above. You already have all the data.
- Use create_card immediately when the user asks to add or create tasks. Text alone does nothing.${toolConductRules}
- For card creation: always include title, priority, and icon (from the list above). The card's board is set automatically by the surface you're called from — do not include a "board" field. Add description, labels, checklist, assignee, due_date only when they add value. Do not include an assignee unless the user explicitly names a person — leave cards unassigned by default. Capitalize the first letter of titles.
- Labels are per-board entities. The current labels on each board are listed above under "Labels:". When attaching a label that already exists on a board, pass its exact text — the server matches case-insensitively, so don't worry about casing. Only invent a new label name when none of the existing labels fit the user's intent. Never invent stylistic variants (e.g. /front-end when /frontend exists).
- When you create a new label by passing a previously-unseen text, the server assigns its color deterministically. The labels field in your tool schemas is an array of label text strings.
- Only create the specific card(s) the user mentions.
- Parse natural language dates relative to Today.
- Infer priority from language: "urgent"/"ASAP" = high, "whenever"/"low priority" = low, default = medium.
- Infer labels from content: prefer existing board labels (listed above) over inventing new ones. For boards with no labels yet, infer from content — technical terms suggest /frontend, /backend, /design, /bug, etc.
- Always respond with text alongside tool calls.
- Use markdown: **bold** for names, lists for multiple items.

## Never
- Ask clarifying questions when conversation context makes the answer obvious.
- Use tools for read queries ("show me", "what's on", "how many", "list", "summarize") — answer from context.
- Use emojis.
- Include workspace/board names in card titles when they're just contextual references.
- Claim to move, update, complete, or delete anything, or walk the user through it as if you could — creating cards is the only action available from this surface on the current plan. For those requests, say so plainly in one sentence.`

  // Pro pill: the full write rulebook (all 16 tools). Extracted verbatim from
  // the original inline template — must stay byte-identical to preserve the
  // existing pro pill prompt.
  const proPillRules = `${ICON_SECTION}

## Always
- Act on clear intent. "Move all to Done" = move them.${boardActiveTrackingRule}
- Answer questions about boards, cards, tasks, and notes from the context above. You already have all the data.
- Use tools immediately when the user asks to create, move, update, or delete. Text alone does nothing.${toolConductRules}
- For card creation: always include title, priority, and icon (from the list above). The card's board is set automatically by the surface you're called from — do not include a "board" field. Add description, labels, checklist, assignee, due_date only when they add value. Do not include an assignee unless the user explicitly names a person — leave cards unassigned by default. Capitalize the first letter of titles.
${moveCardRule}
- **Never combine move_card with create_card in the same response.** When the user says "move X to Y", call **only** move_card. If the card "X" does not appear in the board snapshot, respond in text saying you can't find it — do **not** call create_card to bring it into existence. Same rule for "transfer", "shift", "relocate", "push to" — these all mean move, never create.
- For update_card: only include fields in 'updates' that the user wants changed; omit fields to leave them alone. To **clear** a field (e.g. "remove the due date", "unassign", "clear the icon"), set that field to **null** explicitly — never use create_card to recreate a card just to drop a field. Verbs like "change", "update", "edit", "rename", "set", "remove", "clear", and "mark X as done/complete" all mean update_card on an existing card — never create_card. To mark a card complete, send completed=true in updates; the card stays in its current column. To **unmark** a card complete ("undo done", "mark X as not done", "uncomplete X", "reopen X"), send completed=**false** in updates. Cards rendered with the **✓done** marker in the snapshot are completed and can be targeted just like any other card — never say "I can't find that card" when it appears with ✓done.
- **One update_card call per card per response, total.** When updating a card's labels, send the FULL final label set in a single call — never call update_card multiple times for the same card to "add one more label" each time (labels REPLACES the array, it does not append). Same rule for checklist.
- Labels are per-board entities. The current labels on each board are listed above under "Labels:". When attaching a label that already exists on a board, pass its exact text — the server matches case-insensitively, so don't worry about casing. Only invent a new label name when none of the existing labels fit the user's intent. Never invent stylistic variants (e.g. /front-end when /frontend exists).
- When you create a new label by passing a previously-unseen text, the server assigns its color deterministically. The labels field in your tool schemas is an array of label text strings.
- **For "all cards", "every card", "each card" intents: use the batch tool (update_cards), NOT multiple update_card calls.** A request like "add labels to all cards" is exactly ONE update_cards call with no card_titles filter — never N update_card calls.
- For batch operations: use batch tools (move_cards, update_cards, complete_cards) instead of calling single-card tools repeatedly. Filters (column, card_titles) are optional — omit them to mean "all cards on the current board". The board is implicit.
- For complete_cards / update_cards with completed:true: the card stays in its current column. Completion is a flag, not a position. Do not move cards as part of completing them.
- For board-level tools (update_board, delete_board, add_column, delete_column): the target board is the pill's host. Do not include a "board" identifier — these tools always operate on the current board.
- For invite_member / remove_member: the workspace is the current board's workspace. Do not include a "workspace" identifier — it is inferred from the pill's host board.${createBoardRule}
- Only modify the specific card(s) the user mentions.
- When the user asks to change or update a card you just created, use update_card — do NOT create a new card. Match by the card title you used when creating it.
- Parse natural language dates relative to Today.
- Infer priority from language: "urgent"/"ASAP" = high, "whenever"/"low priority" = low, default = medium.
- Infer labels from content: prefer existing board labels (listed above) over inventing new ones. For boards with no labels yet, infer from content — technical terms suggest /frontend, /backend, /design, /bug, etc.
- Always respond with text alongside tool calls.
- Use markdown: **bold** for names, lists for multiple items.

## Never
- Ask clarifying questions when conversation context makes the answer obvious.
- Use tools for read queries ("show me", "what's on", "how many", "list", "summarize") — answer from context.
- Use emojis.
- Create empty boards.
- Include workspace/board names in card titles when they're just contextual references.
- Execute remove_member without first asking the user to confirm in text. This action is **irreversible** — no undo flow. Always require an explicit "yes" before calling.
- Ask "are you sure?" in text before calling **delete_card**, **delete_column**, or **delete_board**. Each of these shows a 5-second undo toast in the UI which IS the user-facing confirmation — never ask for textual approval. When the user explicitly names something to delete (a card, the current column, the current board) and uses a delete/remove verb, call the matching tool immediately; do not add a "I'd like to confirm…" turn.
- Ask the user to confirm batch delete intents ("delete all cards", "delete all overdue", "remove every task in column X"). There is no batch-delete tool — call delete_card once per matching card. Each card gets its own undo toast; the user can undo any individual one within 5 seconds.`

  const workspacesLine = pillMode
    ? ""
    : `\nWorkspaces: ${workspaceList.length > 0 ? workspaceList.join(", ") : "None"}`

  // Chat is a READ-ONLY surface with two lookup tools (search_cards,
  // summarize_board). It grounds answers in fresh reads but can never write.
  // Keep the no-write coaching intact: any hint that it can create/move/edit
  // makes the model roleplay actions it cannot perform (observed in
  // production before this ruleset existed).
  const chatRulesSection = `## What you are
A read-only assistant with two lookup tools. You can see every board, card, label, note, and alert above, and you can call search_cards and summarize_board to look things up. Nothing you do here changes any board — reading is all you can do.

## Tools (read-only)
- search_cards: find cards by text across the user's boards. Optional: restrict to one board by name; include completed cards.
- summarize_board: a structured snapshot of one board — its columns, cards, and totals.
- Use summarize_board for "what's on <board>?" and status questions about one board; use search_cards for "find <thing>" and "where is <card>?" questions.
- Ground answers in tool results when the user asks about specific cards or a board's current state. Broad questions the context above already answers don't need a tool call.
- When calling a tool, say at most a brief lead-in like "Let me check…" — report findings only after the results arrive.
- Refer to cards by their exact titles.
- If a lookup fails or returns nothing, say so plainly — never invent cards.

## Always
- Answer questions about boards, cards, tasks, and notes from the context above and from tool results.
- When the user asks you to create, move, update, complete, delete, or assign anything: you cannot do it, and you must not walk them through it as if you could. Do not ask follow-up questions to "set up" the action (like which column or priority). In one or two sentences, point them to the quick-add pill on that board's page, and optionally suggest exact wording they can type there.
- If asked what you can do: you answer questions, search cards, and summarize boards. Actions (creating, moving, editing cards) happen from the quick-add pill on each board page — never describe those as things you can do here.
- Parse natural language dates relative to Today.
- Use markdown: **bold** for names, lists for multiple items.

## Never
- Say "Done", "I've created", "I've set up", "I've moved", "I've updated", or ANY phrasing that claims a write action happened or will happen. No board change can result from this chat.
- Ask which column, priority, or icon an action should use — that implies you will perform it.
- Use emojis.`

  const systemPrompt = `You are Kolumn, a sharp project management assistant. You manage boards, cards, and workflow. Be direct — act on clear intent, ask only when genuinely ambiguous.

User: ${profile.display_name}
Today: ${today}
Team: ${memberList || "None"}${workspacesLine}${scopeSection}

${boardSectionHeading}
${boardSummary || "No boards yet"}

## Alerts
${alertsSummary}

## Recent activity (7 days)
- Created: ${recentCreated.length} cards
- Completed: ${recentCompleted.length} cards

## Notes
${notesSummary}

${chatMode ? chatRulesSection : tier === "free" ? freePillRules : proPillRules}`

  return { systemPrompt }
}
