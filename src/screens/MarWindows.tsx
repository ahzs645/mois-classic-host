import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { friendlyNameMatch, marDrugName } from '../data/marDrugCodes'
import { adminSites } from '../data/mois'
import type { MarEvent, MarOrder } from '../data/marOrders'
import { usePatient } from '../data/patient-context'
import { useEncounterSession } from '../host/encounterArea'
import { MOIS_TODAY } from '../data/patients'
import { hhmm } from '../data/clock'
import { DESKTOP_PROVIDER_DEFAULT } from '../data/session'
import { registerScreenWindows } from '../host/screen-windows'
import {
  PBCheckbox, PBDropDownDataWindow, PBInput, PBLookup, PBPatientBand, PBRadio, PBSelect, PBTextArea,
} from '../pb'
import { FooterButton, StageMessageBox, StageWindow } from './StageWindow'

/* ============================================================================
   The windows the Medication Administration Record raises. Each names the
   capture it was transcribed from; all are opened by name through the frame
   (host/screen-windows.tsx) and drawn by MarView.
   ========================================================================= */

export const MAR_WINDOWS = {
  chooser: 'mar-new',
  record: 'mar-record',
  detail: 'mar-detail',
  deleteRecord: 'mar-delete-record',
  order: 'mar-order',
  cancelOrder: 'mar-cancel-order',
  cancelWarning: 'mar-cancel-order-warning',
} as const

registerScreenWindows(Object.values(MAR_WINDOWS))

/* The eight choices New … offers, in the chooser's two columns (1927481
   `70e81e88…png`), each with its grey sub-caption and the Action a new
   record opens with. Only ADMINISTERED and SELF-ADMINISTERED are captured on
   a record (`2a29ca84…png`, 1664605 `f9365aa5…png`); the others open blank.

   303427 (stream C2) completes the set: each choice is a `kind` with its
   own window (the record window below for Administer / History / Witness /
   Self-Administered / Immunization, screens/MarActionWindows.tsx for Order,
   Reschedule and Not Given), each is reached with its accelerator letter
   after Ctrl+N ("CTRL + N + A = Administer a Medication … CTRL + N + S =
   Record a Self-Administered Medication"; Immunization's letter is not
   given — I is the stage's), and the four `order` choices go when System
   Settings' MAR Ordering is OFF, leaving the four `a5be44cc…png` shows.
   Witness, Self-Administered and History open with the Action and Given By
   their captures show (`b2a75743…`, `0dfdb9ad…`, `a405e0ac…`). */
export type MarKind = 'administer' | 'history' | 'order' | 'reschedule' | 'immunization' | 'not-given' | 'witness' | 'self'

export const MAR_CHOICES: { label: string; sub?: string; action: string; kind: MarKind; key: string; order?: boolean }[] = [
  { label: 'Administer a Medication', action: 'ADMINISTERED', kind: 'administer', key: 'A' },
  { label: 'Record Medication History', sub: '(Other Provider)', action: 'OTHER PROVIDER', kind: 'history', key: 'H' },
  { label: 'Create a Medication Order', action: '', kind: 'order', key: 'O', order: true },
  { label: 'Reschedule a Medication', sub: '(Deferred…)', action: 'RESCHEDULED', kind: 'reschedule', key: 'R', order: true },
  { label: 'Administer an Immunization', action: 'ADMINISTERED', kind: 'immunization', key: 'I', order: true },
  { label: 'Record Medication Not Given', sub: '(Refused, Omitted, Cancelled,…)', action: '', kind: 'not-given', key: 'C', order: true },
  { label: 'Witness an Administered Medication', action: 'WITNESSED', kind: 'witness', key: 'W' },
  { label: 'Record a Self-Administered Medication', action: 'SELF-ADMINISTERED', kind: 'self', key: 'S' },
]

/** The Action and Given By a new record of each kind opens with. */
export function marDefaults(kind: MarKind | undefined): { action: string; givenBy: string } {
  switch (kind) {
    case 'witness': return { action: 'WITNESSED', givenBy: 'PATIENT' }
    case 'self': return { action: 'SELF-ADMINISTERED', givenBy: 'PATIENT' }
    case 'history': return { action: 'OTHER PROVIDER', givenBy: '' }
    default: return { action: 'ADMINISTERED', givenBy: DESKTOP_PROVIDER_DEFAULT }
  }
}

/** A caption with its accelerator letter underlined (the first capital). */
function Mnemonic({ text, letter }: { text: string; letter: string }) {
  const i = text.search(new RegExp(`\\b${letter}`))
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<u>{text[i]}</u>{text.slice(i + 1)}</>
}

/* --- New Medication Administration Information -----------------------------
   1927481 `70e81e88…png`: eight radio choices in two columns, Continue (F2)
   · Cancel. */
export function MarChooserWindow({ onContinue, onClose, ordering = true }: {
  onContinue: (choice: number) => void
  onClose: () => void
  /** System Settings ▸ MAR Ordering: OFF drops the order-based choices */
  ordering?: boolean
}) {
  const [choice, setChoice] = useState(-1)
  const offered = MAR_CHOICES.map((_, i) => i).filter((i) => ordering || !MAR_CHOICES[i]!.order)
  const radio = (i: number) => (
    <div key={i} style={{ height: 48 }} data-tutorial-id={`host.mois.field.mar-choice-${i}`}>
      <PBRadio name="mar-new" label={<Mnemonic text={MAR_CHOICES[i]!.label} letter={MAR_CHOICES[i]!.key} />} checked={choice === i} onChange={() => setChoice(i)}
        tutorialId={`host.mois.field.mar-choice-${MAR_CHOICES[i]!.kind}`} />
      {MAR_CHOICES[i]!.sub && <div style={{ color: '#a0a0a0', paddingLeft: 22 }}>{MAR_CHOICES[i]!.sub}</div>}
    </div>
  )
  /* the accelerator letter picks its choice and continues (Ctrl+N, then A…) */
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return
    const i = offered.find((x) => MAR_CHOICES[x]!.key === e.key.toUpperCase())
    if (i !== undefined) { e.preventDefault(); onContinue(i) }
    else if (e.key === 'F2' && choice >= 0) { e.preventDefault(); onContinue(choice) }
  }
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => onKey(e as unknown as KeyboardEvent)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  })
  const left = ordering ? [0, 1, 2, 3] : offered
  const right = ordering ? [4, 5, 6, 7] : []
  return (
    <StageWindow id={MAR_WINDOWS.chooser} title="New Medication Administration Information" width={ordering ? 640 : 520} onClose={onClose}
      bodyStyle={{ background: '#fff' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={choice < 0} onClick={() => onContinue(choice)} tutorialId="host.mois.command.mar-continue">Continue (F2)</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: ordering ? '1fr 1fr' : '1fr', padding: '26px 30px 12px', gap: '0 30px' }}>
        <div>{left.map(radio)}</div>
        {right.length > 0 && <div>{right.map(radio)}</div>}
      </div>
    </StageWindow>
  )
}
/** The blue patient banner every MAR record window opens with. */
export function MarBanner({ children }: { children?: ReactNode }) {
  const p = usePatient()
  return (
    <div style={{ flex: 'none' }}>
      <PBPatientBand layout="inline" className="pb-row"
        style={{ gap: 0, padding: '2px 6px', color: '#fff', background: 'linear-gradient(#27a7e0, #1583c4)' }}
        cells={[
          { label: 'CHART NO.', value: p.chart, w: 100 },
          { label: 'PATIENT (F/M/L)', value: `${p.first} ${p.middle ?? ''} ${p.last}`.replace(/\s+/g, ' ').toUpperCase(), w: 260 },
          { label: 'DATE OF BIRTH', value: `${p.dob}  ${p.age}`, w: 220 },
          { label: 'GENDER', value: p.sex, w: 80 },
          { label: 'BC HEALTH NO.', value: p.bchn ?? p.insurance ?? '' },
        ]} />
      {children}
    </div>
  )
}

/* --- the record window: new (Medication Administration Record) or existing
   (Medication Administration Detail Record) --------------------------------
   New: 1927481 `2a29ca84…png` — Ordered By + Order Date / Time; Action, Date /
   Time, Given By with PIR SDL; Medication "…", Lot Number, Series Number;
   Details: Dosage + unit, Route, Site; Other: Reason, Informed Consent, Form
   of Consent, Consented By, Client Facility / Worksite, Client Employee ID;
   Administration / Preparation / Consent Note; footer Save and Duplicate ·
   Save and Close · Cancel.
   Existing: 1664605 `f9365aa5…png` — the same body under a pale-blue order
   block (Ordered By, Order Date / Time, Scheduled Start / End), footer Delete
   Record alone at the left, Save and Close · Close at the right. */
export function MarRecordWindow({ event, order, action = '', kind, prefill, picked, onLookup, onSave, onDelete, onClose }: {
  /** omitted for a new record */
  event?: MarEvent
  order?: MarOrder
  action?: string
  /** which New … choice opened a new record (303427): Witness /
      Self-Administered / History change its Action, Given By and date row */
  kind?: MarKind
  /** a scheduled dose being closed off from its order (the Scheduled
      Record's Administered / Witnessed / … buttons): the order's drug and dose */
  prefill?: Partial<MarEvent> & { orderBy?: string }
  /** a drug the Drug Code Lookup just returned: `seq` changes per pick */
  picked?: { name: string; seq: number }
  /** the Medication "…" (F4): the Drug Code Lookup */
  onLookup?: () => void
  onSave: (entry: MarEvent, close: boolean) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const isNew = !event
  const r = event?.record
  const area = useEncounterSession()
  const history = isNew && kind === 'history'
  const defaults = marDefaults(kind)
  const [med, setMed] = useState(event?.generic ?? prefill?.generic ?? '')
  const [lot, setLot] = useState(event?.lot ?? '')
  const [dose, setDose] = useState(event?.dose ?? prefill?.dose ?? '')
  const [unit, setUnit] = useState(event?.units ?? prefill?.units ?? '')
  const [route, setRoute] = useState(r?.str_route ?? '')
  const [site, setSite] = useState(event?.site ?? '')
  const [series, setSeries] = useState(event?.series ?? '')
  const [act, setAct] = useState(event?.status ?? (action || (isNew ? defaults.action : '')))
  const [givenBy, setGivenBy] = useState(event?.by ?? defaults.givenBy)
  const [accurate, setAccurate] = useState('Day')
  /* a pick from the Drug Code Lookup lands in Medication */
  useEffect(() => { if (picked) setMed(picked.name) }, [picked?.seq]) // eslint-disable-line react-hooks/exhaustive-deps
  /* "If you know the friendly name, you can type that directly into this
     line … if you type td, MOIS will flip it to read Td" */
  const commitMed = (typed: string) => { const hit = friendlyNameMatch(typed); if (hit) setMed(marDrugName(hit)) }
  const opt = (value: string, list: string[]) => [...new Set(['', value, ...list])]
  const entry = (): MarEvent => ({
    id: event?.id ?? `stage-mar-${Date.now()}`,
    status: act || 'ADMINISTERED', date: event?.date ?? MOIS_TODAY, time: event?.time ?? hhmm(),
    med, generic: med, dose, units: unit, series, site, lot, by: givenBy, record: r,
  })
  const id = isNew ? MAR_WINDOWS.record : MAR_WINDOWS.detail
  return (
    <StageWindow id={id} title={isNew ? 'Medication Administration Record' : 'Medication Administration Detail Record'}
      width={940} height={790} onClose={onClose}
      bodyStyle={{ background: '#fff', overflow: 'auto' }}
      footer={isNew ? <>
        <FooterButton onClick={() => onSave(entry(), false)} tutorialId="host.mois.command.save-and-duplicate" wide={false}>Save and Duplicate</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onSave(entry(), true)} tutorialId="host.mois.command.save-and-close" wide={false}>Save and Close</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
      </> : <>
        <FooterButton onClick={onDelete} tutorialId="host.mois.command.mar-delete-record" wide={false}>Delete Record</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onSave(entry(), true)} tutorialId="host.mois.command.save-and-close" wide={false}>Save and Close</FooterButton>
        <FooterButton onClick={onClose}>Close</FooterButton>
      </>}>
      <MarBanner>
        {!isNew && (
          <div className="pb-form" style={{ gridTemplateColumns: '110px 260px 130px 1fr', background: '#cfe8f7', padding: '6px 8px', gap: '4px 6px' }}>
            <span>Ordered By:</span><b>{order?.orderBy}</b><span>Order Date / Time:</span><b>{order?.orderDate}&nbsp;&nbsp;&nbsp;{order?.orderTime}</b>
            <span>Scheduled Start:</span><b>{event?.date}&nbsp;&nbsp;&nbsp;{event?.time}</b><span>Scheduled End:</span><b />
          </div>
        )}
      </MarBanner>
      {isNew && (
        <div className="pb-row" style={{ padding: '10px 8px', gap: 8, borderBottom: '1px solid #c9c9c9' }}>
          {/* a history record's order is Unknown and undated (`a405e0ac…png`) */}
          <span style={{ width: 110 }}>Ordered By:</span><PBLookup w={270} name="mar-ordered-by" defaultValue={history ? 'Unknown' : prefill?.orderBy ?? DESKTOP_PROVIDER_DEFAULT} />
          <span style={{ marginLeft: 50 }}>Order Date / Time:</span><PBInput w={90} align="center" defaultValue={history ? '0000.00.00' : MOIS_TODAY} /><PBInput w={56} align="center" defaultValue={history ? '' : hhmm()} />
        </div>
      )}
      <div className="pb-form" style={{ gridTemplateColumns: '110px 280px 90px 1fr', padding: '8px', gap: '3px 6px', borderBottom: '1px solid #c9c9c9' }}>
        <span>Action:</span><PBInput w={280} value={act} onChange={(e) => setAct(e.target.value)} data-tutorial-id="host.mois.field.mar-action" />
        {history ? <><span /><span /></> : <><span>PIR SDL:</span><PBLookup w="100%" defaultValue={r?.str_pir_sdl ?? ''} /></>}
        {history ? (
          /* "Use the 'Accurate to the' drop-down menu to adjust the date of
             administration … only the year, a month & year, or a full date" */
          <>
            <span>Date</span>
            <div className="pb-row">
              <PBInput w={90} align="center" defaultValue={MOIS_TODAY} style={{ background: 'var(--pb-dw-select)' }} data-tutorial-id="host.mois.field.mar-date" />
              <span style={{ color: '#8a8a8a', marginLeft: 14 }}>Accurate to the</span>
              <PBSelect w={70} value={accurate} options={['Day', 'Month', 'Year']} onChange={(e) => setAccurate(e.target.value)} data-tutorial-id="host.mois.field.mar-accurate-to" />
            </div><span /><span />
          </>
        ) : (
          <><span>Date / Time</span><div className="pb-row"><PBInput w={90} align="center" defaultValue={event?.date ?? MOIS_TODAY} /><PBInput w={56} align="center" defaultValue={event?.time ?? (isNew && kind !== 'self' ? hhmm() : '')} /></div><span /><span /></>
        )}
        <span>Given By:</span><PBInput w={280} value={givenBy} onChange={(e) => setGivenBy(e.target.value)} data-tutorial-id="host.mois.field.mar-given-by" />
        {history ? <><span style={{ textAlign: 'right' }}>Location:</span><PBInput w="100%" data-tutorial-id="host.mois.field.mar-location" /></> : <><span /><span /></>}
      </div>
      <div className="pb-form" style={{ gridTemplateColumns: '110px 1fr', padding: '8px', gap: '3px 6px', borderBottom: '1px solid #c9c9c9' }}>
        <span>Medication:</span>
        <span data-tutorial-id="host.mois.field.mar-medication">
          <PBLookup w="100%" name="mar-medication" value={med} onChange={setMed} onDots={onLookup} onEnter={commitMed}
            onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); onLookup?.() } else if (e.key === 'Tab') commitMed(e.currentTarget.value) }} />
        </span>
        <span>Lot Number:</span>
        <div className="pb-row"><PBLookup w={220} value={lot} onChange={setLot} /><span style={{ marginLeft: 'auto' }}>Series Number:</span><PBInput w={76} value={series} onChange={(e) => setSeries(e.target.value)} data-tutorial-id="host.mois.field.mar-series" /></div>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: '1 1 auto', borderRight: '1px solid #c9c9c9' }}>
          <div className="pb-form" style={{ gridTemplateColumns: '110px 1fr', padding: '8px', gap: '3px 6px', alignItems: 'center' }}>
            <span>Details:</span><span>Dosage:</span>
            <span /><div className="pb-row"><PBInput w={58} align="center" value={dose} onChange={(e) => setDose(e.target.value)} /><PBSelect w={140} value={unit} options={opt(unit, ['ML', 'TABLET', 'SOLUTION', 'CAPSULE'])} onChange={(e) => setUnit(e.target.value)} /></div>
            <span style={{ textAlign: 'right' }}>Route:</span><PBSelect w={210} value={route} options={opt(route, ['ORAL', 'SUBCUTANEOUS', 'INTRAMUSCULAR', 'SUBLINGUAL', 'INTRAVENOUS'])} onChange={(e) => setRoute(e.target.value)} />
            <span style={{ textAlign: 'right' }}>Site:</span>
            <PBDropDownDataWindow w={270} columns={[{ key: 'site', header: 'Site', width: 60 }, { key: 'desc', header: 'Description' }]}
              rows={adminSites} value={site} display="desc" onSelect={(row) => setSite(String(row.site))} />
          </div>
          <div style={{ padding: '4px 8px', color: '#000080', fontWeight: 700, borderTop: '1px solid #c9c9c9' }}>Other</div>
          <div className="pb-form" style={{ gridTemplateColumns: '110px 1fr', padding: '0 8px 8px', gap: '3px 6px' }}>
            <span>Reason:</span><PBSelect w={270} defaultValue={r?.str_reason_for_immun ?? ''} options={opt(r?.str_reason_for_immun ?? '', ['ROUTINE VACCINE', 'AS PRESCRIBED'])} />
            <span>Informed Consent:</span><PBSelect w={270} defaultValue={r?.str_informed_consent ?? ''} options={opt(r?.str_informed_consent ?? '', ['YES', 'NO'])} />
            <span>Form of Consent:</span><PBSelect w={270} defaultValue={r?.str_form_of_consent ?? ''} options={opt(r?.str_form_of_consent ?? '', ['IN PERSON', 'WRITTEN', 'VERBAL'])} />
            <span>Consented By:</span><PBSelect w={270} defaultValue={r?.str_consented_by ?? ''} options={opt(r?.str_consented_by ?? '', ['CLIENT', 'GUARDIAN', 'SUBSTITUTE'])} />
            <span style={{ lineHeight: '13px' }}>Client Facility /<br />Worksite:</span><PBLookup w={270} />
            <span>Client Employee ID:</span><PBInput w={270} />
          </div>
        </div>
        <div className="pb-form" style={{ width: 400, gridTemplateColumns: '90px 1fr', padding: '8px', gap: '8px 6px', alignItems: 'start' }}>
          <span style={{ lineHeight: '14px' }}>Administration<br />Note:</span><PBTextArea rows={4} w="100%" />
          <span style={{ lineHeight: '14px' }}>Preparation<br />Note:</span><PBTextArea rows={4} w="100%" />
          <span style={{ lineHeight: '14px' }}>Consent<br />Note:</span><PBTextArea rows={4} w="100%" />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '8px', borderTop: '1px solid #c9c9c9', gap: 0 }}>
        <span style={{ width: 100 }}>Created:</span>
        <span>{r ? `${(r.stp_date_create ?? '').replace(/\//g, '.').replace(/:\d\d$/, '')}  ${r.stp_user_create ?? ''}` : `${MOIS_TODAY}  ${DESKTOP_PROVIDER_DEFAULT}`}</span>
        <span className="pb-row__spacer" />
        {/* a new record is linked to the active encounter (303427 "Active Enc") */}
        <button type="button" className="pb-link" data-tutorial-id="host.mois.field.mar-encounter">ENC# {r?.id_encounter ?? (isNew ? area.activeEncounter : null) ?? 'EMPTY'}</button>
      </div>
    </StageWindow>
  )
}

/* --- Delete Record ---------------------------------------------------------
   1664605 `36f79a2d…png`: "Do you want to delete the current medication
   administration record?", Reason, Note, Continue · Cancel. */
export function MarDeleteWindow({ onContinue, onClose }: { onContinue: () => void; onClose: () => void }) {
  return (
    <StageWindow id={MAR_WINDOWS.deleteRecord} title="Delete Record" width={446} onClose={onClose}
      bodyStyle={{ background: '#fff', padding: '12px 18px 4px' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={onContinue} tutorialId="host.mois.command.mar-delete-continue">Continue</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div style={{ paddingBottom: 14 }}>Do you want to delete the current medication administration record?</div>
      <div className="pb-form" style={{ gridTemplateColumns: '80px 240px', gap: '6px 8px', padding: '0 0 10px 20px' }}>
        <span style={{ textAlign: 'right' }}>Reason:</span><PBInput w={240} data-tutorial-id="host.mois.field.mar-delete-reason" />
        <span style={{ textAlign: 'right' }}>Note:</span><PBTextArea rows={3} w={240} />
      </div>
    </StageWindow>
  )
}

/* --- Medication Administration Order ---------------------------------------
   1741600 `d38e5e72…png`: the banner, Ordered By + Order Date / Time,
   Medication, Details (Dosage / Frequency / Duration), Route, Site, Series,
   Scheduled Start / End with "This is time sensitive.", the three instruction
   boxes, a Signing History panel, Created / Last Modified, and Cancel Order
   alone at the left, Unsign Order · Close at the right. */
export function MarOrderWindow({ order, cancelled, onCancelOrder, onClose }: {
  order: MarOrder
  cancelled: boolean
  onCancelOrder: () => void
  onClose: () => void
}) {
  return (
    <StageWindow id={MAR_WINDOWS.order} title="Medication Administration Order" width={752} height={600} onClose={onClose}
      bodyStyle={{ background: '#fff', overflow: 'auto' }}
      footer={<>
        <FooterButton onClick={onCancelOrder} disabled={cancelled} tutorialId="host.mois.command.cancel-order" wide={false}>Cancel Order</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton disabled={cancelled} wide={false}>Unsign Order</FooterButton>
        <FooterButton onClick={onClose}>Close</FooterButton>
      </>}>
      <MarBanner />
      <div className="pb-row" style={{ padding: '8px', gap: 8, borderBottom: '1px solid #c9c9c9' }}>
        <span style={{ width: 94 }}>Ordered By:</span><PBLookup w={200} value={order.orderBy} readOnly />
        <span style={{ marginLeft: 'auto' }}>Order Date / Time:</span><PBInput w={76} align="center" readOnly value={order.orderDate} /><PBInput w={50} align="center" readOnly value={order.orderTime} />
      </div>
      <div className="pb-form" style={{ gridTemplateColumns: '94px 1fr', padding: '8px', gap: '3px 6px', borderBottom: '1px solid #c9c9c9' }}>
        <span>Medication:</span><PBLookup w="100%" value={order.med} readOnly />
        <span>Details:</span>
        <div className="pb-row" style={{ gap: 30, alignItems: 'flex-start' }}>
          <div><div>Dosage:</div><div className="pb-row"><PBInput w={50} align="center" readOnly value={order.dosage} /><PBSelect w={110} value={order.dosageUnit} options={[order.dosageUnit]} disabled /></div></div>
          <div><div>Frequency:</div><PBSelect w={166} value={order.frequency} options={[order.frequency]} disabled /></div>
          <div><div>Duration:</div><div className="pb-row"><PBInput w={50} align="center" readOnly value={order.duration} /><PBSelect w={126} value={order.durationUnit} options={[order.durationUnit]} disabled /></div></div>
        </div>
        <span style={{ textAlign: 'right' }}>Route:</span>
        <div className="pb-row"><PBSelect w={166} value={order.route} options={[order.route]} disabled /><span style={{ marginLeft: 'auto' }}>Series:</span><PBInput w={50} readOnly /></div>
        <span style={{ textAlign: 'right' }}>Site:</span><PBSelect w={246} value="" options={['']} disabled />
      </div>
      <div className="pb-row" style={{ padding: '8px', gap: 8, borderBottom: '1px solid #c9c9c9', alignItems: 'flex-start' }}>
        <span style={{ width: 94 }}>Scheduled Start:</span>
        <div><div className="pb-row"><PBInput w={76} readOnly /><PBInput w={50} readOnly /></div><PBCheckbox label="This is time sensitive." /></div>
        <span style={{ marginLeft: 'auto' }}>Scheduled End:</span>
        <div><div className="pb-row"><PBInput w={76} readOnly /><PBInput w={50} readOnly /></div><span style={{ color: '#6d6d6d' }}>(leave blank if entering duration information)</span></div>
      </div>
      <div style={{ display: 'flex', padding: 8, gap: 8, borderBottom: '1px solid #c9c9c9' }}>
        <div className="pb-form" style={{ gridTemplateColumns: '94px 1fr', gap: '6px', flex: '1 1 auto' }}>
          <span>Clinical Indication:</span><PBTextArea rows={3} w="100%" readOnly />
          <span>Drug Instruction:</span><PBTextArea rows={3} w="100%" readOnly />
          <span style={{ lineHeight: '13px' }}>Administration<br />Instruction:</span><PBTextArea rows={3} w="100%" readOnly />
        </div>
        <div style={{ width: 320, border: '1px solid #555', alignSelf: 'flex-start' }} data-tutorial-id="host.mois.group.signing-history">
          <div style={{ background: '#2477b8', color: '#fff', padding: '2px 6px' }}>Signing History</div>
          <div className="pb-form" style={{ gridTemplateColumns: '48px 1fr', padding: '4px 6px', gap: '2px 6px', minHeight: 96, alignContent: 'start' }}>
            {cancelled ? <><span>Action:</span><span>CANCELLED</span></> : null}
            <span>Action:</span><span>{order.signed.action}</span>
            <span>Note:</span><span>{order.signed.note}</span>
            <span>On / By:</span><span>{order.signed.on}</span>
          </div>
        </div>
      </div>
      <div className="pb-form" style={{ gridTemplateColumns: '94px 1fr', padding: '6px 8px', gap: '2px 6px' }}>
        <span>Created:</span><span>{order.created}</span>
        <span>Last Modified:</span><span>{order.modified}</span>
      </div>
    </StageWindow>
  )
}

/* --- Cancel Order ----------------------------------------------------------
   1741600 `3dd31c49…png`: the banner; a pale-blue band with Reason ▾ and a
   Note; the order's Ordered By / Order Date / Time, Medication and Dose; "The
   following scheduled administration events will be cancelled." over the
   list; Cancel Order · Close. MOIS then warns that a cancelled order cannot
   be undone — the article says so; that box is not captured, so its wording
   here is the article's own. Only one Reason value is captured ("Fear");
   "Adverse Effects" is the article's own reason for cancelling an order, and
   the list's other values are not captured, so it offers only those. */
export const CANCEL_REASONS = ['', 'Adverse Effects', 'Fear']

export function MarCancelOrderWindow({ order, onCancelOrder, onClose }: {
  order: MarOrder
  onCancelOrder: () => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const scheduled = [...order.events].filter((e) => e.status === 'SCHEDULED').sort((a, b) => a.date.localeCompare(b.date))
  return (
    <StageWindow id={MAR_WINDOWS.cancelOrder} title="Cancel Order" width={760} height={600} onClose={onClose}
      bodyStyle={{ background: '#fff' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={onCancelOrder} tutorialId="host.mois.command.cancel-order-confirm" wide={false}>Cancel Order</FooterButton>
        <FooterButton onClick={onClose}>Close</FooterButton>
      </>}>
      <MarBanner>
        <div className="pb-form" style={{ gridTemplateColumns: '100px 312px', background: '#cfe8f7', padding: '6px 8px 10px', gap: '4px 6px' }}>
          <span>Reason:</span><PBSelect w={312} value={reason} options={CANCEL_REASONS} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.cancel-reason" />
          <span>Note:</span><PBTextArea rows={3} w={232} />
        </div>
      </MarBanner>
      <div className="pb-form" style={{ gridTemplateColumns: '100px 1fr 120px 1fr', padding: '8px', gap: '6px', borderBottom: '1px solid #c9c9c9' }}>
        <span>Ordered By:</span><b>{order.orderBy}</b><span>Order Date / Time:</span><b>{order.orderDate}&nbsp;&nbsp;&nbsp;{order.orderTime}</b>
        <span>Medication:</span><b style={{ gridColumn: 'span 3' }}>{order.med}</b>
        <span>Dose:</span><b style={{ gridColumn: 'span 3' }}>{order.dosage} {order.dosageUnit}</b>
      </div>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #d8d8d8' }}>The following scheduled administration events will be cancelled.</div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }} data-tutorial-id="host.mois.group.events-to-cancel">
        <div className="pb-row" style={{ padding: '4px 8px', gap: 0, color: '#555', borderBottom: '1px solid #e2e2e2' }}>
          <span style={{ width: 100 }} /><span style={{ width: 130 }}>Start Date / Time</span><span>End Date / Time (if applicable)</span>
        </div>
        {scheduled.map((e) => (
          <div key={e.id} className="pb-row" style={{ padding: '4px 8px', gap: 0, color: '#0060c0', borderBottom: '1px solid #e2e2e2' }}>
            <span style={{ width: 100 }}>{e.status}</span><span style={{ width: 90 }}>{e.date}</span><span>{e.time}</span>
          </div>
        ))}
      </div>
    </StageWindow>
  )
}

export function MarCancelWarningBox({ onYes, onClose }: { onYes: () => void; onClose: () => void }) {
  return (
    <StageMessageBox id={MAR_WINDOWS.cancelWarning} title="Cancel Order" icon="warn"
      buttons={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true }]}
      onClose={(v) => (v === 'yes' ? onYes() : onClose())}>
      Cancelling this order is permanent and cannot be undone.<br />The order and all of its scheduled items will be cancelled.<br /><br />Do you want to continue?
    </StageMessageBox>
  )
}
