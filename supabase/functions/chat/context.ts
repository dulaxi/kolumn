import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export async function buildContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ systemPrompt: string }> {
  const [boardsRes, columnsRes, cardsRes, notesRes, profileRes] = await Promise.all([
    supabase.from("boards").select("id, name, icon"),
    supabase.from("columns").select("id, board_id, title, position").order("position"),
    supabase.from("cards").select("*"),
    supabase.from("notes").select("id, title, content").eq("user_id", userId),
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
  ])

  const boards = boardsRes.data || []
  const columns = columnsRes.data || []
  const cards = cardsRes.data || []
  const notes = notesRes.data || []
  const profile = profileRes.data || { display_name: "User" }

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

  const today = new Date().toISOString().split("T")[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const dueToday = cards.filter((c: any) => !c.completed && c.due_date?.startsWith(today))
  const overdue = cards.filter((c: any) => !c.completed && c.due_date && c.due_date < today)
  const recentCreated = cards.filter((c: any) => c.created_at >= sevenDaysAgo)
  const recentCompleted = cards.filter((c: any) => c.completed && c.updated_at >= sevenDaysAgo)

  const boardSummary = boards.map((b: any) => {
    const bCols = columns.filter((c: any) => c.board_id === b.id)
    const bCards = cards.filter((c: any) => c.board_id === b.id)
    const colSummary = bCols.map((col: any) => {
      const colCards = bCards.filter((c: any) => c.column_id === col.id && !c.completed)
      const titles = colCards.slice(0, 10).map((c: any) => `"${c.title}"`)
      const extra = colCards.length > 10 ? ` + ${colCards.length - 10} more` : ""
      if (titles.length > 0) {
        return `${col.title} (${colCards.length}: ${titles.join(", ")}${extra})`
      }
      return `${col.title} (0)`
    }).join(" | ")
    return `- ${b.name}: ${colSummary || "(no columns)"}`
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

  const systemPrompt = `You are Kolumn, a sharp project management assistant. You manage boards, cards, and workflow. Be direct — act on clear intent, ask only when genuinely ambiguous.

User: ${profile.display_name}
Today: ${today}
Team: ${memberList || "None"}
Workspaces: ${workspaceList.length > 0 ? workspaceList.join(", ") : "None"}

## Your boards
${boardSummary || "No boards yet"}

## Alerts
${alertsSummary}

## Recent activity (7 days)
- Created: ${recentCreated.length} cards
- Completed: ${recentCompleted.length} cards

## Notes
${notesSummary}

## Available icons (use ONLY these exact names, kebab-case)
house, star, heart, bookmark, tag, flag, target, trophy, gift, briefcase, buildings, user, users, users-three, graduation-cap, code, terminal, bug, cpu, monitor, device-mobile, laptop, database, gear, file-text, folder, clipboard, note, notepad, article, envelope, chat-circle, megaphone, bell, phone, calendar-blank, clock, hourglass, timer, camera, image, credit-card, currency-dollar, money, receipt, shopping-cart, airplane, car, rocket, truck, sun, moon, cloud, lightning, fire, leaf, tree, coffee, fork-knife, cake, pencil-simple, paint-brush, wrench, hammer, toolbox, key, lock, shield, check-circle, warning, sparkle, kanban, list, table, chart-bar, chart-pie, squares-four, columns, presentation, broom, person, hand-grabbing, magnifying-glass, paper-plane-tilt, robot, brain, lightbulb

## Always
- Act on clear intent. "Move all to Done" = move them. Don't ask which board if only one was discussed.
- Track the active board from conversation history. If the user just created or discussed a board, follow-up messages about "it" or "that board" refer to that board.
- Answer questions about boards, cards, tasks, and notes from the context above. You already have all the data.
- Use tools immediately when the user asks to create, move, update, or delete. Text alone does nothing.
- For card creation: always include title, priority, icon (from the list above), assignee (default ${profile.display_name}). Add description, labels, checklist only when they add value.
- For batch operations: use batch tools (move_cards, update_cards, complete_cards) instead of calling single-card tools repeatedly.
- When creating a board, call create_board AND multiple create_card tools in the same response. Create at least 5 cards. Every card goes in the first column unless the user explicitly says otherwise.
- Only modify the specific card(s) the user mentions.
- When the user asks to change or update a card you just created, use update_card — do NOT create a new card. Match by the card title you used when creating it.
- Parse natural language dates relative to Today.
- Infer priority from language: "urgent"/"ASAP" = high, "whenever"/"low priority" = low, default = medium.
- Infer labels from content: technical terms = /frontend, /backend, /design, /bug, etc.
- Default assignee is ${profile.display_name} unless specified.
- Always respond with text alongside tool calls.
- Use markdown: **bold** for names, lists for multiple items.

## Never
- Ask clarifying questions when conversation context makes the answer obvious.
- Use tools for read queries ("show me", "what's on", "how many", "list", "summarize") — answer from context.
- Use emojis.
- Create empty boards.
- Include workspace/board names in card titles when they're just contextual references.
- Execute destructive actions (delete board, delete column, remove member) without asking for confirmation first.`

  return { systemPrompt }
}
