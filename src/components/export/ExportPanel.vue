<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useUIStore } from '@/stores/useUIStore'
import { useAutosave } from '@/composables/useAutosave'
import { AudioEngine } from '@/audio/AudioEngine'

const projectStore = useProjectStore()
const instrumentStore = useInstrumentStore()
const uiStore = useUIStore()
const { downloadTemplate, loadTemplateFromFile } = useAutosave()

const { name, tracks, tempo, loopStart, loopEnd } = storeToRefs(projectStore)
const { instruments } = storeToRefs(instrumentStore)

const isExporting = ref(false)
const exportProgress = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const templateNameInput = ref<HTMLInputElement | null>(null)
const audioNameInput = ref<HTMLInputElement | null>(null)

// Template naming
const showTemplateNameInput = ref(false)
const templateName = ref('')

// Audio naming
const showAudioNameInput = ref(false)
const audioName = ref('')

// Sanitize filename
const sanitizedTemplateName = computed(() => {
  const baseName = templateName.value.trim() || name.value
  return baseName.replace(/[^a-z0-9\s\-_]/gi, '_')
})

const sanitizedAudioName = computed(() => {
  const baseName = audioName.value.trim() || name.value
  return baseName.replace(/[^a-z0-9\s\-_]/gi, '_')
})

// Start export process - show name input
async function startExportTemplate() {
  templateName.value = name.value
  showTemplateNameInput.value = true
  await nextTick()
  templateNameInput.value?.focus()
  templateNameInput.value?.select()
}

// Cancel export
function cancelExportTemplate() {
  showTemplateNameInput.value = false
  templateName.value = ''
}

// Export template as JSON with custom name
function handleExportTemplate() {
  const filename = `${sanitizedTemplateName.value}.json`
  downloadTemplate(filename)
  uiStore.showNotification('Template exported!', 'success')
  showTemplateNameInput.value = false
  templateName.value = ''
}

// Trigger file input for import
function triggerImport() {
  fileInput.value?.click()
}

// Handle file import
async function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  if (!file.name.endsWith('.json')) {
    uiStore.showNotification('Please select a JSON file', 'error')
    return
  }

  const success = await loadTemplateFromFile(file)

  if (success) {
    uiStore.showNotification('Template imported!', 'success')
  } else {
    uiStore.showNotification('Failed to import template', 'error')
  }

  // Reset input
  input.value = ''
}

// Start audio export - show name input
async function startExportAudio() {
  audioName.value = name.value
  showAudioNameInput.value = true
  await nextTick()
  audioNameInput.value?.focus()
  audioNameInput.value?.select()
}

// Cancel audio export
function cancelExportAudio() {
  showAudioNameInput.value = false
  audioName.value = ''
}

// Export audio as WAV
async function handleExportAudio() {
  if (isExporting.value) return

  showAudioNameInput.value = false
  isExporting.value = true
  exportProgress.value = 0

  try {
    const engine = AudioEngine.getInstance()
    await engine.initialize()

    const filename = `${sanitizedAudioName.value}.wav`

    await engine.renderToWav(
      tracks.value,
      instruments.value,
      tempo.value,
      loopStart.value,
      loopEnd.value,
      filename,
      (progress) => {
        exportProgress.value = Math.round(progress * 100)
      }
    )

    uiStore.showNotification('Audio exported!', 'success')
  } catch (e) {
    console.error('Export failed:', e)
    uiStore.showNotification('Export failed', 'error')
  } finally {
    isExporting.value = false
    exportProgress.value = 0
    audioName.value = ''
  }
}

// Close panel
function closePanel() {
  uiStore.setExportPanelVisible(false)
}
</script>

<template>
  <div class="w-64 bg-chip-darkgray border-l-3 border-chip-gray flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b-3 border-chip-gray flex-shrink-0">
      <h2 class="font-pixel text-xs text-chip-white">EXPORT</h2>
      <button
        class="text-chip-gray hover:text-chip-white transition-colors"
        @click="closePanel"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto scrollbar-pixel p-4 space-y-6">
      <!-- Audio Export Section -->
      <div class="space-y-3">
        <h3 class="font-pixel text-xs text-chip-cyan">DOWNLOAD AUDIO</h3>
        <p class="font-body text-sm text-chip-gray">
          Export your music as a WAV file.
        </p>

        <!-- Name input form -->
        <div v-if="showAudioNameInput && !isExporting" class="space-y-2">
          <label class="font-body text-sm text-chip-white">File name:</label>
          <input
            ref="audioNameInput"
            v-model="audioName"
            type="text"
            placeholder="Enter file name"
            class="w-full h-10 px-3 bg-chip-black border-3 border-chip-gray text-chip-white font-body text-sm focus:border-chip-cyan outline-none"
            @keyup.enter="handleExportAudio"
            @keyup.escape="cancelExportAudio"
          />
          <div class="flex gap-2">
            <button
              class="btn-pixel btn-pixel-primary flex-1 text-xs"
              @click="handleExportAudio"
            >
              EXPORT
            </button>
            <button
              class="btn-pixel flex-1 text-xs"
              @click="cancelExportAudio"
            >
              CANCEL
            </button>
          </div>
        </div>

        <!-- Export button or progress -->
        <template v-else>
          <button
            class="btn-pixel btn-pixel-primary w-full text-xs"
            :disabled="isExporting"
            @click="startExportAudio"
          >
            <span v-if="isExporting">
              EXPORTING {{ exportProgress }}%
            </span>
            <span v-else>
              DOWNLOAD WAV
            </span>
          </button>
          <!-- Progress bar -->
          <div v-if="isExporting" class="h-2 bg-chip-black border border-chip-gray">
            <div
              class="h-full bg-chip-green transition-all duration-200"
              :style="{ width: `${exportProgress}%` }"
            />
          </div>
        </template>
      </div>

      <!-- Template Export Section -->
      <div class="space-y-3">
        <h3 class="font-pixel text-xs text-chip-yellow">SAVE TEMPLATE</h3>
        <p class="font-body text-sm text-chip-gray">
          Save your project as a template (JSON) to share or use later.
        </p>

        <!-- Name input form -->
        <div v-if="showTemplateNameInput" class="space-y-2">
          <label class="font-body text-sm text-chip-white">Template name:</label>
          <input
            ref="templateNameInput"
            v-model="templateName"
            type="text"
            placeholder="Enter template name"
            class="w-full h-10 px-3 bg-chip-black border-3 border-chip-gray text-chip-white font-body text-sm focus:border-chip-yellow outline-none"
            @keyup.enter="handleExportTemplate"
            @keyup.escape="cancelExportTemplate"
          />
          <div class="flex gap-2">
            <button
              class="btn-pixel flex-1 text-xs"
              @click="handleExportTemplate"
            >
              SAVE
            </button>
            <button
              class="btn-pixel flex-1 text-xs"
              @click="cancelExportTemplate"
            >
              CANCEL
            </button>
          </div>
        </div>

        <!-- Export button -->
        <button
          v-else
          class="btn-pixel w-full text-xs"
          @click="startExportTemplate"
        >
          EXPORT JSON
        </button>
      </div>

      <!-- Template Import Section -->
      <div class="space-y-3">
        <h3 class="font-pixel text-xs text-chip-purple">LOAD TEMPLATE</h3>
        <p class="font-body text-sm text-chip-gray">
          Import a previously saved template.
        </p>
        <button
          class="btn-pixel w-full text-xs"
          @click="triggerImport"
        >
          IMPORT JSON
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileImport"
        >
      </div>

      <!-- Info Section -->
      <div class="pt-4 border-t border-chip-gray space-y-2">
        <p class="font-body text-xs text-chip-gray">
          <span class="text-chip-white">Tip:</span> Your work is automatically saved and will be restored when you return.
        </p>
      </div>
    </div>
  </div>
</template>
