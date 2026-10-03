import type { LayoutTextStyle, SignatureLayout, LayoutBlock, LayoutBlockType, LayoutItem, LayoutItemType, LayoutLine, LayoutField } from '../types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Factories ───────────────────────────────────────────────────────────────

export function newField(field: LayoutField, extra: Partial<Extract<LayoutItem, { type: 'field' }>> = {}): LayoutItem {
  const link = ['email', 'phone', 'mobile', 'website', 'address'].includes(field)
  return { id: uid(), type: 'field', field, link, ...extra }
}

export function newItem(type: LayoutItemType): LayoutItem {
  switch (type) {
    case 'field': return newField('name')
    case 'text': return { id: uid(), type: 'text', text: 'Your text' }
    case 'separator': return { id: uid(), type: 'separator', text: ' | ', color: 'muted' }
    case 'image': return { id: uid(), type: 'image', source: 'logo', src: '', width: 80 }
    case 'socials': return { id: uid(), type: 'socials' }
    case 'button': return { id: uid(), type: 'button' }
  }
}

export function newLine(items: LayoutItem[] = [], padTop = 2): LayoutLine {
  return { id: uid(), type: 'line', items, padTop }
}

export function newBlock(type: LayoutBlockType): LayoutBlock {
  switch (type) {
    case 'line': return newLine([], 6)
    case 'columns': return { id: uid(), type: 'columns', columns: [[newLine()], [newLine()]], gap: 32, padTop: 12 }
    case 'spacer': return { id: uid(), type: 'spacer', height: 16 }
    case 'divider': return { id: uid(), type: 'divider', padTop: 8 }
    case 'banner': return { id: uid(), type: 'banner', padTop: 16 }
    case 'disclaimer': return { id: uid(), type: 'disclaimer', padTop: 12 }
  }
}

// ─── Starters ────────────────────────────────────────────────────────────────

function text(text: string, extra: Partial<Extract<LayoutItem, { type: 'text' }>> = {}): LayoutItem {
  return { id: uid(), type: 'text', text, ...extra }
}

function sep(text = ' | ', style: LayoutTextStyle = { bold: true }): LayoutItem {
  return { id: uid(), type: 'separator', text, ...style }
}

function office(name: string, phone: string, website: string, address: string): LayoutLine[] {
  const label = (t: string) => text(t + ' ', { color: 'accent', bold: true, size: 'meta' })
  return [
    newLine([text(name, { color: 'accent', bold: true, size: 'meta' })], 0),
    newLine([
      label('P:'), text(phone, { href: `tel:${phone.replace(/[^\d+]/g, '')}`, underline: true, size: 'meta' }),
      text(' '), label('W:'), text(website, { href: `https://${website}`, underline: true, size: 'meta' }),
    ], 6),
    newLine([label('A:'), text(address, { underline: true, size: 'meta' })], 6),
  ]
}

export const STARTERS = [
  { id: 'simple', name: 'Simple', description: 'Name, title and contact details' },
  { id: 'offices', name: 'Two offices', description: 'Contact line, two office columns, terms and banner' },
  { id: 'blank', name: 'Blank', description: 'Start from nothing' },
] as const

export type StarterId = typeof STARTERS[number]['id']

export function starterLayout(id: StarterId): SignatureLayout {
  if (id === 'blank') return { blocks: [newLine([], 0)] }

  if (id === 'offices') {
    return {
      blocks: [
        newLine([
          newField('name', { color: 'accent', bold: true, size: 'name' }), sep(' | ', { bold: true, size: 'name' }),
          newField('title', { bold: true, size: 'name' }), sep(' | ', { bold: true, size: 'name' }),
          newField('company', { color: 'accent', bold: true, size: 'name' }),
        ], 0),
        newLine([
          newField('mobile', { label: 'M:', underline: true }), sep(' | ', { bold: true, color: 'accent' }),
          newField('email', { label: 'E:', underline: true }),
        ]),
        {
          id: uid(), type: 'columns', gap: 36, padTop: 20,
          columns: [
            office('Head Office (Client Services)', '+64 3 310 7705', 'example.co.nz', '12 Blake St, Rangiora, NZ, 7400'),
            office('Print Studio (Pickups)', '+64 3 313 7774', 'examplestudio.co.nz', '216 High St, Rangiora, NZ, 7400'),
          ],
        },
        newLine([
          text('Learn more about our new print studio ', { bold: true, size: 'meta' }),
          text('Here', { color: 'accent', bold: true, underline: true, size: 'meta', href: 'https://example.co.nz' }),
        ], 18),
        newLine([
          text('T&amp;C: ', { color: 'accent', bold: true, size: 'meta' }),
          text('By engaging with us, you agree to our ', { size: 'meta' }),
          text('Terms of Business', { color: 'accent', bold: true, underline: true, size: 'meta', href: 'https://example.co.nz/terms' }),
        ], 14),
        { id: uid(), type: 'banner', padTop: 24 },
        { id: uid(), type: 'disclaimer', padTop: 10 },
      ],
    }
  }

  return {
    blocks: [
      newLine([newField('name', { color: 'name', bold: true, size: 'name' })], 0),
      newLine([newField('title', { color: 'title', size: 'meta' }), sep(' • ', { color: 'muted' }), newField('company', { color: 'title', size: 'meta' })], 0),
      { id: uid(), type: 'divider', padTop: 8 },
      newLine([newField('email', { color: 'accent' }), sep(' | ', { color: 'muted' }), newField('phone', { color: 'accent' })], 6),
      newLine([newField('website', { color: 'accent' })], 0),
      newLine([{ id: uid(), type: 'socials' }], 6),
    ],
  }
}
