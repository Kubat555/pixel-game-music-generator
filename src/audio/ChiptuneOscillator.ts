import type { ADSRParams, InstrumentConfig } from '@/types/instrument'

export class ChiptuneOscillator {
  private context: AudioContext
  private destination: AudioNode
  private pulseWaves: Map<number, PeriodicWave> = new Map()

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context
    this.destination = destination
    this.createPulseWaves()
  }

  /**
   * Pre-create pulse waves for common duty cycles (12.5%, 25%, 50%, 75%)
   * These are the classic NES pulse wave duty cycles
   */
  private createPulseWaves(): void {
    const dutyCycles = [0.125, 0.25, 0.5, 0.75]

    for (const duty of dutyCycles) {
      const wave = this.generatePulseWave(duty)
      this.pulseWaves.set(duty, wave)
    }
  }

  /**
   * Generate a pulse wave using Fourier series
   * Based on the mathematical definition of a pulse wave
   */
  private generatePulseWave(dutyCycle: number): PeriodicWave {
    const harmonics = 64
    const real = new Float32Array(harmonics)
    const imag = new Float32Array(harmonics)

    // DC offset based on duty cycle
    real[0] = 0

    // Calculate harmonics using Fourier series for pulse wave
    for (let n = 1; n < harmonics; n++) {
      // Pulse wave Fourier coefficient: (2/nPI) * sin(n * PI * dutyCycle)
      const coefficient = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * dutyCycle)
      imag[n] = coefficient
      real[n] = 0
    }

    return this.context.createPeriodicWave(real, imag, { disableNormalization: false })
  }

  /**
   * Get the closest pre-generated pulse wave for a duty cycle
   */
  private getPulseWave(dutyCycle: number): PeriodicWave {
    // Find closest pre-generated wave
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

    return this.pulseWaves.get(closest)!
  }

  /**
   * Convert MIDI note number to frequency
   */
  private midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12)
  }

  /**
   * Play a single note with the given parameters
   */
  playNote(
    pitch: number,
    duration: number,
    startTime: number,
    config: InstrumentConfig
  ): void {
    const { waveform, adsr, pulseWidth, detune, gain } = config
    const frequency = this.midiToFrequency(pitch)

    // Create oscillator
    const osc = this.context.createOscillator()
    const gainNode = this.context.createGain()

    // Set waveform
    if (waveform === 'pulse') {
      osc.setPeriodicWave(this.getPulseWave(pulseWidth))
    } else if (waveform === 'noise') {
      // For noise, we'll use a noise buffer instead
      this.playNoise(duration, startTime, adsr, gain)
      return
    } else {
      osc.type = waveform as OscillatorType
    }

    osc.frequency.setValueAtTime(frequency, startTime)
    osc.detune.setValueAtTime(detune, startTime)

    // Apply ADSR envelope
    this.applyADSR(gainNode, startTime, duration, adsr, gain)

    // Connect and schedule
    osc.connect(gainNode)
    gainNode.connect(this.destination)

    osc.start(startTime)
    osc.stop(startTime + duration + adsr.release + 0.05)
  }

  /**
   * Apply ADSR envelope to a gain node
   */
  private applyADSR(
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
   * Play a noise burst (for drums)
   */
  private playNoise(
    duration: number,
    startTime: number,
    adsr: ADSRParams,
    gain: number
  ): void {
    // Create noise buffer
    const bufferSize = this.context.sampleRate * (duration + adsr.release + 0.1)
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate)
    const data = buffer.getChannelData(0)

    // Fill with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = this.context.createBufferSource()
    source.buffer = buffer

    const gainNode = this.context.createGain()
    this.applyADSR(gainNode, startTime, duration, adsr, gain)

    source.connect(gainNode)
    gainNode.connect(this.destination)

    source.start(startTime)
    source.stop(startTime + duration + adsr.release + 0.05)
  }

  /**
   * Play a drum sound (kick, snare, hihat)
   */
  playDrum(
    drumType: 'kick' | 'snare' | 'hihat' | 'tom',
    startTime: number,
    gain: number
  ): void {
    switch (drumType) {
      case 'kick':
        this.playKick(startTime, gain)
        break
      case 'snare':
        this.playSnare(startTime, gain)
        break
      case 'hihat':
        this.playHihat(startTime, gain)
        break
      case 'tom':
        this.playTom(startTime, gain)
        break
    }
  }

  private playKick(startTime: number, gain: number): void {
    const osc = this.context.createOscillator()
    const gainNode = this.context.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, startTime)
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1)

    gainNode.gain.setValueAtTime(gain, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)

    osc.connect(gainNode)
    gainNode.connect(this.destination)

    osc.start(startTime)
    osc.stop(startTime + 0.3)
  }

  private playSnare(startTime: number, gain: number): void {
    // Noise component
    const noiseLength = 0.2
    const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * noiseLength, this.context.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1
    }

    const noiseSource = this.context.createBufferSource()
    noiseSource.buffer = noiseBuffer

    const noiseGain = this.context.createGain()
    noiseGain.gain.setValueAtTime(gain * 0.7, startTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2)

    // Tone component
    const osc = this.context.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, startTime)
    osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.05)

    const oscGain = this.context.createGain()
    oscGain.gain.setValueAtTime(gain * 0.3, startTime)
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1)

    noiseSource.connect(noiseGain)
    noiseGain.connect(this.destination)
    osc.connect(oscGain)
    oscGain.connect(this.destination)

    noiseSource.start(startTime)
    noiseSource.stop(startTime + 0.2)
    osc.start(startTime)
    osc.stop(startTime + 0.1)
  }

  private playHihat(startTime: number, gain: number): void {
    const length = 0.05
    const buffer = this.context.createBuffer(1, this.context.sampleRate * length, this.context.sampleRate)
    const data = buffer.getChannelData(0)

    // High-frequency noise
    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = this.context.createBufferSource()
    source.buffer = buffer

    // Highpass filter for metallic sound
    const filter = this.context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(7000, startTime)

    const gainNode = this.context.createGain()
    gainNode.gain.setValueAtTime(gain * 0.5, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05)

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.destination)

    source.start(startTime)
    source.stop(startTime + 0.05)
  }

  private playTom(startTime: number, gain: number): void {
    const osc = this.context.createOscillator()
    const gainNode = this.context.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, startTime)
    osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.15)

    gainNode.gain.setValueAtTime(gain, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25)

    osc.connect(gainNode)
    gainNode.connect(this.destination)

    osc.start(startTime)
    osc.stop(startTime + 0.25)
  }
}
