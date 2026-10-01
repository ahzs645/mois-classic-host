import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  MAR_CODE_SYSTEMS, MAR_REFERENCE_SETS, friendlyNameMatch, marDrugName, searchMarDrugCodes, type MarDrugCode,
} from '../data/marDrugCodes'
import type { MarEvent, MarOrder } from '../data/marOrders'
import { adminSites } from '../data/mois'
import { hhmm } from '../data/clock'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_PROVIDER_DEFAULT } from '../data/session'
import { registerScreenWindows } from '../host/screen-windows'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBInput, PBLookup, PBMenuBar, PBSelect, PBTextArea, pbSlug,
  type PBColumn,
} from '../pb'
import { useTickSet } from './listKit'
import { LookupPager, PAGER_ROW, usePagedCursor } from './lookupKit'
import { MarBanner } from './MarWindows'
import { FooterButton, StageWindow } from './StageWindow'

/* ============================================================================
   The MAR's other record windows — everything New … and a scheduled dose
   raise beyond the administration record itself (screens/MarWindows.tsx).

   PROVENANCE, all 303427:
   · New Medication Administration Order — `2751959e…png` (v02.2x): the blue
     banner; Ordered By (salmon, the desktop provider) "…" and Order Date /
     Time; Medication "…"; Details: Dosage [ ][unit ▾], Frequency ▾,
     Duration [ ][unit ▾]; Route ▾, Series; Site ▾; Scheduled Start date +
     time with ☐ This is time sensitive., Scheduled End with "(leave blank if
     entering duration information)"; Clinical Indication, Drug Instruction,
     Administration Instruction; Created; Sign Order · Save Order · Cancel.
     "Sign and Save: Creates the order and schedules the administration(s).
     Save: Creates the order, but creates each item as NOT SCHEDULED."
   · Reschedule Single Medication Administration — `1a8484d6…png`: banner;
     Ordered By / Order Date / Time; Medication "…"; Dosage, Series; Route;
     Site; Initial Scheduled; a pale-blue band with Reason ▾ + Note on the
     left and New Date / Time (Date, Time) on the right; Save · Cancel.
   · Record Single Medication Not Given — `c4046397…png`: banner; Ordered By
     / Order Date / Time; Action ▾; Medication "…"; the pale-blue band with
     Reason ▾ and Note; "(Optional) Create a Preference For:" Directive... ·
     Contraindicated... · Not Indicated...; Save (F2) · Cancel.
   · Medication Administration Scheduled Record — `1494e901…png`: its own
     menu bar Dispensed · Administered · Rescheduled · Not Given; the banner;
     a pale-blue band "Status: SCHEDULED" over seven buttons Dispensed ·
     Administered · Witnessed · Self-Administered · Other Provider ·
     Rescheduled · Not Given; Ordered By and Order Date / Time in bold; the
     greyed Medication, Scheduled Start / End and "This is time sensitive.";
     Details (Dosage, Units, Series), Route ▾, Site ▾; Notes: Clinical
     Indication, Drug Instruction, Administration Instruction, Preparation
     Note; Created; Save · Close.
   · Drug Code Lookup — `8898305e…png`: Search for; the coded-search legend
     (`d Search Generic and Brand Names, `c Search Drug Code, `a Search ATC
     Code, `f Search Formulary); Code System ▾ + ☐ Save as Default System,
     Reference Set ▾ + ☐ Save as Default Reference; the pink filter bar
     "Code System: … Reference Set: …"; the grid F · Generic Name · Brand
     Name · ATC Code · ATC Name · Cost · LCA; "Additional information for the
     selected item:" (Generic Name, Manufacturer, Brand Name, Agent Name |
     ATC Code, ATC Name, CDIC, Ref. Sets); Home · PgUp | Ok · Cancel | PgDwn
     · End. The search starts once four letters are typed; fewer need Enter.
   · Multi-Value Selection — `f7908f40…png`: the Record Status "…": Select ·
     Code · Description over the eleven statuses; Ok (F2) · Cancel.

   INFERRED: the drop-down lists nobody captured open — Frequency, Duration
   unit, the Reschedule and Not Given Reasons; the Not Given Action list is
   the article's own four ("refused, withheld, omitted, or cancelled"). The
   Create a Preference buttons are pressed-state toggles that record which
   preference the save should make: the Preferences window they pre-fill is
   not built here.

   All are screen windows MarView draws (host/screen-windows.tsx), opened by
   id; the lookup keeps the window that raised it mounted underneath.
   ========================================================================= */

export const MAR_ACTION_WINDOWS = {
  newOrder: 'mar-new-order',
  reschedule: 'mar-reschedule',
  notGiven: 'mar-not-given',
  scheduled: 'mar-scheduled-record',
  drugLookup: 'mar-drug-code-lookup',
  status: 'mar-record-status',
  /* not a window: Maintenance ▸ Save Window Options as My Defaults on the
     MAR (`e2d11224…png`), which MarView acts on and closes */
  saveOptions: 'mar-save-window-options',
  /* the error MOIS raises when System Settings' MAR Require Encounter is YES
     and no encounter is active (303427 "Active Enc"); its wording is the
     2026-09-29 TRAINING capture c23's */
  requireEncounter: 'mar-require-encounter',
} as const

registerScreenWindows(Object.values(MAR_ACTION_WINDOWS))

/** The record statuses (`f7908f40…png`'s eleven; c22 adds NO SHOW), code and description. */
export const MAR_STATUSES: [string, string][] = [
  ['SCHEDULED', 'Scheduled'],
  ['DISPENSED', 'Dispensed'],
  ['ADMINISTERED', 'Administered Medication'],
  ['WITNESSED', 'Witness Medication Administration'],
  ['SELF-ADMINISTERED', 'Patient Administered Medication'],
  ['OTHER PROVIDER', 'Historical Administration'],
  ['RESCHEDULED', 'Rescheduled'],
  ['REFUSED', 'Patient Refused Medication'],
  ['WITHHELD', 'Medication was Withheld'],
  ['OMITTED', 'Medication was Omitted'],
  ['CANCELLED', 'Administration was Cancelled'],
  /* the twelfth, from the 2026-09-29 TRAINING capture c22 */
  ['NO SHOW', 'Patient Absent for Medication'],
]

export const MAR_FREQUENCIES = ['', 'OPD (Once Daily)', 'BID (Twice Daily)', 'TID (Three Times Daily)', 'QID (Four Times Daily)', 'QW (Once Weekly)', 'STAT (Immediately)']
export const MAR_DURATION_UNITS = ['', 'DOSE (Doses)', 'DAY (Days)', 'WEEK (Weeks)', 'MONTH (Months)']
const DOSE_UNITS = ['', 'ML', 'TABLET', 'SOLUTION', 'CAPSULE', 'LIQUID', 'SUSPENSION']
const ROUTES = ['', 'ORAL', 'SUBCUTANEOUS', 'INTRAMUSCULAR', 'SUBLINGUAL', 'INTRAVENOUS', 'INTRANASAL']
export const RESCHEDULE_REASONS = ['', 'PATIENT REQUEST', 'PATIENT UNAVAILABLE', 'CLINIC SCHEDULE', 'SUPPLY UNAVAILABLE', 'OTHER']
export const NOT_GIVEN_ACTIONS = ['', 'REFUSED', 'WITHHELD', 'OMITTED', 'CANCELLED']
export const NOT_GIVEN_REASONS = ['', 'PATIENT REFUSED', 'CONTRAINDICATED', 'NOT INDICATED', 'NO SHOW', 'ADVERSE EFFECTS', 'OTHER']

const LINE = '1px solid #c9c9c9'
const BLUE_BAND = '#cfe8f7'

/** The Medication field every MAR window shares: "…" / F4 opens the Drug
    Code Lookup, and a friendly name typed and committed flips to its drug. */
function MedicationField({ value, onChange, onLookup, readOnly }: { value: string; onChange: (v: string) => void; onLookup?: () => void; readOnly?: boolean }) {
  const commit = (typed: string) => { const hit = friendlyNameMatch(typed); if (hit) onChange(marDrugName(hit)) }
  return (
    <span data-tutorial-id="host.mois.field.mar-medication" style={{ flex: '1 1 auto', display: 'flex' }}>
      <PBLookup w="100%" name="mar-medication" value={value} onChange={onChange} onDots={onLookup} onEnter={commit} readOnly={readOnly}
        onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); onLookup?.() } else if (e.key === 'Tab') commit(e.currentTarget.value) }} />
    </span>
  )
}

/** A pick from the Drug Code Lookup, applied once per `seq`. */
function usePicked(picked: { name: string; seq: number } | undefined, set: (v: string) => void) {
  useEffect(() => { if (picked) set(picked.name) }, [picked?.seq]) // eslint-disable-line react-hooks/exhaustive-deps
}

function OrderedByRow({ orderBy = DESKTOP_PROVIDER_DEFAULT, date = MOIS_TODAY, time = hhmm(), salmon = false }: { orderBy?: string; date?: string; time?: string; salmon?: boolean }) {
  return (
    <div className="pb-row" style={{ padding: '10px 8px', gap: 8, borderBottom: LINE }}>
      <span style={{ width: 100 }}>Ordered By:</span>
      <span style={salmon ? { ['--pb-field-bg' as string]: '#fdc39f' } : undefined}><PBLookup w={206} name="mar-ordered-by" defaultValue={orderBy} /></span>
      <span style={{ marginLeft: 'auto' }}>Order Date / Time:</span><PBInput w={76} align="center" defaultValue={date} /><PBInput w={50} align="center" defaultValue={time} />
    </div>
  )
}

/* --- New Medication Administration Order ----------------------------------- */
export type MarOrderDraft = {
  med: string; dosage: string; dosageUnit: string; frequency: string; duration: string; durationUnit: string
  route: string; series: string; site: string; start: string; startTime: string; end: string
  indication: string; drugInstruction: string; adminInstruction: string; timeSensitive: boolean
}

export function MarNewOrderWindow({ picked, onLookup, onSubmit, onClose }: {
  picked?: { name: string; seq: number }
  onLookup: () => void
  /** Sign Order (true) or Save Order (false) */
  onSubmit: (draft: MarOrderDraft, signed: boolean) => void
  onClose: () => void
}) {
  const [d, setD] = useState<MarOrderDraft>({
    med: '', dosage: '', dosageUnit: '', frequency: '', duration: '', durationUnit: '', route: '', series: '', site: '',
    start: MOIS_TODAY, startTime: '09:00', end: '', indication: '', drugInstruction: '', adminInstruction: '', timeSensitive: false,
  })
  const set = <K extends keyof MarOrderDraft>(k: K) => (v: MarOrderDraft[K]) => setD((x) => ({ ...x, [k]: v }))
  usePicked(picked, set('med'))
  return (
    <StageWindow id={MAR_ACTION_WINDOWS.newOrder} title="New Medication Administration Order" width={755} height={640} onClose={onClose}
      bodyStyle={{ background: '#fff', overflow: 'auto' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onSubmit(d, true)} tutorialId="host.mois.command.mar-sign-order" wide={false}>Sign Order</FooterButton>
        <FooterButton onClick={() => onSubmit(d, false)} tutorialId="host.mois.command.mar-save-order" wide={false}>Save Order</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
      </>}>
      <MarBanner />
      <OrderedByRow salmon />
      <div className="pb-form" style={{ gridTemplateColumns: '100px 1fr', padding: '8px', gap: '4px 6px', borderBottom: LINE }}>
        <span>Medication:</span><MedicationField value={d.med} onChange={set('med')} onLookup={onLookup} />
        <span>Details:</span>
        <div className="pb-row" style={{ gap: 30, alignItems: 'flex-start' }}>
          <div><div>Dosage:</div><div className="pb-row"><PBInput w={50} align="center" value={d.dosage} onChange={(e) => set('dosage')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-dosage" /><PBSelect w={110} value={d.dosageUnit} options={DOSE_UNITS} onChange={(e) => set('dosageUnit')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-dosage-unit" /></div></div>
          <div><div>Frequency:</div><PBSelect w={166} value={d.frequency} options={MAR_FREQUENCIES} onChange={(e) => set('frequency')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-frequency" /></div>
          <div><div>Duration:</div><div className="pb-row"><PBInput w={50} align="center" value={d.duration} onChange={(e) => set('duration')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-duration" /><PBSelect w={126} value={d.durationUnit} options={MAR_DURATION_UNITS} onChange={(e) => set('durationUnit')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-duration-unit" /></div></div>
        </div>
        <span style={{ textAlign: 'right' }}>Route:</span>
        <div className="pb-row"><PBSelect w={166} value={d.route} options={ROUTES} onChange={(e) => set('route')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-route" /><span style={{ marginLeft: 'auto' }}>Series:</span><PBInput w={50} value={d.series} onChange={(e) => set('series')(e.target.value)} data-tutorial-id="host.mois.field.mar-series" /></div>
        <span style={{ textAlign: 'right' }}>Site:</span>
        <PBDropDownDataWindow w={246} columns={[{ key: 'site', header: 'Site', width: 60 }, { key: 'desc', header: 'Description' }]}
          rows={adminSites} value={d.site} display="desc" onSelect={(row) => set('site')(String(row.site))} />
      </div>
      <div className="pb-row" style={{ padding: '8px', gap: 8, borderBottom: LINE, alignItems: 'flex-start' }}>
        <span style={{ width: 100 }}>Scheduled Start:</span>
        <div>
          <div className="pb-row"><PBInput w={76} value={d.start} onChange={(e) => set('start')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-start" /><PBInput w={50} value={d.startTime} onChange={(e) => set('startTime')(e.target.value)} /></div>
          <PBCheckbox label="This is time sensitive." checked={d.timeSensitive} onChange={set('timeSensitive')} tutorialId="host.mois.field.mar-order-time-sensitive" />
        </div>
        <span style={{ marginLeft: 'auto' }}>Scheduled End:</span>
        <div><div className="pb-row"><PBInput w={76} value={d.end} onChange={(e) => set('end')(e.target.value)} /><PBInput w={50} /></div><span style={{ color: '#6d6d6d' }}>(leave blank if entering duration information)</span></div>
      </div>
      <div className="pb-form" style={{ gridTemplateColumns: '100px 306px', padding: 8, gap: 6, borderBottom: LINE }}>
        <span>Clinical Indication:</span><PBTextArea rows={3} w="100%" value={d.indication} onChange={(e) => set('indication')(e.target.value)} data-tutorial-id="host.mois.field.mar-order-indication" />
        <span>Drug Instruction:</span><PBTextArea rows={3} w="100%" value={d.drugInstruction} onChange={(e) => set('drugInstruction')(e.target.value)} />
        <span style={{ lineHeight: '13px' }}>Administration<br />Instruction:</span><PBTextArea rows={3} w="100%" value={d.adminInstruction} onChange={(e) => set('adminInstruction')(e.target.value)} />
      </div>
      <div className="pb-row" style={{ padding: '6px 10px', gap: 30 }}><span>Created:</span><span>{MOIS_TODAY}&nbsp;&nbsp;{hhmm()}&nbsp;&nbsp;{DESKTOP_PROVIDER_DEFAULT}</span></div>
    </StageWindow>
  )
}

/** How many doses an order's Frequency and Duration make (capped). */
export function doseCount(d: Pick<MarOrderDraft, 'frequency' | 'duration' | 'durationUnit'>): number {
  const perDay = /^BID/.test(d.frequency) ? 2 : /^TID/.test(d.frequency) ? 3 : /^QID/.test(d.frequency) ? 4 : /^QW/.test(d.frequency) ? 1 / 7 : 1
  const n = Math.max(1, Number(d.duration) || 1)
  const days = /^DAY/.test(d.durationUnit) ? n : /^WEEK/.test(d.durationUnit) ? n * 7 : /^MONTH/.test(d.durationUnit) ? n * 30 : 0
  const count = days ? Math.round(days * perDay) : n
  return Math.min(Math.max(1, count), 60)
}

/* --- Reschedule Single Medication Administration --------------------------- */
export type MarRescheduleDraft = { med: string; dose: string; units: string; reason: string; note: string; date: string; time: string }

export function MarRescheduleWindow({ event, order, picked, onLookup, onSave, onClose }: {
  /** the scheduled dose being moved (right-click ▸ Reschedule); absent for New … */
  event?: MarEvent
  order?: MarOrder
  picked?: { name: string; seq: number }
  onLookup: () => void
  onSave: (draft: MarRescheduleDraft) => void
  onClose: () => void
}) {
  const [d, setD] = useState<MarRescheduleDraft>({
    med: event?.generic ?? '', dose: event?.dose ?? '', units: event?.units ?? '', reason: '', note: '', date: '', time: '',
  })
  const set = <K extends keyof MarRescheduleDraft>(k: K) => (v: MarRescheduleDraft[K]) => setD((x) => ({ ...x, [k]: v }))
  usePicked(picked, set('med'))
  return (
    <StageWindow id={MAR_ACTION_WINDOWS.reschedule} title="Reschedule Single Medication Administration" width={752} height={470} onClose={onClose}
      bodyStyle={{ background: '#fff', overflow: 'auto' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onSave(d)} tutorialId="host.mois.command.mar-reschedule-save">Save</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
      </>}>
      <MarBanner />
      <OrderedByRow orderBy={order?.orderBy} date={order?.orderDate} time={order?.orderTime} />
      <div className="pb-form" style={{ gridTemplateColumns: '100px 1fr', padding: '8px', gap: '4px 6px', borderBottom: LINE }}>
        <span>Medication:</span><MedicationField value={d.med} onChange={set('med')} onLookup={onLookup} readOnly={!!event} />
        <span>Details:</span>
        <div className="pb-row" style={{ alignItems: 'flex-end' }}>
          <div><div>Dosage:</div><div className="pb-row"><PBInput w={50} align="center" value={d.dose} onChange={(e) => set('dose')(e.target.value)} /><PBSelect w={116} value={d.units} options={[...new Set([...DOSE_UNITS, d.units])]} onChange={(e) => set('units')(e.target.value)} /></div></div>
          <span style={{ marginLeft: 'auto' }}>Series:</span><PBInput w={50} defaultValue={event?.series ?? ''} />
        </div>
        <span style={{ textAlign: 'right' }}>Route:</span><PBSelect w={166} options={ROUTES} defaultValue={order?.route ?? ''} />
        <span style={{ textAlign: 'right' }}>Site:</span><PBSelect w={246} options={['', ...adminSites.map((s) => s.desc)]} />
      </div>
      <div className="pb-row" style={{ padding: '10px 8px', gap: 8, borderBottom: LINE }}>
        <span style={{ width: 100 }}>Initial Scheduled:</span><PBInput w={76} readOnly value={event?.date ?? MOIS_TODAY} /><PBInput w={50} readOnly value={event?.time ?? ''} />
      </div>
      <div style={{ display: 'flex', background: BLUE_BAND, flex: '1 1 auto', minHeight: 110 }}>
        <div className="pb-form" style={{ flex: '1 1 auto', gridTemplateColumns: '60px 1fr', padding: 8, gap: 4, alignContent: 'start' }}>
          <b style={{ gridColumn: 'span 2', color: '#000080' }}>Reason</b>
          <span style={{ textAlign: 'right' }}>Reason:</span><PBSelect w={322} value={d.reason} options={RESCHEDULE_REASONS} onChange={(e) => set('reason')(e.target.value)} data-tutorial-id="host.mois.field.mar-reschedule-reason" />
          <span style={{ textAlign: 'right' }}>Note:</span><PBTextArea rows={3} w={230} value={d.note} onChange={(e) => set('note')(e.target.value)} />
        </div>
        <div className="pb-form" style={{ width: 300, gridTemplateColumns: '60px 1fr', padding: 8, gap: 4, alignContent: 'start', borderLeft: LINE }}>
          <b style={{ gridColumn: 'span 2', color: '#000080' }}>New Date / Time</b>
          <span style={{ textAlign: 'right' }}>Date:</span><PBInput w={76} value={d.date} onChange={(e) => set('date')(e.target.value)} data-tutorial-id="host.mois.field.mar-new-date" />
          <span style={{ textAlign: 'right' }}>Time:</span><PBInput w={52} value={d.time} onChange={(e) => set('time')(e.target.value)} data-tutorial-id="host.mois.field.mar-new-time" />
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Record Single Medication Not Given ------------------------------------ */
export type MarNotGivenDraft = { action: string; med: string; reason: string; note: string; preference: string }

export function MarNotGivenWindow({ event, order, picked, onLookup, onSave, onClose }: {
  event?: MarEvent
  order?: MarOrder
  picked?: { name: string; seq: number }
  onLookup: () => void
  onSave: (draft: MarNotGivenDraft) => void
  onClose: () => void
}) {
  const [d, setD] = useState<MarNotGivenDraft>({ action: '', med: event?.generic ?? '', reason: '', note: '', preference: '' })
  const set = <K extends keyof MarNotGivenDraft>(k: K) => (v: MarNotGivenDraft[K]) => setD((x) => ({ ...x, [k]: v }))
  usePicked(picked, set('med'))
  useScreenReport({ marPreference: d.preference || null })
  const pref = (label: string) => (
    <PBButton
      className={d.preference === pbSlug(label) ? 'is-pressed' : undefined}
      style={{ minWidth: 104, ...(d.preference === pbSlug(label) ? { boxShadow: 'inset 1px 1px 0 #808080', background: '#dcdcdc' } : null) }}
      command={`mar-preference-${pbSlug(label)}`}
      onClick={() => set('preference')(d.preference === pbSlug(label) ? '' : pbSlug(label))}
    >
      {label}...
    </PBButton>
  )
  return (
    <StageWindow id={MAR_ACTION_WINDOWS.notGiven} title="Record Single Medication Not Given" width={540} height={440} onClose={onClose}
      bodyStyle={{ background: '#fff' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={!d.action} onClick={() => onSave(d)} tutorialId="host.mois.command.mar-not-given-save">Save (F2)</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
      </>}>
      <MarBanner />
      <OrderedByRow orderBy={order?.orderBy} date={order?.orderDate} time={order?.orderTime} />
      <div className="pb-form" style={{ gridTemplateColumns: '66px 1fr', padding: 8, gap: '4px 6px', borderBottom: LINE }}>
        <span>Action:</span><PBSelect w={176} value={d.action} options={NOT_GIVEN_ACTIONS} onChange={(e) => set('action')(e.target.value)} data-tutorial-id="host.mois.field.mar-not-given-action" />
        <span>Medication:</span><MedicationField value={d.med} onChange={set('med')} onLookup={onLookup} readOnly={!!event} />
      </div>
      <div style={{ background: BLUE_BAND, flex: '1 1 auto' }}>
        <div className="pb-form" style={{ gridTemplateColumns: '66px 1fr', padding: 8, gap: '4px 6px', borderBottom: LINE }}>
          <span>Reason:</span><PBSelect w={336} value={d.reason} options={NOT_GIVEN_REASONS} onChange={(e) => set('reason')(e.target.value)} data-tutorial-id="host.mois.field.mar-not-given-reason" />
          <span>Note:</span><PBTextArea rows={4} w={230} value={d.note} onChange={(e) => set('note')(e.target.value)} />
        </div>
        <div style={{ padding: 8 }} data-tutorial-id="host.mois.group.mar-create-preference">
          <div style={{ paddingBottom: 8 }}>(Optional) Create a Preference For:</div>
          <div className="pb-row" style={{ gap: 2 }}>{pref('Directive')}{pref('Contraindicated')}{pref('Not Indicated')}</div>
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Medication Administration Scheduled Record ---------------------------- */
export type MarDoseAction = 'dispensed' | 'administered' | 'witnessed' | 'self-administered' | 'other-provider' | 'rescheduled' | 'not-given'

export const DOSE_ACTIONS: [MarDoseAction, string][] = [
  ['dispensed', 'Dispensed'], ['administered', 'Administered'], ['witnessed', 'Witnessed'],
  ['self-administered', 'Self-Administered'], ['other-provider', 'Other Provider'], ['rescheduled', 'Rescheduled'], ['not-given', 'Not Given'],
]

export function MarScheduledRecordWindow({ order, event, onAction, onClose }: {
  order: MarOrder
  event: MarEvent
  onAction: (action: MarDoseAction) => void
  onClose: () => void
}) {
  const grey = { background: 'var(--pb-face)' }
  return (
    <StageWindow id={MAR_ACTION_WINDOWS.scheduled} title="Medication Administration Scheduled Record" width={760} height={640} onClose={onClose}
      bodyStyle={{ background: '#fff', overflow: 'auto' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={onClose} tutorialId="host.mois.command.mar-scheduled-save">Save</FooterButton>
        <FooterButton onClick={onClose}>Close</FooterButton>
      </>}>
      {/* the window's own bar: four of the seven actions (`1494e901…png`) */}
      <PBMenuBar items={[
        { label: 'Dispensed', onSelect: () => onAction('dispensed') },
        { label: 'Administered', onSelect: () => onAction('administered') },
        { label: 'Rescheduled', onSelect: () => onAction('rescheduled') },
        { label: 'Not Given', onSelect: () => onAction('not-given') },
      ]} />
      <MarBanner>
        <div style={{ background: BLUE_BAND, padding: '4px 8px 6px' }} data-tutorial-id="host.mois.group.mar-dose-actions">
          <div style={{ paddingBottom: 4 }}>Status:&nbsp;&nbsp;<b>{event.status}</b></div>
          <div className="pb-row" style={{ gap: 4 }}>
            {DOSE_ACTIONS.map(([id, label]) => (
              <PBButton key={id} style={{ minWidth: 92 }} disabled={event.status !== 'SCHEDULED'}
                command={`mar-dose-${id}`} onClick={() => onAction(id)}>{label}</PBButton>
            ))}
          </div>
        </div>
      </MarBanner>
      <div className="pb-row" style={{ padding: '10px 8px', gap: 8, borderBottom: LINE }}>
        <span style={{ width: 100 }}>Ordered By:</span><b style={{ width: 240 }}>{order.orderBy}</b>
        <span style={{ marginLeft: 'auto' }}>Order Date / Time:</span><b>{order.orderDate}&nbsp;&nbsp;&nbsp;{order.orderTime}</b>
      </div>
      <div className="pb-form" style={{ gridTemplateColumns: '100px 1fr', padding: 8, gap: '4px 6px', borderBottom: LINE, color: '#8a8a8a' }}>
        <span>Medication:</span><PBInput w={540} readOnly value={event.generic} style={grey} />
        <span>Scheduled Start:</span>
        <div className="pb-row"><PBInput w={76} readOnly value={event.date} style={grey} /><PBInput w={50} readOnly value={event.time} style={grey} />
          <span style={{ marginLeft: 'auto' }}>Scheduled End:</span><PBInput w={76} readOnly /><PBInput w={50} readOnly /></div>
        <span /><PBCheckbox label="This is time sensitive." disabled />
      </div>
      <div style={{ display: 'flex', borderBottom: LINE }}>
        <div className="pb-form" style={{ flex: '1 1 auto', gridTemplateColumns: '100px 1fr', padding: 8, gap: '4px 6px' }}>
          <span style={{ color: '#8a8a8a' }}>Details:</span>
          <div className="pb-row" style={{ gap: 12, color: '#8a8a8a' }}>
            <div><div>Dosage:</div><PBInput w={50} align="center" readOnly value={event.dose} style={grey} /></div>
            <div><div>Units:</div><PBSelect w={110} value={event.units} options={[event.units]} disabled /></div>
            <div><div>Series:</div><PBInput w={50} readOnly value={event.series} /></div>
          </div>
          <span style={{ textAlign: 'right' }}>Route:</span><PBSelect w={166} defaultValue={order.route} options={[...new Set([order.route, ...ROUTES])]} />
          <span style={{ textAlign: 'right' }}>Site:</span><PBSelect w={246} options={['', ...adminSites.map((s) => s.desc)]} />
        </div>
      </div>
      <div className="pb-form" style={{ gridTemplateColumns: '100px 300px', padding: 8, gap: 6 }}>
        <span>Notes:</span><span />
        <span style={{ textAlign: 'right' }}>Clinical Indication:</span><PBTextArea rows={2} w="100%" />
        <span style={{ textAlign: 'right' }}>Drug Instruction:</span><PBTextArea rows={2} w="100%" />
        <span style={{ textAlign: 'right', lineHeight: '13px' }}>Administration<br />Instruction:</span><PBTextArea rows={2} w="100%" />
        <span style={{ textAlign: 'right' }}>Preparation Note:</span><PBTextArea rows={2} w="100%" />
      </div>
      <div className="pb-row" style={{ padding: '4px 10px', gap: 30, color: '#8a8a8a' }}><span>Created:</span><span>{order.created}</span></div>
    </StageWindow>
  )
}

/* --- Drug Code Lookup ------------------------------------------------------ */
export function MarDrugCodeLookupWindow({ initial = '', onPick, onClose }: {
  initial?: string
  onPick: (drug: MarDrugCode) => void
  onClose: () => void
}) {
  const [typed, setTyped] = useState(initial)
  const [query, setQuery] = useState(initial.length >= 4 ? initial : '')
  const [system, setSystem] = useState<string>(MAR_CODE_SYSTEMS[0])
  const [refSet, setRefSet] = useState<string>('')
  const rows = useMemo(() => searchMarDrugCodes(query, system, refSet), [query, system, refSet])
  const c = usePagedCursor(rows.length)
  const row = rows[c.at]
  useScreenReport({ marDrugRows: rows.length, marReferenceSet: refSet ? pbSlug(refSet) : null })
  const columns: PBColumn<MarDrugCode>[] = [
    { key: 'f', header: 'F', width: 18, align: 'center' },
    { key: 'generic', header: 'Generic Name', width: 310 },
    { key: 'brand', header: 'Brand Name', width: 310 },
    { key: 'atc', header: 'ATC Code', width: 66 },
    { key: 'atcName', header: 'ATC Name', width: 156 },
    { key: 'cost', header: 'Cost', width: 52, align: 'right' },
    { key: 'lca', header: 'LCA', width: 52, align: 'right' },
  ]
  const info = (label: string, value: ReactNode, boxed = false) => (
    <><span>{label}</span><b style={boxed ? { border: '2px solid #d00', padding: '0 4px', justifySelf: 'start' } : undefined}>{value}</b></>
  )
  return (
    <StageWindow id={MAR_ACTION_WINDOWS.drugLookup} title="Drug Code Lookup" width={1010} height={700} onClose={onClose}
      bodyStyle={{ padding: 6, gap: 4 }}>
      <div style={{ display: 'flex', gap: 20, flex: 'none', padding: '4px 4px' }}>
        <div className="pb-form" style={{ gridTemplateColumns: '70px 1fr', gap: 4, flex: '1 1 auto' }}>
          <span>Search for:</span>
          <PBInput w={400} value={typed} data-tutorial-id="host.mois.field.mar-drug-search"
            onChange={(e) => { const v = e.target.value; setTyped(v); if (v.length >= 4 || !v) { setQuery(v); c.setCurrent(0) } }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setQuery(typed); c.setCurrent(0) } }} />
          <span>Coded search:</span>
          <div style={{ display: 'grid', gridTemplateColumns: '14px 180px 14px 1fr', color: '#333' }}>
            <b>`d</b><span>Search Generic and Brand Names</span><b>`a</b><span>Search ATC Code</span>
            <b>`c</b><span>Search Drug Code</span><b>`f</b><span>Search Formulary</span>
          </div>
        </div>
        <div className="pb-form" style={{ gridTemplateColumns: '90px 240px auto', gap: 4, alignContent: 'start' }}>
          <span style={{ textAlign: 'right' }}>Code System:</span>
          <PBSelect w={240} value={system} options={[...MAR_CODE_SYSTEMS]} onChange={(e) => { setSystem(e.target.value); c.setCurrent(0) }} data-tutorial-id="host.mois.field.mar-code-system" />
          <PBCheckbox label="Save as Default System" />
          <span style={{ textAlign: 'right' }}>Reference Set:</span>
          <PBSelect w={240} value={refSet} options={[...MAR_REFERENCE_SETS]} onChange={(e) => { setRefSet(e.target.value); c.setCurrent(0) }} data-tutorial-id="host.mois.field.mar-reference-set" />
          <PBCheckbox label="Save as Default Reference" />
        </div>
      </div>
      {/* the red Filter bar: "another visual indicator of which Code System
          and Reference Set you have selected" */}
      <div className="pb-row" style={{ flex: 'none', background: '#fbd4d4', color: '#b35656', padding: '2px 6px', gap: 0 }} data-tutorial-id="host.mois.group.mar-drug-filter">
        <span style={{ width: 350 }}>Code System: {system === MAR_CODE_SYSTEMS[0] ? 'ALL Drug Codes' : system}</span>
        <span>Reference Set: {refSet || 'ALL'}</span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow flush style={{ flex: '1 1 auto', minHeight: 0 }} columns={columns} rows={rows}
          current={c.at} onCurrentChange={c.setCurrent} onActivate={(r) => onPick(r)}
          rowTutorialId={(r) => `host.mois.row.mar-drug-${pbSlug(r.agent || r.brand || r.generic).slice(0, 32)}`}
          empty={query ? 'No drug code matches.' : 'Type four letters of the name (or fewer and press Enter).'} />
      </div>
      <div style={{ flex: 'none', border: '1px solid var(--pb-border)' }} data-tutorial-id="host.mois.group.mar-drug-info">
        <div style={{ background: '#cfe8f7', color: '#000080', fontWeight: 700, padding: '2px 6px' }}>Additional information for the selected item:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px 200px', gap: '2px 6px', padding: '4px 6px', background: '#fff' }}>
          {info('Generic Name:', row?.generic ?? '')}{info('ATC Code:', row?.atc ?? '')}
          {info('Manufacturer:', row?.manufacturer ?? '')}{info('ATC Name:', row?.atcName ?? '')}
          {info('Brand Name:', row?.brand ?? '')}{info('CDIC:', row?.cdic ?? '')}
          {info('Agent Name:', row?.agent ?? '', true)}{info('Ref. Sets:', row?.refSets.join(', ') ?? '')}
        </div>
      </div>
      <LookupPager
        cursor={c}
        style={{ ...PAGER_ROW, padding: '2px 0' }}
        ok={{ command: 'mar-drug-ok', tutorialId: 'host.mois.command.mar-drug-ok', isDefault: true, disabled: !row, onClick: () => row && onPick(row) }}
        cancel={{ onClick: onClose }}
      />
    </StageWindow>
  )
}

/* --- Multi-Value Selection (Record Status "…") ----------------------------
   2026-09-29 TRAINING capture c22 (chart 2429), measured at 2x: a 484 × 452
   window; a white grid box 5px in from the left and 11px from the right,
   366px tall, whose DataWindow is only as wide as its columns (an 18px
   gutter, Select 47, Code 142, Description 241) with 20px rows; twelve
   statuses; Continue · Cancel (74 × 22) centred on the face below. */
export function MarStatusSelectionWindow({ selected, onOk, onClose }: {
  selected: string[]
  onOk: (codes: string[]) => void
  onClose: () => void
}) {
  const picked = useTickSet(selected)
  const [cur, setCur] = useState(0)
  const rows = MAR_STATUSES.map(([code, description]) => ({ code, description }))
  return (
    <StageWindow id={MAR_ACTION_WINDOWS.status} title="Multi-Value Selection" width={484} height={452} onClose={onClose}
      bodyStyle={{ padding: '5px 11px 0 5px' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary wide={false} onClick={() => onOk([...picked.ticked])} tutorialId="host.mois.command.mar-status-ok">Continue</FooterButton>
        <FooterButton wide={false} onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-mar-mvs">
      {/* c22 paints the current row only with its arrow: no fill, no zebra */}
      <PBDataWindow flush zebra={false} style={{ width: 448, ['--pb-dw-row-h' as string]: '20px', ['--pb-dw-gutter-width' as string]: '18px', ['--pb-dw-select' as string]: '#fff' }} rows={rows} current={cur} onCurrentChange={setCur}
        rowTutorialId={(r) => `host.mois.row.mar-status-${pbSlug(r.code)}`}
        columns={[
          {
            key: 'select', header: 'Select', width: 47, align: 'center',
            render: (r) => <PBCheckbox checked={picked.has(r.code)} tutorialId={`host.mois.cell.mar-status-${pbSlug(r.code)}`}
              onChange={(on) => picked.set(r.code, on)} />,
          },
          { key: 'code', header: 'Code', width: 142 },
          { key: 'description', header: 'Description', width: 241 },
        ]} />
      </div>
    </StageWindow>
  )
}
