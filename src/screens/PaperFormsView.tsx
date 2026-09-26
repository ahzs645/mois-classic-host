import { useEffect, useState, type ReactNode } from 'react'
import { useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import type { ReportScreen } from '../data/reportScreens'
import { registerScreenWindows, useScreenWindow } from '../host/screen-windows'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput, PBLookup, PBTextArea, PBViewHeader,
  type PBColumn, type PBCommand,
} from '../pb'
import { MoisViewerWindow, paperFormPageSize } from './MoisViewerWindow'
import { useRecordOptionList } from './RecordOptionList'
import { SignatureLink, recordKeyOf, useReportRecordEdits } from './reportRecordEdits'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   Patient Chart ▸ Forms ▸ Paper Forms.

   PROVENANCE: user capture 2026-09-25 #1 (v02.31.23), chart 10006.
   · Navy band "Paper Forms" with the chart identity at the right; Task Bar
     New Record · Delete Record · Save · Undo · Refresh · Print; the FIRST /
     MIDDLE / LAST / DoB / Active ENC# strip; "Search For:" with its "…".
   · Grid: Date · Author · Document Type · Form Name · S (a check box) · M
     (the ⇩ glyph) · the paper clip (a count). Captions centred; Author,
     Document Type and Form Name cells left-aligned; Date centred.
   · No tabs and no acknowledgement rail. The detail is one face-grey form:
     left, labels left-aligned — Note: · Attending: … · Author: … ·
     Responsible Org.: … · Transcribed: [box] Date: [date][time] · Service
     Event: …; right, labels right-aligned — "File Name: <file>.pdf" over
     Primary Recipient: … · Copies To: … · Facility: · Facility Ref.: ·
     Facility Loc.:; then Comment:, a tall box running the full width.
   · Footer: "Source: SYSTEM   Sent Date: <date>   -" with the blue UNSIGNED
     link at the right; "Created: <date> <hh:mm> <user>" with a blue "ENC#
     EMPTY" link at the right. No "Code:" caption and no "Last Modified".
     The lone "-" is the record's code and description (both blank there);
     the Source reads the record's interface (SYSTEM), not its table.
   · Double-clicking a row opens the form in "MOIS Viewer (Embedded)" (user
     captures #2–#17; screens/MoisViewerWindow.tsx).

   Sent Date: the export carries no send date for a paper form, and #1's
   equals the row's date, so the record's date stands in.

   Opening the viewer by name: `host.mois.openUtility {window: 'mois-viewer',
   node: 'paper', index?}` — or `host.mois.activateRow {row: 'paper-<n>'}`.
   Reported: host.dialog = mois-viewer while it is open (from the viewer).
   ========================================================================= */

export const PAPER_VIEWER_WINDOW = 'mois-viewer'
registerScreenWindows([PAPER_VIEWER_WINDOW])

type Row = Record<string, string>

const COLUMNS: PBColumn<Row>[] = [
  { key: 'date', header: 'Date', width: 84, align: 'center' },
  { key: 'author', header: 'Author', width: 102, headAlign: 'center' },
  { key: 'type', header: 'Document Type', width: 128, headAlign: 'center' },
  { key: 'form', header: 'Form Name', headAlign: 'center' },
  { key: 's', header: 'S', width: 22, align: 'center', render: (r) => <PBCheckbox checked={r.s === '✓'} /> },
  { key: 'm', header: 'M', width: 22, align: 'center' },
  { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
]

const dot = (v?: string) => (v ?? '').replace(/\//g, '.')
/** #1's Created line: date, hours and minutes, user. */
const created = (r?: MoisRecord) => {
  if (!r) return ''
  const [date = '', time = ''] = (r.stp_date_create ?? '').split(' ')
  return [dot(date), time.slice(0, 5), r.stp_user_create].filter(Boolean).join('  ')
}

const Label = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <span style={{ lineHeight: '21px', whiteSpace: 'nowrap', textAlign: right ? 'right' : 'left' }}>{children}</span>
)

function PaperDetail({ record }: { record: MoisRecord | undefined }) {
  const v = (k: string) => record?.[k] ?? ''
  const file = /\.pdf$/i.test(v('str_link')) ? v('str_link') : ''
  /* remount on a new record so the uncontrolled boxes take its values */
  const k = record?.id_document ?? 'new'
  return (
    <div
      key={k}
      style={{
        display: 'grid', gridTemplateColumns: '104px minmax(0, 352px) minmax(12px, 1fr) auto minmax(0, 305px)',
        gridAutoRows: 'minmax(23px, auto)', columnGap: 4, alignItems: 'center', padding: '6px 10px 4px',
      }}
    >
      <Label>Note:</Label>
      <PBInput w="100%" defaultValue={v('str_note')} />
      <span />
      <span style={{ gridColumn: '4 / span 2', textAlign: 'right' }} data-tutorial-id="host.mois.field.paper-file-name">
        {file && <>File Name: {file}</>}
      </span>

      <Label>Attending:</Label>
      <PBLookup w="100%" defaultValue={v('str_attending')} name="attending" />
      <span />
      <Label right>Primary Recipient:</Label>
      <PBLookup w="100%" defaultValue={v('str_sent_to')} name="primary-recipient" />

      <Label>Author:</Label>
      <PBLookup w="100%" defaultValue={v('str_author')} name="author" />
      <span />
      <Label right>Copies To:</Label>
      <PBLookup w="100%" defaultValue={v('str_copy_to')} name="copies-to" />

      <Label>Responsible Org.:</Label>
      <PBLookup w="100%" defaultValue={v('str_responsible_org')} name="responsible-org" />
      <span />
      <Label right>Facility:</Label>
      <PBInput w="100%" defaultValue={v('str_facility')} />

      <Label>Transcribed:</Label>
      <div className="pb-row" style={{ gap: 4 }}>
        <PBInput w={168} defaultValue={v('str_transcribed_by')} />
        <span style={{ marginLeft: 12 }}>Date:</span>
        <PBInput w={82} align="center" defaultValue={dot(v('dtm_transcribed'))} />
        <PBInput w={46} align="center" />
      </div>
      <span />
      <Label right>Facility Ref.:</Label>
      <PBInput w="100%" defaultValue={v('str_filler_ref_no')} />

      <Label>Service Event:</Label>
      <PBLookup w="100%" name="service-event" />
      <span />
      <Label right>Facility Loc.:</Label>
      <PBInput w="100%" defaultValue={v('str_facility_loc')} />

      <span style={{ alignSelf: 'start', lineHeight: '21px' }}>Comment:</span>
      <PBTextArea rows={9} w="100%" defaultValue={v('str_comment')} style={{ gridColumn: '2 / span 4', resize: 'none' }} />
    </div>
  )
}

export function PaperFormsView({ screen, node = 'paper' }: { screen: ReportScreen; node?: string }) {
  const patient = usePatient()
  const records = useNodeRecords(node)
  const [cur, setCur] = useState(0)
  const edits = useReportRecordEdits(node, screen.rows, records, cur, setCur)
  const record = edits.records[cur]
  const viewer = useScreenWindow()
  const viewing = viewer.is(PAPER_VIEWER_WINDOW)

  /* opened by name with a row index: make that row current first */
  const askedIndex = viewing && typeof viewer.window?.args?.index === 'number' ? viewer.window.args.index : null
  useEffect(() => {
    if (askedIndex !== null && askedIndex >= 0 && askedIndex < edits.rows.length) setCur(askedIndex)
  }, [askedIndex, edits.rows.length])

  const commands: PBCommand[] = edits.commands(screen.commands.map((c) => (c === null ? null : { label: c, disabled: screen.disabled?.includes(c) })))
  const options = useRecordOptionList({ node, record, commands, setCur })
  const recordKey = recordKeyOf(patient.chart, node, record)
  const code = `${record?.str_facility_code ?? ''} - ${record?.str_facility_description ?? ''}`.trim()
  const encounter = record?.id_encounter && record.id_encounter !== '-1' && record.id_encounter !== '0' ? record.id_encounter : ''

  return (
    <>
      <PBViewHeader title={screen.title} right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={commands} />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />
      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      <div onContextMenu={options.active ? options.onContextMenu : undefined} style={{ padding: '0 3px', height: 272, flex: 'none', display: 'flex', position: 'relative' }}>
        <PBDataWindow
          columns={COLUMNS}
          rows={edits.rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_r, i) => { setCur(i); if (edits.records[i]) viewer.open(PAPER_VIEWER_WINDOW, { index: i }) }}
          rowTutorialId={options.rowTutorialId}
          empty="No paper forms on file."
        />
        {options.menu}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '4px 3px 0', background: 'var(--pb-face)', border: '1px solid var(--pb-border)', overflow: 'auto' }}>
        <PaperDetail record={record} />
      </div>

      {/* #1's two footer lines */}
      <div className="pb-row" style={{ padding: '2px 8px 0', gap: 0 }}>
        <span style={{ width: 88 }}>Source:</span>
        <span style={{ width: 122 }}>{record?.str_interface ?? ''}</span>
        <span>Sent Date:&nbsp;</span><span style={{ width: 150 }}>{dot(record?.dtm_sent ?? record?.dtm_date)}</span>
        <span>{record ? code : ''}</span>
        <span className="pb-row__spacer" />
        {/* a record MOIS holds as SIGNED starts signed; SignatureLink starts
            signed only for an interface source */}
        <SignatureLink key={recordKey} recordKey={recordKey} source={record?.stp_record_state === 'SIGNED' ? 'INTERFACE' : record?.str_interface} hidden={!record} />
      </div>
      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 0 }}>
        <span style={{ width: 88 }}>Created:</span>
        <span>{created(record)}</span>
        <span className="pb-row__spacer" />
        {record && <button type="button" className="pb-link" data-tutorial-id="host.mois.command.paper-encounter">ENC# {encounter || 'EMPTY'}</button>}
      </div>

      {options.windows}
      {viewing && record && (
        <DesktopLayer>
          <MoisViewerWindow
            key={record.id_document ?? cur}
            embedded
            form={record.str_note ?? record.str_source_code ?? ''}
            fileName={record.str_link}
            pageSize={paperFormPageSize(record.str_note ?? '')}
            onClose={viewer.close}
          />
        </DesktopLayer>
      )}
    </>
  )
}
