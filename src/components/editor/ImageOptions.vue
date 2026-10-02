<script setup lang="ts">
import { useSignatureStore } from '../../stores/signature'
import type { AvatarShape, AvatarSize } from '../../types'

const props = defineProps<{ field: 'avatar' | 'logo' }>()
const store = useSignatureStore()

const label = props.field === 'avatar' ? 'Photo' : 'Logo'
const shapeKey = props.field === 'avatar' ? 'avatarShape' : 'logoShape'
const sizeKey = props.field === 'avatar' ? 'avatarSize' : 'logoSize'
const paddingKey = props.field === 'avatar' ? 'avatarPaddingPx' : 'logoPaddingPx'

const shapes: { value: AvatarShape; label: string }[] = [
  { value: 'circle', label: '●' },
  { value: 'rounded', label: '▣' },
  { value: 'square', label: '■' },
]
const sizes: { value: AvatarSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'custom', label: 'Custom' },
]
</script>

<template>
  <div class="flex flex-col gap-3 mt-3">

    <!-- Shape -->
    <div class="field">
      <label>{{ label }} Shape</label>
      <div class="btn-group">
        <button v-for="s in shapes" :key="s.value" @click="store.data.style[shapeKey] = s.value"
          :class="store.data.style[shapeKey] === s.value ? 'active' : ''" class="seg-btn">{{ s.label }}</button>
      </div>
    </div>

    <!-- Size -->
    <div class="field">
      <label>{{ label }} Size</label>
      <div class="btn-group">
        <button v-for="s in sizes" :key="s.value" @click="store.data.style[sizeKey] = s.value"
          :class="store.data.style[sizeKey] === s.value ? 'active' : ''" class="seg-btn">{{ s.label }}</button>
      </div>
      <!-- Photos are square: one dimension -->
      <div v-if="field === 'avatar' && store.data.style.avatarSize === 'custom'" class="custom-row">
        <input
          type="number"
          v-model.number="store.data.style.avatarSizeCustomPx"
          min="24" max="120"
          class="custom-num"
        />
        <span class="unit">px</span>
      </div>
      <!-- Logos: width and height, either can be left as auto -->
      <div v-else-if="field === 'logo' && store.data.style.logoSize === 'custom'" class="custom-row">
        <span class="unit">W</span>
        <input
          type="number"
          v-model.number="store.data.style.logoSizeCustomPx"
          min="16" max="600"
          placeholder="auto"
          class="custom-num"
        />
        <span class="unit">H</span>
        <input
          type="number"
          v-model.number="store.data.style.logoSizeCustomHeightPx"
          min="16" max="300"
          placeholder="auto"
          class="custom-num"
        />
        <span class="unit">px</span>
      </div>
    </div>


    <!-- Padding -->
    <div class="field">
      <label>{{ label }} Padding</label>
      <div class="custom-row">
        <input
          type="range"
          v-model.number="store.data.style[paddingKey]"
          min="0" max="24" step="1"
          class="range"
        />
        <span class="unit w-10 text-right">{{ store.data.style[paddingKey] || 0 }}px</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field label { @apply text-xs font-medium text-slate-500 dark:text-slate-400; }
.btn-group {
  @apply inline-flex self-start rounded-lg border border-slate-200 overflow-hidden
    dark:border-slate-700;
}
.seg-btn {
  @apply px-3 py-1.5 text-xs font-medium text-slate-500 bg-white hover:bg-slate-50 transition cursor-pointer
    border-r border-slate-200 last:border-r-0
    dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700;
}
.seg-btn.active {
  @apply bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white;
}
.custom-row {
  @apply flex items-center gap-2 mt-0.5;
}
.custom-num {
  @apply w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800
    focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition
    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100;
}
.range {
  @apply flex-1 accent-indigo-600 cursor-pointer;
}
.unit {
  @apply text-xs text-slate-400;
}
</style>
