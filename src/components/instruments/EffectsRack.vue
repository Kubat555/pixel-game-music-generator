<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useInstrumentStore } from '@/stores/useInstrumentStore'

const instrumentStore = useInstrumentStore()
const { selectedTrackId, currentInstrument } = storeToRefs(instrumentStore)

const effects = computed(() => currentInstrument.value?.effects ?? {
  arpeggio: false,
  vibrato: false,
  glide: false,
  bitcrush: false,
})

function toggleEffect(effect: 'arpeggio' | 'vibrato' | 'glide' | 'bitcrush') {
  instrumentStore.toggleEffect(selectedTrackId.value, effect)
}

const effectButtons = [
  { id: 'arpeggio', label: 'ARP', description: 'Arpeggiator - rapid note sequence', color: 'chip-cyan' },
  { id: 'vibrato', label: 'VIB', description: 'Vibrato - pitch wobble', color: 'chip-yellow' },
  { id: 'glide', label: 'GLD', description: 'Glide - smooth pitch slides', color: 'chip-purple' },
  { id: 'bitcrush', label: 'BIT', description: 'Bitcrush - lo-fi distortion', color: 'chip-orange' },
] as const
</script>

<template>
  <div class="panel-pixel">
    <h4 class="font-pixel text-xs text-chip-white mb-3">EFFECTS</h4>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="fx in effectButtons"
        :key="fx.id"
        class="py-3 px-2 font-pixel text-xs border-3 transition-all"
        :class="effects[fx.id]
          ? `bg-${fx.color} border-${fx.color} text-chip-black`
          : 'bg-chip-black border-chip-gray text-chip-gray hover:border-chip-white hover:text-chip-white'"
        :title="fx.description"
        @click="toggleEffect(fx.id)"
      >
        {{ fx.label }}
        <span class="block text-xs mt-1 opacity-75">
          {{ effects[fx.id] ? 'ON' : 'OFF' }}
        </span>
      </button>
    </div>

    <!-- Effect Parameters (when effect is active) -->
    <div v-if="effects.arpeggio" class="mt-3 p-2 bg-chip-black border-2 border-chip-cyan">
      <span class="font-body text-sm text-chip-cyan">Arpeggio Pattern</span>
      <div class="flex gap-1 mt-2">
        <button
          class="flex-1 py-1 font-body text-xs bg-chip-cyan text-chip-black"
        >
          Major
        </button>
        <button
          class="flex-1 py-1 font-body text-xs bg-chip-darkgray text-chip-gray"
        >
          Minor
        </button>
        <button
          class="flex-1 py-1 font-body text-xs bg-chip-darkgray text-chip-gray"
        >
          Oct
        </button>
      </div>
    </div>

    <div v-if="effects.vibrato" class="mt-3 p-2 bg-chip-black border-2 border-chip-yellow">
      <span class="font-body text-sm text-chip-yellow">Vibrato Depth</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value="0.5"
        class="w-full mt-2"
      />
    </div>

    <div v-if="effects.bitcrush" class="mt-3 p-2 bg-chip-black border-2 border-chip-orange">
      <span class="font-body text-sm text-chip-orange">Bit Depth</span>
      <div class="flex justify-between mt-2 font-body text-xs text-chip-gray">
        <span>4-bit</span>
        <span>8-bit</span>
        <span>16-bit</span>
      </div>
      <input
        type="range"
        min="4"
        max="16"
        step="1"
        value="8"
        class="w-full"
      />
    </div>
  </div>
</template>

<style scoped>
/* Dynamic color classes */
.bg-chip-cyan { background-color: #00A8A8; }
.border-chip-cyan { border-color: #00A8A8; }
.bg-chip-yellow { background-color: #FCC400; }
.border-chip-yellow { border-color: #FCC400; }
.bg-chip-purple { background-color: #9000F8; }
.border-chip-purple { border-color: #9000F8; }
.bg-chip-orange { background-color: #FC7400; }
.border-chip-orange { border-color: #FC7400; }
</style>
