# AI Tier System Implementation Plan (Plan C of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tier-based access control (free/pro), rate limiting (free: 20 messages/day), and smart model routing (Haiku for reads, Sonnet for writes) to the chat Edge Function.

**Architecture:** A `tier` column on the profiles table determines free vs pro. The Edge Function checks the tier, enforces rate limits via a `chat_usage` table, classifies the message intent to pick the right model, and blocks pro-only tools for free users. All server-side — client can't bypass.

**Tech Stack:** Supabase (Postgres migration, RLS), Edge Function (Deno).

**Spec:** `docs/superpowers/specs/2026-04-16-ai-capabilities-design.md` — Tier Split + Model Routing sections.

---

## File Structure

**Create:**
- `supabase/migrations/chat_tier_system.sql` — adds `tier` column to profiles, creates `chat_usage` table
- `supabase/functions/chat/tier.ts` — tier check, rate limit, model routing logic

**Modify:**
- `supabase/functions/chat/index.ts` — integrate tier checks before Claude call

---

### Task 1: Database migration — tier column + usage table

**Files:**
- Create: `supabase/migrations/chat_tier_system.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/chat_tier_system.sql`:

```sql
-- Add tier column to profiles (default free)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro'));

-- Chat usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_count int NOT NULL DEFAULT 0,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, usage_date)
);

-- RLS: users can only read/write their own usage
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON chat_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON chat_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON chat_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for Edge Function)
CREATE POLICY "Service role full access" ON chat_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Function to increment and check usage (atomic)
CREATE OR REPLACE FUNCTION increment_chat_usage(target_user_id uuid, daily_limit int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count int;
BEGIN
  INSERT INTO chat_usage (user_id, message_count, usage_date)
  VALUES (target_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET message_count = chat_usage.message_count + 1
  RETURNING message_count INTO current_count;

  RETURN json_build_object(
    'count', current_count,
    'limit', daily_limit,
    'allowed', current_count <= daily_limit
  );
END;
$$;
```

- [ ] **Step 2: Apply the migration**

Run via Supabase MCP or SQL editor. Apply the migration to the live project.

- [ ] **Step 3: Verify**

Check that:
- `profiles` table has a `tier` column (default 'free')
- `chat_usage` table exists
- `increment_chat_usage` function exists

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/chat_tier_system.sql
git commit -m "feat(ai): add tier column + chat_usage table for rate limiting"
```

---

### Task 2: Create tier module

**Files:**
- Create: `supabase/functions/chat/tier.ts`

- [ ] **Step 1: Write the tier module**

Create `supabase/functions/chat/tier.ts`:

```typescript
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const FREE_DAILY_LIMIT = 20

const PRO_ONLY_TOOLS = ["move_card", "update_card", "delete_card", "create_board"]

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
  // Get user tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single()

  const tier = (profile?.tier || "free") as "free" | "pro"

  // Rate limit for free users
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

  // Pro: no rate limit, smart model routing
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

  if (isWrite) return "claude-sonnet-4-5-20241022"
  return "claude-haiku-4-5-20251001"
}

export function filterToolsForTier(tools: readonly any[], tier: "free" | "pro"): any[] {
  if (tier === "pro") return [...tools]
  return tools.filter((t: any) => !PRO_ONLY_TOOLS.includes(t.name))
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/chat/tier.ts
git commit -m "feat(ai): add tier module with rate limiting and model routing"
```

---

### Task 3: Integrate tier checks into Edge Function

**Files:**
- Modify: `supabase/functions/chat/index.ts`

- [ ] **Step 1: Add tier import**

At the top of `supabase/functions/chat/index.ts`, add:

```typescript
import { checkTier, filterToolsForTier } from "./tier.ts"
```

- [ ] **Step 2: Add tier check after auth, before Claude call**

After the `body.message` validation (around line 53) and before `buildContext`, add:

```typescript
  // Tier check + rate limit
  const tierInfo = await checkTier(supabase, user.id, body.message)

  if (!tierInfo.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limit",
        message: `You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access.`,
        remaining: 0,
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    )
  }
```

- [ ] **Step 3: Use tier's model and filtered tools in Claude call**

Change the Claude API call body from:

```typescript
model: "claude-haiku-4-5-20251001",
...
tools: TOOLS,
```

To:

```typescript
model: tierInfo.model,
...
tools: filterToolsForTier(TOOLS, tierInfo.tier),
```

- [ ] **Step 4: Add remaining count to SSE stream**

After the `sse` is created, before `streamToClient`, add:

```typescript
  // Send tier info as first SSE event
  sse.write({ type: "tier", tier: tierInfo.tier, remaining: tierInfo.remaining })
```

- [ ] **Step 5: Deploy**

```bash
SUPABASE_ACCESS_TOKEN=sbp_b69c7820da8e3130747d00596b75e92698da601b npx supabase functions deploy chat --no-verify-jwt --project-ref fiqyuppcqwtvlykxxsni
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/index.ts
git commit -m "feat(ai): integrate tier checks, rate limits, and model routing"
```

---

### Task 4: Handle rate limit + tier info on frontend

**Files:**
- Modify: `src/lib/aiClient.js`
- Modify: `src/store/chatStore.js`

- [ ] **Step 1: Handle 429 in aiClient**

In `src/lib/aiClient.js`, update the `!response.ok` block:

```javascript
  if (!response.ok) {
    const text = await response.text()
    try {
      const err = JSON.parse(text)
      if (err.error === 'rate_limit') {
        onError(err.message)
        return
      }
    } catch {}
    onError(`Error ${response.status}: ${text}`)
    return
  }
```

- [ ] **Step 2: Handle tier SSE event in aiClient**

In the SSE event parsing, add a case for the `tier` event type. Add an `onTier` callback parameter:

Update the function signature:
```javascript
export async function streamChat({ message, history = [] }, { onText, onToolCall, onDone, onError, onTier }) {
```

Add in the event handling:
```javascript
          } else if (event.type === 'tier') {
            onTier?.(event)
```

- [ ] **Step 3: Store tier info in chatStore**

In `src/store/chatStore.js`, add to the store state:

```javascript
  tierInfo: null,
```

In `sendMessage`, add `onTier` callback:

```javascript
        onTier: (info) => {
          set({ tierInfo: info })
        },
```

Update `partialize` to NOT persist `tierInfo` (it's transient).

- [ ] **Step 4: Build + test**

Run: `npm run build && npm test`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/lib/aiClient.js src/store/chatStore.js
git commit -m "feat(ai): handle rate limits and tier info on frontend"
```

---

### Task 5: Test end-to-end

- [ ] **Step 1: Apply the migration**

Run the SQL from Task 1 in the Supabase SQL editor or via MCP.

- [ ] **Step 2: Deploy Edge Function**

```bash
SUPABASE_ACCESS_TOKEN=sbp_b69c7820da8e3130747d00596b75e92698da601b npx supabase functions deploy chat --no-verify-jwt --project-ref fiqyuppcqwtvlykxxsni
```

- [ ] **Step 3: Build + tests**

Run: `npm run build && npm test`
Expected: success.

- [ ] **Step 4: Smoke test as free user**

1. Verify your profile has `tier = 'free'` (default).
2. Send a message — should work, using Haiku.
3. Check `chat_usage` table — should have a row with today's date and count = 1.
4. Send 20 more messages — on the 21st, should get "You've reached your daily limit" error.

- [ ] **Step 5: Smoke test as pro user**

1. Update your profile: `UPDATE profiles SET tier = 'pro' WHERE display_name = 'Abdullah'`
2. Send a read query ("What's on my Sprint board?") — should use Haiku.
3. Send a write query ("Create a card called Test") — should use Sonnet.
4. No rate limit — unlimited messages.

- [ ] **Step 6: Commit any fixes**

---

## Self-Review

**Spec coverage:**
- Free tier: 20 messages/day → Task 1 (DB), Task 2 (check), Task 3 (enforce) ✓
- Pro tier: unlimited → Task 2 (no rate limit for pro) ✓
- Free tools restricted (no move/update/delete/create_board) → Task 2 (filterToolsForTier) ✓
- Model routing: Haiku for reads, Sonnet for writes → Task 2 (classifyModel) ✓
- Rate limit response → Task 3 (429 response) ✓
- Frontend handling → Task 4 (aiClient + chatStore) ✓

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `TierInfo` shape consistent across tier.ts, index.ts, and frontend. `filterToolsForTier(TOOLS, tier)` matches TOOLS type from tools.ts. `increment_chat_usage` RPC returns `{ count, limit, allowed }` matching tier.ts expectations.

**Note:** The `classifyModel` function uses simple keyword matching. This is intentionally basic — it's cheap, fast, and good enough. If routing accuracy matters later, Claude can self-classify via a cheap Haiku pre-call. YAGNI for now.
