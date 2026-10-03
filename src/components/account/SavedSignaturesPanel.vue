<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useSavedSignaturesStore } from '../../stores/savedSignatures'
import { useSignatureStore, mergeWithDefaults } from '../../stores/signature'
import { templates } from '../../templates'
import CustomerSelect from './CustomerSelect.vue'
import type { SavedSignature } from '../../lib/api'

const emit = defineEmits<{ (e: 'opened'): void }>()
const saved = useSavedSignaturesStore()
const editor = useSignatureStore()

const busy = ref(false)
const error = ref('')
const message = ref('')
const newName = ref(editor.data.name || '')
const currentSig = () => saved.list.find((s) => s.id === saved.current?.id)
// New signatures default to the customer of the one being edited
const newCustomerId = ref<string | null>(currentSig()?.customerId ?? null)
const search = ref('')

async function run(action: () => Promise<void>, success?: string) {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await action()
    if (success) message.value = success
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

const showError = (msg: string) => { error.value = msg; message.value = '' }

// The list is normally preloaded by the editor; only fetch here if that hasn't finished
if (!saved.loaded) run(() => saved.refresh())

// ─── Grouping by customer ───

const NONE = 'none'
interface Group { key: string; customerId: string | null; name: string; signatures: SavedSignature[] }

const groups = computed<Group[]>(() => {
  const q = search.value.trim().toLowerCase()
  const matches = (s: SavedSignature) => !q
    || s.name.toLowerCase().includes(q)
    || String(s.data?.email ?? '').toLowerCase().includes(q)
    || saved.customerName(s.customerId).toLowerCase().includes(q)
  const byName = (a: SavedSignature, b: SavedSignature) => a.name.localeCompare(b.name)

  const result: Group[] = saved.customers.map((c) => ({
    key: c.id, customerId: c.id, name: c.name,
    signatures: saved.list.filter((s) => s.customerId === c.id && matches(s)).sort(byName),
  }))
  result.push({
    key: NONE, customerId: null, name: 'No customer',
    signatures: saved.list.filter((s) => !s.customerId && matches(s)).sort(byName),
  })
  // Hide empty groups while searching; always hide an empty "No customer"
  return result.filter((g) => g.signatures.length || (!q && g.key !== NONE))
})

// Groups start collapsed (long lists), except the one holding the open signature
const expanded = ref(new Set<string>([currentSig()?.customerId ?? NONE]))
const isOpen = (g: Group) => !!search.value.trim() || expanded.value.has(g.key)
function toggleGroup(g: Group) {
  const next = new Set(expanded.value)
  if (next.has(g.key)) next.delete(g.key)
  else next.add(g.key)
  expanded.value = next
}

// ─── Actions ───

const saveNew = () => run(async () => {
  await saved.saveNew(newName.value.trim() || 'Untitled signature', newCustomerId.value)
  expanded.value = new Set([...expanded.value, newCustomerId.value ?? NONE])
  newName.value = ''
}, 'Saved')

const saveCurrent = () => run(() => saved.saveCurrent(), 'Changes saved')

const open = (id: string) => run(async () => {
  if (id !== saved.current?.id && !saved.confirmDiscard()) return
  await saved.open(id)
  emit('opened')
})

const remove = (sig: SavedSignature) => {
  if (!confirm(`Delete "${sig.name}"? This can't be undone.`)) return
  run(() => saved.remove(sig.id), 'Deleted')
}

const rename = (sig: SavedSignature) => {
  const next = prompt('Rename signature', sig.name)?.trim()
  if (next && next !== sig.name) run(() => saved.rename(sig.id, next))
}

const move = (sig: SavedSignature, customerId: string | null) => {
  if (customerId === sig.customerId) return
  run(() => saved.move(sig.id, customerId), `Moved to ${saved.customerName(customerId)}`)
}

const renameCustomer = (g: Group) => {
  const next = prompt('Rename customer', g.name)?.trim()
  if (next && next !== g.name && g.customerId) run(() => saved.renameCustomer(g.customerId!, next))
}

const deleteCustomer = (g: Group) => {
  if (!g.customerId) return
  const count = saved.list.filter((s) => s.customerId === g.customerId).length
  const note = count ? ` Its ${count} signature${count === 1 ? '' : 's'} will move to "No customer".` : ''
  if (!confirm(`Delete customer "${g.name}"?${note}`)) return
  run(() => saved.deleteCustomer(g.customerId!), 'Customer deleted')
}

// ─── Hover preview ───

interface HoverState {
  sig: SavedSignature
  measured: boolean   // false during the hidden first render used to measure the signature
  top: number
  left: number
  width: number       // scaled signature size
  height: number
  windowWidth: number
  scale: number
}

const MARGIN = 12      // gap from the viewport edges and the hovered row
const BODY_PAD = 20    // padding around the signature inside the window
const MIN_SCALE = 0.45

const hover = ref<HoverState | null>(null)
const popEl = ref<HTMLElement | null>(null)
const sigEl = ref<HTMLElement | null>(null)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

// Rendered HTML, cached per signature version so re-hovering is instant
const htmlCache = new Map<string, string>()
function renderSignature(sig: SavedSignature): string {
  const key = `${sig.id}:${sig.updatedAt}`
  let html = htmlCache.get(key)
  if (html === undefined) {
    const merged = mergeWithDefaults(sig.data, sig.templateId)
    const template = templates.find((t) => t.id === merged.templateId) ?? templates[0]
    html = template.render(merged.data)
    htmlCache.set(key, html)
  }
  return html
}

function showPreview(sig: SavedSignature, e: MouseEvent) {
  const row = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(async () => {
    // 1. Render hidden at natural size so the signature can be measured
    hover.value = { sig, measured: false, top: 0, left: 0, width: 0, height: 0, windowWidth: 0, scale: 1 }
    await nextTick()
    if (!hover.value || hover.value.sig.id !== sig.id || !sigEl.value || !popEl.value) return
    const naturalW = sigEl.value.offsetWidth
    const naturalH = sigEl.value.offsetHeight
    const chromeH = popEl.value.offsetHeight - naturalH - BODY_PAD * 2

    // 2. Open on whichever side of the row has more room, scaling down only if it won't fit
    const spaceBelow = window.innerHeight - row.bottom - MARGIN * 2
    const spaceAbove = row.top - MARGIN * 2
    const below = spaceBelow >= spaceAbove
    const maxH = (below ? spaceBelow : spaceAbove) - chromeH - BODY_PAD * 2
    const maxW = Math.min(760, window.innerWidth - MARGIN * 2) - BODY_PAD * 2
    const scale = Math.max(MIN_SCALE, Math.min(1, maxH / naturalH, maxW / naturalW))

    const width = Math.ceil(naturalW * scale)
    const height = Math.ceil(naturalH * scale)
    const windowW = Math.max(320, width + BODY_PAD * 2)
    const windowH = chromeH + height + BODY_PAD * 2
    const left = Math.min(Math.max(MARGIN, row.left), window.innerWidth - windowW - MARGIN)
    const top = below ? row.bottom + MARGIN : Math.max(MARGIN, row.top - MARGIN - windowH)
    hover.value = { sig, measured: true, top, left, width, height, windowWidth: windowW, scale }
  }, 250)
}

function hidePreview() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = null
  hover.value = null
}

onBeforeUnmount(hidePreview)

const fmt = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto" @scroll.passive="hidePreview">
    <div>
      <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">My Signatures</h2>
      <p class="text-xs text-slate-400">Saved to your account and grouped by customer, so you can come back and edit them on any device.</p>
    </div>

    <!-- Save the editor's current state -->
    <div class="card flex flex-col gap-3">
      <div v-if="saved.current" class="flex items-center justify-between gap-3">
        <div class="text-sm text-slate-600 dark:text-slate-300 min-w-0 truncate">
          Editing <span class="font-semibold">{{ saved.current.name }}</span>
          <span class="text-slate-400"> · {{ saved.customerName(currentSig()?.customerId ?? null) }}</span>
        </div>
        <button @click="saveCurrent" :disabled="busy" class="btn-primary">Save changes</button>
      </div>
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <input v-model="newName" type="text" placeholder="Signature name, e.g. Jane – Sales" class="input basis-full sm:basis-auto flex-1 min-w-0" @keydown.enter="saveNew" />
        <CustomerSelect v-model="newCustomerId" @error="showError" />
        <button @click="saveNew" :disabled="busy" class="btn-secondary whitespace-nowrap">{{ saved.current ? 'Save as new' : 'Save signature' }}</button>
      </div>
      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
      <p v-else-if="message" class="text-xs text-emerald-600">{{ message }}</p>
    </div>

    <!-- Search -->
    <input v-if="saved.list.length" v-model="search" type="search" placeholder="Search signatures, emails or customers…" class="input" />

    <!-- Saved list, grouped by customer -->
    <div v-if="!saved.loaded" class="card text-sm text-slate-400">Loading…</div>
    <div v-else-if="!groups.length" class="card text-sm text-slate-400">
      {{ search ? 'No signatures match your search.' : 'No saved signatures yet.' }}
    </div>
    <div v-for="g in groups" :key="g.key" class="card-list">
      <div class="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none" @click="toggleGroup(g)">
        <svg class="w-3.5 h-3.5 text-slate-400 transition-transform" :class="isOpen(g) ? 'rotate-90' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" :class="{ 'italic font-medium text-slate-500': !g.customerId }">{{ g.name }}</span>
        <span class="text-xs text-slate-400">{{ g.signatures.length }}</span>
        <template v-if="g.customerId">
          <button @click.stop="renameCustomer(g)" :disabled="busy" class="btn-ghost ml-auto">Rename</button>
          <button @click.stop="deleteCustomer(g)" :disabled="busy" class="btn-ghost text-red-400 hover:text-red-600">Delete</button>
        </template>
      </div>
      <template v-if="isOpen(g)">
        <div v-if="!g.signatures.length" class="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">No signatures yet.</div>
        <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
          <li v-for="sig in g.signatures" :key="sig.id" class="flex items-center gap-3 px-4 py-2.5"
            :class="{ 'bg-indigo-50/60 dark:bg-indigo-900/20': saved.current?.id === sig.id }">
            <div class="flex-1 min-w-0 cursor-default" @mouseenter="showPreview(sig, $event)" @mouseleave="hidePreview">
              <div class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ sig.name }}</div>
              <div class="text-xs text-slate-400 truncate">
                {{ sig.data?.email ? `${sig.data.email} · ` : '' }}{{ sig.templateId }} · updated {{ fmt(sig.updatedAt) }}
              </div>
            </div>
            <button @click="open(sig.id)" :disabled="busy" class="btn-secondary">Open</button>
            <CustomerSelect :model-value="sig.customerId" size="sm" title="Move to customer" @update:model-value="move(sig, $event)" @error="showError" />
            <button @click="rename(sig)" :disabled="busy" class="btn-ghost">Rename</button>
            <button @click="remove(sig)" :disabled="busy" class="btn-ghost text-red-400 hover:text-red-600">Delete</button>
          </li>
        </ul>
      </template>
    </div>

    <!-- Hover preview (teleported so it isn't clipped by the scrolling panel) -->
    <Teleport to="body">
      <div v-if="hover" ref="popEl" class="preview-window"
        :style="hover.measured
          ? { top: `${hover.top}px`, left: `${hover.left}px`, width: `${hover.windowWidth}px` }
          : { top: '0px', left: '0px', visibility: 'hidden' }">
        <!-- Mac-style window chrome, matching the main preview -->
        <div class="border-b border-slate-100 px-4 py-2.5 bg-slate-50">
          <div class="flex items-center gap-1.5 mb-2">
            <div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          </div>
          <div class="text-[11px] text-slate-400 space-y-0.5 truncate">
            <div class="truncate"><span class="font-medium text-slate-500">From:</span> {{ hover.sig.data?.name || hover.sig.name }}{{ hover.sig.data?.email ? ` <${hover.sig.data.email}>` : '' }}</div>
            <div><span class="font-medium text-slate-500">Template:</span> <span class="capitalize">{{ hover.sig.templateId }}</span>
              <span v-if="hover.scale < 1" class="text-slate-300"> · shown at {{ Math.round(hover.scale * 100) }}%</span></div>
          </div>
        </div>
        <!-- Always on white: signatures are designed for a white email body -->
        <div :style="{ padding: `${BODY_PAD}px` }">
          <div :style="hover.measured ? { width: `${hover.width}px`, height: `${hover.height}px`, overflow: 'hidden' } : {}">
            <div ref="sigEl" class="inline-block align-top"
              :style="hover.measured && hover.scale < 1 ? { transform: `scale(${hover.scale})`, transformOrigin: 'top left' } : {}"
              v-html="renderSignature(hover.sig)" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.preview-window {
  @apply fixed z-50 pointer-events-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl
    dark:border-slate-600;
}
.card {
  @apply rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4;
}
.card-list {
  @apply flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden;
}
.input {
  @apply rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800
    placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600;
}
.btn-primary {
  @apply text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition;
}
.btn-secondary {
  @apply text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition
    dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700;
}
.btn-ghost {
  @apply text-xs font-medium px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-50 transition dark:hover:text-slate-300;
}
</style>
