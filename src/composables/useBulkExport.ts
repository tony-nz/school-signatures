import JSZip from 'jszip'
import type { BulkRow, SignatureData } from '../types'
import { useSignatureStore } from '../stores/signature'
import { buildMailsignatureContent } from './useExport'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase() || 'signature'
}

function buildSignatureData(baseData: SignatureData, row: BulkRow): SignatureData {
  return {
    ...baseData,
    name: row.name || baseData.name,
    title: row.title || baseData.title,
    email: row.email || baseData.email,
    phone: row.phone || baseData.phone,
    mobile: row.mobile || baseData.mobile,
    website: row.website || baseData.website,
    address: row.address || baseData.address,
    tagline: row.tagline || baseData.tagline,
    avatar: row.avatar || baseData.avatar,
  }
}

export function useBulkExport() {
  const store = useSignatureStore()

  async function downloadHtmlZip(rows: BulkRow[]): Promise<void> {
    const zip = new JSZip()
    const usedNames = new Map<string, number>()

    for (const row of rows) {
      const data = buildSignatureData(store.data as SignatureData, row)
      const html = store.selectedTemplate.render(data)
      let filename = sanitizeFilename(row.name || row.email)
      const count = usedNames.get(filename) ?? 0
      usedNames.set(filename, count + 1)
      if (count > 0) filename = `${filename}_${count}`
      zip.file(`${filename}.html`, html)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    triggerDownload(blob, 'signatures-html.zip')
  }

  async function downloadMailZip(rows: BulkRow[]): Promise<void> {
    const zip = new JSZip()
    const usedNames = new Map<string, number>()

    for (const row of rows) {
      const data = buildSignatureData(store.data as SignatureData, row)
      const html = store.selectedTemplate.render(data)
      const content = buildMailsignatureContent(html)
      let filename = sanitizeFilename(row.name || row.email)
      const count = usedNames.get(filename) ?? 0
      usedNames.set(filename, count + 1)
      if (count > 0) filename = `${filename}_${count}`
      zip.file(`${filename}.mailsignature`, content)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    triggerDownload(blob, 'signatures-macmail.zip')
  }

  return { downloadHtmlZip, downloadMailZip }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
