<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

// App header branding: the retailer's logo and name when logged in, otherwise the default mark
const auth = useAuthStore()
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2.5 min-w-0">
    <template v-if="auth.user">
      <img v-if="auth.user.logo" :src="auth.user.logo" :alt="auth.user.businessName" class="h-8 max-w-[120px] object-contain flex-shrink-0" />
      <div class="leading-tight min-w-0">
        <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Email Signatures</div>
        <div class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">{{ auth.user.businessName }}</div>
      </div>
    </template>
    <template v-else>
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="leading-tight">
        <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Email</div>
        <div class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">Signature Generator</div>
      </div>
    </template>
  </RouterLink>
</template>
