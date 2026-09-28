import { useMemo, useState, type CSSProperties } from 'react'
import {
  ACK_HISTORY_SEED, BASKET_ORDERS, IR_CODES, MEASURE_GOALS, MEASURE_HISTORY, ORDER_STATUSES,
  basketFolderById, basketFolders, rowOwners, type BasketRow,
} from '../data/basket'
import { PatientOverride, usePatientRoster } from '../data/patient-context'
import { MOIS_TODAY, type Patient } from '../data/patients'
import type { PrintReport } from '../data/printReports'
import { CURRENT_USER, TASK_PRIORITIES, taskScreenByNode, type TaskRow } from '../data/tasks'
import { useWorkspaceExtras, workspaceExtras } from '../data/workspaceExtras'
import type { AdvancedSearchField } from '../data/workspaceSearch'
import { basketKey, useWorkspaceStore } from '../data/workspaceStore'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBInput, PBPatientBannerYellow,
  PBRadio, PBSelect, PBTextArea, pbSlug, type PBMenuItem,
} from '../pb'
import { MeasurementGraphWindow } from './MeasurementGraphWindow'
import { RichtextReportWindow } from './PrintFlow'
import { taskRowSlug } from './TaskListView'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { ContextMenu } from './scheduler/DaybookMenus'
import { DialogButton, FormBand, WorkspaceDialogFrame } from './WorkspaceDialogFrame'
import { RaisedMessageBox } from './RaisedMessageBox'

/* ============================================================================
   The Workspace Basket's own windows, and the Workspace-wide utilities.

   PROVENANCE:
   · basket-row-menu            the right-click menu — 1802749 `2805acd3…`
                                (v02.21: Create Task, Create Message, Create
                                Reminder, Create Recall, View Recalls,
                                Attachments | Workflow Summary, Open Chart),
                                plus Show History in Measures ("A seventh
                                option … for Show History").
   · zoom-text                  Text Capture Window — 1802749 `137d7d56…`:
                                "Zoom Text  READ ONLY", the report in a large
                                font, Remove Line Breaks… | Save (F2) (grey) |
                                Cancel | Spelling… (grey). Alt+Z once puts the
                                cursor in Report, twice opens it.
   · basket-print               Print — 1802749 `59b0cc32…` / `3be2852e…`:
                                a record with an attachment asks which to
                                print (INFERRED wording: "MOIS will prompt you
                                to print either the MOIS Report, the
                                attachment, or the electronic interface
                                report"); the MOIS report opens the Richtext
                                Report (Print, Print and Attach, Fax,
                                Cancel). An Order without an Order Type first
                                asks for one: Print Order ▸ Please Select an
                                Order Type (1802763 `d86d53f9…`).
   · basket-order-link          Order Linking Service — 1802749 `a31c8698…`
                                (the Report tab's Order # "…") and
                                `6a620b43…`: Chart / Patient / DoB / Sex /
                                Insurance strip; Date | Order By | Referral /
                                Facility | Description | Detail | Status ▾ |
                                Priority | Links; the Comment box; Link /
                                Cancel. The Status drop-down lists the HL7
                                statuses of 1802763.
   · basket-measure-history     Measure History from the basket — 1802749
                                `5bb2702c…` (2.22: Goal(s) beside Selected
                                Item Detail, Related Measurements with Add to
                                Comment, Graph, Save (F2) / Cancel).
   · basket-measure-graph       the Graph: the chart's gnuplot window
                                (MeasurementGraphWindow) over the basket
                                patient.
   · basket-workflow-summary    Workflow Summary on a basket record — 1802768
                                `13dd06a5…`, `efa3344d…` (MESSAGES),
                                `0d5d1376…` (TASKS, with FOLLOW UP NOTES),
                                `e95f848f…` (ACKNOWLEDGEMENTS, CHECKED (by),
                                IR: Copied From User), `3d36d71e…`
                                (REASSIGNED … note), `9a1ef52e…` (MARKED FOR
                                REVIEW / [REVIEWED] note), `8d74e6a0…`
                                (inbox forwarding), `d01b1196…` / `97cebbed…`
                                (backlog).
   · advanced-search            Advanced Search — 1802744 `79f934dc…`:
                                "Searchable Fields" with a box per field, a
                                blue * on the default search fields and the
                                footnote, Ok / Cancel. Each basket folder's
                                page lists its own fields.
   · clean-list                 Action ▸ Clean List (303599). INFERRED
                                result message (no capture).
   · report-ack-forwarding / report-ack-intended-recipient
                                Print ▸ Basket Statistics… (303599): a
                                Parameter window (creation date range, the
                                user, Send to Excel) and the report in the
                                Print Preview. INFERRED layout.
   · follow-up-note             a Task's Follow Up Note — 1802744 `d5b7a079…`
                                (New / Delete on the tab; double-click or
                                Alt+Z opens a note; "the Modified By details
                                … at the bottom of the opened Note window").
                                INFERRED window layout.
   ========================================================================= */

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Every basket record's patient, as the basket prints them (`LAST, FIRST`). */
function patientOf(name: string, roster: Patient[], chart?: string): Patient {
  const [last = '', first = ''] = name.split(',').map((s) => s.trim())
  const hit = roster.find((p) => (chart && p.chart === chart) || (p.last.toUpperCase() === last && p.first.toUpperCase() === first))
  return hit ?? ({ chart: chart ?? '', status: 'A', first, middle: '', last, dob: '', gender: '' } as Patient)
}

/* ---------------------------------------------------------------------------
   Right-click menu
   ------------------------------------------------------------------------ */
function BasketRowMenu({ args, close, open }: AreaWindowProps) {
  const folder = str(args.folder)
  const go = (id: string, a?: Record<string, unknown>) => () => { if (!open(id, a)) close() }
  const openChart = typeof args.openChart === 'function' ? (args.openChart as () => void) : null
  const items: PBMenuItem[] = [
    { label: 'Create Task', onSelect: go('create-task', args) },
    { label: 'Create Message', onSelect: go('create-message', args) },
    { label: 'Create Reminder', onSelect: go('create-recall', { ...args, title: 'Create Reminder' }) },
    { label: 'Create Recall', onSelect: go('create-recall', args) },
    { label: 'View Recalls', onSelect: go('patient-recall-list', args) },
    { label: 'Attachments', onSelect: go('basket-attachments', args) },
    ...(folder === 'ws-measures' ? [{ label: 'Show History', onSelect: go('basket-measure-history', args) }] : []),
    { sep: true },
    { label: 'Workflow Summary', onSelect: go('basket-workflow-summary', args) },
    { label: 'Open Chart', onSelect: () => { close(); openChart?.() } },
  ]
  return <ContextMenu menu="basket" items={items} args={args} close={close} />
}

/* ---------------------------------------------------------------------------
   Text Capture Window (Zoom Text)
   ------------------------------------------------------------------------ */
function ZoomText({ args, close }: AreaWindowProps) {
  const [text, setText] = useState(str(args.text))
  useScreenReport({ lineBreaks: /\n/.test(text) })
  return (
    <WorkspaceDialogFrame id="zoom-text" title="Text Capture Window" width={1000} height={760} onClose={close} controls={false} zIndex={88}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '8px 10px 0', border: '1px solid #c8c8c8', padding: '0 8px 8px' }}>
        <div className="pb-row" style={{ gap: 30, padding: '4px 0', fontWeight: 700, flex: 'none' }}><span>Zoom Text</span><span>READ ONLY</span></div>
        <textarea
          readOnly
          value={text}
          data-tutorial-id="host.mois.field.zoom-text"
          style={{ flex: '1 1 auto', resize: 'none', fontSize: 17, lineHeight: 1.35, padding: 10, fontFamily: 'Segoe UI, Tahoma, sans-serif', border: '1px solid #b8b8b8' }}
        />
      </div>
      <div className="pb-row" style={{ gap: 0, padding: '10px', flex: 'none' }}>
        <DialogButton id="zoom-remove-line-breaks" width={150} onClick={() => setText((t) => t.replace(/\s*\n\s*/g, ' '))}>Remove Line Breaks...</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id="zoom-save" width={100} disabled>Save (F2)</DialogButton>
        <span style={{ width: 16 }} />
        <DialogButton id="zoom-cancel" width={100} onClick={close} isDefault>Cancel</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id="zoom-spelling" width={100} disabled>Spelling...</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Print
   ------------------------------------------------------------------------ */
const ORDER_TYPES = ['Consultation', 'Miscellaneous', 'Lab', 'Intervention', 'Procedure', 'Image']

const REPORT_TITLES: Record<string, [string, string]> = {
  'ws-measures': ['Patient Measurement Record', 'MEASUREMENT RECORD'],
  'ws-imaging': ['Patient Imaging Record', 'IMAGING RECORD'],
  'ws-consults': ['Patient Consult Record', 'CONSULT RECORD'],
  'ws-procedures': ['Patient Procedure Record', 'PROCEDURE RECORD'],
  'ws-documents': ['Patient Document Record', 'DOCUMENT RECORD'],
  'ws-admissions': ['Patient Facility Admission Record', 'FACILITY ADMISSION RECORD'],
  'ws-progress': ['Patient Progress Note', 'PROGRESS NOTE'],
  'ws-orders': ['Patient Order', 'ORDER'],
}

function reportPage(folderId: string, r: BasketRow, p: Patient, orderType: string): string {
  const folder = basketFolderById(folderId)
  const [, heading] = REPORT_TITLES[folderId] ?? ['', 'RECORD']
  const fields = [...(folder?.report.left ?? []), ...(folder?.report.right ?? [])]
    .map(([label, key]) => [label.replace(/:$/, '').toUpperCase(), key === 'valueUnits' ? [r.value, r.units].filter(Boolean).join(' ') : key === 'orderType' ? orderType : String(r[key] ?? '')] as const)
    .filter(([, v]) => v)
  return [
    `%G%HALLIWELL MEDICAL CLINIC                                   ${heading} AS OF ${MOIS_TODAY.replace(/\./g, '-')}`,
    '%RULE%',
    `**PATIENT : ${r.patient}**                         DOB: **${p.dob}**  SEX: **${p.gender}**`,
    `INS NO. : ${p.insuranceBy ?? 'BC'}  ${p.insurance ?? ''}          CHART: **${p.chart}**`,
    '',
    `**${heading.replace(' RECORD', '')} REPORT:**`,
    '%RULE%',
    ...fields.map(([k, v]) => `${k.padEnd(22)} ${v}`),
    '',
    ...String(r.report ?? '').split('\n'),
  ].join('\n')
}

function BasketPrint({ args, close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const extras = useWorkspaceExtras()
  const folderId = str(args.folder)
  const row = args.row as BasketRow | undefined
  const key = row ? basketKey(folderId, String(row.patient)) : ''
  const needsType = folderId === 'ws-orders' && !!row && !row.orderType && !extras.orderTypes[key]
  const hasAttachment = Number(args.attachments ?? 0) > 0
  const [stage, setStage] = useState<'type' | 'choose' | 'report' | 'attachment'>(needsType ? 'type' : hasAttachment ? 'choose' : 'report')
  const [type, setType] = useState(ORDER_TYPES[0]!)
  useScreenReport({ window: stage === 'type' ? 'print-order' : stage === 'choose' ? 'print-choice' : stage === 'attachment' ? 'attachment-viewer' : 'richtext-report' })
  if (!row) return null
  const p = patientOf(String(row.patient), roster, str(args.chart))
  if (stage === 'type') {
    return (
      <WorkspaceDialogFrame id="print-order" title="Print Order" width={506} height={335} onClose={close} controls={false} zIndex={88}>
        <div style={{ margin: 10, border: '1px solid #a0a0a0', background: '#fff', flex: '1 1 auto' }}>
          <FormBand>Please Select an Order Type</FormBand>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px' }}>
            {ORDER_TYPES.map((t) => <PBRadio key={t} name="print-order-type" label={t} checked={type === t} onChange={() => setType(t)} tutorialId={`host.mois.field.order-type-${pbSlug(t)}`} />)}
          </div>
        </div>
        <div className="pb-row" style={{ gap: 10, padding: '0 0 12px', justifyContent: 'center', flex: 'none' }}>
          <DialogButton id="print-order-ok" onClick={() => { workspaceExtras.setOrderType(key, type); setStage(hasAttachment ? 'choose' : 'report') }} isDefault>Ok</DialogButton>
          <DialogButton id="print-order-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>
    )
  }
  if (stage === 'choose') {
    return (
      <WorkspaceDialogFrame id="print-choice" title="Print" width={420} height={190} onClose={close} controls={false} zIndex={88}>
        <div style={{ padding: '20px 20px 0', flex: '1 1 auto', background: '#fff' }}>
          This record has an attachment. What would you like to print?
        </div>
        <div className="pb-row" style={{ gap: 8, padding: '12px', justifyContent: 'flex-end', flex: 'none', background: '#fff' }}>
          <DialogButton id="print-mois-report" width={110} onClick={() => setStage('report')} isDefault>MOIS Report</DialogButton>
          <DialogButton id="print-attachment" width={110} onClick={() => setStage('attachment')}>Attachment</DialogButton>
          <DialogButton id="print-choice-cancel" width={80} onClick={close}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>
    )
  }
  if (stage === 'attachment') {
    return (
      <RaisedMessageBox title="MOIS" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={close}>
        <span data-tutorial-id="host.mois.dialog.attachment-sent">The attachment was sent to the printer.</span>
      </RaisedMessageBox>
    )
  }
  const [title] = REPORT_TITLES[folderId] ?? ['Patient Record']
  const report: PrintReport = {
    menu: 'Print', title, fields: [], reportTitle: title, captured: false,
    page: reportPage(folderId, row, p, row.orderType ? String(row.orderType) : extras.orderTypes[key] ?? ''),
  }
  return <PatientOverride patient={p}><RichtextReportWindow report={report} onClose={close} /></PatientOverride>
}

/* ---------------------------------------------------------------------------
   Order Linking Service
   ------------------------------------------------------------------------ */
function BasketOrderLink({ args, close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const patient = str(args.patient)
  const p = patientOf(patient, roster, str(args.chart))
  const orders = BASKET_ORDERS[patient] ?? []
  const [rows, setRows] = useState(() => orders.map((o) => ({ ...o, detail: '', links: '-' })))
  const [cur, setCur] = useState(0)
  useScreenReport({ orders: rows.length, status: pbSlug(rows[cur]?.status ?? '') })
  const link = () => {
    const o = rows[cur]
    if (o) workspaceExtras.linkOrder(str(args.rowKey), o.orderNo, o.status)
    close()
  }
  return (
    <WorkspaceDialogFrame id="basket-order-link" title="Order Linking Service" width={1130} height={870} onClose={close} controls={false} zIndex={88}>
      <div className="pb-row" style={{ gap: 0, padding: '6px 10px', background: 'linear-gradient(#fff, #d8e6f8)', flex: 'none' }}>
        <span style={{ width: 160, color: '#707070' }}>Chart: <b style={{ color: '#000' }}>{p.chart}</b></span>
        <span style={{ width: 330, color: '#707070' }}>Patient: <b style={{ color: '#000' }}>{patient}</b></span>
        <span style={{ width: 250, color: '#707070' }}>DoB: <b style={{ color: '#000' }}>{p.dob}</b></span>
        <span style={{ width: 120, color: '#707070' }}>Sex: <b style={{ color: '#000' }}>{p.gender}</b></span>
        <span style={{ color: '#707070' }}>Insurance: <b style={{ color: '#000' }}>{p.insuranceBy ?? 'BC'}  {p.insurance ?? ''}</b></span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 4px' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(o) => `host.mois.row.order-${o.orderNo}`}
          columns={[
            { key: 'date', header: 'Date', width: 92, align: 'center' },
            { key: 'orderBy', header: 'Order By', width: 150 },
            { key: 'referral', header: 'Referral / Facility', width: 134 },
            { key: 'description', header: 'Description', width: 360 },
            { key: 'detail', header: 'Detail', width: 66 },
            {
              key: 'status', header: 'Status', width: 116,
              render: (o, i) => (i !== cur ? o.status : (
                <span data-tutorial-id="host.mois.field.order-link-status">
                  <PBDropDownDataWindow
                    w="100%"
                    value={o.status}
                    display="status"
                    columns={[{ key: 'status', header: 'Status', width: 150 }, { key: 'description', header: 'Description', width: 260 }]}
                    rows={ORDER_STATUSES}
                    onSelect={(r) => setRows((all) => all.map((x, j) => (j === i ? { ...x, status: String(r.status) } : x)))}
                  />
                </span>
              )),
            },
            { key: 'priority', header: 'Priority', width: 86 },
            { key: 'links', header: 'Links', width: 50, align: 'center' },
          ]}
          empty="This patient has no outstanding orders."
        />
      </div>
      <div style={{ margin: '4px 30px 0', border: '1px solid #c8c8c8', padding: '2px 8px 8px', flex: 'none' }}>
        <span>Comment</span>
        <PBTextArea readOnly rows={9} w="100%" value={rows[cur]?.comment ?? ''} />
      </div>
      <div className="pb-row" style={{ gap: 12, padding: '12px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="order-link" width={90} disabled={!rows.length} onClick={link} isDefault>Link</DialogButton>
        <DialogButton id="order-link-cancel" width={90} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Measure History (from the basket) and its Graph
   ------------------------------------------------------------------------ */
function BasketMeasureHistory({ args, close, open }: AreaWindowProps) {
  const roster = usePatientRoster()
  const extras = useWorkspaceExtras()
  const row = args.row as BasketRow | undefined
  const key = str(args.rowKey)
  const [comment, setComment] = useState(() => extras.comments[key] ?? '')
  if (!row) return null
  const patient = String(row.patient)
  const p = patientOf(patient, roster, str(args.chart))
  const hkey = `${patient}|${String(row.test ?? '')}`
  const collected = (() => { const [y, m, d] = String(row.collected ?? '').split('.'); return y && m && d ? `20${y}.${m}.${d}` : '' })()
  const related = [{ collected, value: String(row.value ?? ''), comment: extras.comments[key] ?? '' }, ...(MEASURE_HISTORY[hkey] ?? [])]
  const [lo, hi] = String(row.range ?? '').split(' to ')
  const field = (w: number | string, value?: string, yellow?: boolean) => (
    <PBInput w={w} value={value ?? ''} readOnly style={yellow ? { background: 'var(--pb-yellow, #ffff99)' } : undefined} />
  )
  const graph = () => {
    const units = String(row.units ?? '')
    close()
    open('basket-measure-graph', {
      patient, chart: str(args.chart), test: String(row.test ?? ''), units,
      points: related.filter((r) => r.collected && !Number.isNaN(Number(r.value))).map((r) => ({ date: r.collected, value: Number(r.value) })),
      lower: lo ? Number(lo) : undefined, upper: hi ? Number(hi) : undefined,
    })
  }
  return (
    <WorkspaceDialogFrame id="basket-measure-history" title="Measure History" width={955} height={633} onClose={close} controls={false} zIndex={88}>
      <PBPatientBannerYellow name={`${p.first} ${p.last}`.toUpperCase()} bchn={p.bchn ?? p.insurance ?? ''} home={p.home} dob={p.dob} sex={p.gender} />
      <div style={{ display: 'flex', gap: 2, padding: '4px 6px 0', flex: 'none' }}>
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <PBBand>Selected Item Detail</PBBand>
          <div style={{ padding: '4px 8px', display: 'grid', gridTemplateColumns: '72px 316px 1fr', rowGap: 3, alignItems: 'center' }}>
            <span>Description:</span>{field(314, String(row.test ?? ''))}
            <span className="pb-row" style={{ justifyContent: 'flex-end' }}>Value: {field(142, [row.value, row.units].filter(Boolean).join(' '))}</span>
            <span>MOIS Code:</span>
            <span className="pb-row" style={{ gap: 0 }}>{field(94, String(row.moisCode ?? ''))}<span style={{ marginLeft: 70 }}>LOINC: {String(row.loinc ?? '')}</span></span>
            <span className="pb-row" style={{ justifyContent: 'flex-end' }}>Reference Range: {field(56, lo, true)} to {field(56, hi, true)}</span>
            <span>Collect Date:</span>
            <span className="pb-row">{field(94, collected)}<PBInput w={40} value=":" readOnly /><span style={{ marginLeft: 22 }}>Status:</span>{field(44, String(row.status ?? ''))}</span>
            <span className="pb-row" style={{ justifyContent: 'flex-end' }}>Flag: {field(56, String(row.flag ?? ''))}</span>
          </div>
          <div className="pb-row" style={{ padding: '0 8px 6px', alignItems: 'flex-start' }}>
            <span style={{ width: 72 }}>Comment:</span>
            <PBTextArea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} w={460} data-tutorial-id="host.mois.field.basket-history-comment" />
            <span className="pb-stack" style={{ gap: 4, marginTop: 20 }}>
              <DialogButton id="history-create-message" width={110} onClick={() => open('create-message', args)}>Create Message</DialogButton>
              <DialogButton id="history-create-task" width={110} onClick={() => open('create-task', args)}>Create Task</DialogButton>
            </span>
          </div>
        </div>
        <div className="pb-groupbox" style={{ width: 292, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <PBBand>Goal(s)</PBBand>
          <div style={{ flex: '1 1 auto', display: 'flex' }}>
            <PBDataWindow flush gutter={false} rows={MEASURE_GOALS[hkey] ?? []} columns={[
              { key: 'goal', header: 'Goal', width: 110 }, { key: 'start', header: 'Start', width: 86 }, { key: 'end', header: 'End' },
            ]} empty="" />
          </div>
        </div>
      </div>
      <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, margin: '6px 6px 0', display: 'flex', flexDirection: 'column' }}>
        <PBBand>Related Measurements (Including Selected)</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.field.related-measurements">
          <PBDataWindow
            flush
            gutter={false}
            rows={related.map((r) => ({ ...r, test: String(row.test ?? '') }))}
            columns={[
              { key: 'collected', header: 'Collected', width: 80 },
              { key: 'value', header: 'Value', width: 78 },
              { key: 'test', header: 'Test Name', width: 248 },
              { key: 'comment', header: 'Comment', width: 300 },
              {
                key: 'add', header: '', width: 120,
                render: (r) => <button className="pb-link" onClick={() => setComment((c) => [c, `${r.collected} ${r.value}`].filter(Boolean).join('\n'))}>Add to Comment</button>,
              },
            ]}
            empty=""
          />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '8px 6px 8px', flex: 'none' }}>
        <DialogButton id="basket-history-graph" width={75} onClick={graph}>Graph</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id="basket-history-save" width={75} onClick={() => { workspaceExtras.setComment(key, comment); close() }} isDefault>Save (F2)</DialogButton>
        <DialogButton id="basket-history-cancel" width={75} onClick={close}>Cancel</DialogButton>
        <span className="pb-row__spacer" />
        <span style={{ width: 75 }} />
      </div>
    </WorkspaceDialogFrame>
  )
}

function BasketMeasureGraph({ args, close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const p = patientOf(str(args.patient), roster, str(args.chart))
  const points = (Array.isArray(args.points) ? args.points : []) as { date: string; value: number }[]
  useScreenReport({ points: points.length })
  if (!points.length) {
    return (
      <RaisedMessageBox title="MOIS" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={close}>
        <span data-tutorial-id="host.mois.dialog.graph-refused">This measurement has no numeric values to graph.</span>
      </RaisedMessageBox>
    )
  }
  return (
    <PatientOverride patient={p}>
      <MeasurementGraphWindow
        test={str(args.test)}
        units={str(args.units)}
        lower={typeof args.lower === 'number' ? args.lower : undefined}
        upper={typeof args.upper === 'number' ? args.upper : undefined}
        series={[{ label: str(args.test), points: [...points].sort((a, b) => a.date.localeCompare(b.date)) }]}
        onClose={close}
      />
    </PatientOverride>
  )
}

/* ---------------------------------------------------------------------------
   Workflow Summary on a basket record
   ------------------------------------------------------------------------ */
const BAND_DARK: CSSProperties = { background: 'linear-gradient(var(--pb-banner-top-a, #2f6fb4), var(--pb-banner-top-b, #1c4f8c))', color: '#fff', padding: '4px 10px', flex: 'none' }
const BAND_LIGHT: CSSProperties = { background: 'var(--pb-banner-bottom, #3d86c6)', color: '#fff', padding: '3px 10px', fontWeight: 700, flex: 'none' }
const SECTION: CSSProperties = { background: 'linear-gradient(#fff, #d8e6f8)', padding: '2px 8px', fontWeight: 700 }
const IR_NAME = Object.fromEntries(IR_CODES.map((c) => [c.code, c.meaning]))
const priorityWord = (p: unknown) => (TASK_PRIORITIES.find((x) => x.code === p)?.label ?? 'Medium').toUpperCase().replace('V. HIGH', 'VERY HIGH')

type WfLine = { id: string; section: 'messages' | 'tasks' | 'acks'; date: string; description: string; status: string; detail: string }

function BasketWorkflowSummary({ args, close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const ws = useWorkspaceStore()
  const extras = useWorkspaceExtras()
  const folderId = str(args.folder)
  const folder = basketFolderById(folderId)
  const row = args.row as BasketRow | undefined
  const patient = row ? String(row.patient) : str(args.patient)
  const key = basketKey(folderId, patient)
  const p = patientOf(patient, roster, str(args.chart))
  const checked = args.checked === true
  const [open, setOpen] = useState({ messages: true, tasks: true, acks: true })

  const lines = useMemo((): WfLine[] => {
    const recordText = str(args.detail)
    const inbox = taskScreenByNode('ws-msg-inbox')?.rows ?? []
    const taskRows = [...(taskScreenByNode('ws-task-inbox')?.rows ?? []), ...ws.tasks]
    const messages: WfLine[] = [...inbox, ...ws.messages]
      .filter((m) => m.patient === patient)
      .map((m, i) => {
        const to = str(m.sentTo).split(';').map((s) => s.trim()).filter(Boolean)
        const cc = str(m.copiedTo).split(';').map((s) => s.trim()).filter(Boolean)
        return {
          id: `m${i}`, section: 'messages', date: str(m.sent) || MOIS_TODAY, description: str(m.subject).toUpperCase(),
          status: `Recipients: ${to.length + cc.length}  Acknowledged: ${m.ack ? 1 : 0}  Completed: ${m.comp ? 1 : 0}`,
          detail: [
            `FROM: ${str(m.from) || CURRENT_USER.name}  Priority: ${priorityWord(m.p)}`,
            ...to.map((t) => `TO: ${t}  Acknowledged: ${m.ack ? 'YES' : 'NO'}  Completed: ${m.comp ? 'YES' : 'NO'}`),
            ...cc.map((t) => `CC: ${t}  Acknowledged: NO  Completed: NO`),
            '', '', recordText, '', str(m.detail),
          ].join('\n'),
        }
      })
    const tasks: WfLine[] = taskRows
      .filter((t: TaskRow) => t.patient === patient)
      .map((t, i) => {
        const notes = extras.followUps[taskRowSlug(t)] ?? []
        return {
          id: `t${i}`, section: 'tasks', date: str(t.created) || MOIS_TODAY, description: str(t.task).toUpperCase(),
          status: `Acknowledged: ${t.ack ? 'YES' : 'NO'}  Completed: ${t.comp ? 'YES' : 'NO'}`,
          detail: [
            `Created By: ${str(t.createdBy)}  Priority: ${priorityWord(t.p)}`,
            `Assigned To: ${str(t.user) || str(t.team) || str(t.assignee)}`,
            '', '', str(t.detail) || recordText, '',
            `FOLLOW UP NOTES (${notes.length})`, '',
            ...notes.map((n) => `${n.date} [${n.author}]: ${n.note}${n.modifiedBy ? `  (Modified By: ${n.modifiedBy} ${n.modified ?? ''})` : ''}`),
          ].join('\n'),
        }
      })
    /* who has this record: its owners, anyone it was copied or reassigned
       to this session, and the seed's own recipients */
    const history = [
      ...(ACK_HISTORY_SEED[key] ?? []).map((h) => ({ ...h, to: h.to ? [h.to] : [], note: h.note ?? '' })),
      ...extras.history.filter((h) => h.key === key).map((h) => ({ at: h.at, action: h.action, by: h.by, to: h.to, note: h.note })),
    ]
    const people = new Map<string, string>()
    for (const o of row ? rowOwners(row) : [CURRENT_USER.name]) people.set(o, row?.ir ? String(row.ir) : '')
    for (const h of history) {
      if (h.action === 'COPIED') h.to.forEach((t) => people.set(t, 'CP'))
      if (h.action === 'REASSIGNED') h.to.forEach((t) => people.set(t, 'RS'))
    }
    const acks: WfLine[] = [...people.entries()].map(([name, ir], i) => {
      const mine = name === CURRENT_USER.name
      const isChecked = mine && checked
      const theirs = history.filter((h) => h.to.includes(name) || h.by === name)
      const review = theirs.find((h) => h.action === 'MARKED FOR REVIEW')
      const historyLines = theirs
        .filter((h) => h.action !== 'MARKED FOR REVIEW')
        .slice().reverse()
        .flatMap((h) => {
          if (h.action === 'CREATED') return [`${h.at}  CREATED    By: ${h.by}    For: ${h.to.join('; ')}`, ...(h.note ? [`            ${h.note}`] : [])]
          return [
            `${h.at}  ${h.action}    By: ${h.by}    To: ${h.to.join('; ')}`,
            ...(h.note ? [`            ${h.note.startsWith('[') || h.note.startsWith('Automatically') ? h.note : `[${h.action}] ${h.note}`}`] : []),
          ]
        })
      return {
        id: `a${i}`, section: 'acks', date: (theirs[0]?.at ?? MOIS_TODAY).slice(0, 10), description: name,
        status: `${isChecked ? `CHECKED (${CURRENT_USER.name})` : 'NOT CHECKED'}${ir ? `     IR: ${IR_NAME[ir] ?? ir}` : ''}`,
        detail: [
          ...(isChecked ? [`Checked By: ${CURRENT_USER.name}  ${MOIS_TODAY}`, ''] : []),
          ...(review || (mine && row?.t === 'R') ? ['MARKED FOR REVIEW', ''] : []),
          'Acknowledgement History:', '',
          ...(review ? [`[REVIEWED] ${review.note || String(row?.reviewNote ?? '')}`, ''] : mine && row?.reviewNote ? [`[REVIEWED] ${String(row.reviewNote)}`, ''] : []),
          ...historyLines,
          ...(theirs.some((h) => h.action === 'CREATED') ? [] : [`${(theirs[0]?.at ?? '2026.03.18 06:12').slice(0, 10)} 00:00  CREATED    By: SYSTEM    For: ${name}`]),
        ].join('\n'),
      }
    })
    return [...messages, ...tasks, ...acks]
  }, [args.detail, ws.messages, ws.tasks, extras.followUps, extras.history, patient, key, row, checked])

  const [picked, setPicked] = useState<string>(() => lines.find((l) => l.section === 'acks' && l.description === CURRENT_USER.name)?.id ?? lines[0]?.id ?? '')
  const current = lines.find((l) => l.id === picked)
  useScreenReport({
    messages: lines.filter((l) => l.section === 'messages').length,
    tasks: lines.filter((l) => l.section === 'tasks').length,
    acknowledgements: lines.filter((l) => l.section === 'acks').length,
    selected: current ? `${current.section}-${pbSlug(current.description).slice(0, 20)}` : '',
  })
  const count = (s: WfLine['section']) => lines.filter((l) => l.section === s).length
  const section = (id: WfLine['section'], title: string) => (
    <>
      <div style={SECTION} className="pb-row" data-tutorial-id={`host.mois.group.workflow-${id}`}>
        <button
          type="button" aria-expanded={open[id]} onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}
          style={{ width: 11, height: 11, padding: 0, border: '1px solid #808080', background: '#fff', font: 'inherit', fontSize: 9, lineHeight: '9px', cursor: 'pointer' }}
        >
          {open[id] ? '−' : '+'}
        </button>
        <span>{title}&nbsp;&nbsp;&nbsp;[{count(id)}]</span>
      </div>
      {open[id] && lines.filter((l) => l.section === id).map((l, i) => (
        <div
          key={l.id}
          className="pb-row"
          data-tutorial-id={`host.mois.row.workflow-${id}-${pbSlug(l.description).slice(0, 20)}`}
          onMouseDown={() => setPicked(l.id)}
          style={{ gap: 0, padding: '3px 8px', background: picked === l.id ? '#f3c3b8' : i % 2 ? '#fff' : '#ececec' }}
        >
          <span style={{ width: 90 }}>{l.date}</span><span style={{ width: 430 }}>{l.description}</span><span>{l.status}</span>
        </div>
      ))}
    </>
  )
  const recordBand = folder && row
    ? `${folder.recordType.toUpperCase()}   [${str(args.recordDate) || String(row.collected ?? row.seen ?? row.date ?? row.discharge ?? row.apptDate ?? row.ordDate ?? '')}]   ${String(row.test ?? row.reason ?? row.description ?? row.note ?? '')}${row.value ? `   Value: ${row.value} ${row.units ?? ''}` : ''}${row.flag ? `   Flag: ${row.flag}` : ''}`
    : ''
  return (
    <WorkspaceDialogFrame id="basket-workflow-summary" title="Workflow Summary" width={1000} height={700} onClose={close} zIndex={88}>
      <div style={BAND_DARK}>
        <div className="pb-row" style={{ gap: 0 }}>
          <span style={{ width: 220 }}>FIRST: <b>{p.first.toUpperCase()}</b></span>
          <span style={{ width: 200 }}>MIDDLE: <b>{p.middle.toUpperCase()}</b></span>
          <span style={{ width: 220 }}>LAST: <b>{p.last.toUpperCase()}</b></span>
          <span style={{ width: 130 }}>DoB: <b>{p.dob}</b></span>
          <span>Gender: <b>{p.gender}</b></span>
        </div>
        <div className="pb-row" style={{ gap: 0, paddingTop: 2 }}>
          <span style={{ width: 220 }}>PHN: <b>{p.insuranceBy ?? 'BC'}&nbsp;&nbsp;{p.bchn ?? p.insurance ?? ''}</b></span>
          <span style={{ width: 200 }}><u>Home:</u> <b>{p.home ?? ''}</b></span>
          <span style={{ width: 220 }}>Work: <b>{p.work ?? ''}</b></span>
          <span>Cell: <b>{p.cell ?? ''}</b></span>
        </div>
      </div>
      <div style={BAND_LIGHT} data-tutorial-id="host.mois.field.workflow-record">{recordBand}</div>
      <div className="pb-row" style={{ gap: 28, padding: '3px 10px', flex: 'none' }}>
        <button type="button" className="pb-link" onClick={() => setOpen({ messages: true, tasks: true, acks: true })}>Expand All</button>
        <button type="button" className="pb-link" onClick={() => setOpen({ messages: false, tasks: false, acks: false })}>Collapse All</button>
      </div>
      <div data-tutorial-id="host.mois.group.workflow-summary" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', margin: '0 6px', background: '#fff', border: '1px solid var(--pb-border)' }}>
        <div className="pb-row" style={{ gap: 0, padding: '3px 8px', fontWeight: 700, borderBottom: '1px solid var(--pb-border)' }}>
          <span style={{ width: 90 }}>Date</span><span style={{ width: 430 }}>Description</span><span>Status</span>
        </div>
        {count('messages') > 0 && section('messages', 'MESSAGES')}
        {count('tasks') > 0 && section('tasks', 'TASKS')}
        {section('acks', 'ACKNOWLEDGEMENTS')}
      </div>
      <div style={{ margin: '4px 6px 0', flex: 'none' }}>
        <PBBand>Detail</PBBand>
        <PBTextArea rows={10} w="100%" readOnly value={current?.detail ?? ''} data-tutorial-id="host.mois.field.acknowledgement-history" />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', padding: '8px 0', flex: 'none' }}>
        <DialogButton id="workflow-summary-close" onClick={close} isDefault>Close</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Advanced Search
   ------------------------------------------------------------------------ */
function AdvancedSearch({ args, close }: AreaWindowProps) {
  const fields = (Array.isArray(args.fields) ? args.fields : []) as AdvancedSearchField[]
  const initial = (args.initial && typeof args.initial === 'object' ? args.initial : {}) as Record<string, string>
  const [values, setValues] = useState<Record<string, string>>(initial)
  const apply = typeof args.onApply === 'function' ? (args.onApply as (v: Record<string, string>) => void) : null
  return (
    <WorkspaceDialogFrame id="advanced-search" title="Advanced Search" width={650} height={520} onClose={close} controls={false} zIndex={88}>
      <div style={{ margin: 12, border: '1px solid #a0a0a0', background: '#fff', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
        <FormBand>Searchable Fields</FormBand>
        <div style={{ flex: '1 1 auto' }}>
          {fields.map((f) => (
            <div key={f.key} className="pb-row" style={{ gap: 8, padding: '3px 6px', borderBottom: '1px solid #ececec' }}>
              <span style={{ width: 14, color: '#0033cc', fontWeight: 700 }}>{f.default ? '*' : ''}</span>
              <span style={{ width: 120 }}>{f.label}:</span>
              <PBInput w={420} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} data-tutorial-id={`host.mois.field.search-${pbSlug(f.label)}`} />
            </div>
          ))}
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '8px 10px', color: '#707070', alignItems: 'flex-start', flex: 'none' }}>
          <span style={{ color: '#0033cc', fontWeight: 700 }}>*</span>
          <span style={{ whiteSpace: 'normal' }}>Indicates that the field is default search criteria.  If you don't explicitly state which column you're searching, this will be searched by default.</span>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '0 0 12px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="advanced-search-ok" onClick={() => { apply?.(values); close() }} isDefault>Ok</DialogButton>
        <DialogButton id="advanced-search-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Clean List, Basket Statistics
   ------------------------------------------------------------------------ */
function CleanList({ close }: AreaWindowProps) {
  return (
    <RaisedMessageBox
      title="Clean List"
      icon="question"
      buttons={[{ label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.msgbox-yes' }, { label: 'No', value: 'no', tutorialId: 'host.mois.command.msgbox-no' }]}
      onClose={(v) => { if (v === 'yes') workspaceExtras.clean(); close() }}
    >
      <span data-tutorial-id="host.mois.dialog.clean-list">
        Remove orphaned acknowledgement records from your Basket and Workspace Summary? The summary will be recounted from the Basket folders.
      </span>
    </RaisedMessageBox>
  )
}

function BasketStatistics({ args, close, open }: AreaWindowProps) {
  const forwarding = args.kind !== 'recipient'
  const ws = useWorkspaceStore()
  const extras = useWorkspaceExtras()
  const [from, setFrom] = useState('2026.03.01')
  const [to, setTo] = useState(MOIS_TODAY)
  const [user, setUser] = useState(CURRENT_USER.name)
  const [excel, setExcel] = useState(false)
  const id = forwarding ? 'report-ack-forwarding' : 'report-ack-intended-recipient'
  const ok = () => {
    let columns: { key: string; header: string; width?: number }[]
    let rows: Record<string, string>[]
    if (forwarding) {
      const seed = Object.entries(ACK_HISTORY_SEED).flatMap(([key, hs]) => hs.filter((h) => h.action === 'REASSIGNED' || h.action === 'COPIED').map((h) => ({ key, ...h, to: h.to ? [h.to] : [] })))
      const all = [...seed, ...extras.history.filter((h) => h.action !== 'MARKED FOR REVIEW')]
        .filter((h) => h.by === user && h.at.slice(0, 10) >= from && h.at.slice(0, 10) <= to)
      const groups = new Map<string, number>()
      for (const h of all) {
        const folder = basketFolderById(h.key.split(':')[0]!)?.label ?? ''
        for (const t of h.to) {
          const k = `${folder}|${t}|${h.action === 'COPIED' ? 'COPY' : 'REASSIGN'}`
          groups.set(k, (groups.get(k) ?? 0) + 1)
        }
      }
      columns = [{ key: 'folder', header: 'Basket Folder', width: 160 }, { key: 'to', header: 'Forwarded To', width: 200 }, { key: 'action', header: 'Action', width: 100 }, { key: 'count', header: 'Records', width: 70 }]
      rows = [...groups.entries()].map(([k, n]) => { const [folder = '', t = '', action = ''] = k.split('|'); return { folder, to: t, action, count: String(n) } })
    } else {
      columns = [{ key: 'folder', header: 'Basket Folder', width: 160 }, ...IR_CODES.map((c) => ({ key: c.code, header: c.code, width: 36 })), { key: 'none', header: '(none)', width: 50 }]
      rows = basketFolders.map((f) => {
        const out: Record<string, string> = { folder: f.label }
        const mine = f.rows.filter((r) => rowOwners(r).includes(user) && !ws.reassigned.includes(basketKey(f.id, String(r.patient))))
        for (const c of IR_CODES) out[c.code] = String(mine.filter((r) => r.ir === c.code).length || '')
        out.none = String(mine.filter((r) => !r.ir).length || '')
        return out
      })
    }
    workspaceExtras.done(forwarding ? 'ack-forwarding-report' : 'ack-recipient-report')
    close()
    open('print-preview', {
      title: forwarding ? 'Acknowledgement Forwarding' : 'Acknowledgement Intended Recipient',
      heading: `${forwarding ? 'Acknowledgement Forwarding' : 'Acknowledgement Intended Recipient'} — ${user} — ${from} to ${to}${excel ? ' (sent to Excel)' : ''}`,
      columns, rows,
    })
  }
  return (
    <WorkspaceDialogFrame id={id} title={forwarding ? 'Report: Acknowledgement Forwarding' : 'Report: Acknowledgement Intended Recipient'} width={560} height={320} onClose={close} controls={false} zIndex={88}>
      <div style={{ margin: 12, border: '1px solid #a0a0a0', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
        <FormBand>Selection Parameter</FormBand>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, padding: '12px', alignItems: 'center' }}>
          <span>Created From:</span>
          <span className="pb-row" style={{ gap: 8 }}>
            <PBInput w={96} align="center" value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id={`host.mois.field.${id}-from`} />
            <span>to</span>
            <PBInput w={96} align="center" value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id={`host.mois.field.${id}-to`} />
          </span>
          <span>{forwarding ? 'Forwarded From User:' : 'Recipient User:'}</span>
          <PBSelect w={240} options={[CURRENT_USER.name, 'BEARDWOOD, WENDY', 'SHEWCHUK, LEAH', 'SMITH, DALENE', 'SMITH, PETER', 'RESIDENT, R1']} value={user} onChange={(e) => setUser(e.target.value)} data-tutorial-id={`host.mois.field.${id}-user`} />
          <span />
          <PBCheckbox label="Send to Excel" checked={excel} onChange={setExcel} tutorialId={`host.mois.check.${id}-excel`} />
        </div>
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '0 0 12px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id={`${id}-ok`} onClick={ok} isDefault>Ok</DialogButton>
        <DialogButton id={`${id}-cancel`} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Follow Up Note
   ------------------------------------------------------------------------ */
function FollowUpNoteWindow({ args, close }: AreaWindowProps) {
  const extras = useWorkspaceExtras()
  const task = str(args.task)
  const id = str(args.note)
  const existing = (extras.followUps[task] ?? []).find((n) => n.id === id)
  const [text, setText] = useState(existing?.note ?? '')
  const save = () => {
    if (existing) {
      if (text !== existing.note) workspaceExtras.updateFollowUp(task, existing.id, text, CURRENT_USER.name, `${MOIS_TODAY}`)
    } else if (text.trim()) {
      workspaceExtras.addFollowUp(task, { date: MOIS_TODAY, author: CURRENT_USER.name, note: text.trim() })
    }
    close()
  }
  return (
    <WorkspaceDialogFrame id="follow-up-note" title="Follow Up Note" width={620} height={400} onClose={close} controls={false} zIndex={88}>
      <div className="pb-row" style={{ gap: 18, padding: '8px 12px', flex: 'none' }}>
        <span>Date: <b>{existing?.date ?? MOIS_TODAY}</b></span>
        <span>Author: <b>{existing?.author ?? CURRENT_USER.name}</b></span>
        <span>Task: <b>{str(args.subject)}</b></span>
      </div>
      <div style={{ flex: '1 1 auto', display: 'flex', padding: '0 12px' }}>
        <PBTextArea value={text} onChange={(e) => setText(e.target.value)} style={{ flex: '1 1 auto', resize: 'none' }} data-tutorial-id="host.mois.field.follow-up-text" />
      </div>
      <div className="pb-row" style={{ gap: 12, padding: '6px 12px', color: '#505050', flex: 'none' }}>
        <span>Created: {existing ? `${existing.date}  ${existing.author}` : ''}</span>
        <span>Modified By: {existing?.modifiedBy ? `${existing.modifiedBy}  ${existing.modified ?? ''}` : ''}</span>
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '0 0 12px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="follow-up-save" onClick={save} isDefault>Save (F2)</DialogButton>
        <DialogButton id="follow-up-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('basket-row-menu', BasketRowMenu)
registerAreaWindow('zoom-text', ZoomText)
registerAreaWindow('basket-print', BasketPrint)
registerAreaWindow('basket-order-link', BasketOrderLink)
registerAreaWindow('basket-measure-history', BasketMeasureHistory)
registerAreaWindow('basket-measure-graph', BasketMeasureGraph)
registerAreaWindow('basket-workflow-summary', BasketWorkflowSummary)
registerAreaWindow('advanced-search', AdvancedSearch)
registerAreaWindow('clean-list', CleanList)
registerAreaWindow('report-ack-forwarding', (p) => <BasketStatistics {...p} args={{ ...p.args, kind: 'forwarding' }} />)
registerAreaWindow('report-ack-intended-recipient', (p) => <BasketStatistics {...p} args={{ ...p.args, kind: 'recipient' }} />)
registerAreaWindow('follow-up-note', FollowUpNoteWindow)
