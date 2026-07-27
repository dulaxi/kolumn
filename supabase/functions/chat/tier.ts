import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { CHAT_READ_TOOLS } from "./tools.ts"
import { MODEL } from "./model.ts"

export type Mode = "pill" | "chat" | "title"

export class UsageCheckError extends Error {
  constructor() { super("usage check failed") }
}

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
  // Chat's read tools: their schemas say "across all their boards", which
  // contradicts the pill's locked single-board scope, and the pill prompt
  // never coaches them — the board snapshot already covers reads.
  "search_cards",
  "summarize_board",
  "get_card",
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
  opts: { unbilled?: boolean } = {},
): Promise<TierInfo> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single()
  if (profileError) console.error("[tier] profile fetch failed, degrading to free:", profileError)

  const tier = (profile?.tier || "free") as "free" | "pro"
  const model = MODEL

  // Unbilled calls — tool-result continuation rounds and title housekeeping —
  // skip the usage increment entirely.
  if (opts.unbilled) {
    return { tier, allowed: true, remaining: -1, model }
  }

  if (tier === "free") {
    const { data: usage, error: usageError } = await supabase.rpc("increment_chat_usage", {
      target_user_id: userId,
      daily_limit: FREE_DAILY_LIMIT,
    })

    // Fail CLOSED: if the usage counter is unreachable we cannot verify the
    // limit, so we refuse rather than grant unlimited free usage.
    if (usageError || !usage) {
      console.error("[tier] increment_chat_usage failed:", usageError)
      throw new UsageCheckError()
    }

    if (!usage.allowed) {
      return { tier, allowed: false, remaining: 0, model }
    }
    return { tier, allowed: true, remaining: Math.max(0, FREE_DAILY_LIMIT - (usage.count || 0)), model }
  }

  return { tier, allowed: true, remaining: -1, model: MODEL }
}

const HISTORY_MAX_ITEMS = 40
const HISTORY_MAX_CONTENT = 50000
const CONTINUATION_MAX_BLOCKS = 8
const TOOL_RESULT_MAX_CONTENT = 50000

// null = valid; otherwise a human-readable reason (the 400 message).
export function validateHistory(history: unknown): string | null {
  if (history === undefined || history === null) return null
  if (!Array.isArray(history)) return "history must be an array"
  if (history.length > HISTORY_MAX_ITEMS) return "history too long"
  for (const item of history) {
    if (!item || typeof item !== "object") return "malformed history item"
    const content = (item as any).content
    const size = typeof content === "string" ? content.length : JSON.stringify(content ?? "").length
    if (size > HISTORY_MAX_CONTENT) return "history item too large"
  }
  return null
}

// Continuations are unbilled — validate hard. Stateless linkage check: every
// tool_result must reference a tool_use id present in the supplied history.
// (Forgeable with a fabricated history; real anti-forgery needs server-side
// turn state. This blocks accidental misuse and raises abuse effort; the
// usage log line keeps the rest observable.)
export function validateContinuation(message: unknown[], history: unknown[]): string | null {
  if (message.length === 0 || message.length > CONTINUATION_MAX_BLOCKS) return "bad block count"
  const knownIds = new Set<string>()
  for (const item of Array.isArray(history) ? history : []) {
    const content = (item as any)?.content
    if (Array.isArray(content)) {
      for (const b of content) {
        if (b?.type === "tool_use" && typeof b.id === "string") knownIds.add(b.id)
      }
    }
  }
  for (const b of message) {
    if (!b || typeof b !== "object") return "malformed block"
    const block = b as any
    if (block.type !== "tool_result") return "only tool_result blocks allowed"
    if (typeof block.tool_use_id !== "string" || !block.tool_use_id) return "missing tool_use_id"
    if (!knownIds.has(block.tool_use_id)) return "tool_use_id not in history"
    if (typeof block.content === "string" && block.content.length > TOOL_RESULT_MAX_CONTENT) return "tool_result too large"
  }
  return null
}

// Effective tool list from (mode × tier). Chat gets the read-only lookup tools — ALL tiers for now; the paid-only
// gate from the (mode × tier) matrix is deferred to the tier redesign.
export function filterToolsForMode(
  tools: readonly any[],
  tier: "free" | "pro",
  mode: Mode,
): any[] {
  if (mode === "title") return []
  // Chat gets the read-only lookup tools — ALL tiers for now; the paid-only
  // gate from the (mode × tier) matrix is deferred to the tier redesign.
  if (mode === "chat") return tools.filter((t: any) => CHAT_READ_TOOLS.includes(t.name))
  const byTier = tier === "pro" ? [...tools] : tools.filter((t: any) => !PRO_ONLY_TOOLS.includes(t.name))
  return byTier.filter((t: any) => !PILL_DISALLOWED_TOOLS.includes(t.name))
}
