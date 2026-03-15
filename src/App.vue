<script setup lang="ts">
import { computed, ref } from 'vue'
import TemplatePicker from './components/editor/TemplatePicker.vue'
import FieldEditor from './components/editor/FieldEditor.vue'
import SignaturePreview from './components/preview/SignaturePreview.vue'
import ExportPanel from './components/export/ExportPanel.vue'
import BulkPanel from './components/bulk/BulkPanel.vue'
import { useSignatureStore } from './stores/signature'
import { useDarkMode } from './composables/useDarkMode'

const store = useSignatureStore()
const { isDark, toggle } = useDarkMode()
const bulkMode = ref(false)

const savedLabel = computed(() => {
  if (!store.lastSaved) return null
  return store.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">

    <!-- Header + Template Picker -->
    <header class="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center shadow-sm">
      <!-- Branding: matches aside width exactly -->
      <div class="w-72 flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 border-r border-slate-200 dark:border-slate-700">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="leading-tight">
          <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Email</div>
          <div class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Signature Generator</div>
        </div>
      </div>
      <!-- Template picker + saved indicator -->
      <div class="flex-1 flex items-center gap-4 px-5 py-2.5">
        <TemplatePicker />
        <div class="ml-auto flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs text-slate-400" v-if="savedLabel">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            Saved {{ savedLabel }}
          </div>
          <!-- Bulk mode toggle -->
          <button
            @click="bulkMode = !bulkMode"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            :class="bulkMode
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'"
            title="Toggle bulk mode"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Bulk
          </button>
          <!-- Dark mode toggle -->
          <button
            @click="toggle"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <svg v-if="isDark" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main: Editor + Preview -->
    <main class="flex flex-1 overflow-hidden">

      <!-- Left: Field Editor -->
      <aside class="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
        <FieldEditor />
      </aside>

      <!-- Right: Preview + Export / Bulk Panel -->
      <section class="flex-1 flex flex-col overflow-hidden p-5 gap-4 bg-slate-50 dark:bg-slate-950">
        <template v-if="bulkMode">
          <BulkPanel />
        </template>
        <template v-else>
          <div class="flex-1 min-h-0">
            <SignaturePreview />
          </div>
          <div class="flex-shrink-0">
            <ExportPanel />
          </div>
        </template>
      </section>

    </main>
  </div>
</template>
