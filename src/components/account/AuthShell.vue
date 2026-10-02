<script setup lang="ts">
// Centered, header-less frame for the logged-out pages (login, signup)
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="auth-bg min-h-screen flex flex-col items-center justify-center gap-7 px-4 py-12 bg-slate-50 dark:bg-slate-950">
    <div class="flex flex-col items-center gap-3.5 text-center">
      <div class="w-[52px] h-[52px] rounded-[15px] bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40">
        <svg class="w-[26px] h-[26px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="flex flex-col gap-1.5">
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{{ title }}</h1>
        <p v-if="subtitle" class="text-[15px] text-slate-500 dark:text-slate-400 max-w-sm">{{ subtitle }}</p>
      </div>
    </div>

    <div class="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
      <slot />
    </div>

    <div v-if="$slots.footer" class="w-full max-w-[400px] flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-[18px] py-3.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.auth-bg {
  background-image: radial-gradient(theme('colors.slate.300') 1px, transparent 1px);
  background-size: 22px 22px;
}
:global(.dark .auth-bg) {
  background-image: radial-gradient(theme('colors.slate.800') 1px, transparent 1px);
}
</style>
