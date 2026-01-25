/**
 * Look-ahead scheduler for precise timing
 * Based on Chris Wilson's "A Tale of Two Clocks" technique
 * https://www.html5rocks.com/en/tutorials/audio/scheduling/
 */

export type BeatCallback = (beat: number, time: number) => void
export type VisualBeatCallback = (beat: number) => void

export class Scheduler {
  private context: AudioContext
  private isPlaying = false
  private currentBeat = 0
  private nextNoteTime = 0
  private tempo = 120
  private timerID: number | null = null

  // Look-ahead scheduling parameters
  // How often to call the scheduler (in milliseconds)
  private readonly LOOKAHEAD_MS = 25

  // How far ahead to schedule audio (in seconds)
  private readonly SCHEDULE_AHEAD_SEC = 0.1

  // Queue of scheduled notes for visual sync
  private notesInQueue: Array<{ beat: number; time: number }> = []

  // Callbacks
  private onBeatCallback: BeatCallback | null = null
  private onVisualBeatCallback: VisualBeatCallback | null = null

  // Loop settings
  private loopStart = 0
  private loopEnd = 16
  private loopEnabled = true

  // Animation frame ID for visual updates
  private animationFrameId: number | null = null

  constructor(context: AudioContext) {
    this.context = context
  }

  /**
   * Start playback
   */
  start(
    tempo: number,
    onBeat: BeatCallback,
    onVisualBeat?: VisualBeatCallback,
    startBeat = 0
  ): void {
    if (this.isPlaying) return

    this.tempo = tempo
    this.onBeatCallback = onBeat
    this.onVisualBeatCallback = onVisualBeat || null
    this.isPlaying = true
    this.currentBeat = startBeat
    this.nextNoteTime = this.context.currentTime
    this.notesInQueue = []

    this.schedule()
    this.startVisualUpdater()
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false

    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    this.notesInQueue = []
    this.currentBeat = 0
  }

  /**
   * Pause playback (can be resumed)
   */
  pause(): void {
    this.isPlaying = false

    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Resume playback from current position
   */
  resume(): void {
    if (this.isPlaying) return

    this.isPlaying = true
    this.nextNoteTime = this.context.currentTime

    this.schedule()
    this.startVisualUpdater()
  }

  /**
   * Set tempo (can be called during playback)
   */
  setTempo(tempo: number): void {
    this.tempo = Math.max(40, Math.min(240, tempo))
  }

  /**
   * Set loop region
   */
  setLoop(start: number, end: number, enabled = true): void {
    this.loopStart = start
    this.loopEnd = end
    this.loopEnabled = enabled
  }

  /**
   * Get current beat position
   */
  getCurrentBeat(): number {
    return this.currentBeat
  }

  /**
   * Check if scheduler is playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Main scheduling loop
   * Runs ahead of real-time to schedule notes
   */
  private schedule(): void {
    if (!this.isPlaying) return

    // Schedule all notes that need to play before the next look-ahead window
    while (this.nextNoteTime < this.context.currentTime + this.SCHEDULE_AHEAD_SEC) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime)
      this.advanceNote()
    }

    // Schedule next look-ahead
    this.timerID = window.setTimeout(() => this.schedule(), this.LOOKAHEAD_MS)
  }

  /**
   * Schedule a note to play
   */
  private scheduleNote(beat: number, time: number): void {
    // Add to queue for visual synchronization
    this.notesInQueue.push({ beat, time })

    // Call the beat callback to trigger actual note playing
    this.onBeatCallback?.(beat, time)
  }

  /**
   * Advance to next note position
   */
  private advanceNote(): void {
    // Calculate time for next 16th note
    const secondsPerBeat = 60.0 / this.tempo
    const secondsPer16th = secondsPerBeat / 4

    this.nextNoteTime += secondsPer16th
    this.currentBeat++

    // Handle looping
    if (this.loopEnabled && this.currentBeat >= this.loopEnd) {
      this.currentBeat = this.loopStart
    }
  }

  /**
   * Visual updater using requestAnimationFrame
   * Keeps UI in sync with audio
   */
  private startVisualUpdater(): void {
    const update = () => {
      if (!this.isPlaying) return

      const currentTime = this.context.currentTime

      // Process all notes that should have played by now
      while (this.notesInQueue.length > 0 && this.notesInQueue[0].time < currentTime) {
        const note = this.notesInQueue.shift()!
        this.onVisualBeatCallback?.(note.beat)
      }

      this.animationFrameId = requestAnimationFrame(update)
    }

    this.animationFrameId = requestAnimationFrame(update)
  }

  /**
   * Get the time in seconds for a given beat at current tempo
   */
  beatToTime(beat: number): number {
    const secondsPerBeat = 60.0 / this.tempo
    return (beat * secondsPerBeat) / 4 // 16th notes
  }

  /**
   * Get duration in seconds for a note length in beats
   */
  durationToTime(duration: number): number {
    const secondsPerBeat = 60.0 / this.tempo
    return (duration * secondsPerBeat) / 4
  }
}
