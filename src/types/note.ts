export interface Note {
  id: string
  pitch: number      // MIDI note number (0-127)
  startBeat: number  // Beat position (0-based, in 16th notes)
  duration: number   // Duration in beats (16th notes)
  velocity: number   // 0-1
}

export interface ScheduledNote extends Note {
  trackId: string
  time: number       // Scheduled audio context time
}
