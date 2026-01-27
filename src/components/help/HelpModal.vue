<script setup lang="ts">
defineEmits<{
  close: []
}>()

const shortcuts = {
  playback: [
    { key: 'Space', action: 'Play / Pause' },
    { key: 'Escape', action: 'Stop & clear selection' },
  ],
  editing: [
    { key: 'Ctrl + Z', action: 'Undo' },
    { key: 'Ctrl + Shift + Z', action: 'Redo' },
    { key: 'Ctrl + Y', action: 'Redo (alt)' },
    { key: 'Ctrl + C', action: 'Copy notes' },
    { key: 'Ctrl + X', action: 'Cut notes' },
    { key: 'Ctrl + V', action: 'Paste notes' },
    { key: 'Ctrl + A', action: 'Select all' },
    { key: 'Ctrl + D', action: 'Duplicate' },
    { key: 'Delete', action: 'Delete notes' },
  ],
  tools: [
    { key: 'P', action: 'Pencil tool' },
    { key: 'E', action: 'Eraser tool' },
    { key: 'S', action: 'Select tool' },
  ],
  navigation: [
    { key: '1 - 4', action: 'Select track' },
    { key: '+ / -', action: 'Zoom in/out' },
    { key: 'Ctrl + Up/Down', action: 'Tempo +/- 5' },
  ],
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="panel-pixel bg-chip-darkgray max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-pixel">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b-3 border-chip-gray">
        <h2 class="font-pixel text-lg text-chip-cyan">KEYBOARD SHORTCUTS</h2>
        <button
          class="btn-pixel text-xs"
          @click="$emit('close')"
        >
          X
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Playback -->
        <div class="panel-pixel p-3">
          <h3 class="font-pixel text-sm text-chip-green mb-3">PLAYBACK</h3>
          <div class="space-y-2">
            <div
              v-for="shortcut in shortcuts.playback"
              :key="shortcut.key"
              class="flex justify-between items-center"
            >
              <kbd class="px-2 py-1 bg-chip-black border border-chip-gray font-mono text-xs text-chip-yellow">
                {{ shortcut.key }}
              </kbd>
              <span class="font-body text-sm text-chip-white">{{ shortcut.action }}</span>
            </div>
          </div>
        </div>

        <!-- Tools -->
        <div class="panel-pixel p-3">
          <h3 class="font-pixel text-sm text-chip-purple mb-3">TOOLS</h3>
          <div class="space-y-2">
            <div
              v-for="shortcut in shortcuts.tools"
              :key="shortcut.key"
              class="flex justify-between items-center"
            >
              <kbd class="px-2 py-1 bg-chip-black border border-chip-gray font-mono text-xs text-chip-yellow">
                {{ shortcut.key }}
              </kbd>
              <span class="font-body text-sm text-chip-white">{{ shortcut.action }}</span>
            </div>
          </div>
        </div>

        <!-- Editing -->
        <div class="panel-pixel p-3">
          <h3 class="font-pixel text-sm text-chip-orange mb-3">EDITING</h3>
          <div class="space-y-2">
            <div
              v-for="shortcut in shortcuts.editing"
              :key="shortcut.key"
              class="flex justify-between items-center"
            >
              <kbd class="px-2 py-1 bg-chip-black border border-chip-gray font-mono text-xs text-chip-yellow">
                {{ shortcut.key }}
              </kbd>
              <span class="font-body text-sm text-chip-white">{{ shortcut.action }}</span>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="panel-pixel p-3">
          <h3 class="font-pixel text-sm text-chip-cyan mb-3">NAVIGATION</h3>
          <div class="space-y-2">
            <div
              v-for="shortcut in shortcuts.navigation"
              :key="shortcut.key"
              class="flex justify-between items-center"
            >
              <kbd class="px-2 py-1 bg-chip-black border border-chip-gray font-mono text-xs text-chip-yellow">
                {{ shortcut.key }}
              </kbd>
              <span class="font-body text-sm text-chip-white">{{ shortcut.action }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tips -->
      <div class="p-4 border-t-3 border-chip-gray">
        <h3 class="font-pixel text-sm text-chip-yellow mb-2">HOW TO SELECT & PASTE</h3>
        <ul class="font-body text-sm text-chip-gray space-y-1">
          <li>1. Press S to switch to Select tool</li>
          <li>2. Drag a box to select multiple notes at once</li>
          <li>3. Or click on notes (Shift+click for multi-select)</li>
          <li>4. Press Ctrl+C to copy selected notes</li>
          <li>5. Press Ctrl+V - you'll see a preview</li>
          <li>6. Click where you want to paste the notes</li>
          <li>7. Press ESC to cancel paste mode</li>
        </ul>
        <h3 class="font-pixel text-sm text-chip-yellow mt-3 mb-2">OTHER TIPS</h3>
        <ul class="font-body text-sm text-chip-gray space-y-1">
          <li>* Drag the right edge of a note to change duration</li>
          <li>* Use Ctrl/Cmd on Mac instead of Ctrl</li>
        </ul>
      </div>

      <!-- Close button -->
      <div class="p-4 border-t-3 border-chip-gray flex justify-center">
        <button
          class="btn-pixel-primary px-8"
          @click="$emit('close')"
        >
          GOT IT!
        </button>
      </div>
    </div>
  </div>
</template>
