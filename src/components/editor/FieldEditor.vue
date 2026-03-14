<script setup lang="ts">
import { ref } from 'vue'
import { useSignatureStore } from '../../stores/signature'
import AvatarUpload from './AvatarUpload.vue'
import ColorCustomizer from './ColorCustomizer.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import StyleOptions from './StyleOptions.vue'
import CTAEditor from './CTAEditor.vue'

const store = useSignatureStore()

const open = ref({
  personal: true,
  company: true,
  contact: true,
  socials: false,
  extras: false,
  cta: false,
  fieldColors: false,
  style: false,
})

function toggle(key: keyof typeof open.value) {
  open.value[key] = !open.value[key]
}
</script>

<template>
  <div class="flex flex-col text-sm h-full">
  <div class="flex-1 overflow-y-auto flex flex-col">

    <!-- ── Personal ──────────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <button @click="toggle('personal')" class="section-header" :class="{ 'text-indigo-600': open.personal }">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <span>Personal</span>
        </div>
        <svg class="chevron" :class="open.personal ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div v-show="open.personal" class="section-body">

        <div class="flex items-center justify-between">
          <span class="label">Photo</span>
          <ToggleSwitch v-model="store.data.visibility.avatar" />
        </div>
        <div v-if="store.data.visibility.avatar" class="mt-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
          <AvatarUpload field="avatar" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="field">
            <label>Full Name</label>
            <input v-model="store.data.name" type="text" placeholder="Jane Smith" class="input" />
          </div>
          <div class="field">
            <label>Job Title</label>
            <input v-model="store.data.title" type="text" placeholder="Marketing Manager" class="input" />
          </div>
          <div class="col-span-2 field">
            <label>Tagline</label>
            <input v-model="store.data.tagline" type="text" placeholder="Building great products" class="input" />
          </div>
        </div>

      </div>
    </section>

    <!-- ── Company ──────────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <button @click="toggle('company')" class="section-header" :class="{ 'text-indigo-600': open.company }">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <span>Company</span>
        </div>
        <svg class="chevron" :class="open.company ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div v-show="open.company" class="section-body">

        <div class="flex items-center justify-between">
          <span class="label">Logo</span>
          <ToggleSwitch v-model="store.data.visibility.logo" />
        </div>
        <div v-if="store.data.visibility.logo" class="mt-1 mb-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
          <AvatarUpload field="logo" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="field">
            <label>Company Name</label>
            <input v-model="store.data.company" type="text" placeholder="Acme Corp" class="input" />
          </div>
          <div class="field">
            <label>Address</label>
            <input v-model="store.data.address" type="text" placeholder="123 Main St" class="input" />
          </div>
        </div>

      </div>
    </section>

    <!-- ── Contact ──────────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <button @click="toggle('contact')" class="section-header" :class="{ 'text-indigo-600': open.contact }">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          <span>Contact</span>
        </div>
        <svg class="chevron" :class="open.contact ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div v-show="open.contact" class="section-body">
        <div class="field">
          <label>Email</label>
          <input v-model="store.data.email" type="email" placeholder="jane@acme.com" class="input" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="field">
            <label>Phone</label>
            <input v-model="store.data.phone" type="tel" placeholder="+1 555 000 0000" class="input" />
          </div>
          <div class="field">
            <label>Mobile</label>
            <input v-model="store.data.mobile" type="tel" placeholder="+1 555 000 0001" class="input" />
          </div>
        </div>
        <div class="field">
          <label>Website</label>
          <input v-model="store.data.website" type="text" placeholder="acmecorp.com" class="input" />
        </div>
      </div>
    </section>

    <!-- ── Social Links ─────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <div @click="toggle('socials')" class="section-header" :class="{ 'text-indigo-600': open.socials }" role="button" tabindex="0">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span>Social Links</span>
        </div>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="store.data.visibility.socials" @click.stop />
          <svg class="chevron" :class="open.socials ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
      <div v-show="open.socials" class="section-body">
        <div class="grid grid-cols-2 gap-2">
          <div v-for="key in (['linkedin','twitter','github','instagram','youtube','tiktok'] as const)" :key="key" class="field">
            <label class="capitalize">{{ key }}</label>
            <input v-model="store.data.socials[key]" type="url" :placeholder="`${key}.com/…`" class="input" />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Extras ───────────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <button @click="toggle('extras')" class="section-header" :class="{ 'text-indigo-600': open.extras }">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
          <span>Extras</span>
        </div>
        <svg class="chevron" :class="open.extras ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div v-show="open.extras" class="section-body">

        <div class="feature-row">
          <div class="flex items-center justify-between mb-2">
            <span class="label">Meeting / Booking Link</span>
            <ToggleSwitch v-model="store.data.visibility.meetingUrl" />
          </div>
          <div v-if="store.data.visibility.meetingUrl" class="flex flex-col gap-1.5">
            <input v-model="store.data.meetingUrl" type="url" placeholder="https://calendly.com/…" class="input" />
            <input v-model="store.data.meetingLabel" type="text" placeholder="Book a meeting" class="input" />
          </div>
        </div>

        <div class="feature-row">
          <div class="flex items-center justify-between mb-2">
            <span class="label">Disclaimer / Legal</span>
            <ToggleSwitch v-model="store.data.visibility.disclaimer" />
          </div>
          <textarea v-if="store.data.visibility.disclaimer"
            v-model="store.data.disclaimer" rows="3"
            placeholder="This email and any attachments are confidential…"
            class="input resize-none" />
        </div>

      </div>
    </section>

    <!-- ── CTA Button ───────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <div @click="toggle('cta')" class="section-header" :class="{ 'text-indigo-600': open.cta }" role="button" tabindex="0">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
          </svg>
          <span>CTA Button</span>
        </div>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="store.data.visibility.cta" @click.stop />
          <svg class="chevron" :class="open.cta ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
      <div v-show="open.cta" class="section-body">
        <CTAEditor />
      </div>
    </section>

    <!-- ── Field Colors ─────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <button @click="toggle('fieldColors')" class="section-header" :class="{ 'text-indigo-600': open.fieldColors }">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
          <span>Field Colors</span>
        </div>
        <svg class="chevron" :class="open.fieldColors ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div v-show="open.fieldColors" class="section-body">
        <div class="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div class="field" v-for="({ key, label }) in [
            { key: 'name',  label: 'Name' },
            { key: 'title', label: 'Title / Meta' },
            { key: 'body',  label: 'Body Text' },
            { key: 'muted', label: 'Muted Text' },
          ]" :key="key">
            <label>{{ label }}</label>
            <div class="flex items-center gap-2">
              <input type="color" v-model="(store.data.fieldColors as any)[key]"
                class="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-700" />
              <span class="text-xs font-mono text-slate-400">{{ (store.data.fieldColors as any)[key] }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Style Options ────────────────────────────────────────── -->
    <section class="border-b border-slate-100 dark:border-slate-800">
      <button @click="toggle('style')" class="section-header" :class="{ 'text-indigo-600': open.style }">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
          <span>Style Options</span>
        </div>
        <svg class="chevron" :class="open.style ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div v-show="open.style" class="section-body">
        <StyleOptions />
      </div>
    </section>

  </div>

    <!-- ── Accent Color (sticky bottom) ─────────────────────────── -->
    <section class="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-900">
      <div class="flex items-center gap-2 mb-3">
        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
        </svg>
        <span class="text-sm font-semibold text-slate-600 dark:text-slate-300">Accent Color</span>
      </div>
      <ColorCustomizer />
    </section>

  </div>
</template>

<style scoped>
.section-header {
  @apply w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600
    cursor-pointer hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors text-left
    dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20;
}
.section-body {
  @apply flex flex-col gap-2.5 px-4 pb-4;
}
.chevron {
  @apply w-4 h-4 text-current transition-transform duration-150 flex-shrink-0;
}
.feature-row {
  @apply p-3 rounded-lg bg-slate-50 border border-slate-100 dark:border-slate-800
    dark:bg-slate-800/50;
}
.field {
  @apply flex flex-col gap-1;
}
.field label, .label {
  @apply text-xs font-medium text-slate-500 dark:text-slate-400;
}
.input {
  @apply w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800
    placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600;
}
</style>
