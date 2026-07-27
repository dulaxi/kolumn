import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { filterToolsForMode, isContinuationMessage, validateContinuation, validateHistory } from "./tier.ts"
import { MODEL } from "./model.ts"

const FAKE_TOOLS = [
  { name: "create_card" }, { name: "create_board" },
  { name: "move_card" }, { name: "update_card" }, { name: "delete_card" },
  { name: "move_cards" }, { name: "update_cards" }, { name: "complete_cards" },
  { name: "duplicate_card" }, { name: "toggle_checklist" },
  { name: "update_board" }, { name: "delete_board" },
  { name: "add_column" }, { name: "delete_column" },
  { name: "invite_member" }, { name: "remove_member" },
]

Deno.test("chat mode gets exactly the read tools, all tiers", () => {
  const withRead = [...FAKE_TOOLS, { name: "search_cards" }, { name: "summarize_board" }, { name: "get_card" }]
  const freeNames = filterToolsForMode(withRead, "free", "chat").map((t) => t.name)
  const proNames = filterToolsForMode(withRead, "pro", "chat").map((t) => t.name)
  assertEquals(freeNames, ["search_cards", "summarize_board", "get_card"])
  assertEquals(proNames, ["search_cards", "summarize_board", "get_card"])
})

Deno.test("free pill gets create_card only", () => {
  const names = filterToolsForMode(FAKE_TOOLS, "free", "pill").map((t) => t.name)
  assertEquals(names, ["create_card"])
})

Deno.test("pro pill gets all write tools except create_board", () => {
  const names = filterToolsForMode(FAKE_TOOLS, "pro", "pill").map((t) => t.name)
  assertEquals(names.length, FAKE_TOOLS.length - 1)
  assertEquals(names.includes("create_board"), false)
  assertEquals(names.includes("delete_card"), true)
})

Deno.test("title mode gets zero tools", () => {
  assertEquals(filterToolsForMode(FAKE_TOOLS, "free", "title"), [])
  assertEquals(filterToolsForMode(FAKE_TOOLS, "pro", "title"), [])
})

Deno.test("isContinuationMessage detects tool_result blocks", () => {
  assertEquals(isContinuationMessage("create 5 cards"), false)
  assertEquals(isContinuationMessage([{ type: "text", text: "hi" }]), false)
  assertEquals(
    isContinuationMessage([{ type: "tool_result", tool_use_id: "toolu_1", content: "{}" }]),
    true,
  )
  assertEquals(isContinuationMessage(undefined), false)
})

Deno.test("pill mode excludes the chat read tools for every tier", () => {
  const withRead = [...FAKE_TOOLS, { name: "search_cards" }, { name: "summarize_board" }, { name: "get_card" }]
  for (const tier of ["free", "pro"] as const) {
    const names = filterToolsForMode(withRead, tier, "pill").map((t: any) => t.name)
    if (names.includes("search_cards") || names.includes("summarize_board") || names.includes("get_card")) {
      throw new Error(`pill/${tier} leaked read tools: ${names}`)
    }
  }
})

Deno.test("checkTier model always comes from the MODEL constant", async () => {
  // classifyModel is gone; both tiers resolve the same central constant.
  // (checkTier's DB calls are unreachable here — this only checks the constant wiring
  // via the module surface: MODEL exists and tier.ts re-exports no classifyModel.)
  assertEquals(typeof MODEL, "string")
  assertEquals(MODEL.startsWith("claude-"), true)
  const tierModule = await import("./tier.ts")
  assertEquals("classifyModel" in tierModule, false)
})

Deno.test("validateHistory caps length and content size", () => {
  assertEquals(validateHistory(undefined), null)
  assertEquals(validateHistory([{ role: "user", content: "hi" }]), null)
  assertEquals(validateHistory(Array.from({ length: 41 }, () => ({ role: "user", content: "x" }))) !== null, true)
  assertEquals(validateHistory([{ role: "user", content: "y".repeat(50001) }]) !== null, true)
  assertEquals(validateHistory("nope") !== null, true)
})

Deno.test("validateContinuation enforces shape, caps, and history linkage", () => {
  const history = [
    { role: "user", content: "q" },
    { role: "assistant", content: [{ type: "tool_use", id: "toolu_1", name: "search_cards", input: {} }] },
  ]
  const good = [{ type: "tool_result", tool_use_id: "toolu_1", content: "{}" }]
  assertEquals(validateContinuation(good, history), null)
  assertEquals(validateContinuation([{ type: "text", text: "x" }], history) !== null, true)
  assertEquals(validateContinuation([{ type: "tool_result", tool_use_id: "toolu_UNKNOWN", content: "{}" }], history) !== null, true)
  assertEquals(validateContinuation([{ type: "tool_result", tool_use_id: "toolu_1", content: "z".repeat(50001) }], history) !== null, true)
  assertEquals(validateContinuation(Array.from({ length: 9 }, () => ({ type: "tool_result", tool_use_id: "toolu_1", content: "{}" })), history) !== null, true)
})

Deno.test("validateContinuation rejects non-string tool_result content", () => {
  const history = [
    { role: "user", content: "q" },
    { role: "assistant", content: [{ type: "tool_use", id: "toolu_1", name: "search_cards", input: {} }] },
  ]
  const arrayContent = [{ type: "tool_result", tool_use_id: "toolu_1", content: [{ type: "text", text: "x" }] }]
  assertEquals(validateContinuation(arrayContent, history) !== null, true)
})
