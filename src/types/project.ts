import type { Note } from './note'

export type TrackType = 'synth' | 'drums'

export interface Track {
  id: string
  name: string
  type: TrackType
  color: string          // CSS color class
  notes: Note[]
  muted: boolean
  solo: boolean
  volume: number         // 0-1
}

export interface TimeSignature {
  numerator: number
  denominator: number
}

export interface Project {
  id: string
  name: string
  tempo: number          // BPM
  timeSignature: TimeSignature
  tracks: Track[]
  loopEnabled: boolean
  loopStart: number      // Beat position
  loopEnd: number        // Beat position
  createdAt?: string
  updatedAt?: string
}

export interface ProjectMeta {
  id: string
  name: string
  tempo: number
  updatedAt: string
}

// Full template export including instruments
export interface ProjectTemplate {
  version: string
  project: Project
  instruments: Record<string, import('./instrument').InstrumentConfig>
}

export const DEFAULT_TRACKS: Track[] = [
  {
    id: 'lead',
    name: 'Lead',
    type: 'synth',
    color: 'cyan',
    notes: [],
    muted: false,
    solo: false,
    volume: 0.8,
  },
  {
    id: 'bass',
    name: 'Bass',
    type: 'synth',
    color: 'purple',
    notes: [],
    muted: false,
    solo: false,
    volume: 0.9,
  },
  {
    id: 'harmony',
    name: 'Harmony',
    type: 'synth',
    color: 'yellow',
    notes: [],
    muted: false,
    solo: false,
    volume: 0.6,
  },
  {
    id: 'drums',
    name: 'Drums',
    type: 'drums',
    color: 'orange',
    notes: [],
    muted: false,
    solo: false,
    volume: 1.0,
  },
]

export const DEFAULT_PROJECT: Omit<Project, 'id'> = {
  name: 'Untitled Song',
  tempo: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  tracks: DEFAULT_TRACKS.map(t => ({ ...t, notes: [] })),
  loopEnabled: true,
  loopStart: 0,
  loopEnd: 16,  // 4 bars of 4/4 at 16th note resolution
}
