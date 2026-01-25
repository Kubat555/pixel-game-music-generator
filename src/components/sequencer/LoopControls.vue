<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'

const projectStore = useProjectStore()
const { loopStart, loopEnd, loopEnabled } = storeToRefs(projectStore)

const loopLength = computed(() => loopEnd.value - loopStart.value)

function extendLoop() {
  projectStore.setLoopRegion(loopStart.value, loopEnd.value + 4)
}

function shrinkLoop() {
  if (loopLength.value > 4) {
    projectStore.setLoopRegion(loopStart.value, loopEnd.value - 4)
  }
}

function shiftLoopLeft() {
  if (loopStart.value >= 4) {
    projectStore.setLoopRegion(loopStart.value - 4, loopEnd.value - 4)
  }
}

function shiftLoopRight() {
  projectStore.setLoopRegion(loopStart.value + 4, loopEnd.value + 4)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Loop Toggle -->
    <button
      class="btn-pixel text-xs"
      :class="loopEnabled ? 'bg-chip-yellow text-chip-black' : ''"
      @click="projectStore.loopEnabled = !projectStore.loopEnabled"
      title="Toggle Loop"
    >
      LOOP
    </button>

    <!-- Loop Navigation -->
    <div class="flex items-center gap-1">
      <button
        class="btn-pixel w-7 h-7 flex items-center justify-center text-xs"
        @click="shiftLoopLeft"
        :disabled="loopStart <= 0"
        title="Move Loop Left"
      >
        &lt;
      </button>

      <div class="panel-pixel px-3 py-1 min-w-[80px] text-center">
        <span class="font-body text-lg text-chip-white">
          {{ loopStart + 1 }}-{{ loopEnd }}
        </span>
      </div>

      <button
        class="btn-pixel w-7 h-7 flex items-center justify-center text-xs"
        @click="shiftLoopRight"
        title="Move Loop Right"
      >
        &gt;
      </button>
    </div>

    <!-- Loop Length -->
    <div class="flex items-center gap-1">
      <button
        class="btn-pixel w-7 h-7 flex items-center justify-center text-xs"
        @click="shrinkLoop"
        :disabled="loopLength <= 4"
        title="Shrink Loop"
      >
        -4
      </button>

      <span class="font-body text-lg text-chip-gray px-2">
        {{ loopLength }} beats
      </span>

      <button
        class="btn-pixel w-7 h-7 flex items-center justify-center text-xs"
        @click="extendLoop"
        title="Extend Loop"
      >
        +4
      </button>
    </div>
  </div>
</template>
