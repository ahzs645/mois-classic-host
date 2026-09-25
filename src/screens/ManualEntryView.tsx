import { Fragment, useState, type ReactNode } from 'react'
import {
  ATTACHMENT_LIST_COLUMNS, ATTACHMENT_LIST_COMMANDS, ATTACHMENT_LIST_ROWS, MANUAL_ENTRY_COMMANDS,
  type ExColumn, type ExField, type ManualEntryFolder,
} from '../data/exchange'
import { useExchangeCommand } from '../data/exchangeStore'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBSelect, PBTabs, PBTextArea,
  PBViewHeader, PBWindow, pbSlug, type PBColumn,
} from '../pb'
import type { ExchangeGo } from './ExchangeView'
import { contextPoint, RowContextMenu, type ContextMenuAt } from './RowContextMenu'

/* ============================================================================
   Manual Entry — the seven folders of Data Exchange ▸ Manual Entry.

   One window shape, seven bindings (data/exchange.ts cites the capture each
   folder was transcribed from). The taskbar is the one 303388 image
   23b2bb8a rings: New Record, Delete Record, Save, Undo, Open Chart,
   Attachment, Close Window. Under it a filter box per column, the grid with
   its paper-clip count at the right, then the lower half:

     - Report / Detail tabs (Documents and Orders: one Detail band),
     - History (+/- 15 days from discharged date), which 303381 defines as
       "other records for this patient 15 days prior to, and 15 days
       following the selected record (minimizes chance of double entry)",
     - Distribute To, New / Delete over a User Name list: "Allows you to add
       or delete users to send this record to".

   Behaviour is kept small and real: New Record appends a blank current row
   and marks the window unsaved, Save commits it, Undo drops it, Delete
   Record removes the current row, Open Chart opens the matching Patient
   Chart folder, and Attachment opens the Document / Attachment List on a
   record with more than one attachment or the Add Attachment prompt on one
   with none (303489, 303488 "MOIS will prompt you to attach a form/letter
   or file"). Save & Duplicate (F3) on the Action menu copies the record.
   ========================================================================= */

const clipCount = (row?: Record<string, string>) => {
  const n = Number(row?.clip)
  return Number.isFinite(n) ? n : 0
}

function Label({ children, w }: { children: ReactNode; w?: number }) {
  return (
    <span className="pb-form__label pb-form__label--right" style={{ width: w, flex: 'none', lineHeight: '19px' }}>
      {children}
    </span>
  )
}

/** One field, bound to the sample record or blank for a new one. */
function Field({ f, blank, go }: { f: ExField; blank: boolean; go: ExchangeGo }) {
  const v = (value?: string) => (blank ? '' : value ?? '')
  switch (f.kind) {
    case 'text':
      return f.lookup
        ? <PBLookup w={f.w ?? 200} defaultValue={v(f.value)} />
        : <PBInput w={f.w ?? 200} defaultValue={v(f.value)} />
    case 'date':
      return (
        <span className="pb-row" style={{ gap: 2 }}>
          <PBInput w={76} align="center" defaultValue={v(f.value)} />
          {f.time && <PBInput w={40} align="center" defaultValue=":" />}
        </span>
      )
    case 'select':
      return <PBSelect w={f.w ?? 120} options={[v(f.value)]} />
    case 'coded':
      return (
        <span className="pb-row" style={{ gap: 2, flex: '1 1 auto' }}>
          <PBLookup w={90} defaultValue={v(f.code)} />
          <PBInput w={320} defaultValue={v(f.value)} />
        </span>
      )
    case 'order':
      return (
        /* the ellipsis on Associated Order # opens the Order Linking Service
           (303490: "OR press the ellipsis on the 'Associated Order' field") */
        <PBLookup w={110} readOnly name="associated-order" onDots={() => go.open('order-linking-service')} />
      )
    default:
      return null
  }
}

/** A lower-half form: rows of a left field and, optionally, its right-hand pair. */
function FieldGrid({ fields, blank, clip, folder, go }: {
  fields: ExField[]
  blank: boolean
  clip: string
  folder: ManualEntryFolder
  go: ExchangeGo
}) {
  const rows: ExField[][] = []
  for (const f of fields) {
    const joins = ('pair' in f && f.pair) || f.kind === 'attachments'
    if (joins && rows.length && rows[rows.length - 1]![0]!.kind !== 'report') rows[rows.length - 1]!.push(f)
    else rows.push([f])
  }
  const LABEL_W = 96
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 8px', flex: '1 1 auto', minHeight: 0 }}>
      {rows.map((row, i) => {
        const first = row[0]!
        if (first.kind === 'rule') return <div key={i} style={{ borderTop: '1px solid #b8b8b8', margin: '2px 0' }} />
        if (first.kind === 'ranges') {
          const box = (fill: string) => <PBInput w={56} style={{ background: fill }} />
          const cap = (t: string, w = 58) => <span style={{ width: w, textAlign: 'center', borderTop: '1px solid #888' }}>{t}</span>
          return (
            /* the Ref. Ranges row: LL and HH pink, L and H yellow, NORMAL
               RANGE between them (b4ba45db) */
            <div key={i} data-tutorial-id="host.mois.field.ref-ranges" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="pb-row" style={{ gap: 2 }}>
                <Label w={LABEL_W}>Ref. Ranges:</Label>
                <span style={{ width: 8 }}>&lt;</span>
                {box('#ffc6c6')}{box('#ffffc0')}<span style={{ width: 96 }} />{box('#ffffc0')}{box('#ffc6c6')}
                <span>&gt;</span>
              </div>
              <div className="pb-row" style={{ gap: 2, color: '#000080', fontSize: 11 }}>
                <span style={{ width: LABEL_W + 12 }} />
                {cap('L L')}{cap('L')}{cap('NORMAL RANGE', 96)}{cap('H')}{cap('H H')}
              </div>
            </div>
          )
        }
        if (first.kind === 'report') {
          const band = folder.node === 'dx-orders'
          return (
            <div key={i} style={{ display: 'flex', gap: 4, flex: '1 1 auto', minHeight: 60 }}>
              {band ? null : <Label w={LABEL_W}>{first.label}</Label>}
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }}>
                {band && <span className="pb-form__label" style={{ marginBottom: 2 }}>{first.label}</span>}
                <PBTextArea
                  key={blank ? 'blank' : 'record'}
                  data-tutorial-id={`host.mois.field.${first.anchor}`}
                  style={{ flex: '1 1 auto', width: '100%', resize: 'none' }}
                  rows={4}
                />
              </div>
            </div>
          )
        }
        return (
          <div key={i} className="pb-row" style={{ gap: 4 }}>
            {row.map((f, j) => {
              if (f.kind === 'attachments') {
                return (
                  <Fragment key={j}>
                    <span className="pb-row__spacer" />
                    {folder.node === 'dx-documents'
                      ? <span data-tutorial-id="host.mois.field.attachments">{clip === '-' ? 'No Attached File' : `${clip} Attached File(s)`}</span>
                      : (
                        <>
                          <Label>Attachments:</Label>
                          <PBInput w={34} align="center" readOnly value={clip} data-tutorial-id="host.mois.field.attachments" style={{ background: '#e8e8e8' }} />
                        </>
                      )}
                  </Fragment>
                )
              }
              const label = f.kind === 'order' ? 'Associated Order #:' : 'label' in f ? f.label : ''
              return (
                <Fragment key={j}>
                  {j > 0 && <span className="pb-row__spacer" />}
                  <Label w={j === 0 ? LABEL_W : undefined}>{label}</Label>
                  <Field f={f} blank={blank} go={go} />
                </Fragment>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export function ManualEntryView({ folder, go }: { folder: ManualEntryFolder; go: ExchangeGo }) {
  const [rows, setRows] = useState<Record<string, string>[]>(folder.rows)
  const [cur, setCur] = useState(0)
  /* a New Record or a duplicate that has not been saved */
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState(folder.tabs?.[0] ?? 'Detail')
  const [distribute, setDistribute] = useState(folder.distribute)
  const [listOpen, setListOpen] = useState(false)
  const [menuAt, setMenuAt] = useState<ContextMenuAt>(null)

  const row = rows[cur]
  /* the sample record shows the capture's values; a new row is blank */
  const blank = !row || !row.patient

  useScreenReport({
    rows: rows.length,
    saved: !dirty,
    ...(listOpen ? { dialog: 'document-attachment-list' } : {}),
  })

  const newRecord = () => {
    setRows((r) => [...r, { ...folder.blank }])
    setCur(rows.length)
    setDirty(true)
    if (folder.tabs) setTab(folder.tabs[0]!)
  }
  const openAttachments = () => {
    const n = clipCount(row)
    if (n > 1) setListOpen(true)
    /* one attachment opens in its own viewer outside MOIS; none raises the
       attach prompt (303488) */
    else go.open('add-attachment')
  }
  useExchangeCommand((command) => {
    if (command === 'attachments') openAttachments()
    if (command === 'save-and-duplicate' && row) {
      setRows((r) => [...r, { ...row, clip: '-' }])
      setCur(rows.length)
      setDirty(true)
    }
  })

  const commands = MANUAL_ENTRY_COMMANDS.map((label) => ({
    label,
    disabled: (label === 'Save' || label === 'Undo') && !dirty,
    onClick:
      label === 'New Record' ? newRecord
      : label === 'Save' ? () => setDirty(false)
      : label === 'Undo' ? () => {
        if (!dirty) return
        setRows((r) => r.slice(0, -1))
        setCur(Math.max(0, rows.length - 2))
        setDirty(false)
      }
      : label === 'Delete Record' ? () => {
        if (!row) return
        setRows((r) => r.filter((_, i) => i !== cur))
        setCur(Math.max(0, cur - 1))
        setDirty(false)
      }
      : label === 'Open Chart' ? () => go.node(folder.chartNode)
      : label === 'Attachment' ? openAttachments
      : undefined,
  }))

  /* the right-click menu over a record — 303388 image f77abdf6 (v02.22.92,
     over Manual Entry - Imaging). The four "Create …" items and View Recalls
     land in the chart's Notifications folder; Mark for Review sends the
     record to My Basket. */
  const byLabel = (label: string) => commands.find((c) => c.label === label)?.onClick
  const contextItems = [
    { label: 'New Record', onSelect: newRecord },
    { label: 'Delete Record', onSelect: byLabel('Delete Record') },
    { label: 'Save Changes', onSelect: () => setDirty(false) },
    { sep: true },
    { label: 'Create Task', onSelect: () => { go.open('create-task') } },
    { label: 'Create Message', onSelect: () => { go.open('create-message') } },
    { label: 'Create Reminder' },
    { label: 'Create Recall', onSelect: () => { go.open('create-recall') } },
    { label: 'View Recalls', onSelect: () => { go.open('patient-recall-list') } },
    { label: 'Mark for Review', onSelect: () => { go.open('mark-for-review') } },
    { label: 'Tag to Care Plan', onSelect: () => { go.open('tag-to-care-plan') } },
    { sep: true },
    { label: 'Attachments', onSelect: openAttachments },
    { sep: true },
    { label: 'Audit Report' },
    { label: 'Access Control' },
    { sep: true },
    { label: 'Workflow Summary' },
  ]

  const columns: PBColumn<Record<string, string>>[] = folder.columns.map((col: ExColumn) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    align: col.align,
    dots: col.dots,
    render: col.key === 'clip'
      ? (r, i) => (
        <span data-tutorial-id={`host.mois.cell.clip-${i}`} onDoubleClick={() => { setCur(i); if (clipCount(r) > 1) setListOpen(true) }}>
          {r.clip}
        </span>
      )
      : undefined,
  }))

  const history = folder.history
  const form = (fields: ExField[]) => (
    <FieldGrid key={`${cur}:${tab}`} fields={fields} blank={blank} clip={row?.clip ?? '-'} folder={folder} go={go} />
  )

  return (
    <>
      <PBViewHeader title={folder.title} />
      <PBCommandRow commands={commands} />

      <div
        style={{ flex: '1 1 auto', minHeight: 90, display: 'flex', padding: '2px 3px', position: 'relative' }}
        onContextMenu={(e) => {
          const tr = (e.target as HTMLElement).closest('tbody tr')
          if (!tr) return
          const i = Array.from(tr.parentElement!.children).indexOf(tr)
          if (i >= 0 && i < rows.length) setCur(i)
          setMenuAt(contextPoint(e))
        }}
      >
        <PBDataWindow
          columns={columns}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          filters={folder.columns.map((col) => (col.dots || col.key === 'clip' ? null : <PBInput w="100%" style={{ height: 17 }} />))}
          rowTutorialId={(r, i) => `host.mois.row.${pbSlug(r.patient ?? '') || `new-record-${i}`}`}
          empty=" "
        />
        <RowContextMenu at={menuAt} items={contextItems} onClose={() => setMenuAt(null)} />
      </div>

      {/* --- the lower half ------------------------------------------------ */}
      <div style={{ flex: 'none', height: 292, display: 'flex', gap: 3, padding: '0 3px 3px' }}>
        <div
          data-tutorial-id="host.mois.group.record"
          /* typing into the record makes the window unsaved again, which is
             what the manual's second Save (303482: "Input the text of the
             report ... Save (F2)") saves */
          onInput={() => setDirty(true)}
          style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}
        >
          {folder.tabs ? (
            <PBTabs tabs={folder.tabs} active={tab} onChange={setTab} compact>
              {tab === 'Detail' && folder.detail ? form(folder.detail) : form(folder.fields)}
            </PBTabs>
          ) : (
            <div className="pb-groupbox" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <PBBand>Detail</PBBand>
              {form(folder.fields)}
              {folder.footer && (
                <div className="pb-row" style={{ padding: '0 8px 4px', gap: 8 }}>
                  <span>{folder.footer}</span>
                  {!blank && <span>{folder.node === 'dx-orders' ? '2018.11.05  13:26  ADMINISTRATOR' : '2015.03.19  15:06  z AIHS KSAMWAYS'}</span>}
                  <span className="pb-row__spacer" />
                  {folder.node === 'dx-documents' && <span>Last Modified:</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ width: 272, flex: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {history && (
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.history" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <PBBand>History (+/- 15 days from discharged date)</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow flush gutter={false} rows={[]} columns={history} empty=" " />
              </div>
            </div>
          )}
          <div
            className="pb-groupbox"
            data-tutorial-id="host.mois.group.distribute-to"
            style={{ flex: history ? 'none' : '1 1 auto', height: history ? 118 : undefined, display: 'flex', flexDirection: 'column' }}
          >
            <PBBand right={(
              <>
                <PBButton size="sm" data-tutorial-id="host.mois.command.distribute-new" onClick={() => setDistribute((d) => [...d, ''])}>New</PBButton>
                <PBButton size="sm" data-tutorial-id="host.mois.command.distribute-delete" onClick={() => setDistribute((d) => d.slice(0, -1))}>Delete</PBButton>
              </>
            )}>
              Distribute To
            </PBBand>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                rows={distribute.map((user) => ({ user }))}
                columns={[{ key: 'user', header: 'User Name' }]}
                empty=" "
              />
            </div>
          </div>
        </div>
      </div>

      {listOpen && <DocumentAttachmentListWindow onClose={() => setListOpen(false)} />}
    </>
  )
}

/* ===========================================================================
   Document / Attachment List — 303489 image b5550316.

   What `Attachment` opens on a record carrying more than one attachment.
   One row per attachment; double-click its paper clip or press Open
   Attachment to view it. What is edited here is the attachment's own
   record in the patient's Documents folder.
   ======================================================================== */
export function DocumentAttachmentListWindow({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState(1)
  const picked = ATTACHMENT_LIST_ROWS[cur]
  const field = (label: string, value: string, w: number | string) => (
    <>
      <span className="pb-form__label">{label}</span>
      <PBInput w={w} defaultValue={value} />
    </>
  )
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60, placeItems: 'start center', paddingTop: 36 }}>
      <PBWindow
        child
        controls={false}
        title="Document / Attachment List"
        onClose={onClose}
        tutorialId="host.mois.dialog.document-attachment-list"
        style={{ width: 'min(826px, calc(100% - 12px))', height: 'min(596px, calc(100% - 44px))' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <PBCommandRow
            commands={ATTACHMENT_LIST_COMMANDS.map((label) => ({ label }))}
            right={<PBButton data-tutorial-id="host.mois.command.close" onClick={onClose}>Close</PBButton>}
          />
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
            <PBDataWindow
              rows={ATTACHMENT_LIST_ROWS}
              current={cur}
              onCurrentChange={setCur}
              columns={ATTACHMENT_LIST_COLUMNS.map((col) => ({
                key: col.key, header: col.header, width: col.width, align: col.align,
                render: col.key === 'clip'
                  ? (r: Record<string, string>, i: number) => (
                    <span data-tutorial-id={`host.mois.cell.attachment-clip-${i}`} style={{ border: '1px solid #c00', padding: '0 3px' }}>{r.clip}</span>
                  )
                  : col.key === 's' ? () => <input type="checkbox" readOnly checked={false} />
                  : undefined,
              }))}
            />
          </div>
          <div className="pb-form" style={{ flex: 'none', gridTemplateColumns: 'auto 1fr auto 1fr', padding: '6px 8px', gap: '3px 8px' }}>
            {field('Note:', picked?.note === 'MAGNETIC RESONA' ? 'MAGNETIC RESONANCE IMAGING OF HIP' : '', 300)}
            <span className="pb-form__label">File Name:</span><span>{picked?.file}</span>
            {field('Sent To:', 'DR. MOIS', 300)}
            {field('Facility:', '', 130)}
            {field('Transcribed:', '', 140)}
            {field('Facility Loc.:', '', 130)}
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '0 8px 4px', flex: 'none', height: 110 }}>
            <span className="pb-form__label">Comment:</span>
            <PBTextArea defaultValue="This is the report text." style={{ flex: '1 1 auto', resize: 'none' }} />
          </div>
          <div className="pb-row" style={{ padding: '2px 8px 6px', gap: 30 }}>
            <span>Source:&nbsp;&nbsp;&nbsp;SYSTEM</span>
            <span>Sent Date: 2014.12.04</span>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
