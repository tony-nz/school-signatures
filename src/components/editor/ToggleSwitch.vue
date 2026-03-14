<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; label?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="props.modelValue"
    @click="emit('update:modelValue', !props.modelValue)"
    class="relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus:outline-none"
    :class="props.modelValue ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-slate-600'"
  >
    <span
      class="pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-150"
      :class="props.modelValue ? 'translate-x-3' : 'translate-x-0'"
    />
  </button>
</template>
