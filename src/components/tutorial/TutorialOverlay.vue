<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/useUIStore'

const uiStore = useUIStore()
const { tutorialStep, showTutorial } = storeToRefs(uiStore)

const tutorialSteps = [
  {
    title: 'Welcome to Pixel Music Maker!',
    description: 'Let\'s create your first chiptune song. Click anywhere to continue.',
    highlight: null,
  },
  {
    title: 'Track Selection',
    description: 'These are your 4 tracks: Lead (melody), Bass, Harmony, and Drums. Click on different tracks to switch between them.',
    highlight: 'track-selector',
  },
  {
    title: 'The Grid',
    description: 'Click on the grid squares to add notes. Each column is a beat, each row is a different pitch. Try clicking some squares!',
    highlight: 'sequencer-grid',
  },
  {
    title: 'Play Your Music',
    description: 'Press the PLAY button or hit SPACEBAR to hear your creation. You can adjust the tempo (BPM) with the + and - buttons.',
    highlight: 'transport-bar',
  },
  {
    title: 'Change Sounds',
    description: 'Use the sidebar to change the waveform and other settings. Try different sounds like Square, Triangle, or Pulse waves.',
    highlight: 'sidebar',
  },
  {
    title: 'Templates',
    description: 'Click the TEMPLATES tab in the sidebar to load pre-made songs you can edit and learn from.',
    highlight: 'sidebar-tabs',
  },
  {
    title: 'You\'re Ready!',
    description: 'Now you know the basics. Have fun creating your chiptune masterpiece! Press SPACE to play anytime.',
    highlight: null,
  },
]

const currentStep = computed(() => tutorialSteps[tutorialStep.value] || null)

const isLastStep = computed(() => tutorialStep.value >= tutorialSteps.length - 1)

function nextStep() {
  if (isLastStep.value) {
    uiStore.completeTutorial()
  } else {
    uiStore.advanceTutorial()
  }
}

function skipTutorial() {
  uiStore.completeTutorial()
}
</script>

<template>
  <div
    v-if="showTutorial && currentStep"
    class="fixed inset-0 z-50 pointer-events-none"
  >
    <!-- Dark Overlay -->
    <div class="absolute inset-0 bg-chip-black bg-opacity-70"></div>

    <!-- Tutorial Card -->
    <div
      class="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto"
    >
      <div class="panel-pixel p-6 max-w-md">
        <!-- Progress Dots -->
        <div class="flex justify-center gap-2 mb-4">
          <div
            v-for="(_, index) in tutorialSteps"
            :key="index"
            class="w-2 h-2 rounded-full"
            :class="index <= tutorialStep ? 'bg-chip-cyan' : 'bg-chip-gray'"
          ></div>
        </div>

        <!-- Content -->
        <h3 class="font-pixel text-sm text-chip-cyan mb-3">
          {{ currentStep.title }}
        </h3>

        <p class="font-body text-lg text-chip-white mb-4">
          {{ currentStep.description }}
        </p>

        <!-- Buttons -->
        <div class="flex gap-3">
          <button
            class="btn-pixel flex-1"
            @click="skipTutorial"
          >
            SKIP
          </button>

          <button
            class="btn-pixel-primary flex-1"
            @click="nextStep"
          >
            {{ isLastStep ? 'FINISH' : 'NEXT' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
