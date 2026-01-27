import { ChiptuneOscillator } from './ChiptuneOscillator'
import { Scheduler } from './Scheduler'
import type { Note } from '@/types/note'
import type { InstrumentConfig } from '@/types/instrument'
import type { Track } from '@/types/project'
import { AudioRenderer, type RenderOptions } from './AudioRenderer'

/**
 * Main audio engine singleton
 * Manages AudioContext, instruments, and playback
 */
export class AudioEngine {
  private static instance: AudioEngine | null = null

  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private oscillator: ChiptuneOscillator | null = null
  private _scheduler: Scheduler | null = null

  private isInitialized = false

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  /**
   * Initialize the audio engine
   * Must be called after a user gesture (click/tap)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      await this.resume()
      return
    }

    // Create audio context with low latency hint
    this.context = new AudioContext({ latencyHint: 'interactive' })

    // Set up master bus chain: instruments -> compressor -> gain -> destination
    this.setupMasterBus()

    // Create oscillator (connected to compressor input)
    this.oscillator = new ChiptuneOscillator(this.context, this.compressor!)

    // Create scheduler
    this._scheduler = new Scheduler(this.context)

    this.isInitialized = true

    // Resume if suspended
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  /**
   * Set up the master audio bus
   */
  private setupMasterBus(): void {
    if (!this.context) return

    // Create compressor for limiting and glue
    this.compressor = this.context.createDynamicsCompressor()
    this.compressor.threshold.value = -10
    this.compressor.knee.value = 5
    this.compressor.ratio.value = 4
    this.compressor.attack.value = 0.005
    this.compressor.release.value = 0.1

    // Create master gain
    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = 0.8

    // Connect chain
    this.compressor.connect(this.masterGain)
    this.masterGain.connect(this.context.destination)
  }

  /**
   * Resume audio context (needed after browser suspension)
   */
  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume()
    }
  }

  /**
   * Get the scheduler instance
   */
  get scheduler(): Scheduler {
    if (!this._scheduler) {
      throw new Error('AudioEngine not initialized. Call initialize() first.')
    }
    return this._scheduler
  }

  /**
   * Get the audio context
   */
  getContext(): AudioContext | null {
    return this.context
  }

  /**
   * Check if engine is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  /**
   * Get current master volume
   */
  getMasterVolume(): number {
    return this.masterGain?.gain.value ?? 0.8
  }

  /**
   * Play a single note with instrument configuration
   */
  playNote(note: Note, time: number, config: InstrumentConfig): void {
    if (!this.oscillator || !this.context) return

    const duration = this._scheduler?.durationToTime(note.duration) ?? 0.2

    // Apply velocity to gain
    const noteConfig: InstrumentConfig = {
      ...config,
      gain: config.gain * note.velocity,
    }

    this.oscillator.playNote(note.pitch, duration, time, noteConfig)
  }

  /**
   * Play a drum hit
   */
  playDrum(
    drumType: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'openhat' | 'crash' | 'rimshot',
    time: number,
    velocity: number
  ): void {
    if (!this.oscillator) return
    this.oscillator.playDrum(drumType, time, velocity)
  }

  /**
   * Play notes for a specific beat across all tracks
   */
  playBeat(
    tracks: Track[],
    instruments: Record<string, InstrumentConfig>,
    beat: number,
    time: number
  ): void {
    if (!this.context) return

    // Check for solo tracks
    const hasSolo = tracks.some(t => t.solo)

    for (const track of tracks) {
      // Skip muted tracks or tracks that aren't solo when there's a solo
      if (track.muted) continue
      if (hasSolo && !track.solo) continue

      // Get notes at this beat
      const notesAtBeat = track.notes.filter(n => n.startBeat === beat)

      for (const note of notesAtBeat) {
        const config = instruments[track.id]
        if (!config) continue

        // Apply track volume
        const noteConfig: InstrumentConfig = {
          ...config,
          gain: config.gain * track.volume * note.velocity,
        }

        if (track.type === 'drums') {
          // Map pitch to drum sounds
          const drumMap: Record<number, 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'openhat' | 'crash' | 'rimshot'> = {
            36: 'kick',     // C2
            38: 'snare',    // D2
            42: 'hihat',    // F#2 - Closed Hi-Hat
            44: 'clap',     // G#2
            45: 'tom',      // A2
            46: 'openhat',  // A#2 - Open Hi-Hat
            47: 'rimshot',  // B2
            49: 'crash',    // C#3
          }
          const drumType = drumMap[note.pitch] || 'kick'
          this.playDrum(drumType, time, noteConfig.gain)
        } else {
          this.playNote(note, time, noteConfig)
        }
      }
    }
  }

  /**
   * Preview a note immediately (for UI feedback)
   */
  previewNote(pitch: number, config: InstrumentConfig): void {
    if (!this.oscillator || !this.context) return

    const noteConfig: InstrumentConfig = {
      ...config,
      adsr: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.1,
      },
    }

    this.oscillator.playNote(pitch, 0.2, this.context.currentTime, noteConfig)
  }

  /**
   * Preview a drum hit immediately
   */
  previewDrum(drumType: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'openhat' | 'crash' | 'rimshot'): void {
    if (!this.oscillator || !this.context) return
    this.oscillator.playDrum(drumType, this.context.currentTime, 0.8)
  }

  /**
   * Get current time from audio context
   */
  getCurrentTime(): number {
    return this.context?.currentTime ?? 0
  }

  /**
   * Get the master output node for connecting analyzers/visualizers
   * Returns the compressor node as the connection point
   */
  getAnalyserConnectionPoint(): AudioNode | null {
    return this.masterGain
  }

  /**
   * Render project to WAV file and download
   */
  async renderToWav(
    tracks: Track[],
    instruments: Record<string, InstrumentConfig>,
    tempo: number,
    loopStart: number,
    loopEnd: number,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const options: RenderOptions = {
      tracks,
      instruments,
      tempo,
      loopStart,
      loopEnd,
      sampleRate: 44100,
      onProgress,
    }

    const wavBlob = await AudioRenderer.renderToWav(options)

    // Download the file
    const url = URL.createObjectURL(wavBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this._scheduler?.stop()
    this.context?.close()
    this.context = null
    this.masterGain = null
    this.compressor = null
    this.oscillator = null
    this._scheduler = null
    this.isInitialized = false
    AudioEngine.instance = null
  }
}
