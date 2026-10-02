<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

// The user's company team. Owners can add people, make them owners, send reset links and remove them.

interface Member {
  id: string
  email: string
  contactName: string
  companyRole: 'owner' | 'member'
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

const auth = useAuthStore()
const members = ref<Member[]>([])
const canManage = ref(false)
const error = ref('')
const adding = ref(false)
const draft = reactive({ email: '', contactName: '' })
// A one-time link to pass on: the setup link for someone just added, or a reset link
const link = ref<{ memberId: string; label: string; url: string; expiresAt: string } | null>(null)
const copied = ref(false)

async function load() {
  try {
    const r = await api<{ members: Member[]; canManage: boolean }>('/team')
    members.value = r.members
    canManage.value = r.canManage
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
    await load()
    return true
  } catch (e) {
    error.value = (e as Error).message
    return false
  }
}

function showLink(memberId: string, label: string, r: { url: string; expiresAt: string }) {
  copied.value = false
  link.value = { memberId, label, ...r }
}

async function addMember() {
  const ok = await run(async () => {
    const r = await api<{ member: Member; setupUrl: string; expiresAt: string }>('/team', { method: 'POST', body: { ...draft } })
    showLink(r.member.id, `Send this link to ${r.member.email} so they can set their password`, { url: r.setupUrl, expiresAt: r.expiresAt })
  })
  if (ok) {
    Object.assign(draft, { email: '', contactName: '' })
    adding.value = false
  }
}

const resetLink = (m: Member) => run(async () => {
  const r = await api<{ url: string; expiresAt: string }>(`/team/${m.id}/reset-link`, { method: 'POST' })
  showLink(m.id, `Send this password reset link to ${m.email}`, r)
})

function setRole(m: Member, companyRole: Member['companyRole']) {
  const question = companyRole === 'owner'
    ? `Make ${m.email} an owner? They'll be able to change the branding and manage the team.`
    : `Make ${m.email} a regular member?`
  if (confirm(question)) run(() => api(`/team/${m.id}`, { method: 'PUT', body: { companyRole } }))
}

function remove(m: Member) {
  if (!confirm(`Remove ${m.email} from your team? Signatures they created stay with the company.`)) return
  run(() => api(`/team/${m.id}`, { method: 'DELETE' })).then((ok) => { if (ok && link.value?.memberId === m.id) link.value = null })
}

async function copyLink() {
  if (!link.value) return
  await navigator.clipboard.writeText(link.value.url)
  copied.value = true
}

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

onMounted(load)
</script>

<template>
  <section class="card flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Team</h2>
        <p class="text-xs text-slate-400">Everyone here shares {{ auth.user?.businessName }}'s branding, customers and signatures.</p>
      </div>
      <button v-if="canManage" type="button" @click="adding = !adding" class="btn-secondary whitespace-nowrap">{{ adding ? 'Cancel' : '+ Add person' }}</button>
    </div>

    <form v-if="adding" @submit.prevent="addMember" class="grid gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <label class="field"><span>Email</span><input v-model="draft.email" type="email" required class="input" /></label>
      <label class="field"><span>Name</span><input v-model="draft.contactName" type="text" class="input" /></label>
      <p class="text-xs text-slate-400">You'll get a link to send them so they can choose their own password.</p>
      <button type="submit" class="btn-primary self-start">Add to team</button>
    </form>

    <div v-if="link" class="rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-900/20 p-3 grid gap-2">
      <div class="text-xs text-slate-600 dark:text-slate-300">{{ link.label }}. It works once and expires {{ fmtDateTime(link.expiresAt) }}.</div>
      <div class="flex gap-2">
        <input :value="link.url" readonly class="input !py-1.5 !text-xs font-mono" @focus="($event.target as HTMLInputElement).select()" />
        <button type="button" @click="copyLink" class="btn-secondary whitespace-nowrap">{{ copied ? 'Copied' : 'Copy' }}</button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <ul class="divide-y divide-slate-100 dark:divide-slate-800 -mx-1">
      <li v-for="m in members" :key="m.id" class="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 py-2.5">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{{ m.contactName || m.email }}</span>
            <span v-if="m.companyRole === 'owner'" class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">owner</span>
            <span v-if="m.status !== 'approved'" class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{{ m.status }}</span>
            <span v-if="m.id === auth.user?.id" class="text-[10px] text-slate-400">(you)</span>
          </div>
          <div v-if="m.contactName" class="text-xs text-slate-400 truncate">{{ m.email }}</div>
        </div>
        <div v-if="canManage && m.id !== auth.user?.id" class="flex flex-wrap gap-1.5">
          <button type="button" @click="resetLink(m)" class="btn-secondary">Reset link</button>
          <button v-if="m.companyRole === 'member'" type="button" @click="setRole(m, 'owner')" class="btn-secondary">Make owner</button>
          <button v-else type="button" @click="setRole(m, 'member')" class="btn-secondary">Make member</button>
          <button type="button" @click="remove(m)" class="btn-secondary !text-red-500">Remove</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
@import './forms.css';
</style>
