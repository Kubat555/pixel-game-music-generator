<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTransportStore } from '@/stores/useTransportStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useUIStore } from '@/stores/useUIStore'
import { usePlayback } from '@/composables/usePlayback'
import SequencerCell from './SequencerCell.vue'

const projectStore = useProjectStore()
const transportStore = useTransportStore()
const instrumentStore = useInstrumentStore()
const uiStore = useUIStore()
const { previewNote } = usePlayback()

const { loopStart, loopEnd, tracks } = storeToRefs(projectStore)
const { currentBeat, isPlaying } = storeToRefs(transportStore)
const { selectedTrackId } = storeToRefs(instrumentStore)

// Grid configuration
const totalBeats = computed(() => loopEnd.value - loopStart.value)

// Get the selected track
const selectedTrack = computed(() =>
  tracks.value.find(t => t.id === selectedTrackId.value)
)

// Note row configuration based on track type
const noteRows = computed(() => {
  const track = selectedTrack.value
  if (!track) return []

  if (track.type === 'drums') {
    // Fixed drum pitches
    return [
      { pitch: 45, label: 'TOM', color: 'bg-chip-orange', isBlackKey: false },
      { pitch: 42, label: 'HAT', color: 'bg-chip-yellow', isBlackKey: false },
      { pitch: 38, label: 'SNR', color: 'bg-chip-cyan', isBlackKey: false },
      { pitch: 36, label: 'KCK', color: 'bg-chip-purple', isBlackKey: false },
    ]
  }

  // Melodic tracks - show 2 octaves
  const rows: Array<{ pitch: number; label: string; color: string; isBlackKey: boolean }> = []

  // Note names for display
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  // Generate rows from high to low (top of grid = high notes)
  for (let octave = uiStore.startOctave + uiStore.visibleOctaves - 1; octave >= uiStore.startOctave; octave--) {
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

// Check if a note exists at a position
function hasNoteAt(beat: number, pitch: number): boolean {
  const track = selectedTrack.value
  if (!track) return false

  return track.notes.some(n =>
    n.pitch === pitch &&
    beat >= n.startBeat &&
    beat < n.startBeat + n.duration
  )
}

// Handle cell click
function handleCellClick(beat: number, pitch: number) {
  const trackId = selectedTrackId.value
  const result = projectStore.toggleNote(trackId, beat, pitch)

  // Preview the note if it was added
  if (result) {
    previewNote(trackId, pitch)
  }
}

// Handle hover
function handleCellHover(beat: number, pitch: number) {
  uiStore.setHoveredCell({
    trackId: selectedTrackId.value,
    beat,
    pitch,
  })
}

function handleCellLeave() {
  uiStore.setHoveredCell(null)
}

// Track colors for cell highlighting
const trackColorClass = computed(() => {
  const colors: Record<string, string> = {
    lead: 'track-lead',
    bass: 'track-bass',
    harmony: 'track-harmony',
    drums: 'track-drums',
  }
  return colors[selectedTrackId.value] || ''
})
</script>

<template>
  <div class="relative" :class="trackColorClass">
    <!-- Grid Container -->
    <div class="flex">
      <!-- Piano Keys / Row Labels -->
      <div class="flex-shrink-0 w-16 border-r-3 border-chip-gray">
        <div
          v-for="row in noteRows"
          :key="row.pitch"
          class="h-cell flex items-center justify-end pr-2 border-b border-chip-darkgray font-pixel text-xs"
          :class="row.isBlackKey ? 'bg-chip-black text-chip-gray' : 'bg-chip-darkgray text-chip-white'"
        >
          {{ row.label }}
        </div>
      </div>

      <!-- Main Grid -->
      <div class="flex-1 overflow-x-auto scrollbar-pixel">
        <div class="relative">
          <!-- Beat Ruler -->
          <div class="flex h-6 border-b-3 border-chip-gray sticky top-0 bg-chip-darkgray z-10">
            <div
              v-for="beat in totalBeats"
              :key="beat"
              class="w-cell flex-shrink-0 flex items-center justify-center font-body text-sm border-r border-chip-darkgray"
              :class="(beat - 1) % 4 === 0 ? 'text-chip-white bg-chip-gray' : 'text-chip-gray'"
            >
              {{ beat }}
            </div>
          </div>

          <!-- Grid Rows -->
          <div class="relative">
            <div
              v-for="row in noteRows"
              :key="row.pitch"
              class="flex"
            >
              <div
                v-for="beat in totalBeats"
                :key="beat"
                class="w-cell h-cell flex-shrink-0"
              >
                <SequencerCell
                  :beat="beat - 1 + loopStart"
                  :pitch="row.pitch"
                  :active="hasNoteAt(beat - 1 + loopStart, row.pitch)"
                  :playing="isPlaying && currentBeat === beat - 1 + loopStart"
                  :is-bar-start="(beat - 1) % 4 === 0"
                  @click="handleCellClick(beat - 1 + loopStart, row.pitch)"
                  @mouseenter="handleCellHover(beat - 1 + loopStart, row.pitch)"
                  @mouseleave="handleCellLeave"
                />
              </div>
            </div>

            <!-- Playhead -->
            <div
              v-if="isPlaying"
              class="absolute top-0 bottom-0 w-1 bg-chip-green z-20 pointer-events-none transition-transform duration-75"
              :style="{
                transform: `translateX(${(currentBeat - loopStart) * 32}px)`
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
/* Cell sizes */
.w-cell {
  width: 32px;
}
.h-cell {
  height: 32px;
}
</style>
