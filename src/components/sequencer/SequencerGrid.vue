<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
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

// Ref for scrolling container
const gridContainer = ref<HTMLElement | null>(null)

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

  // Melodic tracks - show full range (C1 to B7 = 7 octaves, 84 notes)
  const rows: Array<{ pitch: number; label: string; color: string; isBlackKey: boolean }> = []

  // Note names for display
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  // Full range: C1 (MIDI 24) to B7 (MIDI 107)
  const startOctave = 1
  const endOctave = 7

  // Generate rows from high to low (top of grid = high notes)
  for (let octave = endOctave; octave >= startOctave; octave--) {
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

// Scroll to middle range (around C4-C5) on mount
function scrollToMiddleNotes() {
  if (!gridContainer.value) return

  const track = selectedTrack.value
  if (!track || track.type === 'drums') return

  // Calculate scroll position to show C4-C5 area in the middle of the view
  // Full range is C1-B7 (84 notes), C4 is note 48 from top (index ~36 from top of our grid)
  // Each row is 32px high
  const c4Index = (7 - 4) * 12 // Rows from top to C4
  const targetScroll = c4Index * 32 - (gridContainer.value.clientHeight / 2)

  gridContainer.value.scrollTop = Math.max(0, targetScroll)
}

// Scroll to middle on mount and when track changes to melodic
onMounted(() => {
  setTimeout(scrollToMiddleNotes, 100)
})

watch(selectedTrack, (newTrack, oldTrack) => {
  if (newTrack?.type === 'synth' && oldTrack?.type === 'drums') {
    setTimeout(scrollToMiddleNotes, 50)
  }
})
</script>

<template>
  <div class="relative h-full" :class="trackColorClass">
    <!-- Scrollable Grid Container -->
    <div ref="gridContainer" class="h-full overflow-auto scrollbar-pixel">
      <div class="inline-flex min-w-full">
        <!-- Piano Keys / Row Labels (sticky left) -->
        <div class="flex-shrink-0 w-16 border-r-3 border-chip-gray sticky left-0 z-20 bg-chip-darkgray">
          <!-- Empty space for Beat Ruler alignment -->
          <div class="h-6 border-b-3 border-chip-gray bg-chip-darkgray sticky top-0 z-30"></div>
          <!-- Note Labels -->
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
        <div class="flex-1">
          <!-- Beat Ruler (sticky top) -->
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
