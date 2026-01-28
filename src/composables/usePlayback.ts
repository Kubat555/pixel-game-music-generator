import { watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTransportStore } from '@/stores/useTransportStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useAudioEngine } from './useAudioEngine'
import { updatePlayhead } from './usePlayheadBridge'

export function usePlayback() {
  const projectStore = useProjectStore()
  const transportStore = useTransportStore()
  const instrumentStore = useInstrumentStore()
  const { engine, initialize, isReady } = useAudioEngine()

  const { isPlaying, masterVolume } = storeToRefs(transportStore)
  const { tempo, loopStart, loopEnd, loopEnabled, tracks } = storeToRefs(projectStore)

  /**
   * Start playback
   */
  async function play(): Promise<void> {
    // Ensure audio engine is initialized
    if (!isReady.value) {
      await initialize()
    }

    // Always try to resume AudioContext (browser autoplay policy)
    await engine.resume()

    // Force stop scheduler first to clear any stuck state
    engine.scheduler.stop()

    // Set up scheduler with current settings
    engine.scheduler.setLoop(loopStart.value, loopEnd.value, loopEnabled.value)
    engine.setMasterVolume(masterVolume.value)

    // Start scheduler from current beat or loop start
    const startBeat = transportStore.currentBeat >= loopEnd.value
      ? loopStart.value
      : transportStore.currentBeat

    engine.scheduler.start(
      tempo.value,
      // Audio callback - schedule notes
      (beat, time) => {
        engine.playBeat(
          tracks.value,
          instrumentStore.instruments,
          beat,
          time
        )
      },
      // Visual callback - update UI
      // PHASE 2: Direct DOM update for playhead (bypasses Vue reactivity for grid)
      (beat) => {
        updatePlayhead(beat) // Direct DOM update - no grid re-renders
        transportStore.setCurrentBeat(beat) // Still update store for other UI (beat counter, etc.)
      },
      startBeat
    )

    transportStore.play()
  }

  /**
   * Pause playback
   */
  function pause(): void {
    engine.scheduler.pause()
    transportStore.pause()
  }

  /**
   * Stop playback
   */
  function stop(): void {
    engine.scheduler.stop()
    transportStore.stop()
  }

  /**
   * Toggle play/pause
   */
  async function toggle(): Promise<void> {
    // Check actual scheduler state to detect stuck state
    const schedulerPlaying = engine.scheduler.getIsPlaying()

    if (isPlaying.value || schedulerPlaying) {
      // If either thinks we're playing, stop everything
      pause()
      // Sync state if out of sync
      if (schedulerPlaying && !isPlaying.value) {
        engine.scheduler.pause()
      }
    } else {
      await play()
    }
  }

  /**
   * Preview a note (for UI feedback when clicking cells)
   */
  function previewNote(trackId: string, pitch: number): void {
    if (!isReady.value) return

    const config = instrumentStore.instruments[trackId]
    if (!config) return

    const track = tracks.value.find(t => t.id === trackId)
    if (track?.type === 'drums') {
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
      const drumType = drumMap[pitch] || 'kick'
      engine.previewDrum(drumType)
    } else {
      engine.previewNote(pitch, config)
    }
  }

  // React to tempo changes during playback
  watch(tempo, (newTempo) => {
    if (isPlaying.value) {
      engine.scheduler.setTempo(newTempo)
    }
  })

  // React to loop changes during playback
  watch([loopStart, loopEnd, loopEnabled], () => {
    engine.scheduler.setLoop(loopStart.value, loopEnd.value, loopEnabled.value)
  })

  // React to master volume changes
  watch(masterVolume, (volume) => {
    engine.setMasterVolume(volume)
  })

  // Clean up on unmount
  onUnmounted(() => {
    stop()
  })

  return {
    play,
    pause,
    stop,
    toggle,
    previewNote,
    isPlaying,
  }
}
