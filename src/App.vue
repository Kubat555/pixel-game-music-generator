<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { useKeyboard } from '@/composables/useKeyboard'
import { useAutosave } from '@/composables/useAutosave'
import TransportBar from '@/components/transport/TransportBar.vue'
import SequencerGrid from '@/components/sequencer/SequencerGrid.vue'
import TrackSelector from '@/components/sequencer/TrackSelector.vue'
import InstrumentPanel from '@/components/instruments/InstrumentPanel.vue'
import TemplateSelector from '@/components/templates/TemplateSelector.vue'
import ZoomControls from '@/components/sequencer/ZoomControls.vue'
import LoopControls from '@/components/sequencer/LoopControls.vue'
import WelcomeModal from '@/components/tutorial/WelcomeModal.vue'
import TutorialOverlay from '@/components/tutorial/TutorialOverlay.vue'
import ExportPanel from '@/components/export/ExportPanel.vue'

const projectStore = useProjectStore()
const showWelcome = ref(false) // Will be set based on whether user has saved data
const sidebarTab = ref<'instrument' | 'templates'>('instrument')
const uiStore = useUIStore()
const autosave = useAutosave()

// Enable keyboard shortcuts
useKeyboard()

onMounted(() => {
  // Try to load saved state, if not found initialize with default project
  const loaded = autosave.initialize()
  if (!loaded) {
    projectStore.newProject()
    // Show welcome modal only for new users (no saved data)
    showWelcome.value = true
  }
})

// Create new project (with confirmation)
function handleNewProject() {
  if (confirm('Create a new project? Unsaved changes will be lost.')) {
    projectStore.newProject()
    uiStore.showNotification('New project created!', 'success')
  }
}
</script>

<template>
  <div class="h-screen bg-chip-black text-chip-white flex flex-col">
    <!-- Header -->
    <header class="bg-chip-darkgray border-b-3 border-chip-gray px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-4">
        <h1 class="font-pixel text-sm text-chip-cyan">
          PIXEL MUSIC
        </h1>
        <span class="font-body text-xl text-chip-gray">
          {{ projectStore.name }}
        </span>
      </div>

      <div class="flex items-center gap-4">
        <!-- New Project Button -->
        <button
          class="btn-pixel text-xs"
          @click="handleNewProject"
        >
          NEW
        </button>
        <!-- Export Panel Toggle -->
        <button
          class="btn-pixel text-xs"
          :class="uiStore.showExportPanel ? 'bg-chip-green' : ''"
          @click="uiStore.toggleExportPanel"
        >
          EXPORT
        </button>
        <!-- Mode Toggle -->
        <button
          class="btn-pixel text-xs"
          @click="uiStore.toggleMode"
        >
          {{ uiStore.isBeginnerMode ? 'BEGINNER' : 'ADVANCED' }}
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden min-h-0">
      <!-- Sidebar -->
      <aside
        v-if="uiStore.showSidebar"
        class="w-72 bg-chip-darkgray border-r-3 border-chip-gray flex flex-col overflow-hidden flex-shrink-0"
      >
        <!-- Sidebar Tabs -->
        <div class="flex border-b-3 border-chip-gray flex-shrink-0">
          <button
            class="flex-1 py-2 font-pixel text-xs text-center transition-colors"
            :class="sidebarTab === 'instrument' ? 'bg-chip-gray text-chip-white' : 'bg-chip-darkgray text-chip-gray hover:text-chip-white'"
            @click="sidebarTab = 'instrument'"
          >
            SOUNDS
          </button>
          <button
            class="flex-1 py-2 font-pixel text-xs text-center transition-colors"
            :class="sidebarTab === 'templates' ? 'bg-chip-gray text-chip-white' : 'bg-chip-darkgray text-chip-gray hover:text-chip-white'"
            @click="sidebarTab = 'templates'"
          >
            TEMPLATES
          </button>
        </div>

        <!-- Sidebar Content -->
        <div class="flex-1 overflow-y-auto scrollbar-pixel p-4">
          <InstrumentPanel v-if="sidebarTab === 'instrument'" />
          <TemplateSelector v-else />
        </div>
      </aside>

      <!-- Center (Sequencer) -->
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        <!-- Transport Bar -->
        <TransportBar class="flex-shrink-0" />

        <!-- Track Selector -->
        <TrackSelector class="flex-shrink-0" />

        <!-- Sequencer Grid -->
        <div class="flex-1 min-h-0 p-4">
          <SequencerGrid />
        </div>
      </div>

      <!-- Export Panel (Right Sidebar) -->
      <Transition name="slide-right">
        <ExportPanel v-if="uiStore.showExportPanel" class="flex-shrink-0" />
      </Transition>
    </main>

    <!-- Footer / Status Bar -->
    <footer class="bg-chip-darkgray border-t-3 border-chip-gray px-4 py-2 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-4">
        <!-- Loop Controls -->
        <LoopControls />
      </div>

      <div class="flex items-center gap-4">
        <!-- Zoom Controls -->
        <div class="flex items-center gap-2">
          <span class="font-pixel text-xs text-chip-gray">ZOOM</span>
          <ZoomControls />
        </div>

        <!-- Sidebar Toggle -->
        <button
          class="btn-pixel text-xs"
          @click="uiStore.toggleSidebar"
        >
          {{ uiStore.showSidebar ? 'HIDE' : 'SHOW' }}
        </button>
      </div>
    </footer>

    <!-- Notifications -->
    <div class="fixed bottom-16 right-4 flex flex-col gap-2 z-50">
      <TransitionGroup name="notification">
        <div
          v-for="notification in uiStore.notifications"
          :key="notification.id"
          class="panel-pixel font-body text-lg px-4 py-2"
          :class="{
            'text-chip-green': notification.type === 'success',
            'text-chip-red': notification.type === 'error',
            'text-chip-yellow': notification.type === 'warning',
            'text-chip-white': notification.type === 'info',
          }"
        >
          {{ notification.message }}
        </div>
      </TransitionGroup>
    </div>

    <!-- Welcome Modal -->
    <WelcomeModal
      v-if="showWelcome"
      @close="showWelcome = false"
    />

    <!-- Tutorial Overlay -->
    <TutorialOverlay />
  </div>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Export panel slide animation */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.2s ease-out;
}

.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
