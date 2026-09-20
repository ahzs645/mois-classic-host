import { useMemo, useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBFixed, PBGroup, PBIdentityStrip, PBInput,
  PBLookup, PBRadio, PBSelect, PBTabs, PBTextArea, PBViewHeader,
  type PBColumn,
} from '../pb'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import {
  encounterRows, orderPayors, orderPriorities, orderReferralSources, orderRows, orderStatuses,
  type OrderDetail, type OrderRecipient, type OrderRow,
} from '../data/mois'

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

/** The width the Order window was painted at. */
const DESIGN_W = 1060

const columns: PBColumn<OrderRow>[] = [
  { key: 'date', header: 'Date', width: 78, align: 'center' },
  { key: 'type', header: 'Order Type', width: 117, align: 'center' },
  { key: 'by', header: 'Ordered By', width: 195 },
  { key: 'd1', header: '', dots: true, width: 22 },
  { key: 'to', header: 'Order To', width: 184 },
  { key: 'd2', header: '', dots: true, width: 22 },
  { key: 'for', header: 'Order For', width: 283 },
  { key: 'd3', header: '', dots: true, width: 27 },
  { key: 'st', header: 'ST', width: 32, align: 'center' },
  { key: 'links', header: 'Links', width: 34, align: 'center' },
  { key: 'attach', header: '\u{1F4CE}', width: 32, align: 'center' },
]

const TABS = ['Report', 'Distribution', 'Links', 'Office Notes', 'History'] as const
type Tab = typeof TABS[number]

export function OrderView({ onAttachment }: { onAttachment: () => void }) {
  const patient = usePatient()
  const [tab, setTab] = useState<Tab>('Report')
  const [cur, setCur] = useState(0)

  const order = orderRows[cur] ?? orderRows[0]
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
      <PBCommandRow
        commands={[
          { label: 'New Record' }, { label: 'Quick Entry' }, { label: 'Delete Record' },
          { label: 'Save', disabled: true }, { label: 'Undo', disabled: true }, { label: 'Refresh' },
          { label: 'Mark for Review' }, { label: 'Attachment', onClick: onAttachment },
          { label: 'Print' }, { label: 'Paste Provider Addr.', width: 118 }, { label: 'Respond' },
        ]}
      />

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

      <PBFixed style={{ padding: '0 3px', height: 342, display: 'flex' }}>
        <PBDataWindow columns={columns} rows={orderRows} current={cur} onCurrentChange={setCur} />
      </PBFixed>

      <PBFixed style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
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
    <div className="pb-order-report">
      <div className="pb-order-report__grid">
        <PBGroup title="Detail Information" style={{ width: 739 }}>
          <div className="pb-form" style={{ gridTemplateColumns: '120px 1fr', padding: '2px 0 0' }}>
            <DetailRow label="Attending:" value={d.attending} right="Facility:" rightValue={d.facility} />
            <DetailRow label="Ordered By:" value={d.orderedBy} right="Facility Ref.:" rightValue={d.facilityRef} />
            <DetailRow label="Responsible Org.:" value={d.responsibleOrg} right="Facility Loc.:" rightValue={d.facilityLoc} />

            <span className="pb-form__label">Referred To:</span>
            <div className="pb-row">
              <PBLookup w={347} defaultValue={d.referredTo ?? ''} />
              <span className="pb-row__spacer" />
              <span>Payor:</span>
              <PBSelect options={orderPayors} w={152} defaultValue={d.payor ?? ''} />
            </div>

            <span className="pb-form__label">Copies To:</span>
            <div className="pb-row"><PBLookup w={347} defaultValue={d.copiesTo ?? ''} /></div>

            <span className="pb-form__label">Transcribed:</span>
            <div className="pb-row">
              <PBInput w={182} defaultValue={d.transcribed?.[0] ?? ''} />
              <PBInput w={80} defaultValue={d.transcribed?.[1] ?? ''} />
              <PBInput w={53} defaultValue={d.transcribed?.[2] ?? ''} />
            </div>
          </div>
        </PBGroup>

        <PBGroup title="Appointment Booking" style={{ width: 308 }}>
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

        <PBGroup title="Referral Note" fill style={{ width: 739 }}>
          <PBTextArea
            style={{ flex: '1 1 auto', width: '100%', height: '100%' }}
            defaultValue={d.referralNote ?? ''}
          />
        </PBGroup>

        <PBGroup title="Order Management" style={{ width: 308 }}>
          <div className="pb-stack" style={{ paddingTop: 2 }}>
            <span>Order Assigned to:</span>
            <PBLookup w={278} defaultValue={d.assignedTo ?? ''} />
          </div>
          <div className="pb-form" style={{ gridTemplateColumns: '108px 1fr', padding: '6px 0 0' }}>
            <span className="pb-form__label">Referral Source:</span>
            <PBSelect options={orderReferralSources} w={170} defaultValue={d.referralSource ?? ''} />
            <span className="pb-form__label">Priority:</span>
            <PBSelect options={orderPriorities} w={170} defaultValue={d.priority ?? ''} />
            <span className="pb-form__label">Status:</span>
            <PBSelect options={orderStatuses} w={170} defaultValue={d.status ?? ''} />
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
        <PBLookup w={347} defaultValue={value ?? ''} />
        <span className="pb-row__spacer" />
        <span>{right}</span>
        <PBInput w={152} defaultValue={rightValue ?? ''} />
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

/**
 * The row New Record puts at the top of the list. The manual's "How to Create
 * an Encounter" says the date and the doctor arrive filled in and the rest is
 * typed, and that `#` is the number of five-minute slots the visit needs — so
 * the draft carries those three and leaves the rest blank.
 */
const DRAFT_ENCOUNTER = {
  id: 'draft', date: '2030.05.06', hr: '', mn: '', code: '', mode: '', nbr: '',
  provider: 'TECHNICAL SUPPORT', reason: '', loc: '', alert: false,
}

export function EncounterListView({ onOpen, draft = false, onDraft }: {
  onOpen?: (row: typeof encounterRows[number]) => void
  /** a New Record is in progress: the list carries an unsaved row */
  draft?: boolean
  onDraft?: (next: boolean) => void
}) {
  const patient = usePatient()
  const [cur, setCur] = useState(0)
  const rows = draft ? [DRAFT_ENCOUNTER, ...encounterRows] : encounterRows
  return (
    <>
      <PBViewHeader title="Encounter" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { onDraft?.(true); setCur(0) } },
          { label: 'Delete Record' },
          { label: 'Save', disabled: !draft, onClick: () => onDraft?.(false) },
          { label: 'Undo', disabled: !draft, onClick: () => { onDraft?.(false); setCur(0) } },
          { label: 'Refresh' }, { label: 'Print' }, { label: 'Attachment' },
        ]}
      />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:' },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '2025.01.01' },
        ]}
      />
      <div className="pb-row" style={{ padding: '3px 8px' }}>
        <PBInput w={64} /><PBInput w={330} /><PBInput w={96} /><PBInput w={72} /><PBInput w={180} />
      </div>
      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 28 }}>
        <label className="pb-check">
          <input type="checkbox" /><span className="pb-check__box" />
          <span className="pb-check__label">Hide Future Appointment Series</span>
        </label>
        <label className="pb-check">
          <input type="checkbox" /><span className="pb-check__box" />
          <span className="pb-check__label">Hide Future Appointments All</span>
        </label>
      </div>
      <div style={{ padding: '0 3px', height: 190, display: 'flex' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => onOpen?.(r)}
          rowStatus={(r) => (r.alert ? 'alert' : 'normal')}
          columns={[
            { key: 'date', header: 'Date', width: 74, align: 'center', italic: true },
            { key: 'hr', header: 'HR', width: 26, align: 'center', italic: true },
            { key: 'mn', header: 'MN', width: 30, align: 'center', italic: true },
            { key: 'code', header: 'Code', width: 40, align: 'center', italic: true },
            { key: 'mode', header: 'Mode', width: 40, align: 'center', italic: true },
            { key: 'nbr', header: '#', width: 26, align: 'center', italic: true },
            { key: 'provider', header: 'Provider', width: 106, italic: true },
            { key: 'reason', header: 'Visit Reason', width: 160 },
            { key: 'issue', header: 'Health Issue', width: 84 },
            { key: 'd1', header: '', dots: true },
            { key: 'services', header: 'Services', width: 68 },
            { key: 'd2', header: '', dots: true },
            { key: 'payor', header: 'Payor', width: 54 },
            { key: 'room', header: 'Room', width: 52 },
            { key: 'loc', header: 'Service Location', width: 138 },
          ]}
        />
      </div>
    </>
  )
}
