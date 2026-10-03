import { Fragment, useState, type ReactNode } from 'react'
import { MOIS_TODAY } from '../data/patients'
import { useReportDialog, useSessionState } from '../host/screen-windows'
import { usePatient } from '../data/patient-context'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBTextArea } from '../pb'
import { ModalWindow, type ModalWindowProps } from './dialogKit'

/* ============================================================================
   Document / Attachment List — what Attachment opens on a record that
   already has one.

   "When adding a 2nd, 3rd, 4th, etc. attachment to the same Encounter the
   Attachment window will look slightly different. It will now show an
   attachment list … Press New Record (which will enter a new line in the
   Attachment List) and then press Add Attachment and follow the previously
   mentioned steps." (303793)

   PROVENANCE: 303793 `0f6603c1…png` (the current build, Windows 10 frame):
   a paper-clip icon and "Document / Attachment List"; a flat toolbar New
   Record · Delete Record · Save · Add Attachment · Open Attachment · Unlink
   Attachment with Close at the right; the grid Date · Author · "…" ·
   Document Type · Note · S · M · Link · paper clip; under it Note (with
   "File Name:" at the right), Attending "…", Primary Recipient "…", Author
   "…", Copies To "…", Responsible Org. "…", Facility, Transcribed + Date,
   Facility Ref., Service Event "…", Facility Loc., Comment.

   AddAttachmentDialog draws this in place of itself while the record it was
   opened for already carries an attachment; Add Attachment hands back to it.
   Rows: one per attachment filed on the stage (kept in the frame session by
   the record they hang from) and one unnamed row per attachment the chart
   export already counts, whose documents the stage does not carry.

   Anchors: host.mois.dialog.attachment-list; host.mois.command.attach-list-
   {new-record, delete-record, save, add-attachment, open-attachment,
   unlink-attachment, close}; rows host.mois.row.attach-list-<n>.
   ========================================================================= */

/* --- the window, whichever capture it is drawn from ----------------------
   One MOIS window drawn from three captures of three builds, each keeping
   its own toolbar, columns and detail block:
     AttachmentListWindow (below)       303793 `0f6603c1…` — current build
     ManualEntryView DocumentAttachmentListWindow
                                        303489 `b5550316…` — Data Exchange
     WorkspaceWindows BasketAttachmentsDialog
                                        303765 `30cd15ce…`, `cc577eb0…`
   `DocumentAttachmentFrame` is the modal window and its face; the flat
   toolbar the 303793 and 303765 builds share is `AttachmentToolbar` (303489
   has the older Task Bar, the kit's PBCommandRow). */
export function DocumentAttachmentFrame({ face, toolbar, children, ...window }: Omit<ModalWindowProps, 'title' | 'children'> & {
  title?: ReactNode
  /** the window face's background (303793 white, 303765 the face grey) */
  face?: string
  toolbar: ReactNode
  children: ReactNode
}) {
  return (
    <ModalWindow title="Document / Attachment List" {...window}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, ...(face ? { background: face } : null) }}>
        {toolbar}
        {children}
      </div>
    </ModalWindow>
  )
}

const TOOLS = [
  ['new-record', 'New Record', '\u{1F5CB}'], ['delete-record', 'Delete Record', '✕'], ['save', 'Save', '\u{1F4BE}'],
  ['add-attachment', 'Add Attachment'], ['open-attachment', 'Open Attachment'], ['unlink-attachment', 'Unlink Attachment'],
] as const
export type AttachmentTool = (typeof TOOLS)[number][0] | 'close'

/** The flat toolbar: New Record · Delete Record · Save · Add Attachment ·
    Open Attachment · Unlink Attachment, Close at the right. Each button is
    `host.mois.command.{prefix}{tool}` and reports its press. */
export function AttachmentToolbar({ prefix, height, divided, icons, closeTint, on }: {
  /** `attach-list-` (303793) / `attach-` (303765) */
  prefix: string
  height: number
  /** a rule between the buttons (303793) */
  divided?: boolean
  /** New Record / Delete Record / Save carry their glyphs (303793) */
  icons?: boolean
  /** Close on a light-blue tile (303793) */
  closeTint?: string
  on: Partial<Record<AttachmentTool, () => void>>
}) {
  const tool = (id: AttachmentTool, label: string, icon?: string) => (
    <PBButton
      bare
      className="pb-cmdrow__btn"
      style={{ width: 'auto', padding: '0 8px', border: 0, ...(divided ? { borderRight: '1px solid #c8c8c8' } : null), background: 'transparent' }}
      command={`${prefix}${id}`}
      onClick={() => on[id]?.()}
    >
      {icons && icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
    </PBButton>
  )
  const close = tool('close', 'Close')
  return (
    <div className="pb-row" style={{ gap: 0, height, flex: 'none', borderBottom: '1px solid #a0a0a0', background: '#f0f0f0' }}>
      {TOOLS.map(([id, label, icon]) => <Fragment key={id}>{tool(id, label, icon)}</Fragment>)}
      <span style={{ flex: '1 1 auto' }} />
      {closeTint ? <span style={{ background: closeTint, alignSelf: 'stretch', display: 'flex' }}>{close}</span> : close}
    </div>
  )
}

export type AttachmentListRow = {
  date: string; author: string; docType: string; note: string; file: string
  /** a row for an attachment the export counts but does not carry: it has no file name to show */
  exported?: boolean
}

/** The attachments the stage has filed on one record, by chart and record. */
export function useAttachmentLog(target: string | null) {
  const { chart } = usePatient()
  return useSessionState<AttachmentListRow[]>(`attachment-log:${chart}:${target ?? ''}`, [])
}

export function AttachmentListWindow({ target, exported, onAddAttachment, onClose }: {
  /** the record the attachments hang from (`encounter:<id>`, `rx:<id>` …) */
  target: string | null
  /** attachments the chart export already counts on the record */
  exported: number
  onAddAttachment: () => void
  onClose: () => void
}) {
  useReportDialog('attachment-list')
  const [log] = useAttachmentLog(target)
  const { chart } = usePatient()
  const base: AttachmentListRow[] = [
    ...log,
    ...Array.from({ length: exported }, () => ({ date: '', author: '', docType: 'ATTACHMENT', note: '', file: '', exported: true })),
  ]
  const [added, setAdded] = useState<AttachmentListRow[]>([])
  const rows = [...base, ...added]
  const [cur, setCur] = useState(0)
  const r = rows[Math.min(cur, rows.length - 1)]
  const label = (text: string) => <span className="pb-form__label">{text}</span>
  return (
    <DocumentAttachmentFrame id="attachment-list" title={<>&#128206; Document / Attachment List</>} onClose={onClose} zIndex={80}
      windowStyle={{ width: 'min(1089px, calc(100% - 24px))', height: 'min(614px, calc(100% - 24px))' }}
      face="#fff"
      toolbar={(
        <AttachmentToolbar prefix="attach-list-" height={26} divided icons closeTint="#cfe3f7" on={{
          'new-record': () => { setAdded((a) => [...a, { date: MOIS_TODAY, author: '', docType: '', note: '', file: '' }]); setCur(rows.length) },
          'delete-record': () => { if (cur >= base.length) setAdded((a) => a.filter((_, i) => i !== cur - base.length)) },
          'add-attachment': onAddAttachment,
          close: onClose,
        }} />
      )}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            rowTutorialId={(_x, i) => `host.mois.row.attach-list-${i}`}
            columns={[
              { key: 'date', header: 'Date', width: 90, align: 'center' },
              { key: 'author', header: 'Author', width: 120 },
              { key: 'd', header: '', dots: true },
              { key: 'docType', header: 'Document Type', width: 150 },
              { key: 'note', header: 'Note' },
              { key: 's', header: 'S', width: 22, align: 'center', render: () => <PBCheckbox checked={false} /> },
              { key: 'm', header: 'M', width: 22, align: 'center', render: (x) => (x.file ? '⇩' : '') },
              { key: 'link', header: 'Link', width: 34, align: 'center', render: (x) => (x.file ? '↷' : '') },
              { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center', render: (x) => (x.docType ? '1' : '-') },
            ]}
            empty="No attachments."
          />
        </div>
        <div className="pb-form" style={{ flex: 'none', gridTemplateColumns: '120px 410px 1fr 360px', padding: '6px 10px', gap: '3px 8px', borderTop: '1px solid #a0a0a0', background: 'var(--pb-face)' }}>
          {label('Note:')}<PBInput w={404} readOnly value={r?.note ?? ''} />
          <span />
          <span style={{ textAlign: 'right' }}>File Name: {r?.file || (r?.docType && !r.exported ? `${chart}_${500000 + cur}.pdf` : '')}</span>
          {label('Attending:')}<PBLookup w={410} />{label('Primary Recipient:')}<PBLookup w={354} />
          {label('Author:')}<PBLookup w={410} value={r?.author ?? ''} />{label('Copies To:')}<PBLookup w={354} />
          {label('Responsible Org.:')}<PBLookup w={410} />{label('Facility:')}<PBInput w={354} />
          {label('Transcribed:')}<div className="pb-row"><PBInput w={190} /><span style={{ marginLeft: 20 }}>Date:</span><PBInput w={90} /><PBInput w={50} /></div>
          {label('Facility Ref.:')}<PBInput w={354} />
          {label('Service Event:')}<PBLookup w={410} />{label('Facility Loc.:')}<PBInput w={354} />
          {label('Comment:')}<PBTextArea rows={2} style={{ gridColumn: 'span 3' }} />
        </div>
    </DocumentAttachmentFrame>
  )
}
