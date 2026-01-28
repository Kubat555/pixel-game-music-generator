<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTransportStore } from '@/stores/useTransportStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useUIStore } from '@/stores/useUIStore'
import { usePlayback } from '@/composables/usePlayback'
import { useClipboard } from '@/composables/useClipboard'
import { registerPlayheadCallback, unregisterPlayheadCallback } from '@/composables/usePlayheadBridge'
import { useVirtualGrid } from '@/composables/useVirtualGrid'
import SequencerCell from './SequencerCell.vue'

const projectStore = useProjectStore()
const transportStore = useTransportStore()
const instrumentStore = useInstrumentStore()
const uiStore = useUIStore()
const { previewNote, playFromBeat } = usePlayback()
const clipboard = useClipboard()

// Ref for scrolling container
const gridContainer = ref<HTMLElement | null>(null)
const gridContent = ref<HTMLElement | null>(null)

// PHASE 2 OPTIMIZATION: Direct DOM ref for playhead (bypasses Vue reactivity)
const playheadElement = ref<HTMLElement | null>(null)

// Direct DOM update for playhead position - no Vue re-renders
function updatePlayheadPosition(beat: number) {
  if (playheadElement.value) {
    const position = (beat - loopStart.value) * cellSize.value
    playheadElement.value.style.transform = `translateX(${position}px)`
  }
}

// Expose for usePlayback to call directly
defineExpose({ updatePlayheadPosition })

const { loopStart, loopEnd, tracks } = storeToRefs(projectStore)
const { isPlaying } = storeToRefs(transportStore)
const { selectedTrackId } = storeToRefs(instrumentStore)
const { selectedTool, selectedNotes, isPasteMode, clipboard: clipboardData, cellSize } = storeToRefs(uiStore)

// Grid configuration - cellSize is now dynamic from UI store for zoom support
const PIANO_WIDTH = 64
const RULER_HEIGHT = 24

const totalBeats = computed(() => loopEnd.value - loopStart.value)

// PHASE 3 OPTIMIZATION: Virtual grid configuration
const virtualGridConfig = computed(() => ({
  cellWidth: cellSize.value,
  cellHeight: cellSize.value,
  totalRows: noteRows.value.length,
  totalCols: totalBeats.value,
  bufferRows: 5,
  bufferCols: 8,
}))

// Virtual grid for rendering only visible cells
const { visibleCells, totalSize } = useVirtualGrid(gridContainer, virtualGridConfig)

// Get the selected track
const selectedTrack = computed(() =>
  tracks.value.find(t => t.id === selectedTrackId.value)
)

// Note row configuration based on track type
const noteRows = computed(() => {
  const track = selectedTrack.value
  if (!track) return []

  if (track.type === 'drums') {
    return [
      { pitch: 49, label: 'CRSH', color: 'bg-chip-red', isBlackKey: false },
      { pitch: 47, label: 'RIM', color: 'bg-chip-lime', isBlackKey: false },
      { pitch: 46, label: 'OHH', color: 'bg-chip-cyan', isBlackKey: false },
      { pitch: 45, label: 'TOM', color: 'bg-chip-orange', isBlackKey: false },
      { pitch: 44, label: 'CLAP', color: 'bg-chip-purple', isBlackKey: false },
      { pitch: 42, label: 'CHH', color: 'bg-chip-yellow', isBlackKey: false },
      { pitch: 38, label: 'SNR', color: 'bg-chip-cyan', isBlackKey: false },
      { pitch: 36, label: 'KCK', color: 'bg-chip-purple', isBlackKey: false },
    ]
  }

  const rows: Array<{ pitch: number; label: string; color: string; isBlackKey: boolean }> = []
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  for (let octave = 7; octave >= 1; octave--) {
    for (let noteIndex = 11; noteIndex >= 0; noteIndex--) {
      const pitch = octave * 12 + noteIndex
      const noteName = noteNames[noteIndex]
      const isBlackKey = noteName.includes('#')
      rows.push({
        pitch,
        label: `${noteName}${octave}`,
        color: isBlackKey ? 'bg-chip-darkgray' : 'bg-chip-gray',
        isBlackKey,
      })
    }
  }
  return rows
})

// Get note info at a position
interface NoteInfo {
  exists: boolean
  isStart: boolean
  isEnd: boolean
  isMiddle: boolean
  noteId: string | null
  duration: number
}

// Default empty note info
const defaultNoteInfo: NoteInfo = {
  exists: false,
  isStart: false,
  isEnd: false,
  isMiddle: false,
  noteId: null,
  duration: 1,
}

// PHASE 1 OPTIMIZATION: Note index for O(1) lookups instead of O(n) Array.find()
const trackNoteIndex = computed(() => {
  const track = selectedTrack.value
  if (!track) return new Map<string, NoteInfo>()

  const index = new Map<string, NoteInfo>()

  for (const note of track.notes) {
    const duration = note.duration
    for (let beat = note.startBeat; beat < note.startBeat + duration; beat++) {
      const key = `${note.pitch}:${beat}`
      index.set(key, {
        exists: true,
        isStart: beat === note.startBeat,
        isEnd: beat === note.startBeat + duration - 1,
        isMiddle: beat > note.startBeat && beat < note.startBeat + duration - 1,
        noteId: note.id,
        duration: duration,
      })
    }
  }

  return index
})

// O(1) lookup function
function getNoteInfoAt(beat: number, pitch: number): NoteInfo {
  return trackNoteIndex.value.get(`${pitch}:${beat}`) ?? defaultNoteInfo
}

function isNoteSelected(noteId: string | null): boolean {
  if (!noteId) return false
  return selectedNotes.value.includes(noteId)
}

// ===== SELECTION BOX STATE =====
const isSelecting = ref(false)
const selectionStart = ref({ beat: 0, pitch: 0 })
const selectionEnd = ref({ beat: 0, pitch: 0 })

// Selection box coordinates (pixels)
const selectionBox = computed(() => {
  if (!isSelecting.value) return null

  const startBeat = Math.min(selectionStart.value.beat, selectionEnd.value.beat)
  const endBeat = Math.max(selectionStart.value.beat, selectionEnd.value.beat)
  const startPitch = Math.max(selectionStart.value.pitch, selectionEnd.value.pitch)
  const endPitch = Math.min(selectionStart.value.pitch, selectionEnd.value.pitch)

  // Find row indices
  const startRowIndex = noteRows.value.findIndex(r => r.pitch === startPitch)
  const endRowIndex = noteRows.value.findIndex(r => r.pitch === endPitch)

  if (startRowIndex === -1 || endRowIndex === -1) return null

  const x = (startBeat - loopStart.value) * cellSize.value
  const y = startRowIndex * cellSize.value
  const width = (endBeat - startBeat + 1) * cellSize.value
  const height = (endRowIndex - startRowIndex + 1) * cellSize.value

  return { x, y, width, height }
})

// ===== PASTE MODE STATE =====
const pastePreviewBeat = ref(0)
const pastePreviewPitch = ref(60)

// Watch for clipboard changes to disable paste mode if empty
watch(clipboardData, (data) => {
  if (!data || data.notes.length === 0) {
    uiStore.deactivatePasteMode()
  }
})

// ===== RESIZE STATE =====
const isDragging = ref(false)
const dragNoteId = ref<string | null>(null)
const dragStartBeat = ref(0)

// ===== MOUSE POSITION TO GRID COORDINATES =====
function getGridPosition(event: MouseEvent): { beat: number; pitch: number } | null {
  const gridEl = gridContainer.value
  if (!gridEl) return null

  const rect = gridEl.getBoundingClientRect()
  const scrollLeft = gridEl.scrollLeft
  const scrollTop = gridEl.scrollTop

  const x = event.clientX - rect.left + scrollLeft - PIANO_WIDTH
  const y = event.clientY - rect.top + scrollTop - RULER_HEIGHT

  if (x < 0 || y < 0) return null

  const beat = Math.floor(x / cellSize.value) + loopStart.value
  const rowIndex = Math.floor(y / cellSize.value)

  if (rowIndex >= noteRows.value.length || rowIndex < 0) return null

  const pitch = noteRows.value[rowIndex].pitch

  return { beat, pitch }
}

// ===== GRID MOUSE HANDLERS =====
function handleGridMouseDown(event: MouseEvent) {
  // Only handle left mouse button
  if (event.button !== 0) return

  const pos = getGridPosition(event)
  if (!pos) return

  // If in paste mode, paste and exit
  if (isPasteMode.value) {
    if (!isPastePositionValid.value) {
      uiStore.showNotification('Cannot paste here - notes would be outside grid', 'warning')
      return
    }

    // Auto-expand loop if needed (round up to nearest 4 beats)
    if (pasteRequiresLoopExpansion.value > 0) {
      const roundedEnd = Math.ceil(pasteRequiresLoopExpansion.value / 4) * 4
      projectStore.setLoopRegion(loopStart.value, roundedEnd)
    }

    clipboard.paste(pos.beat, pos.pitch)
    uiStore.deactivatePasteMode()
    return
  }

  const tool = selectedTool.value

  // Select tool - start selection box
  if (tool === 'select') {
    const noteInfo = getNoteInfoAt(pos.beat, pos.pitch)

    // If clicking on a note, select it (Shift for multi-select)
    if (noteInfo.exists && noteInfo.noteId) {
      if (!event.shiftKey && !isNoteSelected(noteInfo.noteId)) {
        uiStore.clearSelection()
      }
      uiStore.selectNote(noteInfo.noteId, true)
    } else {
      // Start selection box
      if (!event.shiftKey) {
        uiStore.clearSelection()
      }
      isSelecting.value = true
      selectionStart.value = { beat: pos.beat, pitch: pos.pitch }
      selectionEnd.value = { beat: pos.beat, pitch: pos.pitch }
    }
    return
  }

  // Pencil/Eraser - handle in cell click
}

function handleGridMouseMove(event: MouseEvent) {
  const pos = getGridPosition(event)
  if (!pos) return

  // Update selection box
  if (isSelecting.value) {
    selectionEnd.value = { beat: pos.beat, pitch: pos.pitch }
    return
  }

  // Update paste preview position
  if (isPasteMode.value) {
    pastePreviewBeat.value = pos.beat
    pastePreviewPitch.value = pos.pitch
  }

  // Update hover state
  uiStore.setHoveredCell({
    trackId: selectedTrackId.value,
    beat: pos.beat,
    pitch: pos.pitch,
  })
}

function handleGridMouseUp() {
  if (isSelecting.value) {
    // Select all notes in the selection box
    selectNotesInBox()
    isSelecting.value = false
  }
}

function selectNotesInBox() {
  const track = selectedTrack.value
  if (!track) return

  const startBeat = Math.min(selectionStart.value.beat, selectionEnd.value.beat)
  const endBeat = Math.max(selectionStart.value.beat, selectionEnd.value.beat)
  const minPitch = Math.min(selectionStart.value.pitch, selectionEnd.value.pitch)
  const maxPitch = Math.max(selectionStart.value.pitch, selectionEnd.value.pitch)

  // Find all notes that intersect with the selection box
  for (const note of track.notes) {
    const noteEndBeat = note.startBeat + note.duration - 1

    // Check if note intersects with selection box
    const intersectsBeat = note.startBeat <= endBeat && noteEndBeat >= startBeat
    const intersectsPitch = note.pitch >= minPitch && note.pitch <= maxPitch

    if (intersectsBeat && intersectsPitch) {
      uiStore.selectNote(note.id, true)
    }
  }

  if (selectedNotes.value.length > 0) {
    uiStore.showNotification(`Selected ${selectedNotes.value.length} note(s)`, 'info')
  }
}

// ===== CELL CLICK HANDLER =====
function handleCellClick(beat: number, pitch: number, _event: MouseEvent) {
  if (isDragging.value || isSelecting.value) return

  const trackId = selectedTrackId.value
  const noteInfo = getNoteInfoAt(beat, pitch)
  const tool = selectedTool.value

  // Select tool is handled in grid mouse down
  if (tool === 'select') return

  // Paste mode - paste at this position
  if (isPasteMode.value) {
    clipboard.paste(beat, pitch)
    uiStore.deactivatePasteMode()
    return
  }

  // Eraser tool
  if (tool === 'eraser') {
    if (noteInfo.exists && noteInfo.noteId) {
      projectStore.removeNote(trackId, noteInfo.noteId)
    }
    return
  }

  // Pencil tool
  if (noteInfo.exists) {
    if (noteInfo.isStart && noteInfo.noteId) {
      projectStore.removeNote(trackId, noteInfo.noteId)
    }
    return
  }

  const noteId = projectStore.addNote(trackId, {
    pitch,
    startBeat: beat,
    duration: 1,
    velocity: 0.8,
  })

  if (noteId) {
    previewNote(trackId, pitch)
  }
}

// ===== RESIZE HANDLERS =====
function handleResizeStart(event: MouseEvent, beat: number, pitch: number) {
  const noteInfo = getNoteInfoAt(beat, pitch)
  if (!noteInfo.exists || !noteInfo.noteId) return

  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  dragNoteId.value = noteInfo.noteId

  const track = selectedTrack.value
  const note = track?.notes.find(n => n.id === noteInfo.noteId)
  if (note) {
    dragStartBeat.value = note.startBeat
  }

  window.addEventListener('mousemove', handleResizeMove)
  window.addEventListener('mouseup', handleResizeEnd)
}

function handleResizeMove(event: MouseEvent) {
  if (!isDragging.value || !dragNoteId.value) return

  const pos = getGridPosition(event)
  if (!pos) return

  const newDuration = Math.max(1, pos.beat - dragStartBeat.value + 1)
  projectStore.updateNote(selectedTrackId.value, dragNoteId.value, { duration: newDuration })
}

function handleResizeEnd() {
  isDragging.value = false
  dragNoteId.value = null
  window.removeEventListener('mousemove', handleResizeMove)
  window.removeEventListener('mouseup', handleResizeEnd)
}

// ===== KEYBOARD HANDLER FOR ESC =====
function handleKeyDown(event: KeyboardEvent) {
  // Escape to cancel paste mode
  if (event.key === 'Escape' && isPasteMode.value) {
    uiStore.deactivatePasteMode()
    uiStore.showNotification('Paste cancelled', 'info')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  setTimeout(scrollToMiddleNotes, 100)

  // PHASE 2: Register playhead callback for direct DOM updates
  registerPlayheadCallback(updatePlayheadPosition)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)

  // PHASE 2: Unregister playhead callback
  unregisterPlayheadCallback()
})

// ===== HOVER STATE FOR FULL NOTE HIGHLIGHT =====
const hoveredNoteId = ref<string | null>(null)

// Get full note info for the hovered note (for overlay)
const hoveredNoteOverlay = computed(() => {
  if (!hoveredNoteId.value) return null

  const track = selectedTrack.value
  if (!track) return null

  const note = track.notes.find(n => n.id === hoveredNoteId.value)
  if (!note) return null

  const rowIndex = noteRows.value.findIndex(r => r.pitch === note.pitch)
  if (rowIndex === -1) return null

  return {
    left: (note.startBeat - loopStart.value) * cellSize.value,
    top: rowIndex * cellSize.value,
    width: note.duration * cellSize.value,
    height: cellSize.value,
  }
})

// ===== MISC =====
function handleCellHover(beat: number, pitch: number) {
  uiStore.setHoveredCell({ trackId: selectedTrackId.value, beat, pitch })

  // Track hovered note for full-note highlight
  const noteInfo = getNoteInfoAt(beat, pitch)
  hoveredNoteId.value = noteInfo.noteId
}

function handleCellLeave() {
  uiStore.setHoveredCell(null)
  hoveredNoteId.value = null
}

const trackColorClass = computed(() => {
  const colors: Record<string, string> = {
    lead: 'track-lead',
    bass: 'track-bass',
    harmony: 'track-harmony',
    drums: 'track-drums',
  }
  return colors[selectedTrackId.value] || ''
})

function scrollToMiddleNotes() {
  if (!gridContainer.value) return
  const track = selectedTrack.value
  if (!track || track.type === 'drums') return

  const c4Index = (7 - 4) * 12
  const targetScroll = c4Index * cellSize.value - (gridContainer.value.clientHeight / 2)
  gridContainer.value.scrollTop = Math.max(0, targetScroll)
}

watch(selectedTrack, (newTrack, oldTrack) => {
  if (newTrack?.type === 'synth' && oldTrack?.type === 'drums') {
    setTimeout(scrollToMiddleNotes, 50)
  }
})

// Get valid pitch range
const validPitchRange = computed(() => {
  if (noteRows.value.length === 0) return { min: 0, max: 127 }
  const pitches = noteRows.value.map(r => r.pitch)
  return {
    min: Math.min(...pitches),
    max: Math.max(...pitches),
  }
})

// Paste preview notes with validation
const pastePreviewNotes = computed(() => {
  if (!isPasteMode.value || !clipboardData.value) return []

  const { notes, baseStartBeat, basePitch } = clipboardData.value
  const beatOffset = pastePreviewBeat.value - baseStartBeat
  const pitchOffset = pastePreviewPitch.value - basePitch

  return notes.map(n => ({
    beat: n.startBeat + beatOffset,
    pitch: n.pitch + pitchOffset,
    duration: n.duration,
  }))
})

// Check if paste position is valid
const isPastePositionValid = computed(() => {
  if (!isPasteMode.value || pastePreviewNotes.value.length === 0) return false

  const { min: minPitch, max: maxPitch } = validPitchRange.value

  for (const note of pastePreviewNotes.value) {
    // Check pitch bounds (top/bottom)
    if (note.pitch < minPitch || note.pitch > maxPitch) {
      return false
    }
    // Check left bound (before loop start)
    if (note.beat < loopStart.value) {
      return false
    }
  }

  return true
})

// Calculate if we need to expand loop for paste
const pasteRequiresLoopExpansion = computed(() => {
  if (!isPasteMode.value || pastePreviewNotes.value.length === 0) return 0

  let maxBeatNeeded = loopEnd.value

  for (const note of pastePreviewNotes.value) {
    const noteEnd = note.beat + note.duration
    if (noteEnd > maxBeatNeeded) {
      maxBeatNeeded = noteEnd
    }
  }

  return maxBeatNeeded > loopEnd.value ? maxBeatNeeded : 0
})
</script>

<template>
  <div class="flex flex-col h-full" :class="trackColorClass">
    <!-- Paste Mode Indicator - above the grid -->
    <div
      v-if="isPasteMode"
      class="flex-shrink-0 panel-pixel bg-chip-purple px-4 py-2 font-pixel text-xs text-chip-white text-center"
    >
      PASTE MODE - Click to place notes (ESC to cancel)
    </div>

    <!-- Scrollable Grid Container -->
    <div
      ref="gridContainer"
      class="flex-1 overflow-auto scrollbar-pixel relative"
      :class="{ 'cursor-copy': isPasteMode, 'cursor-crosshair': selectedTool === 'select' && !isPasteMode }"
      @mousedown="handleGridMouseDown"
      @mousemove="handleGridMouseMove"
      @mouseup="handleGridMouseUp"
      @mouseleave="handleGridMouseUp"
    >
      <div ref="gridContent" class="inline-flex min-w-full">
        <!-- Piano Keys / Row Labels (sticky left) -->
        <div class="flex-shrink-0 w-16 border-r-3 border-chip-gray sticky left-0 z-20 bg-chip-darkgray">
          <div class="h-6 border-b-3 border-chip-gray bg-chip-darkgray sticky top-0 z-30"></div>
          <div
            v-for="row in noteRows"
            :key="row.pitch"
            class="flex items-center justify-end pr-2 border-b border-chip-darkgray font-pixel text-xs"
            :class="row.isBlackKey ? 'bg-chip-black text-chip-gray' : 'bg-chip-darkgray text-chip-white'"
            :style="{ height: `${cellSize}px` }"
          >
            {{ row.label }}
          </div>
        </div>

        <!-- Main Grid -->
        <div class="flex-1 relative">
          <!-- Beat Ruler (sticky top) - Click to play from that beat -->
          <div class="flex h-6 border-b-3 border-chip-gray sticky top-0 bg-chip-darkgray z-10">
            <div
              v-for="beat in totalBeats"
              :key="beat"
              class="flex-shrink-0 flex items-center justify-center font-body text-sm border-r border-chip-darkgray cursor-pointer hover:bg-chip-green hover:text-chip-black transition-colors"
              :class="(beat - 1) % 4 === 0 ? 'text-chip-white bg-chip-gray' : 'text-chip-gray'"
              :style="{ width: `${cellSize}px` }"
              :title="`Play from beat ${beat}`"
              @click="playFromBeat(beat - 1 + loopStart)"
            >
              {{ beat }}
            </div>
          </div>

          <!-- Grid Rows - PHASE 3 OPTIMIZATION: Virtual scrolling -->
          <div
            class="relative"
            :style="{
              width: `${totalSize.width}px`,
              height: `${totalSize.height}px`,
            }"
          >
            <!-- Background grid lines (bar separators) -->
            <div
              v-for="col in Math.ceil(totalBeats / 4)"
              :key="`bar-${col}`"
              class="absolute top-0 bottom-0 w-0.5 bg-chip-gray opacity-30"
              :style="{ left: `${(col - 1) * 4 * cellSize}px` }"
            ></div>

            <!-- Virtual cells - only renders visible cells -->
            <SequencerCell
              v-for="cell in visibleCells"
              :key="cell.key"
              :style="{
                position: 'absolute',
                left: `${cell.col * cellSize}px`,
                top: `${cell.row * cellSize}px`,
                width: `${cellSize}px`,
                height: `${cellSize}px`,
              }"
              :beat="cell.col + loopStart"
              :pitch="noteRows[cell.row]?.pitch ?? 60"
              :note-info="getNoteInfoAt(cell.col + loopStart, noteRows[cell.row]?.pitch ?? 60)"
              :is-bar-start="cell.col % 4 === 0"
              :is-selected="isNoteSelected(getNoteInfoAt(cell.col + loopStart, noteRows[cell.row]?.pitch ?? 60).noteId)"
              :tool="selectedTool"
              @click="handleCellClick(cell.col + loopStart, noteRows[cell.row]?.pitch ?? 60, $event)"
              @resize-start="handleResizeStart($event, cell.col + loopStart, noteRows[cell.row]?.pitch ?? 60)"
              @mouseenter="handleCellHover(cell.col + loopStart, noteRows[cell.row]?.pitch ?? 60)"
              @mouseleave="handleCellLeave"
            />

            <!-- Hovered Note Overlay - highlights entire note on hover -->
            <div
              v-if="hoveredNoteOverlay"
              class="absolute pointer-events-none z-5 rounded border-2 border-chip-lime"
              :style="{
                left: `${hoveredNoteOverlay.left}px`,
                top: `${hoveredNoteOverlay.top}px`,
                width: `${hoveredNoteOverlay.width}px`,
                height: `${hoveredNoteOverlay.height}px`,
                background: 'linear-gradient(90deg, rgba(80,200,120,0.4) 0%, rgba(120,255,160,0.5) 50%, rgba(80,200,120,0.4) 100%)',
                boxShadow: '0 0 10px rgba(80,255,120,0.5), inset 0 0 10px rgba(255,255,255,0.2)',
              }"
            ></div>

            <!-- Selection Box -->
            <div
              v-if="selectionBox"
              class="absolute pointer-events-none border-2 border-chip-white bg-chip-white bg-opacity-20 z-10"
              :style="{
                left: `${selectionBox.x}px`,
                top: `${selectionBox.y}px`,
                width: `${selectionBox.width}px`,
                height: `${selectionBox.height}px`,
              }"
            ></div>

            <!-- Paste Preview -->
            <template v-if="isPasteMode">
              <div
                v-for="(previewNote, index) in pastePreviewNotes"
                :key="index"
                class="absolute pointer-events-none border-2 border-dashed z-10"
                :class="isPastePositionValid
                  ? 'bg-chip-green bg-opacity-50 border-chip-lime'
                  : 'bg-chip-red bg-opacity-50 border-chip-red'"
                :style="{
                  left: `${(previewNote.beat - loopStart) * cellSize}px`,
                  top: `${noteRows.findIndex(r => r.pitch === previewNote.pitch) * cellSize}px`,
                  width: `${previewNote.duration * cellSize}px`,
                  height: `${cellSize}px`,
                  display: noteRows.findIndex(r => r.pitch === previewNote.pitch) === -1 ? 'none' : 'block',
                }"
              ></div>
            </template>

            <!-- Playhead (PHASE 2: uses direct DOM updates via ref, not Vue reactivity) -->
            <div
              ref="playheadElement"
              class="absolute top-0 w-1 bg-chip-green z-20 pointer-events-none"
              :style="{
                display: isPlaying ? 'block' : 'none',
                height: `${totalSize.height}px`,
              }"
            >
              <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-chip-green"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!selectedTrack"
      class="absolute inset-0 flex items-center justify-center bg-chip-black bg-opacity-80"
    >
      <p class="font-pixel text-chip-gray">Select a track to start</p>
    </div>
  </div>
</template>

<style scoped>
.w-cell {
  width: 32px;
}
.h-cell {
  height: 32px;
}
</style>
