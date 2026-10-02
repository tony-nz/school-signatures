<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from '../components/account/AuthShell.vue'
import { ApiError } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const badCredentials = ref(false)
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  badCredentials.value = false
  try {
    await auth.login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.push(redirect)
  } catch (e) {
    error.value = (e as Error).message
    badCredentials.value = e instanceof ApiError && e.status === 401
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Log in to Signature Generator" subtitle="Your saved signatures are waiting.">
    <form @submit.prevent="submit" class="flex flex-col gap-[18px]">
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required class="input h-11" />
      </label>
      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="current-password" required class="input h-11" :class="{ 'input-error': badCredentials }" />
        <small v-if="error" class="text-[13px] text-red-600 dark:text-red-400" role="alert">{{ error }}</small>
      </label>
      <button type="submit" :disabled="busy" class="btn-primary h-[46px] font-bold">{{ busy ? 'Logging in…' : 'Log in' }}</button>
    </form>
    <template #footer>
      <span>Setting up your school or business?</span>
      <RouterLink to="/signup" class="font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 whitespace-nowrap">Request access →</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
@import '../components/account/forms.css';
</style>
