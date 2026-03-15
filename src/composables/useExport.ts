import { useSignatureStore } from '../stores/signature'

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16).toUpperCase()
  })
}

/**
 * Generates the full .mailsignature file content.
 * The body content replaces what Mail.app writes when creating a dummy signature.
 */
export function buildMailsignatureContent(html: string): string {
  const uuid = generateUUID()
  const msgId = `<${uuid}@mailsignature>`
  return [
    'Content-Transfer-Encoding: 7bit',
    'Content-Type: text/html;',
    '\tcharset=us-ascii',
    `Message-Id: ${msgId}`,
    'Mime-Version: 1.0 (Mac OS X Mail 16.0 \\(3731.400.51.1.1\\))',
    '',
    `<body style="margin:0;padding:0;">${html}</body>`,
  ].join('\n')
}

export function useExport() {
  const store = useSignatureStore()

  /** Gmail / generic rich-text copy — pastes as formatted HTML in Gmail compose */
  async function copyForGmail(): Promise<void> {
    const html = store.renderedHtml
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()], {
            type: 'text/plain',
          }),
        }),
      ])
    } catch {
      // Fallback: execCommand (older browsers / Safari)
      const el = document.createElement('div')
      el.innerHTML = html
      el.style.cssText = 'position:fixed;left:-9999px;opacity:0;'
      document.body.appendChild(el)
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand('copy')
      sel?.removeAllRanges()
      document.body.removeChild(el)
    }
  }

  /** Mac Mail: download a .mailsignature file the user can drop in place */
  function downloadMailSignature(): void {
    const content = buildMailsignatureContent(store.renderedHtml)
    const uuid = generateUUID()
    const filename = `${uuid}.mailsignature`
    const blob = new Blob([content], { type: 'text/plain;charset=us-ascii' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Raw HTML download */
  function downloadHtml(): void {
    const blob = new Blob([store.renderedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'signature.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Copy raw HTML source to clipboard */
  async function copyHtml(): Promise<void> {
    await navigator.clipboard.writeText(store.renderedHtml)
  }

  return {
    copyForGmail,
    downloadMailSignature,
    downloadHtml,
    copyHtml,
  }
}
