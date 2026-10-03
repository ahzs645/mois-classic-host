import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { capturedEncounters } from '../data/marChart2429'
import { friendlyNameMatch, marDrugName } from '../data/marDrugCodes'
import { adminSites } from '../data/mois'
import type { MarEvent, MarOrder } from '../data/marOrders'
import { usePatient } from '../data/patient-context'
import { useEncounterSession } from '../host/encounterArea'
import { MOIS_TODAY } from '../data/patients'
import { hhmm } from '../data/clock'
import { DESKTOP_PROVIDER_DEFAULT, SESSION_USER } from '../data/session'
import { registerScreenWindows } from '../host/screen-windows'
import {
  PBCheckbox, PBDropDownDataWindow, PBInput, PBLookup, PBPatientBand, PBRadio, PBSelect, PBTextArea,
} from '../pb'
import { LAYER } from './dialogKit'
import { PreferenceEncounterDialog } from './PreferenceEncounterDialog'
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
    /* c27: Given By opens on the signed-in user */
    default: return { action: 'ADMINISTERED', givenBy: SESSION_USER }
  }
}

/** A caption with its accelerator letter underlined (the first capital, or
    the letter at `at` when it is not one — "Immuni<u>z</u>ation", c25). */
function Mnemonic({ text, letter, at }: { text: string; letter: string; at?: number }) {
  const i = at ?? text.search(new RegExp(`\\b${letter}`))
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<u>{text[i]}</u>{text.slice(i + 1)}</>
}

/* --- New Medication Administration Information -----------------------------
   1927481 `70e81e88…png` (v02.30.11): eight radio choices in two columns,
   Continue (F2) · Cancel.

   2026-09-29 TRAINING capture c25 (v02.31.23, chart 2429) — the chooser
   with MAR Ordering OFF: one column of five, Administer an Immunization
   first, History renamed "Record an Immunization or Medication History" with
   "(Other Provider)" grey beside it, and Immunization's letter the z
   ("Immuni_z_ation"). Measured at 2x: 508 × 267; radios 38px in, the first
   centred 28px under the title bar, 30px apart; Continue (F2) · Cancel on
   the face below. INFERRED: that TRAINING runs with MAR Ordering OFF — its
   chooser has no order choices, while its MAR list (c20) still offers Group
   by Parent Order, so this is the OFF chooser of the build the stage shows
   (v02.31.23); the ON chooser keeps `70e81e88…`'s eight. Against that: c20
   also leaves Open Parent Order enabled, which MOIS DEV (MAR Ordering OFF,
   evidence/MATRIX-R0758) greys, so TRAINING may be ON and v02.31.23's
   chooser five either way. Settled by environment (data/environment): the
   TRAINING and DEV environments run MAR Ordering OFF (five), the manual's
   reference environment ships it ON (eight); System Settings can switch
   either.

   Re-measured at 2x against the window's outer edge: 512 × 270; the
   first radio's circle 39px in and 52px below the top edge, the rows 30px
   apart; the white face ends 215px down and the grey strip under it is
   54px, with Continue (F2) 161px in (84 × 24) and Cancel 14px after it
   (82 × 24) — the pair sits 5px left of centre. Continue (F2) is enabled
   before a choice is made (c25 opens with none). */
const C25_CHOICES: { i: number; label?: string; at?: number }[] = [
  { i: 4, at: 'Administer an Immuni'.length },
  { i: 0 },
  { i: 1, label: 'Record an Immunization or Medication History' },
  { i: 6 },
  { i: 7 },
]
export function MarChooserWindow({ onContinue, onClose, ordering = true }: {
  onContinue: (choice: number) => void
  onClose: () => void
  /** System Settings ▸ MAR Ordering: OFF drops the order-based choices */
  ordering?: boolean
}) {
  const [choice, setChoice] = useState(-1)
  const offered = ordering ? MAR_CHOICES.map((_, i) => i) : C25_CHOICES.map((c) => c.i)
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
    const key = (x: number) => (!ordering && MAR_CHOICES[x]!.kind === 'immunization' ? 'Z' : MAR_CHOICES[x]!.key)
    const i = offered.find((x) => key(x) === e.key.toUpperCase())
    if (i !== undefined) { e.preventDefault(); onContinue(i) }
    else if (e.key === 'F2' && choice >= 0) { e.preventDefault(); onContinue(choice) }
  }
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => onKey(e as unknown as KeyboardEvent)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  })
  if (!ordering) {
    return (
      <StageWindow id={MAR_WINDOWS.chooser} title="New Medication Administration Information" width={512} height={270} onClose={onClose}
        bodyStyle={{ background: '#fff', padding: '15px 0 0 38px' }}
        footer={<>
          {/* INFERRED: Continue with nothing chosen leaves the window up */}
          <FooterButton primary wide={false} onClick={() => { if (choice >= 0) onContinue(choice) }} tutorialId="host.mois.command.mar-continue">Continue (F2)</FooterButton>
          <FooterButton wide={false} onClick={onClose}>Cancel</FooterButton>
        </>}>
        <span className="pb-mar-c25" hidden />
        {C25_CHOICES.map(({ i, label, at }) => {
          const c = MAR_CHOICES[i]!
          return (
            <div key={i} className="pb-row" style={{ height: 30, gap: 0, position: 'relative' }} data-tutorial-id={`host.mois.field.mar-choice-${i}`}>
              <PBRadio name="mar-new" label={<Mnemonic text={label ?? c.label} letter={c.key} at={at} />} checked={choice === i} onChange={() => setChoice(i)}
                tutorialId={`host.mois.field.mar-choice-${c.kind}`} />
              {/* c25: "(Other Provider)" starts 284px into the window, wherever the caption ends */}
              {c.sub && <span style={{ color: '#a0a0a0', position: 'absolute', left: 284 - 39 }}>{c.sub}</span>}
            </div>
          )
        })}
      </StageWindow>
    )
  }
  const left = [0, 1, 2, 3]
  const right = [4, 5, 6, 7]
  return (
    <StageWindow id={MAR_WINDOWS.chooser} title="New Medication Administration Information" width={640} onClose={onClose}
      bodyStyle={{ background: '#fff' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={choice < 0} onClick={() => onContinue(choice)} tutorialId="host.mois.command.mar-continue">Continue (F2)</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '26px 30px 12px', gap: '0 30px' }}>
        <div>{left.map(radio)}</div>
        <div>{right.map(radio)}</div>
      </div>
    </StageWindow>
  )
}
/** The blue patient banner every MAR record window opens with.
    2026-09-29 TRAINING capture c27, measured at 2x: 40px, shading from
    #005598 to #49b0e1; captions (11px) centred 11px down, values (13px bold)
    28px down; columns at 4 · 89 · 307 · 536 · 599px, GENDER's value centred
    under its caption, the name printed F.M.L with an empty middle keeping
    its two spaces ("FLO  AARONSON"). */
export function MarBanner({ children }: { children?: ReactNode }) {
  const p = usePatient()
  const name = [p.first, p.middle ?? '', p.last].join(' ').toUpperCase()
  return (
    <div style={{ flex: 'none' }}>
      <PBPatientBand layout="grid" labelStyle={{ fontSize: 11, lineHeight: '14px' }}
        style={{
          display: 'grid', gridTemplateColumns: '85px 218px 229px 63px 1fr', rowGap: 3, alignItems: 'center',
          height: 40, boxSizing: 'border-box', padding: '4px 4px 0', color: '#fff', whiteSpace: 'pre',
          background: 'linear-gradient(#005598, #49b0e1)', fontSize: 13,
        }}
        cells={[
          { label: 'CHART NO.', value: p.chart },
          { label: 'PATIENT (F/M/L)', value: name },
          { label: 'DATE OF BIRTH', value: `${p.dob}  ${p.age}` },
          { label: 'GENDER', value: <span style={{ display: 'inline-block', width: 41, textAlign: 'center' }}>{p.sex}</span> },
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
   Record alone at the left, Save and Close · Close at the right.

   Geometry: 2026-09-29 TRAINING capture c27 (an immunization, chart 2429),
   measured at 2x — a 751 × 633 window on white; every field 17px tall and
   110px in (labels 9px in), rules at 114 · 192 · 246 · 509px under the
   banner and a divider at 359px between Details / Other and the three
   notes (441px in, 226 × 54). Given By opens on the signed-in user,
   Ordered By on the desktop provider, Created on the user. The rule under
   the order line is dark (#6c6c6c), and a #6a6a6a line tops the 47px
   button strip (screens/mar.css).
   The blue "*" beside Route, Site, Reason, Informed Consent, Form of Consent
   and Consented By is c27's (an immunization); INFERRED: they are the MAR
   Immunization Validation fields and mark an immunization only.
   c28: ENC# <n> opens the Encounter ID window (screens/
   PreferenceEncounterDialog.tsx) over the record; Change Encounter relinks
   this record. */
const F = { position: 'absolute' } as const
function At({ x, y, w, h = 17, right, children }: { x: number; y: number; w?: number; h?: number; right?: boolean; children: ReactNode }) {
  return (
    <div style={{ ...F, left: x, top: y, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: right ? 'flex-end' : undefined, whiteSpace: 'nowrap' }}>
      {children}
    </div>
  )
}
/* c27 at 2x: a pure-blue (#0000ff) star 6px wide, 347px into the window,
   centred a little above its field's middle */
const Req = ({ y }: { y: number }) => <At x={346} y={y + 3}><span style={{ color: '#0000ff', fontWeight: 700, fontSize: 13 }}>*</span></At>

export function MarRecordWindow({ event, order, action = '', kind, prefill, picked, onLookup, onSave, onDelete, onClose }: {
  /** omitted for a new record */
  event?: MarEvent
  order?: MarOrder
  action?: string
  /** which New … choice opened a new record (303427): Witness /
      Self-Administered / History change its Action, Given By and date row */
  kind?: MarKind
  /** a scheduled dose being closed off from its order (the Scheduled
      Record's Administered / Witnessed / … buttons), or the lot an
      immunization was started from (c26): the drug, lot and dose */
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
  const chart = usePatient().chart
  const data = useChartExport()
  const history = isNew && kind === 'history'
  const defaults = marDefaults(kind)
  const [med, setMed] = useState(event?.generic ?? prefill?.generic ?? '')
  const [lot, setLot] = useState(event?.lot ?? prefill?.lot ?? '')
  const [dose, setDose] = useState(event?.dose ?? prefill?.dose ?? '')
  const [unit, setUnit] = useState(event?.units ?? prefill?.units ?? '')
  const [route, setRoute] = useState(r?.str_route ?? '')
  const [site, setSite] = useState(event?.site ?? '')
  const [series, setSeries] = useState(event?.series ?? '')
  const [act, setAct] = useState(event?.status ?? (action || (isNew ? defaults.action : '')))
  const [givenBy, setGivenBy] = useState(event?.by ?? defaults.givenBy)
  const [accurate, setAccurate] = useState('Day')
  /* the record's encounter: the export's link, else (new) the active one */
  const [encounter, setEncounter] = useState<string>(r?.id_encounter ?? (isNew ? area.activeEncounter ?? '' : ''))
  const [encounterOpen, setEncounterOpen] = useState(false)
  const [opened] = useState(hhmm)
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
  /* the encounters Encounter ID reads: the chart export's, a transcribed
     chart's (data/marChart2429.ts), and those made this session */
  const encounters: MoisRecord[] = [
    ...area.session.saved.map((e): MoisRecord => ({
      id_encounter: e.id, dtm_appoint: e.date.replace(/\./g, '/'), num_appoint_hr: e.hr, num_appoint_min: e.mn,
      num_time_slots: e.nbr, str_visit_code: e.code, lkp_provider: e.provider, str_service_location: e.loc, str_appt_note: e.reason,
    })),
    ...(data?.encounter ?? []),
    ...capturedEncounters(chart),
  ]
  const id = isNew ? MAR_WINDOWS.record : MAR_WINDOWS.detail
  const immunization = isNew && kind === 'immunization'
  const created = r ? `${(r.stp_date_create ?? '').replace(/\//g, '.').replace(/:\d\d$/, '')}  ${r.stp_user_create ?? ''}` : isNew ? `${MOIS_TODAY}  ${opened}  ${SESSION_USER}` : ''
  const L = (y: number, text: ReactNode) => <At x={9} y={y}>{text}</At>
  return (
    <StageWindow id={id} title={isNew ? 'Medication Administration Record' : 'Medication Administration Detail Record'}
      width={751} height={633} onClose={onClose}
      /* the Detail Record's title bar has minimize, maximize and close
         (evidence/MATRIX-R0766-date-time, R0763-ordered-by); no capture
         shows the new-record window's, so it keeps close alone */
      controls={!isNew}
      bodyStyle={{ background: '#fff', position: 'relative', overflow: 'hidden' }}
      footer={isNew ? <>
        <FooterButton onClick={() => onSave(entry(), false)} tutorialId="host.mois.command.save-and-duplicate" wide={false}>Save and Duplicate</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onSave(entry(), true)} tutorialId="host.mois.command.save-and-close" wide={false}>Save and Close</FooterButton>
        <FooterButton onClick={onClose} wide={false}>Cancel</FooterButton>
      </> : <>
        <FooterButton onClick={onDelete} tutorialId="host.mois.command.mar-delete-record" wide={false}>Delete Record</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onSave(entry(), true)} tutorialId="host.mois.command.save-and-close" wide={false}>Save and Close</FooterButton>
        <FooterButton onClick={onClose} wide={false}>Close</FooterButton>
      </>}>
      <MarBanner />
      <div className="pb-mar-rec" style={isNew ? undefined : { top: -13, bottom: 13 }}>
        {isNew ? <>
          {/* a history record's order is Unknown and undated (`a405e0ac…png`) */}
          {L(61, 'Ordered By:')}
          <At x={108} y={61}><PBLookup w={217} name="mar-ordered-by" defaultValue={history ? 'Unknown' : prefill?.orderBy ?? DESKTOP_PROVIDER_DEFAULT} /></At>
          <At x={372} y={61}>Order Date / Time:</At>
          <At x={470} y={61}><PBInput w={72} align="center" defaultValue={history ? '0000.00.00' : MOIS_TODAY} /></At>
          <At x={548} y={61}><PBInput w={45} align="center" defaultValue={history ? '' : opened} /></At>
        </> : (
          /* evidence/MATRIX-R0763-ordered-by, MATRIX-R0766-date-time (MOIS DEV
             v02.31.23 at 100%): the order block is 61px of #c4e3f7 under the
             banner, its two lines centred 17 and 40px down; captions 9px in,
             values 111px in (a time 78px after its date); Order Date / Time
             and Scheduled End right-aligned on 464px, their values at 473
             (time at 552). The record's body below sits 13px higher than a
             new record's (every field, rule and the Created line) */
          <div style={{ ...F, left: 0, right: 0, top: 53, height: 61, background: '#c4e3f7' }}>
            <At x={9} y={8.5}>Ordered By:</At>
            <At x={111} y={8.5}><b>{order?.orderBy}</b></At>
            <At x={264} y={8.5} w={200} right>Order Date / Time:</At>
            <At x={473} y={8.5}><b>{order?.orderDate}</b></At>
            <At x={552} y={8.5}><b>{order?.orderTime}</b></At>
            <At x={9} y={31.5}>Scheduled Start:</At>
            <At x={111} y={31.5}><b>{event?.date}</b></At>
            <At x={189} y={31.5}><b>{event?.time}</b></At>
            <At x={264} y={31.5} w={200} right>Scheduled End:</At>
          </div>
        )}
        {/* c27: the rule under a new record's order line is dark (#6c6c6c),
            the others light */}
        <hr className="pb-mar-rec__rule" style={{ top: 114, ...(isNew ? { borderTopColor: '#6c6c6c' } : null) }} />

        {L(127, 'Action:')}
        <At x={110} y={127}><PBInput w={226} value={act} onChange={(e) => setAct(e.target.value)} data-tutorial-id="host.mois.field.mar-action" /></At>
        {!history && <>
          <At x={340} y={127} w={90} right>PIR SDL:</At>
          <At x={441} y={127}><PBLookup w={232} defaultValue={r?.str_pir_sdl ?? ''} /></At>
        </>}
        {history ? <>
          {/* "Use the 'Accurate to the' drop-down menu to adjust the date of
              administration … only the year, a month & year, or a full date" */}
          {L(147, 'Date')}
          <At x={110} y={147}><PBInput w={72} align="center" defaultValue={MOIS_TODAY} style={{ background: 'var(--pb-dw-select)' }} data-tutorial-id="host.mois.field.mar-date" /></At>
          <At x={196} y={147}><span style={{ color: '#8a8a8a' }}>Accurate to the</span></At>
          <At x={280} y={147}><PBSelect w={70} value={accurate} options={['Day', 'Month', 'Year']} onChange={(e) => setAccurate(e.target.value)} data-tutorial-id="host.mois.field.mar-accurate-to" /></At>
        </> : <>
          {L(147, 'Date / Time')}
          <At x={110} y={147}><PBInput w={72} align="center" defaultValue={event?.date ?? MOIS_TODAY} /></At>
          <At x={185} y={147}><PBInput w={45} align="center" defaultValue={event?.time ?? (isNew && kind !== 'self' ? opened : '')} /></At>
        </>}
        {L(167, 'Given By:')}
        <At x={110} y={167}><PBInput w={226} value={givenBy} onChange={(e) => setGivenBy(e.target.value)} data-tutorial-id="host.mois.field.mar-given-by" /></At>
        {history && <>
          <At x={340} y={167} w={90} right>Location:</At>
          <At x={441} y={167}><PBInput w={232} data-tutorial-id="host.mois.field.mar-location" /></At>
        </>}
        <hr className="pb-mar-rec__rule" style={{ top: 192 }} />

        {L(202, 'Medication:')}
        <At x={110} y={202}>
          <span data-tutorial-id="host.mois.field.mar-medication">
            <PBLookup w={563} name="mar-medication" value={med} onChange={setMed} onDots={onLookup} onEnter={commitMed}
              onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); onLookup?.() } else if (e.key === 'Tab') commitMed(e.currentTarget.value) }} />
          </span>
        </At>
        {L(223, 'Lot Number:')}
        <At x={110} y={223}><PBLookup w={194} value={lot} onChange={setLot} /></At>
        <At x={340} y={223} w={90} right>Series Number:</At>
        <At x={441} y={223}><PBInput w={61} value={series} onChange={(e) => setSeries(e.target.value)} data-tutorial-id="host.mois.field.mar-series" /></At>
        <hr className="pb-mar-rec__rule" style={{ top: 246 }} />

        {L(251, 'Details:')}
        <At x={110} y={251}>Dosage:</At>
        <At x={110} y={273}><PBInput w={47} align="center" value={dose} onChange={(e) => setDose(e.target.value)} /></At>
        <At x={162} y={273}><PBSelect w={116} value={unit} options={opt(unit, ['ML', 'MG', 'TABLET', 'SOLUTION', 'CAPSULE'])} onChange={(e) => setUnit(e.target.value)} /></At>
        <At x={0} y={305} w={101} right>Route:</At>
        <At x={110} y={305}><PBSelect w={174} value={route} options={opt(route, ['ORAL', 'SUBCUTANEOUS', 'INTRAMUSCULAR', 'SUBLINGUAL', 'INTRAVENOUS'])} onChange={(e) => setRoute(e.target.value)} /></At>
        <At x={0} y={324} w={101} right>Site:</At>
        <At x={110} y={324}>
          <PBDropDownDataWindow w={226} columns={[{ key: 'site', header: 'Site', width: 60 }, { key: 'desc', header: 'Description' }]}
            rows={adminSites} value={site} display="desc" onSelect={(row) => setSite(String(row.site))} />
        </At>
        {immunization && <><Req y={305} /><Req y={324} /></>}
        <hr className="pb-mar-rec__rule" style={{ top: 350, right: 'auto', width: 359 }} />

        <At x={9} y={360}><span style={{ color: '#000080', fontWeight: 700, fontSize: 13 }}>Other</span></At>
        {L(382, 'Reason:')}
        <At x={110} y={382}><PBSelect w={226} defaultValue={r?.str_reason_for_immun ?? ''} options={opt(r?.str_reason_for_immun ?? '', ['ROUTINE VACCINE', 'AS PRESCRIBED'])} /></At>
        {L(401, 'Informed Consent:')}
        <At x={110} y={401}><PBSelect w={226} defaultValue={r?.str_informed_consent ?? ''} options={opt(r?.str_informed_consent ?? '', ['YES', 'NO'])} /></At>
        {L(420, 'Form of Consent:')}
        <At x={110} y={420}><PBSelect w={226} defaultValue={r?.str_form_of_consent ?? ''} options={opt(r?.str_form_of_consent ?? '', ['IN PERSON', 'WRITTEN', 'VERBAL'])} /></At>
        {L(439, 'Consented By:')}
        <At x={110} y={439}><PBSelect w={226} defaultValue={r?.str_consented_by ?? ''} options={opt(r?.str_consented_by ?? '', ['CLIENT', 'GUARDIAN', 'SUBSTITUTE'])} /></At>
        {immunization && <><Req y={382} /><Req y={401} /><Req y={420} /><Req y={439} /></>}
        <At x={9} y={455} h={26}><span style={{ lineHeight: '13px' }}>Client Facility /<br />Worksite:</span></At>
        <At x={110} y={458}><PBLookup w={226} /></At>
        {L(488, 'Client Employee ID:')}
        <At x={110} y={488}><PBInput w={226} /></At>

        <div className="pb-mar-rec__divider" />
        <At x={363} y={264} h={28}><span style={{ lineHeight: '13px' }}>Administration<br />Note:</span></At>
        {/* the record's three notes: str_comment, str_prep_note and
            str_consent_comment (MATRIX-R0775 / R0776 / R0777) */}
        <PBTextArea className="pb-mar-rec__note" style={{ top: 264 }} defaultValue={r?.str_comment ?? ''} />
        <At x={363} y={327} h={28}><span style={{ lineHeight: '13px' }}>Preparation<br />Note:</span></At>
        <PBTextArea className="pb-mar-rec__note" style={{ top: 327 }} defaultValue={r?.str_prep_note ?? ''} />
        <At x={363} y={401} h={28}><span style={{ lineHeight: '13px' }}>Consent<br />Note:</span></At>
        <PBTextArea className="pb-mar-rec__note" style={{ top: 401 }} defaultValue={r?.str_consent_comment ?? ''} />
        <hr className="pb-mar-rec__rule" style={{ top: 509 }} />

        <At x={12} y={515}>Created:</At>
        <At x={88} y={515}><span style={{ whiteSpace: 'pre' }}>{created}</span></At>
        {/* a new record is linked to the active encounter (303427 "Active
            Enc"); c28: the link opens Encounter ID */}
        <At x={588} y={515} w={80} right>
          <button type="button" className="pb-link" data-tutorial-id="host.mois.field.mar-encounter" onClick={() => setEncounterOpen(true)}>ENC# {encounter || 'EMPTY'}</button>
        </At>
      </div>
      {encounterOpen && (
        <PreferenceEncounterDialog encounterId={encounter} encounters={encounters} zIndex={LAYER.raised}
          onChange={setEncounter} onClose={() => setEncounterOpen(false)} />
      )}
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
