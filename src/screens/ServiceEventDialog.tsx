import { useState, type CSSProperties, type ReactNode } from 'react'
import { linkedOrderRows } from '../data/mois'
import { usePatient } from '../data/patient-context'
import {
  PBBand, PBButton, PBDataWindow, PBInput, PBLookup, PBPatientBannerBlue,
  PBSelect, PBTabs, PBTextArea,
} from '../pb'
import { ModalWindow } from './dialogKit'

/* ============================================================================
   Patient Service Event — the window Service(s) ▸ New… (after the episode
   picker) and Edit… open over the Encounter Detail Window.

   PROVENANCE: v02.31.23 TRAINING captures at the stage's 1:1 scale, the
   dialog at x 291–1221, y 68–722:
     encounter-service-event-editor.png     a new event: Service Episode
                                            editable, Service Phase greyed,
                                            no Change Linked Service Episode…
     encounter-service-event-populated.png  a saved event reopened: Service
                                            Episode greyed, Service Phase a
                                            live drop-down, Change Linked
                                            Service Episode… at the left
     encounter-service-health-populated.png a health issue and its Certainty
     encounter-linked-order-populated.png   Linked Orders (1) with Manage…
   and evidence/MATRIX-R0432-start-date … MATRIX-R0447-linked-orders. All x
   below are from the dialog's left edge; the banner and the episode box are
   inset 13px (304–1208), the tab page 14px (305–1209).
   ========================================================================= */

/** the encounter the event is filed on — the banner's lower band */
export type ServiceEventVisit = {
  date: string
  time: string
  visit: string
  attending: string
  location: string
  note: string
}

export type LinkedOrderRow = { date: string; by: string; to: string; desc: string }

/** what the window opens on: the episode, and the event when it is a saved one */
export type ServiceEventRecord = {
  start: string
  stop: string
  episode: string
  mrp: string
  memberOf: string
  stopReason: string
  phase: string
  event: string
  issues: { issue: string; certainty: string }[]
}

const BLANK: ServiceEventRecord = {
  start: '', stop: '', episode: '', mrp: '', memberOf: '', stopReason: '', phase: '', event: '', issues: [],
}

/* the two tabs are one width, 108px ("Service Event" 304–412, "Linked
   Orders (0)" 414–522: PBTabs' `tabWidth`); the banner's captions sit 4px
   in from its edge */
const TAB_WIDTH = 108
const SCOPE = 'pb-service-event'
const SCOPED_CSS = `
.${SCOPE} .pb-banner-blue__top, .${SCOPE} .pb-banner-blue__bottom { padding: 3px 4px 4px; min-height: 39px; }
.${SCOPE} .pb-banner-blue__cell { overflow: hidden; padding-right: 4px; }
.${SCOPE} .pb-tabs__page { border: 1px solid #a0a0a0; border-top: 0; margin: 0 0 0 1px; }
`

/** a control placed at the capture's x / y inside its box */
const at = (left: number, top: number, children: ReactNode, style?: CSSProperties) => (
  <div style={{ position: 'absolute', left, top, ...style }}>{children}</div>
)
const label = (text: string, style?: CSSProperties) => (
  <span style={{ display: 'block', lineHeight: '19px', whiteSpace: 'nowrap', ...style }}>{text}</span>
)

export function ServiceEventDialog({ onClose, visit, mode = 'edit', record, linkedOrders, onSave }: {
  onClose: () => void
  visit?: ServiceEventVisit
  /** `new`: filed from New… over a picked episode; `edit`: a saved event */
  mode?: 'new' | 'edit'
  record?: Partial<ServiceEventRecord>
  /** the orders linked to this event; the window opened on its own (Order
      ▸ Attachment) shows the populated capture's one */
  linkedOrders?: LinkedOrderRow[]
  onSave?: () => void
}) {
  const patient = usePatient()
  const [tab, setTab] = useState('Service Event')
  const r = { ...BLANK, ...record }
  const orders = linkedOrders ?? linkedOrderRows
  const isNew = mode === 'new'
  const ordersTab = `Linked Orders (${orders.length})`

  return (
    <ModalWindow
      id="service-event"
      title="Patient Service Event"
      onClose={onClose}
      layerClassName="pb-modal-layer"
      windowStyle={{ width: 930, height: 654 }}
    >
      <style>{SCOPED_CSS}</style>
      <div className={SCOPE} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '13px 12px 0' }}>
        {/* the lower band carries the encounter's own values: DATE, TIME,
            VISIT, ATTENDING (the encounter's provider), SERVICE LOCATION and
            APPOINTMENT NOTE (its visit reason) — 2026.08.10 / 14 : 00 / R /
            FAKERRY, FAKER / ACROPOLIS MANOR / TEST 3 in every capture */}
        <PBPatientBannerBlue
          top={[
            { label: 'CHART NO.', value: patient.chart, w: 85 },
            { label: 'PATIENT (F/M/L)', value: patient.full, w: 217 },
            { label: 'DATE OF BIRTH', value: <>{patient.dob}&nbsp;&nbsp;{patient.age}</>, w: 230 },
            { label: 'GENDER', value: patient.sex, w: 62 },
            { label: 'BC HEALTH NO.', value: patient.bchn, w: 140 },
            { label: 'PREFERRED PHONE NUMBER', value: <>{patient.phone}&nbsp;&nbsp;<span style={{ fontWeight: 400, fontSize: 11 }}>Home Phone</span></> },
          ]}
          bottom={[
            { label: 'DATE', value: visit?.date ?? '', w: 85 },
            { label: 'TIME', value: visit?.time ?? '', w: 51 },
            { label: 'VISIT', value: visit?.visit ?? '', w: 42 },
            { label: 'ATTENDING', value: visit?.attending ?? '', w: 115 },
            { label: 'SERVICE LOCATION', value: visit?.location ?? '', w: 246 },
            { label: 'APPOINTMENT NOTE', value: visit?.note ?? '' },
          ]}
        />

        {/* ---- Service Episode Detail: a ruled box, 304–1208 × 193–386 ---- */}
        <div style={{ border: '1px solid #a0a0a0', borderTop: 0, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <PBBand>Service Episode Detail</PBBand>
          <div style={{ position: 'relative', height: 173, background: '#fff' }}>
            {at(12, 7, label('Start Date:'))}
            {at(102, 7, <PBInput key={`s${r.start}`} w={84} align="center" defaultValue={r.start} />)}

            {/* a new event takes its episode here; a saved one keeps it, and
                Change Linked Service Episode… is the way to move it */}
            {at(12, 32, label('Service Episode:', isNew ? undefined : { color: '#9a9a9a' }))}
            {at(102, 32, isNew
              ? <PBLookup w={346} defaultValue={r.episode} name="service-episode" />
              : <PBInput w={330} disabled defaultValue={r.episode} />)}

            {at(12, 52, label('Service MRP:'))}
            {at(102, 52, <PBLookup w={346} defaultValue={r.mrp} name="service-mrp" />)}

            {/* the one caption set right, against its box */}
            {at(0, 72, label('As a Member Of:', { width: 95, textAlign: 'right' }))}
            {at(102, 72, <PBLookup w={302} defaultValue={r.memberOf} name="member-of" />)}

            {at(12, 99, label('General Note'))}
            {at(102, 102, <PBTextArea w={347} style={{ height: 56 }} />)}

            {at(469, 7, label('Stop Date:'))}
            {at(546, 7, <PBInput key={`e${r.stop}`} w={84} align="center" defaultValue={r.stop} />)}
            {at(469, 32, label('Stop Reason:'))}
            {at(546, 32, <PBLookup w={346} defaultValue={r.stopReason} name="stop-reason" />)}
            {at(469, 52, label('Stop Note:'))}
            {at(546, 53, <PBTextArea w={347} style={{ height: 38 }} />)}
          </div>
        </div>

        {/* ---- tabbed section: the strip at y 395, the page to 670 ---- */}
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '8px 0 0' }}>
          <PBTabs
            tabs={['Service Event', ordersTab]}
            active={tab === 'Service Event' ? tab : ordersTab}
            onChange={(t) => setTab(t.startsWith('Linked') ? 'Linked Orders' : t)}
            tabWidth={TAB_WIDTH}
          >
            {tab === 'Service Event' ? (
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto', background: '#fff' }}>
                <PBBand>Current Service Event</PBBand>
                <div style={{ position: 'relative', height: 68, flex: 'none' }}>
                  {/* greyed on a new event, a live drop-down on a saved one */}
                  {at(12, 14, label('Service Phase:', isNew ? { color: '#9a9a9a' } : undefined))}
                  {at(102, 14, isNew
                    ? <PBInput w={110} disabled defaultValue={r.phase || 'One Time'} />
                    : <PBSelect options={[...new Set([r.phase || 'One Time', 'One Time', 'Initiation', 'Maintenance', 'Completion'])]} defaultValue={r.phase || 'One Time'} w={110} />)}
                  {at(12, 34, label('Service Event:'))}
                  {at(102, 34, <PBLookup w={363} defaultValue={r.event} name="service-event" />)}
                </div>

                <PBBand>Health Issues for Service Event</PBBand>
                <div className="pb-cmdrow" style={{ background: 'var(--pb-band-alt)' }}>
                  <PBButton bare className="pb-cmdrow__btn" style={{ width: 100 }} command="new-health-issue">New Health Issue</PBButton>
                  <PBButton bare className="pb-cmdrow__btn" style={{ width: 104 }} command="delete-health-issue">Delete Health Issue</PBButton>
                </div>
                <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                  {/* Health Issue 326–818, its "…", Certainty 838–948; the
                      header stops there and an empty grid is white */}
                  <PBDataWindow
                    flush
                    columns={[
                      { key: 'issue', header: 'Health Issue', width: 492 },
                      { key: 'd', header: '', dots: true, width: 18 },
                      { key: 'certainty', header: 'Certainty', width: 110 },
                    ]}
                    rows={r.issues}
                    empty={false}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto', background: '#fff' }}>
                <div className="pb-cmdrow" style={{ background: 'var(--pb-band-alt)' }}>
                  <PBButton bare className="pb-cmdrow__btn" style={{ width: 77 }} command="manage-linked-orders">Manage...</PBButton>
                </div>
                <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                  {/* Order Date 322–416, Ordered By 418–554, Order To 556–702,
                      Description 704–1082, the description a link */}
                  <PBDataWindow
                    flush
                    rows={orders}
                    columns={[
                      { key: 'date', header: 'Order Date', width: 96, align: 'center' },
                      { key: 'by', header: 'Ordered By', width: 138 },
                      { key: 'to', header: 'Order To', width: 148 },
                      {
                        key: 'desc', header: 'Description', width: 378,
                        render: (row) => <button className="pb-link">{row.desc}</button>,
                      },
                    ]}
                    empty={false}
                  />
                </div>
              </div>
            )}
          </PBTabs>
        </div>

        {/* Save / Cancel centred under the window (673–747, 764–838), View
            History… at the right (1107–1207); Change Linked Service
            Episode… (305–480) only on a saved event */}
        <div style={{ position: 'relative', height: 52, flex: 'none' }}>
          {!isNew && at(2, 16, <PBButton style={{ width: 175 }}>Change <u>L</u>inked Service Episode...</PBButton>)}
          {at(370, 16, <PBButton style={{ width: 74 }} command="service-event-save" onClick={() => { onSave?.(); onClose() }}><u>S</u>ave</PBButton>)}
          {at(461, 16, <PBButton style={{ width: 74 }} command="service-event-cancel" onClick={onClose}><u>C</u>ancel</PBButton>)}
          {at(804, 16, <PBButton style={{ width: 100 }}>View <u>H</u>istory...</PBButton>)}
        </div>
      </div>
    </ModalWindow>
  )
}
