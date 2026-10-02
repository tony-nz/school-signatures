<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from '../components/account/AuthShell.vue'
import { ApiError } from '../lib/api'
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
// Set when the business name matches an existing company; submitting again goes ahead anyway
const companyExists = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    const status = await auth.signup({
      businessName: businessName.value,
      contactName: contactName.value,
      email: email.value,
      password: password.value,
      confirmNewCompany: companyExists.value,
    })
    if (status === 'approved') router.push('/account')
    else pending.value = true
  } catch (e) {
    error.value = (e as Error).message
    companyExists.value = e instanceof ApiError && e.code === 'company_exists'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Request access" subtitle="Create an account for your business. An admin will review and approve it.">
    <div v-if="pending" class="text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-2">
      <p class="font-semibold text-slate-800 dark:text-slate-100">Thanks — your request has been sent.</p>
      <p>An admin needs to approve your account before you can log in. Try logging in again once you've been approved.</p>
      <RouterLink to="/login" class="text-indigo-600 dark:text-indigo-400 font-medium">Go to log in</RouterLink>
    </div>

    <form v-else @submit.prevent="submit" class="flex flex-col gap-4">
      <label class="field">
        <span>Business name</span>
        <input v-model="businessName" type="text" autocomplete="organization" required class="input h-11" @input="companyExists = false" />
      </label>
      <label class="field">
        <span>Your name</span>
        <input v-model="contactName" type="text" autocomplete="name" class="input h-11" />
      </label>
      <label class="field">
        <span>Email</span>
        <input v-model="email" type="email" autocomplete="email" required class="input h-11" />
      </label>
      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="new-password" minlength="8" required class="input h-11" />
        <small class="text-xs text-slate-400">At least 8 characters</small>
      </label>
      <p v-if="companyExists" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300" role="alert">{{ error }}</p>
      <p v-else-if="error" class="text-[13px] text-red-600 dark:text-red-400" role="alert">{{ error }}</p>
      <button type="submit" :disabled="busy" class="btn-primary h-[46px] font-bold">{{ busy ? 'Sending…' : companyExists ? 'Continue anyway' : 'Request access' }}</button>
    </form>
    <template #footer>
      <span>Already have an account?</span>
      <RouterLink to="/login" class="font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 whitespace-nowrap">Log in →</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
@import '../components/account/forms.css';
</style>
