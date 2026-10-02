<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useSavedSignaturesStore } from '../../stores/savedSignatures'

const auth = useAuthStore()
const saved = useSavedSignaturesStore()
const router = useRouter()
const open = ref(false)

async function logout() {
  open.value = false
  await auth.logout()
  saved.reset()
  router.push('/login')
}
</script>

<template>
  <RouterLink v-if="!auth.user" to="/login" class="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors">
    Log in
  </RouterLink>

  <div v-else class="relative">
    <button @click="open = !open"
      class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
      <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center text-[11px] font-bold uppercase">
        {{ auth.user.businessName.charAt(0) }}
      </span>
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </button>

    <div v-if="open" class="fixed inset-0 z-20" @click="open = false" />
    <div v-if="open" class="absolute right-0 mt-1 w-56 z-30 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 text-sm">
      <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div class="font-semibold text-slate-800 dark:text-slate-100 truncate">{{ auth.user.businessName }}</div>
        <div class="text-xs text-slate-400 truncate">{{ auth.user.email }}</div>
      </div>
      <RouterLink to="/account" @click="open = false" class="menu-item">Account &amp; branding</RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/admin" @click="open = false" class="menu-item">Admin Centre</RouterLink>
      <button @click="logout" class="menu-item w-full text-left text-red-500">Log out</button>
    </div>
  </div>
</template>

<style scoped>
.menu-item {
  @apply block px-3 py-1.5 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800;
}
</style>
