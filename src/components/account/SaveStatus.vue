<script setup lang="ts">
import { ref } from 'vue'
import { useSavedSignaturesStore } from '../../stores/savedSignatures'

// Header save control for the saved signature open in the editor
const emit = defineEmits<{ (e: 'save-new'): void }>()
const saved = useSavedSignaturesStore()
const error = ref('')

async function save() {
  error.value = ''
  try {
    await saved.saveCurrent()
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <div class="flex items-center gap-2 text-xs">
    <template v-if="saved.current">
      <span class="hidden md:inline max-w-[160px] truncate font-medium text-slate-600 dark:text-slate-300" :title="saved.current.name">{{ saved.current.name }}</span>
      <span v-if="error" class="text-rose-500" :title="error">Save failed</span>
      <span v-else-if="saved.isDirty" class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500" /><span class="hidden md:inline">Unsaved changes</span>
      </span>
      <span v-else class="hidden md:inline text-slate-400">All changes saved</span>
      <button v-if="saved.isDirty || error" @click="save" :disabled="!!saved.busy" class="save-btn">Save<span class="hidden md:inline"> changes</span></button>
    </template>
    <button v-else @click="emit('save-new')" class="save-btn" title="Save this signature to your account">Save</button>
  </div>
</template>

<style scoped>
.save-btn {
  @apply px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors;
}
</style>
