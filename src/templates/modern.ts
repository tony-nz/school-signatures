import type { SignatureTemplate, SignatureData } from '../types'
import { contactHtml, fontCss, fontSizePx, avatarRadiusCss, avatarDimPx, logoSizing, logoRadiusCss, dividerHtml, renderSocials, ctaHtml, meetingHtml, disclaimerHtml, resolveColors, addressHtml, padImage } from './helpers'

export const modernTemplate: SignatureTemplate = {
  id: 'modern',
  name: 'Modern',
  description: 'Left-border accent with bold name',
  render(data: SignatureData): string {
    const color = data.accentColor || '#6366f1'
    const fc = resolveColors(data)
    const sz = fontSizePx(data)
    const base = `${fontCss(data)}font-size:${sz.base}px;line-height:1.5;color:${fc.body};`

    const avatarDim = avatarDimPx(data)
    const radius = avatarRadiusCss(data)

    const leftParts: string[] = []
    if (data.visibility.avatar && data.avatar) {
      leftParts.push(padImage(`<img src="${data.avatar}" width="${avatarDim}" height="${avatarDim}" style="border-radius:${radius};display:block;object-fit:cover;" />`, data.style.avatarPaddingPx))
    }
    if (data.visibility.logo && data.logo) {
      const ls = logoSizing(data)
      leftParts.push(padImage(`<img src="${data.logo}" ${ls.attrs} style="display:block;${ls.css}object-fit:contain;border-radius:${logoRadiusCss(data)};${leftParts.length ? 'margin-top:8px;' : ''}" />`, data.style.logoPaddingPx))
    }
    const avatarCell = leftParts.length
      ? `<td style="padding-right:14px;vertical-align:top;">${leftParts.join('')}</td>`
      : ''

    const nameLine = data.name
    const metaParts: string[] = []
    if (data.title) metaParts.push(data.title)
    if (data.company) metaParts.push(data.company)

    return `
<table cellpadding="0" cellspacing="0" border="0" style="${base}">
  <tbody><tr>
    ${avatarCell}
    <td style="border-left:3px solid ${color};padding-left:14px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0"><tbody>
        <tr><td style="font-size:${sz.name}px;font-weight:700;color:${fc.name};">${nameLine}</td></tr>
        ${metaParts.length ? `<tr><td style="font-size:${sz.meta}px;color:${fc.title};padding-top:1px;">${metaParts.join(' &bull; ')}</td></tr>` : ''}
        ${data.tagline ? `<tr><td style="font-size:${sz.meta}px;color:${color};font-style:italic;padding-top:1px;">${data.tagline}</td></tr>` : ''}
        ${dividerHtml(data, color)}
        ${data.email ? `<tr><td style="padding-top:5px;font-size:${sz.base}px;">${contactHtml(data, 'email', color)}</td></tr>` : ''}
        ${data.phone ? `<tr><td style="font-size:${sz.base}px;">${contactHtml(data, 'phone', color)}</td></tr>` : ''}
        ${data.mobile ? `<tr><td style="font-size:${sz.base}px;">${contactHtml(data, 'mobile', color, { label: 'M:', labelColor: fc.title })}</td></tr>` : ''}
        ${data.website ? `<tr><td style="font-size:${sz.base}px;">${contactHtml(data, 'website', color)}</td></tr>` : ''}
        ${data.address ? `<tr><td style="font-size:${sz.small}px;color:${fc.muted};">${addressHtml(data, fc.muted)}</td></tr>` : ''}
        ${meetingHtml(data, color)}
        ${renderSocials(data, color)}
        ${ctaHtml(data)}
        ${disclaimerHtml(data)}
      </tbody></table>
    </td>
  </tr></tbody>
</table>`.trim()
  },
}
