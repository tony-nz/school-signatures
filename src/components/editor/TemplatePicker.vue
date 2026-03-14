<script setup lang="ts">
import { useSignatureStore } from '../../stores/signature'
import { templates } from '../../templates'

const store = useSignatureStore()
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="template in templates"
      :key="template.id"
      @click="store.selectTemplate(template.id)"
      class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
      :class="store.selectedTemplateId === template.id
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'"
    >
      {{ template.name }}
    </button>
  </div>
</template>
