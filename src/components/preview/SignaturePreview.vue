<script setup lang="ts">
import { useSignatureStore } from '../../stores/signature'

const store = useSignatureStore()
</script>

<template>
  <div class="flex flex-col gap-3 h-full">
    <div class="flex items-center justify-between">
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Preview</span>
      <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Live
      </span>
    </div>

    <!-- Email chrome mock -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-y-auto flex-1 relative">
      <!-- Fake email header -->
      <div class="border-b border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800">
        <div class="flex items-center gap-1.5 mb-2.5">
          <div class="w-3 h-3 rounded-full bg-red-400"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div class="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div class="text-xs text-slate-400 space-y-1">
          <div><span class="text-slate-500 dark:text-slate-400 font-medium">From:</span> {{ store.data.name || 'Your Name' }} &lt;{{ store.data.email || 'you@email.com' }}&gt;</div>
          <div><span class="text-slate-500 dark:text-slate-400 font-medium">Subject:</span> Following up on our conversation</div>
        </div>
      </div>

      <!-- Email body -->
      <div class="px-5 py-5">
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Hi there,<br /><br />
          Just wanted to follow up on our last conversation. Looking forward to hearing from you soon.
          <br /><br />
          Best,
        </p>

        <!-- Signature rendered via v-html -->
        <div v-html="store.renderedHtml" class="signature-container"></div>
      </div>

      <!-- Attribution -->
      <a
        href="https://github.com/tony-nz"
        target="_blank"
        rel="noopener noreferrer"
        class="absolute bottom-3 right-4 inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-slate-400 transition-colors"
      >
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
        Made by Tony Myers
      </a>
    </div>
  </div>
</template>

<style scoped>
.signature-container {
  /* isolate the signature from Tailwind resets */
  all: initial;
  display: block;
  font-family: Arial, sans-serif;
}
</style>
