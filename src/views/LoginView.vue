<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageShell from '../components/account/PageShell.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.push(redirect)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageShell title="Log in" subtitle="Access your business's saved email signatures." narrow>
    <form @submit.prevent="submit" class="card flex flex-col gap-4">
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required class="input" />
      </label>
      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="current-password" required class="input" />
      </label>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <button type="submit" :disabled="busy" class="btn-primary">{{ busy ? 'Logging in…' : 'Log in' }}</button>
      <p class="text-sm text-slate-500 dark:text-slate-400 text-center">
        No account yet? <RouterLink to="/signup" class="text-indigo-600 dark:text-indigo-400 font-medium">Request access</RouterLink>
      </p>
    </form>
  </PageShell>
</template>

<style scoped>
@import '../components/account/forms.css';
</style>
