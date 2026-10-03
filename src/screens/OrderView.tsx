import { useEffect, useMemo, useState } from 'react'
import { useChartExport, useChartRows, useNodeRecords } from '../data/chart-records'
import { date, encounterStamp } from '../data/charts/relations'
import { finishTime, orderRecordModel } from '../data/charts/orders'
import {
  encounterRows, orderPayors, orderPriorities, orderReferralSources,
  type OrderDetail, type OrderRecipient, type OrderRow
} from '../data/mois'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_PROVIDER_DEFAULT, SESSION_USER } from '../data/session'
import { nextEncounterId, useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { useChartSession } from '../data/chartSession'
import { DESKTOP_PROVIDER, setCurrentOrder } from '../data/letterFlow'
import { SEED_DISTRIBUTIONS } from '../data/letterDocs'
import { VISIT_MODE_CONCEPTS } from '../data/clinicManagement'
import { ORDER_STATUS_ROWS, ORDER_TYPES, orderStatusWord } from '../data/orderVocab'
import { useRespondToOrder, useResponseLinks } from './LetterResponseWindows'
import { useOpenWindow } from './areaWindowRegistry'
import { ChartIdentityStrip } from './patientKit'
import type { QuickEntryApplied } from './quickEntryApply'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBFixed, PBGroup, PBInput,
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
  /* Order Type's cells are left in their column, under a centred caption —
     CONSULTATION / IMAGE / LAB start at the column's left edge in both the
     DEV capture (order-office.png) and the TRAINING one (order-report.png) */
  { key: 'type', header: 'Order Type', width: 93, headAlign: 'center' },
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

/* the Order Type (303588) and Status (2961349) DDDWs live in data/orderVocab;
   ORDER_STATUS_ROWS stays exported from here for the windows that import it */
export { ORDER_STATUS_ROWS }
const statusWord = orderStatusWord

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
  const openWindow = useOpenWindow()

  const exportedOrders = draft ? [draft, ...exported] : exported
  const offset = draft ? 1 : 0

  const records = useNodeRecords('orders')
  const chartData = useChartExport()
  /* the current order, by the id its row is anchored on, so a lesson can
     grade "that order is the one you are on" (host.screen.row) */
  const currentOrderId = draft && cur === 0 ? null : records[cur - offset]?.id_order
  useScreenReport({ draft: !!draft, row: draft && cur === 0 ? 'order-new' : currentOrderId ? `order-${currentOrderId}` : null })
  /* Standard Mode's Create Referral Note and Respond act on this order
     (data/letterFlow.ts currentOrderId, screens/LetterResponseWindows.tsx) */
  useEffect(() => { setCurrentOrder(currentOrderId ?? null) }, [currentOrderId])
  const respond = useRespondToOrder()
  const responseLinks = useResponseLinks(currentOrderId ?? undefined)
  const r = records[cur - offset]
  /* a letter distributed from this order this session (screens/LetterWindows.tsx) */
  const sent = [
    ...session.distributions,
    /* the training overlay's already-sent letter (data/letterDocs.ts) */
    ...SEED_DISTRIBUTIONS.filter((d) => d.chart === patient.chart),
  ].filter((d) => d.orderId && d.orderId === r?.id_order)
  const order: OrderRow | undefined = draft && cur === 0 ? { ...draft, detail: { orderedBy: DESKTOP_PROVIDER, status: 'IP', priority: 'ROUTINE' } }
    : exportedOrders?.[cur] ? { ...exportedOrders[cur], linkRows: [...(exportedOrders[cur].linkRows ?? []), ...responseLinks], distribution: sent.map((d) => ({
      sentAt: d.date, document: d.title, by: SESSION_USER,
      recipients: d.rows.map((x) => ({ method: x.method, type: x.type, name: x.name, location: '', status: x.status })),
    })), detail: {
    attending: r?.str_attending, orderedBy: r?.str_order_by, responsibleOrg: r?.str_responsible_org,
    referredTo: r?.str_performed_by, copiesTo: r?.str_copy_to, facility: r?.str_facility,
    facilityRef: r?.str_filler_ref_no, facilityLoc: r?.str_facility_loc,
    referralNote: r?.str_note, assignedTo: r?.str_assignedto, priority: r?.str_priority_code,
    status: r?.str_status, finishedOn: r?.dtm_finish_date?.replace(/\//g, '.'),
    /* Finished is a date and a time (303526 "the date and time of its
       completion"): dtm_finish_date + dtm_finish_time */
    finishedTime: finishTime(r),
    /* ids and flags no captured control prints (charts/orders.ts) */
    record: r ? orderRecordModel(r, chartData) : undefined,
    /* The footer, as evidence/MATRIX-R1060-attending (DEV) and
       order-report.png (TRAINING) both print it: "Source: SYSTEM" is the
       interface the order came in on (str_interface — str_source is only
       INT / EXT), Sent Date is the order date in both captures, the
       right-hand link is the record state (UNSIGNED / SIGNED), "Created:"
       is `yyyy.mm.dd hh:mm  USER`, and an order raised off any encounter
       links "ENC# EMPTY" rather than nothing. */
    source: r ? (r.str_interface || r.str_source) : undefined,
    sentDate: r?.dtm_ord_date?.replace(/\//g, '.'),
    signature: r?.stp_record_state,
    created: r ? [r.stp_date_create?.replace(/\//g, '.').replace(/(\d\d:\d\d):\d\d$/, '$1'), r.stp_user_create].filter(Boolean).join('  ') : undefined,
    encounter: r ? (r.id_encounter && r.id_encounter !== '0' ? r.id_encounter : 'EMPTY') : undefined,
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
      {/* One row, never wrapped. This Task Bar is text-sized, not the uniform
          80.5: the DEV capture at 1:1 (order-office.png, the same window
          width as the stage's) puts the edges at 480 / 556 / 632 / 708 / 774
          / 840 / 906 / 994 / 1070 / 1130 / 1237, and the TRAINING capture
          (order-report.png) agrees to a pixel per button and gives Respond
          its 63. In a window this wide MOIS lets Respond run off the right
          edge, cut through its caption, and so does the stage. */}
      <style href="mois-classic/order-cmds" precedence="medium">{'.pb-order-cmds > .pb-cmdrow { flex-wrap: nowrap; overflow: hidden; }'}</style>
      <div className="pb-order-cmds" style={{ flex: 'none', minWidth: 0 }}>
        <PBCommandRow
          commands={[
            {
              label: 'New Record',
              exactWidth: 76,
              onClick: () => {
                setDraft({ date: MOIS_TODAY, type: '', by: DESKTOP_PROVIDER, to: '', for: '', st: 'IP', links: '-', attach: '-' })
                setCur(0)
                setTab('Report')
              },
            },
            /* art. 3071982 "Using Quick Entry in Orders": the searchable
               Quick Entry - Chart Order window (screens/QuickEntryWindows.tsx);
               Continue puts the templated order in as the new record */
            {
              label: 'Quick Entry',
              exactWidth: 76,
              onClick: () => openWindow('quick-entry-chart', {
                group: 'Order',
                onApply: ({ template, values }: QuickEntryApplied) => {
                  setDraft({
                    date: values.orderDate || MOIS_TODAY, type: template.order?.type ?? '', by: values.orderBy || DESKTOP_PROVIDER,
                    to: values.orderTo ?? '', for: template.order?.orderFor ?? '', st: 'IP', links: '-',
                    attach: template.order?.attachment ? '1' : '-',
                  })
                  setCur(0)
                  setTab('Report')
                },
              }),
            },
            { label: 'Delete Record', exactWidth: 76 },
            /* MOIS draws Save and Undo in full black here, not greyed — both
               captures of this window show them enabled at rest. */
            { label: 'Save', exactWidth: 66, onClick: () => setDraft(null) },
            { label: 'Undo', exactWidth: 66, onClick: () => { setDraft(null); setCur(0) } },
            { label: 'Refresh', exactWidth: 66 },
            { label: 'Mark for Review', exactWidth: 88 }, { label: 'Attachment', exactWidth: 76, onClick: onAttachment },
            { label: 'Print', exactWidth: 60 }, { label: 'Paste Provider Addr.', exactWidth: 107 },
            /* 2961349 `ad5aba34…`: answer the Information Request on this row */
            { label: 'Respond', exactWidth: 63, onClick: () => respond(currentOrderId ?? undefined, openWindow) },
          ]}
        />
      </div>

      {/* patient identity strip — fields sit at the offsets they were painted
          at: FIRST / MIDDLE / LAST / DoB / Active ENC# at 492 / 662 / 801 /
          972 / 1092 in the 1:1 DEV capture (order-office.png), the same
          170 / 139 / 171 / 120 run the TRAINING capture gives at 200% and
          the Encounter window paints. The old 186 / 145 / 208 / 113 pushed
          Active ENC# off the right edge ("NO ENCOUNTE…"). */}
      <ChartIdentityStrip
        widths={{ first: 170, middle: 139, last: 171, dob: 120 }}
        encounter={patient.encounter ?? 'NO ENCOUNTER'}
        search
        fixedSearch
      />

      {/* The order list is the part of this window that takes up its height:
          the 1:1 DEV capture (order-office.png, MOIS window 705px tall) draws
          it 138px from header top to frame bottom, the TRAINING capture's
          taller window ~347. The stage's window is ~40px taller than DEV's,
          so the list is 138 + 40 — which leaves the Report tab its four
          group boxes and the Source / Created footer, as DEV shows them. At
          207 the tab page started 87px lower than DEV's and Order
          Management's Finished row and the footer fell off the bottom. */}
      <PBFixed style={{ padding: '0 3px', height: 178, display: 'flex' }}>
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
   raised on hyperlinked at the right.

   Measured off the 1:1 DEV capture of this page
   (evidence/MATRIX-R1060-attending/ui-original.png), every offset from its
   group box's left edge, and checked against the TRAINING capture at 200%
   (reference/order-report.png), which gives the same numbers halved:
     Detail Information  555 wide; captions at 9, fields at 100; the three
                         lookups and Referred To / Copies To all 260 wide
                         (with their "…"); the right-hand captions end at
                         426 and their boxes run 430–545; Transcribed is
                         135 / 61 / 40.
     Appointment Booking 233 wide, 5px right of Detail Information;
                         controls at 88; Office at 88, Patient at 149; the
                         date box 72, the time box 44; Patient Notified at 96.
     Order Management    Order Assigned to: over a 209 lookup; drop-downs at
                         93, 127 wide; Finished 72 + 50.
   Every row is on a 20px pitch (a 19px field and 1px), not the kit's 22.
   The footer keys sit 76px apart, Source's value 107: Sent Date at +183.
   The Referral Note is a monospaced text column ("ORDER BY: GHATAVI, …").  */
const REPORT_ROWS = { ['--pb-row-gap' as string]: '1px' }

function ReportPage({ order }: { order?: OrderRow }) {
  const d: OrderDetail = order?.detail ?? {}
  return (
    /* the page scrolls rather than letting the boxes run under the footer
       when the tab is shorter than the window it was painted in */
    <div className="pb-order-report" style={{ overflowY: 'auto' }}>
      <div className="pb-order-report__grid" style={{ flex: '1 0 auto', minHeight: 262, gap: '5px 5px' }}>
        <PBGroup title="Detail Information" style={{ width: 555 }}>
          <div className="pb-form" style={{ gridTemplateColumns: '84px 1fr', padding: '2px 0 0', ...REPORT_ROWS }}>
            <DetailRow label="Attending:" value={d.attending} right="Facility:" rightValue={d.facility} />
            <DetailRow label="Ordered By:" value={d.orderedBy} right="Facility Ref.:" rightValue={d.facilityRef} />
            <DetailRow label="Responsible Org.:" value={d.responsibleOrg} right="Facility Loc.:" rightValue={d.facilityLoc} />

            <span className="pb-form__label">Referred To:</span>
            <div className="pb-row">
              <span style={{ flex: 'none' }}><PBLookup w={260} defaultValue={d.referredTo ?? ''} /></span>
              <span style={{ flex: '1 1 auto', textAlign: 'right' }}>Payor:</span>
              <PBSelect options={orderPayors} w={115} defaultValue={d.payor ?? ''} />
            </div>

            <span className="pb-form__label">Copies To:</span>
            <div className="pb-row"><span style={{ flex: 'none' }}><PBLookup w={260} defaultValue={d.copiesTo ?? ''} /></span></div>

            <span className="pb-form__label">Transcribed:</span>
            <div className="pb-row" style={{ gap: 3 }}>
              <PBInput w={135} defaultValue={d.transcribed?.[0] ?? ''} />
              <PBInput w={61} defaultValue={d.transcribed?.[1] ?? ''} />
              <PBInput w={40} defaultValue={d.transcribed?.[2] ?? ''} />
            </div>
          </div>
        </PBGroup>

        <PBGroup title="Appointment Booking" style={{ width: 233 }}>
          <div className="pb-form" style={{ gridTemplateColumns: '72px 1fr', padding: '2px 0 0', ...REPORT_ROWS }}>
            <span className="pb-form__label">Responsibility:</span>
            <div className="pb-row" style={{ gap: 15 }}>
              <PBRadio name="order-responsibility" label="Office" checked={d.responsibility === 'Office'} />
              <PBRadio name="order-responsibility" label="Patient" checked={d.responsibility === 'Patient'} />
            </div>

            <span className="pb-form__label">Date / Time:</span>
            <div className="pb-row" style={{ gap: 4 }}>
              <PBInput w={72} defaultValue={d.bookedDate ?? ''} />
              <PBInput w={44} align="center" defaultValue={d.bookedTime ?? ':'} />
            </div>

            <span className="pb-form__label">Notify:</span>
            <div className="pb-row" style={{ paddingLeft: 8 }}>
              <PBCheckbox label="Patient Notified" checked={!!d.notified} />
            </div>
          </div>
        </PBGroup>

        <PBGroup title="Referral Note" fill style={{ width: 555 }}>
          <PBTextArea
            style={{ flex: '1 1 auto', width: '100%', height: '100%', fontFamily: 'var(--pb-font-mono)' }}
            defaultValue={d.referralNote ?? ''}
          />
        </PBGroup>

        <PBGroup title="Order Management" style={{ width: 233 }}>
          <div className="pb-stack" style={{ paddingTop: 2 }}>
            <span>Order Assigned to:</span>
            <PBLookup w={209} defaultValue={d.assignedTo ?? ''} />
          </div>
          <div className="pb-form" style={{ gridTemplateColumns: '77px 1fr', padding: '4px 0 0', ...REPORT_ROWS }}>
            <span className="pb-form__label">Referral Source:</span>
            <PBSelect options={orderReferralSources} w={127} defaultValue={d.referralSource ?? ''} />
            <span className="pb-form__label">Priority:</span>
            <PBSelect options={orderPriorities} w={127} defaultValue={d.priority ?? ''} />
            <span className="pb-form__label">Status:</span>
            <PBDropDownDataWindow
              w={127}
              listW={300}
              display="status"
              value={statusWord(d.status)}
              tutorialId="host.mois.field.order-status"
              columns={[{ key: 'status', header: 'Status', width: 120 }, { key: 'description', header: 'Description' }]}
              rows={ORDER_STATUS_ROWS}
            />
            <span className="pb-form__label">Finished:</span>
            <div className="pb-row" style={{ gap: 5 }}>
              <PBInput w={72} defaultValue={d.finishedOn ?? ''} />
              <PBInput w={50} defaultValue={d.finishedTime ?? ''} />
            </div>
          </div>
        </PBGroup>
      </div>

      <div className="pb-order-report__footer">
        <div className="pb-order-report__line">
          <span className="pb-order-report__key" style={{ width: 76 }}>Source:</span>
          <span className="pb-order-report__val" style={{ width: 107 }}>{d.source ?? ''}</span>
          <span className="pb-order-report__key pb-order-report__key--2" style={{ width: 56 }}>Sent Date:</span>
          <span>{d.sentDate ?? ''}</span>
          <span className="pb-row__spacer" />
          {d.signature && <button className="pb-link">{d.signature}</button>}
        </div>
        <div className="pb-order-report__line">
          <span className="pb-order-report__key" style={{ width: 76 }}>Created:</span>
          <span>{d.created ?? ''}</span>
          <span className="pb-row__spacer" />
          {d.encounter && <button className="pb-link">ENC# {d.encounter}</button>}
        </div>
      </div>
    </div>
  )
}

/** One `label [field] … right-label [field]` row of the Detail Information
 *  box: the lookup keeps its 260 whatever the right-hand caption's length,
 *  and the caption is right-aligned against its box, as MOIS paints it. */
function DetailRow({ label, value, right, rightValue }: {
  label: string; value?: string; right: string; rightValue?: string
}) {
  return (
    <>
      <span className="pb-form__label">{label}</span>
      <div className="pb-row">
        <span style={{ flex: 'none' }}><PBLookup w={260} defaultValue={value ?? ''} /></span>
        <span style={{ flex: '1 1 auto', textAlign: 'right', whiteSpace: 'nowrap' }}>{right}</span>
        <PBInput w={115} defaultValue={rightValue ?? ''} />
      </div>
    </>
  )
}

/* --- Distribution ---------------------------------------------------------
   A grey-headed grid whose bands are the distribution events: the document
   that went out is a hyperlink in the band, and each recipient under it is
   painted yellow.

   The captions and cells are left in their columns, and both start at the
   same x: Method / Recipient Type / Name / Location / Status at 35 / 127 /
   269 / 460 / 730 from the page's left edge, in the TRAINING capture with a
   distribution in it (reference/order-distribution.png: INTERNAL, PRIMARY
   RECIPIENT, SUS NOW 1 TER, the location text, SUCCESS) and in the 1:1 DEV
   capture of an empty one (order-distribution.png) alike. There is no gutter:
   the event band's ⊟ sits at 13, so the run opens on a blank 31px column.
   The header is the window face with no weight and no rule under it.     */
type DistRow = OrderRecipient & { event: string; document: string; by: string }

/** the grey caption band of the Distribution and Links pages: MOIS letters
 *  it in the body weight, with no rule under it (order-distribution.png,
 *  order-links.png, and both TRAINING captures) — the kit's grey header is
 *  Patient Summary's bold one */
const PLAIN_HEAD_CSS = '.pb-order-plainhead .pb-dw--head-grey .pb-dw__table > thead > tr > th { font-weight: 400; border-bottom: 0; }'

function DistributionPage({ order }: { order?: OrderRow }) {
  const rows: DistRow[] = (order?.distribution ?? []).flatMap((d) =>
    d.recipients.map((r) => ({ ...r, event: d.sentAt, document: d.document, by: d.by })),
  )
  return (
    <div className="pb-order-plainhead" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
      <style href="mois-classic/order-plainhead" precedence="medium">{PLAIN_HEAD_CSS}</style>
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
          { key: '_lead', header: '', width: 31 },
          { key: 'method', header: 'Method', width: 92 },
          { key: 'type', header: 'Recipient Type', width: 142 },
          { key: 'name', header: 'Name', width: 191 },
          { key: 'location', header: 'Location', width: 270 },
          { key: 'status', header: 'Status' },
        ]}
        /* an order with no distribution shows the bare header over white */
        empty={false}
      />
    </div>
  )
}

/* --- Links ----------------------------------------------------------------
   Section is captioned at its left edge, Date centred over right-aligned
   dates, Description at its left: 19 / 156 (centre) / 193 from the page's
   edge in order-links.png (DEV, 1:1), the DOCUMENT · 2025.07.09 · ANXIETY
   row in reference/order-links.png (TRAINING) giving the same 104 / 69
   column run. The kit's gutter is 13 to MOIS's 17, so Section takes the
   difference and Date and Description land where they were painted.      */
function LinksPage({ order }: { order?: OrderRow }) {
  return (
    <div className="pb-order-plainhead" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
      <style href="mois-classic/order-plainhead" precedence="medium">{PLAIN_HEAD_CSS}</style>
      <PBDataWindow
        head="grey"
        zebra={false}
        rows={order?.linkRows ?? []}
        rowStatus={() => 'highlight' as const}
        columns={[
          { key: 'section', header: 'Section', width: 108, headAlign: 'left' },
          { key: 'date', header: 'Date', width: 69, align: 'right', headAlign: 'center' },
          {
            key: 'desc', header: 'Description', headAlign: 'left',
            render: (r) => <button className="pb-link">{r.desc}</button>,
          },
        ]}
        empty={false}
      />
    </div>
  )
}

/* --- Office Notes ---------------------------------------------------------
   Date 85, Author 134, Note the rest (order-office.png, DEV 1:1, separators
   at 579 / 713; reference/order-office-notes.png, TRAINING, 2024.10.03 ·
   SINGH, SANDEEP · CONTACT THE CLIENT): the date centred, the author and
   the note left in their columns. An order with no notes shows the header
   over white, no message.                                                  */
function OfficeNotesPage({ order }: { order?: OrderRow }) {
  return (
    <>
      <PBBandRow title="Office Notes" actions={['New', 'Delete']} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'date', header: 'Date', width: 85, align: 'center' },
            { key: 'author', header: 'Author', width: 134, headAlign: 'center' },
            { key: 'note', header: 'Note', headAlign: 'center' },
          ]}
          rows={order?.notes ?? []}
          empty={false}
        />
      </div>
    </>
  )
}

/* --- History --------------------------------------------------------------
   Date / Time 94, Changed By 173, Field 127, Changed To 177, Reason for
   Change the rest — the caption run of order-history.png (DEV 1:1, cells at
   497 / 591 / 764 / 891 / 1068). The audit's Comment (MATRIX-R1133) is not
   a column here; it was not testable on an order with no history.          */
function HistoryPage({ order }: { order?: OrderRow }) {
  return (
    <>
      <PBBandRow title="Status / Assigned to History" actions={['Edit', 'Delete']} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'when', header: 'Date / Time', width: 94, align: 'center' },
            { key: 'by', header: 'Changed By', width: 173, align: 'center' },
            { key: 'field', header: 'Field', width: 127, align: 'center' },
            { key: 'to', header: 'Changed To', width: 177, align: 'center' },
            { key: 'reason', header: 'Reason for Change', align: 'center' },
          ]}
          rows={order?.history ?? []}
          empty={false}
        />
      </div>
    </>
  )
}

/** The caption band over Office Notes and History: a 22px band ruled top
 *  and bottom, its two buttons the band's full height, flat and
 *  black-edged like the Task Bar's, 52 / 53 wide (order-office.png and
 *  order-history.png, DEV 1:1: band y 363–386, New / Edit at 1185–1236,
 *  Delete at 1237–1289; the TRAINING office-notes capture agrees). */
function PBBandRow({ title, actions }: { title: string; actions: string[] }) {
  return (
    <div className="pb-band" style={{ minHeight: 22, paddingRight: 0, borderTop: '1px solid #656565', borderBottom: '1px solid #656565' }}>
      {title}
      <span className="pb-band__spacer" />
      <span style={{ display: 'flex', alignSelf: 'stretch' }}>
        {actions.map((a, i) => (
          <PBButton key={a} bare className="pb-cmdrow__btn" style={{ width: i === 0 ? 52 : 53, height: 'auto', fontWeight: 400 }}>{a}</PBButton>
        ))}
      </span>
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
  provider: DESKTOP_PROVIDER_DEFAULT, reason: '', loc: '', alert: false,
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
    mode: VISIT_MODE_CONCEPTS[r.mode ?? '']?.short ?? r.mode ?? '',
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
      <ChartIdentityStrip widths={{ first: 170, middle: 139, last: 171 }} noEncounter />

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
  const record = row ? data?.encounter.find((r) => r.id_encounter === row.id) : undefined
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
          capture leaves all eight empty. They are the encounter's Times —
          tdt_encounter.dtm_<stamp> and num_<stamp>_hr / _min, as the
          Encounter Detail Window's Times column maps them (the Data
          Dictionary workbook's Matrix rows 393–400) — so a chart export
          fills them from the current row. */}
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
        <EncounterTime label="Arrived:" labelW={56} at={encounterStamp(record, 'arrived')} />
        <EncounterTime label="In-Room:" labelW={81} at={encounterStamp(record, 'inroom')} />
        <EncounterTime label="Seen:" labelW={78} at={encounterStamp(record, 'seen')} />
        <EncounterTime label="Discharge:" labelW={82} at={encounterStamp(record, 'discharge')} />
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
          /* an encounter with nothing on it shows the grid's bare white body,
             not a message (encounter-current-screen.png) */
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
function EncounterTime({ label, labelW, at }: { label: string; labelW: number; at: { date: string; time: string } }) {
  return (
    <>
      <span style={{ width: labelW, textAlign: 'right', paddingRight: 8, flex: 'none' }}>{label}</span>
      <PBInput w={68} style={{ flex: 'none' }} defaultValue={at.date} />
      <PBInput w={48} align="center" defaultValue={at.time || ':'} style={{ marginLeft: 3, flex: 'none' }} />
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
