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

/* Multi-beat notes - remove borders between segments for visual continuity */
.cell-note.active.note-start {
  border-right-color: transparent;
}

.cell-note.active.note-middle {
  border-left-color: transparent;
  border-right-color: transparent;
}

.cell-note.active.note-end {
  border-left-color: transparent;
}

/* Hover handled by overlay in SequencerGrid */
.cell-note.active:hover {
  filter: brightness(1.1);
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
  border-radius: 4px 0 0 4px;
  margin-right: -1px;
  border-right: none;
}

/* Note middle has no rounded edges - lighter shade to show continuity */
.cell-note.note-middle .note-body {
  border-radius: 0;
  margin-left: -1px;
  margin-right: -1px;
  filter: brightness(1.1);
}

/* Note end has rounded right edge */
.cell-note.note-end .note-body {
  border-radius: 0 4px 4px 0;
  margin-left: -1px;
}

/* Single note (duration=1) has all rounded edges */
.cell-note.note-single .note-body {
  border-radius: 4px;
  margin: 2px;
}

/* Multi-beat notes - add top/bottom highlight line for visual connection */
.cell-note.note-start .note-body::after,
.cell-note.note-middle .note-body::after,
.cell-note.note-end .note-body::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 2px;
  height: 2px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
}

/* Don't show connector line on single notes */
.cell-note.note-single .note-body::after {
  display: none;
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

/* Track-specific colors - each instrument has its own color */
:deep(.track-lead) .cell-note.active {
  @apply bg-chip-cyan;
}
:deep(.track-lead) .cell-note.active:hover {
  background: #40D8D8;
}

:deep(.track-bass) .cell-note.active {
  @apply bg-chip-purple;
}
:deep(.track-bass) .cell-note.active:hover {
  background: #B040F8;
}

:deep(.track-harmony) .cell-note.active {
  @apply bg-chip-yellow;
}
:deep(.track-harmony) .cell-note.active:hover {
  background: #FFD840;
}

:deep(.track-drums) .cell-note.active {
  @apply bg-chip-orange;
}
:deep(.track-drums) .cell-note.active:hover {
  background: #FF9040;
}
</style>
