<script setup lang="ts">
import { useSignatureStore } from '../../stores/signature'
import type { FontFamily, FontSize, DividerStyle, SocialStyle, ContactColor, ContactLabels } from '../../types'

const store = useSignatureStore()

const fonts: FontFamily[] = ['Arial', 'Georgia', 'Trebuchet MS', 'Verdana', 'Raleway', 'Lato', 'Nunito', 'Poppins', 'Merriweather', 'Playfair Display']
const fontSizes: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'custom', label: 'Custom' },
]
const dividers: { value: DividerStyle; label: string }[] = [
  { value: 'line', label: '—' },
  { value: 'dots', label: '···' },
  { value: 'none', label: 'Off' },
]
const socialStyles: { value: SocialStyle; label: string }[] = [
  { value: 'icons', label: 'Icons' },
  { value: 'text', label: 'Text' },
  { value: 'both', label: 'Both' },
]
// Auto keeps each template's own look
const contactColors: { value: ContactColor; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'accent', label: 'Accent' },
  { value: 'text', label: 'Text' },
]
const contactLabels: { value: ContactLabels; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'none', label: 'None' },
  { value: 'letters', label: 'E:' },
  { value: 'words', label: 'Email:' },
]
</script>

<template>
  <div class="flex flex-col gap-3">

    <!-- Font family -->
    <div class="field">
      <label>Font</label>
      <select v-model="store.data.style.fontFamily" class="select" :style="{ fontFamily: store.data.style.fontFamily }">
        <option v-for="f in fonts" :key="f" :value="f" :style="{ fontFamily: f }">{{ f }}</option>
      </select>
    </div>

    <!-- Font size -->
    <div class="field">
      <label>Text Size</label>
      <div class="btn-group">
        <button v-for="s in fontSizes" :key="s.value" @click="store.data.style.fontSize = s.value"
          :class="store.data.style.fontSize === s.value ? 'active' : ''" class="seg-btn">{{ s.label }}</button>
      </div>
      <div v-if="store.data.style.fontSize === 'custom'" class="custom-row">
        <input
          type="number"
          v-model.number="store.data.style.fontSizeCustomPx"
          min="10" max="28"
          class="custom-num"
        />
        <span class="unit">px base size</span>
      </div>
    </div>

    <!-- Divider style -->
    <div class="field">
      <label>Divider</label>
      <div class="btn-group">
        <button v-for="d in dividers" :key="d.value" @click="store.data.style.dividerStyle = d.value"
          :class="store.data.style.dividerStyle === d.value ? 'active' : ''" class="seg-btn">{{ d.label }}</button>
      </div>
    </div>

    <!-- Contact details: link colour and labels for email, phone, mobile and website -->
    <div class="field">
      <label>Contact Colour</label>
      <div class="btn-group">
        <button v-for="c in contactColors" :key="c.value" @click="store.data.style.contactColor = c.value"
          :class="store.data.style.contactColor === c.value ? 'active' : ''" class="seg-btn">{{ c.label }}</button>
      </div>
    </div>
    <div class="field">
      <label>Contact Labels</label>
      <div class="btn-group">
        <button v-for="c in contactLabels" :key="c.value" @click="store.data.style.contactLabels = c.value"
          :class="store.data.style.contactLabels === c.value ? 'active' : ''" class="seg-btn">{{ c.label }}</button>
      </div>
    </div>

    <!-- Social style -->
    <div class="field">
      <label>Social Links</label>
      <div class="btn-group">
        <button v-for="s in socialStyles" :key="s.value" @click="store.data.style.socialStyle = s.value"
          :class="store.data.style.socialStyle === s.value ? 'active' : ''" class="seg-btn">{{ s.label }}</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1.5; }
.field label { @apply text-xs font-medium text-slate-500 dark:text-slate-400; }
.select {
  @apply w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800
    focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100;
}
.btn-group {
  @apply inline-flex self-start rounded-lg border border-slate-200 overflow-hidden
    dark:border-slate-700;
}
.seg-btn {
  @apply px-3 py-1.5 text-xs font-medium text-slate-500 bg-white hover:bg-slate-50 transition cursor-pointer
    border-r border-slate-200 last:border-r-0
    dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700;
}
.seg-btn.active {
  @apply bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white;
}
.custom-row {
  @apply flex items-center gap-2 mt-0.5;
}
.custom-num {
  @apply w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800
    focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition
    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100;
}
.unit {
  @apply text-xs text-slate-400;
}
</style>
