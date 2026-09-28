import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  billingPrograms, entriesFor, hours, LFP_SERVICES, LFP_TIME_CODES, LFP_TODAY, lfpProviderOf,
  lfpRegisteredProviders, minutesOfEntry, PAYMENT_MODES, shiftStamp, useBillingPrograms,
  type LfpProvider, type LfpService, type LfpSetup, type LfpState,
} from '../data/billingPrograms'
import { useScreenReport } from '../host/screen-state'
import { registerScreenWindows, useScreenWindow } from '../host/screen-windows'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBSelect, PBViewHeader, pbSlug,
} from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from './areaWindowRegistry'
import { Ask, BlueHead, Dim, Field, FilterGroup, RadioSet, ScreenDialog } from './billingProgramsKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Billing ▸ LFP Management — LFP Setup, Provider Registration and Provider
   Time Summary, with the two registration windows Provider Registration
   opens.

   PROVENANCE (art. 3166420 "Longitudinal Family Physician (LFP) Payment
   Model", the user's cloud build v02.31.41 unless noted):
   - LFP - Setup                       `7280452f…` (1507 × 1125)
   - LFP Provider Registration         `7a6c86da…` (1510 × 1120) — the
     filter strip, the banded grid header (LFP Enrollment over Family Phy. /
     Locum, Registered Services over the four services) and the Status
     legend strip along the foot
   - Provider Profile - LFP Registration Information   `8ae8a25a…`
   - Update LFP Enrollment / Service Registration      `a0e689b3…`
   - LFP Provider Time Review          `94b5226d…` (v02.30.12, the only
     capture; its grid is empty)

   Behaviour is the article's text:
   - "Double-click the provider row to open the Provider or Locum Profile -
     LFP Registration Information window … Click Update
     Enrollment/Registration … check off … Enter the Start Date. Click
     Continue. … the provider or locum status changes to: Pending
     Submission." Prepare Bills then Refresh gives Pending Approval;
     Reconcile Remittance then Refresh gives the final status
     (data/billingPrograms.ts `prepareBills` / `reconcile`).
   - The grid shows what was read at the last Refresh (or the window's own
     change), the way a DataWindow retrieve does.

   INFERRED
   - how a registration Pending Submission is drawn: no capture shows one.
     It is the Pending glyph `✓*` greyed.
   - the Provider Time Review's In the Last / Range fields (the capture
     shows the four radios only) and the MSP Billing Status wording.
   - the LFP Setup Save confirmation.

   Window ids: screen window `lfp-provider-profile` (args { provider });
   area window `lfp-update-registration` (args { provider }). Time
   Management (`time-entry`) and the Time Logger (`time-logger`) are in
   screens/LfpTimeWindows.tsx.
   ========================================================================= */

export const LFP_WINDOWS = { profile: 'lfp-provider-profile' } as const
registerScreenWindows(Object.values(LFP_WINDOWS))

const NAVY = '#0b3d8c'

/** The navy caption and rule of an LFP window section ("Configuration"). */
function SectionHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="pb-row" style={{ borderBottom: '1px solid #b8b8b8', padding: '6px 10px 2px', flex: 'none' }}>
      <b style={{ color: NAVY }}>{children}</b>
      {right && <><span className="pb-row__spacer" />{right}</>}
    </div>
  )
}

/* --- LFP - Setup ----------------------------------------------------------- */

export function LfpSetupView({ onClose }: { onClose?: () => void }) {
  const s = useBillingPrograms()
  const [draft, setDraft] = useState<LfpSetup>(s.lfpSetup)
  const [cur, setCur] = useState(0)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(s.lfpSetup)
  const patch = (p: Partial<LfpSetup>) => { setDraft((d) => ({ ...d, ...p })); setSaved(false) }

  useScreenReport({
    lfpActive: draft.active,
    timeClaimWizard: draft.wizard,
    draft: dirty,
    saved: saved && !dirty,
    row: LFP_TIME_CODES[cur] ? `lfp-${LFP_TIME_CODES[cur]!.code}` : null,
  })

  return (
    <>
      <PBViewHeader title="LFP - Setup" />
      <PBCommandRow commands={[
        { label: 'Save', onClick: () => { billingPrograms.saveLfpSetup(draft); setSaved(true) } },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <SectionHead>Configuration</SectionHead>
      <div className="pb-row" style={{ gap: 18, padding: '6px 14px', alignItems: 'flex-start', flex: 'none' }}>
        <PBCheckbox label="Activate Longitudinal Family Physician Model" checked={draft.active} onChange={(v) => patch({ active: v })} tutorialId="host.mois.field.lfp-activate" />
        <PBCheckbox label="Enable Time Claim Wizard" checked={draft.wizard} onChange={(v) => patch({ wizard: v })} tutorialId="host.mois.field.lfp-time-claim-wizard" />
        <div>
          <Field id="lfp-payor-codes" label="LFP Payor Codes:" value={draft.payors} onChange={(v) => patch({ payors: v })} w={200} />
          <Dim style={{ display: 'block', paddingLeft: 108, fontSize: 10, lineHeight: '12px' }}>
            (comma separated list of Payor Code(s) used<br />by the Claim Wizard to identify LFP Appts)
          </Dim>
        </div>
      </div>
      <SectionHead>Claim Codes</SectionHead>
      <div style={{ padding: '6px 14px 10px', flex: 'none' }}>
        <Field id="lfp-diagnosis" label={<Dim>Diagnosis:</Dim>} labelW={140} value={draft.diagnosis} onChange={(v) => patch({ diagnosis: v })} w={110} align="center" />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', borderTop: '1px solid #b8b8b8' }}>
        <PBDataWindow
          columns={[
            { key: 'code', header: 'Time Code', width: 90 },
            { key: 'description', header: 'Description', width: 440 },
            {
              key: 'location', header: 'Location', width: 110, align: 'center',
              render: (r) => (
                <PBInput
                  w={100}
                  align="center"
                  value={draft.locations[r.code] ?? ''}
                  onChange={(e) => patch({ locations: { ...draft.locations, [r.code]: e.target.value.toUpperCase().slice(0, 1) } })}
                  data-tutorial-id={`host.mois.field.lfp-location-${r.code}`}
                  style={{ height: 17 }}
                />
              ),
            },
          ]}
          rows={LFP_TIME_CODES}
          current={cur}
          onCurrentChange={setCur}
          gutter={false}
          rowTutorialId={(r) => `host.mois.row.lfp-${r.code}`}
        />
      </div>
    </>
  )
}

/* --- LFP Provider Registration ---------------------------------------------- */

const GLYPH: Record<LfpState, ReactNode> = {
  '': '-',
  'pending-submission': <span title="Pending Submission" style={{ color: '#9a9a9a' }}>✓*</span>,
  'pending-approval': <span title="Pending MSP approval" style={{ color: '#1f8a2c' }}>✓*</span>,
  current: <span title="Current" style={{ color: '#1f8a2c', fontWeight: 700 }}>✓</span>,
  expiring: <span title="Expiring Soon" style={{ color: '#c00000' }}>⚠</span>,
  expired: <span title="Expired" style={{ color: '#c00000', fontWeight: 700 }}>✗</span>,
}

const SERVICE_LABEL: Record<LfpService, string> = {
  clinic: 'Clinic Based Services', inpatient: 'Inpatient Service', ltc: 'LTC/Palliative Care Service', pregnancy: 'Pregnancy / Newborn Service',
}

type RegStatus = 'Any status' | 'Currently Active' | 'Expiring Soon' | 'Has Expired'
const REG_STATUSES: RegStatus[] = ['Any status', 'Currently Active', 'Expiring Soon', 'Has Expired']

const allStates = (p: LfpProvider): LfpState[] => [p.family, p.locum, ...LFP_SERVICES.map((k) => p.services[k])]

/** One slug for a provider's registration, for `host.screen.lfpStatus`. */
export function lfpStatusSlug(p: LfpProvider | undefined): string {
  if (!p) return 'none'
  const states = allStates(p)
  for (const s of ['pending-submission', 'pending-approval', 'expired', 'expiring', 'current'] as LfpState[]) {
    if (states.includes(s)) return s
  }
  return 'not-enrolled'
}

export function LfpRegistrationView({ onClose }: { onClose?: () => void }) {
  const s = useBillingPrograms()
  const win = useScreenWindow()
  const [shown, setShown] = useState<LfpProvider[]>(s.lfp)
  const [family, setFamily] = useState(true)
  const [locum, setLocum] = useState(true)
  const [notEnrolled, setNotEnrolled] = useState(true)
  const [services, setServices] = useState<Record<LfpService, boolean>>({ clinic: false, ltc: false, inpatient: false, pregnancy: false })
  const [status, setStatus] = useState<RegStatus>('Any status')
  const [cur, setCur] = useState(0)

  /* the window's own changes show at once; MSP's show on Refresh */
  useEffect(() => {
    if (s.last === 'lfp-registration-requested' || s.last === 'lfp-profile-saved') setShown(s.lfp)
  }, [s.last, s.lfp])

  const rows = useMemo(() => shown.filter((p) => {
    const isFamily = !!p.family; const isLocum = !!p.locum
    if (!((family && isFamily) || (locum && isLocum) || (notEnrolled && !isFamily && !isLocum))) return false
    const wanted = LFP_SERVICES.filter((k) => services[k])
    if (wanted.length && !wanted.some((k) => p.services[k])) return false
    const states = allStates(p)
    if (status === 'Currently Active') return states.includes('current')
    if (status === 'Expiring Soon') return states.includes('expiring')
    if (status === 'Has Expired') return states.includes('expired')
    return true
  }), [shown, family, locum, notEnrolled, services, status])

  const current = rows[cur]
  const open = (p: LfpProvider | undefined) => { if (p) win.open(LFP_WINDOWS.profile, { provider: p.provider }) }

  useScreenReport({
    row: current ? `lfp-${pbSlug(current.provider.split(',')[0] ?? '')}` : null,
    lfpStatus: lfpStatusSlug(current ? s.lfp.find((p) => p.provider === current.provider) : undefined),
    lfpShownStatus: lfpStatusSlug(current),
    rows: rows.length,
  })

  const cell = (v: LfpState) => GLYPH[v]

  return (
    <>
      <PBViewHeader title="LFP Provider Registration" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => setShown(billingPrograms.get().lfp) },
        { label: 'Enroll/Register', onClick: () => open(current) },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ alignItems: 'stretch', gap: 8, padding: '4px 6px', flex: 'none', flexWrap: 'wrap' }}>
        <FilterGroup title="Enrolled as">
          <PBCheckbox label="Family Physician" checked={family} onChange={setFamily} tutorialId="host.mois.field.lfp-enrolled-family" />
          <div><PBCheckbox label="Locum Physician" checked={locum} onChange={setLocum} tutorialId="host.mois.field.lfp-enrolled-locum" /></div>
          <div><PBCheckbox label="Not enrolled" checked={notEnrolled} onChange={setNotEnrolled} tutorialId="host.mois.field.lfp-enrolled-none" /></div>
        </FilterGroup>
        <FilterGroup title="Registered services">
          <div style={{ paddingBottom: 2 }}><Dim>Option:</Dim>&nbsp; Show all providers regardless of registered service(s)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 16, rowGap: 3 }}>
            {(['clinic', 'inpatient', 'ltc', 'pregnancy'] as LfpService[]).map((k) => (
              <PBCheckbox key={k} label={SERVICE_LABEL[k]} checked={services[k]} onChange={(v) => setServices((x) => ({ ...x, [k]: v }))} tutorialId={`host.mois.field.lfp-service-${k}`} />
            ))}
          </div>
        </FilterGroup>
        <FilterGroup title="Enrollment / Registration Status">
          <RadioSet group="lfp-status" options={REG_STATUSES} value={status} onChange={(v) => { setStatus(v); setCur(0) }} columns={2} />
        </FilterGroup>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={[
            { key: 'provider', header: 'Provider', width: 250, render: (p) => `(${p.prefix}) ${p.provider}` },
            { key: 'mode', header: 'Type', width: 60 },
            { key: 'facility', header: 'Facility No.', width: 80 },
            { key: 'family', header: <>LFP Enrollment<br />Family Phy.</>, width: 88, align: 'center', render: (p) => cell(p.family) },
            { key: 'locum', header: <><br />Locum</>, width: 60, align: 'center', render: (p) => cell(p.locum) },
            { key: 'clinic', header: <>Registered Services<br />Clinic Based</>, width: 112, align: 'center', render: (p) => cell(p.services.clinic) },
            { key: 'ltc', header: <><br />LTC/Palliative Care</>, width: 124, align: 'center', render: (p) => cell(p.services.ltc) },
            { key: 'inpatient', header: <><br />Inpatient</>, width: 70, align: 'center', render: (p) => cell(p.services.inpatient) },
            { key: 'pregnancy', header: <><br />Pregnancy / Newborn</>, width: 130, align: 'center', render: (p) => cell(p.services.pregnancy) },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(p) => open(p)}
          rowTutorialId={(p) => `host.mois.row.lfp-${pbSlug(p.provider.split(',')[0] ?? '')}`}
          empty="No providers match those options."
        />
      </div>
      <div data-tutorial-id="host.mois.field.lfp-status-legend" style={{ background: '#c4c4c4', padding: '3px 8px', flex: 'none', color: '#202020', display: 'flex', gap: 22, justifyContent: 'flex-end' }}>
        <span>Status:</span>
        <span>{GLYPH.current} Current</span>
        <span>{GLYPH['pending-approval']} Pending MSP approval</span>
        <span>{GLYPH.expiring} Expiring Soon</span>
        <span>{GLYPH.expired} Expired</span>
      </div>

      {win.is(LFP_WINDOWS.profile) && (
        <LfpProfileWindow provider={String(win.window?.args?.provider ?? '')} onClose={win.close} />
      )}
    </>
  )
}

/* --- Provider Profile - LFP Registration Information ----------------------- */

function LfpProfileWindow({ provider, onClose }: { provider: string; onClose: () => void }) {
  const s = useBillingPrograms()
  const openWindow = useOpenWindow()
  const p = lfpProviderOf(s, provider)
  const [form, setForm] = useState(() => ({
    practitioner: p?.practitioner ?? '', payee: p?.payee ?? '', mode: p?.mode ?? '',
    location: p?.location ?? '', facility: p?.facility ?? '', subFacility: p?.subFacility ?? '',
    defaultCode: '', f11: '', f12: '',
  }))
  const [cur, setCur] = useState(0)
  useScreenReport({ paymentMode: pbSlug(form.mode || 'none'), lfpStatus: lfpStatusSlug(p), registrationClaims: p?.claims.length ?? 0 })
  if (!p) return null
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const label = { color: '#8a8a8a', width: 118, flex: 'none' as const }

  return (
    <ScreenDialog id="lfp-provider-profile" title="Provider Profile - LFP Registration Information" width={1107} height={700} onClose={onClose}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '8px 8px 0', border: '1px solid #a0a0a0', background: '#fff' }}>
        <BlueHead><b style={{ fontSize: 13 }}>({p.prefix}) {p.provider}</b></BlueHead>
        <div className="pb-row" style={{ alignItems: 'flex-start', padding: '6px 10px 10px', gap: 40, borderBottom: '1px solid #a0a0a0', flex: 'none' }}>
          <div>
            <b style={{ color: NAVY }}>MSP / Billing Information</b>
            <div className="pb-row" style={{ gap: 6, paddingTop: 4 }}><span style={label}>Practitioner No.:</span><PBInput w={156} value={form.practitioner} onChange={(e) => set('practitioner')(e.target.value)} data-tutorial-id="host.mois.field.lfp-practitioner-no" /><Dim>(MSP Practitioner Number)</Dim></div>
            <div className="pb-row" style={{ gap: 6, paddingTop: 4 }}><span style={label}>Payee No.:</span><PBInput w={156} value={form.payee} onChange={(e) => set('payee')(e.target.value)} data-tutorial-id="host.mois.field.lfp-payee-no" /><Dim>(MSP Payee Number)</Dim></div>
            <div className="pb-row" style={{ gap: 6, paddingTop: 4 }}>
              <span style={label}>Payment Mode:</span>
              <PBSelect w={304} options={PAYMENT_MODES.map((m) => ({ value: m.code, label: m.label }))} value={form.mode} onChange={(e) => set('mode')(e.target.value)} data-tutorial-id="host.mois.field.lfp-payment-mode" />
            </div>
            <div className="pb-row" style={{ gap: 6, paddingTop: 4 }}>
              <span style={label}>MSP Location:</span>
              <PBSelect w={110} options={['', 'L', 'A', 'C', 'I', 'E']} value={form.location} onChange={(e) => set('location')(e.target.value)} data-tutorial-id="host.mois.field.lfp-msp-location" />
            </div>
            <div className="pb-row" style={{ gap: 6, paddingTop: 4 }}><span style={label}>Facility:</span><PBInput w={110} value={form.facility} onChange={(e) => set('facility')(e.target.value)} data-tutorial-id="host.mois.field.lfp-facility" /></div>
            <div className="pb-row" style={{ gap: 6, paddingTop: 4 }}><span style={label}>Sub-Facility</span><PBInput w={110} value={form.subFacility} onChange={(e) => set('subFacility')(e.target.value)} data-tutorial-id="host.mois.field.lfp-sub-facility" /></div>
          </div>
          <div>
            <b style={{ color: NAVY }}>Quick Entry Fee Codes:</b>
            {([['Default Code:', 'defaultCode'], ['F11 Code:', 'f11'], ['F12 Code:', 'f12']] as const).map(([l, k]) => (
              <div key={k} className="pb-row" style={{ gap: 6, paddingTop: k === 'defaultCode' ? 4 : 30 }}>
                <span style={{ ...label, width: 104 }}>{l}</span>
                <PBLookup w={108} value={form[k]} onChange={set(k)} name={`lfp-${k}`} fieldId={`host.mois.field.lfp-${pbSlug(k)}`} />
              </div>
            ))}
          </div>
        </div>
        <BlueHead style={{ padding: '4px 10px' }}>
          <div className="pb-row"><b>LFP Enrollment / Service Registration Claim Summary</b><span className="pb-row__spacer" /><Dim style={{ paddingRight: 90 }}>Reconciliation Code</Dim></div>
        </BlueHead>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.field.lfp-claim-summary">
          <PBDataWindow
            gutter={false}
            columns={[
              { key: 'service', header: 'Service Date', width: 110 },
              { key: 'seq', header: 'Sequence No.', width: 110 },
              { key: 'code', header: 'Claim Code', width: 100 },
              { key: 'description', header: 'Description', width: 470 },
              { key: 'r1', header: 'R1', width: 90, align: 'center' },
              { key: 'r2', header: 'R2', width: 90, align: 'center' },
            ]}
            rows={p.claims}
            current={cur}
            onCurrentChange={setCur}
            empty=" "
          />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '8px 8px 10px', gap: 10, flex: 'none' }}>
        <DialogButton id="lfp-update-enrollment" width={232} onClick={() => openWindow('lfp-update-registration', { provider })}>Update Enrollment/Registration</DialogButton>
        <span style={{ width: 160 }} />
        <DialogButton id="lfp-profile-save" width={132} onClick={() => {
          billingPrograms.saveLfpProfile(provider, {
            practitioner: form.practitioner, payee: form.payee, mode: form.mode as LfpProvider['mode'],
            location: form.location, facility: form.facility, subFacility: form.subFacility,
          })
          onClose()
        }}>Save</DialogButton>
        <DialogButton id="lfp-profile-cancel" width={132} onClick={onClose}>Cancel</DialogButton>
      </div>
    </ScreenDialog>
  )
}

/* --- Update LFP Enrollment / Service Registration --------------------------- */

const STATE_TEXT: Record<LfpState, string> = {
  '': '-', 'pending-submission': 'Pending Submission', 'pending-approval': 'Pending Approval',
  current: 'Registered', expiring: 'Expiring Soon', expired: 'Expired',
}

export function UpdateLfpRegistrationWindow({ args, close }: AreaWindowProps) {
  const s = useBillingPrograms()
  const provider = String(args.provider ?? '')
  const p = lfpProviderOf(s, provider)
  const [enrol, setEnrol] = useState<'' | 'family' | 'locum'>('')
  const [svc, setSvc] = useState<Record<LfpService, boolean>>({ clinic: false, ltc: false, inpatient: false, pregnancy: false })
  const [start, setStart] = useState('')
  const [problem, setProblem] = useState('')
  const picked = LFP_SERVICES.filter((k) => svc[k])
  useScreenReport({ lfpEnrol: enrol || 'none', lfpServices: picked.length, startDate: !!start.trim(), prompt: problem ? 'lfp-update-incomplete' : null })
  if (!p) return null

  const row = (id: string, label: string, checked: boolean, onChange: (v: boolean) => void, current: LfpState) => (
    <div className="pb-row" style={{ padding: '3px 10px', borderBottom: '1px solid #eee' }}>
      <PBCheckbox label={label} checked={checked} onChange={onChange} tutorialId={`host.mois.field.lfp-${id}`} />
      <span className="pb-row__spacer" />
      <span style={{ width: 150, textAlign: 'center' }}>{STATE_TEXT[current]}</span>
    </div>
  )
  const cont = () => {
    if (!enrol && !picked.length) { setProblem('Select at least one enrollment or service to update.'); return }
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(start.trim())) { setProblem('Enter the Start Date (yyyy.mm.dd).'); return }
    billingPrograms.registerLfp(provider, { enrol, services: picked, start: start.trim() })
    close()
  }

  return (
    <WorkspaceDialogFrame id="lfp-update-registration" title="Update LFP Enrollment / Service Registration" width={694} height={760} controls={false} onClose={close}>
      <div style={{ background: '#fff', flex: '1 1 auto', display: 'flex', flexDirection: 'column', padding: '8px 12px' }}>
        <BlueHead><Dim>Provider</Dim><div style={{ fontSize: 13 }}>({p.prefix}) {p.provider}</div></BlueHead>
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #c8c8c8' }}>Select the item(s) that you would like to update.</div>
        <div className="pb-row" style={{ padding: '12px 10px 4px', borderBottom: '1px solid #c8c8c8' }}>
          <Dim>LFP Enrollment (select one)</Dim><span className="pb-row__spacer" /><Dim style={{ width: 150, textAlign: 'center' }}>Current Status</Dim>
        </div>
        {row('enroll-family', 'Enroll as a family physician', enrol === 'family', (v) => setEnrol(v ? 'family' : ''), p.family)}
        {row('enroll-locum', 'Enroll as a locum physician', enrol === 'locum', (v) => setEnrol(v ? 'locum' : ''), p.locum)}
        <div style={{ padding: '14px 10px 4px', borderBottom: '1px solid #c8c8c8' }}><Dim>Service(s)</Dim></div>
        {row('register-clinic', 'Register for clinic based care', svc.clinic, (v) => setSvc((x) => ({ ...x, clinic: v })), p.services.clinic)}
        {row('register-ltc', 'Register for ltc/palliative care', svc.ltc, (v) => setSvc((x) => ({ ...x, ltc: v })), p.services.ltc)}
        {row('register-inpatient', 'Register for inpatient service', svc.inpatient, (v) => setSvc((x) => ({ ...x, inpatient: v })), p.services.inpatient)}
        {row('register-pregnancy', 'Register for pregnancy and newborn service', svc.pregnancy, (v) => setSvc((x) => ({ ...x, pregnancy: v })), p.services.pregnancy)}
        <div style={{ padding: '18px 10px 4px', borderBottom: '1px solid #c8c8c8' }}><Dim>Start Date</Dim></div>
        <div style={{ padding: '8px 10px' }}>
          <PBInput w={110} value={start} onChange={(e) => setStart(e.target.value)} placeholder="yyyy.mm.dd" data-tutorial-id="host.mois.field.lfp-start-date" />
        </div>
        <Dim style={{ padding: '8px 10px' }}>
          MSP claims will be created for the selected items.&nbsp; These claims will be submitted during yourMSP claim submission process.
        </Dim>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 18, marginTop: 'auto', padding: '10px 0' }}>
          <DialogButton id="lfp-update-continue" isDefault width={112} onClick={cont}>Continue</DialogButton>
          <DialogButton id="lfp-update-cancel" width={112} onClick={close}>Cancel</DialogButton>
        </div>
      </div>
      {problem && (
        <Ask id="lfp-update-incomplete" title="MOIS" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => setProblem('')}>
          {problem}
        </Ask>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- LFP Provider Time Review (Provider Time Summary) ------------------------ */

type Frame = 'Today' | 'Yesterday' | 'In the Last' | 'Range'

export function LfpTimeSummaryView({ onClose }: { onClose?: () => void }) {
  const s = useBillingPrograms()
  const openWindow = useOpenWindow()
  const [frame, setFrame] = useState<Frame>('Today')
  const [lastN, setLastN] = useState('14')
  const [from, setFrom] = useState(shiftStamp(LFP_TODAY, -7))
  const [to, setTo] = useState(LFP_TODAY)
  const [stamp, setStamp] = useState(0)
  const [cur, setCur] = useState(0)

  const rows = useMemo(() => {
    void stamp
    const inFrame = (d: string) => {
      if (frame === 'Today') return d === LFP_TODAY
      if (frame === 'Yesterday') return d === shiftStamp(LFP_TODAY, -1)
      if (frame === 'In the Last') return d > shiftStamp(LFP_TODAY, -(Number(lastN) || 0)) && d <= LFP_TODAY
      return d >= from && d <= to
    }
    const keys = [...new Set(s.entries.filter((e) => inFrame(e.date)).map((e) => `${e.provider}|${e.date}`))].sort()
    return keys.map((k) => {
      const [provider, date] = k.split('|') as [string, string]
      const list = entriesFor(s, provider, date)
      const sum = (code: string) => list.filter((e) => e.code === code).reduce((n, e) => n + minutesOfEntry(e), 0)
      const claims = s.timeClaims.filter((c) => c.provider === provider && c.date === date)
      const billed = list.filter((e) => e.claimed).length
      const lfp = lfpProviderOf(s, provider)
      const billing = !billed ? 'Not Billed'
        : billed < list.length ? 'Partially Billed'
          : claims.some((c) => c.status === 'unsent') ? 'Unsent Claims' : 'Sent to MSP'
      return {
        provider, date,
        direct: hours(sum('direct')), indirect: hours(sum('indirect')), clinical: hours(sum('clinical')),
        total: hours(list.reduce((n, e) => n + minutesOfEntry(e), 0)),
        locum: lfp?.locum && !lfp.family ? '(locum)' : '',
        billing,
      }
    })
  }, [s, frame, lastN, from, to, stamp])

  useScreenReport({ timeFrame: pbSlug(frame), rows: rows.length, row: rows[cur] ? `lfp-time-${pbSlug(rows[cur]!.provider.split(',')[0] ?? '')}` : null })

  return (
    <>
      <PBViewHeader title="LFP Provider Time Review" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => setStamp((n) => n + 1) },
        { label: 'New Entry', onClick: () => openWindow('time-entry', { provider: lfpRegisteredProviders(s)[0], date: LFP_TODAY, pick: true }) },
        { label: 'Close Window', onClick: onClose },
      ]} />
      <div className="pb-row" style={{ padding: '4px 6px', flex: 'none' }}>
        <FilterGroup title="Time Frame">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 22, rowGap: 4 }}>
            <RadioSet group="lfp-time-frame" options={['Today', 'Yesterday'] as Frame[]} value={frame} onChange={setFrame} columns={1} />
            <div>
              <div className="pb-row" style={{ gap: 6 }}>
                <RadioSet group="lfp-time-frame" options={['In the Last'] as Frame[]} value={frame} onChange={setFrame} />
                <PBInput w={34} align="right" value={lastN} onChange={(e) => { setLastN(e.target.value); setFrame('In the Last') }} data-tutorial-id="host.mois.field.lfp-time-last-days" />
                <span>days</span>
              </div>
              <div className="pb-row" style={{ gap: 6 }}>
                <RadioSet group="lfp-time-frame" options={['Range'] as Frame[]} value={frame} onChange={setFrame} />
                <PBInput w={80} value={from} onChange={(e) => { setFrom(e.target.value); setFrame('Range') }} data-tutorial-id="host.mois.field.lfp-time-from" />
                <span>and</span>
                <PBInput w={80} value={to} onChange={(e) => { setTo(e.target.value); setFrame('Range') }} data-tutorial-id="host.mois.field.lfp-time-to" />
              </div>
            </div>
          </div>
        </FilterGroup>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={[
            { key: 'provider', header: 'Provider', width: 175 },
            { key: 'date', header: 'Date', width: 72, align: 'center' },
            { key: 'direct', header: <>Time Enteries<br />Direct</>, width: 60, align: 'right' },
            { key: 'indirect', header: <><br />Indirect</>, width: 60, align: 'right' },
            { key: 'clinical', header: <><br />Clinical</>, width: 60, align: 'right' },
            { key: 'total', header: <><br />Total</>, width: 56, align: 'right' },
            { key: 'locum', header: 'Locum For', width: 182 },
            { key: 'billing', header: 'MSP Billing Status', width: 148 },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => openWindow('time-entry', { provider: r.provider, date: r.date })}
          rowTutorialId={(r) => `host.mois.row.lfp-time-${pbSlug(r.provider.split(',')[0] ?? '')}-${r.date.replace(/\./g, '')}`}
          empty=" "
        />
      </div>
    </>
  )
}

/** Registered at module load; BillingAdminView imports this file for its
    exports, so the registration survives a bundler that drops side-effect
    imports. */
export function registerLfpWindows() {
  registerAreaWindow('lfp-update-registration', UpdateLfpRegistrationWindow)
}
registerLfpWindows()
