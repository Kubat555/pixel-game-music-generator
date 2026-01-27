import type { Track } from '@/types/project'
import type { InstrumentConfig, ADSRParams } from '@/types/instrument'

export interface RenderOptions {
  tracks: Track[]
  instruments: Record<string, InstrumentConfig>
  tempo: number
  loopStart: number
  loopEnd: number
  sampleRate?: number
  onProgress?: (progress: number) => void
}

/**
 * Offline audio renderer for exporting to WAV
 */
export class AudioRenderer {
  /**
   * Render project to WAV blob
   */
  static async renderToWav(options: RenderOptions): Promise<Blob> {
    const {
      tracks,
      instruments,
      tempo,
      loopStart,
      loopEnd,
      sampleRate = 44100,
      onProgress,
    } = options

    // Calculate duration
    const totalBeats = loopEnd - loopStart
    const secondsPerBeat = 60.0 / tempo
    const secondsPer16th = secondsPerBeat / 4
    const duration = totalBeats * secondsPer16th + 1 // Add 1 second for release tails

    // Create offline context
    const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate)

    // Create master chain
    const compressor = offlineContext.createDynamicsCompressor()
    compressor.threshold.value = -10
    compressor.knee.value = 5
    compressor.ratio.value = 4
    compressor.attack.value = 0.005
    compressor.release.value = 0.1

    const masterGain = offlineContext.createGain()
    masterGain.gain.value = 0.8

    compressor.connect(masterGain)
    masterGain.connect(offlineContext.destination)

    // Pre-generate pulse waves
    const pulseWaves = this.createPulseWaves(offlineContext)

    // Check for solo tracks
    const hasSolo = tracks.some(t => t.solo)

    // Schedule all notes
    let scheduledNotes = 0
    const totalNotes = tracks.reduce((sum, t) => sum + t.notes.length, 0)

    for (const track of tracks) {
      // Skip muted tracks or tracks that aren't solo when there's a solo
      if (track.muted) continue
      if (hasSolo && !track.solo) continue

      const config = instruments[track.id]
      if (!config) continue

      for (const note of track.notes) {
        // Only render notes within loop region
        if (note.startBeat < loopStart || note.startBeat >= loopEnd) continue

        const time = (note.startBeat - loopStart) * secondsPer16th
        const noteDuration = note.duration * secondsPer16th

        // Apply track volume
        const noteConfig: InstrumentConfig = {
          ...config,
          gain: config.gain * track.volume * note.velocity,
        }

        if (track.type === 'drums') {
          const drumMap: Record<number, 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'openhat' | 'crash' | 'rimshot'> = {
            36: 'kick',
            38: 'snare',
            42: 'hihat',
            44: 'clap',
            45: 'tom',
            46: 'openhat',
            47: 'rimshot',
            49: 'crash',
          }
          const drumType = drumMap[note.pitch] || 'kick'
          this.scheduleDrum(offlineContext, compressor, drumType, time, noteConfig.gain)
        } else {
          this.scheduleNote(offlineContext, compressor, pulseWaves, note.pitch, noteDuration, time, noteConfig)
        }

        scheduledNotes++
        onProgress?.((scheduledNotes / totalNotes) * 0.5) // 50% for scheduling
      }
    }

    // Render
    const renderedBuffer = await offlineContext.startRendering()
    onProgress?.(0.9) // 90% for rendering

    // Convert to WAV
    const wavBlob = this.bufferToWav(renderedBuffer)
    onProgress?.(1.0) // 100% done

    return wavBlob
  }

  /**
   * Create pulse waves for offline context
   */
  private static createPulseWaves(context: OfflineAudioContext): Map<number, PeriodicWave> {
    const waves = new Map<number, PeriodicWave>()
    const dutyCycles = [0.125, 0.25, 0.5, 0.75]

    for (const duty of dutyCycles) {
      const harmonics = 64
      const real = new Float32Array(harmonics)
      const imag = new Float32Array(harmonics)

      for (let n = 1; n < harmonics; n++) {
        const coefficient = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty)
        imag[n] = coefficient
        real[n] = 0
      }

      waves.set(duty, context.createPeriodicWave(real, imag, { disableNormalization: false }))
    }

    return waves
  }

  /**
   * Get closest pulse wave
   */
  private static getPulseWave(waves: Map<number, PeriodicWave>, dutyCycle: number): PeriodicWave {
    const duties = [0.125, 0.25, 0.5, 0.75]
    let closest = 0.5
    let minDiff = Math.abs(dutyCycle - closest)

    for (const d of duties) {
      const diff = Math.abs(dutyCycle - d)
      if (diff < minDiff) {
        minDiff = diff
        closest = d
      }
    }

    return waves.get(closest)!
  }

  /**
   * Schedule a note for offline rendering
   */
  private static scheduleNote(
    context: OfflineAudioContext,
    destination: AudioNode,
    pulseWaves: Map<number, PeriodicWave>,
    pitch: number,
    duration: number,
    startTime: number,
    config: InstrumentConfig
  ): void {
    const { waveform, adsr, pulseWidth, detune, gain } = config
    const frequency = 440 * Math.pow(2, (pitch - 69) / 12)

    if (waveform === 'noise') {
      this.scheduleNoise(context, destination, duration, startTime, adsr, gain)
      return
    }

    const osc = context.createOscillator()
    const gainNode = context.createGain()

    if (waveform === 'pulse') {
      osc.setPeriodicWave(this.getPulseWave(pulseWaves, pulseWidth))
    } else {
      osc.type = waveform as OscillatorType
    }

    osc.frequency.setValueAtTime(frequency, startTime)
    osc.detune.setValueAtTime(detune, startTime)

    this.applyADSR(gainNode, startTime, duration, adsr, gain)

    osc.connect(gainNode)
    gainNode.connect(destination)

    osc.start(startTime)
    osc.stop(startTime + duration + adsr.release + 0.05)
  }

  /**
   * Schedule noise for offline rendering
   */
  private static scheduleNoise(
    context: OfflineAudioContext,
    destination: AudioNode,
    duration: number,
    startTime: number,
    adsr: ADSRParams,
    gain: number
  ): void {
    const bufferSize = context.sampleRate * (duration + adsr.release + 0.1)
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = context.createBufferSource()
    source.buffer = buffer

    const gainNode = context.createGain()
    this.applyADSR(gainNode, startTime, duration, adsr, gain)

    source.connect(gainNode)
    gainNode.connect(destination)

    source.start(startTime)
    source.stop(startTime + duration + adsr.release + 0.05)
  }

  /**
   * Apply ADSR envelope
   */
  private static applyADSR(
    gainNode: GainNode,
    startTime: number,
    duration: number,
    adsr: ADSRParams,
    maxGain: number
  ): void {
    const { attack, decay, sustain, release } = adsr
    const peakGain = maxGain
    const sustainGain = maxGain * sustain

    const attackEnd = startTime + attack
    const decayEnd = attackEnd + decay
    const releaseStart = startTime + Math.max(duration - release, attack + decay)
    const releaseEnd = releaseStart + release

    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(peakGain, attackEnd)
    gainNode.gain.linearRampToValueAtTime(sustainGain, decayEnd)
    gainNode.gain.setValueAtTime(sustainGain, releaseStart)
    gainNode.gain.linearRampToValueAtTime(0, releaseEnd)
  }

  /**
   * Schedule a drum sound for offline rendering
   */
  private static scheduleDrum(
    context: OfflineAudioContext,
    destination: AudioNode,
    drumType: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'openhat' | 'crash' | 'rimshot',
    startTime: number,
    gain: number
  ): void {
    switch (drumType) {
      case 'kick':
        this.scheduleKick(context, destination, startTime, gain)
        break
      case 'snare':
        this.scheduleSnare(context, destination, startTime, gain)
        break
      case 'hihat':
        this.scheduleHihat(context, destination, startTime, gain)
        break
      case 'tom':
        this.scheduleTom(context, destination, startTime, gain)
        break
      case 'clap':
        this.scheduleClap(context, destination, startTime, gain)
        break
      case 'openhat':
        this.scheduleOpenHat(context, destination, startTime, gain)
        break
      case 'crash':
        this.scheduleCrash(context, destination, startTime, gain)
        break
      case 'rimshot':
        this.scheduleRimshot(context, destination, startTime, gain)
        break
    }
  }

  private static scheduleKick(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    const osc = context.createOscillator()
    const gainNode = context.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, startTime)
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1)

    gainNode.gain.setValueAtTime(gain, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)

    osc.connect(gainNode)
    gainNode.connect(destination)

    osc.start(startTime)
    osc.stop(startTime + 0.3)
  }

  private static scheduleSnare(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    // Noise component
    const noiseLength = 0.2
    const noiseBuffer = context.createBuffer(1, context.sampleRate * noiseLength, context.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1
    }

    const noiseSource = context.createBufferSource()
    noiseSource.buffer = noiseBuffer

    const noiseGain = context.createGain()
    noiseGain.gain.setValueAtTime(gain * 0.7, startTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2)

    // Tone component
    const osc = context.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, startTime)
    osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.05)

    const oscGain = context.createGain()
    oscGain.gain.setValueAtTime(gain * 0.3, startTime)
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1)

    noiseSource.connect(noiseGain)
    noiseGain.connect(destination)
    osc.connect(oscGain)
    oscGain.connect(destination)

    noiseSource.start(startTime)
    noiseSource.stop(startTime + 0.2)
    osc.start(startTime)
    osc.stop(startTime + 0.1)
  }

  private static scheduleHihat(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    const length = 0.05
    const buffer = context.createBuffer(1, context.sampleRate * length, context.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = context.createBufferSource()
    source.buffer = buffer

    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(7000, startTime)

    const gainNode = context.createGain()
    gainNode.gain.setValueAtTime(gain * 0.5, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05)

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(destination)

    source.start(startTime)
    source.stop(startTime + 0.05)
  }

  private static scheduleTom(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    const osc = context.createOscillator()
    const gainNode = context.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, startTime)
    osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.15)

    gainNode.gain.setValueAtTime(gain, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25)

    osc.connect(gainNode)
    gainNode.connect(destination)

    osc.start(startTime)
    osc.stop(startTime + 0.25)
  }

  private static scheduleClap(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    const layers = 3
    for (let i = 0; i < layers; i++) {
      const delay = i * 0.01

      const noiseLength = 0.08
      const noiseBuffer = context.createBuffer(1, context.sampleRate * noiseLength, context.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      for (let j = 0; j < noiseBuffer.length; j++) {
        noiseData[j] = Math.random() * 2 - 1
      }

      const noiseSource = context.createBufferSource()
      noiseSource.buffer = noiseBuffer

      const filter = context.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1500, startTime + delay)
      filter.Q.setValueAtTime(1.5, startTime + delay)

      const noiseGain = context.createGain()
      noiseGain.gain.setValueAtTime(gain * 0.6, startTime + delay)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + delay + 0.1)

      noiseSource.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(destination)

      noiseSource.start(startTime + delay)
      noiseSource.stop(startTime + delay + 0.15)
    }
  }

  private static scheduleOpenHat(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    const length = 0.2
    const buffer = context.createBuffer(1, context.sampleRate * length, context.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = context.createBufferSource()
    source.buffer = buffer

    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(6000, startTime)

    const bandpass = context.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(10000, startTime)
    bandpass.Q.setValueAtTime(0.5, startTime)

    const gainNode = context.createGain()
    gainNode.gain.setValueAtTime(gain * 0.4, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2)

    source.connect(filter)
    filter.connect(bandpass)
    bandpass.connect(gainNode)
    gainNode.connect(destination)

    source.start(startTime)
    source.stop(startTime + 0.25)
  }

  private static scheduleCrash(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    const length = 0.8
    const buffer = context.createBuffer(1, context.sampleRate * length, context.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = context.createBufferSource()
    source.buffer = buffer

    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.setValueAtTime(4000, startTime)

    const peak = context.createBiquadFilter()
    peak.type = 'peaking'
    peak.frequency.setValueAtTime(8000, startTime)
    peak.Q.setValueAtTime(2, startTime)
    peak.gain.setValueAtTime(6, startTime)

    const gainNode = context.createGain()
    gainNode.gain.setValueAtTime(gain * 0.5, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8)

    source.connect(highpass)
    highpass.connect(peak)
    peak.connect(gainNode)
    gainNode.connect(destination)

    source.start(startTime)
    source.stop(startTime + 1)
  }

  private static scheduleRimshot(
    context: OfflineAudioContext,
    destination: AudioNode,
    startTime: number,
    gain: number
  ): void {
    const osc = context.createOscillator()
    const oscGain = context.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(400, startTime)
    osc.frequency.exponentialRampToValueAtTime(200, startTime + 0.02)

    oscGain.gain.setValueAtTime(gain * 0.8, startTime)
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08)

    osc.connect(oscGain)
    oscGain.connect(destination)

    osc.start(startTime)
    osc.stop(startTime + 0.1)

    const noiseLength = 0.03
    const noiseBuffer = context.createBuffer(1, context.sampleRate * noiseLength, context.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1
    }

    const noiseSource = context.createBufferSource()
    noiseSource.buffer = noiseBuffer

    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(3000, startTime)

    const noiseGain = context.createGain()
    noiseGain.gain.setValueAtTime(gain * 0.4, startTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05)

    noiseSource.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(destination)

    noiseSource.start(startTime)
    noiseSource.stop(startTime + 0.05)
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private static bufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    const dataLength = buffer.length * blockAlign
    const bufferLength = 44 + dataLength

    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)

    // Write RIFF header
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, bufferLength - 8, true)
    this.writeString(view, 8, 'WAVE')

    // Write fmt chunk
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // Chunk size
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)

    // Write data chunk
    this.writeString(view, 36, 'data')
    view.setUint32(40, dataLength, true)

    // Write audio data
    const channels: Float32Array[] = []
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        view.setInt16(offset, intSample, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
}
