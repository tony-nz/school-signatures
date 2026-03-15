<script setup lang="ts">
import { ref } from 'vue'
import type { BulkRow } from '../../types'
import { parseCSV, rowsToCSV, createEmptyRow, BULK_FIELDS } from '../../composables/useCsvParser'
import { useBulkExport } from '../../composables/useBulkExport'

const rows = ref<BulkRow[]>([createEmptyRow()])
const csvInput = ref<HTMLInputElement | null>(null)
const feedback = ref<string | null>(null)
const { downloadHtmlZip, downloadMailZip } = useBulkExport()

function addRow() {
  rows.value.push(createEmptyRow())
}

function removeRow(id: string) {
  rows.value = rows.value.filter((r) => r.id !== id)
  if (rows.value.length === 0) rows.value.push(createEmptyRow())
}

function clearAll() {
  rows.value = [createEmptyRow()]
}

function onImportCSV(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target!.result as string
    const parsed = parseCSV(text)
    if (parsed.length > 0) {
      rows.value = parsed
      showFeedback(`Imported ${parsed.length} rows`)
    } else {
      showFeedback('No valid rows found in CSV')
    }
    if (csvInput.value) csvInput.value.value = ''
  }
  reader.readAsText(file)
}

function exportCSV() {
  const csv = rowsToCSV(rows.value)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'signatures.csv'
  a.click()
  URL.revokeObjectURL(url)
  showFeedback('CSV exported!')
}

const validRows = () => rows.value.filter((r) => r.name.trim() || r.email.trim())

async function handleHtmlExport() {
  const valid = validRows()
  if (valid.length === 0) return showFeedback('No rows with data to export')
  await downloadHtmlZip(valid)
  showFeedback(`Exported ${valid.length} HTML signatures!`)
}

async function handleMailExport() {
  const valid = validRows()
  if (valid.length === 0) return showFeedback('No rows with data to export')
  await downloadMailZip(valid)
  showFeedback(`Exported ${valid.length} Mac Mail signatures!`)
}

function showFeedback(msg: string) {
  feedback.value = msg
  setTimeout(() => (feedback.value = null), 2500)
}

const columnLabels: Record<string, string> = {
  name: 'Name',
  title: 'Title',
  email: 'Email',
  phone: 'Phone',
  mobile: 'Mobile',
  website: 'Website',
  address: 'Address',
  tagline: 'Tagline',
  avatar: 'Avatar URL',
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mr-auto">
        Bulk Mode
        <span class="text-slate-300 dark:text-slate-600 font-normal">&mdash; {{ rows.length }} row{{ rows.length !== 1 ? 's' : '' }}</span>
      </span>

      <transition name="fade">
        <span v-if="feedback" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          {{ feedback }}
        </span>
      </transition>

      <div class="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 divide-x divide-slate-200 dark:divide-slate-700">
        <button @click="csvInput?.click()" title="Import CSV" class="icon-btn hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
        </button>
        <button @click="exportCSV" title="Export CSV" class="icon-btn hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16l-5-5 1.41-1.41L11 13.17V4h2v9.17l2.59-2.58L17 11l-5 5zM5 20h14v-2H5v2z"/></svg>
        </button>
        <button @click="clearAll" title="Clear all rows" class="icon-btn hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>

      <input ref="csvInput" type="file" accept=".csv,text/csv" class="hidden" @change="onImportCSV" />
    </div>

    <!-- Table -->
    <div class="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <table class="w-full text-xs">
        <thead class="sticky top-0 z-10">
          <tr class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <th class="px-2 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-8">#</th>
            <th
              v-for="field in BULK_FIELDS"
              :key="field"
              class="px-2 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >
              {{ columnLabels[field] }}
            </th>
            <th class="px-2 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="row.id"
            class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <td class="px-2 py-1 text-slate-400 dark:text-slate-600 text-center">{{ idx + 1 }}</td>
            <td v-for="field in BULK_FIELDS" :key="field" class="px-1 py-1">
              <input
                v-model="(row as Record<string, string>)[field]"
                :placeholder="columnLabels[field]"
                class="w-full px-1.5 py-1 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 bg-transparent text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 outline-none transition text-xs"
              />
            </td>
            <td class="px-1 py-1">
              <button
                @click="removeRow(row.id)"
                title="Remove row"
                class="w-6 h-6 flex items-center justify-center rounded text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add row button -->
    <button
      @click="addRow"
      class="mt-2 w-full py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all"
    >
      + Add Row
    </button>

    <!-- Export actions -->
    <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Export All</span>
      <button
        @click="handleHtmlExport"
        class="export-btn hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16l-5-5 1.41-1.41L11 13.17V4h2v9.17l2.59-2.58L17 11l-5 5zM5 20h14v-2H5v2z"/></svg>
        HTML (.zip)
      </button>
      <button
        @click="handleMailExport"
        class="export-btn hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        Mac Mail (.zip)
      </button>
    </div>
  </div>
</template>

<style scoped>
.export-btn {
  @apply flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium
    text-slate-600 bg-white transition-all cursor-pointer
    dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800;
}

.icon-btn {
  @apply flex items-center justify-center w-7 h-7 text-slate-500 dark:text-slate-400 transition-all cursor-pointer;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
