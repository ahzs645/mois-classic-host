import { useState } from 'react'
import { MOIS_TODAY } from '../data/patients'
import { useReportDialog, useSessionState } from '../host/screen-windows'
import { usePatient } from '../data/patient-context'
import { PBCheckbox, PBDataWindow, PBInput, PBLookup, PBTextArea, PBWindow, usePBInstrumentation } from '../pb'

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

export type AttachmentListRow = { date: string; author: string; docType: string; note: string; file: string }

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
  const host = usePBInstrumentation()
  const [log] = useAttachmentLog(target)
  const { chart } = usePatient()
  const base: AttachmentListRow[] = [
    ...log,
    ...Array.from({ length: exported }, () => ({ date: '', author: '', docType: 'ATTACHMENT', note: '', file: '' })),
  ]
  const [added, setAdded] = useState<AttachmentListRow[]>([])
  const rows = [...base, ...added]
  const [cur, setCur] = useState(0)
  const r = rows[Math.min(cur, rows.length - 1)]
  const tool = (id: string, label: string, onClick?: () => void, icon?: string) => (
    <button
      type="button"
      className="pb-cmdrow__btn"
      style={{ width: 'auto', padding: '0 8px', border: 0, borderRight: '1px solid #c8c8c8', background: 'transparent' }}
      data-tutorial-id={host?.anchor('command', `attach-list-${id}`)}
      onClick={() => { host?.report('command', { command: `attach-list-${id}` }); onClick?.() }}
    >
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
    </button>
  )
  const label = (text: string) => <span className="pb-form__label">{text}</span>
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow child controls={false} title={<>&#128206; Document / Attachment List</>} onClose={onClose}
        tutorialId="host.mois.dialog.attachment-list" style={{ width: 'min(1089px, calc(100% - 24px))', height: 'min(614px, calc(100% - 24px))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
          <div className="pb-row" style={{ gap: 0, height: 26, flex: 'none', borderBottom: '1px solid #a0a0a0', background: '#f0f0f0' }}>
            {tool('new-record', 'New Record', () => { setAdded((a) => [...a, { date: MOIS_TODAY, author: '', docType: '', note: '', file: '' }]); setCur(rows.length) }, '\u{1F5CB}')}
            {tool('delete-record', 'Delete Record', () => { if (cur >= base.length) setAdded((a) => a.filter((_, i) => i !== cur - base.length)) }, '✕')}
            {tool('save', 'Save', undefined, '\u{1F4BE}')}
            {tool('add-attachment', 'Add Attachment', onAddAttachment)}
            {tool('open-attachment', 'Open Attachment')}
            {tool('unlink-attachment', 'Unlink Attachment')}
            <span style={{ flex: '1 1 auto' }} />
            <span style={{ background: '#cfe3f7', alignSelf: 'stretch', display: 'flex' }}>{tool('close', 'Close', onClose)}</span>
          </div>
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
            <span style={{ textAlign: 'right' }}>File Name: {r?.file || (r?.docType ? `${chart}_${500000 + cur}.pdf` : '')}</span>
            {label('Attending:')}<PBLookup w={410} />{label('Primary Recipient:')}<PBLookup w={354} />
            {label('Author:')}<PBLookup w={410} value={r?.author ?? ''} />{label('Copies To:')}<PBLookup w={354} />
            {label('Responsible Org.:')}<PBLookup w={410} />{label('Facility:')}<PBInput w={354} />
            {label('Transcribed:')}<div className="pb-row"><PBInput w={190} /><span style={{ marginLeft: 20 }}>Date:</span><PBInput w={90} /><PBInput w={50} /></div>
            {label('Facility Ref.:')}<PBInput w={354} />
            {label('Service Event:')}<PBLookup w={410} />{label('Facility Loc.:')}<PBInput w={354} />
            {label('Comment:')}<PBTextArea rows={2} style={{ gridColumn: 'span 3' }} />
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
