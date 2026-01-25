import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  InstrumentConfig,
  ADSRParams,
  EffectParams,
  WaveformType,
} from '@/types/instrument'
import {
  DEFAULT_ADSR,
  DEFAULT_EFFECTS,
  DEFAULT_INSTRUMENT,
} from '@/types/instrument'

export const useInstrumentStore = defineStore('instrument', () => {
  // State
  const selectedTrackId = ref('lead')
  const instruments = ref<Record<string, InstrumentConfig>>({
    lead: {
      waveform: 'square',
      adsr: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
      effects: { ...DEFAULT_EFFECTS },
      pulseWidth: 0.5,
      detune: 0,
      gain: 0.8,
    },
    bass: {
      waveform: 'triangle',
      adsr: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.3 },
      effects: { ...DEFAULT_EFFECTS, glide: true },
      pulseWidth: 0.5,
      detune: 0,
      gain: 0.9,
    },
    harmony: {
      waveform: 'pulse',
      adsr: { attack: 0.05, decay: 0.15, sustain: 0.6, release: 0.25 },
      effects: { ...DEFAULT_EFFECTS },
      pulseWidth: 0.25,
      detune: 0,
      gain: 0.6,
    },
    drums: {
      waveform: 'noise',
      adsr: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      effects: { ...DEFAULT_EFFECTS },
      pulseWidth: 0.5,
      detune: 0,
      gain: 1.0,
    },
  })

  // Presets
  const presets = ref<Array<{ name: string; config: InstrumentConfig }>>([
    {
      name: 'Classic Lead',
      config: {
        waveform: 'square',
        adsr: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
        effects: { ...DEFAULT_EFFECTS },
        pulseWidth: 0.5,
        detune: 0,
        gain: 0.8,
      },
    },
    {
      name: 'Punchy Lead',
      config: {
        waveform: 'pulse',
        adsr: { attack: 0.005, decay: 0.05, sustain: 0.8, release: 0.1 },
        effects: { ...DEFAULT_EFFECTS },
        pulseWidth: 0.25,
        detune: 0,
        gain: 0.9,
      },
    },
    {
      name: 'Soft Triangle',
      config: {
        waveform: 'triangle',
        adsr: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.4 },
        effects: { ...DEFAULT_EFFECTS },
        pulseWidth: 0.5,
        detune: 0,
        gain: 0.7,
      },
    },
    {
      name: 'Deep Bass',
      config: {
        waveform: 'triangle',
        adsr: { attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.4 },
        effects: { ...DEFAULT_EFFECTS },
        pulseWidth: 0.5,
        detune: 0,
        gain: 1.0,
      },
    },
    {
      name: 'Square Bass',
      config: {
        waveform: 'square',
        adsr: { attack: 0.01, decay: 0.15, sustain: 0.8, release: 0.2 },
        effects: { ...DEFAULT_EFFECTS },
        pulseWidth: 0.5,
        detune: 0,
        gain: 0.9,
      },
    },
  ])

  // Getters
  const currentInstrument = computed(() => instruments.value[selectedTrackId.value])

  // Actions
  function selectTrack(trackId: string): void {
    if (instruments.value[trackId]) {
      selectedTrackId.value = trackId
    }
  }

  function setWaveform(trackId: string, waveform: WaveformType): void {
    if (instruments.value[trackId]) {
      instruments.value[trackId].waveform = waveform
    }
  }

  function updateADSR(trackId: string, updates: Partial<ADSRParams>): void {
    if (instruments.value[trackId]) {
      Object.assign(instruments.value[trackId].adsr, updates)
    }
  }

  function toggleEffect(trackId: string, effect: keyof EffectParams): void {
    if (instruments.value[trackId]) {
      const effects = instruments.value[trackId].effects
      if (typeof effects[effect] === 'boolean') {
        ;(effects[effect] as boolean) = !(effects[effect] as boolean)
      }
    }
  }

  function setEffectParam<K extends keyof EffectParams>(
    trackId: string,
    effect: K,
    value: EffectParams[K]
  ): void {
    if (instruments.value[trackId]) {
      instruments.value[trackId].effects[effect] = value
    }
  }

  function setPulseWidth(trackId: string, width: number): void {
    if (instruments.value[trackId]) {
      instruments.value[trackId].pulseWidth = Math.max(0.1, Math.min(0.9, width))
    }
  }

  function setDetune(trackId: string, cents: number): void {
    if (instruments.value[trackId]) {
      instruments.value[trackId].detune = Math.max(-100, Math.min(100, cents))
    }
  }

  function setGain(trackId: string, gain: number): void {
    if (instruments.value[trackId]) {
      instruments.value[trackId].gain = Math.max(0, Math.min(1, gain))
    }
  }

  function applyPreset(trackId: string, presetIndex: number): void {
    if (instruments.value[trackId] && presets.value[presetIndex]) {
      const preset = presets.value[presetIndex].config
      instruments.value[trackId] = {
        ...preset,
        adsr: { ...preset.adsr },
        effects: { ...preset.effects },
      }
    }
  }

  function copyInstrument(fromTrackId: string, toTrackId: string): void {
    if (instruments.value[fromTrackId] && instruments.value[toTrackId]) {
      const from = instruments.value[fromTrackId]
      instruments.value[toTrackId] = {
        ...from,
        adsr: { ...from.adsr },
        effects: { ...from.effects },
      }
    }
  }

  function resetToDefault(trackId: string): void {
    if (instruments.value[trackId]) {
      instruments.value[trackId] = {
        ...DEFAULT_INSTRUMENT,
        adsr: { ...DEFAULT_ADSR },
        effects: { ...DEFAULT_EFFECTS },
      }
    }
  }

  return {
    // State
    selectedTrackId,
    instruments,
    presets,

    // Getters
    currentInstrument,

    // Actions
    selectTrack,
    setWaveform,
    updateADSR,
    toggleEffect,
    setEffectParam,
    setPulseWidth,
    setDetune,
    setGain,
    applyPreset,
    copyInstrument,
    resetToDefault,
  }
})
