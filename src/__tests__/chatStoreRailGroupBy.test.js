import { describe, test, expect } from 'vitest'
import { useChatStore } from '../store/chatStore'

describe('setRailGroupBy', () => {
  test('stamps the conversation and survives partialize (persistence)', () => {
    const id = useChatStore.getState().createConversation()
    expect(useChatStore.getState().conversations[id].railGroupBy).toBeUndefined()

    useChatStore.getState().setRailGroupBy(id, 'board')
    expect(useChatStore.getState().conversations[id].railGroupBy).toBe('board')

    // conversations are inside the persisted slice, so the mode round-trips.
    const persisted = useChatStore.persist.getOptions().partialize(useChatStore.getState())
    expect(persisted.conversations[id].railGroupBy).toBe('board')
  })

  test('ignores unknown conversation ids', () => {
    useChatStore.getState().setRailGroupBy('nope', 'due')
    expect(useChatStore.getState().conversations.nope).toBeUndefined()
  })
})
