<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageShell from '../components/account/PageShell.vue'
import { api, type User } from '../lib/api'
import { useAuthStore } from '../stores/auth'

// Counts are for the user's whole company
type AdminUser = User & { memberCount: number; signatureCount: number; customerCount: number }
interface Company { id: string; name: string; memberCount: number }

const auth = useAuthStore()
type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'admins'
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'admins', label: 'Admins' },
]

const filter = ref<Filter>('all')
const search = ref('')
const users = ref<AdminUser[]>([])
const companies = ref<Company[]>([])
const loading = ref(false)
const error = ref('')
const notice = ref('')

const matchesFilter = (u: AdminUser, f: Filter) =>
  f === 'all' ? true : f === 'admins' ? u.role === 'admin' : u.status === f

const counts = computed(() =>
  Object.fromEntries(filters.map((f) => [f.value, users.value.filter((u) => matchesFilter(u, f.value)).length])) as Record<Filter, number>)

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return users.value.filter((u) => matchesFilter(u, filter.value) && (!q
    || u.email.toLowerCase().includes(q)
    || u.businessName.toLowerCase().includes(q)
    || u.contactName.toLowerCase().includes(q)))
})

async function load() {
  loading.value = true
  try {
    const [u, c] = await Promise.all([
      api<{ users: AdminUser[] }>('/admin/users'),
      api<{ companies: Company[] }>('/admin/companies'),
    ])
    users.value = u.users
    companies.value = c.companies
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

// Runs an admin action, shows its outcome and reloads the list
async function run(action: () => Promise<unknown>, success?: string) {
  error.value = ''
  notice.value = ''
  try {
    await action()
    if (success) notice.value = success
    await load()
    return true
  } catch (e) {
    error.value = (e as Error).message
    return false
  }
}

const setStatus = (u: AdminUser, status: User['status']) =>
  run(() => api(`/admin/users/${u.id}/status`, { method: 'POST', body: { status } }))

function setRole(u: AdminUser, role: User['role']) {
  const question = role === 'admin'
    ? `Make ${u.businessName} (${u.email}) an admin? They'll be able to manage every account.`
    : `Remove admin access from ${u.businessName} (${u.email})?`
  if (!confirm(question)) return
  run(() => api(`/admin/users/${u.id}/role`, { method: 'POST', body: { role } }))
}

function deleteUser(u: AdminUser) {
  const sigs = u.signatureCount ? `, including its ${u.signatureCount} saved signature${u.signatureCount === 1 ? '' : 's'}` : ''
  const question = u.memberCount > 1
    ? `Permanently delete ${u.email}? ${u.businessName} and its signatures stay with the rest of the team.`
    : `Permanently delete ${u.email}? They're the last member of ${u.businessName}, so the company and all its data will be deleted too${sigs}. This can't be undone.`
  if (!confirm(question)) return
  run(() => api(`/admin/users/${u.id}`, { method: 'DELETE' }), `Deleted ${u.email}`)
    .then((ok) => { if (ok) expanded.value = null })
}

// ─── Manage panel (one account open at a time) ─────────────────────────────

const expanded = ref<string | null>(null)
const edit = reactive({ businessName: '', contactName: '', email: '', password: '', companyId: '', companyRole: 'member' as User['companyRole'] })

function toggle(u: AdminUser) {
  if (expanded.value === u.id) {
    expanded.value = null
    return
  }
  expanded.value = u.id
  Object.assign(edit, {
    businessName: u.businessName, contactName: u.contactName, email: u.email, password: '',
    companyId: u.companyId, companyRole: u.companyRole,
  })
}

const saveDetails = (u: AdminUser) => run(() => api(`/admin/users/${u.id}`, {
  method: 'PUT',
  body: {
    contactName: edit.contactName, email: edit.email, companyId: edit.companyId, companyRole: edit.companyRole,
    // Renaming only applies when they stay in the same company
    ...(edit.companyId === u.companyId ? { businessName: edit.businessName } : {}),
  },
}), 'Details saved')

async function savePassword(u: AdminUser) {
  const ok = await run(() => api(`/admin/users/${u.id}/password`, { method: 'POST', body: { password: edit.password } }),
    u.id === auth.user?.id ? 'Your password was changed' : `Password changed — ${u.email} has been signed out`)
  if (ok) edit.password = ''
}

// One-time link the admin passes on, so the user chooses their own password
const resetLink = ref<{ userId: string; url: string; expiresAt: string } | null>(null)
const copied = ref(false)

async function createResetLink(u: AdminUser) {
  copied.value = false
  await run(async () => {
    const r = await api<{ url: string; expiresAt: string }>(`/admin/users/${u.id}/reset-link`, { method: 'POST' })
    resetLink.value = { userId: u.id, ...r }
  })
}

async function copyResetLink() {
  if (!resetLink.value) return
  await navigator.clipboard.writeText(resetLink.value.url)
  copied.value = true
}

// ─── New account ─────────────────────────────────────────────────────────────

const creating = ref(false)
// companyId '' means create a new company named businessName
const draft = reactive({
  companyId: '', businessName: '', contactName: '', email: '', password: '',
  role: 'retailer' as User['role'], companyRole: 'member' as User['companyRole'],
})

async function createUser() {
  const ok = await run(() => api('/admin/users', { method: 'POST', body: { ...draft } }), `Created ${draft.email}`)
  if (ok) {
    Object.assign(draft, { companyId: '', businessName: '', contactName: '', email: '', password: '', role: 'retailer', companyRole: 'member' })
    creating.value = false
  }
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { dateStyle: 'medium' })
const badge: Record<User['status'], string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

onMounted(load)
</script>

<template>
  <PageShell title="Admin Centre" subtitle="Manage every account: approvals, details, passwords and admin access.">
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button v-for="f in filters" :key="f.value" @click="filter = f.value"
          class="px-3 py-1.5 text-xs font-medium border-r last:border-r-0 border-slate-200 dark:border-slate-700 transition"
          :class="filter === f.value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400'">
          {{ f.label }}
          <span class="ml-1 tabular-nums"
            :class="f.value === 'pending' && counts.pending && filter !== 'pending' ? 'text-amber-600 font-bold' : 'opacity-60'">{{ counts[f.value] }}</span>
        </button>
      </div>
      <input v-model="search" type="search" placeholder="Search name or email…" class="input !w-56 !py-1.5 !text-xs" />
      <button @click="creating = !creating" class="btn-primary !text-xs !px-3 !py-1.5 ml-auto">
        {{ creating ? 'Cancel' : '+ New account' }}
      </button>
    </div>

    <form v-if="creating" @submit.prevent="createUser" class="card mb-4 grid gap-3 sm:grid-cols-2">
      <label class="field"><span>Company</span>
        <select v-model="draft.companyId" class="input">
          <option value="">New company…</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }} ({{ c.memberCount }})</option>
        </select>
      </label>
      <label v-if="!draft.companyId" class="field"><span>New company name</span><input v-model="draft.businessName" class="input" required /></label>
      <label v-else class="field"><span>Company role</span>
        <select v-model="draft.companyRole" class="input">
          <option value="member">Member</option>
          <option value="owner">Owner</option>
        </select>
      </label>
      <label class="field"><span>Contact name</span><input v-model="draft.contactName" class="input" /></label>
      <label class="field"><span>Email</span><input v-model="draft.email" type="email" class="input" required /></label>
      <label class="field"><span>Password</span><input v-model="draft.password" type="password" minlength="8" autocomplete="new-password" class="input" required /></label>
      <label class="field"><span>Site role</span>
        <select v-model="draft.role" class="input">
          <option value="retailer">Retailer</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div class="flex items-end justify-end sm:col-span-2">
        <button type="submit" class="btn-primary">Create account</button>
      </div>
      <p class="sm:col-span-2 text-xs text-slate-400">The account is approved straight away. Share the password with them securely.</p>
    </form>

    <p v-if="error" class="text-sm text-red-500 mb-3">{{ error }}</p>
    <p v-if="notice" class="text-sm text-emerald-600 dark:text-emerald-400 mb-3">{{ notice }}</p>

    <div class="card-list">
      <div v-if="loading && !users.length" class="p-5 text-sm text-slate-400">Loading…</div>
      <div v-else-if="!visible.length" class="p-5 text-sm text-slate-400">
        {{ search ? 'No accounts match your search.' : `No ${filter === 'all' ? '' : filter === 'admins' ? 'admin' : filter} accounts.` }}
      </div>
      <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="u in visible" :key="u.id">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{{ u.businessName }}</span>
                <span class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" :class="badge[u.status]">{{ u.status }}</span>
                <span v-if="u.role === 'admin'" class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">admin</span>
                <span v-if="u.companyRole === 'owner'" class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">owner</span>
                <span v-if="u.id === auth.user?.id" class="text-[10px] text-slate-400">(you)</span>
              </div>
              <div class="text-xs text-slate-400 truncate">
                {{ u.contactName ? `${u.contactName} · ` : '' }}{{ u.email }} · joined {{ fmt(u.createdAt) }}
                · {{ u.memberCount }} member{{ u.memberCount === 1 ? '' : 's' }}
                · {{ u.signatureCount }} signature{{ u.signatureCount === 1 ? '' : 's' }}
                · {{ u.customerCount }} customer{{ u.customerCount === 1 ? '' : 's' }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <template v-if="u.id !== auth.user?.id">
                <button v-if="u.status !== 'approved'" @click="setStatus(u, 'approved')" class="btn-approve">Approve</button>
                <button v-if="u.status === 'pending'" @click="setStatus(u, 'rejected')" class="btn-secondary">Reject</button>
              </template>
              <button @click="toggle(u)" class="btn-secondary">{{ expanded === u.id ? 'Close' : 'Manage' }}</button>
            </div>
          </div>

          <div v-if="expanded === u.id" class="px-5 pb-5 pt-1 grid gap-4 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
            <form @submit.prevent="saveDetails(u)" class="grid gap-3 sm:grid-cols-3 pt-4">
              <label class="field"><span>Contact name</span><input v-model="edit.contactName" class="input" /></label>
              <label class="field"><span>Email</span><input v-model="edit.email" type="email" class="input" required /></label>
              <label class="field"><span>Company role</span>
                <select v-model="edit.companyRole" class="input">
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <label class="field"><span>Company</span>
                <select v-model="edit.companyId" class="input">
                  <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }} ({{ c.memberCount }})</option>
                </select>
              </label>
              <label v-if="edit.companyId === u.companyId" class="field sm:col-span-2"><span>Company name <span class="font-normal text-slate-400">(renames it for all {{ u.memberCount }} member{{ u.memberCount === 1 ? '' : 's' }})</span></span>
                <input v-model="edit.businessName" class="input" required />
              </label>
              <p v-else class="sm:col-span-2 self-end text-xs text-amber-600">Moves them to another company: they'll see that company's signatures instead.</p>
              <div class="sm:col-span-3 flex justify-end"><button type="submit" class="btn-secondary">Save details</button></div>
            </form>

            <div class="grid gap-3">
              <form @submit.prevent="savePassword(u)" class="flex flex-wrap items-end gap-3">
                <label class="field flex-1 min-w-[12rem]"><span>Set a new password</span>
                  <input v-model="edit.password" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters" class="input" required />
                </label>
                <button type="submit" class="btn-secondary">Change password</button>
                <span class="text-xs text-slate-400 self-center">or</span>
                <button type="button" @click="createResetLink(u)" class="btn-secondary">Create reset link</button>
              </form>
              <div v-if="resetLink?.userId === u.id" class="rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-900/20 p-3 grid gap-2">
                <div class="text-xs text-slate-600 dark:text-slate-300">
                  Send this link to {{ u.email }}. It works once and expires {{ new Date(resetLink.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }}.
                </div>
                <div class="flex gap-2">
                  <input :value="resetLink.url" readonly class="input !py-1.5 !text-xs font-mono" @focus="($event.target as HTMLInputElement).select()" />
                  <button type="button" @click="copyResetLink" class="btn-secondary whitespace-nowrap">{{ copied ? 'Copied' : 'Copy' }}</button>
                </div>
              </div>
            </div>

            <div v-if="u.id !== auth.user?.id" class="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button v-if="u.status === 'approved' && u.role !== 'admin'" @click="setRole(u, 'admin')" class="btn-secondary">Make admin</button>
              <button v-if="u.role === 'admin'" @click="setRole(u, 'retailer')" class="btn-secondary">Remove admin</button>
              <button v-if="u.status === 'approved'" @click="setStatus(u, 'rejected')" class="btn-secondary">Revoke access</button>
              <button v-if="u.status === 'rejected'" @click="setStatus(u, 'pending')" class="btn-secondary">Move back to pending</button>
              <button @click="deleteUser(u)" class="btn-danger ml-auto">Delete account</button>
            </div>
            <p v-else class="text-xs text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
              You can't change your own role or status, or delete your own account.
            </p>
          </div>
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
.btn-danger {
  @apply text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition
    dark:border-red-900/60 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20;
}
</style>
