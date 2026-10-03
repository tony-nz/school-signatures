<script setup lang="ts">
import { useSignatureStore } from '../../stores/signature'
import { templates } from '../../templates'

const store = useSignatureStore()
</script>

<template>
  <label class="flex items-center gap-2 w-full lg:w-auto">
    <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Style</span>
    <select
      :value="store.selectedTemplateId"
      @change="store.selectTemplate(($event.target as HTMLSelectElement).value)"
      class="select"
    >
      <option v-for="template in templates" :key="template.id" :value="template.id">
        {{ template.name }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.select {
  @apply flex-1 lg:flex-none lg:w-44 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800
    focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100;
}
</style>
