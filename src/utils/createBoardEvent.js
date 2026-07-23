// Fire the global "open create-board modal" event with retry, because the
// boards page may still be mounting when the caller navigates to it.
export function triggerCreateBoard() {
  let attempts = 0
  let handled = false
  const onHandled = () => { handled = true }
  window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
  const dispatch = () => {
    if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
    window.dispatchEvent(new CustomEvent('kolumn:create-board'))
    if (++attempts < 10) setTimeout(dispatch, 100)
  }
  setTimeout(dispatch, 50)
}
