<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/useUIStore'

const uiStore = useUIStore()
const { gridZoom } = storeToRefs(uiStore)
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      class="btn-pixel w-8 h-8 flex items-center justify-center text-lg"
      @click="uiStore.zoomOut"
      :disabled="gridZoom <= 0.5"
      title="Zoom Out (-)"
    >
      -
    </button>

    <div class="panel-pixel px-3 py-1 min-w-[60px] text-center">
      <span class="font-body text-lg text-chip-white">
        {{ Math.round(gridZoom * 100) }}%
      </span>
    </div>

    <button
      class="btn-pixel w-8 h-8 flex items-center justify-center text-lg"
      @click="uiStore.zoomIn"
      :disabled="gridZoom >= 2"
      title="Zoom In (+)"
    >
      +
    </button>
  </div>
</template>
