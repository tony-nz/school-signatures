import { acceptHMRUpdate, defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import type { SignatureData } from '../types'
import { templates } from '../templates'
import { presets } from '../presets'
import { starterLayout } from '../templates/layouts'

const STORAGE_KEY = 'signature-generator'

const defaults: SignatureData = {
  name: 'Jane Smith',
  title: 'Marketing Manager',
  company: 'Acme Corp',
  email: 'jane@acmecorp.com',
  phone: '+1 (555) 000-0000',
  mobile: '',
  website: 'acmecorp.com',
  address: '',
  addressUrl: '',
  tagline: '',
  meetingUrl: '',
  meetingLabel: 'Book a meeting',
  disclaimer: '<strong>Important:</strong> The contents of this email message and any attachments may be confidential and/or privileged information. The contents are intended for the original email recipients only. If you have received this email in error, please contact COMPANY_NAME_HERE immediately and delete this email. Thank you.',
  avatar: '',
  logo: '',
  banner: '',
  bannerUrl: '',
  bannerWidthPx: 400,
  socials: { facebook: '', linkedin: '', twitter: '', github: '', instagram: '', youtube: '', tiktok: '' },
  accentColor: '#10b981',
  fieldColors: { name: '#0e6d34', title: '#6b7280', body: '#374151', muted: '#9ca3af' },
  cta: { text: 'Book a Meeting', url: '', bgColor: '#10b981', textColor: '#ffffff' },
  style: {
    fontFamily: 'Arial',
    fontSize: 'md',
    fontSizeCustomPx: 13,
    avatarShape: 'circle',
    avatarSize: 'md',
    avatarSizeCustomPx: 56,
    avatarPaddingPx: 0,
    logoShape: 'square',
    logoSize: 'md',
    logoSizeCustomPx: 56,
    logoSizeCustomHeightPx: 0,
    logoPaddingPx: 0,
    dividerStyle: 'line',
    socialStyle: 'icons',
    contactColor: 'auto',
    contactLabels: 'auto',
  },
  visibility: {
    avatar: true,
    logo: false,
    socials: false,
    meetingUrl: false,
    cta: false,
    disclaimer: false,
    divider: true,
    addressLink: false,
    banner: false,
  },
  layout: null,
}

export function mergeWithDefaults(d: SignatureData, templateId: string) {
  return {
    data: {
      ...defaults,
      ...d,
      socials: { ...defaults.socials, ...d?.socials },
      cta: { ...defaults.cta, ...d?.cta },
      style: { ...defaults.style, ...d?.style },
      visibility: { ...defaults.visibility, ...d?.visibility },
      fieldColors: { ...defaults.fieldColors, ...d?.fieldColors },
      layout: d?.layout ?? null,
    },
    templateId: templateId ?? 'modern',
  }
}

// Top-level string fields on SignatureData that can be set via URL params
const URL_PARAM_FIELDS = [
  'name', 'title', 'company', 'email', 'phone', 'mobile',
  'website', 'address', 'addressUrl', 'tagline', 'meetingUrl', 'meetingLabel',
  'disclaimer', 'avatar', 'logo', 'banner', 'bannerUrl', 'accentColor',
] as const

// Social platform keys that can be set via URL params (e.g. ?linkedin=janesmith)
const SOCIAL_FIELDS = [
  'facebook', 'linkedin', 'twitter', 'github', 'instagram', 'youtube', 'tiktok',
] as const

function applyUrlParams(result: { data: SignatureData; templateId: string }): { data: SignatureData; templateId: string } {
  const params = new URLSearchParams(window.location.search)

  // Support ?firstname=Jane&lastname=Smith → name = "Jane Smith"
  const firstName = params.get('firstname')
  const lastName = params.get('lastname')
  if (firstName || lastName) {
    result.data.name = [firstName, lastName].filter(Boolean).join(' ')
  }

  // Apply simple string fields (e.g. ?email=foo@bar.com&phone=555-1234)
  for (const field of URL_PARAM_FIELDS) {
    const value = params.get(field)
    if (value !== null) {
      result.data[field] = value
    }
  }

  // Apply social fields (e.g. ?linkedin=janesmith&twitter=janesmith)
  for (const social of SOCIAL_FIELDS) {
    const value = params.get(social)
    if (value !== null) {
      result.data.socials[social] = value
    }
  }

  // Allow overriding template via ?template=modern
  const templateParam = params.get('template')
  if (templateParam) {
    result.templateId = templateParam
  }

  return result
}

function loadSaved(): { data: SignatureData; templateId: string } {
  let result: { data: SignatureData; templateId: string } | null = null

  try {
    // URL preset param takes priority over localStorage
    const presetId = new URLSearchParams(window.location.search).get('preset')
    if (presetId) {
      const preset = presets.find((p) => p.id === presetId)
      if (preset) {
        const parsed = JSON.parse(preset.payload)
        result = mergeWithDefaults(parsed.data, parsed.templateId)
      }
    }
  } catch { /* ignore */ }

  if (!result) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        result = { data: { ...defaults }, templateId: 'modern' }
      } else {
        const saved = JSON.parse(raw)
        result = mergeWithDefaults(saved.data, saved.templateId)
      }
    } catch {
      result = { data: { ...defaults }, templateId: 'modern' }
    }
  }

  // URL query params override individual fields on top of preset/localStorage
  return applyUrlParams(result)
}

export const useSignatureStore = defineStore('signature', () => {
  const saved = loadSaved()

  const data = reactive<SignatureData>(saved.data)
  const selectedTemplateId = ref(saved.templateId)

  const selectedTemplate = computed(
    () => templates.find((t) => t.id === selectedTemplateId.value) ?? templates[0]
  )

  const renderedHtml = computed(() => selectedTemplate.value.render(data))

  function selectTemplate(id: string) {
    selectedTemplateId.value = id
  }

  // The builder edits a real layout, so Custom always gets one
  watch([selectedTemplateId, () => data.layout], ([id]) => {
    if (id === 'custom' && !data.layout) data.layout = starterLayout('simple')
  }, { immediate: true })

  // Auto-save with debounce
  const lastSaved = ref<Date | null>(saved ? new Date() : null)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    [() => JSON.stringify(data), selectedTemplateId],
    () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, templateId: selectedTemplateId.value }))
        lastSaved.value = new Date()
      }, 500)
    },
    { deep: true }
  )

  function resetToDemo(): void {
    const avatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="60" fill="#10b981"/><text x="60" y="76" text-anchor="middle" font-family="Arial" font-size="42" font-weight="bold" fill="white">JS</text></svg>`
    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="44"><rect width="160" height="44" rx="6" fill="#10b981"/><text x="80" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="white">ACME</text></svg>`
    const demoAvatar = `data:image/svg+xml;base64,${btoa(avatarSvg)}`
    const demoLogo = `data:image/svg+xml;base64,${btoa(logoSvg)}`

    Object.assign(data, {
      ...defaults,
      avatar: demoAvatar,
      logo: demoLogo,
      tagline: 'Making the world a better place, one campaign at a time.',
      phone: '+1 (555) 000-0000',
      mobile: '+1 (555) 111-2222',
      website: 'acmecorp.com',
      address: '123 Main St, San Francisco, CA 94105',
      meetingUrl: 'https://cal.com/janesmith',
      meetingLabel: 'Book a meeting',
      socials: { linkedin: 'janesmith', twitter: 'janesmith', github: '', instagram: '', youtube: '', tiktok: '' },
      cta: { text: 'View Portfolio', url: 'https://acmecorp.com', bgColor: '#10b981', textColor: '#ffffff' },
      accentColor: '#10b981',
      fieldColors: { ...defaults.fieldColors },
      style: { ...defaults.style },
      visibility: {
        avatar: true,
        logo: true,
        socials: true,
        meetingUrl: true,
        cta: true,
        disclaimer: false,
        divider: true,
      },
    })
    selectedTemplateId.value = 'modern'
  }

  function exportSettings(): void {
    const payload = JSON.stringify({ data, templateId: selectedTemplateId.value }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'signature-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Replaces the editor contents, filling any fields missing from older saves
  function loadSignature(incoming: SignatureData, templateId: string): void {
    const merged = mergeWithDefaults(incoming, templateId)
    Object.assign(data, merged.data)
    selectedTemplateId.value = merged.templateId
  }

  function importSettings(json: string): void {
    const parsed = JSON.parse(json)
    loadSignature(parsed.data, parsed.templateId)
  }

  return { data, selectedTemplateId, selectedTemplate, renderedHtml, selectTemplate, lastSaved, exportSettings, importSettings, loadSignature, resetToDemo }
})

// Lets Vite hot-reload this store in dev without a page refresh
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useSignatureStore, import.meta.hot))
