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
      const count = bCards.filter((c: any) => c.column_id === col.id && !c.completed).length
      return `${col.title} (${count})`
    }).join(", ")
    return `- ${b.name}: ${colSummary} [${bCards.length} total cards]`
  }).join("\n")

  const dueTodayList = dueToday.length > 0
    ? dueToday.map((c: any) => `- ${c.title}`).join("\n")
    : "None"

  const overdueList = overdue.length > 0
    ? overdue.map((c: any) => `- ${c.title} (due ${c.due_date})`).join("\n")
    : "None"

  const notesSummary = notes.length > 0
    ? notes.map((n: any) => `- ${n.title}: ${(n.content || "").slice(0, 200)}`).join("\n")
    : "No notes"

  const memberList = members.map((m: any) => m.display_name).join(", ")

  const systemPrompt = `You are Kolumn, an AI assistant for a kanban project management app. You help users manage their boards, cards, and workflow.

User: ${profile.display_name}
Team members: ${memberList || "None"}
Workspaces: ${workspaceList.length > 0 ? workspaceList.join(", ") : "None"}

## Current boards
${boardSummary || "No boards yet"}

## Due today
${dueTodayList}

## Overdue
${overdueList}

## Recent activity (7 days)
- Created: ${recentCreated.length} cards
- Completed: ${recentCompleted.length} cards

## Notes
${notesSummary}

## Available icons (use ONLY these exact names, kebab-case)
house, star, heart, bookmark, tag, flag, target, trophy, gift, briefcase, buildings, user, users, users-three, graduation-cap, code, terminal, bug, cpu, monitor, device-mobile, laptop, database, gear, file-text, folder, clipboard, note, notepad, article, envelope, chat-circle, megaphone, bell, phone, calendar-blank, clock, hourglass, timer, camera, image, credit-card, currency-dollar, money, receipt, shopping-cart, airplane, car, rocket, truck, sun, moon, cloud, lightning, fire, leaf, tree, coffee, fork-knife, cake, pencil-simple, paint-brush, wrench, hammer, toolbox, key, lock, shield, check-circle, warning, sparkle, kanban, list, table, chart-bar, chart-pie, squares-four, columns, presentation, broom, person, hand-grabbing, magnifying-glass, paper-plane-tilt, robot, brain, lightbulb

## Rules
- Answer questions about boards, cards, tasks, and notes directly from the context above. You already have all the data — never use tools to look things up.
- ONLY use tools when the user EXPLICITLY asks to create, move, update, or delete something. Words like "tell me about", "what are", "show me", "summarize", "list", "how many" are READ queries — answer from context, never create or modify anything.
- If the user's intent is ambiguous, answer with information rather than taking action.
- When the user asks you to create, move, update, or delete something, you MUST call the appropriate tool immediately. Do NOT just say "I'll create it" or "Let me do that" without calling the tool. The tool call is what actually performs the action — your text alone does nothing.
- When creating cards, fill in as many fields as you can infer. Always include: title, priority, icon (from the list above), and assignee (default ${profile.display_name}). Add description, labels, and checklist only when they add real value — don't pad with obvious or generic content. If the user specifies fields explicitly, their instructions override these defaults.
- When the user asks to change, edit, or update a card you just created, use the update_card tool — do NOT create a new card. Match by the card title you used when creating it.
- Only modify the specific card(s) the user mentions. If the user says "change the first one", update only that card — do not recreate or touch the others.
- Workspace and board names are contextual references, NOT part of the task. If a user says "hire a janitor for charcoal industry", and "charcoal industry" is a workspace name, the card title should be "Hire janitor" — not "Hire janitor for charcoal industry".
- Infer priority from language: "urgent"/"ASAP" → high, "whenever"/"low priority" → low, default → medium.
- Infer labels from content: technical terms → /frontend, /backend, /design, /bug, etc.
- Generate checklist items for complex cards.
- Default assignee is ${profile.display_name} unless specified otherwise.
- Parse natural language dates: "Friday" → next Friday, "tomorrow" → +1 day, "end of week" → Friday.
- CRITICAL: When creating a board, you MUST call create_board AND multiple create_card tools ALL in the same response. Never stop after just create_board. Create at least 5 cards. Place ALL cards in the first column (e.g. Backlog or To Do) — a new board starts with nothing in progress or done. Never create an empty board.
- For destructive actions (delete), always ask for confirmation first.
- Keep responses concise and actionable.
- Never use emojis in responses.
- Always respond with text. Never respond with only a tool call and no text.
- Use markdown formatting: **bold** for card/board names, lists for multiple items, headings for sections.`

  return { systemPrompt }
}
