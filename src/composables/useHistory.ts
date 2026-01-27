import { ref, watch } from 'vue'
import { useProjectStore } from '@/stores/useProjectStore'
import type { Track } from '@/types/project'

interface HistoryState {
  tracks: Track[]
  tempo: number
  loopStart: number
  loopEnd: number
}

const MAX_HISTORY = 50

export function useHistory() {
  const projectStore = useProjectStore()

  const undoStack = ref<HistoryState[]>([])
  const redoStack = ref<HistoryState[]>([])
  const isUndoRedoing = ref(false)

  /**
   * Get current state snapshot
   */
  function getSnapshot(): HistoryState {
    return {
      tracks: JSON.parse(JSON.stringify(projectStore.tracks)),
      tempo: projectStore.tempo,
      loopStart: projectStore.loopStart,
      loopEnd: projectStore.loopEnd,
    }
  }

  /**
   * Apply a state snapshot
   */
  function applySnapshot(state: HistoryState): void {
    isUndoRedoing.value = true

    projectStore.tracks.splice(0, projectStore.tracks.length, ...state.tracks.map(t => ({
      ...t,
      notes: t.notes.map(n => ({ ...n })),
    })))
    projectStore.setTempo(state.tempo)
    projectStore.setLoopRegion(state.loopStart, state.loopEnd)

    // Use setTimeout to ensure the flag is reset after Vue's reactivity cycle
    setTimeout(() => {
      isUndoRedoing.value = false
    }, 0)
  }

  /**
   * Push current state to undo stack
   */
  function pushState(): void {
    if (isUndoRedoing.value) return

    const snapshot = getSnapshot()
    undoStack.value.push(snapshot)

    // Limit stack size
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }

    // Clear redo stack when new action is performed
    redoStack.value = []
  }

  /**
   * Undo last action
   */
  function undo(): boolean {
    if (undoStack.value.length === 0) return false

    // Save current state to redo stack
    redoStack.value.push(getSnapshot())

    // Pop and apply previous state
    const previousState = undoStack.value.pop()!
    applySnapshot(previousState)

    return true
  }

  /**
   * Redo last undone action
   */
  function redo(): boolean {
    if (redoStack.value.length === 0) return false

    // Save current state to undo stack
    undoStack.value.push(getSnapshot())

    // Pop and apply redo state
    const redoState = redoStack.value.pop()!
    applySnapshot(redoState)

    return true
  }

  /**
   * Check if undo is available
   */
  function canUndo(): boolean {
    return undoStack.value.length > 0
  }

  /**
   * Check if redo is available
   */
  function canRedo(): boolean {
    return redoStack.value.length > 0
  }

  /**
   * Clear all history
   */
  function clearHistory(): void {
    undoStack.value = []
    redoStack.value = []
  }

  /**
   * Initialize history tracking
   * Call this once to start watching for changes
   */
  function initializeTracking(): void {
    // Watch for track changes (notes added/removed/modified)
    watch(
      () => projectStore.tracks.map(t => ({
        id: t.id,
        notes: t.notes.map(n => ({ ...n })),
      })),
      () => {
        if (!isUndoRedoing.value) {
          // Debounce to avoid too many snapshots
          pushState()
        }
      },
      { deep: true }
    )
  }

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    pushState,
    initializeTracking,
    undoStackSize: () => undoStack.value.length,
    redoStackSize: () => redoStack.value.length,
  }
}

// Singleton instance for global access
let historyInstance: ReturnType<typeof useHistory> | null = null

export function getHistoryInstance(): ReturnType<typeof useHistory> {
  if (!historyInstance) {
    historyInstance = useHistory()
  }
  return historyInstance
}
