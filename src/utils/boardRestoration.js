export function resolveActiveBoardId(boards, current, saved, firstBoardId) {
  if (current && boards[current]) return current
  if (saved && (saved === '__all__' || boards[saved])) return saved
  return firstBoardId
}
