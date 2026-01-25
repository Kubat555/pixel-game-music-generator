import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Track, TimeSignature } from '@/types/project'
import type { Note } from '@/types/note'

export const useProjectStore = defineStore('project', () => {
  // State
  const id = ref<string>(crypto.randomUUID())
  const name = ref('Untitled Song')
  const tempo = ref(120)
  const timeSignature = ref<TimeSignature>({ numerator: 4, denominator: 4 })
  const tracks = ref<Track[]>([
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
  ])
  const loopEnabled = ref(true)
  const loopStart = ref(0)
  const loopEnd = ref(16)
  const isDirty = ref(false)
  const lastSaved = ref<Date | null>(null)

  // Getters
  const totalBeats = computed(() => loopEnd.value - loopStart.value)

  const getTrackById = computed(() => (trackId: string) =>
    tracks.value.find(t => t.id === trackId)
  )

  const getNotesForBeat = computed(() => (trackId: string, beat: number) => {
    const track = tracks.value.find(t => t.id === trackId)
    return track?.notes.filter(n => n.startBeat === beat) ?? []
  })

  const getNoteAtPosition = computed(() => (trackId: string, beat: number, pitch: number) => {
    const track = tracks.value.find(t => t.id === trackId)
    return track?.notes.find(n =>
      n.pitch === pitch &&
      beat >= n.startBeat &&
      beat < n.startBeat + n.duration
    )
  })

  const allNotes = computed(() =>
    tracks.value.flatMap(t => t.notes.map(n => ({ ...n, trackId: t.id })))
  )

  // Actions
  function addNote(trackId: string, note: Omit<Note, 'id'>): string {
    const track = tracks.value.find(t => t.id === trackId)
    if (!track) return ''

    const newNote: Note = {
      id: crypto.randomUUID(),
      ...note,
    }
    track.notes.push(newNote)
    isDirty.value = true
    return newNote.id
  }

  function removeNote(trackId: string, noteId: string): void {
    const track = tracks.value.find(t => t.id === trackId)
    if (!track) return

    const index = track.notes.findIndex(n => n.id === noteId)
    if (index !== -1) {
      track.notes.splice(index, 1)
      isDirty.value = true
    }
  }

  function updateNote(trackId: string, noteId: string, updates: Partial<Note>): void {
    const track = tracks.value.find(t => t.id === trackId)
    const note = track?.notes.find(n => n.id === noteId)
    if (note) {
      Object.assign(note, updates)
      isDirty.value = true
    }
  }

  function toggleNote(trackId: string, beat: number, pitch: number): Note | null {
    const track = tracks.value.find(t => t.id === trackId)
    if (!track) return null

    // Check if note exists at this position
    const existingIndex = track.notes.findIndex(n =>
      n.pitch === pitch && n.startBeat === beat
    )

    if (existingIndex !== -1) {
      // Remove existing note
      track.notes.splice(existingIndex, 1)
      isDirty.value = true
      return null
    } else {
      // Add new note
      const newNote: Note = {
        id: crypto.randomUUID(),
        pitch,
        startBeat: beat,
        duration: 1,
        velocity: 0.8,
      }
      track.notes.push(newNote)
      isDirty.value = true
      return newNote
    }
  }

  function setTempo(newTempo: number): void {
    tempo.value = Math.max(40, Math.min(240, newTempo))
    isDirty.value = true
  }

  function setTrackMuted(trackId: string, muted: boolean): void {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      track.muted = muted
    }
  }

  function setTrackSolo(trackId: string, solo: boolean): void {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      track.solo = solo
    }
  }

  function setTrackVolume(trackId: string, volume: number): void {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      track.volume = Math.max(0, Math.min(1, volume))
    }
  }

  function setLoopRegion(start: number, end: number): void {
    loopStart.value = Math.max(0, start)
    loopEnd.value = Math.max(loopStart.value + 1, end)
    isDirty.value = true
  }

  function clearTrack(trackId: string): void {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      track.notes = []
      isDirty.value = true
    }
  }

  function clearAllTracks(): void {
    for (const track of tracks.value) {
      track.notes = []
    }
    isDirty.value = true
  }

  function loadFromJSON(project: Project): void {
    id.value = project.id
    name.value = project.name
    tempo.value = project.tempo
    timeSignature.value = project.timeSignature
    tracks.value = project.tracks.map(t => ({
      ...t,
      notes: t.notes.map(n => ({ ...n })),
    }))
    loopEnabled.value = project.loopEnabled
    loopStart.value = project.loopStart
    loopEnd.value = project.loopEnd
    isDirty.value = false
    lastSaved.value = project.updatedAt ? new Date(project.updatedAt) : null
  }

  function exportToJSON(): Project {
    return {
      id: id.value,
      name: name.value,
      tempo: tempo.value,
      timeSignature: { ...timeSignature.value },
      tracks: tracks.value.map(t => ({
        ...t,
        notes: t.notes.map(n => ({ ...n })),
      })),
      loopEnabled: loopEnabled.value,
      loopStart: loopStart.value,
      loopEnd: loopEnd.value,
      updatedAt: new Date().toISOString(),
    }
  }

  function newProject(): void {
    id.value = crypto.randomUUID()
    name.value = 'Untitled Song'
    tempo.value = 120
    timeSignature.value = { numerator: 4, denominator: 4 }
    tracks.value = [
      { id: 'lead', name: 'Lead', type: 'synth', color: 'cyan', notes: [], muted: false, solo: false, volume: 0.8 },
      { id: 'bass', name: 'Bass', type: 'synth', color: 'purple', notes: [], muted: false, solo: false, volume: 0.9 },
      { id: 'harmony', name: 'Harmony', type: 'synth', color: 'yellow', notes: [], muted: false, solo: false, volume: 0.6 },
      { id: 'drums', name: 'Drums', type: 'drums', color: 'orange', notes: [], muted: false, solo: false, volume: 1.0 },
    ]
    loopEnabled.value = true
    loopStart.value = 0
    loopEnd.value = 16
    isDirty.value = false
    lastSaved.value = null
  }

  return {
    // State
    id,
    name,
    tempo,
    timeSignature,
    tracks,
    loopEnabled,
    loopStart,
    loopEnd,
    isDirty,
    lastSaved,

    // Getters
    totalBeats,
    getTrackById,
    getNotesForBeat,
    getNoteAtPosition,
    allNotes,

    // Actions
    addNote,
    removeNote,
    updateNote,
    toggleNote,
    setTempo,
    setTrackMuted,
    setTrackSolo,
    setTrackVolume,
    setLoopRegion,
    clearTrack,
    clearAllTracks,
    loadFromJSON,
    exportToJSON,
    newProject,
  }
})
