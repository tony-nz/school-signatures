import type { SignatureTemplate, SignatureData, SignatureLayout, LayoutBlock, LayoutLine, LayoutItem, LayoutColor, LayoutField, LayoutTextStyle } from '../types'
import { fontCss, fontSizePx, resolveColors, socialIconHtml } from './helpers'
import { starterLayout } from './layouts'

export const FIELD_LABELS: Record<LayoutField, string> = {
  name: 'Name', title: 'Job title', company: 'Company', tagline: 'Tagline',
  email: 'Email', phone: 'Phone', mobile: 'Mobile', website: 'Website', address: 'Address',
}

// Editing adds data-el markers (for click/drag on the canvas) and shows empty parts as placeholders
export interface RenderOptions {
  editable?: boolean
  selectedId?: string | null
}

interface Ctx {
  data: SignatureData
  opts: RenderOptions
  accent: string
  colors: ReturnType<typeof resolveColors>
  sizes: ReturnType<typeof fontSizePx>
}

const SELECTED_CSS = 'outline:2px solid #6366f1;outline-offset:2px;border-radius:2px;'
const PLACEHOLDER_CSS = 'color:#a5b4fc;font-style:italic;font-weight:400;'

function color(ctx: Ctx, c: LayoutColor | undefined, fallback: string): string {
  if (!c) return fallback
  if (c === 'accent') return ctx.accent
  return ctx.colors[c as keyof Ctx['colors']] ?? c
}

function textCss(ctx: Ctx, s: LayoutTextStyle, fallbackColor = ctx.colors.body): string {
  return `color:${color(ctx, s.color, fallbackColor)};font-size:${ctx.sizes[s.size ?? 'base']}px;`
    + `font-weight:${s.bold ? 700 : 400};font-style:${s.italic ? 'italic' : 'normal'};text-decoration:${s.underline ? 'underline' : 'none'};`
}

// Marker attributes for the editor canvas; nothing in exported HTML
function mark(ctx: Ctx, id: string): { attrs: string; css: string } {
  if (!ctx.opts.editable) return { attrs: '', css: '' }
  return {
    attrs: ` data-el="${id}" draggable="true"`,
    css: `cursor:pointer;${ctx.opts.selectedId === id ? SELECTED_CSS : ''}`,
  }
}

function link(href: string, css: string, inner: string, newTab = true): string {
  const target = newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
  return `<a href="${href}"${target} style="${css}">${inner}</a>`
}

function fieldHref(field: LayoutField, value: string): string {
  switch (field) {
    case 'email': return `mailto:${value}`
    case 'phone':
    case 'mobile': return `tel:${value.replace(/[^\d+]/g, '')}`
    case 'website': return `https://${value.replace(/^https?:\/\//, '')}`
    case 'address': return `https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(value)}`
    default: return ''
  }
}

// ─── Items ───────────────────────────────────────────────────────────────────

function imageSrc(ctx: Ctx, item: Extract<LayoutItem, { type: 'image' }>): string {
  if (item.source === 'logo') return ctx.data.logo
  if (item.source === 'avatar') return ctx.data.avatar
  return item.src
}

// Returns '' when the item has nothing to show (outside the editor)
function itemHtml(ctx: Ctx, item: LayoutItem): string {
  const m = mark(ctx, item.id)

  switch (item.type) {
    case 'field': {
      const value = ctx.data[item.field]
      if (!value && !ctx.opts.editable) return ''
      // Underline only the value, not the label
      const css = textCss(ctx, item)
      const outerCss = css.replace(/text-decoration:[^;]+;/, '')
      const label = item.label
        ? `<span style="color:${color(ctx, item.labelColor, ctx.accent)};font-weight:700;">${item.label}</span>&nbsp;`
        : ''
      const body = !value
        ? `<span style="${PLACEHOLDER_CSS}">${FIELD_LABELS[item.field]}</span>`
        : item.link && fieldHref(item.field, value)
          ? link(fieldHref(item.field, value), css, value, item.field === 'website' || item.field === 'address')
          : `<span style="${css}">${value}</span>`
      return `<span${m.attrs} style="${outerCss}${m.css}">${label}${body}</span>`
    }
    case 'text': {
      if (!item.text && !ctx.opts.editable) return ''
      const css = textCss(ctx, item)
      const inner = item.text || `<span style="${PLACEHOLDER_CSS}">Text</span>`
      const body = item.href ? link(item.href, css, inner) : inner
      return `<span${m.attrs} style="${css}${m.css}">${body}</span>`
    }
    case 'separator':
      return `<span${m.attrs} style="${textCss(ctx, item)}${m.css}white-space:pre;">${item.text}</span>`
    case 'image': {
      const src = imageSrc(ctx, item)
      if (!src) {
        return ctx.opts.editable ? `<span${m.attrs} style="${PLACEHOLDER_CSS}${m.css}">[${item.source === 'logo' ? 'Logo' : item.source === 'avatar' ? 'Photo' : 'Image'}]</span>` : ''
      }
      const radius = { circle: '50%', rounded: '8px', square: '0' }[item.shape ?? 'square']
      const img = `<img src="${src}" width="${item.width}" alt="" style="display:inline-block;vertical-align:middle;width:${item.width}px;height:auto;border:0;border-radius:${radius};" />`
      return `<span${m.attrs} style="display:inline-block;vertical-align:middle;${m.css}">${item.href ? link(item.href, 'text-decoration:none;', img) : img}</span>`
    }
    case 'socials': {
      const c = color(ctx, item.color, ctx.accent)
      const links = Object.entries(ctx.data.socials).filter(([, v]) => v)
      if (!links.length) {
        return ctx.opts.editable ? `<span${m.attrs} style="${PLACEHOLDER_CSS}${m.css}">[Social icons]</span>` : ''
      }
      const icons = links.map(([type, url]) => link(url!, 'text-decoration:none;margin-right:8px;', socialIconHtml(type, c))).join('')
      return `<span${m.attrs} style="${m.css}">${icons}</span>`
    }
    case 'button': {
      const cta = ctx.data.cta
      if (!cta.text && !ctx.opts.editable) return ''
      const css = `display:inline-block;padding:7px 16px;background:${cta.bgColor};color:${cta.textColor};text-decoration:none;border-radius:5px;font-size:12px;font-weight:600;`
      return `<span${m.attrs} style="display:inline-block;${m.css}">${link(cta.url || '#', css, cta.text || 'Button')}</span>`
    }
  }
}

// Joins a line's items, dropping empty ones and any separator left without content on both sides
function lineContent(ctx: Ctx, line: LayoutLine): string {
  const parts = line.items.map(item => ({ item, html: itemHtml(ctx, item) })).filter(p => p.html)
  if (ctx.opts.editable) return parts.map(p => p.html).join('')

  const kept: typeof parts = []
  for (const p of parts) {
    const isSep = p.item.type === 'separator'
    if (isSep && (!kept.length || kept[kept.length - 1].item.type === 'separator')) continue
    kept.push(p)
  }
  while (kept.length && kept[kept.length - 1].item.type === 'separator') kept.pop()
  return kept.map(p => p.html).join('')
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

function row(ctx: Ctx, id: string, content: string, css = ''): string {
  const m = mark(ctx, id)
  return `<tr><td${m.attrs} style="${css}${m.css}">${content}</td></tr>`
}

function lineHtml(ctx: Ctx, line: LayoutLine): string {
  let content = lineContent(ctx, line)
  if (!content) {
    if (!ctx.opts.editable) return ''
    content = `<span style="${PLACEHOLDER_CSS}font-size:12px;">Empty row – add elements</span>`
  }
  return row(ctx, line.id, content, `padding-top:${line.padTop}px;font-size:${ctx.sizes.base}px;`)
}

function blockHtml(ctx: Ctx, block: LayoutBlock): string {
  switch (block.type) {
    case 'line':
      return lineHtml(ctx, block)
    case 'columns': {
      const cells = block.columns
        .map(lines => lines.map(l => lineHtml(ctx, l)).join(''))
        .map((rows, i, all) => {
          const empty = ctx.opts.editable ? `<tr><td style="${PLACEHOLDER_CSS}font-size:12px;">Empty column</td></tr>` : ''
          return `<td style="vertical-align:top;${i < all.length - 1 ? `padding-right:${block.gap}px;` : ''}">${table(rows || empty)}</td>`
        })
      return row(ctx, block.id, table(`<tr>${cells.join('')}</tr>`), `padding-top:${block.padTop}px;`)
    }
    case 'spacer':
      return row(ctx, block.id, '&nbsp;', `height:${block.height}px;line-height:${block.height}px;font-size:1px;`)
    case 'divider': {
      const c = color(ctx, block.color, ctx.accent)
      return row(ctx, block.id, `<div style="height:1px;line-height:1px;font-size:1px;background:${c};">&nbsp;</div>`, `padding-top:${block.padTop}px;padding-bottom:2px;`)
    }
    case 'banner': {
      const d = ctx.data
      if (!d.banner) {
        return ctx.opts.editable ? row(ctx, block.id, `<span style="${PLACEHOLDER_CSS}font-size:12px;">[Banner – upload one in the panel]</span>`, `padding-top:${block.padTop}px;`) : ''
      }
      const width = d.bannerWidthPx || 400
      const img = `<img src="${d.banner}" width="${width}" alt="" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;" />`
      return row(ctx, block.id, d.bannerUrl ? link(d.bannerUrl, 'text-decoration:none;', img) : img, `padding-top:${block.padTop}px;`)
    }
    case 'disclaimer': {
      const d = ctx.data
      if (!d.disclaimer && !ctx.opts.editable) return ''
      const text = (d.disclaimer || 'Disclaimer text').replace(/COMPANY_NAME_HERE/g, d.company || 'the sender')
      return row(ctx, block.id, text, `padding-top:${block.padTop}px;font-size:10px;color:${ctx.colors.muted};font-style:italic;line-height:1.5;max-width:560px;`)
    }
  }
}

function table(rows: string, css = ''): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${css}"><tbody>${rows}</tbody></table>`
}

// The layout a signature renders with: its own, or the starter until one is built
export function layoutFor(data: SignatureData): SignatureLayout {
  return data.layout ?? starterLayout('simple')
}

export function renderLayout(data: SignatureData, opts: RenderOptions = {}): string {
  const ctx: Ctx = {
    data,
    opts,
    accent: data.accentColor || '#6366f1',
    colors: resolveColors(data),
    sizes: fontSizePx(data),
  }
  const base = `${fontCss(data)}font-size:${ctx.sizes.base}px;line-height:1.6;color:${ctx.colors.body};`
  return table(layoutFor(data).blocks.map(b => blockHtml(ctx, b)).join(''), base)
}

export const customTemplate: SignatureTemplate = {
  id: 'custom',
  name: 'Custom',
  description: 'Build your own layout with the visual builder',
  render: data => renderLayout(data),
}
