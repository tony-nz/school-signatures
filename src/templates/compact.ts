import type { SignatureTemplate, SignatureData } from '../types'
import { contactHtml, fontCss, fontSizePx, logoSizing, logoRadiusCss, renderSocials, ctaHtml, meetingHtml, disclaimerHtml, resolveColors, addressHtml, padImage } from './helpers'

export const compactTemplate: SignatureTemplate = {
  id: 'compact',
  name: 'Compact',
  description: 'Single-line, ultra-minimal',
  render(data: SignatureData): string {
    const color = data.accentColor || '#6366f1'
    const fc = resolveColors(data)
    const sz = fontSizePx(data)
    const base = `${fontCss(data)}font-size:${sz.base}px;line-height:1.6;color:${fc.body};`

    const parts: string[] = []
    if (data.name) parts.push(`<strong style="color:${fc.name};">${data.name}</strong>`)
    if (data.title) parts.push(`<span style="color:${fc.title};">${data.title}</span>`)
    if (data.company) parts.push(`<span style="color:${color};font-weight:600;">${data.company}</span>`)

    const contacts = (['email', 'phone', 'mobile', 'website'] as const)
      .map((kind) => contactHtml(data, kind, color))
      .filter(Boolean)

    const logoHtml = (data.visibility.logo && data.logo)
      ? (() => { const ls = logoSizing(data); return `<tr><td style="padding-top:6px;">${padImage(`<img src="${data.logo}" ${ls.attrs} style="display:block;${ls.css}object-fit:contain;border-radius:${logoRadiusCss(data)};" />`, data.style.logoPaddingPx)}</td></tr>` })()
      : ''

    return `
<table cellpadding="0" cellspacing="0" border="0" style="${base}">
  <tbody>
    <tr><td style="padding-bottom:2px;">${parts.join(' <span style="color:#d1d5db;">&nbsp;|&nbsp;</span> ')}</td></tr>
    ${contacts.length ? `<tr><td style="font-size:${sz.meta}px;">${contacts.join(' <span style="color:#d1d5db;">&nbsp;&middot;&nbsp;</span> ')}</td></tr>` : ''}
    ${data.tagline ? `<tr><td style="font-size:${sz.small}px;color:${fc.muted};font-style:italic;">${data.tagline}</td></tr>` : ''}
    ${data.address ? `<tr><td style="font-size:${sz.small}px;color:${fc.muted};">${addressHtml(data, fc.muted)}</td></tr>` : ''}
    ${meetingHtml(data, color)}
    ${renderSocials(data, color)}
    ${ctaHtml(data)}
    ${logoHtml}
    ${disclaimerHtml(data)}
  </tbody>
</table>`.trim()
  },
}
