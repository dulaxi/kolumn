import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { buildContext } from "./context.ts"
import { TOOLS } from "./tools.ts"
import { SSEWriter, sseHeaders } from "./stream.ts"
import { checkTier, filterToolsForMode, isContinuationMessage, Mode, UsageCheckError } from "./tier.ts"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const TITLE_SYSTEM_PROMPT =
  "You name chat conversations. Given the first exchange of a conversation, reply with ONLY a short title for it: 2-5 words, no quotes, no trailing punctuation, no emojis. Capture the topic, not the greeting."

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

// Resolves an array of label text strings into label IDs (via the upsert_label
// RPC, which creates labels that don't yet exist) and syncs the card_labels
// join table for a given card.
//
// Semantics:
//   - texts === undefined  → no-op (the tool call didn't include a labels field)
//   - texts === null / []  → clear all labels on the card
//   - non-empty list       → resolve each text, delete rows not in result set, upsert the rest
//
// NOTE: this function is defined here so the edge function owns the resolver
// for future server-side tool execution. In the current architecture, tool
// execution happens client-side (toolExecutor.js) which calls an equivalent
// resolveAndSyncLabels helper. The two must stay in sync.
async function resolveAndSyncLabels(
  supabase: SupabaseClient,
  cardId: string,
  boardId: string,
  texts: string[] | undefined | null,
): Promise<void> {
  if (texts === undefined) return
  const list = texts ?? []
  const resolvedIds: string[] = []
  for (const text of list) {
    if (!text || !text.trim()) continue
    const { data, error } = await supabase.rpc("upsert_label", { p_board_id: boardId, p_text: text })
    if (error) throw error
    if (data) resolvedIds.push(data as string)
  }
  if (resolvedIds.length === 0) {
    await supabase.from("card_labels").delete().eq("card_id", cardId)
  } else {
    await supabase
      .from("card_labels")
      .delete()
      .eq("card_id", cardId)
      .not("label_id", "in", `(${resolvedIds.join(",")})`)
    await supabase
      .from("card_labels")
      .upsert(
        resolvedIds.map((label_id) => ({ card_id: cardId, label_id })),
        { onConflict: "card_id,label_id" },
      )
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed", message: "Method not allowed" })
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!anthropicKey) {
    return json(500, { error: "misconfigured", message: "Chat is not configured on the server." })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return json(401, { error: "missing_auth", message: "Sign in to use chat." })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return json(401, { error: "unauthorized", message: "Sign in to use chat." })
  }

  let body: {
    conversation_id?: string
    message: string | Array<Record<string, unknown>>
    history?: Array<{ role: string; content: string | Array<Record<string, unknown>> }>
    mode?: string
    boardId?: string
    today?: string // user's local date as YYYY-MM-DD
  }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: "invalid_json", message: "Invalid request." })
  }

  const hasMessage = typeof body.message === "string"
    ? body.message.trim().length > 0
    : Array.isArray(body.message) && body.message.length > 0
  if (!hasMessage) {
    return json(400, { error: "message_required", message: "Type a message first." })
  }

  // The client identifies its surface; the server enforces. Never infer
  // mode from the presence of boardId.
  if (body.mode !== "pill" && body.mode !== "chat" && body.mode !== "title") {
    return json(400, { error: "invalid_mode", message: "Invalid request." })
  }
  const mode = body.mode as Mode

  // Title mode: one-shot conversation naming. Authenticated but unbilled
  // (housekeeping, not a user message — max_tokens caps output and the
  // length clamp bounds input), no context build, no tools; history is
  // ignored.
  if (mode === "title") {
    if (typeof body.message !== "string") {
      return json(400, { error: "invalid_message", message: "Invalid request." })
    }
    if (body.message.length > 2000) {
      return json(400, { error: "invalid_message", message: "Invalid request." })
    }
    let tierInfo
    try {
      tierInfo = await checkTier(supabase, user.id, { unbilled: true })
    } catch (err) {
      console.error("[chat] title tier check threw:", err)
      return json(500, { error: "tier_check_failed", message: "Something went wrong — try again." })
    }

    const sse = new SSEWriter()
    const streamTitle = async () => {
      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: tierInfo.model,
            max_tokens: 32,
            system: TITLE_SYSTEM_PROMPT,
            messages: [{ role: "user", content: body.message }],
          }),
        })
        if (!response.ok) {
          const errorText = await response.text()
          console.error("[chat] title anthropic error:", response.status, errorText)
          sse.error(`Claude API error: ${response.status}`)
          return
        }
        const data = await response.json()
        const text = (data.content || [])
          .filter((b: { type?: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text || "")
          .join("")
        if (text) sse.write({ type: "text", content: text })
        sse.close(data.stop_reason ?? null)
      } catch (err) {
        console.error("[chat] title error:", err)
        sse.error("Title generation failed")
      }
    }
    streamTitle()
    return new Response(sse.stream, { headers: sseHeaders() })
  }

  if (mode === "pill" && !body.boardId) {
    return json(400, { error: "board_required", message: "Invalid request." })
  }
  if (mode === "chat") {
    body.boardId = undefined
  }

  // Continuations (tool_result rounds) are unbilled on BOTH surfaces — chat
  // read-tool rounds must not consume the daily message limit.
  const isContinuation = isContinuationMessage(body.message)

  // Tier check + rate limit
  let tierInfo
  try {
    tierInfo = await checkTier(supabase, user.id, { unbilled: isContinuation })
  } catch (err) {
    if (err instanceof UsageCheckError) {
      return json(503, { error: "usage_check_failed", message: "Could not verify your usage — try again in a moment." })
    }
    console.error("[chat] tier check threw:", err)
    return json(500, { error: "tier_check_failed", message: "Something went wrong — try again." })
  }

  if (!tierInfo.allowed) {
    return json(429, {
      error: "rate_limit",
      message: "You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access.",
      remaining: 0,
    })
  }

  // Pill mode is board-pinned by contract. A boardId that doesn't resolve
  // (deleted board, revoked membership, stale client) must fail loudly —
  // never fall back to full multi-board context.
  if (mode === "pill") {
    const { data: pillBoard } = await supabase
      .from("boards")
      .select("id")
      .eq("id", body.boardId!)
      .maybeSingle()
    if (!pillBoard) {
      return json(404, { error: "board_not_found", message: "Board not found — it may have been deleted." })
    }
  }

  const { systemPrompt } = await buildContext(supabase, user.id, {
    boardId: body.boardId,
    today: body.today,
    mode,
  })

  const messages: Array<{ role: string; content: unknown }> = [
    ...(body.history || []),
    { role: "user", content: body.message },
  ]

  const sse = new SSEWriter()

  // Send tier info as first SSE event
  sse.write({ type: "tier", tier: tierInfo.tier, remaining: tierInfo.remaining })

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
          model: tierInfo.model,
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: filterToolsForMode(TOOLS, tierInfo.tier, mode),
          messages,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[chat] anthropic error:", response.status, errorText)
        sse.error(`Claude API error: ${response.status}`)
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
      let currentToolId = ""
      let currentToolInput = ""
      let stopReason: string | null = null

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
                currentToolId = event.content_block.id
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
                  sse.write({ type: "tool_call", id: currentToolId, action: currentToolName, params })
                } catch {
                  sse.write({ type: "tool_call", id: currentToolId, action: currentToolName, params: {} })
                }
                currentToolName = ""
                currentToolId = ""
                currentToolInput = ""
              }
            } else if (event.type === "message_delta") {
              if (event.delta?.stop_reason) stopReason = event.delta.stop_reason
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      sse.close(stopReason)
    } catch (err) {
      console.error("[chat] stream error:", err)
      sse.error("Stream error")
    }
  }

  streamToClient()

  return new Response(sse.stream, { headers: sseHeaders() })
})
