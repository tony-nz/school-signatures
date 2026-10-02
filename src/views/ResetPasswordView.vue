<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AuthShell from '../components/account/AuthShell.vue'
import { api } from '../lib/api'

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const linkError = ref('')
const checking = ref(true)
const busy = ref(false)
const done = ref(false)

onMounted(async () => {
  try {
    if (!token) throw new Error('This reset link is invalid or has expired')
    email.value = (await api<{ email: string }>(`/auth/reset?token=${encodeURIComponent(token)}`)).email
  } catch (e) {
    linkError.value = (e as Error).message
  } finally {
    checking.value = false
  }
})

async function submit() {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords don't match"
    return
  }
  busy.value = true
  try {
    await api('/auth/reset', { method: 'POST', body: { token, password: password.value } })
    done.value = true
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Choose a new password" :subtitle="email ? `For ${email}` : undefined">
    <p v-if="checking" class="text-sm text-slate-400">Checking your link…</p>

    <div v-else-if="linkError" class="flex flex-col gap-4">
      <p class="text-sm text-red-600 dark:text-red-400" role="alert">{{ linkError }}</p>
      <p class="text-sm text-slate-500 dark:text-slate-400">Reset links work once and expire after 24 hours. Ask your administrator for a new one.</p>
      <RouterLink to="/login" class="btn-primary h-[46px] font-bold flex items-center justify-center">Back to log in</RouterLink>
    </div>

    <div v-else-if="done" class="flex flex-col gap-4">
      <p class="text-sm text-emerald-600 dark:text-emerald-400">Your password has been changed. You can log in with it now.</p>
      <RouterLink to="/login" class="btn-primary h-[46px] font-bold flex items-center justify-center">Log in</RouterLink>
    </div>

    <form v-else @submit.prevent="submit" class="flex flex-col gap-[18px]">
      <label class="field">
        <span>New password</span>
        <input v-model="password" type="password" autocomplete="new-password" minlength="8" required class="input h-11" />
      </label>
      <label class="field">
        <span>Confirm new password</span>
        <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required class="input h-11" />
        <small v-if="error" class="text-[13px] text-red-600 dark:text-red-400" role="alert">{{ error }}</small>
      </label>
      <button type="submit" :disabled="busy" class="btn-primary h-[46px] font-bold">{{ busy ? 'Saving…' : 'Set password' }}</button>
    </form>
  </AuthShell>
</template>

<style scoped>
@import '../components/account/forms.css';
</style>
