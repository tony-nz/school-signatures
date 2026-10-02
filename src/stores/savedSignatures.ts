import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { api, type Customer, type SavedSignature } from '../lib/api'
import { useSignatureStore, mergeWithDefaults } from './signature'
import { useAuthStore } from './auth'
import type { SignatureData } from '../types'

// JSON with sorted keys, so comparisons ignore key order (Postgres jsonb doesn't preserve it)
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().filter((k) => obj[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// Signatures saved to the retailer's account. The full list (including data) is
// fetched once per login and kept here, so switching between them is instant.
export const useSavedSignaturesStore = defineStore('savedSignatures', () => {
  const list = ref<SavedSignature[]>([])
  // Customers group signatures (e.g. one per client business), sorted by name
  const customers = ref<Customer[]>([])
  // The saved signature currently open in the editor, if any
  const current = ref<{ id: string; name: string } | null>(null)
  // True once the list has been fetched for this login
  const loaded = ref(false)
  // Message for the loading overlay while a request is in flight
  const busy = ref<string | null>(null)

  async function withBusy<T>(message: string, fn: () => Promise<T>): Promise<T> {
    busy.value = message
    try {
      return await fn()
    } finally {
      busy.value = null
    }
  }

  // True when the editor differs from the saved version of the open signature
  const savedSnapshot = computed(() => {
    const sig = current.value && list.value.find((s) => s.id === current.value!.id)
    if (!sig) return null
    const merged = mergeWithDefaults(sig.data, sig.templateId)
    return stableStringify({ data: merged.data, templateId: merged.templateId })
  })
  const isDirty = computed(() => {
    if (!savedSnapshot.value) return false
    const editor = useSignatureStore()
    return stableStringify({ data: editor.data, templateId: editor.selectedTemplateId }) !== savedSnapshot.value
  })

  // Asks before discarding unsaved edits to the open signature; true if it's OK to continue
  function confirmDiscard(): boolean {
    if (!isDirty.value || !current.value) return true
    return confirm(`You have unsaved changes to "${current.value.name}". Discard them?`)
  }

  // Remember which saved signature is open, per account, so a page refresh keeps it selected.
  // (The editor contents themselves survive via the editor's local auto-save.)
  const storageKey = () => `saved-signature-current:${useAuthStore().user?.id ?? ''}`

  watch(current, (value) => {
    if (!useAuthStore().user) return
    try {
      if (value) localStorage.setItem(storageKey(), JSON.stringify(value))
      else localStorage.removeItem(storageKey())
    } catch { /* storage unavailable */ }
  }, { deep: true })

  function restoreCurrent() {
    let sig: SavedSignature | undefined
    try {
      const raw = localStorage.getItem(storageKey())
      const stored = raw ? JSON.parse(raw) as { id: string } : null
      // Only restore if it still exists (it may have been deleted on another device)
      sig = stored ? list.value.find((s) => s.id === stored.id) : undefined
    } catch { /* storage unavailable or corrupt */ }

    // Fallback: if nothing was remembered, select the saved signature identical to the editor
    if (!sig) {
      const editor = useSignatureStore()
      const editorState = stableStringify({ data: editor.data, templateId: editor.selectedTemplateId })
      sig = list.value.find((s) => {
        const merged = mergeWithDefaults(s.data, s.templateId)
        return stableStringify({ data: merged.data, templateId: merged.templateId }) === editorState
      })
    }
    current.value = sig ? { id: sig.id, name: sig.name } : null
  }

  async function refresh() {
    const r = await api<{ signatures: SavedSignature[]; customers: Customer[] }>('/signatures')
    list.value = r.signatures
    customers.value = r.customers
    if (!loaded.value) restoreCurrent()
    loaded.value = true
  }

  // Puts a saved signature at the top of the list (most recently updated first)
  function upsert(sig: SavedSignature) {
    list.value = [sig, ...list.value.filter((s) => s.id !== sig.id)]
  }

  function payload(name: string) {
    const editor = useSignatureStore()
    return { name, templateId: editor.selectedTemplateId, data: editor.data }
  }

  function saveNew(name: string, customerId: string | null) {
    return withBusy('Saving…', async () => {
      const r = await api<{ signature: SavedSignature }>('/signatures', { method: 'POST', body: { ...payload(name), customerId } })
      upsert(r.signature)
      current.value = { id: r.signature.id, name: r.signature.name }
    })
  }

  function saveCurrent() {
    const target = current.value
    if (!target) return Promise.resolve()
    return withBusy('Saving…', async () => {
      const r = await api<{ signature: SavedSignature }>(`/signatures/${target.id}`, { method: 'PUT', body: payload(target.name) })
      upsert(r.signature)
    })
  }

  // Rename and/or move to another customer without touching the design
  async function updateDetails(id: string, details: { name?: string; customerId?: string | null }) {
    const r = await api<{ signature: SavedSignature }>(`/signatures/${id}`, { method: 'PUT', body: details })
    upsert(r.signature)
    if (current.value?.id === id) current.value.name = r.signature.name
  }

  const rename = (id: string, name: string) => updateDetails(id, { name })
  const move = (id: string, customerId: string | null) => updateDetails(id, { customerId })

  // ─── Customers ───

  function sortCustomers() {
    customers.value = [...customers.value].sort((a, b) => a.name.localeCompare(b.name))
  }

  async function createCustomer(name: string): Promise<Customer> {
    const r = await api<{ customer: Customer }>('/customers', { method: 'POST', body: { name } })
    customers.value.push(r.customer)
    sortCustomers()
    return r.customer
  }

  async function renameCustomer(id: string, name: string) {
    const r = await api<{ customer: Customer }>(`/customers/${id}`, { method: 'PUT', body: { name } })
    customers.value = customers.value.map((c) => (c.id === id ? r.customer : c))
    sortCustomers()
  }

  // Its signatures are kept and become "No customer"
  function deleteCustomer(id: string) {
    return withBusy('Deleting customer…', async () => {
      await api(`/customers/${id}`, { method: 'DELETE' })
      customers.value = customers.value.filter((c) => c.id !== id)
      list.value = list.value.map((s) => (s.customerId === id ? { ...s, customerId: null } : s))
    })
  }

  const customerName = (id: string | null) => customers.value.find((c) => c.id === id)?.name ?? 'No customer'

  // Instant from the cache; only hits the network if the list hasn't loaded yet
  async function open(id: string) {
    let sig = list.value.find((s) => s.id === id)
    if (!sig) {
      sig = await withBusy('Opening signature…', async () =>
        (await api<{ signature: SavedSignature }>(`/signatures/${id}`)).signature)
    }
    useSignatureStore().loadSignature(sig.data, sig.templateId)
    current.value = { id: sig.id, name: sig.name }
  }

  // Saves many signatures in as few requests as possible. Requests are chunked to stay
  // under the server's body limit (embedded images repeat in every signature).
  function saveBulk(items: { name: string; templateId: string; data: SignatureData }[], customerId: string | null) {
    return withBusy(`Saving ${items.length} signature${items.length === 1 ? '' : 's'}…`, async () => {
      const MAX_CHUNK_CHARS = 4_500_000
      const chunks: typeof items[] = [[]]
      let size = 0
      for (const item of items) {
        const itemSize = JSON.stringify(item).length
        if (chunks[chunks.length - 1].length && (size + itemSize > MAX_CHUNK_CHARS || chunks[chunks.length - 1].length >= 200)) {
          chunks.push([])
          size = 0
        }
        chunks[chunks.length - 1].push(item)
        size += itemSize
      }

      let created = 0
      let updated = 0
      for (const chunk of chunks) {
        const r = await api<{ signatures: SavedSignature[]; created: number; updated: number }>(
          '/signatures/bulk', { method: 'POST', body: { signatures: chunk, customerId } })
        for (const sig of [...r.signatures].reverse()) upsert(sig)
        created += r.created
        updated += r.updated
      }
      return { created, updated }
    })
  }

  function remove(id: string) {
    return withBusy('Deleting…', async () => {
      await api(`/signatures/${id}`, { method: 'DELETE' })
      list.value = list.value.filter((s) => s.id !== id)
      if (current.value?.id === id) current.value = null
    })
  }

  function reset() {
    list.value = []
    customers.value = []
    current.value = null
    loaded.value = false
    busy.value = null
  }

  return {
    list, customers, current, loaded, busy, isDirty, confirmDiscard, refresh,
    saveNew, saveCurrent, saveBulk, rename, move, open, remove, reset,
    createCustomer, renameCustomer, deleteCustomer, customerName,
  }
})

// Lets Vite hot-reload this store in dev without a page refresh
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useSavedSignaturesStore, import.meta.hot))
