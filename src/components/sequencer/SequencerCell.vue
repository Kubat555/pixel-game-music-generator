<script setup lang="ts">
import { computed } from 'vue'

interface NoteInfo {
  exists: boolean
  isStart: boolean
  isEnd: boolean
  isMiddle: boolean
  noteId: string | null
  duration: number
}

const props = defineProps<{
  beat: number
  pitch: number
  noteInfo: NoteInfo
  isBarStart: boolean
  isSelected: boolean
  tool: 'pencil' | 'eraser' | 'select'
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
  resizeStart: [event: MouseEvent]
  mouseenter: []
  mouseleave: []
}>()

const cellClasses = computed(() => {
  const classes = ['cell-note']

  if (props.noteInfo.exists) {
    classes.push('active')

    if (props.noteInfo.isStart) {
      classes.push('note-start')
    }
    if (props.noteInfo.isMiddle) {
      classes.push('note-middle')
    }
    if (props.noteInfo.isEnd) {
      classes.push('note-end')
    }
    if (props.noteInfo.duration === 1) {
      classes.push('note-single')
    }
  }

  // NOTE: 'playing' class removed - playhead is now a separate DOM element

  if (props.isBarStart) {
    classes.push('bar-start')
  }

  if (props.isSelected) {
    classes.push('selected')
  }

  // Tool-based cursor
  classes.push(`tool-${props.tool}`)

  return classes
})

function handleResizeStart(event: MouseEvent) {
  emit('resizeStart', event)
}
</script>

<template>
  <div
    :class="cellClasses"
    @click="emit('click', $event)"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
  >
    <!-- Note visualization -->
    <div
      v-if="noteInfo.exists"
      class="note-body"
    >
      <!-- Resize handle on end of note -->
      <div
        v-if="noteInfo.isEnd || noteInfo.duration === 1"
        class="resize-handle"
        @mousedown="handleResizeStart"
      />
    </div>
  </div>
</template>

<style scoped>
.cell-note {
  @apply w-full h-full border border-chip-darkgray bg-chip-black transition-all duration-75 relative;
}

/* Tool-based cursors */
.cell-note.tool-pencil {
  cursor: crosshair;
}

.cell-note.tool-eraser {
  cursor: not-allowed;
}

.cell-note.tool-select {
  cursor: pointer;
}

.cell-note.tool-eraser.active {
  cursor: pointer;
}

.cell-note:hover {
  @apply bg-chip-darkgray;
}

.cell-note.bar-start {
  @apply border-l-2 border-l-chip-gray;
}

.cell-note.active {
  @apply bg-chip-green;
}

.cell-note.active:hover {
  @apply bg-chip-lime;
}

.cell-note.playing {
  @apply bg-chip-lime;
  animation: pulse-note 0.1s ease-out;
}

/* Selected note styling */
.cell-note.selected {
  @apply ring-2 ring-chip-white ring-offset-1 ring-offset-chip-black;
}

.cell-note.selected .note-body {
  animation: pulse-selected 0.5s ease-in-out infinite;
}

@keyframes pulse-selected {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Note body styling */
.note-body {
  @apply absolute inset-0 m-0.5;
  border-radius: 2px;
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
}

/* Note start has rounded left edge */
.cell-note.note-start .note-body {
  border-radius: 3px 0 0 3px;
  margin-right: 0;
}

/* Note middle has no rounded edges */
.cell-note.note-middle .note-body {
  border-radius: 0;
  margin-left: 0;
  margin-right: 0;
}

/* Note end has rounded right edge */
.cell-note.note-end .note-body {
  border-radius: 0 3px 3px 0;
  margin-left: 0;
}

/* Single note (duration=1) has all rounded edges */
.cell-note.note-single .note-body {
  border-radius: 3px;
}

/* Resize handle */
.resize-handle {
  @apply absolute top-0 bottom-0 w-2 cursor-ew-resize;
  right: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 100%);
}

.resize-handle:hover {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 100%);
}

@keyframes pulse-note {
  0% {
    transform: scale(1.05);
    filter: brightness(1.3);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
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
