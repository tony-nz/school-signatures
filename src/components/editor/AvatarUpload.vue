<script setup lang="ts">
import { ref } from 'vue'
import { useSignatureStore } from '../../stores/signature'

const props = defineProps<{ field: 'avatar' | 'logo' }>()
const store = useSignatureStore()
const inputRef = ref<HTMLInputElement | null>(null)
const showUrlInput = ref(false)
const urlInput = ref(store.data[props.field]?.startsWith('http') ? (store.data[props.field] ?? '') : '')

const label = props.field === 'avatar' ? 'Photo' : 'Logo'
const current = () => store.data[props.field]

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    store.data[props.field] = ev.target?.result as string
    showUrlInput.value = false
  }
  reader.readAsDataURL(file)
}

function applyUrl() {
  store.data[props.field] = urlInput.value.trim()
  showUrlInput.value = false
}

const converting = ref(false)
const convertError = ref('')

async function convertToBase64() {
  const src = store.data[props.field]
  if (!src?.startsWith('http')) return
  converting.value = true
  convertError.value = ''
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = src
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    store.data[props.field] = canvas.toDataURL('image/png')
    urlInput.value = ''
  } catch {
    convertError.value = 'Could not convert — try uploading the file directly'
  } finally {
    converting.value = false
  }
}

function clear() {
  store.data[props.field] = ''
  urlInput.value = ''
  showUrlInput.value = false
  convertError.value = ''
  if (inputRef.value) inputRef.value.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-xs font-medium text-gray-500 dark:text-slate-400">{{ label }}</label>

    <div class="flex items-center gap-2">
      <!-- Thumbnail -->
      <div class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
        <img v-if="current()" :src="current()" class="w-full h-full object-contain" :alt="label" />
        <span v-else class="text-gray-300 text-lg">+</span>
      </div>

      <!-- Actions -->
      <div class="flex gap-1.5 flex-wrap">
        <button @click="inputRef?.click()" class="action-btn">Upload</button>
        <button @click="showUrlInput = !showUrlInput" class="action-btn" :class="{ 'border-indigo-400 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400': showUrlInput }">URL</button>
        <button v-if="current()?.startsWith('http')" @click="convertToBase64" :disabled="converting" class="action-btn" :title="'Embed image as base64 so no external hosting is needed'">
          {{ converting ? 'Converting…' : 'Embed' }}
        </button>
        <button v-if="current()" @click="clear" class="action-btn text-red-400 hover:text-red-600">✕</button>
      </div>
    </div>
    <p v-if="convertError" class="text-xs text-red-500">{{ convertError }}</p>

    <!-- URL input (below actions) -->
    <div v-if="showUrlInput" class="flex gap-1.5">
      <input
        v-model="urlInput"
        type="url"
        placeholder="https://..."
        autofocus
        @keydown.enter="applyUrl"
        @keydown.esc="showUrlInput = false"
        class="flex-1 min-w-0 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
      />
      <button @click="applyUrl" class="action-btn bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700">Apply</button>
      <button @click="showUrlInput = false" class="action-btn">Cancel</button>
    </div>
    <input ref="inputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>

<style scoped>
.action-btn {
  @apply text-xs px-2.5 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50
    text-gray-600 transition cursor-pointer
    dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300;
}
</style>
