import type { SignatureTemplate, SignatureData } from '../types'
import { contactHtml, fontCss, fontSizePx, logoSizing, logoRadiusCss, dividerHtml, renderSocials, ctaHtml, meetingHtml, disclaimerHtml, resolveColors, addressHtml, padImage } from './helpers'

export const minimalTemplate: SignatureTemplate = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean text-only with subtle divider',
  render(data: SignatureData): string {
    const color = data.accentColor || '#6366f1'
    const fc = resolveColors(data)
    const sz = fontSizePx(data)
    const base = `${fontCss(data)}font-size:${sz.base}px;line-height:1.5;color:${fc.body};`

    const nameLine = data.name
    const titleLine = [
      data.title ? data.title : '',
      data.company ? data.company : '',
    ].filter(Boolean).join(' &middot; ')

    const contactLine = (['email', 'phone', 'mobile', 'website'] as const)
      .map((kind) => contactHtml(data, kind, color))
      .filter(Boolean).join(' &nbsp;&middot;&nbsp; ')

    const logoHtml = (data.visibility.logo && data.logo)
      ? (() => { const ls = logoSizing(data); return `<tr><td style="padding-top:8px;">${padImage(`<img src="${data.logo}" ${ls.attrs} style="display:block;${ls.css}object-fit:contain;border-radius:${logoRadiusCss(data)};" />`, data.style.logoPaddingPx)}</td></tr>` })()
      : ''

    return `
<table cellpadding="0" cellspacing="0" border="0" style="${base}">
  <tbody>
    <tr><td style="border-top:2px solid ${color};padding-top:8px;">
      <table cellpadding="0" cellspacing="0" border="0"><tbody>
        <tr><td style="font-size:${sz.name}px;font-weight:700;color:${fc.name};">${nameLine}</td></tr>
        ${titleLine ? `<tr><td style="font-size:${sz.meta}px;color:${fc.title};">${titleLine}</td></tr>` : ''}
        ${data.tagline ? `<tr><td style="font-size:${sz.meta}px;color:${color};font-style:italic;">${data.tagline}</td></tr>` : ''}
        ${dividerHtml(data, color)}
        ${contactLine ? `<tr><td style="padding-top:4px;font-size:${sz.base}px;">${contactLine}</td></tr>` : ''}
        ${data.address ? `<tr><td style="font-size:${sz.small}px;color:${fc.muted};">${addressHtml(data, fc.muted)}</td></tr>` : ''}
        ${meetingHtml(data, color)}
        ${renderSocials(data, color)}
        ${ctaHtml(data)}
        ${logoHtml}
        ${disclaimerHtml(data)}
      </tbody></table>
    </td></tr>
  </tbody>
</table>`.trim()
  },
}
