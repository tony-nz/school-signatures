<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TemplatePicker from '../components/editor/TemplatePicker.vue'
import FieldEditor from '../components/editor/FieldEditor.vue'
import SignaturePreview from '../components/preview/SignaturePreview.vue'
import ExportPanel from '../components/export/ExportPanel.vue'
import BulkPanel from '../components/bulk/BulkPanel.vue'
import BuilderPanel from '../components/builder/BuilderPanel.vue'
import { useSignatureStore } from '../stores/signature'
import { useDarkMode } from '../composables/useDarkMode'
import BrandMark from '../components/account/BrandMark.vue'
import AccountMenu from '../components/account/AccountMenu.vue'
import SavedSignaturesPanel from '../components/account/SavedSignaturesPanel.vue'
import SaveStatus from '../components/account/SaveStatus.vue'
import { useAuthStore } from '../stores/auth'
import { useSavedSignaturesStore } from '../stores/savedSignatures'
import { useBuilderStore } from '../stores/builder'

const store = useSignatureStore()
const { isDark, toggle } = useDarkMode()
const auth = useAuthStore()
const saved = useSavedSignaturesStore()

// Fetch the saved list once per login / page load so the panel and footer dropdown open instantly
watch(() => auth.user?.id, (id) => {
  if (id) saved.refresh().catch(() => {})
  else saved.reset()
}, { immediate: true })
// Right-hand panel: live preview, bulk export, or the retailer's saved signatures
const mode = ref<'preview' | 'bulk' | 'saved'>('preview')
const bulkMode = computed({
  get: () => mode.value === 'bulk',
  set: (on: boolean) => { mode.value = on ? 'bulk' : 'preview' },
})

// Below lg the editor shows one pane at a time, picked from the bottom tab bar
const mobileTab = ref<'edit' | 'preview' | 'build'>('preview')
const isCustom = computed(() => store.selectedTemplateId === 'custom')
const builder = useBuilderStore()
const isNarrow = () => window.matchMedia('(max-width: 1023px)').matches

// Bulk and saved signatures open in the preview pane
watch(mode, (m) => { if (m !== 'preview') mobileTab.value = 'preview' })
watch(isCustom, (custom) => { if (!custom && mobileTab.value === 'build') mobileTab.value = 'preview' })
// Tapping an element on the canvas opens its settings
watch(() => builder.selectedId, (id) => {
  if (id && isNarrow() && mobileTab.value === 'preview') mobileTab.value = 'build'
})

const savedLabel = computed(() => {
  if (!store.lastSaved) return null
  return store.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="app-height bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">

    <!-- Header + Template Picker -->
    <header class="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-wrap lg:flex-nowrap items-center shadow-sm">
      <!-- Branding: matches aside width exactly on desktop -->
      <div class="lg:w-72 flex-shrink min-w-0 lg:flex-shrink-0 flex items-center gap-2.5 px-4 lg:px-5 py-2.5 lg:border-r border-slate-200 dark:border-slate-700">
        <BrandMark />
      </div>
      <!-- Template picker: its own row on small screens -->
      <div class="order-last lg:order-none w-full lg:w-auto px-4 lg:px-5 pb-2.5 lg:py-2.5">
        <TemplatePicker />
      </div>
      <!-- Saved indicator + actions -->
      <div class="ml-auto flex items-center gap-1.5 sm:gap-3 px-3 lg:px-5 py-2.5">
          <SaveStatus v-if="auth.user" @save-new="mode = 'saved'" />
          <div class="hidden xl:flex items-center gap-1.5 text-xs text-slate-400" v-if="savedLabel" title="Your work in progress is auto-saved in this browser">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            Draft saved {{ savedLabel }}
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
            <span class="hidden sm:inline">Bulk</span>
          </button>
          <!-- Saved signatures (retailer accounts) -->
          <button
            v-if="auth.user"
            @click="mode = mode === 'saved' ? 'preview' : 'saved'"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            :class="mode === 'saved'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'"
            title="My saved signatures"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            <span class="hidden sm:inline">My Signatures</span>
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
          <AccountMenu />
      </div>
    </header>

    <!-- Main: Editor + Preview -->
    <main class="flex flex-1 overflow-hidden">

      <!-- Left: Field Editor -->
      <aside :class="mobileTab === 'edit' ? 'flex' : 'hidden lg:flex'" class="w-full lg:w-72 flex-shrink-0 lg:border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
        <FieldEditor />
      </aside>

      <!-- Right: Preview + Export / Bulk Panel -->
      <section :class="mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'" class="relative flex-1 min-w-0 flex-col overflow-hidden p-3 sm:p-5 gap-4 bg-slate-50 dark:bg-slate-950">
        <!-- Loading overlay while saving / opening a saved signature -->
        <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition-opacity duration-150" leave-active-class="transition-opacity duration-150">
          <div v-if="saved.busy" class="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-[1px]">
            <div class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-sm font-medium text-slate-600 dark:text-slate-200">
              <svg class="w-4 h-4 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
              {{ saved.busy }}
            </div>
          </div>
        </Transition>
        <button
          v-if="mode !== 'preview'"
          @click="mode = 'preview'"
          class="self-start flex items-center gap-1 -ml-2 -mb-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to preview
        </button>
        <template v-if="mode === 'bulk'">
          <BulkPanel />
        </template>
        <template v-else-if="mode === 'saved'">
          <SavedSignaturesPanel @opened="mode = 'preview'" />
        </template>
        <div v-else class="flex-1 min-h-0 flex gap-4">
          <div :class="mobileTab === 'build' && isCustom ? 'hidden lg:flex' : 'flex'" class="flex-1 min-w-0 flex-col gap-4">
            <div class="flex-1 min-h-0">
              <SignaturePreview />
            </div>
            <div class="flex-shrink-0">
              <ExportPanel />
            </div>
          </div>
          <!-- Visual builder for the Custom template -->
          <div v-if="isCustom" :class="mobileTab === 'build' ? 'block' : 'hidden lg:block'" class="w-full lg:w-80 flex-shrink-0 min-h-0">
            <BuilderPanel />
          </div>
        </div>
      </section>

    </main>

    <!-- Pane switcher for small screens -->
    <nav class="lg:hidden flex-shrink-0 grid border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pb-[env(safe-area-inset-bottom)]"
      :class="isCustom ? 'grid-cols-3' : 'grid-cols-2'">
      <button @click="mobileTab = 'edit'" class="tab" :class="{ 'tab-on': mobileTab === 'edit' }">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        Details
      </button>
      <button @click="mobileTab = 'preview'" class="tab" :class="{ 'tab-on': mobileTab === 'preview' }">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        {{ mode === 'bulk' ? 'Bulk' : mode === 'saved' ? 'Saved' : 'Preview' }}
      </button>
      <button v-if="isCustom" @click="mode = 'preview'; mobileTab = 'build'" class="tab" :class="{ 'tab-on': mobileTab === 'build' }">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v4H4V5zM4 13h7v6H5a1 1 0 01-1-1v-5zM15 13h5v5a1 1 0 01-1 1h-4v-6z"/></svg>
        Build
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* dvh keeps the bottom tab bar above mobile browser toolbars */
.app-height {
  height: 100vh;
  height: 100dvh;
}
.tab {
  @apply flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-400 dark:text-slate-500;
}
.tab-on {
  @apply text-indigo-600 dark:text-indigo-400;
}
</style>
