import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UIMode, EditTool, GridCell, Notification } from '@/types/ui'

export const useUIStore = defineStore('ui', () => {
  // State
  const mode = ref<UIMode>('beginner')
  const gridZoom = ref(1)
  const showSidebar = ref(true)
  const showExportPanel = ref(false)
  const showTutorial = ref(false)
  const tutorialStep = ref(0)
  const selectedTool = ref<EditTool>('pencil')
  const isDragging = ref(false)
  const hoveredCell = ref<GridCell | null>(null)
  const selectedNotes = ref<string[]>([])
  const notifications = ref<Notification[]>([])

  // Grid display settings
  const beatsPerBar = ref(4)
  const visibleOctaves = ref(3) // Show 3 octaves by default
  const startOctave = ref(3)    // Start from octave 3 (C3-B5)

  // Getters
  const isBeginnerMode = computed(() => mode.value === 'beginner')
  const isAdvancedMode = computed(() => mode.value === 'advanced')
  const cellSize = computed(() => Math.round(32 * gridZoom.value))

  // Actions
  function setMode(newMode: UIMode): void {
    mode.value = newMode
  }

  function toggleMode(): void {
    mode.value = mode.value === 'beginner' ? 'advanced' : 'beginner'
  }

  function setZoom(zoom: number): void {
    gridZoom.value = Math.max(0.5, Math.min(2, zoom))
  }

  function zoomIn(): void {
    setZoom(gridZoom.value + 0.25)
  }

  function zoomOut(): void {
    setZoom(gridZoom.value - 0.25)
  }

  function setTool(tool: EditTool): void {
    selectedTool.value = tool
  }

  function toggleSidebar(): void {
    showSidebar.value = !showSidebar.value
  }

  function toggleExportPanel(): void {
    showExportPanel.value = !showExportPanel.value
  }

  function setExportPanelVisible(visible: boolean): void {
    showExportPanel.value = visible
  }

  function startTutorial(): void {
    showTutorial.value = true
    tutorialStep.value = 0
  }

  function advanceTutorial(): void {
    tutorialStep.value++
  }

  function completeTutorial(): void {
    showTutorial.value = false
    tutorialStep.value = 0
  }

  function setHoveredCell(cell: GridCell | null): void {
    hoveredCell.value = cell
  }

  function setDragging(dragging: boolean): void {
    isDragging.value = dragging
  }

  function selectNote(noteId: string, multi = false): void {
    if (multi) {
      const index = selectedNotes.value.indexOf(noteId)
      if (index === -1) {
        selectedNotes.value.push(noteId)
      } else {
        selectedNotes.value.splice(index, 1)
      }
    } else {
      selectedNotes.value = [noteId]
    }
  }

  function clearSelection(): void {
    selectedNotes.value = []
  }

  function showNotification(
    message: string,
    type: Notification['type'] = 'info',
    duration = 3000
  ): void {
    const id = crypto.randomUUID()
    notifications.value.push({ id, message, type, duration })

    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id)
      }, duration)
    }
  }

  function dismissNotification(id: string): void {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function setOctaveRange(start: number, count: number): void {
    startOctave.value = Math.max(1, Math.min(7, start))
    visibleOctaves.value = Math.max(1, Math.min(6, count)) // Allow up to 6 octaves
  }

  return {
    // State
    mode,
    gridZoom,
    showSidebar,
    showExportPanel,
    showTutorial,
    tutorialStep,
    selectedTool,
    isDragging,
    hoveredCell,
    selectedNotes,
    notifications,
    beatsPerBar,
    visibleOctaves,
    startOctave,

    // Getters
    isBeginnerMode,
    isAdvancedMode,
    cellSize,

    // Actions
    setMode,
    toggleMode,
    setZoom,
    zoomIn,
    zoomOut,
    setTool,
    toggleSidebar,
    toggleExportPanel,
    setExportPanelVisible,
    startTutorial,
    advanceTutorial,
    completeTutorial,
    setHoveredCell,
    setDragging,
    selectNote,
    clearSelection,
    showNotification,
    dismissNotification,
    setOctaveRange,
  }
})
