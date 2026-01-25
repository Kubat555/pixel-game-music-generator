<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { templates, type Template } from '@/data/templates'

const projectStore = useProjectStore()
const uiStore = useUIStore()

const selectedCategory = ref<Template['category'] | 'all'>('all')

const categories = [
  { id: 'all', label: 'All', icon: '*' },
  { id: 'adventure', label: 'Adventure', icon: '>' },
  { id: 'battle', label: 'Battle', icon: '!' },
  { id: 'menu', label: 'Menu', icon: '=' },
  { id: 'victory', label: 'Victory', icon: '+' },
  { id: 'peaceful', label: 'Peaceful', icon: '~' },
]

const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return templates
  }
  return templates.filter(t => t.category === selectedCategory.value)
})

function loadTemplate(template: Template) {
  // Create a new project from the template
  const project = {
    id: crypto.randomUUID(),
    ...template.project,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  projectStore.loadFromJSON(project)
  uiStore.showNotification(`Loaded: ${template.name}`, 'success')
}

import { computed } from 'vue'
</script>

<template>
  <div class="space-y-4">
    <h3 class="font-pixel text-xs text-chip-white">TEMPLATES</h3>

    <!-- Category Filter -->
    <div class="flex flex-wrap gap-1">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="px-2 py-1 text-xs font-body border-2"
        :class="selectedCategory === cat.id
          ? 'bg-chip-green border-chip-green text-chip-black'
          : 'bg-transparent border-chip-gray text-chip-gray hover:border-chip-white hover:text-chip-white'"
        @click="selectedCategory = cat.id as typeof selectedCategory"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Template List -->
    <div class="space-y-2">
      <button
        v-for="template in filteredTemplates"
        :key="template.id"
        class="w-full panel-pixel text-left p-3 hover:bg-chip-gray transition-colors"
        @click="loadTemplate(template)"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="font-pixel text-xs text-chip-cyan">
            {{ template.name }}
          </span>
        </div>
        <p class="font-body text-sm text-chip-gray">
          {{ template.description }}
        </p>
        <div class="flex items-center gap-2 mt-2 font-body text-xs text-chip-gray">
          <span>{{ template.project.tempo }} BPM</span>
          <span>|</span>
          <span>{{ template.project.loopEnd - template.project.loopStart }} beats</span>
        </div>
      </button>
    </div>
  </div>
</template>
