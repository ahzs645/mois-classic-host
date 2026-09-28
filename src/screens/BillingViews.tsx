import { useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDropDownDataWindow, PBMessageBox, PBSelect,
  PBTextArea, PBViewHeader,
} from '../pb'
import { useBillingCommands } from '../data/billingCommands'
import {
  billingDiagnosis, CALL_OUT_FEES, claimFee, CONTINUING_CARE_FEES, FEE_OPTION_1, FEE_OPTION_2, HOSPITAL_LOCATIONS,
  MSP_LOCATION_ROWS, rowFromForm, useClinicDefaultLocation, useDefaultLocation, useUnsentClaims,
} from '../data/billingStore'
import {
  blankClaim, initialClaim, missingFields, UNSENT_CLAIM_KEY, type ClaimForm,
} from '../data/claims'
import { insuranceCarrierRows } from '../data/mois'
import { usePatientRoster } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { pcpcClaimCheck } from '../data/billingPrograms'
import { useReportDialog, useScreenWindow, useSessionState } from '../host/screen-windows'
import type { ClaimPrompt } from './ClaimPromptDialog'
import { registerBillingMenus } from '../data/menus/billing'
import { registerChangeTeleplanPassword } from './ChangeTeleplanPasswordDialog'
import { registerSentClaimDetail } from './SentClaimDetailWindow'
import { registerBillingWindows } from './billing/register'
import { Prompt } from './ExchangeKit'
import { AdvancedLookupDialog } from './AdvancedLookupDialog'
import { UniversalSearchDialog } from './CodeLookupDialogs'
import { At, Band, Body, Dots, Field, G, Hair, LL, Line, PK, Radios, RL, Y } from './billing/claimLayout'
import { FeeCodeLookupWindow, ProviderListWindow, UNSENT_WINDOWS } from './billing/UnsentClaimWindows'

export { SentMspView } from './billing/SentToMspView'
export { InvoiceView } from './billing/InvoiceView'

/* The Billing menus and windows register from here too: this module is
   imported for its exports, so the registration survives a bundler that
   drops side-effect-only imports (the package's "sideEffects" field). Every
   call is idempotent. */
registerBillingMenus()
registerChangeTeleplanPassword()
registerSentClaimDetail()
registerBillingWindows()

/* ============================================================================
   The three captured Billing views: Unsent MSP (here), Sent To MSP
   (billing/SentToMspView.tsx) and Invoice (billing/InvoiceView.tsx).

   Transcribed from the MOIS help site:
     Unsent MSP   `unsent_claims1.PNG` (v02.20.02, 1:1, 303601 `12299570`)
                  and the cloud captures in 303601 — `fa0339f2` (Change Payee
                  and PBF Class. in OTHER; a new claim's defaults),
                  `dcf77aa9` (Delete Claim's "Confirmation - Delete Record")
                  and `6aeef025` (a resubmitted claim, 3786544).

   Field labels, section names and button order are the captures'. The claim
   values are synthetic training data, like the rest of this emulator.

   MOIS paints a required-but-empty field pink and an entered field yellow.
   ========================================================================= */

/* --- Unsent MSP -----------------------------------------------------------
   Laid out on the v02.20.02 capture `12299570` (303601), measured 1:1 (the
   grid helpers are billing/claimLayout.tsx). The cloud build adds Change
   Payee beside Payee No. and PBF Class. / FFS in OTHER (`fa0339f2`).

   Radios are radios (Claim Status, Pay Mode, After-Hour Ind., Ref To/By,
   MVA, Letter), the coded fields are drop-downs (Insured By, Location, Sub
   Code, Ext. Sub Cd, Sex, Anatomic Position), and First Name / Middle
   Initial / Last Name are editable — the name fills in from the chart and
   can be corrected (303601 "Patient: … first and last name, along with the
   patient's middle initial"; Refresh Patient Data re-reads Demographics).

   Every field a claim carries is kept: Save stores the whole window against
   the claim in the session's live list (data/billingStore.ts), so a claim
   picked back from a Prompt list reopens as it was saved.

   WHAT SAVE CHECKS. "If necessary information is missing, the claim will be
   marked as Incomplete … MOIS will indicate the reason by showing the field
   name in red" (303601). Chart, Insurance #, Service Date, Location, Fee
   Item, Unit Amount and Diag Code 1 always; and, INFERRED from the field
   descriptions (the How-To pages they link to are not in the archive):
     · a call-out fee item (01200–01202) needs Time(s) Received, a
       continuing-care surcharge (01205–01207) Start and Finish — "This
       applies to out of office billing and some specific Fee Codes";
     · a Service To Date needs a hospital Location (E, G, I, P) — "This
       applies to how long a hospital in-patient has been admitted";
     · an out-of-province claim (Insured By another province) needs the
       Dep. No. — "make sure that in the Dep. No. field you enter the last
       two digits of their health number" (301149 Demographics) — and the
       patient's Sex in OPTIONS;
     · a newborn billed on the mother's number (Dep. No. 66) needs the
       baby's DoB and Sex in OPTIONS.
   The "…" beside Claim Status lists what is missing.
   ------------------------------------------------------------------------ */

/** How the Insurance # stands, for the frame — never the number itself:
    empty, the chart's own PHN as it came in, one typed with a leading zero,
    or one typed without. */
function insuranceState(v: string, chartPhn?: string): 'empty' | 'chart-phn' | 'leading-zero' | 'entered' {
  const t = v.replace(/\s+/g, '')
  if (!t) return 'empty'
  if (chartPhn && t === chartPhn.replace(/\s+/g, '')) return 'chart-phn'
  return t.startsWith('0') ? 'leading-zero' : 'entered'
}

/** Insured By codes that are not another province's plan. */
const NOT_A_PROVINCE = ['BC', 'WC', 'PP', 'IN']
/** MSP's dependant number for a newborn billed on the mother's number. */
const NEWBORN_DEP = '66'

/** What Save needs beyond the base list, by field key and its caption. */
export function claimGaps(c: ClaimForm): (keyof ClaimForm)[] {
  const gaps = [...missingFields(c)]
  const empty = (k: keyof ClaimForm) => !String(c[k] ?? '').trim() || String(c[k] ?? '').trim() === ':'
  if (CALL_OUT_FEES.includes(c.fee.trim()) && empty('received')) gaps.push('received')
  if (CONTINUING_CARE_FEES.includes(c.fee.trim())) {
    if (empty('start')) gaps.push('start')
    if (empty('finish')) gaps.push('finish')
  }
  if (!empty('serviceTo') && !HOSPITAL_LOCATIONS.includes(c.location)) gaps.push('location')
  const oop = !NOT_A_PROVINCE.includes(c.insuredBy.trim().toUpperCase())
  if (oop) {
    if (!/^\d{2}$/.test(c.dep.trim()) || c.dep.trim() === '00') gaps.push('dep')
    if (empty('oopSex')) gaps.push('oopSex')
  }
  if (c.dep.trim() === NEWBORN_DEP) {
    if (empty('oopDob')) gaps.push('oopDob')
    if (empty('oopSex')) gaps.push('oopSex')
  }
  return [...new Set(gaps)]
}

const CAPTIONS: Partial<Record<keyof ClaimForm, string>> = {
  chart: 'Chart', insurance: 'Insurance #', serviceDate: 'Service Date', location: 'Location', fee: 'Fee Item',
  unit: 'Unit Amount', diag1: 'Diag Code 1', received: 'Time(s) Received', start: 'Start', finish: 'Finish',
  dep: 'Dep. No.', oopSex: 'Sex', oopDob: 'DoB',
}

const LOCATION_COLUMNS = [{ key: 'code', header: 'Code', width: 44 }, { key: 'desc', header: 'Description', width: 300 }]

/** `2026.03.18` + a `DD` Service To Date → the days it covers, both ends in. */
function daysCovered(from: string, to: string): number | null {
  const day = Number(from.split('.')[2])
  const end = Number(to.trim())
  if (!day || !end || end < day) return null
  return end - day + 1
}

type Confirm = 'delete' | 'missing' | null

export function UnsentMspView({ onPrompt }: { onPrompt?: (prompt: ClaimPrompt) => void }) {
  const roster = usePatientRoster()
  const store = useUnsentClaims(roster)
  const [stored, setStored] = useSessionState<ClaimForm | null>(UNSENT_CLAIM_KEY, null)
  const [missing, setMissing] = useState<string[]>([])
  /* BC PCPC in-basket validation (1776677; data/billingPrograms.ts — A2) */
  const [pcpcIssue, setPcpcIssue] = useState('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const win = useScreenWindow()
  /* the provider pick is for one of three things */
  const [providerFor, setProviderFor] = useState<'change' | 'duplicate'>('change')
  const c = stored ?? initialClaim
  const pcpc = pcpcClaimCheck({ chart: c.chart, serviceDate: c.serviceDate, fee: c.fee, location: c.location })
  const [defaultLoc] = useDefaultLocation(c.doctor)
  const clinicLoc = useClinicDefaultLocation()
  /* the red labels belong to the claim Save judged; another claim clears them */
  const [lastState, setLastState] = useState(c.state)
  if (c.state !== lastState) {
    setLastState(c.state)
    if ((c.state === 'picked' || c.state === 'new') && missing.length) setMissing([])
  }
  const set = (patch: Partial<ClaimForm>) => setStored({ ...c, ...patch, state: c.state === 'saved' ? 'loaded' : c.state })
  const red = (k: keyof ClaimForm) => missing.includes(k)

  /** Chart + Enter (or Refresh Patient Data): the name, birth date and
      insurance come in from the chart's Demographics. */
  const fromChart = (chart: string, base: ClaimForm = c) => {
    const state = base.state === 'saved' ? 'loaded' : base.state
    const p = roster.find((r) => r.chart === chart.trim())
    if (!p) {
      /* a chart that no longer matches takes the name it brought in with it */
      const was = roster.some((r) => r.chart === base.chart)
      setStored({ ...base, state, chart: chart.trim(), ...(was ? { first: '', middle: '', last: '', dob: '' } : {}) })
      return
    }
    setStored({
      ...base,
      state,
      chart: p.chart, first: p.first, middle: (p.middle ?? '').slice(0, 1), last: p.last, dob: p.dob,
      insuredBy: p.insuranceBy || 'BC', insurance: p.insurance ?? '', dep: p.dep || '00',
    })
  }

  /** New Claim — "Removes all information from the previous claim and opens
      a new claim". Location opens on the provider's default billing
      location (3295094), else the clinic's (System Settings ▸ Default
      Location). */
  const newClaim = () => {
    setMissing([])
    setStored({ ...blankClaim(MOIS_TODAY, c.doctor), location: defaultLoc || clinicLoc })
  }

  const save = (): ClaimForm => {
    const gaps = claimGaps(c)
    setMissing(gaps)
    /* an enrolled patient's In-Basket code, or 96198 for one not enrolled,
       is "marked incomplete" with a warning (1776677) */
    if (pcpc.issue) setPcpcIssue(pcpc.issue.message)
    const status = gaps.length || pcpc.issue ? 'Incomplete' : 'Complete'
    const saved: ClaimForm = { ...c, status, state: 'saved', created: c.created || `${MOIS_TODAY} 15:38 ADMINISTRATOR`, ...(pcpc.payMode ? { payMode: pcpc.payMode } : {}) }
    const row = rowFromForm(saved, status)
    let id = c.id
    if (id && store.rows.some((r) => r.id === id)) store.update([id], { ...row, id })
    else id = store.add([row])[0]
    const next = { ...saved, id }
    setStored(next)
    return next
  }

  const focus = (anchor: string) => setTimeout(() => {
    document.querySelector<HTMLInputElement>(`[data-tutorial-id="host.mois.field.${anchor}"]`)?.focus()
  }, 0)

  /** Duplicate Claim - NOS / - DOS / diff Provider: "Saves and duplicates" —
      the copy is a new claim with the same patient and service. */
  const duplicate = (then: 'nos' | 'dos' | 'provider') => {
    const saved = save()
    setStored({ ...saved, id: undefined, state: 'new', status: 'Incomplete', created: '' })
    setMissing([])
    if (then === 'nos') focus('claim-no-service')
    else if (then === 'dos') focus('claim-service-date')
    else { setProviderFor('duplicate'); win.open(UNSENT_WINDOWS.provider) }
  }

  const deleteClaim = () => {
    if (c.id) store.remove([c.id])
    setMissing([])
    setStored({ ...blankClaim(MOIS_TODAY, c.doctor), location: defaultLoc || clinicLoc })
  }

  const pickFee = (code: string) => {
    const f = claimFee(code)
    set({ fee: code, ...(f ? { unit: f.fee } : {}) })
  }

  useBillingCommands((cmd) => {
    if (cmd === 'new-claim') newClaim()
    else if (cmd === 'save-claim') save()
    else if (cmd === 'delete-claim') setConfirm('delete')
    else if (cmd === 'prompt-patient') onPrompt?.('patient')
    else if (cmd === 'prompt-doctor') onPrompt?.('doctor')
    else if (cmd === 'prompt-service') onPrompt?.('service')
    else if (cmd === 'prompt-chart') onPrompt?.('chart')
    else if (cmd === 'fee-option-1') pickFee(FEE_OPTION_1)
    else if (cmd === 'fee-option-2') pickFee(FEE_OPTION_2)
    else if (cmd === 'duplicate-nos') duplicate('nos')
    else if (cmd === 'duplicate-dos') duplicate('dos')
    else if (cmd === 'duplicate-provider') duplicate('provider')
    else if (cmd === 'change-claim-provider') { setProviderFor('change'); win.open(UNSENT_WINDOWS.provider) }
    /* "Automatically populates the WCB information (taken from the patient's
       chart)" / "Marks the claim as a Pay Patient Claim" (303601) */
    else if (cmd === 'set-wcb') set({ insuredBy: 'WC', payPatient: false })
    else if (cmd === 'set-pay-patient') set({ payPatient: !c.payPatient })
  })

  const chartPhn = roster.find((r) => r.chart === c.chart)?.insurance
  const time = (v?: string) => (v && v.trim() && v.trim() !== ':' ? 'set' : 'empty')
  useScreenReport({
    claim: c.state,
    insuredBy: c.insuredBy,
    insurance: insuranceState(c.insurance, chartPhn),
    claimStatus: c.status.toLowerCase(),
    location: c.location,
    payMode: c.payMode.toLowerCase(),
    afterHour: c.afterHour.toLowerCase().replace('/', ''),
    fee: c.fee,
    diagnosis: c.mappedFrom ? 'mapped' : c.diag1.trim() ? 'entered' : 'empty',
    serviceTo: time(c.serviceTo),
    received: time(c.received),
    start: time(c.start),
    finish: time(c.finish),
    dep: c.dep === NEWBORN_DEP ? 'newborn' : c.dep === '00' ? 'none' : c.dep.trim() ? 'entered' : 'empty',
    hold: c.hold,
    payPatient: Boolean(c.payPatient),
    missing: missing.length,
    unsentCount: store.rows.length,
    ...(confirm === 'delete' ? { dialog: 'delete-unsent-claim' } : confirm === 'missing' ? { dialog: 'claim-incomplete' } : {}),
  })

  const gapsNow = claimGaps(c)

  return (
    <>
      <PBViewHeader title="Unsent MSP" />
      <PBCommandRow commands={[
        { label: 'New Claim', onClick: newClaim },
        { label: 'Delete Claim', onClick: () => setConfirm('delete') },
        { label: 'Save', onClick: save },
        { label: 'Prompt - Patient', onClick: () => onPrompt?.('patient') },
        { label: 'Prompt - Doctor', onClick: () => onPrompt?.('doctor') },
        { label: 'Close Window' },
      ]} />
      <Body>
        {/* the pale panel across the top: Doctor, Claim Status, Chart */}
        <div style={{ position: 'relative', margin: '4px 0 6px', padding: '3px 0', background: '#fbf0f0', border: '1px solid #a9b8d6', borderRadius: 3, flex: 'none' }}>
          <Line>
            <LL>Doctor:</LL>
            <At x={349}>
              <Dots
                w={122}
                id="claim-doctor"
                readOnly
                value={c.doctor.split(',')[0] + (c.doctor.includes(',') ? ', ' + (c.doctor.split(',')[1] ?? '').trim().slice(0, 1) + '.' : '')}
                style={{ background: '#f4b4b4', color: '#800000', fontWeight: 700 }}
                onDots={() => { setProviderFor('change'); win.open(UNSENT_WINDOWS.provider) }}
              />
            </At>
            <RL end={578}>Claim Status:</RL>
            <Radios name="claim-status" bold value={c.status} options={[
              { value: 'Complete', label: 'Complete', x: 583 },
              { value: 'Incomplete', label: 'Incomplete', x: 668 },
            ]} />
            <At x={752}>
              <PBButton
                size="sm"
                style={{ minWidth: 17, width: 17, padding: 0 }}
                data-tutorial-id="host.mois.command.claim-status-reasons"
                onClick={() => setConfirm('missing')}
              >
                …
              </PBButton>
            </At>
            <RL end={838} red={red('chart')}>Chart:</RL>
            <At x={842}>
              <Dots w={62} value={c.chart} id="claim-chart" onChange={(v) => fromChart(v)} onEnter={(v) => fromChart(v)} onDots={() => win.open(UNSENT_WINDOWS.patient)} />
            </At>
            <At x={925}>
              <PBButton
                style={{ width: 76, height: 32, lineHeight: 1.05, whiteSpace: 'normal', padding: 0 }}
                data-tutorial-id="host.mois.command.refresh-patient-data"
                onClick={() => c.chart && fromChart(c.chart)}
              >
                Refresh Patient Data
              </PBButton>
            </At>
          </Line>
          <Line>
            <At x={583}><PBCheckbox label="Hold Claim" checked={c.hold} onChange={(v) => set({ hold: v })} tutorialId="host.mois.check.hold-claim" /></At>
            <At x={665}><Field w={140} value={c.holdReason} id="claim-hold-reason" onChange={(v) => set({ holdReason: v })} /></At>
          </Line>
        </div>

        <Band caption="PATIENT:">
          <Line>
            <LL>First Name:</LL>
            <At x={349}><Dots w={122} value={c.first} style={Y} id="claim-first" onChange={(v) => set({ first: v.toUpperCase() })} /></At>
            <RL end={578}>Middle Initial:</RL>
            <At x={582}><Field w={24} value={c.middle} onChange={(v) => set({ middle: v.toUpperCase().slice(0, 1) })} /></At>
            <RL end={838}>Last Name:</RL>
            <At x={842}><Dots w={116} value={c.last} style={Y} id="claim-last" onChange={(v) => set({ last: v.toUpperCase() })} /></At>
          </Line>
        </Band>

        <Band caption="INSURER">
          <Line>
            <LL>Insured By:</LL>
            <At x={349}>
              {/* the payer list the chart's Insurance By uses (data/mois
                  insuranceCarrierRows). A typed code is taken as it is. */}
              <span onChange={(e) => {
                const v = (e.target as HTMLInputElement).value?.trim().toUpperCase()
                if (v !== undefined) set({ insuredBy: v.slice(0, 2) })
              }}>
                <PBDropDownDataWindow
                  w={66}
                  listW={200}
                  value={c.insuredBy}
                  display="code"
                  columns={[{ key: 'code', header: 'Code', width: 44 }, { key: 'insurer', header: 'Description' }]}
                  rows={insuranceCarrierRows}
                  onSelect={(r) => set({ insuredBy: r.code })}
                  tutorialId="host.mois.field.claim-insured-by"
                />
              </span>
            </At>
            <RL end={578} red={red('insurance')}>Insurance #:</RL>
            <At x={580}><Field w={94} value={c.insurance} style={c.insurance.trim() ? Y : PK} id="claim-insurance" onChange={(v) => set({ insurance: v })} /></At>
            <RL end={731} red={red('dep')}>Dep. No.:</RL>
            <At x={733}><Field w={40} value={c.dep} id="claim-dep" onChange={(v) => set({ dep: v.replace(/\D/g, '').slice(0, 2) })} /></At>
            <RL end={838}>DoB:</RL>
            <At x={840}><Field w={79} value={c.dob} style={G} readOnly /></At>
            <At x={928} top={3}><span style={{ color: '#404040' }}>(read-only)</span></At>
          </Line>
        </Band>

        <Band caption="SERVICE:">
          <Line>
            <LL red={red('serviceDate')}>Service Date:</LL>
            <At x={346}><Field w={92} value={c.serviceDate} id="claim-service-date" onChange={(v) => set({ serviceDate: v })} /></At>
            {pcpc.indicator && (
              /* `499e7738…`: "BC PCPC ENROLLED" in grey beside the date */
              <At x={442} top={-1}><span data-tutorial-id="host.mois.field.claim-pcpc-enrolled" style={{ color: '#808080', fontSize: 10, lineHeight: '10px', display: 'inline-block', width: 60 }}>{pcpc.indicator}</span></At>
            )}
            <RL end={578} red={red('location')}>Location:</RL>
            <At x={580}>
              <PBDropDownDataWindow
                w={69}
                listW={360}
                value={c.location}
                display="code"
                columns={LOCATION_COLUMNS}
                rows={MSP_LOCATION_ROWS}
                onSelect={(r) => set({ location: r.code })}
                tutorialId="host.mois.field.claim-location"
              />
            </At>
            <RL end={838}>Service To Date:</RL>
            <At x={840}>
              <Field
                w={41}
                value={c.serviceTo}
                id="claim-service-to"
                onChange={(v) => {
                  const to = v.replace(/\D/g, '').slice(0, 2)
                  const days = daysCovered(c.serviceDate, to)
                  set({ serviceTo: to, ...(days ? { noService: days.toFixed(4) } : {}) })
                }}
              />
            </At>
          </Line>
          <Hair />
          <Line>
            <LL>No. Service:</LL>
            <At x={346}><Field w={92} align="right" value={c.noService} id="claim-no-service" onChange={(v) => set({ noService: v })} /></At>
            <At x={500} top={3}><span className="pb-form__label" style={{ color: red('diag1') ? '#e00000' : undefined }}>Diag Code(s)</span></At>
            <RL end={578}>1:</RL>
            <At x={581}>
              <Dots
                w={60}
                value={c.diag1}
                style={c.diag1.trim() ? Y : PK}
                id="claim-diag-1"
                marker={c.mappedFrom}
                onChange={(v) => set({ diag1: v, mappedFrom: undefined })}
                onEnter={(v) => set(billingDiagnosisPatch(v))}
                onDots={() => win.open(UNSENT_WINDOWS.diagnosis, { slot: 1 })}
              />
            </At>
            <At x={740} top={3}><span className="pb-form__label">Time(s)</span></At>
            <RL end={838} red={red('received')}>Received:</RL>
            <At x={840}><Field w={62} align="center" value={c.received || ':'} id="claim-received" onChange={(v) => set({ received: v })} /></At>
          </Line>
          <Line>
            <LL red={red('fee')}>Fee Item:</LL>
            <At x={346}>
              <Field w={24} value={c.clarification} id="claim-clarification" onChange={(v) => set({ clarification: v.toUpperCase() })} />
              <span>-</span>
              <Dots w={58} value={c.fee} style={Y} id="claim-fee" onChange={(v) => set({ fee: v })} onEnter={(v) => pickFee(v.trim())} onDots={() => win.open(UNSENT_WINDOWS.fee)} />
            </At>
            <RL end={578}>2:</RL>
            <At x={581}><Dots w={60} value={c.diag2} id="claim-diag-2" onChange={(v) => set({ diag2: v })} onDots={() => win.open(UNSENT_WINDOWS.diagnosis, { slot: 2 })} /></At>
            <RL end={838} red={red('start')}>Start:</RL>
            <At x={840}><Field w={62} align="center" value={c.start || ':'} id="claim-start" onChange={(v) => set({ start: v })} /></At>
          </Line>
          <Line>
            <LL red={red('unit')}>Unit Amount:</LL>
            <At x={346}><Field w={92} align="right" value={c.unit} style={Y} id="claim-unit" onChange={(v) => set({ unit: v })} /></At>
            <RL end={578}>3:</RL>
            <At x={581}><Dots w={60} value={c.diag3} id="claim-diag-3" onChange={(v) => set({ diag3: v })} onDots={() => win.open(UNSENT_WINDOWS.diagnosis, { slot: 3 })} /></At>
            <RL end={838} red={red('finish')}>Finish:</RL>
            <At x={840}><Field w={62} align="center" value={c.finish || ':'} id="claim-finish" onChange={(v) => set({ finish: v })} /></At>
          </Line>
          <Hair />
          <Line>
            <LL>Pay Mode:</LL>
            <Radios name="pay-mode" at="claim-pay-mode" value={c.payMode} onChange={(v) => set({ payMode: v })} options={[
              { value: 'Normal', label: 'Normal', x: 348 },
            ]} />
            <RL end={578}>After-Hour Ind.:</RL>
            <Radios name="after-hour" at="claim-after-hour" value={c.afterHour} onChange={(v) => set({ afterHour: v })} options={[
              { value: 'Normal', label: 'Normal', x: 584 },
              { value: 'Night', label: 'Night', x: 666 },
            ]} />
            <RL end={838}>Anatomic Area:</RL>
            <At x={842}><Field w={42} value="00" /></At>
          </Line>
          <Line>
            <Radios name="pay-mode" group="claim-pay-mode" value={c.payMode} onChange={(v) => set({ payMode: v })} options={[
              { value: 'Alternate', label: 'Alternate', x: 348 },
            ]} />
            <Radios name="after-hour" group="claim-after-hour" value={c.afterHour} onChange={(v) => set({ afterHour: v })} options={[
              { value: 'Even', label: 'Even', x: 584 },
              { value: 'W/end', label: 'W/end', x: 666 },
            ]} />
            <RL end={838}>NPI:</RL>
            <At x={842}><Field w={42} value="00" /></At>
          </Line>
        </Band>

        <Band caption="REFER:">
          {([1, 2] as const).map((n) => {
            const mode = (n === 1 ? c.ref1 : c.ref2) ?? 'N/A'
            const pract = (n === 1 ? c.ref1Pract : c.ref2Pract) ?? ''
            return (
              <Line key={n}>
                <LL>Ref To/By:</LL>
                <Radios name={`ref-${n}`} at={`claim-ref-${n}`} value={mode} onChange={(v) => set(n === 1 ? { ref1: v } : { ref2: v })} options={[
                  { value: 'N/A', label: 'N/A', x: 348 },
                  { value: 'To', label: 'To', x: 390 },
                  { value: 'By', label: 'By', x: 427 },
                ]} />
                <RL end={578}>Pract. No.:</RL>
                <At x={581}><Dots w={72} value={pract} id={`claim-ref-${n}-pract`} onChange={(v) => set(n === 1 ? { ref1Pract: v } : { ref2Pract: v })} /></At>
              </Line>
            )
          })}
        </Band>

        <Band caption="OPTIONS:">
          <Line>
            <LL>MVA:</LL>
            <Radios name="mva" at="claim-mva" value={c.mva ?? 'No'} onChange={(v) => set({ mva: v })} options={[
              { value: 'Yes', label: 'Yes', x: 348 },
              { value: 'No', label: 'No', x: 388 },
            ]} />
            <RL end={578}>Letter:</RL>
            <Radios name="letter" value="No" options={[
              { value: 'Yes', label: 'Yes', x: 586 },
              { value: 'No', label: 'No', x: 623 },
            ]} />
            <RL end={838}>Correspondence Code:</RL>
            <At x={840}><Field w={40} align="center" value="0" style={G} readOnly /></At>
          </Line>
          <Line>
            <LL>ICBC No.:</LL>
            <At x={346}><Dots w={102} value={c.icbc ?? ''} id="claim-icbc" onChange={(v) => set({ icbc: v })} /></At>
            <RL end={578}>Memo:</RL>
            <At x={581}><Field w={212} value={c.memo ?? ''} id="claim-memo" onChange={(v) => set({ memo: v })} /></At>
          </Line>
          <Line>
            <LL>Sub Code:</LL>
            <At x={346}>
              <PBSelect w={66} options={['0', 'A', 'C', 'D', 'E', 'I', 'R', 'W', 'X']} value={c.sub ?? '0'}
                onChange={(e) => set({ sub: e.target.value })} data-tutorial-id="host.mois.field.claim-sub-code" />
            </At>
            <RL end={578}>Claim Note:</RL>
            <At x={581}><Field w={212} value={c.claimNote ?? ''} id="claim-note" onChange={(v) => set({ claimNote: v })} /></At>
          </Line>
          <Line h={38}>
            <LL>Ext. Sub Cd:</LL>
            <At x={346}><PBSelect w={66} options={['']} /></At>
            <At x={420} top={3}><span>(future use)</span></At>
            <RL end={578}>MSP Note:</RL>
            <At x={579}>
              <PBTextArea rows={2} w={410} style={{ height: 35, resize: 'none' }} value={c.mspNote ?? ''}
                onChange={(e) => set({ mspNote: e.target.value })} data-tutorial-id="host.mois.field.claim-msp-note" />
            </At>
          </Line>
          <Hair />
          {/* the out-of-province / newborn block (fa0339f2) */}
          <Line>
            <LL red={red('oopDob')}>DoB:</LL>
            <At x={346}><Field w={90} value={c.oopDob ?? ''} id="claim-oop-dob" onChange={(v) => set({ oopDob: v })} /></At>
            <RL end={578} red={red('oopSex')}>Sex:</RL>
            <At x={580}>
              <PBSelect w={60} options={['', 'F', 'M']} value={c.oopSex ?? ''} onChange={(e) => set({ oopSex: e.target.value })}
                data-tutorial-id="host.mois.field.claim-oop-sex" />
            </At>
          </Line>
          <Line>
            <LL>Address</LL>
            <RL end={343}>1:</RL>
            <At x={346}><Field w={196} value={c.addr1 ?? ''} id="claim-address-1" onChange={(v) => set({ addr1: v })} /></At>
            <RL end={578}>3:</RL>
            <At x={580}><Field w={196} value={c.addr3 ?? ''} id="claim-address-3" onChange={(v) => set({ addr3: v })} /></At>
          </Line>
          <Line>
            <RL end={343}>2:</RL>
            <At x={346}><Field w={196} value={c.addr2 ?? ''} id="claim-address-2" onChange={(v) => set({ addr2: v })} /></At>
            <RL end={578}>4:</RL>
            <At x={580}><Field w={196} value={c.addr4 ?? ''} id="claim-address-4" onChange={(v) => set({ addr4: v })} /></At>
          </Line>
          <Line>
            <LL>Postal Code:</LL>
            <At x={346}><Field w={64} value={c.postal ?? ''} id="claim-postal" onChange={(v) => set({ postal: v.toUpperCase() })} /></At>
          </Line>
        </Band>

        <Band caption="WCB:">
          <Line>
            <LL>WCB No.</LL>
            <At x={346}><Dots w={90} value={c.wcbNo ?? ''} id="claim-wcb-no" onChange={(v) => set({ wcbNo: v })} /></At>
            <RL end={578}>Date of Injury:</RL>
            <At x={581}><Field w={90} value={c.injury ?? ''} id="claim-injury-date" onChange={(v) => set({ injury: v })} /></At>
            <RL end={838}>WCB Form:</RL>
            <At x={840}><Field w={128} style={G} readOnly /></At>
          </Line>
          <Line>
            <LL>Area of Inj.:</LL>
            <At x={346}><Dots w={90} /></At>
            <RL end={578}>Anatomic Position:</RL>
            <At x={580}><PBSelect w={74} options={['', 'L', 'R', 'B']} /></At>
          </Line>
          <Line>
            <LL>Nature of Inj.:</LL>
            <At x={346}><Dots w={90} /></At>
          </Line>
        </Band>

        <Band caption="OTHER:">
          <Line>
            <LL>Pract. No.:</LL>
            <At x={346} top={3}><span>963852</span></At>
            <RL end={578}>Facility No.:</RL>
            <At x={580}><Field w={60} value={c.facility ?? '00000'} id="claim-facility" onChange={(v) => set({ facility: v })} /></At>
            <At x={660} top={3}><span className="pb-form__label">PBF Class.</span></At>
            <RL end={838}>Prev. Seq. No.:</RL>
            <At x={840}><Field w={128} style={G} readOnly /></At>
          </Line>
          <Line>
            <LL>Payee No.:</LL>
            <At x={346} top={3}><span>54321</span></At>
            <At x={400}><PBCheckbox label="Change Payee" /></At>
            <RL end={578}>Sub Facility:</RL>
            <At x={580}><Field w={60} value={c.subFacility ?? '00000'} onChange={(v) => set({ subFacility: v })} /></At>
            <At x={660}><Field w={76} value="FFS" style={G} readOnly /></At>
            <RL end={838}>Payor:</RL>
            {/* Set as Pay Patient (PP) Claim marks it here (INFERRED: where
                the flag shows is not captured) */}
            <At x={840}><Field w={128} value={c.payPatient ? 'PP - PAY PATIENT' : ''} style={G} readOnly id="claim-payor" /></At>
          </Line>
          <Line>
            <At x={206} top={3}><span className="pb-form__label">Created:</span></At>
            <At x={273} top={3}><span>{c.created ? c.created.replace(' ', '  ') : ''}</span></At>
          </Line>
        </Band>
      </Body>

      {confirm === 'delete' && (
        /* dcf77aa9: "Confirmation - Delete Record" / "Would you like to
           delete the current Unsent MSP Claim record?" Yes / No */
        <Prompt title="Confirmation - Delete Record" buttons={['Yes', 'No']} onClose={(b) => { setConfirm(null); if (b === 'Yes') deleteClaim() }}>
          Would you like to delete the current Unsent MSP Claim record?
        </Prompt>
      )}
      {pcpcIssue && (
        /* 1776677: "MOIS will prompt you with a warning that Enrolled patients
           cannot be billed for In-Basket items without fee code 96198" */
        <PBMessageBox
          title="BC PCPC"
          icon="warn"
          buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.claim-pcpc-ok' }]}
          onClose={() => setPcpcIssue('')}
        >
          {pcpcIssue}
        </PBMessageBox>
      )}
      {confirm === 'missing' && (
        /* INFERRED: what the "…" beside Claim Status shows is not captured */
        <PBMessageBox
          title="Claim Status"
          icon={gapsNow.length ? 'warn' : 'info'}
          buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.claim-status-ok' }]}
          onClose={() => setConfirm(null)}
        >
          {gapsNow.length
            ? <>This claim is Incomplete. Missing: {gapsNow.map((k) => CAPTIONS[k] ?? k).join(', ')}.</>
            : 'This claim is Complete and will be sent to MSP.'}
        </PBMessageBox>
      )}

      {win.is(UNSENT_WINDOWS.fee) && (
        <FeeCodeLookupWindow onClose={win.close} onPick={(r) => { set({ fee: r.code, unit: r.fee }); win.close() }} />
      )}
      {win.is(UNSENT_WINDOWS.provider) && (
        <ProviderListWindow
          onClose={win.close}
          onPick={(doctor) => {
            set({ doctor })
            win.close()
            if (providerFor === 'duplicate') setProviderFor('change')
          }}
        />
      )}
      {win.is(UNSENT_WINDOWS.patient) && (
        <PatientLookup onClose={win.close} onPick={(chart) => { fromChart(chart); win.close() }} chart={c.chart} />
      )}
      {win.is(UNSENT_WINDOWS.diagnosis) && (
        <DiagnosisLookup
          onClose={win.close}
          onPick={(code) => {
            const slot = Number(win.window?.args?.slot ?? 1)
            if (slot === 2) set({ diag2: billingDiagnosis(code).diag })
            else if (slot === 3) set({ diag3: billingDiagnosis(code).diag })
            else set(billingDiagnosisPatch(code))
            win.close()
          }}
        />
      )}
    </>
  )
}

/** Diag Code 1 from a picked or typed code: a SNOMED-CT code is swapped for
    its ICD-9 equivalent and the dot marks the swap (2069402). */
function billingDiagnosisPatch(code: string): Partial<ClaimForm> {
  const { diag, mappedFrom } = billingDiagnosis(code)
  return { diag1: diag, mappedFrom }
}

function PatientLookup({ chart, onPick, onClose }: { chart: string; onPick: (chart: string) => void; onClose: () => void }) {
  useReportDialog(UNSENT_WINDOWS.patient)
  const roster = usePatientRoster()
  return <AdvancedLookupDialog chart={chart} roster={roster} onPick={onPick} onClose={onClose} zIndex={85} />
}

function DiagnosisLookup({ onPick, onClose }: { onPick: (code: string) => void; onClose: () => void }) {
  useReportDialog(UNSENT_WINDOWS.diagnosis)
  return <UniversalSearchDialog onPick={(r) => onPick(r.code)} onClose={onClose} />
}
