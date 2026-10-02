<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageShell from '../components/account/PageShell.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const businessName = ref('')
const contactName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
const pending = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    const status = await auth.signup({
      businessName: businessName.value,
      contactName: contactName.value,
      email: email.value,
      password: password.value,
    })
    if (status === 'approved') router.push('/account')
    else pending.value = true
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageShell title="Request access" subtitle="Create an account for your business. An admin will review and approve it." narrow>
    <div v-if="pending" class="card text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-2">
      <p class="font-semibold text-slate-800 dark:text-slate-100">Thanks — your request has been sent.</p>
      <p>An admin needs to approve your account before you can log in. Try logging in again once you've been approved.</p>
      <RouterLink to="/login" class="text-indigo-600 dark:text-indigo-400 font-medium">Go to log in</RouterLink>
    </div>

    <form v-else @submit.prevent="submit" class="card flex flex-col gap-4">
      <label class="field">
        <span>Business name</span>
        <input v-model="businessName" type="text" autocomplete="organization" required class="input" />
      </label>
      <label class="field">
        <span>Your name</span>
        <input v-model="contactName" type="text" autocomplete="name" class="input" />
      </label>
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required class="input" />
      </label>
      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="new-password" minlength="8" required class="input" />
        <small class="text-xs text-slate-400">At least 8 characters</small>
      </label>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <button type="submit" :disabled="busy" class="btn-primary">{{ busy ? 'Sending…' : 'Request access' }}</button>
      <p class="text-sm text-slate-500 dark:text-slate-400 text-center">
        Already approved? <RouterLink to="/login" class="text-indigo-600 dark:text-indigo-400 font-medium">Log in</RouterLink>
      </p>
    </form>
  </PageShell>
</template>

<style scoped>
@import '../components/account/forms.css';
</style>
