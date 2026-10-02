<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageShell from '../components/account/PageShell.vue'
import { api, type User } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
type Filter = 'pending' | 'approved' | 'rejected' | 'admins' | 'all'
const filters: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'admins', label: 'Admins' },
  { value: 'all', label: 'All' },
]

const filter = ref<Filter>('pending')
const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const qs = filter.value === 'all' ? '' : filter.value === 'admins' ? '?role=admin' : `?status=${filter.value}`
    users.value = (await api<{ users: User[] }>(`/admin/users${qs}`)).users
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function setStatus(user: User, status: User['status']) {
  error.value = ''
  try {
    await api(`/admin/users/${user.id}/status`, { method: 'POST', body: { status } })
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function setRole(user: User, role: User['role']) {
  const question = role === 'admin'
    ? `Make ${user.businessName} (${user.email}) an admin? They'll be able to approve accounts and manage admins.`
    : `Remove admin access from ${user.businessName} (${user.email})?`
  if (!confirm(question)) return
  error.value = ''
  try {
    await api(`/admin/users/${user.id}/role`, { method: 'POST', body: { role } })
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { dateStyle: 'medium' })
const badge: Record<User['status'], string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

onMounted(load)
watch(filter, load)
</script>

<template>
  <PageShell title="Admin · account approvals" subtitle="Approve retailers before they can log in and save signatures.">
    <div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
      <button v-for="f in filters" :key="f.value" @click="filter = f.value"
        class="px-3 py-1.5 text-xs font-medium border-r last:border-r-0 border-slate-200 dark:border-slate-700 transition"
        :class="filter === f.value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400'">
        {{ f.label }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-500 mb-3">{{ error }}</p>

    <div class="card-list">
      <div v-if="loading" class="p-5 text-sm text-slate-400">Loading…</div>
      <div v-else-if="!users.length" class="p-5 text-sm text-slate-400">No {{ filter === 'all' ? '' : filter === 'admins' ? 'admin' : filter }} accounts.</div>
      <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="u in users" :key="u.id" class="flex items-center gap-4 px-5 py-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{{ u.businessName }}</span>
              <span class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" :class="badge[u.status]">{{ u.status }}</span>
              <span v-if="u.role === 'admin'" class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">admin</span>
            </div>
            <div class="text-xs text-slate-400 truncate">
              {{ u.contactName ? `${u.contactName} · ` : '' }}{{ u.email }} · signed up {{ fmt(u.createdAt) }}
            </div>
          </div>
          <span v-if="u.id === auth.user?.id" class="text-xs text-slate-400">You</span>
          <template v-else>
            <button v-if="u.status !== 'approved'" @click="setStatus(u, 'approved')" class="btn-approve">Approve</button>
            <button v-if="u.status === 'approved' && u.role !== 'admin'" @click="setRole(u, 'admin')" class="btn-secondary">Make admin</button>
            <button v-if="u.role === 'admin'" @click="setRole(u, 'retailer')" class="btn-secondary">Remove admin</button>
            <button v-if="u.status !== 'rejected'" @click="setStatus(u, 'rejected')" class="btn-secondary">{{ u.status === 'approved' ? 'Revoke' : 'Reject' }}</button>
          </template>
        </li>
      </ul>
    </div>
  </PageShell>
</template>

<style scoped>
@import '../components/account/forms.css';
.card-list {
  @apply rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden;
}
.btn-approve {
  @apply text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition;
}
</style>
