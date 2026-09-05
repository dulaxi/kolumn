// Open the global create-board modal (hosted in AppLayout, so it's always
// mounted — no navigation, no retry/ack dance). The modal opens over the
// current page; AppLayout navigates to /boards only after a board is created.
// Pass { workspaceId } to pre-scope the new board to a workspace.
export function triggerCreateBoard(detail) {
  window.dispatchEvent(new CustomEvent('kolumn:create-board', { detail }))
}
