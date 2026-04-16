# AI Edge Function Implementation Plan (Plan A of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Supabase Edge Function that receives user messages, queries board/card/note context, calls Claude with tool definitions, and streams the response back via SSE. Testable independently with curl before any frontend changes.

**Architecture:** Single Edge Function (`chat`) on Deno runtime. Authenticates via Supabase JWT, queries user data server-side, builds a system prompt with full context, calls Claude's Messages API with streaming, and forwards SSE events to the client. Tool definitions let Claude decide which board actions to take.

**Tech Stack:** Supabase Edge Functions (Deno), Claude Messages API (HTTP), Supabase JS client (server-side), SSE streaming.

**Spec:** `docs/superpowers/specs/2026-04-16-ai-capabilities-design.md`

**Supabase project:** `fiqyuppcqwtvlykxxsni`

---

## File Structure

**Create:**
- `supabase/functions/chat/index.ts` — main Edge Function handler
- `supabase/functions/chat/context.ts` — builds system prompt from user data
- `supabase/functions/chat/tools.ts` — Claude tool definitions
- `supabase/functions/chat/stream.ts` — SSE response helper

---

### Task 1: Initialize Supabase Edge Functions

**Files:**
- Create: `supabase/functions/chat/index.ts` (stub)

- [ ] **Step 1: Check Supabase CLI is available**

Run: `npx supabase --version`
Expected: version number (e.g. `2.x.x`). If not installed, run `npm install -D supabase`.

- [ ] **Step 2: Create the function scaffold**

Run: `npx supabase functions new chat`

This creates `supabase/functions/chat/index.ts` with a hello-world handler.

- [ ] **Step 3: Set the Claude API key as a secret**

Run:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=<your-key> --project-ref fiqyuppcqwtvlykxxsni
```

Note: the user must provide their Anthropic API key here. This is stored encrypted in Supabase, not in code.

- [ ] **Step 4: Verify deployment works**

Run:
```bash
npx supabase functions deploy chat --project-ref fiqyuppcqwtvlykxxsni
```

Expected: deployed successfully.

Test with curl:
```bash
curl -X POST https://fiqyuppcqwtvlykxxsni.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```

Expected: hello-world response (default scaffold).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/
git commit -m "chore: scaffold chat Edge Function"
```

---

### Task 2: Create tool definitions

**Files:**
- Create: `supabase/functions/chat/tools.ts`

- [ ] **Step 1: Write tool definitions**

Create `supabase/functions/chat/tools.ts`:

```typescript
export const TOOLS = [
  {
    name: "create_card",
    description: "Create a new card on a kanban board. Populate all fields you can infer from context — icon, description, priority, labels, checklist, assignee, due_date.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Card title" },
        description: { type: "string", description: "Detailed card description" },
        board: { type: "string", description: "Board name to create the card in" },
        column: { type: "string", description: "Column name (defaults to first column if omitted)" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Card priority" },
        icon: { type: "string", description: "Phosphor icon name (e.g. Layout, CreditCard, Bug)" },
        labels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              color: { type: "string", enum: ["red", "blue", "green", "yellow", "purple", "pink", "gray"] },
            },
            required: ["text", "color"],
          },
          description: "Labels to attach to the card",
        },
        checklist: {
          type: "array",
          items: { type: "string" },
          description: "Checklist items (subtasks)",
        },
        assignee: { type: "string", description: "Display name of assignee" },
        due_date: { type: "string", description: "Due date as ISO string (YYYY-MM-DD)" },
      },
      required: ["title"],
    },
  },
  {
    name: "move_card",
    description: "Move a card to a different column on the same or different board.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to move" },
        to_column: { type: "string", description: "Destination column name" },
        to_board: { type: "string", description: "Destination board name (if moving across boards)" },
      },
      required: ["card_title", "to_column"],
    },
  },
  {
    name: "update_card",
    description: "Update one or more fields on an existing card.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to update" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            icon: { type: "string" },
            labels: { type: "array", items: { type: "object", properties: { text: { type: "string" }, color: { type: "string" } } } },
            checklist: { type: "array", items: { type: "string" } },
            assignee: { type: "string" },
            due_date: { type: "string" },
          },
          description: "Fields to update",
        },
      },
      required: ["card_title", "updates"],
    },
  },
  {
    name: "delete_card",
    description: "Delete a card. Always ask the user for confirmation before executing this action.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to delete" },
        board: { type: "string", description: "Board name the card belongs to" },
      },
      required: ["card_title"],
    },
  },
  {
    name: "create_board",
    description: "Create a new kanban board with custom columns.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Board name" },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Column names in order (defaults to To Do, In Progress, Done)",
        },
        icon: { type: "string", description: "Phosphor icon name for the board" },
      },
      required: ["name"],
    },
  },
  {
    name: "search_cards",
    description: "Search cards across all accessible boards. Use this for finding cards, listing due/overdue items, or answering questions about what exists.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query — matched against card titles, descriptions, labels" },
        filters: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["low", "medium", "high"] },
            assignee: { type: "string" },
            due: { type: "string", enum: ["today", "overdue", "this_week"] },
            board: { type: "string" },
            completed: { type: "boolean" },
          },
          description: "Optional filters to narrow results",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "summarize_board",
    description: "Get a summary of a board's current state — columns, card counts, who's working on what, blockers.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name to summarize" },
      },
      required: ["board"],
    },
  },
] as const
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/chat/tools.ts
git commit -m "feat(ai): add Claude tool definitions for board actions"
```

---

### Task 3: Create context builder

**Files:**
- Create: `supabase/functions/chat/context.ts`

- [ ] **Step 1: Write context builder**

Create `supabase/functions/chat/context.ts`:

```typescript
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

interface BoardContext {
  boards: Array<{ id: string; name: string; icon: string | null }>
  columns: Array<{ id: string; board_id: string; title: string; position: number }>
  cards: Array<{
    id: string; board_id: string; column_id: string; title: string;
    description: string | null; priority: string; assignee_name: string | null;
    assignees: string[] | null; due_date: string | null; labels: any[];
    checklist: any[]; icon: string | null; completed: boolean;
    created_at: string; updated_at: string;
  }>
  notes: Array<{ id: string; title: string; content: string }>
  members: Array<{ display_name: string }>
  profile: { display_name: string }
}

export async function buildContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ systemPrompt: string; boardContext: BoardContext }> {
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

  // Collect unique workspace member names from board_members
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

## Rules
- When creating cards, always populate: title, description, priority, icon (pick from Phosphor icon library), and labels when relevant.
- Infer priority from language: "urgent"/"ASAP" → high, "whenever"/"low priority" → low, default → medium.
- Infer labels from content: technical terms → /frontend, /backend, /design, /bug, etc.
- Generate checklist items for complex cards.
- Default assignee is ${profile.display_name} unless specified otherwise.
- Parse natural language dates: "Friday" → next Friday, "tomorrow" → +1 day, "end of week" → Friday.
- For destructive actions (delete), always ask for confirmation first.
- Keep responses concise and actionable.
- Use markdown formatting: **bold** for card/board names, lists for multiple items, headings for sections.`

  return {
    systemPrompt,
    boardContext: { boards, columns, cards, notes, members, profile },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/chat/context.ts
git commit -m "feat(ai): add context builder for system prompt injection"
```

---

### Task 4: Create SSE stream helper

**Files:**
- Create: `supabase/functions/chat/stream.ts`

- [ ] **Step 1: Write stream helper**

Create `supabase/functions/chat/stream.ts`:

```typescript
export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
}

export function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export class SSEWriter {
  private encoder = new TextEncoder()
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  public stream: ReadableStream<Uint8Array>

  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
      },
    })
  }

  write(data: Record<string, unknown>) {
    this.controller?.enqueue(this.encoder.encode(sseEvent(data)))
  }

  close() {
    this.write({ type: "done" })
    this.controller?.close()
  }

  error(message: string) {
    this.write({ type: "error", content: message })
    this.controller?.close()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/chat/stream.ts
git commit -m "feat(ai): add SSE streaming helper for Edge Function"
```

---

### Task 5: Create the chat Edge Function

**Files:**
- Modify: `supabase/functions/chat/index.ts`

- [ ] **Step 1: Write the main handler**

Replace `supabase/functions/chat/index.ts` with:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { buildContext } from "./context.ts"
import { TOOLS } from "./tools.ts"
import { SSEWriter, sseHeaders } from "./stream.ts"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!anthropicKey) {
    return new Response("ANTHROPIC_API_KEY not configured", { status: 500 })
  }

  // Auth: extract user from Supabase JWT
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response("Missing authorization header", { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Parse request body
  let body: { conversation_id?: string; message: string; history?: Array<{ role: string; content: string }> }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  if (!body.message?.trim()) {
    return new Response("Message is required", { status: 400 })
  }

  // Build context
  const { systemPrompt } = await buildContext(supabase, user.id)

  // Build messages array (conversation history + new message)
  const messages: Array<{ role: string; content: string }> = [
    ...(body.history || []),
    { role: "user", content: body.message },
  ]

  // Start SSE stream
  const sse = new SSEWriter()

  // Call Claude in the background, pipe to SSE
  const streamToClient = async () => {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: systemPrompt,
          tools: TOOLS,
          messages,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        sse.error(`Claude API error: ${response.status} ${errorText}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        sse.error("No response body")
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let currentToolName = ""
      let currentToolInput = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") continue

          try {
            const event = JSON.parse(data)

            if (event.type === "content_block_start") {
              if (event.content_block?.type === "tool_use") {
                currentToolName = event.content_block.name
                currentToolInput = ""
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta?.type === "text_delta") {
                sse.write({ type: "text", content: event.delta.text })
              } else if (event.delta?.type === "input_json_delta") {
                currentToolInput += event.delta.partial_json
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolName) {
                try {
                  const params = JSON.parse(currentToolInput)
                  sse.write({ type: "tool_call", action: currentToolName, params })
                } catch {
                  sse.write({ type: "tool_call", action: currentToolName, params: {} })
                }
                currentToolName = ""
                currentToolInput = ""
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      sse.close()
    } catch (err) {
      sse.error(`Stream error: ${(err as Error).message}`)
    }
  }

  // Fire and forget — stream runs in background while response is being sent
  streamToClient()

  return new Response(sse.stream, { headers: sseHeaders() })
})
```

- [ ] **Step 2: Deploy**

Run:
```bash
npx supabase functions deploy chat --project-ref fiqyuppcqwtvlykxxsni
```

Expected: deployed successfully.

- [ ] **Step 3: Test with curl**

First, get a valid JWT by signing in:
```bash
curl -X POST https://fiqyuppcqwtvlykxxsni.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"<your-email>","password":"<your-password>"}'
```

Save the `access_token` from the response, then:
```bash
curl -N -X POST https://fiqyuppcqwtvlykxxsni.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What boards do I have?"}'
```

Expected: SSE stream of `data: {"type":"text","content":"..."}` events, ending with `data: {"type":"done"}`.

Test a tool call:
```bash
curl -N -X POST https://fiqyuppcqwtvlykxxsni.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Create a card called Fix login bug with high priority"}'
```

Expected: SSE stream with `{"type":"text",...}` and `{"type":"tool_call","action":"create_card","params":{...}}` events.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/chat/index.ts
git commit -m "feat(ai): implement chat Edge Function with Claude streaming + tool use"
```

---

## Self-Review

**Spec coverage:**
- Edge Function handler → Task 5 ✓
- Auth (Supabase JWT) → Task 5 ✓
- Context builder (boards, cards, columns, notes, members, activity) → Task 3 ✓
- Tool definitions (all 7 tools) → Task 2 ✓
- Claude API call with streaming → Task 5 ✓
- SSE response format → Task 4 ✓
- Model routing (Haiku/Sonnet) → Task 5 uses Haiku as default; routing logic deferred to Plan C (tier system)
- Tier/rate limit checks → deferred to Plan C

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `buildContext` returns `{ systemPrompt, boardContext }`. `TOOLS` array matches spec tool definitions. SSE events use `{ type, content }` for text and `{ type, action, params }` for tool calls — consistent with spec SSE format.

**Note:** Model routing and tier enforcement are intentionally deferred to Plan C. This plan uses Haiku as the default model. Plan C will add the routing logic and rate limiting.
