/* ============================================================================
   The files a chart's documents point at, loaded on demand.

   tdt_document.str_link names a file the export carries beside its XML
   (`0001x.<str_link>`). scripts/import-chart.mjs copies those into
   attachments/<chart>/ and writes chart-<num>.attachments.ts, which maps each
   link to its asset URL. That module is imported only when a viewer asks, so
   opening a chart never pulls in the list, let alone the files.

   Attachment contents are Git-ignored local data. Repository entries are
   placeholders until a real chart export supplies their files.

   A link with no file — a WEBFORM document's str_link is the webform record's
   id, and an export may simply leave a file out — resolves to `missing`; the
   viewer says so rather than drawing a stand-in page.
   ========================================================================= */
import { useEffect, useState } from 'react'
import type { ChartAttachment } from './types'

const loaders: Record<string, () => Promise<Record<string, ChartAttachment>>> = {
  '87288': () => import('./chart-87288.attachments').then((m) => m.chart87288Attachments),
}

const cache: Record<string, Promise<Record<string, ChartAttachment>>> = {}
const manifestFor = (chart: string) => (cache[chart] ??= loaders[chart]?.() ?? Promise.resolve({}))

/** A dynamic asset context allows a checkout without the ignored local files. */
export function chartAttachmentUrl(chart: string, file: string): string {
  try {
    return new URL(`./attachments/${chart}/${file}`, import.meta.url).href
  } catch {
    return ''
  }
}

export type AttachmentState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; attachment: ChartAttachment; text?: string }

/** the attachment a document links to; `.TXM` documents come back with their text */
export function useChartAttachment(chart: string, link: string | undefined): AttachmentState {
  const [state, setState] = useState<AttachmentState>({ status: link ? 'loading' : 'missing' })
  useEffect(() => {
    if (!link) { setState({ status: 'missing' }); return }
    let live = true
    setState({ status: 'loading' })
    manifestFor(chart)
      .then(async (manifest) => {
        const attachment = manifest[link]
        if (!attachment?.url) return { status: 'missing' } as const
        // Dev servers may return their HTML fallback for an absent local asset.
        const response = await fetch(attachment.url, attachment.kind === 'pdf' ? { method: 'HEAD' } : undefined)
        if (!response.ok || response.headers.get('content-type')?.includes('text/html')) return { status: 'missing' } as const
        if (attachment.kind === 'pdf') return { status: 'ready', attachment } as const
        const text = await response.text()
        return { status: 'ready', attachment, text } as const
      })
      .catch(() => ({ status: 'missing' }) as const)
      .then((next) => { if (live) setState(next) })
    return () => { live = false }
  }, [chart, link])
  return state
}

/** whether a chart has any attachment manifest at all (cheap, no import) */
export const chartHasAttachments = (chart: string): boolean => chart in loaders
