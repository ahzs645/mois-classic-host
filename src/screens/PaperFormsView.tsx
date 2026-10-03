import { useEffect, useState, type ReactNode } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import { providerLabel } from '../data/charts/providers'
import type { MoisRecord } from '../data/charts'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import type { ReportScreen } from '../data/reportScreens'
import { registerScreenWindows, useScreenWindow } from '../host/screen-windows'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBTextArea, PBViewHeader,
  type PBColumn, type PBCommand,
} from '../pb'
import { FormLabel } from './formKit'
import { MoisViewerWindow, paperFormPageSize } from './MoisViewerWindow'
import { ChartIdentityStrip } from './patientKit'
import { useRecordOptionList } from './RecordOptionList'
import { SignatureLink, recordKeyOf, useReportRecordEdits } from './reportRecordEdits'
import { DesktopLayer } from './StageWindow'
import { useSystemSetting } from '../data/accessSettings'

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
     (MOIS DEV, evidence/MATRIX-R1016-date, does caption a code it has:
     "Code:  11488-4 - Encounter Summary".)
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

/* widths from MOIS DEV v02.31.23, evidence/MATRIX-R1016-date (1x); Form
   Name fills the rest, as it does there */
const COLUMNS: PBColumn<Row>[] = [
  { key: 'date', header: 'Date', width: 73, align: 'center' },
  { key: 'author', header: 'Author', width: 92, headAlign: 'center' },
  { key: 'type', header: 'Document Type', width: 127, headAlign: 'center' },
  { key: 'form', header: 'Form Name', headAlign: 'center' },
  { key: 's', header: 'S', width: 21, align: 'center', render: (r) => <PBCheckbox checked={r.s === '✓'} /> },
  { key: 'm', header: 'M', width: 17, align: 'center' },
  { key: 'clip', header: '\u{1F4CE}', width: 17, align: 'center' },
]

const dot = (v?: string) => (v ?? '').replace(/\//g, '.')
/** #1's Created line: date, hours and minutes, user. */
const created = (r?: MoisRecord) => {
  if (!r) return ''
  const [date = '', time = ''] = (r.stp_date_create ?? '').split(' ')
  return [dot(date), time.slice(0, 5), r.stp_user_create].filter(Boolean).join('  ')
}

const Label = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <FormLabel className={false} flex={false} style={{ lineHeight: '17px', whiteSpace: 'nowrap' }} align={right ? 'right' : 'left'}>{children}</FormLabel>
)

/* The detail form's geometry as MOIS DEV v02.31.23 draws it
   (evidence/MATRIX-R1016-date, MATRIX-R1024-note, 1x): six lines on a 20px
   pitch, the first box 10px under the frame; the left boxes 93px in, the
   lookups 323 wide and Note 306; the right boxes 267 wide; Transcribed 146 · Date 71 · time 41; Comment under them, out to
   the right edge and down to the frame's foot. */
/* Each box reads the tdt_document column Ctrl+Shift+A resolves on the
   v02.31.23 Paper Forms detail (data dictionary, Forms ▸ Detail Window):
     Note R1024 str_note · Attending R1025 str_attending · Author R1026
     str_author · Responsible Org. R1027 str_responsible_org · Transcribed
     R1028 str_transcriptionist, its Date R1029 dtm_transcribed_date ·
     Primary Recipient R1031 str_primary_recipient · Copies To R1032
     str_sent_to · Facility R1033 str_facility · Facility Ref. R1034
     str_filler_ref_no · Facility Loc. R1035 str_facility_loc.
   The workbook's "Diag Descr" (R1030, str_diag_desc) has no caption of its
   own: its evidence capture (MATRIX-R1030-diag-descr) has the cursor in the
   Service Event box, and the Documents folder's twin (MATRIX-R0811,
   "the visible MOIS label is Service Event") says the same — so the
   Service Event box shows the diagnosis description.
   Responsible Org.: the export prints the name beside the id; with only the
   id (id_responsible_org / str_responsible_org_id) the export's provider
   directory names it (data/charts/providers.ts). */
function PaperDetail({ record }: { record: MoisRecord | undefined }) {
  const data = useChartExport()
  const v = (k: string) => record?.[k] ?? ''
  const responsibleOrg = v('str_responsible_org') || providerLabel(data, record?.id_responsible_org ?? record?.str_responsible_org_id)
  const [transcribedDate = '', transcribedTime = ''] = v('dtm_transcribed_date').split(' ')
  const file = /\.pdf$/i.test(v('str_link')) ? v('str_link') : ''
  /* remount on a new record so the uncontrolled boxes take its values */
  const k = record?.id_document ?? 'new'
  return (
    <div
      key={k}
      style={{
        display: 'grid', gridTemplateColumns: '89px minmax(0, 323px) minmax(0, 1fr) auto minmax(0, 267px)',
        gridTemplateRows: 'repeat(6, 20px) minmax(60px, 1fr)', columnGap: 4, alignItems: 'center',
        /* DEV's frame is ~10px wider than this pane, so the right margin
           gives way first */
        padding: '8px 4px 5px 10px', flex: '1 1 auto', minHeight: 0,
      }}
    >
      <Label>Note:</Label>
      <PBInput w={306} defaultValue={v('str_note')} />
      <span />
      <span style={{ gridColumn: '4 / span 2', textAlign: 'right' }} data-tutorial-id="host.mois.field.paper-file-name">
        {file && <>File Name: {file}</>}
      </span>

      <Label>Attending:</Label>
      <PBLookup w="100%" defaultValue={v('str_attending')} name="attending" />
      <span />
      <Label right>Primary Recipient:</Label>
      <PBLookup w="100%" defaultValue={v('str_primary_recipient')} name="primary-recipient" />

      <Label>Author:</Label>
      <PBLookup w="100%" defaultValue={v('str_author')} name="author" />
      <span />
      <Label right>Copies To:</Label>
      <PBLookup w="100%" defaultValue={v('str_sent_to')} name="copies-to" />

      <Label>Responsible Org.:</Label>
      <PBLookup w="100%" defaultValue={responsibleOrg} name="responsible-org" />
      <span />
      <Label right>Facility:</Label>
      <PBInput w="100%" defaultValue={v('str_facility')} />

      <Label>Transcribed:</Label>
      <div className="pb-row" style={{ gap: 4 }}>
        <PBInput w={146} defaultValue={v('str_transcriptionist')} />
        <span style={{ marginLeft: 12 }}>Date:</span>
        <PBInput w={71} align="center" defaultValue={dot(transcribedDate)} />
        <PBInput w={41} align="center" style={{ marginLeft: -1 }} defaultValue={transcribedTime.slice(0, 5)} />
      </div>
      <span />
      <Label right>Facility Ref.:</Label>
      <PBInput w="100%" defaultValue={v('str_filler_ref_no')} />

      <Label>Service Event:</Label>
      <PBLookup w="100%" defaultValue={v('str_diag_desc')} name="service-event" />
      <span />
      <Label right>Facility Loc.:</Label>
      <PBInput w="100%" defaultValue={v('str_facility_loc')} />

      <span style={{ alignSelf: 'start', lineHeight: '17px', marginTop: 4 }}>Comment:</span>
      <PBTextArea w="100%" defaultValue={v('str_comment')} style={{ gridColumn: '2 / span 4', resize: 'none', alignSelf: 'stretch', height: 'auto', marginTop: 4 }} />
    </div>
  )
}

export function PaperFormsView({ screen, node = 'paper' }: { screen: ReportScreen; node?: string }) {
  const patient = usePatient()
  const viewerMode = useSystemSetting('MOIS Viewer Mode').toUpperCase()
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
      <ChartIdentityStrip search />

      <div onContextMenu={options.active ? options.onContextMenu : undefined} style={{ padding: '0 3px', height: 272, flex: 'none', display: 'flex', position: 'relative' }}>
        <PBDataWindow
          columns={COLUMNS}
          rows={edits.rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_r, i) => { setCur(i); if (edits.records[i]) viewer.open(PAPER_VIEWER_WINDOW, { index: i }) }}
          rowTutorialId={options.rowTutorialId}
          /* an empty folder is the grid's white body (imaging-empty-screen.png) */
          empty={false}
        />
        {options.menu}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '4px 3px 0', background: 'var(--pb-face)', border: '1px solid var(--pb-border)', overflow: 'auto' }}>
        <PaperDetail record={record} />
      </div>

      {/* #1's two footer lines, spaced as MOIS DEV prints them
          (evidence/MATRIX-R1016-date: captions 11px in, values 76px after
          them, Sent Date 107px after the source, Code 142px after that).
          DEV captions the code `Code:` where the record has one ("11488-4 -
          Encounter Summary"); #1, with none, printed the bare "-". */}
      <div className="pb-row" style={{ padding: '2px 8px 0 14px', gap: 0 }}>
        <span style={{ width: 76 }}>Source:</span>
        <span style={{ width: 107 }}>{record?.str_interface ?? ''}</span>
        <span>Sent Date:&nbsp;</span><span style={{ width: 86 }}>{dot(record?.dtm_sent ?? record?.dtm_date)}</span>
        <span>{!record ? '' : code === '-' ? code : <><span style={{ display: 'inline-block', width: 36 }}>Code:</span>{code}</>}</span>
        <span className="pb-row__spacer" />
        {/* a record MOIS holds as SIGNED starts signed; SignatureLink starts
            signed only for an interface source */}
        <SignatureLink key={recordKey} recordKey={recordKey} source={record?.stp_record_state === 'SIGNED' ? 'INTERFACE' : record?.str_interface} hidden={!record} />
      </div>
      <div className="pb-row" style={{ padding: '0 8px 4px 14px', gap: 0 }}>
        <span style={{ width: 76 }}>Created:</span>
        <span>{created(record)}</span>
        <span className="pb-row__spacer" />
        {record && <PBButton bare className="pb-link" command="paper-encounter">ENC# {encounter || 'EMPTY'}</PBButton>}
      </div>

      {options.windows}
      {viewing && record && (
        <DesktopLayer>
          <MoisViewerWindow
            key={record.id_document ?? cur}
            /* 3073634: System Settings ▸ APP SETTING ▸ MOIS Viewer Mode — E
               (Embedded) or SI (both) open the embedded viewer with its Find
               bar; S (Standalone) opens the plain viewer. The row belongs to
               the System Settings window (data/systemSettings.ts); the
               restart the article asks for is not modelled — the next form
               opened reads the saved value. */
            embedded={viewerMode !== 'S'}
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
