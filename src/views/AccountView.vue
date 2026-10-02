<script setup lang="ts">
import { ref } from 'vue'
import PageShell from '../components/account/PageShell.vue'
import ToggleSwitch from '../components/editor/ToggleSwitch.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const businessName = ref(auth.user?.businessName ?? '')
const contactName = ref(auth.user?.contactName ?? '')
const logo = ref(auth.user?.logo ?? '')
const showBusinessName = ref(auth.user?.showBusinessName !== false)
const tagline = ref(auth.user?.tagline ?? '')
const error = ref('')
const message = ref('')
const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const MAX_LOGO_BYTES = 700 * 1024

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > MAX_LOGO_BYTES) {
    error.value = 'That image is too large — please use one under 700 KB.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => { logo.value = reader.result as string }
  reader.readAsDataURL(file)
}

async function save() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await auth.updateAccount({
      businessName: businessName.value,
      contactName: contactName.value,
      logo: logo.value,
      showBusinessName: showBusinessName.value,
      tagline: tagline.value,
    })
    message.value = 'Saved'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageShell title="Account & branding" subtitle="Your logo, business name and tagline appear in the app header while you're logged in." narrow>
    <form @submit.prevent="save" class="card flex flex-col gap-5">
      <div class="field">
        <span>Logo</span>
        <div class="flex items-center gap-3">
          <div class="w-28 h-14 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            <img v-if="logo" :src="logo" alt="Logo preview" class="max-w-full max-h-full object-contain" />
            <span v-else class="text-xs text-slate-300">No logo</span>
          </div>
          <button type="button" @click="fileInput?.click()" class="btn-secondary">Upload</button>
          <button v-if="logo" type="button" @click="logo = ''" class="btn-secondary text-red-500">Remove</button>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
        </div>
        <small class="text-xs text-slate-400">PNG, JPG or SVG, under 700 KB. A wide logo with a transparent background works best.</small>
      </div>
      <label class="field">
        <span>Business name</span>
        <input v-model="businessName" type="text" required class="input" />
      </label>
      <div class="flex items-start gap-3 -mt-2">
        <ToggleSwitch :model-value="showBusinessName || !logo" @update:model-value="showBusinessName = $event" :class="{ 'opacity-50 pointer-events-none': !logo }" class="mt-0.5" />
        <div class="text-xs text-slate-500 dark:text-slate-400">
          <div class="font-medium text-slate-600 dark:text-slate-300">Show business name in header</div>
          <div v-if="logo">Turn off if your logo already includes your name.</div>
          <div v-else>Upload a logo to hide the name.</div>
        </div>
      </div>
      <label class="field">
        <span>Tagline <span class="font-normal text-slate-400">(optional)</span></span>
        <input v-model="tagline" type="text" maxlength="60" placeholder="e.g. Full service IT for schools" class="input" />
        <small class="text-xs text-slate-400">Shown under your name, or in its place when the name is hidden.</small>
      </label>
      <label class="field">
        <span>Your name</span>
        <input v-model="contactName" type="text" class="input" />
      </label>
      <div class="field">
        <span>Email</span>
        <div class="text-sm text-slate-600 dark:text-slate-300">{{ auth.user?.email }}</div>
      </div>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <p v-else-if="message" class="text-sm text-emerald-600">{{ message }}</p>
      <button type="submit" :disabled="busy" class="btn-primary self-start">{{ busy ? 'Saving…' : 'Save' }}</button>
    </form>
  </PageShell>
</template>

<style scoped>
@import '../components/account/forms.css';
</style>
