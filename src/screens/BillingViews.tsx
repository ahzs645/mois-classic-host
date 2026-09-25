import { useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBInput, PBLookup, PBSelect,
  PBTextArea, PBViewHeader,
} from '../pb'
import { useBillingCommands } from '../data/billingCommands'
import {
  blankClaim, initialClaim, missingFields, SENT_CLAIM_KEY, sentClaimPatient, UNSENT_ADDED_KEY, UNSENT_CLAIM_KEY,
  type ClaimForm, type SentClaim, type UnsentClaim,
} from '../data/claims'
import { insuranceCarrierRows } from '../data/mois'
import { usePatientRoster } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import type { ClaimPrompt } from './ClaimPromptDialog'
import { registerBillingMenus } from '../data/menus/billing'
import { registerChangeTeleplanPassword } from './ChangeTeleplanPasswordDialog'
import { registerSentClaimDetail } from './SentClaimDetailWindow'
import { Prompt } from './ExchangeKit'

/* The Billing menus and the Change Teleplan Password window register from
   here too: this module is imported for its exports, so the registration
   survives a bundler that drops side-effect-only imports (the package's
   "sideEffects" field). Both calls are idempotent. */
registerBillingMenus()
registerChangeTeleplanPassword()
registerSentClaimDetail()

/* ============================================================================
   The three captured Billing views: Unsent MSP, Sent To MSP and Invoice.

   Transcribed from the MOIS help site:
     Unsent MSP   `unsent_claims1.PNG` (v02.20.02, 1:1) and the cloud
                  capture in article 303601, which adds Change Payee and
                  PBF Class. to the OTHER section.
     Sent To MSP  `unsent.PNG` (v02.17.34, 1:1) and `Screenshot_2026-03-16
                  _142613.png` (cloud v02.31.41).
     Invoice      `AgingReport_1_Parameters.png` — misfiled in the help site
                  under Reports, but the only unobstructed capture of the
                  Invoice header and its nine toolbar buttons — together with
                  `sent_invoice.png`, which shows the body under an open
                  Action menu.

   Field labels, section names and button order are the captures'. The claim
   and invoice values are synthetic training data, like the rest of this
   emulator.

   MOIS paints a required-but-empty field pink and an entered field yellow;
   the Sent view is read-only apart from Sequence No., which it paints the
   same salmon as a selected grid row.
   ========================================================================= */

/** A section rule: navy bold caption, hairline to the right margin. */
function Sect({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 3px' }}>
      <span style={{ color: '#000080', fontWeight: 700 }}>{children}</span>
      <span style={{ flex: '1 1 auto', height: 1, background: '#000080', opacity: 0.3 }} />
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="pb-row" style={{ gap: 6, padding: '1px 0', flex: 'none', alignItems: 'center' }}>{children}</div>
}

function L({ children, w = 92 }: { children: React.ReactNode; w?: number }) {
  return <span className="pb-form__label" style={{ width: w, flex: 'none' }}>{children}</span>
}

/** entered (yellow), required-and-empty (pink), or read-only (grey). */
const YELLOW = { background: '#ffffc8' }
const PINK = { background: '#ffc8c8' }
const GREY = { background: '#e8e8e8', color: '#404040' }
const SALMON = { background: '#e89c84' }

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 8px 8px' }}>{children}</div>
  )
}

/* --- Unsent MSP -----------------------------------------------------------
   Laid out on the v02.20.02 capture `12299570` (303601), measured 1:1: every
   `x` below is the capture's own x less the view's left edge (x 200), so a
   label or field sits where it sits in the capture. The cloud build adds
   Change Payee beside Payee No. and PBF Class. / FFS in OTHER (`fa0339f2`).

   Three label columns: the first left-aligned at 73, the second and third
   right-aligned on 378 and 638, each followed by its field. Radios are
   radios (Claim Status, Pay Mode, After-Hour Ind., Ref To/By, MVA, Letter),
   the coded fields are drop-downs (Insured By, Location, Sub Code, Ext. Sub
   Cd, Sex, Anatomic Position), and First Name / Middle Initial / Last Name
   are editable — the name fills in from the chart and can be corrected
   (303601 "Patient: … first and last name, along with the patient's middle
   initial"; Refresh Patient Data re-reads Demographics).

   Colours are the captures': yellow for the key fields (names, Insurance #,
   Fee Item, Unit Amount), pink for a required field still empty (Insurance
   # on a new claim in `fa0339f2`, Diag Code 1 in both), grey for read-only.
   Save marks the claim Complete when nothing it needs is missing, and
   otherwise Incomplete, "showing the field name in red" (303601).
   ------------------------------------------------------------------------ */

const Y = { background: '#ffffc8' }
const PK = { background: '#ffc8c8' }
const G = { background: '#e8e8e8', color: '#404040' }

/** capture x → view x */
const vx = (x: number) => x - 200

/** One 19px line of the form; children are placed with `At`. */
function Line({ h = 19, children }: { h?: number; children: React.ReactNode }) {
  return <div style={{ position: 'relative', height: h, flex: 'none', minWidth: 810 }}>{children}</div>
}

/** Something at capture x `x` (its left edge). */
function At({ x, children, top = 1 }: { x: number; children: React.ReactNode; top?: number }) {
  return <span style={{ position: 'absolute', left: vx(x), top, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{children}</span>
}

/** A label whose right edge is at capture x `end` (the second and third columns). */
function RL({ end, children, red }: { end: number; children: React.ReactNode; red?: boolean }) {
  return (
    <span
      className="pb-form__label"
      style={{ position: 'absolute', right: `calc(100% - ${vx(end)}px)`, top: 3, whiteSpace: 'nowrap', color: red ? '#e00000' : undefined }}
    >
      {children}
    </span>
  )
}

/** A first-column label, left-aligned at x 273. */
function LL({ children, red, x = 273 }: { children: React.ReactNode; red?: boolean; x?: number }) {
  return (
    <span className="pb-form__label" style={{ position: 'absolute', left: vx(x), top: 3, whiteSpace: 'nowrap', color: red ? '#e00000' : undefined }}>
      {children}
    </span>
  )
}

/** A navy section caption with its rule (PATIENT:, INSURER, SERVICE: …). */
function Band({ caption, children, pad = 4 }: { caption?: string; children: React.ReactNode; pad?: number }) {
  return (
    <div style={{ position: 'relative', borderTop: '2px solid #1c2f8c', padding: `${pad}px 0`, flex: 'none' }}>
      {caption && (
        <span style={{ position: 'absolute', left: 6, top: pad + 2, color: '#1c2f8c', fontWeight: 700, fontSize: 12 }}>{caption}</span>
      )}
      {children}
    </div>
  )
}

/** The grey hairline MOIS draws between groups inside a band. */
const Hair = () => <div style={{ margin: '3px 0 3px 70px', borderTop: '1px solid #c8c8c8', flex: 'none' }} />

/** A field with the "…" button, its input anchored as `host.mois.field.{id}`. */
function Dots({ w, value, onChange, onEnter, style, id, readOnly }: {
  w: number; value?: string; onChange?: (v: string) => void; onEnter?: (v: string) => void
  style?: React.CSSProperties; id?: string; readOnly?: boolean
}) {
  return (
    <span className="pb-inputgroup" style={{ width: w + 17 }}>
      <input
        type="text"
        className="pb-field"
        value={value ?? ''}
        readOnly={readOnly}
        style={style}
        data-tutorial-id={id ? `host.mois.field.${id}` : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(e.currentTarget.value) }}
      />
      <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots" title="Look up…">…</button>
    </span>
  )
}

function Field({ w, value, onChange, style, align, id, readOnly }: {
  w: number; value?: string; onChange?: (v: string) => void; style?: React.CSSProperties
  align?: 'center' | 'right'; id?: string; readOnly?: boolean
}) {
  return (
    <PBInput
      w={w}
      align={align}
      /* a field this window does not track is still an edit box: uncontrolled */
      {...(onChange || readOnly ? { value: value ?? '' } : { defaultValue: value ?? '' })}
      readOnly={readOnly}
      style={style}
      data-tutorial-id={id ? `host.mois.field.${id}` : undefined}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

/** A radio group; each radio carries its `value`, so `host.mois.enterField`
    can pick one through the group's anchor. */
function Radios<T extends string>({ name, options, value, onChange, at, bold }: {
  name: string
  options: { value: T; label: string; x: number; dy?: number }[]
  value: T
  onChange?: (v: T) => void
  at?: string
  bold?: boolean
}) {
  return (
    <span data-tutorial-id={at ? `host.mois.field.${at}` : undefined}>
      {options.map((o) => (
        <At key={o.value} x={o.x} top={o.dy ?? 1}>
          <label className="pb-check pb-check--radio">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange?.(o.value)} />
            <span className="pb-check__box"><span className="pb-check__dot" /></span>
            <span className="pb-check__label" style={bold ? { fontWeight: 700 } : undefined}>{o.label}</span>
          </label>
        </At>
      ))}
    </span>
  )
}

const LOCATIONS = ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'T', 'U', 'V', 'W']

/** How the Insurance # stands, for the frame — never the number itself:
    empty, the chart's own PHN as it came in, one typed with a leading zero,
    or one typed without. */
function insuranceState(v: string, chartPhn?: string): 'empty' | 'chart-phn' | 'leading-zero' | 'entered' {
  const t = v.replace(/\s+/g, '')
  if (!t) return 'empty'
  if (chartPhn && t === chartPhn.replace(/\s+/g, '')) return 'chart-phn'
  return t.startsWith('0') ? 'leading-zero' : 'entered'
}

export function UnsentMspView({ onPrompt }: { onPrompt?: (prompt: ClaimPrompt) => void }) {
  const roster = usePatientRoster()
  const [stored, setStored] = useSessionState<ClaimForm | null>(UNSENT_CLAIM_KEY, null)
  const [, setAdded] = useSessionState<UnsentClaim[]>(UNSENT_ADDED_KEY, [])
  const [missing, setMissing] = useState<string[]>([])
  const c = stored ?? initialClaim
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

  const newClaim = () => { setMissing([]); setStored(blankClaim(MOIS_TODAY, c.doctor)) }
  const save = () => {
    const gaps = missingFields(c)
    setMissing(gaps)
    const status = gaps.length ? 'Incomplete' : 'Complete'
    if (c.state === 'new') {
      setAdded((rows) => [...rows, {
        chart: c.chart, last: c.last, first: c.first, service: c.serviceDate, doctor: c.doctor, fee: c.fee,
        dob: c.dob, insrBy: c.insuredBy, insrNbr: c.insurance, billed: c.unit,
        compl: status === 'Complete', hold: c.hold, sub: 'R',
      }])
    }
    setStored({ ...c, status, state: 'saved', created: c.created || `${MOIS_TODAY} 15:38 ADMINISTRATOR` })
  }

  useBillingCommands((cmd) => {
    if (cmd === 'new-claim') newClaim()
    else if (cmd === 'save-claim') save()
    else if (cmd === 'prompt-patient') onPrompt?.('patient')
    else if (cmd === 'prompt-doctor') onPrompt?.('doctor')
    else if (cmd === 'prompt-service') onPrompt?.('service')
    else if (cmd === 'prompt-chart') onPrompt?.('chart')
  })

  useScreenReport({
    claim: c.state,
    insuredBy: c.insuredBy,
    insurance: insuranceState(c.insurance, roster.find((r) => r.chart === c.chart)?.insurance),
    claimStatus: c.status.toLowerCase(),
  })

  return (
    <>
      <PBViewHeader title="Unsent MSP" />
      <PBCommandRow commands={[
        { label: 'New Claim', onClick: newClaim },
        { label: 'Delete Claim' },
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
              <span className="pb-inputgroup" style={{ width: 139 }}>
                <input className="pb-field" readOnly value={c.doctor.split(',')[0] + (c.doctor.includes(',') ? ', ' + (c.doctor.split(',')[1] ?? '').trim().slice(0, 1) + '.' : '')}
                  style={{ background: '#f4b4b4', color: '#800000', fontWeight: 700 }} />
                <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
              </span>
            </At>
            <RL end={578}>Claim Status:</RL>
            <Radios name="claim-status" bold value={c.status} options={[
              { value: 'Complete', label: 'Complete', x: 583 },
              { value: 'Incomplete', label: 'Incomplete', x: 668 },
            ]} />
            <At x={752}><PBButton size="sm" style={{ minWidth: 17, width: 17, padding: 0 }}>…</PBButton></At>
            <RL end={838} red={red('chart')}>Chart:</RL>
            <At x={842}>
              <Dots w={62} value={c.chart} id="claim-chart" onChange={(v) => fromChart(v)} onEnter={(v) => fromChart(v)} />
            </At>
            <At x={925}>
              <PBButton
                style={{ width: 76, height: 32, lineHeight: 1.05, whiteSpace: 'normal', padding: 0 }}
                onClick={() => c.chart && fromChart(c.chart)}
              >
                Refresh Patient Data
              </PBButton>
            </At>
          </Line>
          <Line>
            <At x={583}><PBCheckbox label="Hold Claim" checked={c.hold} onChange={(v) => set({ hold: v })} /></At>
            <At x={665}><Field w={140} value={c.holdReason} onChange={(v) => set({ holdReason: v })} /></At>
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
            <RL end={731}>Dep. No.:</RL>
            <At x={733}><Field w={40} value={c.dep} onChange={(v) => set({ dep: v })} /></At>
            <RL end={838}>DoB:</RL>
            <At x={840}><Field w={79} value={c.dob} style={G} readOnly /></At>
            <At x={928} top={3}><span style={{ color: '#404040' }}>(read-only)</span></At>
          </Line>
        </Band>

        <Band caption="SERVICE:">
          <Line>
            <LL red={red('serviceDate')}>Service Date:</LL>
            <At x={346}><Field w={92} value={c.serviceDate} onChange={(v) => set({ serviceDate: v })} /></At>
            <RL end={578} red={red('location')}>Location:</RL>
            <At x={580}><PBSelect w={69} options={LOCATIONS} value={c.location} onChange={(e) => set({ location: e.target.value })} /></At>
            <RL end={838}>Service To Date:</RL>
            <At x={840}><Field w={41} value={c.serviceTo} onChange={(v) => set({ serviceTo: v })} /></At>
          </Line>
          <Hair />
          <Line>
            <LL>No. Service:</LL>
            <At x={346}><Field w={92} align="right" value={c.noService} onChange={(v) => set({ noService: v })} /></At>
            <At x={500} top={3}><span className="pb-form__label" style={{ color: red('diag1') ? '#e00000' : undefined }}>Diag Code(s)</span></At>
            <RL end={578}>1:</RL>
            <At x={581}><Dots w={60} value={c.diag1} style={c.diag1.trim() ? undefined : PK} id="claim-diag-1" onChange={(v) => set({ diag1: v })} /></At>
            <At x={740} top={3}><span className="pb-form__label">Time(s)</span></At>
            <RL end={838}>Received:</RL>
            <At x={840}><Field w={62} align="center" value=":" /></At>
          </Line>
          <Line>
            <LL red={red('fee')}>Fee Item:</LL>
            <At x={346}>
              <Field w={24} value={c.clarification} onChange={(v) => set({ clarification: v.toUpperCase() })} />
              <span>-</span>
              <Dots w={58} value={c.fee} style={Y} onChange={(v) => set({ fee: v })} />
            </At>
            <RL end={578}>2:</RL>
            <At x={581}><Dots w={60} value={c.diag2} onChange={(v) => set({ diag2: v })} /></At>
            <RL end={838}>Start:</RL>
            <At x={840}><Field w={62} align="center" value=":" /></At>
          </Line>
          <Line>
            <LL red={red('unit')}>Unit Amount:</LL>
            <At x={346}><Field w={92} align="right" value={c.unit} style={Y} onChange={(v) => set({ unit: v })} /></At>
            <RL end={578}>3:</RL>
            <At x={581}><Dots w={60} value={c.diag3} onChange={(v) => set({ diag3: v })} /></At>
            <RL end={838}>Finish:</RL>
            <At x={840}><Field w={62} align="center" value=":" /></At>
          </Line>
          <Hair />
          <Line>
            <LL>Pay Mode:</LL>
            <Radios name="pay-mode" value={c.payMode} onChange={(v) => set({ payMode: v })} options={[
              { value: 'Normal', label: 'Normal', x: 348 },
            ]} />
            <RL end={578}>After-Hour Ind.:</RL>
            <Radios name="after-hour" value={c.afterHour} onChange={(v) => set({ afterHour: v })} options={[
              { value: 'Normal', label: 'Normal', x: 584 },
              { value: 'Night', label: 'Night', x: 666 },
            ]} />
            <RL end={838}>Anatomic Area:</RL>
            <At x={842}><Field w={42} value="00" /></At>
          </Line>
          <Line>
            <Radios name="pay-mode" value={c.payMode} onChange={(v) => set({ payMode: v })} options={[
              { value: 'Alternate', label: 'Alternate', x: 348 },
            ]} />
            <Radios name="after-hour" value={c.afterHour} onChange={(v) => set({ afterHour: v })} options={[
              { value: 'Even', label: 'Even', x: 584 },
              { value: 'W/end', label: 'W/end', x: 666 },
            ]} />
            <RL end={838}>NPI:</RL>
            <At x={842}><Field w={42} value="00" /></At>
          </Line>
        </Band>

        <Band caption="REFER:">
          {[1, 2].map((n) => (
            <Line key={n}>
              <LL>Ref To/By:</LL>
              <Radios name={`ref-${n}`} value="N/A" options={[
                { value: 'N/A', label: 'N/A', x: 348 },
                { value: 'To', label: 'To', x: 390 },
                { value: 'By', label: 'By', x: 427 },
              ]} />
              <RL end={578}>Pract. No.:</RL>
              <At x={581}><Dots w={72} /></At>
            </Line>
          ))}
        </Band>

        <Band caption="OPTIONS:">
          <Line>
            <LL>MVA:</LL>
            <Radios name="mva" value="No" options={[
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
            <At x={346}><Dots w={102} /></At>
            <RL end={578}>Memo:</RL>
            <At x={581}><Field w={212} /></At>
          </Line>
          <Line>
            <LL>Sub Code:</LL>
            <At x={346}><PBSelect w={66} options={['0', 'A', 'C', 'D', 'E', 'I', 'R', 'W', 'X']} /></At>
            <RL end={578}>Claim Note:</RL>
            <At x={581}><Field w={212} /></At>
          </Line>
          <Line h={38}>
            <LL>Ext. Sub Cd:</LL>
            <At x={346}><PBSelect w={66} options={['']} /></At>
            <At x={420} top={3}><span>(future use)</span></At>
            <RL end={578}>MSP Note:</RL>
            <At x={579}><PBTextArea rows={2} w={410} style={{ height: 35, resize: 'none' }} /></At>
          </Line>
          <Hair />
          <Line>
            <LL>DoB:</LL>
            <At x={346}><Field w={90} /></At>
            <RL end={578}>Sex:</RL>
            <At x={580}><PBSelect w={60} options={['', 'F', 'M']} /></At>
          </Line>
          <Line>
            <LL>Address</LL>
            <RL end={343}>1:</RL>
            <At x={346}><Field w={196} /></At>
            <RL end={578}>3:</RL>
            <At x={580}><Field w={196} /></At>
          </Line>
          <Line>
            <RL end={343}>2:</RL>
            <At x={346}><Field w={196} /></At>
            <RL end={578}>4:</RL>
            <At x={580}><Field w={196} /></At>
          </Line>
          <Line>
            <LL>Postal Code:</LL>
            <At x={346}><Field w={64} /></At>
          </Line>
        </Band>

        <Band caption="WCB:">
          <Line>
            <LL>WCB No.</LL>
            <At x={346}><Dots w={90} /></At>
            <RL end={578}>Date of Injury:</RL>
            <At x={581}><Field w={90} /></At>
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
            <At x={580}><Field w={60} value="00000" /></At>
            <At x={660} top={3}><span className="pb-form__label">PBF Class.</span></At>
            <RL end={838}>Prev. Seq. No.:</RL>
            <At x={840}><Field w={128} style={G} readOnly /></At>
          </Line>
          <Line>
            <LL>Payee No.:</LL>
            <At x={346} top={3}><span>54321</span></At>
            <At x={400}><PBCheckbox label="Change Payee" /></At>
            <RL end={578}>Sub Facility:</RL>
            <At x={580}><Field w={60} value="00000" /></At>
            <At x={660}><Field w={76} value="FFS" style={G} readOnly /></At>
            <RL end={838}>Payor:</RL>
            <At x={840}><Field w={128} style={G} readOnly /></At>
          </Line>
          <Line>
            <At x={206} top={3}><span className="pb-form__label">Created:</span></At>
            <At x={273} top={3}><span>{c.created ? c.created.replace(' ', '  ') : ''}</span></At>
          </Line>
        </Band>
      </Body>
    </>
  )
}

/* --- Sent To MSP ---------------------------------------------------------- */

/** The Sent To MSP window's values: the training claim it opens on, or the
    claim a Prompt - Recon / Prompt - Chart pick loaded (SENT_CLAIM_KEY). */
type SentView = {
  doctor: string; chart: string; first: string; last: string; insuredBy: string; insurance: string; dob: string
  recon: [string, string]; billed: string; writeOff: string; netPaid: string; sent: string; paid: string
  expl: string[]; service: string; location: string; fee: string; diag: string; pract: string; payee: string
}

const TRAINING_SENT: SentView = {
  doctor: 'BEARDWOOD, WALTER', chart: '10035', first: 'FARMER', last: 'BROWN', insuredBy: 'BC',
  insurance: '9151259051', dob: '1990.10.23', recon: ['P', ''], billed: '71.50', writeOff: 'N',
  netPaid: '71.50', sent: '2026.03.19', paid: '2026.04.02', expl: [], service: '2026.03.18',
  location: 'A', fee: '13060', diag: '780', pract: '12345', payee: '00001',
}

function sentView(c: SentClaim): SentView {
  const who = sentClaimPatient(c)
  const paid = c.paid === '-' ? '' : c.paid
  return {
    doctor: c.doctor, chart: who?.chart ?? '', first: c.first, last: c.last, insuredBy: c.ins,
    insurance: who?.insrNbr ?? '', dob: who?.dob ?? '', recon: [c.r1, c.r2], billed: c.billed,
    writeOff: c.wo, netPaid: paid, sent: c.sent, paid: paid ? c.sent : '',
    expl: [c.e1, c.e2, c.e3].filter(Boolean), service: c.service, location: 'A', fee: c.fee,
    diag: c.diag, pract: c.pract, payee: c.payee,
  }
}

export function SentMspView({ onPrompt }: { onPrompt?: (prompt: 'recon' | 'chart') => void }) {
  /* Resubmit Claim asks first — 303501: 'MOIS will prompt you and ask
     "Would you like to resubmit the current claim?", select YES' */
  const [resubmitting, setResubmitting] = useState(false)
  const [picked] = useSessionState<SentClaim | null>(SENT_CLAIM_KEY, null)
  const v = picked ? sentView(picked) : TRAINING_SENT
  useScreenReport({
    sentClaim: picked ? picked.last.toLowerCase() : 'training',
    ...(resubmitting ? { dialog: 'resubmit-claim' } : {}),
  })
  useBillingCommands((cmd) => {
    if (cmd === 'prompt-recon') onPrompt?.('recon')
    else if (cmd === 'prompt-chart') onPrompt?.('chart')
  })
  return (
    <>
      <PBViewHeader title="Sent To MSP" />
      <PBCommandRow commands={[
        { label: 'Resubmit Claim', onClick: () => setResubmitting(true) }, { label: 'Debit Claim' }, { label: 'Duplicate Claim' },
        { label: 'Prompt - Recon', onClick: () => onPrompt?.('recon') },
        { label: 'Prompt - Chart', onClick: () => onPrompt?.('chart') },
        { label: 'Close Window' },
      ]} />
      {/* keyed on the claim: the read-only boxes take their values afresh
          when a Prompt pick loads another one */}
      <Body key={picked ? `${picked.last}:${picked.service}:${picked.fee}` : 'training'}>
        <Row>
          <L>Doctor:</L>
          <PBInput w={220} defaultValue={v.doctor} style={GREY} readOnly />
          <span style={{ flex: '1 1 auto' }} />
          <L w={92}>Sequence No.:</L>
          <PBInput w={120} defaultValue="0000012345" style={SALMON} />
        </Row>

        <Sect>PATIENT:</Sect>
        <Row>
          <L>Chart:</L>
          <PBInput w={110} defaultValue={v.chart} style={GREY} readOnly />
          <L w={70}>First Name:</L>
          <PBInput w={140} defaultValue={v.first} style={GREY} readOnly />
          <L w={70}>Last Name:</L>
          <PBInput w={160} defaultValue={v.last} style={GREY} readOnly />
        </Row>

        <Sect>IDENTITY:</Sect>
        <Row>
          <L>Insured By:</L>
          <PBInput w={44} defaultValue={v.insuredBy} style={GREY} readOnly />
          <L w={80}>Insurance #:</L>
          <PBInput w={120} defaultValue={v.insurance} style={GREY} readOnly />
          <L w={40}>DoB:</L>
          <PBInput w={100} defaultValue={v.dob} style={GREY} readOnly />
        </Row>

        <Sect>RECON:</Sect>
        <Row>
          <L>Code:</L>
          <PBInput w={24} align="center" defaultValue={v.recon[0]} style={GREY} readOnly />
          <PBInput w={24} align="center" defaultValue={v.recon[1]} style={GREY} readOnly />
          <L w={54}>Billed:</L>
          <PBInput w={80} align="right" defaultValue={v.billed} style={GREY} readOnly />
          <L w={72}>Write Off:</L>
          <PBInput w={24} align="center" defaultValue={v.writeOff} style={GREY} readOnly />
          <L w={72}>Net Paid:</L>
          <PBInput w={80} align="right" defaultValue={v.netPaid} style={GREY} readOnly />
        </Row>
        <Row>
          <L>Sent:</L>
          <PBInput w={100} defaultValue={v.sent} style={GREY} readOnly />
          <L w={48}>Paid:</L>
          <PBInput w={100} defaultValue={v.paid} style={GREY} readOnly />
          <L w={92}>Expl Code(s):</L>
          {/* Action ▸ Detail Expl Code (Ctrl+E) explains these in Sent Claim
              Detail (screens/SentClaimDetailWindow.tsx) */}
          <span className="pb-row" style={{ gap: 0 }} data-tutorial-id="host.mois.field.expl-codes">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <PBInput key={i} w={24} align="center" defaultValue={v.expl[i] ?? ''} style={GREY} readOnly />
            ))}
          </span>
        </Row>
        <Row>
          <L>Prev. Seq. No.:</L>
          <PBInput w={120} style={GREY} readOnly />
          <L w={104}>Next Seq No.:</L>
          <PBInput w={120} style={GREY} readOnly />
        </Row>

        <Sect>SERVICE:</Sect>
        <Row>
          <L>Service Date:</L>
          <PBInput w={100} defaultValue={v.service} style={GREY} readOnly />
          <L w={62}>Location:</L>
          <PBInput w={40} defaultValue={v.location} style={GREY} readOnly />
          <L w={54}>Fee Item:</L>
          <PBInput w={80} defaultValue={v.fee} style={GREY} readOnly />
          <L w={72}>Diag. 1:</L>
          <PBInput w={80} defaultValue={v.diag} style={GREY} readOnly />
        </Row>

        <Sect>OPTIONS:</Sect>
        <Row>
          <L>Referring 1:</L>
          <PBInput w={110} style={GREY} readOnly />
          <L w={92}>Referring 2:</L>
          <PBInput w={110} style={GREY} readOnly />
          <L w={128}>Office / MSP Note:</L>
          <PBInput w={200} style={GREY} readOnly />
        </Row>

        <Sect>OTHER:</Sect>
        <Row>
          <L>Pract. No.:</L>
          <PBInput w={90} defaultValue={v.pract} style={GREY} readOnly />
          <L w={76}>Payee No.:</L>
          <PBInput w={90} defaultValue={v.payee} style={GREY} readOnly />
          <L w={90}>PBF Class.:</L>
          <PBInput w={60} defaultValue="FFS" style={GREY} readOnly />
        </Row>
      </Body>
      {resubmitting && (
        <Prompt title="Resubmit Claim" buttons={['Yes', 'No']} onClose={() => setResubmitting(false)}>
          Would you like to resubmit the current claim?
        </Prompt>
      )}
    </>
  )
}

/* --- Invoice --------------------------------------------------------------
   303603 and its Action-menu capture `7726fa98` (v02.20.02): the header
   carries a Comment box ("will NOT show up on the invoice") and a Message box
   ("will show up on the invoice statement") under Payment Due, and the green
   Summary band prints a zero as a lone "-" at the right of each box — which
   is what "The Balance Owed field will be empty" looks like once Pay Balance
   has cleared it. Payment Method is a drop-down: "Cash, Cheque, Interact,
   Mastercard, Other or Visa" (303603 Transactions List).
   ------------------------------------------------------------------------ */

type Trans = {
  date: string; tran: string; serv: string; fee: string; dots: string
  unit: string; diag: string; dots2: string; method: string
  paid: string; adj: string; adjAmt: string
}

const BILLED: Trans = {
  date: '2026.03.18', tran: 'B', serv: '1', fee: '13060', dots: '…',
  unit: '71.50', diag: '780', dots2: '…', method: '', paid: '', adj: '', adjAmt: '',
}

const PAYMENT: Trans = {
  date: MOIS_TODAY, tran: 'P', serv: '', fee: '', dots: '',
  unit: '', diag: '', dots2: '', method: 'Visa', paid: '71.50', adj: '', adjAmt: '',
}

const PAYMENT_METHODS = ['Cash', 'Cheque', 'Interact', 'Mastercard', 'Other', 'Visa']

/** Billed − Paid − Written Off − Adjustments = Balance / Owed (art. 303603);
    MOIS's money format prints zero as "-". */
function money(n: number) { return Math.abs(n) < 0.005 ? '-' : n.toFixed(2) }

export function InvoiceView({ paid, onPaid }: { paid: boolean; onPaid: () => void }) {
  const [cur, setCur] = useState(0)
  const [method, setMethod] = useState(PAYMENT.method)
  const [writtenOff, setWrittenOff] = useState(0)
  const billed = 71.5
  const received = paid ? 71.5 : 0
  const owed = billed - received - writtenOff
  const rows = paid ? [BILLED, { ...PAYMENT, method }] : [BILLED]

  /* Pay Balance "creates a new line … Transaction code is P (paid) with the
     paid amount present"; W/O Balance writes the rest off. Both are also on
     the folder's Action menu (Ctrl+P, Ctrl+W) — data/menus/billing.ts. */
  const payBalance = () => { if (!paid && owed > 0) { onPaid(); setCur(1) } }
  const writeOff = () => { if (owed > 0) setWrittenOff((w) => w + owed) }
  useBillingCommands((cmd) => {
    if (cmd === 'pay-balance') payBalance()
    else if (cmd === 'write-off-balance') writeOff()
  })

  return (
    <>
      <PBViewHeader title="Invoice" />
      <PBCommandRow commands={[
        { label: 'New Invoice' }, { label: 'Delete Invoice' }, { label: 'Save' },
        { label: 'Statement' }, { label: 'Receipt' }, { label: 'Label' },
        { label: 'Add Payor' }, { label: 'Edit Payor' }, { label: 'Change Patient' },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '2px 8px 6px' }}>
        <div className="pb-row" style={{ gap: 26, flex: 'none', padding: '2px 0' }}>
          <span>Chart:&nbsp; 75</span><span>Patient: BETTY BOOP</span>
          <span>DoB: 1961.11.19</span><span>Insurance by: BC</span><span>Phone: (250) 555-5555</span>
        </div>
        <div className="pb-row" style={{ gap: 26, flex: 'none', padding: '0 0 3px' }}>
          <span>Alias:</span><span>Gender: F</span><span>Insurance No.: 9151252098</span>
          <span>Work: (250) 555-1234</span>
        </div>

        <Row>
          <L w={70}>Invoice #:</L>
          <PBInput w={90} defaultValue="1042" style={GREY} readOnly />
          <L w={62}>Provider:</L>
          <PBSelect w={200} options={['BEARDWOOD, WALTER']} style={YELLOW} />
          <L w={50}>Payor:</L>
          <PBSelect w={140} options={['SELF PAY', 'RCMP', 'ICBC']} style={YELLOW} />
          <L w={84}>Recon Code:</L>
          <PBInput w={30} align="center" defaultValue="U" style={GREY} readOnly />
        </Row>
        <Row>
          <L w={70}>Bill Date:</L>
          <span>1:</span><PBInput w={90} defaultValue="0000.00.00" />
          <span>2:</span><PBInput w={90} />
          <span>3:</span><PBInput w={90} />
          <L w={66}>Claim No.:</L>
          <PBLookup w={120} name="claim-no" />
          <L w={72}>Write Off:</L>
          <PBInput w={30} align="center" value={writtenOff > 0 ? 'Y' : 'N'} style={GREY} readOnly />
        </Row>
        <Row>
          <L w={92}>No. Billings:</L>
          <PBInput w={40} align="right" defaultValue="1" style={GREY} readOnly />
          <L w={84}>Invoice Code:</L>
          <PBSelect w={140} options={['Standard', 'Third Party']} />
          <L w={60}>Taxable:</L>
          <PBCheckbox label="Apply Tax" />
          <L w={90}>Payment Due:</L>
          <PBInput w={100} defaultValue="2026.04.17" />
        </Row>
        <div className="pb-row" style={{ gap: 6, flex: 'none', padding: '2px 0', alignItems: 'flex-start' }}>
          <L w={70}>Comment:</L>
          <PBTextArea rows={2} w={320} style={{ height: 40, resize: 'none' }} />
          <L w={62}>Message:</L>
          <PBTextArea rows={2} w={320} style={{ height: 40, resize: 'none' }} />
        </div>

        {/* the pale-green summary band */}
        <div style={{ background: '#c8ebdc', border: '1px solid #9ab5aa', margin: '5px 0', padding: '3px 6px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 10, justifyContent: 'center', fontWeight: 700 }}>
            <span style={{ width: 90, textAlign: 'center' }}>BILLED</span><span>-</span>
            <span style={{ width: 90, textAlign: 'center' }}>PAID</span><span>-</span>
            <span style={{ width: 90, textAlign: 'center' }}>WRITTEN OFF</span><span>-</span>
            <span style={{ width: 90, textAlign: 'center' }}>ADJUSTMENTS</span><span>=</span>
            <span style={{ width: 110, textAlign: 'center' }}>BALANCE / OWED</span>
          </div>
          <div className="pb-row" style={{ gap: 10, alignItems: 'center', paddingTop: 2 }}>
            <span className="pb-form__label" style={{ flex: '1 1 auto' }}>Summary:</span>
            <PBInput w={90} align="right" value={money(billed)} readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value={money(received)} readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value={money(writtenOff)} readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value={money(0)} readOnly style={GREY} />
            <span>=</span>
            <PBInput
              w={110}
              align="right"
              value={money(owed)}
              readOnly
              style={GREY}
              data-tutorial-id="host.mois.field.balance-owed"
            />
          </div>
          <div className="pb-row" style={{ gap: 8, justifyContent: 'center', paddingTop: 2 }}>
            <span className="pb-form__label">Balance ALL Invoices for this patient:</span>
            <PBInput w={90} align="right" value={money(owed)} readOnly style={PINK} />
          </div>
        </div>

        <PBCommandRow commands={[
          { label: 'New Trans' }, { label: 'Delete Trans' },
          { label: 'Pay Balance', onClick: payBalance },
          { label: 'W/O Balance', onClick: writeOff },
          { label: 'Paste MSP Claim' },
        ]} />
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, paddingTop: 3 }}>
          <PBDataWindow
            rows={rows}
            current={Math.min(cur, rows.length - 1)}
            onCurrentChange={setCur}
            rowTutorialId={(r) => `host.mois.row.trans-${r.tran.toLowerCase()}`}
            columns={[
              { key: 'date', header: 'Date', width: 83, align: 'center' },
              { key: 'tran', header: 'Tran Code', width: 44, align: 'center' },
              { key: 'serv', header: 'No. Serv', width: 60, align: 'center' },
              { key: 'fee', header: 'Fee Code', width: 74 },
              { key: 'dots', header: '', width: 16 },
              { key: 'unit', header: 'Unit Amount', width: 81, align: 'right' },
              { key: 'diag', header: 'Diag Code', width: 74 },
              { key: 'dots2', header: '', width: 16 },
              {
                key: 'method', header: 'Payment Method', width: 89,
                render: (r) => (r.tran === 'P'
                  ? (
                    <PBSelect
                      w="100%"
                      options={PAYMENT_METHODS}
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      data-tutorial-id="host.mois.field.payment-method"
                    />
                  )
                  : r.method),
              },
              { key: 'paid', header: 'Paid Amount', width: 81, align: 'right' },
              { key: 'adj', header: 'Adj Code', width: 65 },
              { key: 'adjAmt', header: 'Adjustment Amount', width: 81, align: 'right' },
            ]}
          />
        </div>
        <div className="pb-row" style={{ flex: 'none', padding: '2px 0', color: '#404040' }}>
          Created:&nbsp;&nbsp;2026.03.18 16:08 ADMINISTRATOR
        </div>
      </div>
    </>
  )
}
