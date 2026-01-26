import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useUIStore } from '@/stores/useUIStore'
import type { ProjectTemplate } from '@/types/project'

const STORAGE_KEY = 'pixelmusic_autosave'
const STORAGE_VERSION = '1.0'

export function useAutosave() {
  const projectStore = useProjectStore()
  const instrumentStore = useInstrumentStore()
  const uiStore = useUIStore()

  const { tracks, tempo, name, loopStart, loopEnd, loopEnabled, timeSignature } = storeToRefs(projectStore)
  const { instruments, selectedTrackId } = storeToRefs(instrumentStore)
  const { startOctave, visibleOctaves, gridZoom, mode, showSidebar } = storeToRefs(uiStore)

  /**
   * Save current state to localStorage
   */
  function saveState(): void {
    try {
      const state = {
        version: STORAGE_VERSION,
        project: projectStore.exportToJSON(),
        instruments: JSON.parse(JSON.stringify(instruments.value)),
        ui: {
          selectedTrackId: selectedTrackId.value,
          startOctave: startOctave.value,
          visibleOctaves: visibleOctaves.value,
          gridZoom: gridZoom.value,
          mode: mode.value,
          showSidebar: showSidebar.value,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save state:', e)
    }
  }

  /**
   * Load state from localStorage
   */
  function loadState(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return false

      const state = JSON.parse(saved)

      // Check version compatibility
      if (!state.version) return false

      // Load project
      if (state.project) {
        projectStore.loadFromJSON(state.project)
      }

      // Load instruments
      if (state.instruments) {
        for (const [trackId, config] of Object.entries(state.instruments)) {
          if (instruments.value[trackId]) {
            instruments.value[trackId] = config as typeof instruments.value[string]
          }
        }
      }

      // Load UI settings
      if (state.ui) {
        if (state.ui.selectedTrackId) {
          instrumentStore.selectTrack(state.ui.selectedTrackId)
        }
        if (typeof state.ui.startOctave === 'number') {
          uiStore.setOctaveRange(state.ui.startOctave, state.ui.visibleOctaves || 2)
        }
        if (typeof state.ui.gridZoom === 'number') {
          uiStore.setZoom(state.ui.gridZoom)
        }
        if (state.ui.mode) {
          uiStore.setMode(state.ui.mode)
        }
        if (typeof state.ui.showSidebar === 'boolean') {
          showSidebar.value = state.ui.showSidebar
        }
      }

      return true
    } catch (e) {
      console.error('Failed to load state:', e)
      return false
    }
  }

  /**
   * Clear saved state
   */
  function clearState(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Export current project as a template JSON
   */
  function exportTemplate(): ProjectTemplate {
    return {
      version: STORAGE_VERSION,
      project: projectStore.exportToJSON(),
      instruments: JSON.parse(JSON.stringify(instruments.value)),
    }
  }

  /**
   * Import a template from JSON
   */
  function importTemplate(template: ProjectTemplate): boolean {
    try {
      // Validate template structure
      if (!template.project || !template.instruments) {
        throw new Error('Invalid template format')
      }

      // Load project
      projectStore.loadFromJSON(template.project)

      // Load instruments
      for (const [trackId, config] of Object.entries(template.instruments)) {
        if (instruments.value[trackId]) {
          instruments.value[trackId] = config as typeof instruments.value[string]
        }
      }

      // Save the imported state
      saveState()

      return true
    } catch (e) {
      console.error('Failed to import template:', e)
      return false
    }
  }

  /**
   * Download template as JSON file
   */
  function downloadTemplate(filename?: string): void {
    const template = exportTemplate()
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename || `${name.value.replace(/[^a-z0-9]/gi, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Load template from file
   */
  async function loadTemplateFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const template = JSON.parse(e.target?.result as string) as ProjectTemplate
          const success = importTemplate(template)
          resolve(success)
        } catch {
          resolve(false)
        }
      }
      reader.onerror = () => resolve(false)
      reader.readAsText(file)
    })
  }

  // Set up auto-save watchers
  function setupAutosave(): void {
    // Watch for project changes
    watch(
      [tracks, tempo, name, loopStart, loopEnd, loopEnabled, timeSignature],
      () => {
        saveState()
      },
      { deep: true }
    )

    // Watch for instrument changes
    watch(
      instruments,
      () => {
        saveState()
      },
      { deep: true }
    )

    // Watch for UI changes
    watch(
      [selectedTrackId, startOctave, visibleOctaves, gridZoom, mode, showSidebar],
      () => {
        saveState()
      }
    )
  }

  // Initialize on mount
  function initialize(): boolean {
    const loaded = loadState()
    setupAutosave()
    return loaded
  }

  return {
    saveState,
    loadState,
    clearState,
    exportTemplate,
    importTemplate,
    downloadTemplate,
    loadTemplateFromFile,
    initialize,
  }
}
