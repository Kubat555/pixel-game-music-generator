<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import type { WaveformType } from '@/types/instrument'
import EffectsRack from './EffectsRack.vue'

const instrumentStore = useInstrumentStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const { selectedTrackId, currentInstrument, presets } = storeToRefs(instrumentStore)

// Get the selected track info
const selectedTrack = computed(() =>
  projectStore.tracks.find(t => t.id === selectedTrackId.value)
)

// Waveform options
const waveforms: Array<{ value: WaveformType; label: string; icon: string }> = [
  { value: 'square', label: 'Square', icon: '⬛' },
  { value: 'triangle', label: 'Triangle', icon: '△' },
  { value: 'sawtooth', label: 'Saw', icon: '⧨' },
  { value: 'pulse', label: 'Pulse', icon: '▮▯' },
]

function setWaveform(waveform: WaveformType) {
  instrumentStore.setWaveform(selectedTrackId.value, waveform)
}

function updateADSRParam(param: 'attack' | 'decay' | 'sustain' | 'release', event: Event) {
  const input = event.target as HTMLInputElement
  const value = parseFloat(input.value)
  instrumentStore.updateADSR(selectedTrackId.value, { [param]: value })
}

function applyPreset(index: number) {
  instrumentStore.applyPreset(selectedTrackId.value, index)
}

// Track color mapping
const trackColors: Record<string, string> = {
  lead: 'text-chip-cyan',
  bass: 'text-chip-purple',
  harmony: 'text-chip-yellow',
  drums: 'text-chip-orange',
}
</script>

<template>
  <div class="space-y-4">
    <!-- Track Info -->
    <div class="panel-pixel">
      <h3
        class="font-pixel text-xs mb-2"
        :class="trackColors[selectedTrackId]"
      >
        {{ selectedTrack?.name ?? 'INSTRUMENT' }}
      </h3>

      <p class="font-body text-lg text-chip-gray">
        {{ currentInstrument?.waveform ?? 'square' }} wave
      </p>
    </div>

    <!-- Waveform Selector (not for drums) -->
    <div
      v-if="selectedTrack?.type !== 'drums'"
      class="panel-pixel"
    >
      <h4 class="font-pixel text-xs text-chip-white mb-3">WAVEFORM</h4>

      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="wf in waveforms"
          :key="wf.value"
          class="btn-pixel text-xs py-3"
          :class="currentInstrument?.waveform === wf.value ? 'bg-chip-green' : ''"
          @click="setWaveform(wf.value)"
        >
          <span class="block text-xl mb-1">{{ wf.icon }}</span>
          <span>{{ wf.label }}</span>
        </button>
      </div>
    </div>

    <!-- ADSR Envelope (Advanced mode only, not for drums) -->
    <div
      v-if="uiStore.isAdvancedMode && selectedTrack?.type !== 'drums'"
      class="panel-pixel"
    >
      <h4 class="font-pixel text-xs text-chip-white mb-3">ENVELOPE</h4>

      <div class="space-y-3">
        <!-- Attack -->
        <div class="flex items-center gap-2">
          <span class="font-body text-lg text-chip-gray w-12">ATK</span>
          <input
            type="range"
            :value="currentInstrument?.adsr.attack ?? 0.01"
            @input="updateADSRParam('attack', $event)"
            min="0.001"
            max="1"
            step="0.01"
            class="flex-1 accent-chip-cyan"
          />
          <span class="font-body text-lg text-chip-white w-12 text-right">
            {{ ((currentInstrument?.adsr.attack ?? 0.01) * 1000).toFixed(0) }}ms
          </span>
        </div>

        <!-- Decay -->
        <div class="flex items-center gap-2">
          <span class="font-body text-lg text-chip-gray w-12">DEC</span>
          <input
            type="range"
            :value="currentInstrument?.adsr.decay ?? 0.1"
            @input="updateADSRParam('decay', $event)"
            min="0.01"
            max="1"
            step="0.01"
            class="flex-1 accent-chip-yellow"
          />
          <span class="font-body text-lg text-chip-white w-12 text-right">
            {{ ((currentInstrument?.adsr.decay ?? 0.1) * 1000).toFixed(0) }}ms
          </span>
        </div>

        <!-- Sustain -->
        <div class="flex items-center gap-2">
          <span class="font-body text-lg text-chip-gray w-12">SUS</span>
          <input
            type="range"
            :value="currentInstrument?.adsr.sustain ?? 0.7"
            @input="updateADSRParam('sustain', $event)"
            min="0"
            max="1"
            step="0.01"
            class="flex-1 accent-chip-green"
          />
          <span class="font-body text-lg text-chip-white w-12 text-right">
            {{ Math.round((currentInstrument?.adsr.sustain ?? 0.7) * 100) }}%
          </span>
        </div>

        <!-- Release -->
        <div class="flex items-center gap-2">
          <span class="font-body text-lg text-chip-gray w-12">REL</span>
          <input
            type="range"
            :value="currentInstrument?.adsr.release ?? 0.2"
            @input="updateADSRParam('release', $event)"
            min="0.01"
            max="2"
            step="0.01"
            class="flex-1 accent-chip-orange"
          />
          <span class="font-body text-lg text-chip-white w-12 text-right">
            {{ ((currentInstrument?.adsr.release ?? 0.2) * 1000).toFixed(0) }}ms
          </span>
        </div>
      </div>
    </div>

    <!-- Effects (Advanced mode only, not for drums) -->
    <EffectsRack
      v-if="uiStore.isAdvancedMode && selectedTrack?.type !== 'drums'"
    />

    <!-- Presets -->
    <div
      v-if="selectedTrack?.type !== 'drums'"
      class="panel-pixel"
    >
      <h4 class="font-pixel text-xs text-chip-white mb-3">PRESETS</h4>

      <div class="space-y-2">
        <button
          v-for="(preset, index) in presets"
          :key="index"
          class="btn-pixel w-full text-xs text-left"
          @click="applyPreset(index)"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>

    <!-- Drum Info -->
    <div
      v-if="selectedTrack?.type === 'drums'"
      class="panel-pixel"
    >
      <h4 class="font-pixel text-xs text-chip-white mb-3">DRUM SOUNDS</h4>

      <div class="space-y-2 font-body text-lg">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 bg-chip-purple"></span>
          <span class="text-chip-gray">KCK</span>
          <span class="text-chip-white">- Kick Drum</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 bg-chip-cyan"></span>
          <span class="text-chip-gray">SNR</span>
          <span class="text-chip-white">- Snare</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 bg-chip-yellow"></span>
          <span class="text-chip-gray">HAT</span>
          <span class="text-chip-white">- Hi-Hat</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 bg-chip-orange"></span>
          <span class="text-chip-gray">TOM</span>
          <span class="text-chip-white">- Tom</span>
        </div>
      </div>
    </div>

    <!-- Track Volume -->
    <div class="panel-pixel">
      <h4 class="font-pixel text-xs text-chip-white mb-3">VOLUME</h4>

      <div class="flex items-center gap-2">
        <input
          type="range"
          :value="selectedTrack?.volume ?? 0.8"
          @input="projectStore.setTrackVolume(selectedTrackId, parseFloat(($event.target as HTMLInputElement).value))"
          min="0"
          max="1"
          step="0.05"
          class="flex-1 accent-chip-green"
        />
        <span class="font-body text-lg text-chip-white w-12 text-right">
          {{ Math.round((selectedTrack?.volume ?? 0.8) * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  width: 14px;
  height: 14px;
  background: currentColor;
  cursor: pointer;
  border: 2px solid #FCFCFC;
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: currentColor;
  cursor: pointer;
  border: 2px solid #FCFCFC;
  border-radius: 0;
}

.accent-chip-cyan::-webkit-slider-thumb { background: #00A8A8; }
.accent-chip-yellow::-webkit-slider-thumb { background: #FCC400; }
.accent-chip-green::-webkit-slider-thumb { background: #00A800; }
.accent-chip-orange::-webkit-slider-thumb { background: #FC7400; }

.accent-chip-cyan::-moz-range-thumb { background: #00A8A8; }
.accent-chip-yellow::-moz-range-thumb { background: #FCC400; }
.accent-chip-green::-moz-range-thumb { background: #00A800; }
.accent-chip-orange::-moz-range-thumb { background: #FC7400; }
</style>
