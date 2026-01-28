/**
 * PHASE 2 OPTIMIZATION: Bridge for direct DOM playhead updates
 *
 * This allows SequencerGrid to register a callback that usePlayback
 * can call directly, bypassing Vue's reactivity system for the playhead.
 */

type PlayheadCallback = (beat: number) => void

let playheadCallback: PlayheadCallback | null = null

/**
 * Register a callback to be called when playhead position changes
 * Called by SequencerGrid to register its direct DOM update function
 */
export function registerPlayheadCallback(callback: PlayheadCallback): void {
  playheadCallback = callback
}

/**
 * Unregister the callback (called on component unmount)
 */
export function unregisterPlayheadCallback(): void {
  playheadCallback = null
}

/**
 * Update the playhead position
 * Called by usePlayback on each beat
 */
export function updatePlayhead(beat: number): void {
  if (playheadCallback) {
    playheadCallback(beat)
  }
}
