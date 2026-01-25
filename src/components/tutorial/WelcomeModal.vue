<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { templates } from '@/data/templates'

const emit = defineEmits<{
  close: []
}>()

const uiStore = useUIStore()
const projectStore = useProjectStore()

const step = ref<'welcome' | 'choose' | 'tutorial'>('welcome')

function startEmpty() {
  projectStore.newProject()
  emit('close')
}

function startWithTemplate(templateId: string) {
  const template = templates.find(t => t.id === templateId)
  if (template) {
    const project = {
      id: crypto.randomUUID(),
      ...template.project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    projectStore.loadFromJSON(project)
  }
  emit('close')
}

function startTutorial() {
  projectStore.newProject()
  uiStore.startTutorial()
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-chip-black bg-opacity-90 flex items-center justify-center z-50 p-4">
    <div class="panel-pixel max-w-lg w-full p-6 relative">
      <!-- Close Button -->
      <button
        class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-chip-gray hover:text-chip-white"
        @click="emit('close')"
      >
        X
      </button>

      <!-- Welcome Screen -->
      <div v-if="step === 'welcome'" class="text-center">
        <h1 class="font-pixel text-xl text-chip-cyan mb-4">
          PIXEL MUSIC MAKER
        </h1>

        <p class="font-body text-xl text-chip-white mb-6">
          Create amazing 8-bit chiptune music for your games!
          No music experience needed.
        </p>

        <div class="space-y-3">
          <button
            class="btn-pixel-primary w-full py-4 text-lg"
            @click="startTutorial"
          >
            START TUTORIAL
          </button>

          <button
            class="btn-pixel w-full py-3"
            @click="step = 'choose'"
          >
            CHOOSE A TEMPLATE
          </button>

          <button
            class="btn-pixel w-full py-3"
            @click="startEmpty"
          >
            START EMPTY
          </button>
        </div>

        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <span class="font-pixel text-xs text-chip-gray">Keyboard:</span>
          <span class="font-body text-sm text-chip-gray">SPACE = Play/Pause</span>
          <span class="font-body text-sm text-chip-gray">1-4 = Tracks</span>
          <span class="font-body text-sm text-chip-gray">+/- = Zoom</span>
        </div>
      </div>

      <!-- Template Selection -->
      <div v-else-if="step === 'choose'">
        <button
          class="flex items-center gap-2 text-chip-gray hover:text-chip-white mb-4"
          @click="step = 'welcome'"
        >
          <span class="font-body text-lg">&lt; Back</span>
        </button>

        <h2 class="font-pixel text-sm text-chip-white mb-4">
          CHOOSE A TEMPLATE
        </h2>

        <div class="grid gap-3 max-h-80 overflow-y-auto scrollbar-pixel pr-2">
          <button
            v-for="template in templates"
            :key="template.id"
            class="panel-pixel p-3 text-left hover:bg-chip-gray transition-colors"
            @click="startWithTemplate(template.id)"
          >
            <span class="font-pixel text-xs text-chip-cyan block mb-1">
              {{ template.name }}
            </span>
            <span class="font-body text-sm text-chip-gray">
              {{ template.description }}
            </span>
            <div class="flex gap-2 mt-2 text-xs text-chip-gray font-body">
              <span>{{ template.project.tempo }} BPM</span>
              <span>|</span>
              <span class="capitalize">{{ template.category }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
