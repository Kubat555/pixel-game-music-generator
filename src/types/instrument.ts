export type WaveformType = 'square' | 'triangle' | 'sawtooth' | 'pulse' | 'noise'

export interface ADSRParams {
  attack: number   // 0-2 seconds
  decay: number    // 0-2 seconds
  sustain: number  // 0-1 level
  release: number  // 0-2 seconds
}

export interface EffectParams {
  arpeggio: boolean
  arpeggioPattern: number[]  // Semitone offsets
  arpeggioSpeed: number      // Notes per beat
  vibrato: boolean
  vibratoDepth: number       // Semitones
  vibratoSpeed: number       // Hz
  glide: boolean
  glideTime: number          // Seconds
  bitcrush: boolean
  bitcrushBits: number       // 1-16
  bitcrushFreq: number       // Sample rate reduction
}

export interface InstrumentConfig {
  waveform: WaveformType
  adsr: ADSRParams
  effects: EffectParams
  pulseWidth: number  // 0-1 (for pulse wave duty cycle)
  detune: number      // Cents (-100 to 100)
  gain: number        // 0-1
}

export const DEFAULT_ADSR: ADSRParams = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.2,
}

export const DEFAULT_EFFECTS: EffectParams = {
  arpeggio: false,
  arpeggioPattern: [0, 4, 7],
  arpeggioSpeed: 8,
  vibrato: false,
  vibratoDepth: 0.5,
  vibratoSpeed: 5,
  glide: false,
  glideTime: 0.1,
  bitcrush: false,
  bitcrushBits: 8,
  bitcrushFreq: 0.5,
}

export const DEFAULT_INSTRUMENT: InstrumentConfig = {
  waveform: 'square',
  adsr: { ...DEFAULT_ADSR },
  effects: { ...DEFAULT_EFFECTS },
  pulseWidth: 0.5,
  detune: 0,
  gain: 0.8,
}
