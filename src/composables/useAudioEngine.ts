import { ref, onMounted } from 'vue'
import { AudioEngine } from '@/audio/AudioEngine'

const isReady = ref(false)
const isResumed = ref(false)

export function useAudioEngine() {
  const engine = AudioEngine.getInstance()

  /**
   * Initialize the audio engine
   * Must be called after a user gesture
   */
  async function initialize(): Promise<AudioEngine> {
    await engine.initialize()
    isReady.value = true
    isResumed.value = true
    return engine
  }

  /**
   * Resume audio context if suspended
   */
  async function resume(): Promise<void> {
    await engine.resume()
    isResumed.value = true
  }

  /**
   * Handle user gesture to ensure audio context is running
   */
  async function handleUserGesture(): Promise<void> {
    if (!isReady.value) {
      await initialize()
    } else {
      await resume()
    }
  }

  // Set up event listeners for user gestures
  onMounted(() => {
    const handleGesture = async () => {
      await handleUserGesture()
    }

    document.addEventListener('click', handleGesture, { once: true })
    document.addEventListener('keydown', handleGesture, { once: true })
    document.addEventListener('touchstart', handleGesture, { once: true })
  })

  return {
    engine,
    isReady,
    isResumed,
    initialize,
    resume,
    handleUserGesture,
  }
}
