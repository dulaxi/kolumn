import { supabase } from './supabase'
import { logError } from '../utils/logger'

// Sync layer for chat persistence: owns the snake_case (DB) ↔ store field
// mapping and the bounded keyset read shapes. Server is truth; every
// function resolves { ok, ... } and never throws into UI paths.

export function threadToRow(userId, conv) {
  return {
    id: conv.id,
    user_id: userId,
    title: conv.title,
    starred: !!conv.starred,
    title_edited: !!conv.titleEdited,
    ai_titled: !!conv.aiTitled,
    rail_group_by: conv.railGroupBy || null,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
  }
}

export function rowToThread(row) {
  const conv = {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
  if (row.starred) conv.starred = true
  if (row.title_edited) conv.titleEdited = true
  if (row.ai_titled) conv.aiTitled = true
  if (row.rail_group_by) conv.railGroupBy = row.rail_group_by
  return conv
}

export function messageToRow(userId, threadId, msg) {
  return {
    id: msg.id,
    thread_id: threadId,
    user_id: userId,
    role: msg.role,
    text: msg.text || '',
    card_ids: msg.cardIds || [],
    mentioned_card_ids: msg.mentionedCardIds || [],
    activities: msg.activities || [],
    stopped: !!msg.stopped,
    created_at: msg.created_at,
  }
}

export function rowToMessage(row) {
  const msg = {
    id: row.id,
    role: row.role,
    text: row.text,
    cardIds: row.card_ids || [],
    mentionedCardIds: row.mentioned_card_ids || [],
    activities: row.activities || [],
    created_at: row.created_at,
  }
  if (row.stopped) msg.stopped = true
  return msg
}

export async function fetchThreads({ limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) {
    logError('[chatSync] fetchThreads failed:', error)
    return { ok: false, error }
  }
  return { ok: true, data: (data || []).map(rowToThread) }
}

export async function fetchMessages(threadId, { limit = 200, before } = {}) {
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  if (error) {
    logError('[chatSync] fetchMessages failed:', error)
    return { ok: false, error }
  }
  // Fetched newest-first for keyset paging; the store keeps chronological.
  return { ok: true, data: (data || []).map(rowToMessage).reverse() }
}

export async function upsertThread(userId, conv) {
  const { error } = await supabase.from('chat_threads').upsert(threadToRow(userId, conv))
  if (error) {
    logError('[chatSync] upsertThread failed:', error)
    return { ok: false, error }
  }
  return { ok: true }
}

export async function upsertMessage(userId, threadId, msg) {
  const { error } = await supabase.from('chat_messages').upsert(messageToRow(userId, threadId, msg))
  if (error) {
    logError('[chatSync] upsertMessage failed:', error)
    return { ok: false, error }
  }
  return { ok: true }
}

export async function deleteThread(id) {
  const { error } = await supabase.from('chat_threads').delete().eq('id', id)
  if (error) {
    logError('[chatSync] deleteThread failed:', error)
    return { ok: false, error }
  }
  return { ok: true }
}
