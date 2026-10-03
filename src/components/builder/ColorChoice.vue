<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutColor } from '../../types'
import { useSignatureStore } from '../../stores/signature'
import { resolveColors } from '../../templates/helpers'

// Picks one of the signature's colors, or a custom hex
const model = defineModel<LayoutColor | undefined>()
const props = defineProps<{ fallback?: LayoutColor }>()
const store = useSignatureStore()

const palette = computed(() => {
  const fc = resolveColors(store.data)
  return [
    { id: 'accent', label: 'Accent', hex: store.data.accentColor },
    { id: 'name', label: 'Name', hex: fc.name },
    { id: 'title', label: 'Title', hex: fc.title },
    { id: 'body', label: 'Body', hex: fc.body },
    { id: 'muted', label: 'Muted', hex: fc.muted },
  ]
})

const current = computed(() => model.value ?? props.fallback ?? 'body')
const isCustom = computed(() => !palette.value.some(p => p.id === current.value))
const customHex = computed(() => (isCustom.value ? current.value : palette.value.find(p => p.id === current.value)?.hex) ?? '#000000')
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      v-for="p in palette" :key="p.id" type="button"
      @click="model = p.id"
      :title="p.label"
      class="w-5 h-5 rounded-full border-2 transition"
      :class="current === p.id ? 'border-indigo-500 scale-110' : 'border-white dark:border-slate-700 shadow-sm'"
      :style="{ background: p.hex }"
    />
    <label
      title="Custom color"
      class="relative w-5 h-5 rounded-full border-2 cursor-pointer overflow-hidden"
      :class="isCustom ? 'border-indigo-500 scale-110' : 'border-white dark:border-slate-700 shadow-sm'"
      :style="{ background: isCustom ? customHex : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }"
    >
      <input type="color" :value="customHex" @input="model = ($event.target as HTMLInputElement).value" class="absolute inset-0 opacity-0 cursor-pointer" />
    </label>
  </div>
</template>
