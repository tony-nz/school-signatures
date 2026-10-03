import type { SignatureData } from '../types'

// ─── Field colors ─────────────────────────────────────────────────────────────

export function resolveColors(data: SignatureData) {
  return {
    name:  data.fieldColors?.name  || '#111827',
    title: data.fieldColors?.title || '#6b7280',
    body:  data.fieldColors?.body  || '#374151',
    muted: data.fieldColors?.muted || '#9ca3af',
  }
}

// ─── Font ────────────────────────────────────────────────────────────────────

export function fontCss(data: SignatureData): string {
  return `font-family:${data.style.fontFamily},sans-serif;`
}

export function fontSizePx(data: SignatureData): { base: number; name: number; meta: number; small: number } {
  if (data.style.fontSize === 'custom') {
    const base = data.style.fontSizeCustomPx || 13
    return { base, name: base + 3, meta: base - 1, small: base - 2 }
  }
  const map = { sm: { base: 12, name: 14, meta: 11, small: 10 }, md: { base: 13, name: 16, meta: 12, small: 11 }, lg: { base: 14, name: 18, meta: 13, small: 12 } }
  return map[data.style.fontSize]
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

export function avatarRadiusCss(data: SignatureData): string {
  return { circle: '50%', rounded: '8px', square: '0' }[data.style.avatarShape]
}

export function logoRadiusCss(data: SignatureData): string {
  return { circle: '50%', rounded: '8px', square: '0' }[data.style.logoShape]
}

// Preset sizes shared by the photo and logo
const IMAGE_SIZE_PX = { sm: 40, md: 56, lg: 72 }

export function avatarDimPx(data: SignatureData): number {
  if (data.style.avatarSize === 'custom') return data.style.avatarSizeCustomPx || 56
  return IMAGE_SIZE_PX[data.style.avatarSize]
}

// Returns the size attributes and CSS for a logo <img>. Preset sizes keep the
// aspect ratio (width + max-height); custom sizes use explicit width/height.
export function logoSizing(data: SignatureData): { attrs: string; css: string } {
  if (data.style.logoSize === 'custom') {
    const w = data.style.logoSizeCustomPx || 0
    const h = data.style.logoSizeCustomHeightPx || 0
    if (!w && !h) return { attrs: 'width="56"', css: 'max-height:56px;' }
    return {
      attrs: [w && `width="${w}"`, h && `height="${h}"`].filter(Boolean).join(' '),
      css: `${w ? `width:${w}px;` : ''}${h ? `height:${h}px;` : ''}`,
    }
  }
  const d = IMAGE_SIZE_PX[data.style.logoSize]
  return { attrs: `width="${d}"`, css: `max-height:${d}px;` }
}

// Wraps an image in a padded cell. Uses a table rather than img padding/margin
// because Outlook ignores those on images.
export function padImage(img: string, padding: number): string {
  if (!padding) return img
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="padding:${padding}px;">${img}</td></tr></table>`
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function dividerHtml(data: SignatureData, color: string): string {
  if (!data.visibility.divider || data.style.dividerStyle === 'none') return ''
  if (data.style.dividerStyle === 'dots') {
    return `<tr><td style="padding:6px 0;color:${color};letter-spacing:3px;font-size:10px;">· · · · · · · · ·</td></tr>`
  }
  return `<tr><td style="padding:6px 0;"><div style="height:1px;background:${color};opacity:0.25;"></div></td></tr>`
}

// ─── Address ─────────────────────────────────────────────────────────────────

export function addressHtml(data: SignatureData, color: string): string {
  if (!data.visibility.addressLink) return data.address
  const url = data.addressUrl
    || `https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(data.address)}`
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:${color};text-decoration:none;">${data.address}</a>`
}

// ─── Contact details ─────────────────────────────────────────────────────────

export type ContactKind = 'email' | 'phone' | 'mobile' | 'website'

const CONTACT_LABELS = {
  letters: { email: 'E:', phone: 'P:', mobile: 'M:', website: 'W:' },
  words: { email: 'Email:', phone: 'Phone:', mobile: 'Mobile:', website: 'Web:' },
}

// What a template shows when the contact style options are on 'auto'
interface ContactAuto {
  color?: 'accent' | 'text'
  label?: string
  labelColor?: string
}

// Renders one contact detail as a link (with optional label), applying the
// Contact Details style options. Returns '' when the field is empty.
export function contactHtml(data: SignatureData, kind: ContactKind, accent: string, auto: ContactAuto = {}): string {
  const value = data[kind]
  if (!value) return ''
  const fc = resolveColors(data)

  const colorMode = data.style.contactColor === 'auto' ? (auto.color ?? 'accent') : data.style.contactColor
  const color = colorMode === 'accent' ? accent : fc.body
  const labelMode = data.style.contactLabels
  const label = labelMode === 'auto' ? (auto.label ?? '') : labelMode === 'none' ? '' : CONTACT_LABELS[labelMode][kind]
  const labelColor = labelMode === 'auto' ? (auto.labelColor ?? fc.muted) : fc.muted

  const href = kind === 'email' ? `mailto:${value}`
    : kind === 'website' ? `https://${value.replace(/^https?:\/\//, '')}`
    : `tel:${value}`
  const target = kind === 'website' ? ' target="_blank" rel="noopener noreferrer"' : ''
  const link = `<a href="${href}"${target} style="color:${color};text-decoration:none;">${value}</a>`
  return label ? `<span style="color:${labelColor};">${label}&nbsp;</span>${link}` : link
}

// ─── Social icons ─────────────────────────────────────────────────────────────

const SVG_ICONS: Record<string, (color: string) => string> = {
  facebook: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${c}"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>`,
  linkedin: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${c}"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  twitter: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${c}"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  github: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${c}"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  instagram: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${c}"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`,
  youtube: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${c}"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  tiktok: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${c}"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
}

export function socialIconHtml(type: string, color: string): string {
  return SVG_ICONS[type]?.(color) ?? ''
}

export function renderSocials(data: SignatureData, color: string): string {
  if (!data.visibility.socials) return ''
  const links = Object.entries(data.socials).filter(([, v]) => v)
  if (!links.length) return ''

  const style = data.style.socialStyle
  const items = links.map(([type, url]) => {
    const icon = socialIconHtml(type, color)
    const label = type.charAt(0).toUpperCase() + type.slice(1)
    let inner = ''
    if (style === 'icons') inner = icon
    else if (style === 'text') inner = `<span style="font-size:11px;color:${color};text-transform:capitalize;">${label}</span>`
    else inner = `${icon}&nbsp;<span style="font-size:11px;color:${color};text-transform:capitalize;vertical-align:middle;">${label}</span>`
    return `<a href="${url}" style="display:inline-flex;align-items:center;margin-right:8px;text-decoration:none;">${inner}</a>`
  }).join('')

  return `<tr><td style="padding-top:7px;">${items}</td></tr>`
}

// ─── CTA Button ───────────────────────────────────────────────────────────────

export function ctaHtml(data: SignatureData): string {
  if (!data.visibility.cta || !data.cta.text) return ''
  const url = data.cta.url || '#'
  return `<tr><td style="padding-top:8px;"><a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:7px 16px;background:${data.cta.bgColor};color:${data.cta.textColor};text-decoration:none;border-radius:5px;font-size:12px;font-weight:600;">${data.cta.text}</a></td></tr>`
}

// ─── Meeting link ─────────────────────────────────────────────────────────────

export function meetingHtml(data: SignatureData, color: string): string {
  if (!data.visibility.meetingUrl || !data.meetingUrl) return ''
  const label = data.meetingLabel || 'Book a meeting'
  return `<tr><td style="padding-top:5px;font-size:11px;">📅 <a href="${data.meetingUrl}" target="_blank" rel="noopener noreferrer" style="color:${color};text-decoration:none;">${label}</a></td></tr>`
}

// ─── Footer banner ───────────────────────────────────────────────────────────

// Places a full-width banner image beneath the whole signature, optionally linked.
export function withBanner(html: string, data: SignatureData): string {
  if (!data.visibility.banner || !data.banner) return html
  const width = data.bannerWidthPx || 400
  const img = `<img src="${data.banner}" width="${width}" alt="" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;" />`
  const banner = data.bannerUrl ? `<a href="${data.bannerUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${img}</a>` : img
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tbody>
  <tr><td>${html}</td></tr>
  <tr><td style="padding-top:12px;">${banner}</td></tr>
</tbody></table>`
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────

export function disclaimerHtml(data: SignatureData): string {
  if (!data.visibility.disclaimer || !data.disclaimer) return ''
  const text = data.disclaimer.replace(/COMPANY_NAME_HERE/g, data.company || 'the sender')
  return `<tr><td style="padding-top:10px;font-size:10px;color:#9ca3af;max-width:400px;line-height:1.4;">${text}</td></tr>`
}
