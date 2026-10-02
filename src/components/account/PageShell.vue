<script setup lang="ts">
import BrandMark from './BrandMark.vue'
import AccountMenu from './AccountMenu.vue'
import { useAuthStore } from '../../stores/auth'

// Simple page frame for the non-editor pages (login, account, admin)
defineProps<{ title: string; subtitle?: string; narrow?: boolean }>()
const auth = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
    <header class="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div class="flex items-center justify-between px-5 py-2.5">
        <BrandMark />
        <div class="flex items-center gap-3">
          <RouterLink v-if="auth.user" to="/" class="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400">← Back to editor</RouterLink>
          <AccountMenu />
        </div>
      </div>
    </header>
    <main class="flex-1 w-full mx-auto px-4 py-10" :class="narrow ? 'max-w-md' : 'max-w-4xl'">
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ subtitle }}</p>
      <div class="mt-6">
        <slot />
      </div>
    </main>
  </div>
</template>
