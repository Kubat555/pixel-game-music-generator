import { onMounted, onUnmounted } from 'vue'
import { usePlayback } from './usePlayback'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'

export function useKeyboard() {
  const { toggle, stop } = usePlayback()
  const projectStore = useProjectStore()
  const uiStore = useUIStore()

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
      // Delete selected notes
      for (const noteId of uiStore.selectedNotes) {
        for (const track of projectStore.tracks) {
          const noteIndex = track.notes.findIndex(n => n.id === noteId)
          if (noteIndex !== -1) {
            projectStore.removeNote(track.id, noteId)
            break
          }
        }
      }
      uiStore.clearSelection()
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
