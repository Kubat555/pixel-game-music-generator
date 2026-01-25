import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type PlaybackState = 'stopped' | 'playing' | 'paused'

export const useTransportStore = defineStore('transport', () => {
  // State
  const playbackState = ref<PlaybackState>('stopped')
  const currentBeat = ref(0)
  const isRecording = ref(false)
  const masterVolume = ref(0.8)
  const isMetronomeEnabled = ref(false)

  // Getters
  const isPlaying = computed(() => playbackState.value === 'playing')
  const isPaused = computed(() => playbackState.value === 'paused')
  const isStopped = computed(() => playbackState.value === 'stopped')

  // Actions
  function play(): void {
    playbackState.value = 'playing'
  }

  function pause(): void {
    playbackState.value = 'paused'
  }

  function stop(): void {
    playbackState.value = 'stopped'
    currentBeat.value = 0
  }

  function toggle(): void {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function setCurrentBeat(beat: number): void {
    currentBeat.value = beat
  }

  function setMasterVolume(volume: number): void {
    masterVolume.value = Math.max(0, Math.min(1, volume))
  }

  function toggleMetronome(): void {
    isMetronomeEnabled.value = !isMetronomeEnabled.value
  }

  function setRecording(recording: boolean): void {
    isRecording.value = recording
  }

  return {
    // State
    playbackState,
    currentBeat,
    isRecording,
    masterVolume,
    isMetronomeEnabled,

    // Getters
    isPlaying,
    isPaused,
    isStopped,

    // Actions
    play,
    pause,
    stop,
    toggle,
    setCurrentBeat,
    setMasterVolume,
    toggleMetronome,
    setRecording,
  }
})
