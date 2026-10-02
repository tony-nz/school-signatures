<script setup lang="ts">
import { useSavedSignaturesStore } from '../../stores/savedSignatures'

// Customer picker with a "+ New customer…" option. Value is a customer id, or null for none.
const props = defineProps<{ modelValue: string | null; size?: 'sm' | 'md' }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void; (e: 'error', message: string): void }>()
const saved = useSavedSignaturesStore()

const NEW = '__new__'

async function onChange(e: Event) {
  const select = e.target as HTMLSelectElement
  if (select.value !== NEW) {
    emit('update:modelValue', select.value || null)
    return
  }
  // Snap back to the current value while the new customer is created
  select.value = props.modelValue ?? ''
  const name = prompt('New customer name')?.trim()
  if (!name) return
  try {
    const customer = await saved.createCustomer(name)
    emit('update:modelValue', customer.id)
  } catch (err) {
    emit('error', (err as Error).message)
  }
}
</script>

<template>
  <select @change="onChange" class="customer-select" :class="size === 'sm' ? 'text-xs px-2 py-1.5' : 'text-sm px-2.5 py-1.5'">
    <option value="" :selected="!modelValue">No customer</option>
    <option v-for="c in saved.customers" :key="c.id" :value="c.id" :selected="c.id === modelValue">{{ c.name }}</option>
    <option :value="NEW">+ New customer…</option>
  </select>
</template>

<style scoped>
.customer-select {
  @apply max-w-[220px] rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200;
}
</style>
