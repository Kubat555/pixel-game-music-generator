import { useProjectStore } from '@/stores/useProjectStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useUIStore } from '@/stores/useUIStore'

export function useClipboard() {
  const projectStore = useProjectStore()
  const instrumentStore = useInstrumentStore()
  const uiStore = useUIStore()

  /**
   * Copy selected notes to clipboard (stored in UIStore)
   */
  function copy(): boolean {
    const selectedNoteIds = uiStore.selectedNotes
    if (selectedNoteIds.length === 0) {
      return false
    }

    const notes: Array<{
      pitch: number
      startBeat: number
      duration: number
      velocity: number
    }> = []
    let minStartBeat = Infinity
    let minPitch = Infinity

    // Find all selected notes across tracks
    for (const track of projectStore.tracks) {
      for (const note of track.notes) {
        if (selectedNoteIds.includes(note.id)) {
          notes.push({
            pitch: note.pitch,
            startBeat: note.startBeat,
            duration: note.duration,
            velocity: note.velocity,
          })
          minStartBeat = Math.min(minStartBeat, note.startBeat)
          minPitch = Math.min(minPitch, note.pitch)
        }
      }
    }

    if (notes.length === 0) {
      return false
    }

    // Store in UIStore (shared across all components)
    uiStore.setClipboard({
      notes,
      baseStartBeat: minStartBeat,
      basePitch: minPitch,
    })

    uiStore.showNotification(`Copied ${notes.length} note(s)`, 'success')
    return true
  }

  /**
   * Cut selected notes (copy + delete)
   */
  function cut(): boolean {
    if (!copy()) return false

    // Delete selected notes
    const selectedNoteIds = [...uiStore.selectedNotes]
    for (const noteId of selectedNoteIds) {
      for (const track of projectStore.tracks) {
        const noteIndex = track.notes.findIndex(n => n.id === noteId)
        if (noteIndex !== -1) {
          projectStore.removeNote(track.id, noteId)
          break
        }
      }
    }

    uiStore.clearSelection()
    uiStore.showNotification('Cut notes', 'info')
    return true
  }

  /**
   * Paste notes from clipboard at specified position
   */
  function paste(targetBeat?: number, targetPitch?: number): boolean {
    const clipboardData = uiStore.clipboard
    if (!clipboardData || clipboardData.notes.length === 0) {
      uiStore.showNotification('Nothing to paste', 'warning')
      return false
    }

    const trackId = instrumentStore.selectedTrackId
    const track = projectStore.tracks.find(t => t.id === trackId)
    if (!track) {
      uiStore.showNotification('No track selected', 'warning')
      return false
    }

    // Calculate offsets
    const baseBeat = targetBeat ?? projectStore.loopStart
    const beatOffset = baseBeat - clipboardData.baseStartBeat

    const pitchOffset = targetPitch !== undefined
      ? targetPitch - clipboardData.basePitch
      : 0

    const newNoteIds: string[] = []

    for (const clipNote of clipboardData.notes) {
      const newStartBeat = clipNote.startBeat + beatOffset
      const newPitch = clipNote.pitch + pitchOffset

      // Skip if before loop start (left boundary check only)
      // Right boundary is handled by auto-expand in SequencerGrid
      if (newStartBeat < projectStore.loopStart) {
        continue
      }

      // Skip if note already exists at this position
      const existing = track.notes.find(n =>
        n.pitch === newPitch && n.startBeat === newStartBeat
      )

      if (!existing) {
        const noteId = projectStore.addNote(trackId, {
          pitch: newPitch,
          startBeat: newStartBeat,
          duration: clipNote.duration,
          velocity: clipNote.velocity,
        })
        if (noteId) {
          newNoteIds.push(noteId)
        }
      }
    }

    // Select pasted notes
    uiStore.clearSelection()
    for (const id of newNoteIds) {
      uiStore.selectNote(id, true)
    }

    // Exit paste mode
    uiStore.deactivatePasteMode()

    if (newNoteIds.length > 0) {
      uiStore.showNotification(`Pasted ${newNoteIds.length} note(s)`, 'success')
    } else {
      uiStore.showNotification('No notes were pasted', 'warning')
    }

    return newNoteIds.length > 0
  }

  /**
   * Duplicate selected notes with offset
   */
  function duplicate(): boolean {
    if (!copy()) return false

    const clipboardData = uiStore.clipboard
    if (!clipboardData) return false

    // Paste with 1 beat offset
    return paste(clipboardData.baseStartBeat + 1, clipboardData.basePitch)
  }

  /**
   * Select all notes in current track
   */
  function selectAll(): void {
    const trackId = instrumentStore.selectedTrackId
    const track = projectStore.tracks.find(t => t.id === trackId)
    if (!track) return

    uiStore.clearSelection()
    for (const note of track.notes) {
      uiStore.selectNote(note.id, true)
    }

    uiStore.showNotification(`Selected ${track.notes.length} note(s)`, 'info')
  }

  /**
   * Check if clipboard has content
   */
  function hasContent(): boolean {
    return uiStore.hasClipboardContent()
  }

  return {
    copy,
    cut,
    paste,
    duplicate,
    selectAll,
    hasContent,
  }
}
