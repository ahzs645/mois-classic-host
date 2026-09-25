import { useEffect, useMemo, useState } from 'react'
import { useChartExport, useChartRows, useNodeRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import {
  encounterRows, orderPayors, orderPriorities, orderReferralSources,
  type OrderDetail, type OrderRecipient, type OrderRow
} from '../data/mois'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { nextEncounterId, useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { useChartSession } from '../data/chartSession'
import { DESKTOP_PROVIDER } from '../data/letterFlow'
import { VISIT_MODES } from './EncounterWindow'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBFixed, PBGroup, PBIdentityStrip, PBInput,
  PBLookup, PBRadio, PBSelect, PBTabs, PBTextArea, PBViewHeader,
  type PBColumn,
} from '../pb'

/* ============================================================================
   Order — the Patient Chart ▸ Orders window.

   PROVENANCE: reference/order-report.png, order-distribution.png,
   order-links.png, order-office-notes.png, order-history.png.

   The window is painted at ~1060px and nothing in it stretches: on a wide
   monitor it is content on the left and window face to the right (`PBFixed`).
   In the capture the order list's own control is right-anchored, so its white
   canvas reaches the frame while the columns stop where they were painted;
   the stage keeps every window at its design width instead, because a grid
   running past the rest of the screen reads as a bug rather than as MOIS.

   The five tab pages belong to the current order, not to the window: the
   captions carry that row's child counts and MOIS re-retrieves them as the
   current row moves.
   ========================================================================= */

/** The width the Order window was painted at, measured from the 1:1 capture:
 *  a 13px gutter plus 810px of columns. The old 1060 was inferred from a
 *  scaled screenshot and made every child of this window a third too wide. */
const DESIGN_W = 823

/* Measured off the 1:1 capture of this window, where the column run is 810px
   against a ~815px work area. They were ~1.3x larger, which made the window
   overflow the stage's work area: ST, Links and the paper clip fell off the
   right edge, Appointment Booking was clipped to "Appo…", and the footer
   collided with the Referral Note. */
const columns: PBColumn<OrderRow>[] = [
  { key: 'date', header: 'Date', width: 62, align: 'center' },
  { key: 'type', header: 'Order Type', width: 93, align: 'center' },
  { key: 'by', header: 'Ordered By', width: 138 },
  { key: 'd1', header: '', dots: true, width: 19 },
  { key: 'to', header: 'Order To', width: 134 },
  { key: 'd2', header: '', dots: true, width: 18 },
  { key: 'for', header: 'Order For', width: 212 },
  { key: 'd3', header: '', dots: true, width: 19 },
  { key: 'st', header: 'ST', width: 37, align: 'center' },
  { key: 'links', header: 'Links', width: 30, align: 'center' },
  { key: 'attach', header: '\u{1F4CE}', width: 35, align: 'center' },
]

/* 303588 `48e7423c…`: New Record's Order Type drop-down, a DDDW of type and
   description */
const ORDER_TYPES = [
  { type: 'CONSULTATION', description: 'Medical Consultation Request' },
  { type: 'IMAGE', description: 'Medical Imaging Requisition' },
  { type: 'INTERVENTION', description: 'Medical Intervention Request' },
  { type: 'LAB', description: 'Medical Laboratory Requisition' },
  { type: 'PROCEDURE', description: 'Medical Procedure Request' },
  { type: 'MISC', description: 'Miscellaneous' },
]

/* 2961349 `2d067ff2…`: Order Management's Status DDDW, Status and
   Description. The ST column carries the HL7 order-status code behind each. */
export const ORDER_STATUS_ROWS = [
  { code: 'IP', status: 'IN PROCESS', description: 'In process, unspecified' },
  { code: 'SC', status: 'SCHEDULED', description: 'In process, scheduled' },
  { code: 'A', status: 'RESULTS AVAILABLE', description: 'Some, but not all, results available' },
  { code: 'CA', status: 'CANCELLED', description: 'Order was cancelled' },
  { code: 'CM', status: 'COMPLETED', description: 'Order is completed' },
  { code: 'ER', status: 'ERROR', description: 'Error, order not found' },
]
const statusWord = (code?: string) => ORDER_STATUS_ROWS.find((s) => s.code === code)?.status ?? code ?? ''

const TABS = ['Report', 'Distribution', 'Links', 'Office Notes', 'History'] as const
type Tab = typeof TABS[number]

export function OrderView({ onAttachment }: { onAttachment: () => void }) {
  /* a chart with a real export behind it lists its own orders */
  const exported = useChartRows('orders') as unknown as OrderRow[]
  const patient = usePatient()
  const session = useChartSession(patient.chart)
  const [tab, setTab] = useState<Tab>('Report')
  const [cur, setCur] = useState(0)
  /* New Record (303588): a row at the top dated today, Ordered By the Desktop
     Provider, and an Order Type to pick — held until Save or Undo */
  const [draft, setDraft] = useState<OrderRow | null>(null)
  useScreenReport({ draft: !!draft })
  const exportedOrders = draft ? [draft, ...exported] : exported
  const offset = draft ? 1 : 0

  const records = useNodeRecords('orders')
  const r = records[cur - offset]
  /* a letter distributed from this order this session (screens/LetterWindows.tsx) */
  const sent = session.distributions.filter((d) => d.orderId && d.orderId === r?.id_order)
  const order: OrderRow | undefined = draft && cur === 0 ? { ...draft, detail: { orderedBy: DESKTOP_PROVIDER, status: 'IP', priority: 'ROUTINE' } }
    : exportedOrders?.[cur] ? { ...exportedOrders[cur], distribution: sent.map((d) => ({
      sentAt: d.date, document: d.title, by: 'JALIL, AHMAD',
      recipients: d.rows.map((x) => ({ method: x.method, type: x.type, name: x.name, location: '', status: x.status })),
    })), detail: {
    attending: r?.str_attending, orderedBy: r?.str_order_by, responsibleOrg: r?.str_responsible_org,
    referredTo: r?.str_performed_by, copiesTo: r?.str_copy_to, facility: r?.str_facility,
    facilityRef: r?.str_filler_ref_no, facilityLoc: r?.str_facility_loc,
    referralNote: r?.str_note, assignedTo: r?.str_assignedto, priority: r?.str_priority_code,
    status: r?.str_status, finishedOn: r?.dtm_finish_date?.replace(/\//g, '.'),
    source: r?.str_source, created: [r?.stp_date_create, r?.stp_user_create].filter(Boolean).join('  '),
    encounter: r?.id_encounter,
  } } : undefined
  /* MOIS counts the children of the current order in the tab captions, and
     a distribution counts its recipients rather than its events. */
  const counts = useMemo(() => ({
    Report: null,
    Distribution: (order?.distribution ?? []).reduce((n, d) => n + d.recipients.length, 0),
    Links: order?.linkRows?.length ?? 0,
    'Office Notes': order?.notes?.length ?? 0,
    History: order?.history?.length ?? 0,
  }), [order])

  const captions = TABS.map((t) => (counts[t] === null ? t : `${t} (${counts[t]})`))
  const caption = counts[tab] === null ? tab : `${tab} (${counts[tab]})`

  return (
    <div className="pb-screen" style={{ ['--pb-design-w' as string]: `${DESIGN_W}px` }}>
      <PBViewHeader title="Order" right={<ChartHeaderIdentity />} />
      {/* Eleven buttons are wider than this window's painted 823px: the
          captures show them on one row in a wider window, so on the stage
          the run wraps rather than cutting Respond off the end. */}
      <style href="mois-classic/order-cmds" precedence="medium">{'.pb-order-cmds > .pb-cmdrow { flex-wrap: wrap; }'}</style>
      <div className="pb-order-cmds" style={{ flex: 'none' }}>
        <PBCommandRow
          commands={[
            {
              label: 'New Record',
              onClick: () => {
                setDraft({ date: MOIS_TODAY, type: '', by: DESKTOP_PROVIDER, to: '', for: '', st: 'IP', links: '-', attach: '-' })
                setCur(0)
                setTab('Report')
              },
            },
            { label: 'Quick Entry' }, { label: 'Delete Record' },
            /* MOIS draws Save and Undo in full black here, not greyed — both
               captures of this window show them enabled at rest. */
            { label: 'Save', onClick: () => setDraft(null) }, { label: 'Undo', onClick: () => { setDraft(null); setCur(0) } }, { label: 'Refresh' },
            { label: 'Mark for Review' }, { label: 'Attachment', onClick: onAttachment },
            { label: 'Print' }, { label: 'Paste Provider Addr.', width: 118 }, { label: 'Respond' },
          ]}
        />
      </div>

      {/* patient identity strip — fields sit at the offsets they were painted at */}
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first, w: 186 },
          { label: 'MIDDLE:', value: patient.middle, w: 145 },
          { label: 'LAST:', value: patient.last, w: 208 },
          { label: 'DoB:', value: patient.dob, w: 113 },
        ]}
        encounter={patient.encounter ?? 'NO ENCOUNTER'}
      />

      <PBFixed className="pb-row" style={{ padding: '2px 8px', display: 'flex' }}>
        <span>Search For:</span>
        <PBLookup w="100%" />
      </PBFixed>

      {/* Ten rows and a header. The capture's grid is 355px against a 1590px
          column run; at this window's measured 810px run that scales to ~181,
          and ten rows at the kit's 19px pitch plus the header comes to ~207.
          At 342 the grid crowded the Report tab until Referral Note and Order
          Management had no room left and collided with the footer. */}
      <PBFixed style={{ padding: '0 3px', height: 207, display: 'flex' }}>
        <PBDataWindow
          columns={columns.map((c) => (c.key === 'type'
            ? {
              ...c,
              render: (row: OrderRow, i: number) => (draft && i === 0
                ? (
                  <PBDropDownDataWindow
                    w="100%"
                    listW={280}
                    value={row.type}
                    tutorialId="host.mois.field.order-type"
                    columns={[{ key: 'type', header: 'Type', width: 100 }, { key: 'description', header: 'Description' }]}
                    rows={ORDER_TYPES}
                    onSelect={(pick) => setDraft((d) => (d ? { ...d, type: pick.type } : d))}
                  />
                )
                : row.type),
            }
            : c))}
          rows={exportedOrders}
          current={cur}
          onCurrentChange={setCur}
          /* by order id, so a lesson can put the cursor on the one it means */
          rowTutorialId={(_, i) => (draft && i === 0 ? 'host.mois.row.order-new'
            : records[i - offset]?.id_order ? `host.mois.row.order-${records[i - offset]!.id_order}` : undefined)}
        />
      </PBFixed>

      <PBFixed style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          /* a new row shifts every row down one, so the pages re-read */
          key={`${cur}:${draft ? 'new' : ''}`}
          tabs={captions}
          active={caption}
          onChange={(next) => setTab(TABS.find((t) => next.startsWith(t)) ?? 'Report')}
          compact
          face
        >
          {tab === 'Report' && <ReportPage order={order} />}
          {tab === 'Distribution' && <DistributionPage order={order} />}
          {tab === 'Links' && <LinksPage order={order} />}
          {tab === 'Office Notes' && <OfficeNotesPage order={order} />}
          {tab === 'History' && <HistoryPage order={order} />}
        </PBTabs>
      </PBFixed>
    </div>
  )
}

/* --- Report ---------------------------------------------------------------
   Four group boxes in two columns, then the window's footer line: where the
   order came from and whether it has been signed, with the encounter it was
   raised on hyperlinked at the right.                                      */
function ReportPage({ order }: { order?: OrderRow }) {
  const d: OrderDetail = order?.detail ?? {}
  return (
    /* the page scrolls rather than letting the boxes run under the footer
       when the tab is shorter than the window it was painted in */
    <div className="pb-order-report" style={{ overflowY: 'auto' }}>
      <div className="pb-order-report__grid" style={{ flex: '1 0 auto', minHeight: 262 }}>
        <PBGroup title="Detail Information" style={{ width: 553 }}>
          <div className="pb-form" style={{ gridTemplateColumns: '120px 1fr', padding: '2px 0 0' }}>
            <DetailRow label="Attending:" value={d.attending} right="Facility:" rightValue={d.facility} />
            <DetailRow label="Ordered By:" value={d.orderedBy} right="Facility Ref.:" rightValue={d.facilityRef} />
            <DetailRow label="Responsible Org.:" value={d.responsibleOrg} right="Facility Loc.:" rightValue={d.facilityLoc} />

            <span className="pb-form__label">Referred To:</span>
            <div className="pb-row">
              <PBLookup w={244} defaultValue={d.referredTo ?? ''} />
              <span className="pb-row__spacer" />
              <span>Payor:</span>
              <PBSelect options={orderPayors} w={115} defaultValue={d.payor ?? ''} />
            </div>

            <span className="pb-form__label">Copies To:</span>
            <div className="pb-row"><PBLookup w={244} defaultValue={d.copiesTo ?? ''} /></div>

            <span className="pb-form__label">Transcribed:</span>
            <div className="pb-row">
              <PBInput w={135} defaultValue={d.transcribed?.[0] ?? ''} />
              <PBInput w={80} defaultValue={d.transcribed?.[1] ?? ''} />
              <PBInput w={53} defaultValue={d.transcribed?.[2] ?? ''} />
            </div>
          </div>
        </PBGroup>

        <PBGroup title="Appointment Booking" style={{ width: 235 }}>
          <div className="pb-form" style={{ gridTemplateColumns: '100px 1fr', padding: '2px 0 0' }}>
            <span className="pb-form__label">Responsibility:</span>
            <div className="pb-row" style={{ gap: 22 }}>
              <PBRadio name="order-responsibility" label="Office" checked={d.responsibility === 'Office'} />
              <PBRadio name="order-responsibility" label="Patient" checked={d.responsibility === 'Patient'} />
            </div>

            <span className="pb-form__label">Date / Time:</span>
            <div className="pb-row">
              <PBInput w={96} defaultValue={d.bookedDate ?? ''} />
              <PBInput w={53} align="center" defaultValue={d.bookedTime ?? ':'} />
            </div>

            <span className="pb-form__label">Notify:</span>
            <div className="pb-row" style={{ paddingLeft: 14 }}>
              <PBCheckbox label="Patient Notified" checked={!!d.notified} />
            </div>
          </div>
        </PBGroup>

        <PBGroup title="Referral Note" fill style={{ width: 553 }}>
          <PBTextArea
            style={{ flex: '1 1 auto', width: '100%', height: '100%' }}
            defaultValue={d.referralNote ?? ''}
          />
        </PBGroup>

        <PBGroup title="Order Management" style={{ width: 235 }}>
          <div className="pb-stack" style={{ paddingTop: 2 }}>
            <span>Order Assigned to:</span>
            <PBLookup w={205} defaultValue={d.assignedTo ?? ''} />
          </div>
          <div className="pb-form" style={{ gridTemplateColumns: '108px 1fr', padding: '6px 0 0' }}>
            <span className="pb-form__label">Referral Source:</span>
            <PBSelect options={orderReferralSources} w={126} defaultValue={d.referralSource ?? ''} />
            <span className="pb-form__label">Priority:</span>
            <PBSelect options={orderPriorities} w={126} defaultValue={d.priority ?? ''} />
            <span className="pb-form__label">Status:</span>
            <PBDropDownDataWindow
              w={126}
              listW={300}
              display="status"
              value={statusWord(d.status)}
              tutorialId="host.mois.field.order-status"
              columns={[{ key: 'status', header: 'Status', width: 120 }, { key: 'description', header: 'Description' }]}
              rows={ORDER_STATUS_ROWS}
            />
            <span className="pb-form__label">Finished:</span>
            <div className="pb-row">
              <PBInput w={98} defaultValue={d.finishedOn ?? ''} />
              <PBInput w={69} defaultValue={d.finishedBy ?? ''} />
            </div>
          </div>
        </PBGroup>
      </div>

      <div className="pb-order-report__footer">
        <div className="pb-order-report__line">
          <span className="pb-order-report__key">Source:</span>
          <span className="pb-order-report__val">{d.source ?? ''}</span>
          <span className="pb-order-report__key pb-order-report__key--2">Sent Date:</span>
          <span>{d.sentDate ?? ''}</span>
          <span className="pb-row__spacer" />
          {d.signature && <button className="pb-link">{d.signature}</button>}
        </div>
        <div className="pb-order-report__line">
          <span className="pb-order-report__key">Created:</span>
          <span>{d.created ?? ''}</span>
          <span className="pb-row__spacer" />
          {d.encounter && <button className="pb-link">ENC# {d.encounter}</button>}
        </div>
      </div>
    </div>
  )
}

/** One `label [field] … right-label [field]` row of the Detail Information box. */
function DetailRow({ label, value, right, rightValue }: {
  label: string; value?: string; right: string; rightValue?: string
}) {
  return (
    <>
      <span className="pb-form__label">{label}</span>
      <div className="pb-row">
        <PBLookup w={244} defaultValue={value ?? ''} />
        <span className="pb-row__spacer" />
        <span>{right}</span>
        <PBInput w={115} defaultValue={rightValue ?? ''} />
      </div>
    </>
  )
}

/* --- Distribution ---------------------------------------------------------
   A grey-headed grid whose bands are the distribution events: the document
   that went out is a hyperlink in the band, and each recipient under it is
   painted yellow.                                                          */
type DistRow = OrderRecipient & { event: string; document: string; by: string }

function DistributionPage({ order }: { order?: OrderRow }) {
  const rows: DistRow[] = (order?.distribution ?? []).flatMap((d) =>
    d.recipients.map((r) => ({ ...r, event: d.sentAt, document: d.document, by: d.by })),
  )
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
      <PBDataWindow
        head="grey"
        gutter={false}
        zebra={false}
        rows={rows}
        rowStatus={() => 'highlight' as const}
        groupBy={(r) => r.event}
        groupLabel={(_g, band) => (
          <span className="pb-dist-band">
            <b>{band[0].event}</b>
            <button className="pb-link pb-link--strong">{band[0].document}</button>
            <span className="pb-row__spacer" />
            <span>Distributed By: {band[0].by}</span>
          </span>
        )}
        columns={[
          { key: 'method', header: 'Method', width: 130, align: 'center' },
          { key: 'type', header: 'Recipient Type', width: 160, align: 'center' },
          { key: 'name', header: 'Name', width: 190, align: 'center' },
          { key: 'location', header: 'Location', align: 'center' },
          { key: 'status', header: 'Status', width: 130, align: 'center' },
        ]}
        empty="This order has not been distributed."
      />
    </div>
  )
}

/* --- Links ---------------------------------------------------------------- */
function LinksPage({ order }: { order?: OrderRow }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
      <PBDataWindow
        head="grey"
        zebra={false}
        rows={order?.linkRows ?? []}
        rowStatus={() => 'highlight' as const}
        columns={[
          { key: 'section', header: 'Section', width: 130, headAlign: 'center' },
          { key: 'date', header: 'Date', width: 100, align: 'right', headAlign: 'center' },
          {
            key: 'desc', header: 'Description', headAlign: 'left',
            render: (r) => <button className="pb-link">{r.desc}</button>,
          },
        ]}
        empty="No linked records."
      />
    </div>
  )
}

/* --- Office Notes --------------------------------------------------------- */
function OfficeNotesPage({ order }: { order?: OrderRow }) {
  return (
    <>
      <PBBandRow title="Office Notes" actions={['New', 'Delete']} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'date', header: 'Date', width: 118, align: 'center' },
            { key: 'author', header: 'Author', width: 190, align: 'center' },
            { key: 'note', header: 'Note' },
          ]}
          rows={order?.notes ?? []}
          empty="No office notes on this order."
        />
      </div>
    </>
  )
}

/* --- History -------------------------------------------------------------- */
function HistoryPage({ order }: { order?: OrderRow }) {
  return (
    <>
      <PBBandRow title="Status / Assigned to History" actions={['Edit', 'Delete']} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'when', header: 'Date / Time', width: 150, align: 'center' },
            { key: 'by', header: 'Changed By', width: 176, align: 'center' },
            { key: 'field', header: 'Field', width: 132, align: 'center' },
            { key: 'to', header: 'Changed To', width: 150, align: 'center' },
            { key: 'reason', header: 'Reason for Change', align: 'center' },
          ]}
          rows={order?.history ?? []}
          empty="No status changes recorded for this order."
        />
      </div>
    </>
  )
}

function PBBandRow({ title, actions }: { title: string; actions: string[] }) {
  return (
    <div className="pb-band">
      {title}
      <span className="pb-band__spacer" />
      {actions.map((a) => <PBButton key={a} size="sm">{a}</PBButton>)}
    </div>
  )
}

/* ============================================================================
   Encounter — the Patient Chart ▸ Encounters window.

   PROVENANCE: `reference/encounter-current-screen.png` and the Ctrl+Shift+A
   field audit's `MATRIX-R0361-date/ui-original.png`. The two are the same
   window one column apart — the second has been scrolled right by one — so
   every painted width from Date to Service Location is readable twice, and
   the two readings agree to the pixel.

   Everything below is measured off those captures in a window whose work
   area runs x 480..1293 (813px) and whose grid therefore runs edge to edge
   with no inset of its own.
   ========================================================================= */

type EncounterListRow = typeof encounterRows[number]

/** A row of the lower pane's Report list, when a chart's export carries one. */
type EncounterReportRow = {
  date?: string; description?: string; detail?: string; link?: string
  /** the band the row hangs under, which Expand All / Collapse All work on */
  section?: string
}

/** A row of the lower pane's Distribution list. */
type EncounterDistRow = {
  method?: string; type?: string; name?: string; location?: string; status?: string
}

/**
 * The encounter list's columns.
 *
 * Widths are the painted pixels: an empty row's cell fills start at 497 / 561
 * / 584 / 608 / 648 / 688 / 712 / 806 / 951 / 1017 / 1034 / 1084 / 1101 /
 * 1151 / 1202, off a grid whose own left edge is 480. Both captures give the
 * same numbers although their windows differ in width, so these are painted
 * pixels and not proportions — a wider window only shows more of the run.
 *
 * `AS` onward are the eight columns the field audit lists after Service
 * Location (MATRIX-R0374..R0381). No capture reaches them: MOIS clips the
 * grid at the window edge and draws no horizontal scroll bar, so in the
 * 813px window Service Location is the last column anyone sees. Their widths
 * are the Day Book's, which paints the same seven status columns beside a
 * paper clip — the captures cannot confirm them here.
 */
const encounterColumns: PBColumn<EncounterListRow>[] = [
  { key: 'date', header: 'Date', width: 64, align: 'center', italic: true },
  { key: 'hr', header: 'HR', width: 23, align: 'center', italic: true },
  { key: 'mn', header: 'MN', width: 24, align: 'center', italic: true },
  { key: 'code', header: 'Code', width: 40, align: 'center', italic: true },
  { key: 'mode', header: 'Mode', width: 40, align: 'center', italic: true },
  { key: 'nbr', header: '#', width: 24, align: 'center', italic: true },
  { key: 'provider', header: 'Provider', width: 94, italic: true },
  { key: 'reason', header: 'Visit Reason', width: 145 },
  { key: 'issue', header: 'Health Issue', width: 66 },
  { key: 'd1', header: '', dots: true, width: 17 },
  { key: 'services', header: 'Services', width: 50 },
  { key: 'd2', header: '', dots: true, width: 17 },
  { key: 'payor', header: 'Payor', width: 50 },
  { key: 'room', header: 'Room', width: 51 },
  /* the last column the window has room for; its full width is cut off in
     both captures, so 138 is the emulator's own reading and not a measured
     one — all it has to do is carry "DAW HEALTH UNIT" */
  { key: 'loc', header: 'Service Location', width: 138 },
  { key: 'as', header: 'AS', width: 30, align: 'center' },
  { key: 'ds', header: 'DS', width: 30, align: 'center' },
  { key: 'bs', header: 'BS', width: 30, align: 'center' },
  { key: 'tm', header: 'TM', width: 32, align: 'center' },
  { key: 'rp', header: 'RP', width: 30, align: 'center' },
  { key: 'tk', header: 'TK', width: 30, align: 'center' },
  { key: 'mg', header: 'MG', width: 32, align: 'center' },
  { key: 'attach', header: '\u{1F4CE}', width: 32, align: 'center' },
]

/**
 * The row New Record puts at the top of the list. The manual's "How to Create
 * an Encounter" says the date and the doctor arrive filled in and the rest is
 * typed, and that `#` is the number of five-minute slots the visit needs — so
 * the draft carries those three and leaves the rest blank.
 */
const DRAFT_ENCOUNTER: EncounterListRow = {
  /* "The date and doctor fields will be automatically populated" (303061):
     today, and the desktop provider */
  id: 'draft', date: MOIS_TODAY, hr: '', mn: '', code: '', mode: '', nbr: '',
  provider: 'TECHNICAL SUPPORT', reason: '', loc: '', alert: false,
}


const ENCOUNTER_TABS = ['Report', 'Distribution'] as const
type EncounterTab = typeof ENCOUNTER_TABS[number]

export function EncounterListView({ onOpen, draft = false, onDraft }: {
  onOpen?: (row: EncounterListRow) => void
  /** a New Record is in progress: the list carries an unsaved row */
  draft?: boolean
  onDraft?: (next: boolean) => void
}) {
  const patient = usePatient()
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState<EncounterTab>('Report')
  /* the two filters over the grid. MOIS really drops rows from the retrieval
     when they are ticked; the captures only ever show them clear, so here
     they carry their state and nothing else. */
  const [hideSeries, setHideSeries] = useState(false)
  const [hideFuture, setHideFuture] = useState(false)
  /* a chart with a real export behind it lists its own encounters */
  const exported = useChartRows('encounters')
  /* a saved New Record, and any paper clips attached this session, come
     from the frame's session copy (host/encounterArea) */
  const { session, update } = useEncounterSession()
  const listed = [...session.saved, ...exported].map((r) => ({
    ...r,
    /* Mode is stored as a SNOMED CT concept; the list prints its short name */
    mode: VISIT_MODES[r.mode ?? '']?.short ?? r.mode ?? '',
    attach: session.attachments[`encounter:${r.id}`]
      ? String((Number((r as { attach?: string }).attach) || 0) + session.attachments[`encounter:${r.id}`]!)
      : (r as { attach?: string }).attach,
  })) as unknown as EncounterListRow[]
  const rows = draft ? [DRAFT_ENCOUNTER, ...listed] : listed
  const current = rows[cur] ?? rows[0]
  /* Attachment acts on the row the cursor is on */
  const target = current?.id && current.id !== 'draft' ? `encounter:${current.id}` : null
  useEffect(() => {
    update((s) => (s.attachTarget === target ? s : { ...s, attachTarget: target }))
  }, [target, update])
  useScreenReport({
    savedEncounters: session.saved.length,
    attached: Object.entries(session.attachments).filter(([k]) => k.startsWith('encounter:')).reduce((n, [, v]) => n + v, 0),
  })
  /* Save (F2) commits the draft: it becomes an encounter with a number */
  const saveDraft = () => {
    if (draft) {
      update((s) => ({
        ...s,
        saved: [{ ...DRAFT_ENCOUNTER, id: nextEncounterId(patient.chart, s.saved), date: MOIS_TODAY, hr: '', mn: '', code: '', mode: '', nbr: '', reason: '', loc: '' }, ...s.saved],
      }))
    }
    onDraft?.(false)
  }

  /* MOIS paints an encounter that has not happened yet on a red band — every
     row in both captures is a 2030 appointment and every one of them is red.
     A fixture says so outright; a row that arrived from a chart export is
     judged by its date. */
  const today = MOIS_TODAY
  const future = (r: EncounterListRow) =>
    (typeof r.alert === 'boolean' ? r.alert : (r.date ?? '') > today)

  const distribution = readRowList<EncounterDistRow>(current, 'distribution')
  const captions = ['Report', `Distribution (${distribution.length})`]

  return (
    <>
      <PBViewHeader title="Encounter" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { onDraft?.(true); setCur(0) } },
          { label: 'Delete Record' },
          /* enabled at rest, as the capture shows; the click still only means
             something while a draft row is open */
          { label: 'Save', onClick: saveDraft },
          { label: 'Undo', onClick: () => { onDraft?.(false); setCur(0) } },
          { label: 'Refresh' }, { label: 'Print' }, { label: 'Attachment' },
        ]}
      />
      {/* the four captions are painted at 13 / 183 / 322 / 493 across the work
          area, and this window has no Active ENC# block after them */}
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first, w: 170 },
          { label: 'MIDDLE:', value: patient.middle, w: 139 },
          { label: 'LAST:', value: patient.last, w: 171 },
          { label: 'DoB:', value: patient.dob },
        ]}
      />

      {/* The search band: six unlabelled boxes on the window's grey, ruled off
          top and bottom. They are painted where the capture puts them — 125 /
          231 / 325 / 470 / 553 from the work area's left edge — and nothing in
          the capture says what any of them searches, so none of them carries a
          caption. The sixth finishes flush with the window's right edge in
          both captures although the two windows differ in width, so it is
          anchored there rather than painted at an offset. */}
      <div
        className="pb-row"
        style={{
          padding: '2px 0',
          background: 'var(--pb-band)',
          borderTop: '1px solid #656565',
          borderBottom: '1px solid #656565',
          gap: 0,
          flex: 'none',
        }}
      >
        <PBInput w={39} style={{ marginLeft: 125, flex: 'none' }} />
        <PBInput w={93} style={{ marginLeft: 67, flex: 'none' }} />
        <PBInput w={144} style={{ marginLeft: 1, flex: 'none' }} />
        <PBInput w={65} style={{ marginLeft: 1, flex: 'none' }} />
        <PBInput w={49} style={{ marginLeft: 18, flex: 'none' }} />
        <PBInput w={93} style={{ marginLeft: 'auto', flex: 'none' }} />
      </div>

      <div className="pb-row" style={{ padding: '4px 0 5px 24px', gap: 25, flex: 'none' }}>
        <PBCheckbox
          label="Hide Future Appointment Series"
          checked={hideSeries}
          onChange={setHideSeries}
        />
        <PBCheckbox
          label="Hide Future Appointments All"
          checked={hideFuture}
          onChange={setHideFuture}
        />
      </div>

      {/* the grid runs the full width; live TRAINING comparison gives a 240px list */}
      <div
        style={{ height: 240, display: 'flex', flex: 'none' }}
        onKeyDown={(event) => {
          if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey
            || event.key.toLowerCase() !== 'z' || !current || current.id === 'draft') return
          event.preventDefault()
          event.stopPropagation()
          onOpen?.(current)
        }}
      >
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => { if (r.id !== 'draft') onOpen?.(r) }}
          rowStatus={(r) => (future(r) ? 'alert' : 'normal')}
          rowTutorialId={(r) => `host.mois.row.encounter-${r.id}`}
          columns={encounterColumns}
        />
      </div>

      {/* The lower pane belongs to the current encounter, so it is remounted
          as the row moves — the way MOIS re-retrieves it. */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          key={cur}
          tabs={captions}
          active={tab === 'Report' ? 'Report' : captions[1]}
          onChange={(next) => setTab(next.startsWith('Distribution') ? 'Distribution' : 'Report')}
          compact
          face
        >
          {tab === 'Report' && <EncounterReportPage key={current?.id} row={current} />}
          {tab === 'Distribution' && <EncounterDistributionPage rows={distribution} />}
        </PBTabs>
      </div>
    </>
  )
}

/**
 * A list the lower pane draws for the current encounter. Neither list is in
 * the field audit — both are read-only roll-ups — so the row carries them
 * only when a chart export has them to give.
 */
function readRowList<T>(row: EncounterListRow | undefined, key: 'report' | 'distribution'): T[] {
  if (!row || !(key in row)) return []
  return (row as { report?: T[]; distribution?: T[] })[key] ?? []
}

/* --- Encounter ▸ Report ---------------------------------------------------
   The times the visit was worked through, then the encounter's own record
   list: the Date / Description / Detail / Hyperlink grid MOIS uses wherever
   it rolls a chart up, under its Expand All / Collapse All pair.           */
function EncounterReportPage({ row }: { row?: EncounterListRow }) {
  const data = useChartExport()
  const rows: EncounterReportRow[] = row ? [
    ...(data?.encounter_note ?? []).filter(r => r.id_encounter === row.id).map(r => ({ section: 'PROGRESS NOTES', date: date(r.dtm_note_create), description: r.str_author ?? '', detail: r.str_note ?? '' })),
    ...(data?.measure ?? []).filter(r => r.id_encounter === row.id).map(r => ({ section: 'MEASUREMENTS', date: date(r.dtm_collect_date), description: r.str_description ?? '', detail: [r.str_value, r.str_units].filter(Boolean).join(' ') })),
    ...(data?.form_header ?? []).filter(r => r.id_encounter === row.id).map(r => ({ section: 'ENCOUNTER FORMS', date: date(r.dtm_created), description: r.str_form_window ?? '', detail: '' })),
  ] : []
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const banded = rows.some((r) => r.section)

  return (
    <>
      {/* Arrived / In-Room / Seen / Discharge, each a date box and a time box
          — the same pair the Order window books an appointment with. The
          capture leaves all eight empty and the audit maps none of them. */}
      <div
        className="pb-row"
        style={{
          padding: '4px 0 4px 6px',
          gap: 0,
          borderTop: '1px solid #646464',
          borderBottom: '1px solid #646464',
          flex: 'none',
        }}
      >
        <EncounterTime label="Arrived:" labelW={56} />
        <EncounterTime label="In-Room:" labelW={81} />
        <EncounterTime label="Seen:" labelW={78} />
        <EncounterTime label="Discharge:" labelW={82} />
      </div>

      <div className="pb-row" style={{ padding: '3px 0 3px 8px', gap: 22, flex: 'none' }}>
        <button className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
        <button
          className="pb-link"
          onClick={() => setCollapsed(new Set(rows.map((r) => r.section ?? '')))}
        >
          Collapse All
        </button>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          head="grey"
          /* the captions sit 8px into their columns, which is what puts them
             at 492 / 563 / 910 / 1165 in the capture */
          style={{ ['--pb-dw-pad-x' as string]: '8px' }}
          gutter={false}
          rules={false}
          rows={rows}
          groupBy={banded ? (r) => r.section ?? '' : undefined}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          columns={[
            { key: 'date', header: 'Date', width: 70 },
            { key: 'description', header: 'Description', width: 348 },
            { key: 'detail', header: 'Detail', width: 255 },
            /* the caption is left in the column, the glyph centred in it —
               the width is Patient Summary's, since the capture's window
               clips this column rather than finishing it */
            { key: 'link', header: 'Hyperlink', width: 109, align: 'center', headAlign: 'left' },
            { key: '_pad', header: '' },
          ]}
          /* an encounter with nothing on it shows a blank band, not a message */
          empty=""
        />
      </div>
    </>
  )
}

/**
 * `Arrived: [date] [time]` — the label right-aligned in its own run, which is
 * what parks the four pairs of boxes at 65 / 265 / 462 / 663 across the pane.
 */
function EncounterTime({ label, labelW }: { label: string; labelW: number }) {
  return (
    <>
      <span style={{ width: labelW, textAlign: 'right', paddingRight: 8, flex: 'none' }}>{label}</span>
      <PBInput w={68} style={{ flex: 'none' }} />
      <PBInput w={48} align="center" defaultValue=":" style={{ marginLeft: 3, flex: 'none' }} />
    </>
  )
}

/* --- Encounter ▸ Distribution ---------------------------------------------
   Never captured with anything in it — the tab reads `Distribution (0)` in
   both shots — so the columns are the Order window's distribution list,
   which is the same widget in the same chart.                              */
function EncounterDistributionPage({ rows }: { rows: EncounterDistRow[] }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
      <PBDataWindow
        head="grey"
        gutter={false}
        zebra={false}
        rows={rows}
        columns={[
          { key: 'method', header: 'Method', width: 130, align: 'center' },
          { key: 'type', header: 'Recipient Type', width: 160, align: 'center' },
          { key: 'name', header: 'Name', width: 190, align: 'center' },
          { key: 'location', header: 'Location', align: 'center' },
          { key: 'status', header: 'Status', width: 130, align: 'center' },
        ]}
        empty="This encounter has not been distributed."
      />
    </div>
  )
}
