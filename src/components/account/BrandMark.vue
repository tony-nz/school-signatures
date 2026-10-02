<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

// App header branding: the retailer's logo and name when logged in, otherwise the default mark
const auth = useAuthStore()

// The name can only be hidden when a logo is there to stand in for it
const showName = computed(() => !!auth.user && (auth.user.showBusinessName !== false || !auth.user.logo))
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2.5 min-w-0">
    <template v-if="auth.user">
      <img v-if="auth.user.logo" :src="auth.user.logo" :alt="auth.user.businessName" class="h-8 max-w-[120px] object-contain flex-shrink-0" />
      <!-- Name + tagline -->
      <div v-if="showName && auth.user.tagline" class="leading-tight min-w-0">
        <div class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">{{ auth.user.businessName }}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ auth.user.tagline }}</div>
      </div>
      <!-- Name or tagline under the app label -->
      <div v-else-if="showName || auth.user.tagline" class="leading-tight min-w-0">
        <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Email Signatures</div>
        <div v-if="showName" class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">{{ auth.user.businessName }}</div>
        <div v-else class="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">{{ auth.user.tagline }}</div>
      </div>
      <!-- Logo only: a single centred label beside a divider, so there's no empty second line -->
      <div v-else class="flex items-center gap-2.5 min-w-0">
        <span class="h-6 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Email Signatures</span>
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
