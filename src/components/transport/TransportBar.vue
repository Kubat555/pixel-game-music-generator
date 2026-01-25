<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTransportStore } from '@/stores/useTransportStore'
import { usePlayback } from '@/composables/usePlayback'

const projectStore = useProjectStore()
const transportStore = useTransportStore()
const { stop, toggle, isPlaying } = usePlayback()

const { tempo } = storeToRefs(projectStore)
const { currentBeat, masterVolume } = storeToRefs(transportStore)

// Format current position as bar:beat
const positionDisplay = computed(() => {
  const bar = Math.floor(currentBeat.value / 4) + 1
  const beat = (currentBeat.value % 4) + 1
  return `${bar}:${beat}`
})

function adjustTempo(delta: number) {
  projectStore.setTempo(tempo.value + delta)
}

function handleTempoInput(event: Event) {
  const input = event.target as HTMLInputElement
  const value = parseInt(input.value, 10)
  if (!isNaN(value)) {
    projectStore.setTempo(value)
  }
}
</script>

<template>
  <div class="bg-chip-black border-b-3 border-chip-gray px-4 py-3 flex items-center justify-between gap-4">
    <!-- Playback Controls -->
    <div class="flex items-center gap-2">
      <!-- Play/Pause Button -->
      <button
        class="btn-pixel-primary w-16 h-12 flex items-center justify-center"
        @click="toggle"
        :title="isPlaying ? 'Pause' : 'Play'"
      >
        <span v-if="isPlaying" class="text-2xl">||</span>
        <span v-else class="text-2xl">▶</span>
      </button>

      <!-- Stop Button -->
      <button
        class="btn-pixel w-12 h-12 flex items-center justify-center"
        @click="stop"
        title="Stop"
      >
        <span class="text-2xl">■</span>
      </button>

      <!-- Position Display -->
      <div class="panel-pixel px-4 py-2 min-w-[80px] text-center">
        <span class="font-pixel text-sm text-chip-green">
          {{ positionDisplay }}
        </span>
      </div>
    </div>

    <!-- Tempo Control -->
    <div class="flex items-center gap-2">
      <span class="font-body text-xl text-chip-gray">BPM</span>

      <button
        class="btn-pixel w-8 h-8 flex items-center justify-center"
        @click="adjustTempo(-5)"
      >
        -
      </button>

      <input
        type="number"
        :value="tempo"
        @change="handleTempoInput"
        min="40"
        max="240"
        class="w-20 h-10 bg-chip-black border-3 border-chip-gray text-center font-pixel text-sm text-chip-yellow focus:border-chip-cyan outline-none"
      />

      <button
        class="btn-pixel w-8 h-8 flex items-center justify-center"
        @click="adjustTempo(5)"
      >
        +
      </button>
    </div>

    <!-- Master Volume -->
    <div class="flex items-center gap-2">
      <span class="font-body text-xl text-chip-gray">VOL</span>

      <input
        type="range"
        v-model.number="masterVolume"
        min="0"
        max="1"
        step="0.05"
        class="w-24 h-2 bg-chip-gray rounded-none appearance-none cursor-pointer accent-chip-green"
      />

      <span class="font-body text-xl text-chip-white w-12">
        {{ Math.round(masterVolume * 100) }}%
      </span>
    </div>

    <!-- Quick Actions -->
    <div class="flex items-center gap-2">
      <button
        class="btn-pixel-danger text-xs"
        @click="projectStore.clearAllTracks"
        title="Clear All"
      >
        CLEAR
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Custom range slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: #323232;
  height: 8px;
  border: 2px solid #6B6B6B;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #00A800;
  cursor: pointer;
  border: 2px solid #FCFCFC;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #00A800;
  cursor: pointer;
  border: 2px solid #FCFCFC;
  border-radius: 0;
}

/* Number input styling */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
