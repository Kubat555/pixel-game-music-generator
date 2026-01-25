<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  beat: number
  pitch: number
  active: boolean
  playing: boolean
  isBarStart: boolean
}>()

const emit = defineEmits<{
  click: []
  mouseenter: []
  mouseleave: []
}>()

const cellClasses = computed(() => {
  const classes = ['cell-note']

  if (props.active) {
    classes.push('active')
  }

  if (props.playing && props.active) {
    classes.push('playing')
  }

  if (props.isBarStart) {
    classes.push('border-l-2', 'border-l-chip-gray')
  }

  return classes
})
</script>

<template>
  <div
    :class="cellClasses"
    @click="emit('click')"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
  >
    <div
      v-if="active"
      class="w-full h-full flex items-center justify-center"
    >
      <div class="w-5 h-5 rounded-sm" />
    </div>
  </div>
</template>

<style scoped>
.cell-note {
  @apply w-full h-full border border-chip-darkgray bg-chip-black cursor-pointer transition-all duration-75;
}

.cell-note:hover {
  @apply bg-chip-darkgray;
}

.cell-note.active {
  @apply bg-chip-green;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
}

.cell-note.active:hover {
  @apply bg-chip-lime;
}

.cell-note.playing {
  @apply bg-chip-lime;
  animation: pulse-note 0.1s ease-out;
}

@keyframes pulse-note {
  0% {
    transform: scale(1.1);
    box-shadow: 0 0 10px var(--tw-shadow-color, #00A800);
  }
  100% {
    transform: scale(1);
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
  }
}

/* Track-specific colors are handled by parent */
:deep(.track-lead) .cell-note.active {
  @apply bg-chip-cyan;
}
:deep(.track-lead) .cell-note.active:hover {
  background: #40D8D8;
}
:deep(.track-lead) .cell-note.playing {
  background: #60F8F8;
}

:deep(.track-bass) .cell-note.active {
  @apply bg-chip-purple;
}
:deep(.track-bass) .cell-note.active:hover {
  background: #B040F8;
}
:deep(.track-bass) .cell-note.playing {
  background: #D080FF;
}

:deep(.track-harmony) .cell-note.active {
  @apply bg-chip-yellow;
}
:deep(.track-harmony) .cell-note.active:hover {
  background: #FFD840;
}
:deep(.track-harmony) .cell-note.playing {
  background: #FFE870;
}

:deep(.track-drums) .cell-note.active {
  @apply bg-chip-orange;
}
:deep(.track-drums) .cell-note.active:hover {
  background: #FF9040;
}
:deep(.track-drums) .cell-note.playing {
  background: #FFB070;
}
</style>
