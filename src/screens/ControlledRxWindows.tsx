import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { FN_CONTROLLED_RX, isOn, useSpecialFunction, useSystemSetting } from '../data/accessSettings'
import type { DrugRow } from '../data/medications'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useEncounterSession } from '../host/encounterArea'
import { registerScreenWindows, useSessionState } from '../host/screen-windows'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBDataWindow, PBInput, PBSelect, PBTextArea, PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { STAGE_USER, useMedRows, type Med } from './medication-model'
import { DesktopLayer, FooterButton, StageWindow } from './StageWindow'

/* ============================================================================
   Controlled prescriptions (CPP) — the Schedule 1A route through Rx.

   303227 "Controlled Prescriptions":
   · Enabling: BHS turns the feature on; the clinic chooses Everybody or
     Requires Permission in System Settings ▸ APP SETTING - CPP RX
     (`6473f689…png`; data/systemSettings.ts, owned by the System Settings
     stream), and with Requires Permission each user needs "Can create
     controlled prescriptions" in User Account ▸ Special Functions
     (`51c5bd38…png`; data/userManagement.ts). `useControlledRx()` reads all
     three (data/accessSettings.ts).
   · Prescribing: Rx Wizard, pick a Schedule 1A drug, Ok → a new prescribing
     window (`707c119a…png`) instead of the Medication Dose Wizard; "Show
     preview" adds the printer-friendly sheet beside it (`42baf01a…`,
     `88e3337e…`, `2601186d…`); Print... (`40a56766…`) opens the print
     window with the signature pad (`f578c412…`, signed `94b142c1…`), whose
     Print (`24bc9345…`) prints it.
   · Attaching the folio'd copy back: Data Exchange ▸ Attach Files, TYPE
     Controlled Rx, Find Controlled Rx → Select Prescription → Folio Number +
     Signing Method (`3fd33f9d…`, `96642606…`, `680ce610…`) —
     `ControlledRxRecordBlock` below, drawn by screens/AttachmentUtilityViews.
   · Historical entries: Record ▸ New Historical (`3404d09b…`) starts an HX
     row (`d7ec0802…`) which a Schedule 1A drug turns into CPP HX
     (`ce34e801…`) — MedicationView handles the `rx-new-historical` slot.

   PROVENANCE of the two new windows (both the "MOIS" web-style windows the
   current build opens, cyan title bar, File · View):
   · the prescribing window `707c119a…` / `2601186d…`: the pale-blue patient
     band (Chart · Patient name · Born · Gender · Health No. · Preferred
     phone); Save (orange) · Cancel · Print... · Show preview / Hide
     preview; the grey "PRESCRIPTION - <drug>" band with ⓘ Detail; Date
     ordered; Indication: ◉ Other ○ OAT ○ Dual OAT ○ Prescribed safer supply,
     Indication description, ☐ PRN (as necessary); "Dose/duration":
     Dispense start / Dispense end "(7 days)", Amount * · Dose units ·
     Route · Frequency, For * · (unit) · ☐ Multistep dose, the directions
     summary box; "Direction for use, indication for therapy, or special
     instructions": Witness ingestion ▾ · Carries frequency ▾ · ☐ Not
     authorized for delivery, ☐ Do not adapt · ☐ Do not substitute, Comment.
   · the preview (`88e3337e…`): the BC controlled prescription form — PHN,
     prescribing date, patient name and address, date of birth, drug name
     and strength, quantity numeric / alpha, the pink OAT area (start / end
     date, total daily dose, witnessed days), NOT AUTHORIZED FOR DELIVERY,
     directions, NO REFILLS PERMITTED / VOID AFTER 5 DAYS, prescriber's
     signature, contact, PRESCRIBER ID, FOLIO, PHARMACY USE ONLY.
   · the print window (`f578c412…`): Print (orange) · Close, "Prescription
     template ▾ BC CONTROLLED PRESCRIPTION PRINTER FRIENDLY SHEET", the sheet
     twice on a dark desk (the second stamped DUPLICATE), and the Signature
     strip — a red ▶, Clear Signature, the pad.
   The Folio number "is not prepopulated on this view; this lives on the
   printer-friendly paper".

   INFERRED: which drugs are Schedule 1A (hydromorphone, methadone,
   buprenorphine by ATC here); the Frequency / Dose units / Witness / Carries
   lists beyond the values captured; the prescriber id "42-90210" is the
   capture's, stood in for the desktop provider's. The CPP Rx printer
   (Maintenance ▸ Computer Settings, `a71ee159…`) belongs to the Computer
   Settings window and is not added here.

   Screen windows (MedicationView draws them): `cpp-prescribing`,
   `cpp-print`, and the `rx-new-historical` command slot. Anchors:
   host.mois.dialog.cpp-prescribing / cpp-print; host.mois.command.cpp-{save,
   cancel, print, show-preview, clear-signature, print-close}; host.mois.
   field.cpp-{date, indication-<slug>, amount, dose-units, route, frequency,
   for, for-unit, witness, carries, comment, template}; host.mois.field.
   cpp-signature-pad. Reported: host.screen.cppPreview, .cppSigned.
   ========================================================================= */

export const CPP_WINDOWS = {
  prescribing: 'cpp-prescribing',
  print: 'cpp-print',
  newHistorical: 'rx-new-historical',
  selectPrescription: 'select-controlled-rx',
} as const

registerScreenWindows([CPP_WINDOWS.prescribing, CPP_WINDOWS.print, CPP_WINDOWS.newHistorical])

/** Schedule 1A drugs, by ATC (INFERRED — see the header). */
const SCHEDULE_1A_ATC = ['N02AA03', 'N07BC02', 'N07BC01', 'N07BC51']
export const isScheduleOneA = (d: Pick<DrugRow, 'atc'> | Pick<Med, 'atc'> | undefined) => !!d && SCHEDULE_1A_ATC.includes(d.atc)

/** Whether the desktop user may write a controlled prescription now. */
export function useControlledRx(): boolean {
  const enabled = isOn(useSystemSetting('Enable Controlled Prescriptions Feature'))
  const who = useSystemSetting('Who can create controlled prescriptions').toUpperCase()
  const permitted = useSpecialFunction(FN_CONTROLLED_RX)
  return enabled && (who.startsWith('E') || permitted)
}

/** The CPP details a prescribing window fills, kept on the draft row. */
export type CppDetails = {
  date: string; indication: string; description: string; prn: boolean
  start: string; amount: string; units: string; route: string; frequency: string; forN: string; forUnit: string; multistep: boolean
  witness: string; carries: string; noDelivery: boolean; noAdapt: boolean; noSubstitute: boolean; comment: string
}

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
/** The ALPHA column: 14 → Fourteen. */
export function inWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  const whole = Math.round(n)
  if (whole < 20) return ONES[whole]!
  if (whole < 100) return `${TENS[Math.floor(whole / 10)]}${whole % 10 ? ` ${ONES[whole % 10]!.toLowerCase()}` : ''}`
  if (whole < 1000) return `${ONES[Math.floor(whole / 100)]} hundred${whole % 100 ? ` ${inWords(whole % 100).toLowerCase()}` : ''}`
  return String(whole)
}

const PER_DAY: Record<string, number> = { 'Once Daily': 1, 'Twice Daily': 2, 'Three Times Daily': 3, 'Four Times Daily': 4 }
const UNIT_SHORT: Record<string, string> = { Milligram: 'MG', Millilitre: 'ML', Tablet: 'TAB', Capsule: 'CAP' }

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('.').map(Number)
  if (!y || !m || !d) return ''
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}.${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')}`
}

/** What the sheet prints, computed from the details. */
export function cppSummary(c: CppDetails) {
  const perDay = PER_DAY[c.frequency] ?? 1
  const days = Math.max(0, Number(c.forN) || 0) * (c.forUnit === 'Weeks' ? 7 : 1)
  const amount = Number(c.amount) || 0
  const unit = UNIT_SHORT[c.units] ?? c.units.toUpperCase()
  const total = amount * perDay * days
  const end = c.start && days ? addDays(c.start, days - 1) : ''
  const directions = amount ? `${amount} ${unit} ${c.route} ${c.frequency.toUpperCase()}${days ? ` DISPENSE ${days} DAY` : ''}` : ''
  return { perDay, days, amount, unit, total, end, directions, daily: amount * perDay }
}

export const blankCpp = (): CppDetails => ({
  date: MOIS_TODAY, indication: 'Other', description: '', prn: false, start: '', amount: '', units: 'Milligram', route: 'ORAL',
  frequency: 'Once Daily', forN: '', forUnit: 'Days', multistep: false, witness: 'None', carries: 'None', noDelivery: false, noAdapt: false, noSubstitute: false, comment: '',
})

/* --- the "MOIS" web-style window shell ------------------------------------ */
const ORANGE: CSSProperties = { background: '#f7941d', color: '#fff', border: '1px solid #e07d00', borderRadius: 2, padding: '6px 16px', font: 'inherit', fontWeight: 600, cursor: 'pointer' }
const PLAIN: CSSProperties = { background: '#fff', color: '#333', border: '1px solid #bbb', borderRadius: 2, padding: '6px 16px', font: 'inherit', cursor: 'pointer' }
const WEB: CSSProperties = { fontFamily: '"Segoe UI", Arial, sans-serif', fontSize: 13, color: '#333' }
const BAND: CSSProperties = { background: '#ececec', padding: '8px 12px', margin: '10px 0 6px', fontSize: 14 }
const LBL: CSSProperties = { display: 'block', margin: '8px 0 3px' }
const INPUT: CSSProperties = { height: 28, border: '1px solid #bbb', borderRadius: 2, padding: '2px 8px', font: 'inherit', boxSizing: 'border-box' }

function WebButton({ id, style, onClick, children }: { id: string; style: CSSProperties; onClick: () => void; children: ReactNode }) {
  const host = usePBInstrumentation()
  return (
    <button type="button" style={style} data-tutorial-id={host?.anchor('command', `cpp-${id}`)}
      onClick={() => { host?.report('command', { command: `cpp-${id}` }); onClick() }}>{children}</button>
  )
}

function PatientBand() {
  const p = usePatient()
  const cell = (label: string, value: ReactNode) => <div><div style={{ color: '#666' }}>{label}</div><b>{value}</b></div>
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#e3f0fa', padding: '6px 14px', borderBottom: '2px solid #f7941d', flex: 'none' }}>
      {cell('Chart', p.chart)}
      {cell('Patient name', `${p.first} ${p.last}`.toUpperCase())}
      {cell('Born', `${p.dob}   ${p.age.replace(/ YR OLD/i, ' years')}`)}
      {cell('Gender', p.sex)}
      {cell('Health No.', p.bchn ?? p.insurance ?? '')}
      {cell('Preferred phone', p.home ? `${p.home} Home` : '')}
    </div>
  )
}

function MoisWebWindow({ id, width, height, onClose, children }: { id: string; width: number; height: number; onClose: () => void; children: ReactNode }) {
  useScreenReport({ dialog: id })
  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 86 }}>
        <PBWindow child title="MOIS" onClose={onClose} tutorialId={`host.mois.dialog.${id}`}
          style={{ width: `min(${width}px, calc(100% - 24px))`, height: `min(${height}px, calc(100% - 24px))` }}>
          <div style={{ ...WEB, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div className="pb-row" style={{ gap: 14, padding: '2px 8px', flex: 'none' }}><span>File</span><span>View</span></div>
            <PatientBand />
            {children}
          </div>
        </PBWindow>
      </div>
    </DesktopLayer>
  )
}

/* --- the BC controlled prescription sheet --------------------------------- */
export function CppSheet({ med, c, signature, duplicate = false, scale = 1 }: {
  med: Pick<Med, 'med'>; c: CppDetails; signature?: string[]; duplicate?: boolean; scale?: number
}) {
  const p = usePatient()
  const s = cppSummary(c)
  const [py, pm, pd] = c.date.split('.')
  const [by, bm, bd] = p.dob.split('.')
  const [sy, sm, sd] = (c.start || '').split('.')
  const [ey, em, ed] = (s.end || '').split('.')
  const blue: CSSProperties = { color: '#0d2c8c', fontWeight: 700 }
  const small: CSSProperties = { fontSize: 8, color: '#333' }
  const row: CSSProperties = { borderBottom: '1px solid #333', padding: '2px 6px' }
  const pink = '#e8c9cb'
  const trio = (d?: string, m?: string, y?: string) => (
    <span style={{ display: 'inline-flex', gap: 10 }}>
      {[[d, 'DAY'], [m, 'MONTH'], [y?.slice(2), 'YEAR']].map(([v, l]) => <span key={l} style={{ textAlign: 'center' }}><span style={blue}>{v ?? ''}</span><br /><span style={small}>{l}</span></span>)}
    </span>
  )
  return (
    <div data-tutorial-id={duplicate ? undefined : 'host.mois.group.cpp-sheet'}
      style={{ position: 'relative', width: 400, border: '2px solid #333', borderRadius: 14, background: '#fff', fontSize: 10, overflow: 'hidden', transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: 'top left' }}>
      {duplicate && <span style={{ position: 'absolute', left: 60, top: 260, transform: 'rotate(-50deg)', fontSize: 54, fontWeight: 700, color: 'rgba(0,0,0,0.15)' }}>DUPLICATE</span>}
      <div style={{ display: 'flex', ...row }}>
        <div style={{ flex: '1 1 auto' }}><span style={small}>PERSONAL HEALTH NO.</span><div style={blue}>{(p.bchn ?? p.insurance ?? '').replace(/\s/g, '')}</div></div>
        <div style={{ background: pink, padding: '0 6px' }}><span style={small}>PRESCRIBING DATE</span><div>{trio(pd, pm, py)}</div></div>
      </div>
      <div style={row}><span style={small}>PATIENT NAME &nbsp; FIRST (GIVEN)</span> <span style={blue}>{p.first.toUpperCase()}</span> <span style={{ ...small, marginLeft: 40 }}>LAST (SURNAME)</span> <span style={blue}>{p.last.toUpperCase()}</span></div>
      <div style={{ display: 'flex', ...row }}>
        <div style={{ flex: '1 1 auto' }}>
          <span style={small}>PATIENT ADDRESS &nbsp; STREET</span> <span style={blue}>{p.address ?? ''}</span><br />
          <span style={small}>CITY</span> <span style={blue}>{p.city ?? ''}</span> <span style={{ ...small, marginLeft: 30 }}>PROVINCE</span> <span style={blue}>{p.province ?? ''}</span>
        </div>
        <div style={{ textAlign: 'center' }}><span style={small}>DATE OF BIRTH</span><div>{trio(bd, bm, by)}</div></div>
      </div>
      <div style={row}><span style={small}>Rx: DRUG NAME AND STRENGTH</span><span style={{ ...small, float: 'right', fontWeight: 700 }}>VOID IF ALTERED</span><div style={blue}>{med.med}</div></div>
      <div style={{ ...row, display: 'flex', gap: 30 }}>
        <span><span style={blue}>{s.total ? `${s.total} ${s.unit}` : ''}</span><br /><span style={small}>QUANTITY (IN UNITS) NUMERIC</span></span>
        <span><span style={blue}>{s.total ? `${inWords(s.total)} ${s.unit}` : ''}</span><br /><span style={small}>ALPHA</span></span>
      </div>
      <div style={{ background: pink }}>
        <div style={{ ...row, textAlign: 'center', ...small, fontWeight: 700 }}>THIS AREA MUST BE COMPLETED IN FULL FOR OPIOID AGONIST TREATMENT</div>
        <div style={{ ...row, display: 'flex', justifyContent: 'space-around' }}><span>START DATE: {trio(sd, sm, sy)}</span><span>END DATE: {trio(ed, em, ey)}</span></div>
        <div style={{ ...row, display: 'flex', gap: 20 }}>
          <span>TOTAL DAILY DOSE <span style={blue}>{s.daily ? `${s.daily}${s.unit}` : ''}</span> <span style={blue}>{s.daily ? inWords(s.daily) : ''}</span> {s.unit.toLowerCase()}/day</span>
          <span>DAYS PER WEEK OF DAILY WITNESSED INGESTION <span style={blue}>{c.witness !== 'None' ? c.witness : ''}</span></span>
        </div>
        <div style={row}>{c.noDelivery ? '☒' : '☐'} NOT AUTHORIZED FOR DELIVERY</div>
      </div>
      <div style={{ ...row, minHeight: 70 }}><span style={small}>DIRECTION FOR USE, INDICATION FOR THERAPY, OR SPECIAL INSTRUCTIONS</span><div style={blue}>{s.directions.replace(' DISPENSE', ', DISPENSE')}</div>{c.comment && <div style={blue}>{c.comment}</div>}</div>
      <div style={{ display: 'flex', ...row }}>
        <div style={{ background: '#bdbdbd', padding: '2px 6px', fontWeight: 700, textAlign: 'center', width: 140 }}>NO REFILLS PERMITTED<br />VOID AFTER 5 DAYS</div>
        <div style={{ flex: '1 1 auto', paddingLeft: 6 }}>
          <span style={small}>PRESCRIBER&apos;S SIGNATURE</span>
          {signature?.length ? (
            <svg viewBox="0 0 520 90" style={{ display: 'block', width: '100%', height: 30 }}>
              {signature.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#000" strokeWidth={4} />)}
            </svg>
          ) : null}
        </div>
      </div>
      <div style={{ display: 'flex', ...row }}>
        <div style={{ flex: '1 1 auto' }}><span style={small}>PRESCRIBER&apos;S CONTACT INFORMATION</span><div>{STAGE_USER}</div></div>
        <div style={{ width: 120 }}><span style={blue}>42-90210</span><br /><span style={small}>PRESCRIBER ID</span><br /><span style={small}>FOLIO</span></div>
      </div>
      <div style={{ background: '#d8d8d8', textAlign: 'center', fontWeight: 700, padding: 2 }}>PHARMACY USE ONLY</div>
      <div style={{ display: 'flex', padding: '2px 6px 18px' }}><span style={{ ...small, flex: 1 }}>RECEIVED BY: PATIENT OR AGENT SIGNATURE</span><span style={{ ...small, flex: 1 }}>SIGNATURE OF DISPENSING PHARMACIST</span></div>
    </div>
  )
}

/* --- the prescribing window ------------------------------------------------ */
export function CppPrescribingWindow({ med, initial, onSave, onPrint, onClose }: {
  med: Med
  initial?: CppDetails
  onSave: (c: CppDetails) => void
  onPrint: (c: CppDetails) => void
  onClose: () => void
}) {
  const [c, setC] = useState<CppDetails>(initial ?? blankCpp())
  const [preview, setPreview] = useState(false)
  const set = <K extends keyof CppDetails>(k: K) => (v: CppDetails[K]) => setC((x) => ({ ...x, [k]: v }))
  const s = cppSummary(c)
  useScreenReport({ cppPreview: preview })
  const select = (id: keyof CppDetails, options: string[], w = 150) => (
    <PBSelect w={w} value={String(c[id])} options={options} onChange={(e) => set(id)(e.target.value as never)} data-tutorial-id={`host.mois.field.cpp-${pbSlug(String(id))}`} />
  )
  const input = (id: keyof CppDetails, w: number, placeholder = '', required = false) => (
    <input style={{ ...INPUT, width: w, background: required && !c[id] ? '#fff6dc' : '#fff' }} value={String(c[id])} placeholder={placeholder}
      data-tutorial-id={`host.mois.field.cpp-${pbSlug(String(id))}`} onChange={(e) => set(id)(e.target.value as never)} />
  )
  const check = (id: keyof CppDetails, label: string) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 18 }}>
      <input type="checkbox" checked={Boolean(c[id])} data-tutorial-id={`host.mois.field.cpp-${pbSlug(String(id))}`} onChange={(e) => set(id)(e.target.checked as never)} />{label}
    </label>
  )
  return (
    <MoisWebWindow id={CPP_WINDOWS.prescribing} width={preview ? 1440 : 900} height={860} onClose={onClose}>
      <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #ddd', flex: 'none' }}>
        <WebButton id="save" style={ORANGE} onClick={() => onSave(c)}>&#128190; Save</WebButton>
        <WebButton id="cancel" style={PLAIN} onClick={onClose}>&#10005; Cancel</WebButton>
        <WebButton id="print" style={PLAIN} onClick={() => onPrint(c)}>&#128424; Print...</WebButton>
        <WebButton id="show-preview" style={PLAIN} onClick={() => setPreview((v) => !v)}>&#128065; {preview ? 'Hide preview' : 'Show preview'}</WebButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, overflow: 'auto', padding: '0 14px 14px' }}>
          <div style={{ ...BAND, display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
            <span>PRESCRIPTION - {med.med}</span><span style={{ color: '#f7941d' }}>&#9432; <span style={{ color: '#333' }}>Detail</span></span>
          </div>
          <span style={LBL}>Date ordered</span>{input('date', 150)}
          <span style={LBL}>Indication</span>
          <div style={{ display: 'flex', gap: 14 }}>
            {['Other', 'OAT', 'Dual OAT', 'Prescribed safer supply'].map((i) => (
              <label key={i}><input type="radio" name="cpp-indication" checked={c.indication === i} data-tutorial-id={`host.mois.field.cpp-indication-${pbSlug(i)}`} onChange={() => set('indication')(i)} /> {i}</label>
            ))}
          </div>
          <div style={{ marginTop: 6 }}>{input('description', 300, 'Indication description')}</div>
          <div style={{ marginTop: 6 }}>{check('prn', 'PRN (as necessary)')}</div>
          <div style={BAND}>Dose/duration</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div><span style={LBL}>Dispense start</span>{input('start', 150, 'YYYY.MM.DD')}</div>
            <div><span style={LBL}>Dispense end</span><input style={{ ...INPUT, width: 150 }} readOnly value={s.end || '<calculated below>'} /> {s.days ? `(${s.days} days)` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div><span style={LBL}>Amount <span style={{ color: '#d00' }}>*</span></span>{input('amount', 80, '', true)}</div>
            <div><span style={LBL}>Dose units</span>{select('units', ['Milligram', 'Millilitre', 'Tablet', 'Capsule'])}</div>
            <div><span style={LBL}>Route</span>{select('route', ['ORAL', 'SUBLINGUAL', 'TRANSDERMAL', 'INTRAMUSCULAR'])}</div>
            <div><span style={LBL}>Frequency</span>{select('frequency', Object.keys(PER_DAY))}</div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            <div><span style={LBL}>For <span style={{ color: '#d00' }}>*</span></span>{input('forN', 80, '', true)}</div>
            <div><span style={LBL}>{s.days ? `(${s.days} days)` : 'Frequency'}</span>{select('forUnit', ['Days', 'Weeks'])}</div>
            <div style={{ marginLeft: 80 }}>{check('multistep', 'Multistep dose')}</div>
          </div>
          <div data-tutorial-id="host.mois.field.cpp-directions" style={{ border: '1px solid #ccc', borderRadius: 2, minHeight: 44, marginTop: 10, padding: '6px 8px', color: '#777', whiteSpace: 'pre-line' }}>
            {s.directions.replace(' DISPENSE', '\nDISPENSE')}
          </div>
          <div style={BAND}>Direction for use, indication for therapy, or special instructions</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            <div><span style={LBL}>Witness ingestion</span>{select('witness', ['None', '1', '2', '3', '4', '5', '6', '7'], 110)}</div>
            <div><span style={LBL}>Carries frequency</span>{select('carries', ['None', 'Daily', 'Weekly'], 110)}</div>
            <div>{check('noDelivery', 'Not authorized for delivery')}</div>
          </div>
          <div style={{ marginTop: 10 }}>{check('noAdapt', 'Do not adapt')}{check('noSubstitute', 'Do not substitute')}</div>
          <span style={LBL}>Comment</span>
          <textarea style={{ ...INPUT, width: 520, height: 70 }} value={c.comment} data-tutorial-id="host.mois.field.cpp-comment" onChange={(e) => set('comment')(e.target.value)} />
        </div>
        {preview && (
          <div style={{ width: 600, flex: 'none', overflow: 'auto', borderLeft: '1px solid #ddd', padding: 20, position: 'relative' }} data-tutorial-id="host.mois.group.cpp-preview">
            <button type="button" aria-label="Close preview" onClick={() => setPreview(false)} style={{ position: 'absolute', right: 10, top: 6, border: 0, background: 'none', fontSize: 18, cursor: 'pointer' }}>&#10005;</button>
            <CppSheet med={med} c={c} scale={1.3} />
          </div>
        )}
      </div>
    </MoisWebWindow>
  )
}

/* --- the print window, with the signature pad ----------------------------- */
export function CppPrintWindow({ med, c, onPrint, onClose }: {
  med: Med
  c: CppDetails
  onPrint: () => void
  onClose: () => void
}) {
  const [strokes, setStrokes] = useState<string[]>([])
  const drawing = useRef(false)
  const pad = useRef<SVGSVGElement>(null)
  useScreenReport({ cppSigned: strokes.length > 0 })
  const point = (e: ReactPointerEvent) => {
    const r = pad.current!.getBoundingClientRect()
    return `${Math.round(((e.clientX - r.left) / r.width) * 520)},${Math.round(((e.clientY - r.top) / r.height) * 90)}`
  }
  const host = usePBInstrumentation()
  return (
    <MoisWebWindow id={CPP_WINDOWS.print} width={1160} height={860} onClose={onClose}>
      <div style={{ display: 'flex', gap: 10, padding: '10px 14px', alignItems: 'center', flex: 'none' }}>
        <WebButton id="print-sheet" style={ORANGE} onClick={onPrint}>&#128424; Print</WebButton>
        <WebButton id="print-close" style={PLAIN} onClick={onClose}>&#10005; Close</WebButton>
        <span style={{ flex: '1 1 auto' }} />
        <span>Prescription template</span>
        <select style={{ ...INPUT, width: 380 }} data-tutorial-id="host.mois.field.cpp-template" defaultValue="BC CONTROLLED PRESCRIPTION PRINTER FRIENDLY SHEET">
          <option>BC CONTROLLED PRESCRIPTION PRINTER FRIENDLY SHEET</option>
        </select>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#4a4a4a', margin: '0 14px', padding: 18, display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fff', padding: '14px 18px', display: 'flex', gap: 18 }}>
          <div><div style={{ textAlign: 'center', fontSize: 10 }}>---------BC CONTROLLED PRESCRIPTION FORM---------</div><CppSheet med={med} c={c} signature={strokes} /></div>
          <div><div style={{ textAlign: 'center', fontSize: 10 }}>---------BC CONTROLLED PRESCRIPTION FORM---------</div><CppSheet med={med} c={c} signature={strokes} duplicate /></div>
        </div>
      </div>
      <div style={{ display: 'flex', margin: '10px 14px 14px', border: '1px solid #999', height: 90, flex: 'none' }}>
        <div style={{ width: 96, padding: 6, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <b>Signature</b>
          <span style={{ color: '#e8403c', fontSize: 26, lineHeight: 1 }}>&#9654;</span>
          <button type="button" data-tutorial-id={host?.anchor('command', 'cpp-clear-signature')} onClick={() => setStrokes([])}
            style={{ border: 0, background: 'none', padding: 0, color: '#0645ad', textDecoration: 'underline', font: 'inherit', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>Clear Signature</button>
        </div>
        <svg ref={pad} data-tutorial-id="host.mois.field.cpp-signature-pad" viewBox="0 0 520 90" preserveAspectRatio="none"
          style={{ flex: '1 1 auto', background: 'repeating-conic-gradient(#f1f1f1 0% 25%, #fff 0% 50%) 50% / 16px 16px', touchAction: 'none' }}
          onPointerDown={(e) => { drawing.current = true; const pt = point(e); setStrokes((s) => [...s, pt]) }}
          onPointerMove={(e) => { if (!drawing.current) return; const pt = point(e); setStrokes((s) => [...s.slice(0, -1), `${s[s.length - 1]} ${pt}`]) }}
          onPointerUp={() => { drawing.current = false }}
          onPointerLeave={() => { drawing.current = false }}>
          {strokes.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#000" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />)}
        </svg>
      </div>
    </MoisWebWindow>
  )
}

/* --- Data Exchange ▸ Attach Files, TYPE Controlled Rx --------------------- */

/** A controlled prescription's attached copy: its folio and signing method. */
export type CppAttachment = { folio: string; method: string }

/** Folios filed this session, by prescription id. */
export function useCppAttachments() {
  const { chart } = usePatient()
  return useSessionState<Record<string, CppAttachment>>(`cpp-attachments:${chart}`, {})
}

/** Select Prescription (`96642606…png`): the chart's controlled prescriptions. */
function SelectPrescriptionWindow({ onPick, onClose }: { onPick: (m: Med) => void; onClose: () => void }) {
  const rows = useMedRows('rx').filter((m) => m.type.startsWith('CPP') && !m.voided)
  const [cur, setCur] = useState(0)
  return (
    <StageWindow id={CPP_WINDOWS.selectPrescription} title="Select Prescription" width={896} height={582} onClose={onClose}
      bodyStyle={{ padding: 10, background: '#fff' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={!rows[cur]} onClick={() => rows[cur] && onPick(rows[cur]!)} tutorialId="host.mois.command.select-prescription">Select Prescription</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--pb-border)' }}>
        <div style={{ background: 'var(--pb-band)', fontWeight: 700, padding: '3px 6px' }}>Prescription List</div>
        <PBDataWindow flush style={{ flex: '1 1 auto', minHeight: 0 }} rows={rows} current={cur} onCurrentChange={setCur}
          onActivate={(m) => onPick(m)} rowTutorialId={(m) => `host.mois.row.controlled-rx-${pbSlug(m.med).slice(0, 32)}`}
          columns={[
            { key: 'order', header: 'Prescribing Date', width: 100, align: 'center' },
            { key: 'med', header: 'Medication' },
            { key: 'amount', header: 'Quantity', width: 120 },
            { key: 'orderBy', header: 'Order By', width: 160 },
          ]}
          empty="No controlled prescriptions on file for this chart." />
      </div>
    </StageWindow>
  )
}

/** The Record band's body for TYPE Controlled Rx (`3fd33f9d…`, `680ce610…`). */
export function ControlledRxRecordBlock({ onReady }: {
  /** the prescription and folio the next Attach files against */
  onReady: (pending: { med: Med; attachment: CppAttachment } | null) => void
}) {
  const [finding, setFinding] = useState(false)
  const [med, setMed] = useState<Med | null>(null)
  const [folio, setFolio] = useState('')
  const [method, setMethod] = useState('Digital Signature')
  const host = usePBInstrumentation()
  const report = (m: Med | null, f: string, how: string) => onReady(m ? { med: m, attachment: { folio: f, method: how } } : null)
  const ro = { background: 'var(--pb-face)' }
  return (
    <div style={{ padding: '4px 8px', flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <PBButton style={{ alignSelf: 'flex-start' }} data-tutorial-id={host?.anchor('command', 'find-controlled-rx')}
        onClick={() => { host?.report('command', { command: 'find-controlled-rx' }); setFinding(true) }}>Find Controlled Rx</PBButton>
      <div className="pb-form" style={{ gridTemplateColumns: '100px 170px 80px 1fr', gap: 3, color: '#8a8a8a' }}>
        <span>Prescribing Date:</span><PBInput w={120} readOnly value={med?.order ?? ''} style={ro} />
        <span>Ordered By:</span><PBInput w="100%" readOnly value={med?.orderBy ?? ''} style={ro} />
        <span>Medication:</span><PBInput readOnly value={med?.med ?? ''} style={{ ...ro, gridColumn: 'span 3' }} />
        <span>Quantity:</span><PBInput w={150} readOnly value={med?.amount ?? ''} style={ro} />
        <span>Indication:</span><PBInput w="100%" readOnly value={med?.indic ?? ''} style={ro} />
        <span style={{ color: '#000' }}>Folio Number:</span>
        <PBInput w={160} value={folio} disabled={!med} data-tutorial-id="host.mois.field.folio-number"
          onChange={(e) => { setFolio(e.target.value); report(med, e.target.value, method) }} />
        <span style={{ color: '#000' }}>Signing Method:</span>
        <PBSelect w={180} value={method} options={['Digital Signature', 'Physician Signature']} disabled={!med} data-tutorial-id="host.mois.field.signing-method"
          onChange={(e) => { setMethod(e.target.value); report(med, folio, e.target.value) }} />
        <span style={{ color: '#000' }}>Office Note:</span><PBTextArea rows={2} style={{ gridColumn: 'span 3' }} defaultValue={med?.office ?? ''} />
      </div>
      {finding && (
        <SelectPrescriptionWindow onClose={() => setFinding(false)}
          onPick={(m) => { setMed(m); setFinding(false); report(m, folio, method) }} />
      )}
    </div>
  )
}

/** File the Attach Files attachment on the controlled prescription. */
export function useFileControlledRx() {
  const [, setAttachments] = useCppAttachments()
  const area = useEncounterSession()
  return (pending: { med: Med; attachment: CppAttachment } | null) => {
    if (!pending) return
    const target = `rx:${pending.med.id}`
    /* "When adding a second attachment to a CPP entry, the information from
       the previous attachment will be overwritten" */
    setAttachments((a) => ({ ...a, [pending.med.id]: pending.attachment }))
    area.update((s) => ({ ...s, attachments: { ...s.attachments, [target]: Math.max(1, s.attachments[target] ?? 0) } }))
  }
}
