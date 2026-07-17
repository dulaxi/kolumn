// Edge function: /functions/v1/account/{sessions|revoke|delete-account}
//
// Account-security operations the browser cannot perform:
//   GET  /sessions        — list the caller's auth sessions (device, geo, times)
//   POST /revoke          — kill one non-current session      { session_id }
//   POST /delete-account  — delete the caller's account (block-if-shared)
//
// Caller identity comes ONLY from the verified JWT. The service-role client
// is used for the admin RPCs and user deletion; it never acts on a
// client-supplied user id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

// --- user-agent → "Chrome · Windows" -----------------------------------
function parseDevice(ua: string | null): string {
  if (!ua) return "Unknown device"
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser"
  const os = /Windows NT/.test(ua) ? "Windows"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown OS"
  return `${browser} · ${os}`
}

// --- ip → "City, Country" (best effort) ---------------------------------
const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/

async function geolocate(ip: string | null, cache: Map<string, string>): Promise<string> {
  if (!ip || PRIVATE_IP.test(ip)) return "—"
  const hit = cache.get(ip)
  if (hit) return hit
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2000)
    const res = await fetch(`https://ipwho.is/${ip}`, { signal: ctrl.signal })
    clearTimeout(timer)
    const data = await res.json()
    const loc = data?.success && data.city && data.country
      ? `${data.city}, ${data.country}`
      : ip
    cache.set(ip, loc)
    return loc
  } catch {
    return ip
  }
}

// --- JWT payload (already verified by getUser) --------------------------
function jwtClaims(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(b64))
  } catch {
    return {}
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json(500, { error: "missing_env" })
  }

  // Verify the caller
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" })
  const token = authHeader.slice(7)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json(401, { error: "unauthorized" })

  const admin = createClient(supabaseUrl, serviceKey)
  const url = new URL(req.url)
  // path is /account or /account/<route>
  const route = url.pathname.split("/").filter(Boolean).pop()

  // ---- GET /sessions ----------------------------------------------------
  if (route === "sessions" && req.method === "GET") {
    const { data, error } = await admin.rpc("admin_list_sessions", { p_user_id: user.id })
    if (error) return json(500, { error: "sessions_failed" })
    const currentSessionId = jwtClaims(token)["session_id"] ?? null
    const geoCache = new Map<string, string>()
    const sessions = await Promise.all((data ?? []).map(async (s: {
      id: string; created_at: string; updated_at: string | null
      refreshed_at: string | null; user_agent: string | null; ip: string | null
    }) => ({
      id: s.id,
      device: parseDevice(s.user_agent),
      user_agent: s.user_agent ?? "",
      ip: s.ip ?? "",
      location: await geolocate(s.ip, geoCache),
      created_at: s.created_at,
      last_active_at: s.refreshed_at ?? s.updated_at ?? s.created_at,
      current: s.id === currentSessionId,
    })))
    return json(200, { sessions })
  }

  // ---- POST /revoke -------------------------------------------------------
  if (route === "revoke" && req.method === "POST") {
    let body: { session_id?: string }
    try {
      body = await req.json()
    } catch {
      return json(400, { error: "invalid_body" })
    }
    const sessionId = body.session_id
    if (!sessionId) return json(400, { error: "invalid_body" })
    if (sessionId === jwtClaims(token)["session_id"]) {
      return json(400, { error: "cannot_revoke_current" })
    }
    const { data, error } = await admin.rpc("admin_revoke_session", {
      p_user_id: user.id,
      p_session_id: sessionId,
    })
    if (error) return json(500, { error: "revoke_failed" })
    if (!data) return json(404, { error: "not_found" })
    return json(200, { ok: true })
  }

  // ---- POST /delete-account ------------------------------------------------
  if (route === "delete-account" && req.method === "POST") {
    // Block while the caller owns workspaces/boards that other people belong to.
    const [ws, bd] = await Promise.all([
      admin.from("workspaces")
        .select("id, name, workspace_members!inner(user_id)")
        .eq("owner_id", user.id)
        .neq("workspace_members.user_id", user.id),
      admin.from("boards")
        .select("id, name, board_members!inner(user_id)")
        .eq("owner_id", user.id)
        .neq("board_members.user_id", user.id),
    ])
    if (ws.error || bd.error) return json(500, { error: "ownership_check_failed" })
    const blockers = [
      ...(ws.data ?? []).map((w: { name: string }) => ({ type: "workspace", name: w.name })),
      ...(bd.data ?? []).map((b: { name: string }) => ({ type: "board", name: b.name })),
    ]
    if (blockers.length > 0) {
      return json(409, { error: "owned_shared_resources", blockers })
    }
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return json(500, { error: "delete_failed" })
    return json(200, { ok: true })
  }

  return json(405, { error: "method_not_allowed" })
})
