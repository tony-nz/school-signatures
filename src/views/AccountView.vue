<script setup lang="ts">
import { computed, ref } from 'vue'
import PageShell from '../components/account/PageShell.vue'
import ToggleSwitch from '../components/editor/ToggleSwitch.vue'
import TeamPanel from '../components/account/TeamPanel.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
// Company branding is shared by the whole team, so only its owner (or a site admin) edits it
const canEditBranding = computed(() => auth.user?.companyRole === 'owner' || auth.isAdmin)

const businessName = ref(auth.user?.businessName ?? '')
const contactName = ref(auth.user?.contactName ?? '')
const logo = ref(auth.user?.logo ?? '')
const showBusinessName = ref(auth.user?.showBusinessName !== false)
const tagline = ref(auth.user?.tagline ?? '')
const error = ref('')
const message = ref('')
const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordMessage = ref('')
const passwordBusy = ref(false)

async function changePassword() {
  passwordError.value = ''
  passwordMessage.value = ''
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = "New passwords don't match"
    return
  }
  passwordBusy.value = true
  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = newPassword.value = confirmPassword.value = ''
    passwordMessage.value = 'Password changed. Any other devices have been signed out.'
  } catch (e) {
    passwordError.value = (e as Error).message
  } finally {
    passwordBusy.value = false
  }
}

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

// Branding and personal details save separately: branding belongs to the company, details to you
async function saveBranding() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await auth.updateAccount({
      businessName: businessName.value,
      logo: logo.value,
      showBusinessName: showBusinessName.value,
      tagline: tagline.value,
    })
    message.value = 'Branding saved'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

const profileMessage = ref('')
const profileError = ref('')
const profileBusy = ref(false)

async function saveProfile() {
  profileBusy.value = true
  profileError.value = ''
  profileMessage.value = ''
  try {
    await auth.updateAccount({ contactName: contactName.value })
    profileMessage.value = 'Saved'
  } catch (e) {
    profileError.value = (e as Error).message
  } finally {
    profileBusy.value = false
  }
}
</script>

<template>
  <PageShell title="Account" subtitle="Your company's branding and team, and your own login details." wide>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
      <div class="flex flex-col gap-6 min-w-0">
        <form @submit.prevent="saveBranding" class="card flex flex-col gap-4">
          <div>
            <h2 class="card-title">Company branding</h2>
            <p class="card-hint">{{ canEditBranding ? 'Shown in the app header for everyone on your team.' : "Only your company's owner can change the branding." }}</p>
          </div>
          <fieldset :disabled="!canEditBranding" class="flex flex-col gap-4 min-w-0" :class="{ 'opacity-60': !canEditBranding }">
            <div class="flex items-center gap-3">
              <div class="w-28 h-14 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                <img v-if="logo" :src="logo" alt="Logo preview" class="max-w-full max-h-full object-contain" />
                <span v-else class="text-xs text-slate-300">No logo</span>
              </div>
              <div class="flex flex-col gap-1.5 min-w-0">
                <div class="flex gap-2">
                  <button type="button" @click="fileInput?.click()" class="btn-secondary">Upload</button>
                  <button v-if="logo" type="button" @click="logo = ''" class="btn-secondary text-red-500">Remove</button>
                </div>
                <small class="text-xs text-slate-400">PNG, JPG or SVG under 700 KB, ideally wide and transparent.</small>
              </div>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="field">
                <span>Business name</span>
                <input v-model="businessName" type="text" required class="input" />
              </label>
              <label class="field">
                <span>Tagline <span class="font-normal text-slate-400">(optional)</span></span>
                <input v-model="tagline" type="text" maxlength="60" placeholder="e.g. Full service IT for schools" class="input" />
              </label>
            </div>
            <div class="flex items-start gap-3">
              <ToggleSwitch :model-value="showBusinessName || !logo" @update:model-value="showBusinessName = $event" :class="{ 'opacity-50 pointer-events-none': !logo }" class="mt-0.5" />
              <div class="text-xs text-slate-500 dark:text-slate-400">
                <div class="font-medium text-slate-600 dark:text-slate-300">Show business name in header</div>
                <div>{{ logo ? 'Turn off if your logo already includes your name. The tagline still shows.' : 'Upload a logo to hide the name.' }}</div>
              </div>
            </div>
          </fieldset>
          <div v-if="canEditBranding" class="flex items-center gap-3">
            <button type="submit" :disabled="busy" class="btn-primary">{{ busy ? 'Saving…' : 'Save branding' }}</button>
            <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
            <p v-else-if="message" class="text-sm text-emerald-600">{{ message }}</p>
          </div>
        </form>

        <TeamPanel />
      </div>

      <div class="flex flex-col gap-6 min-w-0">
        <form @submit.prevent="saveProfile" class="card flex flex-col gap-4">
          <h2 class="card-title">Your details</h2>
          <label class="field">
            <span>Your name</span>
            <input v-model="contactName" type="text" class="input" />
          </label>
          <div class="field">
            <span>Email</span>
            <div class="text-sm text-slate-600 dark:text-slate-300 truncate">{{ auth.user?.email }}</div>
          </div>
          <div class="flex items-center gap-3">
            <button type="submit" :disabled="profileBusy" class="btn-primary">{{ profileBusy ? 'Saving…' : 'Save' }}</button>
            <p v-if="profileError" class="text-sm text-red-500">{{ profileError }}</p>
            <p v-else-if="profileMessage" class="text-sm text-emerald-600">{{ profileMessage }}</p>
          </div>
        </form>

        <form @submit.prevent="changePassword" class="card flex flex-col gap-4">
          <h2 class="card-title">Change password</h2>
          <label class="field">
            <span>Current password</span>
            <input v-model="currentPassword" type="password" autocomplete="current-password" required class="input" />
          </label>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label class="field">
              <span>New password</span>
              <input v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required class="input" />
            </label>
            <label class="field">
              <span>Confirm</span>
              <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required class="input" />
            </label>
          </div>
          <p v-if="passwordError" class="text-sm text-red-500">{{ passwordError }}</p>
          <p v-else-if="passwordMessage" class="text-sm text-emerald-600">{{ passwordMessage }}</p>
          <button type="submit" :disabled="passwordBusy" class="btn-primary self-start">{{ passwordBusy ? 'Saving…' : 'Change password' }}</button>
        </form>
      </div>
    </div>
  </PageShell>
</template>

<style scoped>
@import '../components/account/forms.css';
.card-title {
  @apply text-sm font-semibold text-slate-800 dark:text-slate-100;
}
.card-hint {
  @apply text-xs text-slate-400 mt-0.5;
}
</style>
