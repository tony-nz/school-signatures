<script setup lang="ts">
import type { LayoutLine, LayoutItem } from '../../types'
import { useBuilderStore } from '../../stores/builder'
import { useSignatureStore } from '../../stores/signature'
import { FIELD_LABELS } from '../../templates/custom'

defineProps<{ line: LayoutLine }>()
const builder = useBuilderStore()
const sig = useSignatureStore()

// Short name shown on an element's chip
function chipLabel(item: LayoutItem): string {
  switch (item.type) {
    case 'field': return FIELD_LABELS[item.field]
    case 'text': return (item.text || 'Text').replace(/&amp;/g, '&').slice(0, 18)
    case 'separator': return item.text.trim() || '␣'
    case 'image': return item.source === 'logo' ? 'Logo' : item.source === 'avatar' ? 'Photo' : 'Image'
    case 'socials': return 'Socials'
    case 'button': return sig.data.cta.text || 'Button'
  }
}

function onDragStart(e: DragEvent, id: string) {
  e.stopPropagation()
  e.dataTransfer?.setData('text/plain', id)
}

function onDrop(e: DragEvent, id: string) {
  e.stopPropagation()
  const dragId = e.dataTransfer?.getData('text/plain')
  if (dragId) builder.moveTo(dragId, id)
}
</script>

<template>
  <div
    draggable="true"
    @dragstart="onDragStart($event, line.id)"
    @dragover.prevent
    @drop="onDrop($event, line.id)"
    @click.stop="builder.select(line.id)"
    class="group flex items-center gap-1 flex-wrap min-h-[30px] px-1.5 py-1 rounded-md border cursor-pointer transition-colors"
    :class="builder.selectedId === line.id
      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 bg-white dark:bg-slate-800'"
  >
    <svg class="w-3 h-3 text-slate-300 cursor-grab flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
    </svg>
    <span v-if="!line.items.length" class="text-[11px] italic text-slate-400">Empty row</span>
    <button
      v-for="item in line.items" :key="item.id"
      type="button"
      draggable="true"
      @dragstart="onDragStart($event, item.id)"
      @dragover.prevent
      @drop="onDrop($event, item.id)"
      @click.stop="builder.select(item.id)"
      class="px-1.5 py-0.5 rounded text-[11px] font-medium border cursor-grab transition-colors"
      :class="builder.selectedId === item.id
        ? 'bg-indigo-600 border-indigo-600 text-white'
        : item.type === 'field'
          ? 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300'
          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200'"
    >
      {{ chipLabel(item) }}
    </button>
  </div>
</template>
