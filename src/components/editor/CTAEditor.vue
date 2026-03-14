<script setup lang="ts">
import { useSignatureStore } from '../../stores/signature'
const store = useSignatureStore()
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="field">
      <label>Button Text</label>
      <input v-model="store.data.cta.text" type="text" placeholder="Book a Meeting" class="input" />
    </div>
    <div class="field">
      <label>Button URL</label>
      <input v-model="store.data.cta.url" type="url" placeholder="https://calendly.com/..." class="input" />
    </div>
    <div class="flex gap-2">
      <div class="field flex-1">
        <label>Background</label>
        <div class="flex gap-1.5 items-center">
          <input type="color" v-model="store.data.cta.bgColor" class="color-swatch" />
          <input v-model="store.data.cta.bgColor" type="text" placeholder="#6366f1" class="input flex-1" />
        </div>
      </div>
      <div class="field flex-1">
        <label>Text Color</label>
        <div class="flex gap-1.5 items-center">
          <input type="color" v-model="store.data.cta.textColor" class="color-swatch" />
          <input v-model="store.data.cta.textColor" type="text" placeholder="#ffffff" class="input flex-1" />
        </div>
      </div>
    </div>
    <!-- Live preview -->
    <div class="pt-1">
      <a
        :style="{ background: store.data.cta.bgColor, color: store.data.cta.textColor }"
        class="inline-block px-4 py-1.5 rounded text-xs font-semibold pointer-events-none"
      >{{ store.data.cta.text || 'Button Preview' }}</a>
    </div>
  </div>
</template>

<style scoped>
.field { @apply flex flex-col gap-1; }
.field label { @apply text-xs font-medium text-gray-500 dark:text-slate-400; }
.input {
  @apply w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800
    placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600;
}
.color-swatch {
  @apply w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0
    dark:border-slate-600;
}
</style>
