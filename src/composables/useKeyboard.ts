import { onMounted, onUnmounted } from 'vue'
import { usePlayback } from './usePlayback'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { getHistoryInstance } from './useHistory'
import { useClipboard } from './useClipboard'

export function useKeyboard() {
  const { toggle, stop } = usePlayback()
  const projectStore = useProjectStore()
  const uiStore = useUIStore()
  const history = getHistoryInstance()
  const clipboard = useClipboard()

  function handleKeyDown(event: KeyboardEvent) {
    // Ignore if typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const key = event.key.toLowerCase()
    const isCtrlOrCmd = event.ctrlKey || event.metaKey
    const isShift = event.shiftKey

    // Undo: Ctrl+Z
    if (key === 'z' && isCtrlOrCmd && !isShift) {
      event.preventDefault()
      if (history.undo()) {
        uiStore.showNotification('Undo', 'info')
      }
      return
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if ((key === 'z' && isCtrlOrCmd && isShift) || (key === 'y' && isCtrlOrCmd)) {
      event.preventDefault()
      if (history.redo()) {
        uiStore.showNotification('Redo', 'info')
      }
      return
    }

    // Copy: Ctrl+C
    if (key === 'c' && isCtrlOrCmd) {
      event.preventDefault()
      if (uiStore.selectedNotes.length === 0) {
        uiStore.showNotification('No notes selected to copy', 'warning')
      } else {
        clipboard.copy()
      }
      return
    }

    // Cut: Ctrl+X
    if (key === 'x' && isCtrlOrCmd) {
      event.preventDefault()
      if (uiStore.selectedNotes.length === 0) {
        uiStore.showNotification('No notes selected to cut', 'warning')
      } else {
        clipboard.cut()
      }
      return
    }

    // Paste: Ctrl+V - activate paste mode
    if (key === 'v' && isCtrlOrCmd) {
      event.preventDefault()
      if (uiStore.hasClipboardContent()) {
        uiStore.activatePasteMode()
        uiStore.showNotification('Click where to paste notes', 'info')
      } else {
        uiStore.showNotification('Nothing to paste - copy notes first', 'warning')
      }
      return
    }

    // Select All: Ctrl+A
    if (key === 'a' && isCtrlOrCmd) {
      event.preventDefault()
      clipboard.selectAll()
      return
    }

    // Duplicate: Ctrl+D
    if (key === 'd' && isCtrlOrCmd) {
      event.preventDefault()
      clipboard.duplicate()
      return
    }

    // Playback controls
    if (key === ' ' || key === 'spacebar') {
      event.preventDefault()
      toggle()
      return
    }

    if (key === 'escape') {
      stop()
      uiStore.clearSelection()
      return
    }

    // Tool selection
    if (key === 'p') {
      uiStore.setTool('pencil')
      return
    }

    if (key === 'e') {
      uiStore.setTool('eraser')
      return
    }

    if (key === 's' && !isCtrlOrCmd) {
      uiStore.setTool('select')
      return
    }

    // Delete selected notes
    if (key === 'delete' || key === 'backspace') {
      if (uiStore.selectedNotes.length > 0) {
        // Save state for undo before deleting
        history.pushState()

        // Delete selected notes
        for (const noteId of [...uiStore.selectedNotes]) {
          for (const track of projectStore.tracks) {
            const noteIndex = track.notes.findIndex(n => n.id === noteId)
            if (noteIndex !== -1) {
              projectStore.removeNote(track.id, noteId)
              break
            }
          }
        }
        uiStore.clearSelection()
        uiStore.showNotification('Deleted notes', 'info')
      }
      return
    }

    // Zoom controls
    if (key === '=' || key === '+') {
      uiStore.zoomIn()
      return
    }

    if (key === '-') {
      uiStore.zoomOut()
      return
    }

    // Track selection with number keys
    if (key >= '1' && key <= '4') {
      const trackIndex = parseInt(key) - 1
      const tracks = ['lead', 'bass', 'harmony', 'drums']
      if (tracks[trackIndex]) {
        const instrumentStore = useInstrumentStore()
        instrumentStore.selectTrack(tracks[trackIndex])
      }
      return
    }

    // Tempo adjustment
    if (key === 'arrowup' && isCtrlOrCmd) {
      event.preventDefault()
      projectStore.setTempo(projectStore.tempo + 5)
      return
    }

    if (key === 'arrowdown' && isCtrlOrCmd) {
      event.preventDefault()
      projectStore.setTempo(projectStore.tempo - 5)
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    handleKeyDown,
  }
}
