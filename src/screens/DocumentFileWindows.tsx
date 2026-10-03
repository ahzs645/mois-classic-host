import type { ReactNode } from 'react'
import { useSystemSetting } from '../data/accessSettings'
import { useChartAttachment } from '../data/charts/attachments'
import type { MoisRecord } from '../data/charts'
import { usePatient } from '../data/patient-context'
import { registerScreenWindows, useScreenWindow } from '../host/screen-windows'
import { PBButton, PBMessageBox } from '../pb'
import { DesktopLayer, ModalWindow } from './dialogKit'
import { MoisViewerWindow, paperFormPageSize } from './MoisViewerWindow'

/* ============================================================================
   Patient Chart ▸ Documents — opening the file a document points at.

   tdt_document.str_link names the file MOIS filed with the record; a chart
   export carries those files beside its XML (data/charts/attachments.ts).
   Double-clicking a Documents row opens it, the way Paper Forms' double-click
   opens its form (PaperFormsView.tsx, user captures 2026-09-25 #1–#17 — the
   paper forms are tdt_document rows too, so the same record opens the same
   way from either folder):

   · a PDF opens in the MOIS Viewer (MoisViewerWindow.tsx) — the PDF-XChange
     control MOIS opens every stored PDF in. Embedded or not follows System
     Settings ▸ MOIS Viewer Mode, as for Paper Forms.
   · a .TXM is a MOIS letter (str_source LETTER: REFERRAL, CONSULTATION,
     ENCOUNTER …), stored in TX Text Control's format. MOIS opens it in its
     letter editor; the chart export's importer decodes only its text, so the
     stage shows that text read-only on a page, line breaks and tabs kept.
     INFERRED: the window — its title is the document's Note, its face the
     kit's — since no capture of an opened letter document exists.
   · no file — a WEBFORM document's str_link is the webform record's id,
     some records have no link, and an export may leave a file out — says so
     in a message box rather than drawing a stand-in.

   Opening by name: `host.mois.openUtility {window: 'document-file', index}`
   (the row's index in the folder) — or `host.mois.activateRow {row:
   'documents-<n>'}`. Reported: host.dialog = mois-viewer (the PDF),
   document-text (the letter), or document-file-missing (the message box).
   Anchors: host.mois.dialog.document-text, host.mois.field.document-text,
   host.mois.command.document-text-close, host.mois.command.document-file-ok.
   ========================================================================= */

export const DOCUMENT_FILE_WINDOW = 'document-file'
registerScreenWindows([DOCUMENT_FILE_WINDOW])

/** the document's own name for itself: its Note, else its form code */
const titleOf = (r: MoisRecord) => r.str_note || r.str_source_code || r.str_doc_type || ''

/** The read-only page a .TXM letter's text is drawn on. */
function DocumentTextWindow({ record, text, onClose }: { record: MoisRecord; text: string; onClose: () => void }) {
  return (
    <ModalWindow
      id="document-text"
      report
      controls
      title={titleOf(record) || 'Document'}
      onClose={onClose}
      zIndex={80}
      windowStyle={{ width: 900, height: 720, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}
    >
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#808080', padding: 12 }}>
        <pre
          data-tutorial-id="host.mois.field.document-text"
          style={{
            width: 816, maxWidth: '100%', minHeight: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '36px 48px',
            background: '#fff', color: '#000', boxShadow: '2px 2px 3px rgba(0,0,0,.35)',
            font: '12px "Courier New", Courier, monospace', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', tabSize: 8,
          }}
        >
          {text}
        </pre>
      </div>
      <div className="pb-row" style={{ flex: 'none', padding: '4px 8px', gap: 8, borderTop: '1px solid var(--pb-border)' }}>
        <span>{record.str_doc_type ?? ''}</span>
        <span className="pb-row__spacer" />
        <span>File Name: {record.str_link ?? ''}</span>
        <PBButton command="document-text-close" onClick={onClose}>Close</PBButton>
      </div>
    </ModalWindow>
  )
}

/** what the message box says for a document with no file in the export */
function missingText(r: MoisRecord): string {
  const link = r.str_link ?? ''
  if (!link) return 'This document has no file attached.'
  if (!/\.[a-z0-9]+$/i.test(link)) return `This ${r.str_doc_type ?? ''} document points at record ${link}, not a file. The chart export carries no file for it.`.replace(/\s+/g, ' ')
  return `This attachment entry is a placeholder. Load a real chart export with ${link} to view its attachment.`
}

/** The opened document: the viewer, the letter's text, or the message box. */
export function DocumentFileWindow({ record, onClose }: { record: MoisRecord; onClose: () => void }) {
  const { chart } = usePatient()
  const viewerMode = useSystemSetting('MOIS Viewer Mode').toUpperCase()
  const file = useChartAttachment(chart, record.str_link)
  let body: ReactNode = null
  if (file.status === 'missing') {
    body = (
      <PBMessageBox
        title="Documents"
        icon="info"
        tutorialId="host.mois.dialog.document-file-missing"
        buttons={[{ label: 'OK', value: 'ok', default: true, command: 'document-file-ok' }]}
        onClose={onClose}
      >
        {missingText(record)}
      </PBMessageBox>
    )
  } else if (file.status === 'ready' && file.attachment.kind === 'pdf') {
    const form = record.str_note ?? record.str_source_code ?? ''
    body = <MoisViewerWindow embedded={viewerMode !== 'S'} form={form} fileName={record.str_link} pageSize={paperFormPageSize(form)} onClose={onClose} />
  } else if (file.status === 'ready') {
    body = <DocumentTextWindow record={record} text={file.text ?? ''} onClose={onClose} />
  }
  return body && <DesktopLayer>{body}</DesktopLayer>
}

/** Documents' double-click and the window it opens; inert off Documents. */
export function useDocumentFile({ active, records }: { active: boolean; records: (MoisRecord | undefined)[] }) {
  const slot = useScreenWindow()
  const index = active && slot.is(DOCUMENT_FILE_WINDOW) && typeof slot.window?.args?.index === 'number' ? slot.window.args.index : -1
  const record = index >= 0 ? records[index] : undefined
  return {
    /** a double-click (or Enter) on the folder's row `index` */
    open: (index: number) => { if (active && records[index]) slot.open(DOCUMENT_FILE_WINDOW, { index }) },
    windows: record ? <DocumentFileWindow key={record.id_document ?? index} record={record} onClose={slot.close} /> : null,
  }
}
