<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/useProjectStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'

const projectStore = useProjectStore()
const instrumentStore = useInstrumentStore()

const { tracks } = storeToRefs(projectStore)
const { selectedTrackId } = storeToRefs(instrumentStore)

function selectTrack(trackId: string) {
  instrumentStore.selectTrack(trackId)
}

function toggleMute(trackId: string) {
  const track = tracks.value.find(t => t.id === trackId)
  if (track) {
    projectStore.setTrackMuted(trackId, !track.muted)
  }
}

function toggleSolo(trackId: string) {
  const track = tracks.value.find(t => t.id === trackId)
  if (track) {
    projectStore.setTrackSolo(trackId, !track.solo)
  }
}

const trackColors: Record<string, string> = {
  lead: 'bg-chip-cyan',
  bass: 'bg-chip-purple',
  harmony: 'bg-chip-yellow',
  drums: 'bg-chip-orange',
}
</script>

<template>
  <div class="bg-chip-darkgray border-b-3 border-chip-gray px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-pixel">
    <div
      v-for="track in tracks"
      :key="track.id"
      class="flex items-center gap-1 px-3 py-2 border-3 cursor-pointer transition-colors select-none"
      :class="[
        selectedTrackId === track.id
          ? 'border-chip-white bg-chip-gray'
          : 'border-chip-gray bg-chip-darkgray hover:bg-chip-gray',
        track.muted ? 'opacity-50' : ''
      ]"
      @click="selectTrack(track.id)"
    >
      <!-- Track Color Indicator -->
      <div
        class="w-3 h-3 border border-chip-white"
        :class="trackColors[track.id]"
      />

      <!-- Track Name -->
      <span class="font-pixel text-xs text-chip-white whitespace-nowrap">
        {{ track.name }}
      </span>

      <!-- Mute Button -->
      <button
        class="w-6 h-6 text-xs font-pixel border-2 ml-2"
        :class="track.muted ? 'bg-chip-red border-chip-red text-chip-white' : 'bg-transparent border-chip-gray text-chip-gray hover:border-chip-white hover:text-chip-white'"
        @click.stop="toggleMute(track.id)"
        title="Mute"
      >
        M
      </button>

      <!-- Solo Button -->
      <button
        class="w-6 h-6 text-xs font-pixel border-2"
        :class="track.solo ? 'bg-chip-yellow border-chip-yellow text-chip-black' : 'bg-transparent border-chip-gray text-chip-gray hover:border-chip-white hover:text-chip-white'"
        @click.stop="toggleSolo(track.id)"
        title="Solo"
      >
        S
      </button>
    </div>
  </div>
</template>
