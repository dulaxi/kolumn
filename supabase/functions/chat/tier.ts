import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export type Mode = "pill" | "chat"

const FREE_DAILY_LIMIT = 20

const PRO_ONLY_TOOLS = [
  "move_card", "update_card", "delete_card",
  "move_cards", "update_cards", "complete_cards",
  "duplicate_card", "toggle_checklist",
  "update_board", "delete_board", "add_column", "delete_column",
  "invite_member", "remove_member",
]

// Tools that are NOT callable from the pill (board-scoped surface).
// The pill operates on its host board; calling a tool that creates a
// new top-level board doesn't fit that mental model.
const PILL_DISALLOWED_TOOLS = [
  "create_board",
]

export interface TierInfo {
  tier: "free" | "pro"
  allowed: boolean
  remaining: number
  model: string
}

// True when the incoming `message` is a continuation round of the pill loop:
// an array of content blocks containing at least one tool_result. Continuations
// don't count against the daily limit — only user-initiated messages do.
export function isContinuationMessage(message: unknown): boolean {
  return Array.isArray(message) &&
    message.some((b) => b && typeof b === "object" && (b as any).type === "tool_result")
}

export async function checkTier(
  supabase: SupabaseClient,
  userId: string,
  opts: { isContinuation?: boolean } = {},
): Promise<TierInfo> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single()

  const tier = (profile?.tier || "free") as "free" | "pro"
  const model = "claude-haiku-4-5-20251001"

  // Continuation rounds ride on the user-initiated message that started the
  // loop — skip the usage increment entirely.
  if (opts.isContinuation) {
    return { tier, allowed: true, remaining: -1, model }
  }

  if (tier === "free") {
    const { data: usage } = await supabase.rpc("increment_chat_usage", {
      target_user_id: userId,
      daily_limit: FREE_DAILY_LIMIT,
    })

    if (usage && !usage.allowed) {
      return { tier, allowed: false, remaining: 0, model }
    }
    return { tier, allowed: true, remaining: Math.max(0, FREE_DAILY_LIMIT - (usage?.count || 0)), model }
  }

  return { tier, allowed: true, remaining: -1, model: classifyModel("") }
}

// Effective tool list from (mode × tier). Chat is conversation-only this
// phase — read tools (search_cards, summarize_board) are a later phase.
export function filterToolsForMode(
  tools: readonly any[],
  tier: "free" | "pro",
  mode: Mode,
): any[] {
  if (mode === "chat") return []
  const byTier = tier === "pro" ? [...tools] : tools.filter((t: any) => !PRO_ONLY_TOOLS.includes(t.name))
  return byTier.filter((t: any) => !PILL_DISALLOWED_TOOLS.includes(t.name))
}

function classifyModel(message: string): string {
  const lower = message.toLowerCase()

  const writePatterns = [
    "create", "make", "add", "build", "new card", "new board",
    "move", "update", "change", "edit", "set", "assign", "delete",
    "remove", "generate", "write", "draft", "break down", "turn into",
  ]

  const isWrite = writePatterns.some((p) => lower.includes(p))

  if (isWrite) return "claude-haiku-4-5-20251001"
  return "claude-haiku-4-5-20251001"
}
