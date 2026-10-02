import type { SignatureTemplate, SignatureData } from '../types'
import { fontCss, fontSizePx, avatarRadiusCss, avatarDimPx, logoSizing, logoRadiusCss, renderSocials, ctaHtml, meetingHtml, disclaimerHtml, resolveColors, addressHtml, padImage } from './helpers'

export const corporateTemplate: SignatureTemplate = {
  id: 'corporate',
  name: 'Corporate',
  description: 'Two-column with logo and contact details',
  render(data: SignatureData): string {
    const color = data.accentColor || '#6366f1'
    const fc = resolveColors(data)
    const sz = fontSizePx(data)
    const base = `${fontCss(data)}font-size:${sz.base}px;line-height:1.5;color:${fc.body};`

    const showLogo = data.visibility.logo && data.logo
    const logoOrAvatar = showLogo || (data.visibility.avatar && data.avatar)
    const dim = avatarDimPx(data)
    const sizing = showLogo ? logoSizing(data) : { attrs: `width="${dim}"`, css: `max-height:${dim}px;` }
    const radius = showLogo ? logoRadiusCss(data) : avatarRadiusCss(data)

    const imageCell = logoOrAvatar
      ? `<td style="padding-right:18px;vertical-align:middle;border-right:2px solid ${color};">
          ${padImage(`<img src="${logoOrAvatar}" ${sizing.attrs} style="display:block;${sizing.css}object-fit:contain;border-radius:${radius};" />`, (showLogo ? data.style.logoPaddingPx : data.style.avatarPaddingPx))}
        </td><td style="width:14px;"></td>`
      : ''

    const nameLine = data.name

    return `
<table cellpadding="0" cellspacing="0" border="0" style="${base}">
  <tbody><tr>
    ${imageCell}
    <td style="vertical-align:middle;">
      <table cellpadding="0" cellspacing="0" border="0"><tbody>
        <tr><td style="font-size:${sz.name}px;font-weight:700;color:${fc.name};">${nameLine}</td></tr>
        ${data.title ? `<tr><td style="font-size:${sz.meta}px;color:${color};font-weight:600;">${data.title}</td></tr>` : ''}
        ${data.company ? `<tr><td style="font-size:${sz.meta}px;color:${fc.title};">${data.company}</td></tr>` : ''}
        ${data.tagline ? `<tr><td style="font-size:${sz.meta}px;color:${fc.muted};font-style:italic;">${data.tagline}</td></tr>` : ''}
        <tr><td style="height:6px;"></td></tr>
        ${data.phone ? `<tr><td style="font-size:${sz.base}px;"><span style="color:${fc.muted};">T:&nbsp;</span><a href="tel:${data.phone}" style="color:${fc.body};text-decoration:none;">${data.phone}</a></td></tr>` : ''}
        ${data.mobile ? `<tr><td style="font-size:${sz.base}px;"><span style="color:${fc.muted};">M:&nbsp;</span><a href="tel:${data.mobile}" style="color:${fc.body};text-decoration:none;">${data.mobile}</a></td></tr>` : ''}
        ${data.email ? `<tr><td style="font-size:${sz.base}px;"><span style="color:${fc.muted};">E:&nbsp;</span><a href="mailto:${data.email}" style="color:${color};text-decoration:none;">${data.email}</a></td></tr>` : ''}
        ${data.website ? `<tr><td style="font-size:${sz.base}px;"><span style="color:${fc.muted};">W:&nbsp;</span><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" rel="noopener noreferrer" style="color:${color};text-decoration:none;">${data.website}</a></td></tr>` : ''}
        ${data.address ? `<tr><td style="font-size:${sz.small}px;color:${fc.muted};padding-top:3px;">${addressHtml(data, fc.muted)}</td></tr>` : ''}
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
