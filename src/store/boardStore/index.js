import { create } from 'zustand'
import { createBoardsSlice } from './slices/boardsSlice'
import { createColumnsSlice } from './slices/columnsSlice'
import { createCardsSlice } from './slices/cardsSlice'
import { createLabelsSlice } from './slices/labelsSlice'
import { createCommentsSlice } from './slices/commentsSlice'
import { createAttachmentsSlice } from './slices/attachmentsSlice'
import { createActivitySlice } from './slices/activitySlice'
import { createRealtimeSlice } from './slices/realtimeSlice'
import { onStoreEvent } from '../storeEvents'

// boardStore composed from focused domain slices (Zustand slices pattern).
// Every slice shares the same (set, get), so cross-slice access (e.g. a card
// action reading get().labels, or setActiveBoard calling get().subscribeToBoards)
// works exactly as it did in the single-file store. Public API is unchanged.
export const useBoardStore = create((set, get) => ({
  ...createBoardsSlice(set, get),
  ...createColumnsSlice(set, get),
  ...createCardsSlice(set, get),
  ...createLabelsSlice(set, get),
  ...createCommentsSlice(set, get),
  ...createAttachmentsSlice(set, get),
  ...createActivitySlice(set, get),
  ...createRealtimeSlice(set, get),

  resetStore: () => {
    // Tear down realtime (channels + reconnect timer) via the realtime slice,
    // then reset every slice's state to its initial value.
    get().unsubscribeAll()
    set({ boards: {}, columns: {}, cards: {}, labels: {}, cardLabels: {}, activeBoardId: null, loading: false, error: null, subscriptions: [], _isDragging: false, _tempIdMap: {}, _loadedBoardCards: new Set(), _loadingBoardCards: new Set(), _allCardsLoaded: false, comments: {}, activity: {}, attachments: {}, boardActivity: {}, cardActivityFeed: {}, _completingCards: new Set() })
  },
}))

// React to cross-store lifecycle events (decoupled via the event bus, so
// authStore / workspacesStore don't have to import this store).
onStoreEvent('session:reset', () => useBoardStore.getState().resetStore())
onStoreEvent('boards:refetch', () => useBoardStore.getState().fetchBoards())
