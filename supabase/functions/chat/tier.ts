import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

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

export async function checkTier(
  supabase: SupabaseClient,
  userId: string,
  userMessage: string,
): Promise<TierInfo> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single()

  const tier = (profile?.tier || "free") as "free" | "pro"

  if (tier === "free") {
    const { data: usage } = await supabase.rpc("increment_chat_usage", {
      target_user_id: userId,
      daily_limit: FREE_DAILY_LIMIT,
    })

    if (usage && !usage.allowed) {
      return {
        tier,
        allowed: false,
        remaining: 0,
        model: "claude-haiku-4-5-20251001",
      }
    }

    return {
      tier,
      allowed: true,
      remaining: Math.max(0, FREE_DAILY_LIMIT - (usage?.count || 0)),
      model: "claude-haiku-4-5-20251001",
    }
  }

  const model = classifyModel(userMessage)
  return { tier, allowed: true, remaining: -1, model }
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

export function filterToolsForTier(
  tools: readonly any[],
  tier: "free" | "pro",
  opts: { pillMode?: boolean } = {},
): any[] {
  let filtered = tier === "pro" ? [...tools] : tools.filter((t: any) => !PRO_ONLY_TOOLS.includes(t.name))
  if (opts.pillMode) {
    filtered = filtered.filter((t: any) => !PILL_DISALLOWED_TOOLS.includes(t.name))
  }
  return filtered
}
