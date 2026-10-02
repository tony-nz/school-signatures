import type { SignatureTemplate, SignatureData } from '../types'
import { fontCss, fontSizePx, avatarRadiusCss, avatarDimPx, logoSizing, logoRadiusCss, dividerHtml, renderSocials, ctaHtml, meetingHtml, disclaimerHtml, resolveColors, addressHtml, padImage } from './helpers'

export const stackedTemplate: SignatureTemplate = {
  id: 'stacked',
  name: 'Stacked',
  description: 'Title and company on separate lines, contacts inline',
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
      ? `<td style="padding-right:16px;vertical-align:top;">${leftParts.join('')}</td>`
      : ''

    const contacts: string[] = []
    if (data.email) contacts.push(`<a href="mailto:${data.email}" style="color:${fc.body};text-decoration:none;">${data.email}</a>`)
    if (data.phone) contacts.push(`<a href="tel:${data.phone}" style="color:${fc.body};text-decoration:none;">${data.phone}</a>`)
    if (data.mobile) contacts.push(`<a href="tel:${data.mobile}" style="color:${fc.body};text-decoration:none;">${data.mobile}</a>`)
    if (data.website) contacts.push(`<a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" rel="noopener noreferrer" style="color:${fc.body};text-decoration:none;">${data.website}</a>`)
    const contactLine = contacts.join(' <span style="color:#d1d5db;"> | </span> ')

    return `
<table cellpadding="0" cellspacing="0" border="0" style="${base}">
  <tbody><tr>
    ${avatarCell}
    <td style="vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0"><tbody>
        <tr><td style="font-size:${sz.name}px;font-weight:700;color:${fc.name};">${data.name}</td></tr>
        ${data.title ? `<tr><td style="font-size:${sz.meta}px;color:${fc.title};padding-top:1px;">${data.title}</td></tr>` : ''}
        ${data.company ? `<tr><td style="font-size:${sz.meta}px;color:${fc.muted};padding-top:1px;">${data.company}</td></tr>` : ''}
        ${data.tagline ? `<tr><td style="font-size:${sz.small}px;color:${color};font-style:italic;padding-top:1px;">${data.tagline}</td></tr>` : ''}
        ${dividerHtml(data, color)}
        ${contacts.length ? `<tr><td style="padding-top:6px;font-size:${sz.base}px;">${contactLine}</td></tr>` : ''}
        ${data.address ? `<tr><td style="font-size:${sz.small}px;color:${fc.muted};padding-top:2px;">${addressHtml(data, fc.muted)}</td></tr>` : ''}
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
