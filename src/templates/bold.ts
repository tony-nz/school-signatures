import type { SignatureTemplate, SignatureData } from '../types'
import { contactHtml, fontCss, fontSizePx, avatarRadiusCss, avatarDimPx, logoSizing, logoRadiusCss, renderSocials, ctaHtml, meetingHtml, disclaimerHtml, resolveColors, addressHtml, padImage } from './helpers'

export const boldTemplate: SignatureTemplate = {
  id: 'bold',
  name: 'Bold',
  description: 'Dark banner header with white name',
  render(data: SignatureData): string {
    const color = data.accentColor || '#6366f1'
    const fc = resolveColors(data)
    const sz = fontSizePx(data)
    const base = `${fontCss(data)}font-size:${sz.base}px;line-height:1.5;color:${fc.body};`

    const dim = avatarDimPx(data)
    const radius = avatarRadiusCss(data)
    const avatarHtml = (data.visibility.avatar && data.avatar)
      ? padImage(`<img src="${data.avatar}" width="${dim}" height="${dim}" style="border-radius:${radius};display:block;object-fit:cover;border:2px solid rgba(255,255,255,0.3);" />`, data.style.avatarPaddingPx)
      : ''

    const logoHtml = (data.visibility.logo && data.logo)
      ? (() => { const ls = logoSizing(data); return `<tr><td style="padding-top:8px;">${padImage(`<img src="${data.logo}" ${ls.attrs} style="display:block;${ls.css}object-fit:contain;border-radius:${logoRadiusCss(data)};" />`, data.style.logoPaddingPx)}</td></tr>` })()
      : ''

    const metaParts: string[] = []
    if (data.title) metaParts.push(data.title)
    if (data.company) metaParts.push(data.company)

    const nameLine = data.name

    return `
<table cellpadding="0" cellspacing="0" border="0" style="${base}width:360px;">
  <tbody>
    <!-- Banner header -->
    <tr>
      <td style="background:${color};border-radius:8px 8px 0 0;padding:14px 16px;">
        <table cellpadding="0" cellspacing="0" border="0"><tbody><tr>
          ${avatarHtml ? `<td style="padding-right:12px;vertical-align:middle;">${avatarHtml}</td>` : ''}
          <td style="vertical-align:middle;">
            <div style="font-size:${sz.name}px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">${nameLine}</div>
            ${metaParts.length ? `<div style="font-size:${sz.meta}px;color:rgba(255,255,255,0.75);margin-top:1px;">${metaParts.join(' &bull; ')}</div>` : ''}
            ${data.tagline ? `<div style="font-size:${sz.meta}px;color:rgba(255,255,255,0.6);font-style:italic;margin-top:1px;">${data.tagline}</div>` : ''}
          </td>
        </tr></tbody></table>
      </td>
    </tr>
    <!-- Contact row -->
    <tr>
      <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;">
        <table cellpadding="0" cellspacing="0" border="0"><tbody>
          ${(['email', 'phone', 'mobile', 'website'] as const).map((kind) => {
            const html = contactHtml(data, kind, color, kind === 'mobile' ? { label: 'M:', labelColor: fc.title } : {})
            return html ? `<tr><td style="font-size:${sz.base}px;padding-bottom:2px;">${html}</td></tr>` : ''
          }).join('')}
          ${data.address ? `<tr><td style="font-size:${sz.small}px;color:${fc.muted};">${addressHtml(data, fc.muted)}</td></tr>` : ''}
          ${meetingHtml(data, color)}
          ${renderSocials(data, color)}
          ${ctaHtml(data)}
          ${logoHtml}
          ${disclaimerHtml(data)}
        </tbody></table>
      </td>
    </tr>
  </tbody>
</table>`.trim()
  },
}
