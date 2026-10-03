import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import {
  ALL_PERMISSIONS, APPT_STATUSES, DEFAULT_FEE_CODE, LITE_CHARTS_KEY, LITE_ENCOUNTERS, LITE_ENCOUNTERS_KEY, LITE_PROVIDERS,
  NOTE_TEMPLATES, SERVICE_LOCATIONS, VISIT_REASONS, dayOffset,
  type LiteChart, type LiteEncounter, type LitePermissions, type MoisLaunchMode, type MoisLaunchStart,
} from '../data/launchModes'
import { pad2 } from '../data/clock'
import { usePatientRoster } from '../data/patient-context'
import { MOIS_TODAY, ageOf, type Patient } from '../data/patients'
import { BILLING_ENC_TIMES_ROW, isYes, useSystemSetting } from '../data/systemSettings'
import { registerConfirmCurrent } from '../host/confirmCurrent'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import {
  PBButton, PBCheckbox, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea, PBWindow, pbSlug,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { FACE, ModalLayer, ModalWindow, clampTo } from './dialogKit'
import { CaptionGroup, ReadOnlyField } from './formKit'
import { GRID_BOX, LookupBand, PickListWindow } from './lookupKit'
import { Btn, DetailWindow, FieldLabel, TopMessage, stampNow } from './AdminExchangeKit'
import { UM_ACCESS_CSS } from './UserAccessTabs'

/* ============================================================================
   The two alternate launch modes of the MOIS client — Encounter Lite
   (3797326) and MyEncounters (3103943) — and the choosers in front of them.

   HOW A HOST SELECTS ONE (the decision, documented in host/manifest.ts too):
     - a fixture: `encounter-lite`, `my-encounters`, `select-launch-mode`
       (Encounter Lite's "Select Launch Mode" list first) and
       `select-service-group` (MyEncounters' "Select Service Group /
       Pathway" first) — `MOIS_CLASSIC_LAUNCH_MODES` in host/manifest.ts;
     - or the shell's `launchMode` prop, which wins over the fixture.
     Every other fixture, and no prop, is the Main Program exactly as before:
     this layer is not mounted at all.
   While a launch mode is up, the MDI frame is hidden. "Launch Main Program"
   shows it beside the launch window ("will open main MOIS in a secondary
   window and keep the My Encounters Window available"); a click on either
   brings it to the front. Close closes the launch window; with the Main
   Program open, that one stays ("both windows will have to close").
   Closing the last window leaves an empty desktop with a "Launch MOIS"
   button — an emulator affordance, not MOIS.

   PROVENANCE
   · Select Launch Mode — 3797326 inline image 3: a list headed "Launch
     Mode" (Main Program, Encounter Lite), Ok / Cancel.
   · Select Service Group / Pathway — 3103943 `b59a0d20…`: Service Group /
     Pathway · Mode (VP Main Program; VMOA Tracking Board (VMOA); My
     Encounters (VP)), Continue. Tracking Board has no capture and is not
     built: choosing it opens the Main Program.
   · The launch window — 3103943 `0b1ad375…` (My Encounters, 1074 × 787) and
     3797326 inline images 4–14 (Encounter Lite, "MOIS: SMITHERS PRIMARY CARE
     CLINIC - Encounter Lite"): left, "Search Options" — Encounter Lite adds a
     "Provider" group — then "Time Frame" (Today, Today and Yesterday, In
     Last n Days/Weeks, Since, Between … & …), "Include" Discharged, and the
     patients grouped by day ("Today", "Sunday November 09, 2025"), a "D"
     beside a discharged visit and an Information tip on hover (Patient,
     Date, Time, Reason, Status). Right, the blue bands "Search for Chart"
     (Insurance No., Last Name, Birth Date, "(at least one optional parameter
     is required)", Find…), "Chart Data" (… Chart No.:), "Encounter Detail"
     (Most Recent Encounter: date time reason) and "Encounter Note"
     (Author:). Buttons: Launch Main Program, Send Task | New Encounter,
     Save, Care Complete (MyEncounters), Close. Encounter Lite's window adds
     Make Private (3797326 "Make Note Private").
   · Chart Data — inline image 12: First Name*, Middle Name, Last Name*,
     Insurance by*, Insurance No.*, Birth Date*, Gender*, City* "…",
     Province*, Postal Code*, Preferred* with Home / Work / Cell.
   · Encounter Detail — inline image 14: Scheduled Date / Time, Visit Code,
     Reason "…", Appt Status, Slots, Visit Mode (DE), Service Location, Start
     Time (seen) + Start, Finished Time (discharge) + Finish, General Note,
     Billing Data…. Billing Data (Health Issue / Service ×4, Back) has no
     capture — INFERRED from the article's steps.
   · Confirm Chart for Patient — inline image 8 ("The following chart has
     been found: … Would you like to create a new encounter for this
     patient?" Yes / No / Cancel); Chart Advance Search List — image 9
     (Search Results: Chart, First Name, Middle Name, Last Name, DoB, Gender,
     Ins., Insurance No., PHN, Home #); No Chart Found — image 11 / 3103943
     `46bd1494…`; Permission Denied — image 10; Quick Patient Registration
     Form — image 13 (Register (F2) / Cancel).
   · My Encounter - Care Complete — 3103943 `7722ca57…`: Encounter Detail:
     Patient, Visit Reason "…", Encounter Date / Time, Care Stop Date / Time
     (0000.00.00 until Continue fills it), Health Issue (optional) ×2,
     Service (optional) ×2, Continue / Cancel. The provider's Default Fee
     Code (the article's "Bonus Function") is applied at billing; the image
     prints nothing for it, so neither does this window.
   · The template list F4 opens, Make Private and the future-date prompt are
     described in 3797326's steps but have no capture: INFERRED.
   · Tracking Board (VMOA): only its row in the Service Group chooser exists
     anywhere (b59a0d20); no article or image shows the board, so it is not
     built. No help-site article's title names it, Encounter Lite or
     MyEncounters beyond these two (searched 2026-10-03).

   CURRENT BUILD vs OLDER EVIDENCE (2026-10-03 pass). Only Select Launch Mode
   is matched to a current-build capture (2026-10-02 TRAINING capture 12).
   Everything else here is laid out from the help-site images above, which
   come from older builds (the sample data is dated 2021 in 3103943 and 2025
   in 3797326); their styling stays the existing kit look. Each such window is
   registered below with registerConfirmCurrent and its code carries a
   CONFIRM-CURRENT comment; `?confirm=1` badges them.

   Reported (host.screen.*): `launchMode` (encounter-lite / my-encounters /
   select-launch-mode / select-service-group / closed), `mainLaunched`,
   `chart` (the launch window's chart number), `encounter` (its id),
   `noteStatus` (empty / draft / saved), `apptStatus`, `timeFrame`,
   `rows` (patients listed); `host.dialog` for each prompt.
   ========================================================================= */

type Stage = MoisLaunchStart | 'closed'

registerConfirmCurrent([
  { target: { anchor: 'host.mois.dialog.my-encounters' }, source: 'help-site art. 3103943 img 0b1ad375 (older build)', check: 'band caption placement, section depths, button row' },
  { target: { anchor: 'host.mois.dialog.encounter-lite' }, source: 'help-site art. 3797326 inline imgs 1, 4–7, 12, 14 (older build)', check: 'Chart Data and Encounter Detail layout, Make Private placement' },
  { target: { anchor: 'host.mois.dialog.select-service-group' }, source: 'help-site art. 3103943 img b59a0d20 (older build)', check: 'rows; Tracking Board is not built' },
  { target: { anchor: 'host.mois.dialog.my-encounter-care-complete' }, source: 'help-site art. 3103943 img 7722ca57 (older build)' },
  { target: { anchor: 'host.mois.dialog.confirm-chart-for-patient' }, source: 'help-site art. 3797326 inline img 8 (older build)', check: 'message wording' },
  { target: { anchor: 'host.mois.dialog.chart-advance-search-list' }, source: 'help-site art. 3797326 inline img 9 (older build)', check: 'columns' },
  { target: { anchor: 'host.mois.dialog.no-chart-found' }, source: 'help-site art. 3103943 img 46bd1494 / 3797326 inline img 11 (older build)' },
  { target: { anchor: 'host.mois.dialog.permission-denied' }, source: 'help-site art. 3797326 inline img 10 (older build)' },
  { target: { anchor: 'host.mois.dialog.quick-patient-registration-form' }, source: 'help-site art. 3797326 inline img 13 (older build)', check: 'required markers' },
  { target: { anchor: 'host.mois.dialog.note-template-list' }, source: 'art. 3797326 (text only) + heart icons 1c9e2d3c / 7d6fa152', check: 'whole window' },
  { target: { anchor: 'host.mois.dialog.make-note-private' }, source: 'art. 3797326 (text only)', check: 'whole window' },
])

const toLite = (p: Patient): LiteChart => ({
  chart: p.chart, first: p.first ?? '', middle: p.middle ?? '', last: p.last ?? '', dob: p.dob ?? '', gender: p.gender ?? '',
  insuranceBy: p.insuranceBy ?? 'BC', insurance: p.bchn ?? p.insurance ?? '', city: p.city ?? '', province: p.province ?? 'BC',
  postal: p.postal ?? '', preferred: p.preferredPhone ?? 'Home', home: p.home ?? '', work: p.work ?? '', cell: p.cell ?? '',
})

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "Sunday November 09, 2025" — 3797326 images 5 and 6 */
function longDate(date: string): string {
  const [y, m, d] = date.split('.').map(Number)
  const t = new Date(Date.UTC(y!, m! - 1, d!))
  return `${WEEKDAYS[t.getUTCDay()]} ${MONTHS[t.getUTCMonth()]} ${pad2(d!)}, ${y}`
}
/** the patient list's day heading: "Today", then the long date (image 5) */
const dayCaption = (date: string) => (date === MOIS_TODAY ? 'Today' : longDate(date))
const nowHM = () => stampNow().slice(-5)
const RULE = '-'.repeat(44)
const mixedCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
/* "77 yr old Female" (image 8); the wording for M / X / U and for a child's
   age (ageOf's MTH / WK / DAY captions) is INFERRED from that one line */
const GENDER_WORD: Record<string, string> = { F: 'Female', M: 'Male', X: 'X', U: 'Unknown' }
const ageLine = (c: LiteChart) => [ageOf(c.dob).toLowerCase(), GENDER_WORD[c.gender] ?? c.gender].filter(Boolean).join(' ')
/* image 9: PHN beside Insurance No., filled for the BC row only */
const phnOf = (c: LiteChart) => (c.insuranceBy === 'BC' ? c.insurance : '')
const norm = (s: string) => s.replace(/[\s.-]/g, '').toLowerCase()

/* ===========================================================================
   The host: which window is up, and the Main Program beside it
   ======================================================================== */
export function LaunchModeHost({ initial, mainShown, onLaunchMain }: {
  initial: MoisLaunchStart
  /** whether the MDI frame is showing */
  mainShown: boolean
  onLaunchMain: () => void
}) {
  const [stage, setStage] = useState<Stage>(initial)
  const [front, setFront] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  useScreenReport({ launchMode: stage, mainLaunched: mainShown })

  /* a click on the frame behind sends the launch window back */
  useEffect(() => {
    if (!mainShown) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      if (!t || !ref.current) return
      if (ref.current.contains(t)) { setFront(true); return }
      if (t.closest('.pb-modal-layer')) return
      if (t.closest('.pb-desktop')) setFront(false)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [mainShown])

  const launchMain = () => { onLaunchMain(); setFront(false) }

  if (stage === 'select-launch-mode') {
    return (
      <LaunchChooser
        id="select-launch-mode" title="Select Launch Mode" header={['Launch Mode']}
        rows={[{ cells: ['Main Program'], mode: 'main' }, { cells: ['Encounter Lite'], mode: 'encounter-lite' }]}
        buttons="ok-cancel"
        plain
        onPick={(mode) => { if (mode === 'main') { launchMain(); setStage('closed') } else setStage(mode) }}
        onCancel={() => setStage('closed')}
      />
    )
  }
  if (stage === 'select-service-group') {
    return (
      <LaunchChooser
        id="select-service-group" title="Select Service Group / Pathway" header={['Service Group / Pathway', 'Mode']}
        rows={[
          { cells: ['VP', 'Main Program'], mode: 'main' },
          { cells: ['VMOA', 'Tracking Board (VMOA)'], mode: 'main' },
          { cells: ['My Encounters', '(VP)'], mode: 'my-encounters' },
        ]}
        buttons="continue"
        /* b59a0d20 paints this chooser the way the current-build Select Launch
           Mode capture paints its sibling: white face, Windows-blue selected
           row, the button centred under the list. CONFIRM-CURRENT (rows). */
        plain
        onPick={(mode) => { if (mode === 'main') { launchMain(); setStage('closed') } else setStage(mode) }}
        onCancel={() => setStage('closed')}
      />
    )
  }
  if (stage === 'closed') {
    if (mainShown) return null
    return (
      <ModalLayer zIndex={5}>
        <div style={{ textAlign: 'center', color: '#fff', textShadow: '0 1px 2px #000' }} data-tutorial-id="host.mois.group.mois-closed">
          <div style={{ marginBottom: 8 }}>MOIS has been closed.</div>
          <Btn id="relaunch-mois" onClick={() => setStage(initial)}>Launch MOIS</Btn>
        </div>
      </ModalLayer>
    )
  }
  if (stage === 'main') return null
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: front || !mainShown ? 30 : 1, pointerEvents: 'none' }}>
      <LaunchWindow
        mode={stage}
        mainShown={mainShown}
        onLaunchMain={launchMain}
        onClose={() => setStage('closed')}
      />
    </div>
  )
}

/* The chooser in front of a launch mode. `Select Launch Mode` is also the
   list Security Profile Settings ▸ Launch Mode ▸ Add Launch Mode raises, and
   the 2026-10-02 TRAINING capture 12 shows it whole: 565 x 475 capture px
   (496 x 417) on a WHITE face, a bordered list 8px in (480 x 331) headed
   `Launch Mode` in the soft grey caption ink, 24px rows (27 capture px), the
   selected row in the Windows highlight #0078D8 with white text, and Ok /
   Cancel 75 x 21 centred under it. `plain` is that look, and the Service
   Group chooser (3103943 `b59a0d20…`, white with the same blue selection)
   takes it too. */
const PLAIN_CHOOSER_CSS = `
.pb-launch-pick .pb-dw { border: 1px solid #767676; }
.pb-launch-pick .pb-dw__table > tbody > tr.is-current { background: #0078d8; }
.pb-launch-pick .pb-dw__table > tbody > tr.is-current > td { color: #fff; }
`

export function LaunchChooser({ id, title, header, rows, buttons, onPick, onCancel, plain, zIndex = 40, initial }: {
  id: string; title: string; header: string[]
  rows: { cells: string[]; mode: MoisLaunchMode }[]
  buttons: 'ok-cancel' | 'continue'
  onPick: (mode: MoisLaunchMode, index: number) => void
  onCancel: () => void
  /** capture 12's white Select Launch Mode window */
  plain?: boolean
  zIndex?: number
  /** the row selected on open; the last one by default */
  initial?: number
}) {
  const [cur, setCur] = useState(initial ?? rows.length - 1)
  const pick = () => onPick(rows[cur]!.mode, cur)
  const w = plain ? 75 : 96
  return (
    <PickListWindow<Record<string, string>>
      frame={(content, footer) => (plain
        ? (
          <ModalWindow id={id} title={title} onClose={onCancel} portal="inline" report zIndex={zIndex}
            windowStyle={{ ...clampTo(24, 496, 417), background: '#fff' }}>
            <style>{UM_ACCESS_CSS}{PLAIN_CHOOSER_CSS}</style>
            <div className="pb-um-access pb-launch-pick" style={{ ...FACE, background: '#fff' }}>{content}</div>
            <div className="pb-row" style={{ justifyContent: 'center', gap: 8, padding: '12px 0 15px', flex: 'none', background: '#fff' }}>{footer}</div>
          </ModalWindow>
        )
        : (
          <DetailWindow id={id} title={title} width={520} height={420} zIndex={zIndex} onClose={onCancel} buttons={footer}>
            {content}
          </DetailWindow>
        ))}
      gridBox={plain ? { ...GRID_BOX, margin: '8px 9px 0' } : { ...GRID_BOX, padding: 8 }}
      grid={{
        rows: rows.map((r) => Object.fromEntries(r.cells.map((c, i) => [`c${i}`, c]))),
        current: cur,
        onCurrentChange: setCur,
        onActivate: (_, i) => onPick(rows[i]!.mode, i),
        gutter: false,
        ...(plain ? { rules: false, stretch: true, style: { ['--pb-dw-row-h' as string]: '24px', ['--pb-dw-pad-x' as string]: '7px' } } : null),
        rowTutorialId: (r) => `host.mois.row.launch-${pbSlug(Object.values(r).join(' '))}`,
        columns: header.map((h, i) => ({ key: `c${i}`, header: h, width: i === 0 ? 250 : 230, headAlign: 'left' as const })),
      }}
      footer={buttons === 'ok-cancel'
        ? <><Btn id="launch-mode-ok" isDefault width={w} onClick={pick}>Ok</Btn><Btn id="launch-mode-cancel" width={w} onClick={onCancel}>Cancel</Btn></>
        : <Btn id="service-group-continue" isDefault width={w} onClick={pick}>Continue</Btn>}
    />
  )
}

/* ===========================================================================
   The launch window
   ======================================================================== */
type Dialog =
  | { kind: 'need-parameter' } | { kind: 'confirm-chart'; chart: LiteChart } | { kind: 'multiple'; charts: LiteChart[] }
  | { kind: 'no-chart' } | { kind: 'permission-denied' } | { kind: 'quick-registration' } | { kind: 'care-complete' }
  | { kind: 'templates' } | { kind: 'make-private' } | { kind: 'future-date' } | { kind: 'saved' } | { kind: 'reason' }

/* A blue band. Its second caption is not right-aligned: 0b1ad375 prints
   "Most Recent Encounter:" about 38% of the way across the right pane,
   "Author:" at 73% and "Chart No.:" at 80%, and 3797326 images 7, 12 and 14
   agree. `at` is that fraction. CONFIRM-CURRENT: the placements are from those
   older images; the band colours are the existing ones, not the old images'. */
const Band = ({ title, right, at, anchor }: { title: string; right?: ReactNode; at?: number; anchor: string }) => (
  <div className="pb-row" data-tutorial-id={anchor} style={{ position: 'relative', background: '#a8cdf0', fontWeight: 700, padding: '3px 10px', flex: 'none', borderTop: '1px solid #8ab0d8' }}>
    <span style={{ flex: '1 1 auto' }}>{title}</span>
    {right && <span style={{ fontWeight: 400, color: '#7a8aa0', ...(at != null ? { position: 'absolute', left: `${at * 100}%`, whiteSpace: 'pre' } : null) }}>{right}</span>}
  </div>
)

function LaunchWindow({ mode, mainShown, onLaunchMain, onClose }: {
  mode: 'encounter-lite' | 'my-encounters'
  mainShown: boolean
  onLaunchMain: () => void
  onClose: () => void
}) {
  const lite = mode === 'encounter-lite'
  const perms: LitePermissions = ALL_PERMISSIONS
  const roster = usePatientRoster()
  const openWindow = useOpenWindow()
  const encTimes = isYes(useSystemSetting(BILLING_ENC_TIMES_ROW))
  const [encounters, setEncounters] = useSessionState<LiteEncounter[]>(LITE_ENCOUNTERS_KEY, LITE_ENCOUNTERS)
  const [created, setCreated] = useSessionState<LiteChart[]>(LITE_CHARTS_KEY, [])
  const charts = useMemo(() => [...roster.map(toLite), ...created], [roster, created])

  const [provider, setProvider] = useState(LITE_PROVIDERS[0]!)
  const [frame, setFrame] = useState<'today' | 'yesterday' | 'last' | 'since' | 'between'>('today')
  /* CONFIRM-CURRENT: 0b1ad375 and 26e902ef open with the In Last, Since and
     Between boxes empty; 3797326 image 4 shows them filled once chosen
     (7 Days, 2025.01.01, 2025.11.09 & 2025.11.19). An empty box counts as
     today (INFERRED). */
  const [lastN, setLastN] = useState('')
  const [lastUnit, setLastUnit] = useState<'' | 'Days' | 'Weeks'>('')
  const [since, setSince] = useState('')
  const [betweenA, setBetweenA] = useState('')
  const [betweenB, setBetweenB] = useState('')
  const [discharged, setDischarged] = useState(true)
  const [ins, setIns] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [chart, setChart] = useState<LiteChart | null>(null)
  const [chartDraft, setChartDraft] = useState<LiteChart | null>(null)
  const [enc, setEnc] = useState<LiteEncounter | null>(null)
  const [billing, setBilling] = useState(false)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [hover, setHover] = useState<{ e: LiteEncounter; x: number; y: number } | null>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const from = frame === 'today' ? MOIS_TODAY
    : frame === 'yesterday' ? dayOffset(-1)
      : frame === 'last' ? dayOffset(-(Number(lastN) || 0) * (lastUnit === 'Weeks' ? 7 : 1))
        : frame === 'since' ? since || MOIS_TODAY : betweenA || MOIS_TODAY
  const to = frame === 'between' ? betweenB || MOIS_TODAY : MOIS_TODAY
  /* 3797326 "Tip! Use CTRL+T for today's date" */
  const ctrlT = (fill: (v: string) => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === 't') { e.preventDefault(); fill(MOIS_TODAY) }
  }
  const listed = encounters
    .filter((e) => e.date >= from && e.date <= to && (discharged || e.status !== 'Discharged'))
    .sort((a, b) => (b.date.localeCompare(a.date)) || a.name.localeCompare(b.name))
  const saved = enc ? encounters.find((e) => e.id === enc.id) : undefined
  const dirty = !!enc && JSON.stringify(enc) !== JSON.stringify(saved)
  const recent = chart ? encounters.filter((e) => e.chart === chart.chart && e.id !== enc?.id).sort((a, b) => b.date.localeCompare(a.date))[0] : undefined

  useScreenReport({
    chart: chart?.chart ?? null,
    encounter: enc?.id ?? null,
    noteStatus: !enc ? null : !enc.note.trim() ? 'empty' : dirty ? 'draft' : 'saved',
    apptStatus: enc ? pbSlug(enc.status || 'none') : null,
    timeFrame: frame,
    rows: listed.length,
  })

  const openEncounter = (e: LiteEncounter) => {
    const c = charts.find((x) => x.chart === e.chart) ?? null
    setChart(c); setChartDraft(c); setEnc({ ...e }); setBilling(false)
  }
  const newEncounterFor = (c: LiteChart) => {
    const e: LiteEncounter = {
      id: `le-${Date.now()}`, chart: c.chart, name: `${c.last}, ${c.first}`.toUpperCase(), date: MOIS_TODAY,
      hh: nowHM().slice(0, 2), mm: nowHM().slice(3), visitCode: 'R', reason: '', status: 'Arrived', slots: '3', mode: 'DE',
      location: '', start: '', finish: '', generalNote: '', note: '', author: '', healthIssues: ['', '', '', ''], services: ['', '', '', ''],
    }
    setEncounters((all) => [...all, e])
    setChart(c); setChartDraft(c); setEnc(e); setBilling(false)
  }
  const find = () => {
    if (!ins.trim() && !lastName.trim() && !dob.trim()) { setDialog({ kind: 'need-parameter' }); return }
    const hits = charts.filter((c) =>
      (!ins.trim() || norm(c.insurance).includes(norm(ins)))
      && (!lastName.trim() || c.last.toLowerCase().startsWith(lastName.trim().toLowerCase()))
      && (!dob.trim() || norm(c.dob) === norm(dob)))
    if (hits.length === 1) setDialog({ kind: 'confirm-chart', chart: hits[0]! })
    else if (hits.length > 1) setDialog({ kind: 'multiple', charts: hits })
    else setDialog({ kind: perms.createChart ? 'no-chart' : 'permission-denied' })
  }
  const choose = (c: LiteChart, createEncounter: boolean) => {
    setDialog(null)
    if (createEncounter && perms.createEncounter) newEncounterFor(c)
    else { setChart(c); setChartDraft(c); setEnc(null) }
  }
  const createChart = (c: Omit<LiteChart, 'chart'>) => {
    const next: LiteChart = { ...c, chart: String(90001 + created.length) }
    setCreated((all) => [...all, next])
    setDialog(null)
    newEncounterFor(next)
  }
  const stampTimes = (e: LiteEncounter): LiteEncounter => ({
    ...e,
    start: encTimes && (e.status === 'Seen' || e.status === 'Discharged') && !e.start ? nowHM() : e.start,
    finish: encTimes && e.status === 'Discharged' && !e.finish ? nowHM() : e.finish,
  })
  const save = (override?: LiteEncounter) => {
    const e = override ?? enc
    if (e && e.date > MOIS_TODAY) { setDialog({ kind: 'future-date' }); return false }
    if (chartDraft && chart && JSON.stringify(chartDraft) !== JSON.stringify(chart)) {
      setCreated((all) => (all.some((c) => c.chart === chartDraft.chart) ? all.map((c) => (c.chart === chartDraft.chart ? chartDraft : c)) : all))
      setChart(chartDraft)
    }
    if (e) {
      const next = stampTimes({ ...e, author: e.note.trim() ? (e.author || provider) : e.author })
      setEncounters((all) => all.map((x) => (x.id === next.id ? next : x)))
      setEnc(next)
    }
    return true
  }
  const reset = () => { setChart(null); setChartDraft(null); setEnc(null); setIns(''); setLastName(''); setDob(''); setBilling(false) }
  const set = (patch: Partial<LiteEncounter>) => setEnc((e) => (e ? { ...e, ...patch } : e))
  const insertTemplate = (text: string) => {
    if (!enc) return
    const el = noteRef.current
    const at = el ? el.selectionStart : enc.note.length
    set({ note: enc.note.slice(0, at) + text + enc.note.slice(at) })
    setDialog(null)
  }

  /* --- the patient list, grouped by day ------------------------------------------- */
  const groups: { day: string; items: LiteEncounter[] }[] = []
  for (const e of listed) {
    const last = groups[groups.length - 1]
    if (last && last.day === e.date) last.items.push(e)
    else groups.push({ day: e.date, items: [e] })
  }

  const radio = (value: typeof frame, label: string, extra?: ReactNode) => (
    <div className="pb-row" style={{ gap: 4, minHeight: 22 }}>
      <span style={{ width: 118 }}><PBRadio name={`${mode}-frame`} label={label} checked={frame === value} onChange={() => setFrame(value)} tutorialId={`host.mois.field.time-frame-${value}`} /></span>
      {extra}
    </div>
  )
  const cd = chartDraft
  const setCd = (patch: Partial<LiteChart>) => setChartDraft((c) => (c ? { ...c, ...patch } : c))
  /* Chart Data — 3797326 image 12 (a new chart, Quick Registration off),
     placed the way that image paints it: labels over boxes, three rows 44px
     apart, and two blocks — the name, birth date and gender on the left; the
     insurance, address and phones from about 60% across. Lefts and widths are
     the image's, scaled from its 0.66 to CSS px.
     CONFIRM-CURRENT: the whole band layout is from that older image. */
  const chartLocked = !cd || (!!chart && !perms.updateChart)
  const cdField = (label: ReactNode, key: keyof LiteChart, left: number, row: number, w: number, kind: 'edit' | 'select' | 'lookup' = 'edit', options: string[] = []) => {
    const anchor = `host.mois.field.chart-data-${pbSlug(String(key))}`
    const value = cd ? String(cd[key] ?? '') : ''
    const put = (v: string) => setCd({ [key]: v } as Partial<LiteChart>)
    return (
      <div key={key} style={{ position: 'absolute', left, top: 4 + row * 44, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ whiteSpace: 'pre' }}>{label}</span>
        {kind === 'select'
          ? <PBSelect w={w} options={[...new Set(['', ...options, value])]} value={value} disabled={chartLocked} onChange={(e) => put(e.target.value)} data-tutorial-id={anchor} />
          : kind === 'lookup'
            ? <PBLookup w={w} value={value} readOnly={chartLocked} name={`chart-data-${pbSlug(String(key))}`} fieldId={anchor} onChange={put} />
            : <PBInput w={w} value={value} readOnly={chartLocked} onChange={(e) => put(e.target.value)} data-tutorial-id={anchor} />}
      </div>
    )
  }
  const req = (label: string) => <>{label} <b style={{ color: '#000' }}>*</b></>
  /* image 12 underlines the preferred number's caption, in bold */
  const phoneLabel = (label: 'Home' | 'Work' | 'Cell') => (cd?.preferred === label ? <b style={{ textDecoration: 'underline' }}>{label}</b> : label)

  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(1074px, calc(100% - 24px))', height: 'min(787px, calc(100% - 24px))', pointerEvents: 'auto', display: 'flex' }}>
      <PBWindow
        tutorialId={`host.mois.dialog.${mode}`}
        title={lite ? 'MOIS: MOIS DEV - Encounter Lite' : 'My Encounters'}
        onClose={() => (mainShown ? onClose() : onClose())}
        style={{ width: '100%', height: '100%' }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff', border: '1px solid #8a8a8a', margin: 4 }}>
          {/* --- left: Search Options and the patients ----------------------- */}
          <div style={{ width: 215, flex: 'none', display: 'flex', flexDirection: 'column', borderRight: '1px solid #8a8a8a' }}>
            <Band title="Search Options" anchor="host.mois.group.search-options" />
            <div style={{ background: 'var(--pb-face)', padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 6, flex: 'none' }}>
              {lite && (
                <fieldset className="pb-fieldset" data-tutorial-id="host.mois.group.launch-provider">
                  <legend className="pb-fieldset__legend">Provider</legend>
                  <PBSelect w="100%" options={LITE_PROVIDERS} value={provider} onChange={(e) => setProvider(e.target.value)} data-tutorial-id="host.mois.field.launch-provider" />
                </fieldset>
              )}
              <fieldset className="pb-fieldset" data-tutorial-id="host.mois.group.time-frame">
                <legend className="pb-fieldset__legend">Time Frame</legend>
                {radio('today', 'Today')}
                {radio('yesterday', 'Today and Yesterday')}
                {radio('last', 'In Last', <>
                  <PBInput w={28} value={lastN} onChange={(e) => { setLastN(e.target.value); setFrame('last') }} data-tutorial-id="host.mois.field.in-last-count" />
                  <PBSelect w={60} options={['Days', 'Weeks']} value={lastUnit} onChange={(e) => { setLastUnit(e.target.value as 'Days' | 'Weeks'); setFrame('last') }} data-tutorial-id="host.mois.field.in-last-unit" />
                </>)}
                {radio('since', 'Since', <PBInput w={76} value={since} onChange={(e) => { setSince(e.target.value); setFrame('since') }} onKeyDown={ctrlT((v) => { setSince(v); setFrame('since') })} data-tutorial-id="host.mois.field.since-date" />)}
                {radio('between', 'Between', <PBInput w={76} value={betweenA} onChange={(e) => { setBetweenA(e.target.value); setFrame('between') }} onKeyDown={ctrlT((v) => { setBetweenA(v); setFrame('between') })} data-tutorial-id="host.mois.field.between-from" />)}
                <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 4 }}>&amp; <PBInput w={76} value={betweenB} onChange={(e) => { setBetweenB(e.target.value); setFrame('between') }} onKeyDown={ctrlT((v) => { setBetweenB(v); setFrame('between') })} data-tutorial-id="host.mois.field.between-to" /></div>
              </fieldset>
              <fieldset className="pb-fieldset">
                <legend className="pb-fieldset__legend">Include</legend>
                <PBCheckbox label="Discharged" checked={discharged} onChange={setDischarged} tutorialId="host.mois.field.include-discharged" />
              </fieldset>
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', position: 'relative' }} data-tutorial-id="host.mois.group.launch-patients">
              {groups.map((g) => (
                <div key={g.day}>
                  <div style={{ background: '#c8dcf5', padding: '2px 4px' }}>{dayCaption(g.day)}</div>
                  {g.items.map((e) => (
                    <div key={e.id}
                      data-tutorial-id={`host.mois.row.launch-encounter-${e.chart}-${pbSlug(e.date)}`}
                      onDoubleClick={() => openEncounter(e)}
                      onMouseEnter={(ev) => setHover({ e, x: ev.clientX, y: ev.clientY })}
                      onMouseLeave={() => setHover(null)}
                      className="pb-row"
                      style={{ padding: '3px 4px', borderBottom: '1px solid #e0e0e0', background: enc?.id === e.id ? '#3875d7' : undefined, color: enc?.id === e.id ? '#fff' : undefined, cursor: 'default' }}>
                      <span style={{ flex: '1 1 auto' }}>{e.name}</span>
                      {e.status === 'Discharged' && <span style={{ color: enc?.id === e.id ? '#fff' : '#888', paddingRight: 30 }}>D</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* --- right: Search for Chart, Chart Data, Encounter Detail, Encounter Note --- */}
          <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Band title="Search for Chart" anchor="host.mois.group.search-for-chart" />
            <div className="pb-row" style={{ gap: 6, padding: '4px 10px', alignItems: 'flex-end', flex: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}><span>Insurance No.:</span><PBInput w={115} value={ins} onChange={(e) => setIns(e.target.value)} data-tutorial-id="host.mois.field.search-insurance" /></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}><span>Last Name:</span><PBInput w={135} value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') find() }} data-tutorial-id="host.mois.field.search-last-name" /></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}><span>Birth Date:</span><PBInput w={90} value={dob} onChange={(e) => setDob(e.target.value)} data-tutorial-id="host.mois.field.search-birth-date" /></div>
              <span className="pb-row__spacer" />
              <Btn id="launch-find" width={80} onClick={find}>Find...</Btn>
            </div>
            <div style={{ padding: '0 10px 4px', color: '#666', flex: 'none' }}>(at least one optional parameter is required )</div>

            <Band title="Chart Data" right={<>Chart No.: <b>{chart?.chart ?? ''}</b></>} at={0.8} anchor="host.mois.group.chart-data" />
            {/* 0b1ad375 leaves the empty band 79px deep; image 12 grows it to 137 for the three rows */}
            <div style={{ height: cd ? 137 : 79, flex: 'none', position: 'relative' }}>
              {cd && (<>
                {cdField(req('First Name'), 'first', 12, 0, 108)}{cdField('Middle Name', 'middle', 143, 0, 120)}{cdField(req('Last Name'), 'last', 273, 0, 165)}
                {/* INFERRED: the Insurance by and Gender lists' entries (image 12 shows them closed) */}
                {cdField(req('Insurance by'), 'insuranceBy', 510, 0, 118, 'select', ['BC', 'AB', 'IN', 'PP', 'WC'])}{cdField(req('Insurance No.'), 'insurance', 635, 0, 102)}
                {cdField(req('Birth Date'), 'dob', 12, 1, 81)}{cdField(req('Gender'), 'gender', 143, 1, 83, 'select', ['M', 'F', 'X', 'U'])}
                {cdField(req('City'), 'city', 510, 1, 118, 'lookup')}{cdField(req('Province'), 'province', 635, 1, 102)}{cdField(req('Postal Code'), 'postal', 743, 1, 98)}
                <div style={{ position: 'absolute', left: 441, top: 4 + 2 * 44, width: 63, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <span style={{ whiteSpace: 'pre' }}><b style={{ color: '#000' }}>*</b> Preferred</span>
                  <PBSelect w={63} options={['Home', 'Work', 'Cell']} value={cd.preferred || 'Home'} disabled={chartLocked} onChange={(e) => setCd({ preferred: e.target.value })} data-tutorial-id="host.mois.field.chart-data-preferred" />
                </div>
                {cdField(phoneLabel('Home'), 'home', 510, 2, 99)}{cdField(phoneLabel('Work'), 'work', 635, 2, 95)}{cdField(phoneLabel('Cell'), 'cell', 743, 2, 95)}
              </>)}
            </div>

            <Band title="Encounter Detail" anchor="host.mois.group.encounter-detail" at={0.38}
              right={<>Most Recent Encounter:{recent ? `    ${recent.date}    ${recent.hh}:${recent.mm}    ${recent.reason}` : '              :'}</>} />
            {/* 0b1ad375 leaves the empty band 94px deep; image 14 is 116 with the two rows and Billing Data... */}
            <div style={{ height: enc ? 116 : 94, flex: 'none', padding: '4px 10px 4px 12px' }}>
              {enc && !billing && (
                /* 3797326 image 14, placed as it paints: row one Scheduled Date / Time,
                   Visit Code, Reason "…", Start Time: (seen) + Start; row two Appt
                   Status, Slots, Visit Mode, Service Location, Finished Time:
                   (discharge) + Finish; General Note to the right of both, Billing
                   Data... under it. Visit Code is a plain edit (no arrow, unlike
                   Visit Mode) and the time one hh:mm box.
                   CONFIRM-CURRENT: the whole layout is from that older image. */
                <div style={{ display: 'grid', gridTemplateColumns: '96px 35px 79px 228px 188px 1fr', gridTemplateRows: 'auto auto auto', columnGap: 0, rowGap: 4, alignItems: 'end' }}>
                  <div style={{ gridColumn: '1 / span 2' }}><div>Scheduled Date / Time</div><span className="pb-row" style={{ gap: 3 }}>
                    <PBInput w={75} value={enc.date} onChange={(e) => set({ date: e.target.value })} onKeyDown={ctrlT((v) => set({ date: v }))} data-tutorial-id="host.mois.field.encounter-date" />
                    <PBInput w={45} align="center" value={`${enc.hh}:${enc.mm}`} data-tutorial-id="host.mois.field.encounter-time"
                      onChange={(e) => { const [h = '', m = ''] = e.target.value.split(':'); set({ hh: h.trim().slice(0, 2), mm: m.trim().slice(0, 2) }) }} /></span></div>
                  <div><div>Visit Code</div><PBInput w={70} value={enc.visitCode} onChange={(e) => set({ visitCode: e.target.value.toUpperCase() })} data-tutorial-id="host.mois.field.encounter-visit-code" /></div>
                  <div><div>Reason</div>
                    <PBLookup w={215} value={enc.reason} name="encounter-reason" fieldId="host.mois.field.encounter-reason" onChange={(v) => set({ reason: v })} onDots={() => setDialog({ kind: 'reason' })} /></div>
                  <div><div className="pb-row" style={{ gap: 0 }}><span style={{ width: 75 }}>Start Time:</span><span>(seen)</span></div>
                    <span className="pb-row" style={{ gap: 3 }}><PBInput w={75} align="center" value={enc.start} placeholder=":" onChange={(e) => set({ start: e.target.value })} data-tutorial-id="host.mois.field.encounter-start" />
                      <Btn id="encounter-start" width={52} onClick={() => set({ start: nowHM() })}>Start</Btn></span></div>
                  <div style={{ gridColumn: 6, gridRow: '1 / span 2', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}><div>General Note</div>
                    <PBTextArea value={enc.generalNote} onChange={(e) => set({ generalNote: e.target.value })} style={{ width: '100%', flex: '1 1 auto', resize: 'none' }} data-tutorial-id="host.mois.field.encounter-general-note" /></div>
                  <div><div>Appt Status</div>
                    <PBSelect w={90} options={APPT_STATUSES.map((s) => ({ value: s, label: s }))} value={enc.status} onChange={(e) => set({ status: e.target.value as LiteEncounter['status'] })} data-tutorial-id="host.mois.field.encounter-appt-status" /></div>
                  <div><div>Slots</div><PBInput w={30} align="center" value={enc.slots} onChange={(e) => set({ slots: e.target.value })} data-tutorial-id="host.mois.field.encounter-slots" /></div>
                  <div><div>Visit Mode</div><PBSelect w={52} options={['DE', 'TL', 'TM']} value={enc.mode} onChange={(e) => set({ mode: e.target.value as LiteEncounter['mode'] })} data-tutorial-id="host.mois.field.encounter-visit-mode" /></div>
                  <div><div>Service Location</div>
                    <PBSelect w={200} options={SERVICE_LOCATIONS} value={enc.location} onChange={(e) => set({ location: e.target.value })} data-tutorial-id="host.mois.field.encounter-location" /></div>
                  <div><div>Finished Time: (discharge)</div>
                    <span className="pb-row" style={{ gap: 3 }}><PBInput w={75} align="center" value={enc.finish} placeholder=":" onChange={(e) => set({ finish: e.target.value })} data-tutorial-id="host.mois.field.encounter-finish" />
                      <Btn id="encounter-finish" width={52} onClick={() => set({ finish: nowHM() })}>Finish</Btn></span></div>
                  <div style={{ gridColumn: 6, gridRow: 3, justifySelf: 'end', paddingRight: 4 }}><Btn id="billing-data" width={95} onClick={() => setBilling(true)}>Billing Data...</Btn></div>
                </div>
              )}
              {enc && billing && (
                /* INFERRED — see the header */
                <div data-tutorial-id="host.mois.group.billing-data" style={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 130px) 1fr', gap: '3px 6px', alignItems: 'center' }}>
                  <span>Health Issue:</span>
                  {enc.healthIssues.map((h, i) => <PBLookup key={i} w={126} value={h} name={`billing-health-issue-${i + 1}`} fieldId={`host.mois.field.billing-health-issue-${i + 1}`} onChange={(v) => set({ healthIssues: enc.healthIssues.map((x, j) => (j === i ? v : x)) })} />)}
                  <span />
                  <span>Service:</span>
                  {enc.services.map((s, i) => <PBLookup key={i} w={126} value={s} name={`billing-service-${i + 1}`} fieldId={`host.mois.field.billing-service-${i + 1}`} onChange={(v) => set({ services: enc.services.map((x, j) => (j === i ? v : x)) })} />)}
                  <span />
                  <span>Start / Finish:</span>
                  <PBInput w={60} value={enc.start} onChange={(e) => set({ start: e.target.value })} />
                  <PBInput w={60} value={enc.finish} onChange={(e) => set({ finish: e.target.value })} />
                  <span style={{ gridColumn: 'span 2', color: '#666' }}>Default Fee Code: {DEFAULT_FEE_CODE}</span>
                  <Btn id="billing-back" width={70} onClick={() => setBilling(false)}>Back</Btn>
                </div>
              )}
            </div>

            <Band title="Encounter Note" right={<>Author:&nbsp;&nbsp; {enc?.author || (enc?.note.trim() ? provider : '')}</>} at={0.73} anchor="host.mois.group.encounter-note" />
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 2 }}>
              <textarea
                ref={noteRef}
                className="pb-field"
                disabled={!enc}
                value={enc?.note ?? ''}
                onChange={(e) => set({ note: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); setDialog({ kind: 'templates' }) } }}
                data-tutorial-id="host.mois.field.encounter-note"
                style={{ flex: '1 1 auto', resize: 'none', border: 0 }}
              />
            </div>
          </div>
        </div>

        {/* 0b1ad375: Launch Main Program under the patient list; Send Task starts
            where the right pane does (x 224 of 1074), the rest at the right. */}
        <div className="pb-row" style={{ gap: 8, padding: '6px 10px 8px', flex: 'none' }}>
          <span style={{ width: 212, flex: 'none' }}>
            <Btn id="launch-main-program" width={140} disabled={!perms.launchMain || mainShown} onClick={onLaunchMain}>Launch Main Program</Btn>
          </span>
          <Btn id="launch-send-task" width={80} disabled={!chart || !perms.sendTask}
            onClick={() => { if (chart) openWindow('create-task', { chart: chart.chart, patient: `${chart.last}, ${chart.first}`.toUpperCase(), linkedTo: enc ? 'Encounter' : '', recordId: enc ? `Encounter - ${enc.date}` : '' }) }}>Send Task</Btn>
          {/* INFERRED: where Make Private sits (no image shows Encounter Lite's button row whole) */}
          {lite && <Btn id="launch-make-private" width={90} disabled={!enc || !saved?.note.trim() || !perms.makePrivate} onClick={() => setDialog({ kind: 'make-private' })}>{enc?.private ? 'View Access' : 'Make Private'}</Btn>}
          <span className="pb-row__spacer" />
          <Btn id="launch-new-encounter" width={100} disabled={!perms.createEncounter || (!chart && !enc)} onClick={() => { if (dirty) save(); reset() }}>New Encounter</Btn>
          <Btn id="launch-save" width={80}
            disabled={!dirty && !(chartDraft && (!chart || JSON.stringify(chartDraft) !== JSON.stringify(chart)))}
            onClick={() => {
              /* a new chart typed into the Chart Data band (inline image 12) */
              if (chartDraft && !chart) {
                const { chart: _n, ...rest } = chartDraft
                void _n
                if (rest.first && rest.last && rest.dob && rest.gender && rest.insurance) createChart(rest)
                else setDialog({ kind: 'saved' })
                return
              }
              save()
            }}>Save</Btn>
          {!lite && <Btn id="launch-care-complete" width={96} disabled={!enc} onClick={() => setDialog({ kind: 'care-complete' })}>Care Complete</Btn>}
          <Btn id="launch-close" width={80} onClick={onClose}>Close</Btn>
        </div>
      </PBWindow>

      {/* 3797326 image 6: an "Information" balloon, the five captions in one
          column and their values aligned in a second; the date written out in
          full even for a visit listed under Today ("Wednesday November 19,
          2025"). CONFIRM-CURRENT (registered with the window). */}
      {hover && (
        <div style={{ position: 'fixed', left: hover.x + 12, top: hover.y + 12, zIndex: 60, background: '#fff', border: '1px solid #767676', boxShadow: '2px 2px 4px rgba(0,0,0,.25)', padding: '4px 8px', pointerEvents: 'none', minWidth: 220 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>ⓘ Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, paddingLeft: 16 }}>
            <span>Patient:</span><span>{hover.e.name}</span>
            <span>Date:</span><span>{longDate(hover.e.date)}</span>
            <span>Time:</span><span>{hover.e.hh}:{hover.e.mm}</span>
            <span>Reason:</span><span>{hover.e.reason}</span>
            <span>Status:</span><span>{hover.e.status}</span>
          </div>
        </div>
      )}

      {dialog?.kind === 'need-parameter' && (
        <TopMessage id="launch-need-parameter" title={lite ? 'Encounter Lite' : 'My Encounters'} icon="warn" buttons={['OK']} prefix="need-parameter-" onClose={() => setDialog(null)}>
          Enter at least one of Insurance No., Last Name or Birth Date, then click Find.
        </TopMessage>
      )}
      {dialog?.kind === 'confirm-chart' && (
        /* 3797326 image 8: the title names the patient in mixed case ("Sally
           Cardio"); the body in capitals, then "77 yr old Female", the city and
           province, and the PHN, between dashed rules. CONFIRM-CURRENT. */
        <TopMessage id="confirm-chart-for-patient" title={`Confirm Chart for Patient: ${mixedCase(`${dialog.chart.first} ${dialog.chart.last}`)}`} icon="question" buttons={['Yes', 'No', 'Cancel']} prefix="confirm-chart-"
          onClose={(b) => (b === 'Yes' ? choose(dialog.chart, true) : b === 'No' ? choose(dialog.chart, false) : setDialog(null))}>
          {`The following chart has been found:\n${RULE}\n${`${dialog.chart.first} ${dialog.chart.last}`.toUpperCase()}\n${ageLine(dialog.chart)}\n${[mixedCase(dialog.chart.city), dialog.chart.province].filter(Boolean).join(' ')}\nPHN: ${phnOf(dialog.chart)}\n${RULE}\nWould you like to create a new encounter for this patient?`}
        </TopMessage>
      )}
      {dialog?.kind === 'multiple' && (
        <ChartAdvanceSearchList charts={dialog.charts} onClose={() => setDialog(null)} onPick={(c) => choose(c, true)} />
      )}
      {/* CONFIRM-CURRENT: No Chart Found and Permission Denied — 3103943 `46bd1494…`,
          3797326 images 10 and 11 (older build) */}
      {dialog?.kind === 'no-chart' && (
        <TopMessage id="no-chart-found" title="No Chart Found" icon="question" buttons={['Yes', 'No', 'Cancel']} prefix="no-chart-"
          onClose={(b) => {
            if (b !== 'Yes') { setDialog(null); return }
            if (perms.quickRegistration) { setDialog({ kind: 'quick-registration' }); return }
            /* not quick registration: the Chart Data band opens blank to fill (inline image 12) */
            setDialog(null)
            const blank: LiteChart = { chart: '', first: '', middle: '', last: lastName.toUpperCase(), dob, gender: '', insuranceBy: 'BC', insurance: ins, city: '', province: 'BC', postal: '', preferred: 'Home', home: '', work: '', cell: '' }
            setChart(null); setChartDraft(blank); setEnc(null)
          }}>
          {'There is no existing chart record.\n\nWould you like to create a new chart?'}
        </TopMessage>
      )}
      {dialog?.kind === 'permission-denied' && (
        <TopMessage id="permission-denied" title="Permission Denied" icon="error" buttons={['OK']} prefix="permission-denied-" onClose={() => setDialog(null)}>
          You do not have access to create a new chart.
        </TopMessage>
      )}
      {dialog?.kind === 'quick-registration' && (
        <QuickPatientRegistration initialLast={lastName.toUpperCase()} onClose={() => setDialog(null)} onRegister={createChart} />
      )}
      {dialog?.kind === 'care-complete' && enc && (
        <CareComplete enc={enc} onClose={() => setDialog(null)}
          onContinue={(patch) => {
            const next = { ...enc, ...patch, status: 'Discharged' as const, finish: enc.finish || nowHM() }
            setEnc(next)
            if (save(next)) setDialog(null)
          }} />
      )}
      {dialog?.kind === 'templates' && <TemplateList onClose={() => setDialog(null)} onSelect={insertTemplate} />}
      {dialog?.kind === 'reason' && enc && (
        <ReasonPicker onClose={() => setDialog(null)} onPick={(r) => { set({ reason: r }); setDialog(null) }} />
      )}
      {dialog?.kind === 'make-private' && enc && (
        <MakePrivate current={enc.private} onClose={() => setDialog(null)}
          onContinue={(p) => { const next = { ...enc, private: p }; setEnc(next); setEncounters((all) => all.map((x) => (x.id === next.id ? next : x))); setDialog(null) }} />
      )}
      {dialog?.kind === 'future-date' && (
        <TopMessage id="encounter-future-date" title={lite ? 'Encounter Lite' : 'My Encounters'} icon="warn" buttons={['OK']} prefix="future-date-" onClose={() => setDialog(null)}>
          The encounter date cannot be in the future. Please update the date before saving.
        </TopMessage>
      )}
      {dialog?.kind === 'saved' && (
        <TopMessage id="new-chart-incomplete" title={lite ? 'Encounter Lite' : 'My Encounters'} icon="warn" buttons={['OK']} prefix="chart-incomplete-" onClose={() => setDialog(null)}>
          Complete the required (*) chart fields before saving.
        </TopMessage>
      )}
    </div>
  )
}

function ChartAdvanceSearchList({ charts, onPick, onClose }: { charts: LiteChart[]; onPick: (c: LiteChart) => void; onClose: () => void }) {
  const [cur, setCur] = useState(0)
  return (
    <PickListWindow<LiteChart>
      frame={(content, footer) => (
        <DetailWindow id="chart-advance-search-list" title="Chart Advance Search List" width={900} height={320} zIndex={45} onClose={onClose} buttons={footer}>
          {content}
        </DetailWindow>
      )}
      band={<LookupBand variant="lite">Search Results</LookupBand>}
      grid={{
        rows: charts, current: cur, onCurrentChange: setCur, onActivate: (c) => onPick(c),
        rowTutorialId: (c) => `host.mois.row.search-result-${c.chart}`,
        columns: [
          { key: 'chart', header: 'Chart', width: 60 }, { key: 'first', header: 'First Name', width: 100 }, { key: 'middle', header: 'Middle Name', width: 100 },
          { key: 'last', header: 'Last Name', width: 110 }, { key: 'dob', header: 'DoB', width: 80 }, { key: 'gender', header: 'Gender', width: 50, align: 'center' },
          { key: 'insuranceBy', header: 'Inc.', width: 36 }, { key: 'insurance', header: 'Insurance No.', width: 100 },
          /* CONFIRM-CURRENT: image 9 has PHN between Insurance No. and Home # */
          { key: 'phn', header: 'PHN', width: 100, render: (c) => phnOf(c) }, { key: 'home', header: 'Home #', width: 110 },
        ],
      }}
      footer={<><Btn id="advance-search-ok" isDefault width={80} onClick={() => onPick(charts[cur]!)}>OK</Btn><Btn id="advance-search-cancel" width={80} onClick={onClose}>Cancel</Btn></>}
    />
  )
}

/* Quick Patient Registration Form — 3797326 image 13: four groups, Patient
   Identification (Chart No. greyed, Name (F/M/L), Alias (F/L), Birth Date and
   Gender, Insurance by, Insurance No. and Dependant No. 00, Status Code A and
   Status Date, BC Health No.), Contact Information (two Address lines, City
   "…" and Province BC, Postal Code and Country Canada, Home / Work / Cell
   with Leave Message, Ext., Pager, Preferred Phone and Fax, two eMails),
   Office Information (Facility, Location, Service, Service Provider) and
   Connections (Referring, Primary Care "…"), then Register (F2) / Cancel —
   the same window the Scheduler's Quick Registration opens (art. 303855).
   The image's yellow notes ("Click to search", "Add at least one") and red
   marks are the article's annotations, not the window; its bold asterisks
   are kept as the required markers (the one floating between the two eMail
   rows is left out: which row it marks is unclear).
   CONFIRM-CURRENT: the whole layout is from that older image. */
const QR_GRID: CSSProperties = { display: 'grid', gridTemplateColumns: '100px 120px 96px minmax(0, 1fr)', columnGap: 6, rowGap: 3, alignItems: 'center', padding: '2px 4px' }
const QrGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <CaptionGroup frame="fieldset" title={title} style={{ margin: '0 0 6px' }} bodyStyle={QR_GRID}>{children}</CaptionGroup>
)
const QrLabel = ({ children, req, right }: { children: ReactNode; req?: boolean; right?: boolean }) => (
  <span style={{ whiteSpace: 'nowrap', textAlign: right ? 'right' : undefined }}>{children}{req && <b style={{ color: '#000' }}> *</b>}</span>
)

function QuickPatientRegistration({ initialLast, onClose, onRegister }: { initialLast: string; onClose: () => void; onRegister: (c: Omit<LiteChart, 'chart'>) => void }) {
  const [c, setC] = useState<Omit<LiteChart, 'chart'>>({ first: '', middle: '', last: initialLast, dob: '', gender: '', insuranceBy: 'BC', insurance: '', city: '', province: 'BC', postal: '', preferred: '', home: '', work: '', cell: '' })
  /* the form's other fields: shown and editable, not carried into the chart the launch window keeps */
  const [x, setX] = useState<Record<string, string>>({ dependant: '00', status: 'A', country: 'Canada' })
  const [leave, setLeave] = useState({ home: false, work: false })
  const f = (key: keyof typeof c, w: number | string) => <PBInput w={w} value={c[key]} onChange={(e) => setC({ ...c, [key]: e.target.value })} data-tutorial-id={`host.mois.field.quick-reg-${pbSlug(key)}`} />
  const sel = (key: keyof typeof c, w: number, options: string[]) => <PBSelect w={w} options={options} value={c[key]} onChange={(e) => setC({ ...c, [key]: e.target.value })} data-tutorial-id={`host.mois.field.quick-reg-${pbSlug(key)}`} />
  const o = (key: string, w: number | string, ro = false) => <PBInput w={w} value={x[key] ?? ''} readOnly={ro} style={ro ? { background: 'var(--pb-field-ro)' } : undefined} onChange={(e) => setX({ ...x, [key]: e.target.value })} data-tutorial-id={`host.mois.field.quick-reg-${key}`} />
  const oSel = (key: string, w: number | string, options: string[]) => <PBSelect w={w} options={options} value={x[key] ?? ''} onChange={(e) => setX({ ...x, [key]: e.target.value })} data-tutorial-id={`host.mois.field.quick-reg-${key}`} />
  const span3: CSSProperties = { gridColumn: '2 / span 3' }
  const ok = c.first && c.last && c.dob && c.gender && c.insurance && c.city && c.postal && (c.home || c.work || c.cell)
  return (
    <DetailWindow id="quick-patient-registration-form" title="Quick Patient Registration Form" width={490} zIndex={45} onClose={onClose}
      buttons={<><Btn id="quick-reg-register" isDefault width={90} disabled={!ok} onClick={() => onRegister(c)}>Register (F2)</Btn><Btn id="quick-reg-cancel" width={76} onClick={onClose}>Cancel</Btn></>}>
      <div style={{ padding: '6px 10px 0' }}
        onKeyDown={(e) => { if (e.key === 'F2' && ok) { e.preventDefault(); onRegister(c) } }}>
        <QrGroup title="Patient Identification">
          <QrLabel>Chart No.:</QrLabel><span style={span3}>{o('chart-no', 94, true)}</span>
          <QrLabel req>Name (F/M/L):</QrLabel>{f('first', 120)}{f('middle', '100%')}{f('last', '100%')}
          <QrLabel>Alias (F/L):</QrLabel>{o('alias-first', 120)}<span />{o('alias-last', '100%')}
          <QrLabel req>Birth Date:</QrLabel>{f('dob', 120)}<QrLabel req right>Gender:</QrLabel>{sel('gender', 90, ['', 'M', 'F', 'X', 'U'])}
          <QrLabel req>Insurance by:</QrLabel><span style={span3}>{sel('insuranceBy', 62, ['', 'BC', 'IN', 'PP', 'WC'])}</span>
          <QrLabel req>Insurance No.:</QrLabel>{f('insurance', 120)}<QrLabel right>Dependant No.:</QrLabel>{o('dependant', 44)}
          <QrLabel req>Status Code:</QrLabel>{oSel('status', 70, ['', 'A', 'I', 'D', 'M', 'LU'])}<QrLabel right>Status Date:</QrLabel>{o('status-date', '100%')}
          <QrLabel>BC Health No.:</QrLabel><span style={span3}>{o('bc-health-no', 120)}</span>
        </QrGroup>
        <QrGroup title="Contact Information">
          <QrLabel req>Address:</QrLabel><span style={span3}>{o('address-1', '100%')}</span>
          <QrLabel>Address:</QrLabel><span style={span3}>{o('address-2', '100%')}</span>
          <QrLabel req>City:</QrLabel><PBLookup w={120} value={c.city} name="quick-reg-city" fieldId="host.mois.field.quick-reg-city" onChange={(v) => setC({ ...c, city: v })} />
          <QrLabel right>Province:</QrLabel>{f('province', '100%')}
          <QrLabel req>Postal Code:</QrLabel>{f('postal', 98)}<QrLabel right>Country:</QrLabel>{o('country', '100%')}
          <QrLabel req>Home:</QrLabel>{f('home', 98)}<span /><PBCheckbox label="Leave Message" checked={leave.home} onChange={(v) => setLeave({ ...leave, home: v })} tutorialId="host.mois.field.quick-reg-home-leave-message" />
          <QrLabel>Work:</QrLabel>{f('work', 98)}<span className="pb-row" style={{ gap: 4, justifyContent: 'flex-end' }}>Ext.:{o('ext', 56)}</span><PBCheckbox label="Leave Message" checked={leave.work} onChange={(v) => setLeave({ ...leave, work: v })} tutorialId="host.mois.field.quick-reg-work-leave-message" />
          <QrLabel>Cell:</QrLabel>{f('cell', 98)}<QrLabel right>Pager:</QrLabel>{o('pager', '100%')}
          <QrLabel>Preferred Phone:</QrLabel>{sel('preferred', 98, ['', 'Home', 'Work', 'Cell'])}<QrLabel right>Fax:</QrLabel>{o('fax', '100%')}
          <QrLabel>eMail (Home):</QrLabel><span style={span3}>{o('email-home', '100%')}</span>
          <QrLabel>eMail (Work):</QrLabel><span style={span3}>{o('email-work', '100%')}</span>
        </QrGroup>
        {/* INFERRED: the four lists' entries (image 13 shows them closed and empty) */}
        <QrGroup title="Office Information">
          <QrLabel>Facility:</QrLabel><span style={span3}>{oSel('facility', 230, [''])}</span>
          <QrLabel>Location:</QrLabel><span style={span3}>{oSel('location', 230, SERVICE_LOCATIONS)}</span>
          <QrLabel>Service:</QrLabel><span style={span3}>{oSel('service', 230, [''])}</span>
          <QrLabel>Service Provider:</QrLabel><span style={span3}>{oSel('service-provider', 230, ['', ...LITE_PROVIDERS])}</span>
        </QrGroup>
        <QrGroup title="Connections">
          <QrLabel>Referring:</QrLabel><span style={span3}><PBLookup w="100%" value={x.referring ?? ''} name="quick-reg-referring" onChange={(v) => setX({ ...x, referring: v })} /></span>
          <QrLabel>Primary Care:</QrLabel><span style={span3}><PBLookup w="100%" value={x['primary-care'] ?? ''} name="quick-reg-primary-care" onChange={(v) => setX({ ...x, 'primary-care': v })} /></span>
        </QrGroup>
      </div>
    </DetailWindow>
  )
}

/* CONFIRM-CURRENT: laid out from 3103943 `7722ca57…` (older build). */
function CareComplete({ enc, onClose, onContinue }: { enc: LiteEncounter; onClose: () => void; onContinue: (patch: Partial<LiteEncounter>) => void }) {
  const [reason, setReason] = useState(enc.reason)
  const [issues, setIssues] = useState(enc.healthIssues.slice(0, 2))
  const [services, setServices] = useState(enc.services.slice(0, 2))
  return (
    <DetailWindow id="my-encounter-care-complete" title="My Encounter - Care Complete" width={450} zIndex={45} onClose={onClose}
      buttons={<><Btn id="care-complete-continue" isDefault width={80} onClick={() => onContinue({ reason, healthIssues: [...issues, ...enc.healthIssues.slice(2)], services: [...services, ...enc.services.slice(2)] })}>Continue</Btn><Btn id="care-complete-cancel" width={80} onClick={onClose}>Cancel</Btn></>}>
      <div style={{ margin: 8, border: '1px solid #b8b8b8', background: '#fff' }}>
        <LookupBand variant="lite">Encounter Detail</LookupBand>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', padding: '6px 8px' }}>
          <div><div style={{ color: '#666' }}>Patient</div><ReadOnlyField w={180} value={enc.name} face="#f0f0f0" /></div>
          <div><div style={{ color: '#666' }}>Visit Reason</div><PBLookup w={190} value={reason} name="care-complete-reason" fieldId="host.mois.field.care-complete-reason" onChange={setReason} /></div>
          <div><div style={{ color: '#666' }}>Encounter Date / Time</div><span className="pb-row" style={{ gap: 2 }}><PBInput w={76} readOnly value={enc.date} /><PBInput w={26} readOnly value={enc.hh} /><PBInput w={26} readOnly value={enc.mm} /></span></div>
          <div><div style={{ color: '#666' }}>Care Stop Date / Time</div><span className="pb-row" style={{ gap: 2 }}><PBInput w={76} readOnly value={enc.finish ? enc.date : '0000.00.00'} /><PBInput w={26} readOnly value={enc.finish.slice(0, 2)} /><PBInput w={26} readOnly value={enc.finish.slice(3)} /></span></div>
          <div><div style={{ color: '#666' }}>Health Issue <span style={{ color: '#999' }}>(optional)</span></div>
            {issues.map((h, i) => <div key={i} style={{ marginTop: 3 }}><PBLookup w={90} value={h} name={`care-complete-health-issue-${i + 1}`} fieldId={`host.mois.field.care-complete-health-issue-${i + 1}`} onChange={(v) => setIssues(issues.map((x, j) => (j === i ? v : x)))} /></div>)}</div>
          <div><div style={{ color: '#666' }}>Service <span style={{ color: '#999' }}>(optional)</span></div>
            {services.map((s, i) => <div key={i} style={{ marginTop: 3 }}><PBLookup w={90} value={s} name={`care-complete-service-${i + 1}`} fieldId={`host.mois.field.care-complete-service-${i + 1}`} onChange={(v) => setServices(services.map((x, j) => (j === i ? v : x)))} /></div>)}
            {/* 7722ca57 prints nothing under Service: the provider's default fee code
                is applied when the visit is billed (3103943), not shown here */}
          </div>
        </div>
      </div>
    </DetailWindow>
  )
}

/* CONFIRM-CURRENT: from 3797326's text (search Author / Name / Description
   at the top, preview at the bottom, Select) and its two heart icons. */
function TemplateList({ onClose, onSelect }: { onClose: () => void; onSelect: (text: string) => void }) {
  const [search, setSearch] = useState('')
  const [favs, setFavs] = useState<string[]>([])
  const [onlyFavs, setOnlyFavs] = useState(false)
  const [cur, setCur] = useState(0)
  const rows = NOTE_TEMPLATES.filter((t) => (!onlyFavs || favs.includes(t.name)) && (!search || `${t.author} ${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase())))
  const row = rows[cur]
  const heart = (on: boolean) => <span style={{ color: on ? '#e0245e' : '#b0b0b0' }}>{on ? '♥' : '♡'}</span>
  return (
    <PickListWindow<(typeof NOTE_TEMPLATES)[number]>
      frame={(content, footer) => (
        <DetailWindow id="note-template-list" title="Templates" width={620} height={520} zIndex={45} onClose={onClose} buttons={footer}>
          {content}
        </DetailWindow>
      )}
      search={(
        <div className="pb-row" style={{ gap: 6, padding: 6 }}>
          <PBInput w={400} value={search} placeholder="Author, Name or Description" onChange={(e) => { setSearch(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.template-search" />
          <PBButton style={{ minWidth: 0, width: 26 }} command="template-favourites" onClick={() => setOnlyFavs((v) => !v)}>{heart(onlyFavs)}</PBButton>
        </div>
      )}
      gridBox={{ flex: '1 1 55%', minHeight: 0, display: 'flex', padding: '0 6px' }}
      grid={{
        rows, current: cur, onCurrentChange: setCur, onActivate: (t) => onSelect(t.text),
        rowTutorialId: (t) => `host.mois.row.template-${pbSlug(t.name)}`,
        columns: [
          { key: 'fav', header: '', width: 24, align: 'center', render: (t) => <PBButton bare className="pb-link" command={`favourite-${pbSlug(t.name)}`} onClick={() => setFavs((f) => (f.includes(t.name) ? f.filter((x) => x !== t.name) : [...f, t.name]))}>{heart(favs.includes(t.name))}</PBButton> },
          { key: 'author', header: 'Author', width: 130 }, { key: 'name', header: 'Name', width: 150 }, { key: 'description', header: 'Description', width: 230 },
        ],
      }}
      below={<pre style={{ flex: '1 1 45%', margin: 6, background: '#fff', border: '1px solid #a0a0a0', padding: 6, fontFamily: 'inherit' }} data-tutorial-id="host.mois.field.template-preview">{row?.text ?? ''}</pre>}
      footer={<><Btn id="template-select" isDefault width={80} disabled={!row} onClick={() => row && onSelect(row.text)}>Select</Btn><Btn id="template-cancel" width={80} onClick={onClose}>Cancel</Btn></>}
    />
  )
}

function ReasonPicker({ onClose, onPick }: { onClose: () => void; onPick: (r: string) => void }) {
  const [cur, setCur] = useState(0)
  return (
    <PickListWindow<{ r: string }>
      frame={(content, footer) => (
        <DetailWindow id="visit-reason-lookup" title="Visit Reason" width={360} height={300} zIndex={45} onClose={onClose} buttons={footer}>
          {content}
        </DetailWindow>
      )}
      gridBox={{ flex: '1 1 auto', display: 'flex', padding: 6 }}
      grid={{
        rows: VISIT_REASONS.map((r) => ({ r })), current: cur, onCurrentChange: setCur, onActivate: (x) => onPick(x.r),
        rowTutorialId: (x) => `host.mois.row.visit-reason-${pbSlug(x.r)}`,
        columns: [{ key: 'r', header: 'Reason', width: 300 }],
      }}
      footer={<><Btn id="visit-reason-ok" isDefault width={80} onClick={() => onPick(VISIT_REASONS[cur]!)}>Ok</Btn><Btn id="visit-reason-cancel" width={80} onClick={onClose}>Cancel</Btn></>}
    />
  )
}

/* CONFIRM-CURRENT: from 3797326's text only ("Make Note Private"). */
function MakePrivate({ current, onClose, onContinue }: { current?: LiteEncounter['private']; onClose: () => void; onContinue: (p: NonNullable<LiteEncounter['private']>) => void }) {
  const [duration, setDuration] = useState(current?.duration ?? '')
  const [reason, setReason] = useState(current?.reason ?? '')
  const [who, setWho] = useState(current?.who ?? 'Authorized Users Only')
  const [alert, setAlert] = useState(current?.alert ?? false)
  const [kind, setKind] = useState('Message')
  const [priority, setPriority] = useState('Medium')
  return (
    <DetailWindow id="make-note-private" title={current ? 'View Access' : 'Make Private'} width={440} zIndex={45} onClose={onClose}
      buttons={<><Btn id="private-continue" isDefault width={80} onClick={() => onContinue({ duration, reason, who, alert })}>Continue</Btn><Btn id="private-cancel" width={80} onClick={onClose}>Cancel</Btn></>}>
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Duration:</FieldLabel><PBInput w={100} value={duration} onChange={(e) => setDuration(e.target.value)} data-tutorial-id="host.mois.field.private-duration" /><span style={{ color: '#888' }}>(optional)</span></div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Reason:</FieldLabel><PBInput w={250} value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.private-reason" /></div>
        <div>Who can Break Glass to see the note:</div>
        {['Authorized Users Only', 'Select Users Only', 'Nobody'].map((w) => (
          <div key={w} style={{ paddingLeft: 20 }}><PBRadio name="private-who" label={w} checked={who === w} onChange={() => setWho(w)} tutorialId={`host.mois.field.private-${pbSlug(w)}`} /></div>
        ))}
        <PBCheckbox label="Send an alert when Users break glass" checked={alert} onChange={setAlert} tutorialId="host.mois.field.private-alert" />
        {alert && (
          <div className="pb-row" style={{ gap: 10, paddingLeft: 20 }}>
            <PBRadio name="private-kind" label="Message" checked={kind === 'Message'} onChange={() => setKind('Message')} />
            <PBRadio name="private-kind" label="Task" checked={kind === 'Task'} onChange={() => setKind('Task')} />
            <span>Priority:</span><PBSelect w={90} options={['Low', 'Medium', 'High', 'V. High']} value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
        )}
      </div>
    </DetailWindow>
  )
}
