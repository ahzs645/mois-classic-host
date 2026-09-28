import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import {
  billingPrograms, claimTitle, enrolmentOf, isEnrolledNow, patientName, patientOf, PBF_TODAY, providerOfChart,
  useBillingPrograms, type EnrolmentClaim, type PcpcRun,
} from '../data/billingPrograms'
import { DOCTORS, SENT_CLAIM_KEY, type SentClaim } from '../data/claims'
import { patients } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { registerScreenWindows, useScreenWindow, useSessionState } from '../host/screen-windows'
import {
  PBCheckbox, PBDataWindow, PBInput, PBLookup, PBPatientBannerBlue, PBRadio, PBSelect, PBTextArea,
} from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from './areaWindowRegistry'
import { Ask, Dim, PanelBand, ScreenDialog } from './billingProgramsKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Billing ▸ PBF Management — the windows its folders open.

   SCREEN WINDOWS (drawn by the PBF folder screens, opened by id):
     pbf-enrolment-claim   args { id }         Unsent / MSP Claim: Population
                                               Based Funding Enrollment Management
     pbf-benefit-plan      args { chart, mode: 'edit' | 'detail' }  Edit Benefit Plan
     pbf-bypass            args { mode: 'enroll' | 'unenroll' }     By-Pass Registration
     pbf-change-provider   args { chart }      Change Service Provider
     pbf-eligibility-new   args { chart? }     New Eligibility Request
     pbf-msp-cr-detail     args { id }         MSP change request detail
     pcpc-load-previous    args { output, provider }  Load Previous Results
     pcpc-report           args { run }        the Printable Report
   AREA WINDOW:
     pbf-enrolment-history args { chart }      a benefit plan's change history

   PROVENANCE
   - Unsent Claim window   2257761 / 2258278 `52f24e67…` (948 × 554,
     v02.24): the claim half (Status Complete / Incomplete, Hold Claim,
     Patient + Refresh Patient Data, Claim, Clinic, Created) and the BENEFIT
     PLAN DETAIL half (Plan, Enrollment Start / Stop Date with status, Stop
     Reason, Coverage, Other, Note, Record Created / Last Modified); Save,
     Cancel, History.
   - MSP Claim window      2257761 `f16e989b…` (unacknowledged) and
     `7e4f3103…` (failed, 1183 × 701, v02.28.04): Status boxes, Expl Code(s)
     with […], Sequence No., Prev. / Next Seq No., the Failed Claim Actions
     group (Resubmit, Accept), Save, Close, History. 2258278 `767e6bca…`
     is the v02.24 "Failed Claim:" title of the same window.
   - Edit Benefit Plan     2258278 `74a82e34…` (227 × 245, small): blue
     patient banner, Source MSP, Plan BC-PBF, Enrollment Start / Stop Date
     with (Registered), Stop Reason, Coverage, Other, Note, Record Created /
     Last Modified, History / Save / Cancel. The stop date is salmon: the
     override the article describes.
   - Explanatory codes open the existing Sent Claim Detail window
     (screens/SentClaimDetailWindow.tsx, `fa942311…` is 2257761's own).

   INFERRED — no capture:
   - By-Pass Registration (2258278 `0f4547c1…` shows only the Action ▸
     By-Pass Registration Process to… ▸ Enroll a Patient / Unenroll a
     Patient menu): a chart, a date, a provider or stop reason, OK / Cancel.
   - Change Service Provider, New Eligibility Request, MSP CR Detail, the
     enrolment History list, PCPC Load Previous Results ("Select the
     calculator 'run'", 2401462) and the Printable Report (2257761 lists
     what it holds: insurance number, date of birth, gender and chart, no
     names, and the clinic index).
   ========================================================================= */

export const PBF_WINDOWS = {
  claim: 'pbf-enrolment-claim',
  plan: 'pbf-benefit-plan',
  bypass: 'pbf-bypass',
  provider: 'pbf-change-provider',
  eligibility: 'pbf-eligibility-new',
  mspDetail: 'pbf-msp-cr-detail',
  loadPrevious: 'pcpc-load-previous',
  report: 'pcpc-report',
} as const
registerScreenWindows(Object.values(PBF_WINDOWS))

const PROVIDERS = [...DOCTORS, 'PRACTITIONER, GENERAL']
const lbl: CSSProperties = { color: '#6d6d6d' }
const box: CSSProperties = { background: '#fff', border: '1px solid #a0a0a0', display: 'flex', flexDirection: 'column', minHeight: 0 }

function Row({ label, children, w = 92, style }: { label: ReactNode; children: ReactNode; w?: number; style?: CSSProperties }) {
  return (
    <div className="pb-row" style={{ gap: 6, padding: '2px 0', ...style }}>
      <span style={{ ...lbl, width: w, flex: 'none' }}>{label}</span>
      {children}
    </div>
  )
}
const RO = ({ value, w = 110, bold }: { value: string; w?: number | string; bold?: boolean }) => (
  <PBInput w={w} readOnly value={value} style={{ background: '#e8e8e8', fontWeight: bold ? 700 : undefined }} />
)

/** Renders whichever PBF screen window is open. Every PBF folder screen
    mounts it, so a window opened by id reaches the screen on display. */
export function PbfWindows({ onOpenChart }: { onOpenChart?: (chart: string) => void }) {
  const win = useScreenWindow()
  const args = win.window?.args ?? {}
  if (win.is(PBF_WINDOWS.claim)) return <EnrolmentClaimWindow id={String(args.id ?? '')} onClose={win.close} />
  if (win.is(PBF_WINDOWS.plan)) return <BenefitPlanWindow chart={String(args.chart ?? '')} detail={args.mode === 'detail'} onClose={win.close} />
  if (win.is(PBF_WINDOWS.bypass)) return <BypassWindow mode={args.mode === 'unenroll' ? 'unenroll' : 'enroll'} onClose={win.close} />
  if (win.is(PBF_WINDOWS.provider)) return <ChangeProviderWindow chart={String(args.chart ?? '')} onClose={win.close} />
  if (win.is(PBF_WINDOWS.eligibility)) return <EligibilityWindow chart={String(args.chart ?? '')} onClose={win.close} />
  if (win.is(PBF_WINDOWS.mspDetail)) return <MspCrDetailWindow id={String(args.id ?? '')} onClose={win.close} onOpenChart={onOpenChart} />
  if (win.is(PBF_WINDOWS.loadPrevious)) return <LoadPreviousWindow provider={String(args.provider ?? 'all')} output={String(args.output ?? '')} onClose={win.close} />
  if (win.is(PBF_WINDOWS.report)) return <PcpcReportWindow run={String(args.run ?? '')} onClose={win.close} />
  return null
}

/* --- the enrolment claim window ----------------------------------------------- */

function EnrolmentClaimWindow({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useBillingPrograms()
  const openWindow = useOpenWindow()
  const [, setSentClaim] = useSessionState<SentClaim | null>(SENT_CLAIM_KEY, null)
  const c = s.claims.find((x) => x.id === id)
  const e = c ? enrolmentOf(s, c.chart) : undefined
  const p = c ? patientOf(c.chart) : undefined
  const [form, setForm] = useState(() => ({
    compl: c?.compl ?? true, hold: c?.hold ?? false, holdReason: c?.holdReason ?? '',
    service: c?.service ?? '', loc: c?.loc ?? 'A', diag: c?.diag ?? 'V90', sub: c?.sub ?? '0',
    payMode: c?.payMode ?? 'Alternate', start: e?.start ?? '', stop: e?.stop ?? '',
  }))
  const [refreshed, setRefreshed] = useState(false)
  const unsent = c?.state === 'unsent'
  const failed = c?.state === 'failed'

  const explain = () => {
    if (!c) return
    /* the Sent Claim Detail window reads the loaded sent claim's E1–E3 */
    setSentClaim({
      id: `pbf-${c.id}`,
      service: c.service, diag: c.diag, fee: c.fee, ins: 'BC', billed: '0.00', paid: '-', doctor: c.doctor, sent: c.sent,
      r1: c.r1, r2: c.r2, wo: c.wo, e1: c.e1, e2: c.e2, e3: c.e3, ref: 'X', pract: '', last: p?.last ?? '', first: p?.first ?? '', m: '', payee: '00001',
    } as SentClaim)
    openWindow('sent-claim-detail')
  }
  /* 2257761: "Investigate explanatory codes (Press Ctrl+E OR […])" */
  useEffect(() => {
    const key = (ev: KeyboardEvent) => { if (ev.ctrlKey && (ev.key === 'e' || ev.key === 'E')) { ev.preventDefault(); explain() } }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  useScreenReport({ claimState: c?.state ?? null, claimStatus: form.compl ? 'complete' : 'incomplete', explCodes: c ? [c.e1, c.e2, c.e3].filter(Boolean).length : 0, refreshed })
  if (!c) return null

  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))
  const save = () => {
    if (unsent) {
      billingPrograms.updateClaim(c.id, {
        compl: form.compl, hold: form.hold, holdReason: form.holdReason, service: form.service, loc: form.loc,
        diag: form.diag, sub: form.sub, payMode: form.payMode as EnrolmentClaim['payMode'],
      }, { start: form.start !== (e?.start ?? '') ? form.start : undefined, stop: form.stop !== (e?.stop ?? '') ? form.stop : undefined })
    }
    onClose()
  }
  const title = unsent ? 'Unsent Claim: Population Based Funding Enrollment Management' : 'MSP Claim: Population Based Funding Enrollment Management'
  const stamp = c.created

  return (
    <ScreenDialog id="pbf-enrolment-claim" title={title} width={unsent ? 948 : 1183} height={unsent ? 554 : 701} onClose={onClose}>
      <div className="pb-row" style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'stretch', gap: 8, padding: '8px 10px 0' }}>
        {/* ---- the claim ---- */}
        <div style={{ ...box, flex: '1 1 50%' }} data-tutorial-id="host.mois.field.pbf-claim">
          <PanelBand>{claimTitle(c.fee, s.pbf)}</PanelBand>
          <div style={{ padding: '4px 10px', borderBottom: '1px solid #c8c8c8' }}>
            {unsent ? (
              <div className="pb-row" style={{ gap: 14, background: '#f4f9f4', border: '1px solid #bcd9bc', borderRadius: 4, padding: '3px 8px' }}>
                <b>Status:</b>
                <PBRadio name="pbf-claim-status" label={<b>Complete</b>} checked={form.compl} onChange={() => set('compl')(true)} tutorialId="host.mois.field.pbf-claim-complete" />
                <PBRadio name="pbf-claim-status" label={<b>Incomplete</b>} checked={!form.compl} onChange={() => set('compl')(false)} tutorialId="host.mois.field.pbf-claim-incomplete" />
                <PBCheckbox label="Hold Claim" checked={form.hold} onChange={set('hold')} tutorialId="host.mois.field.pbf-claim-hold" />
                <PBInput w={110} value={form.holdReason} onChange={(ev) => set('holdReason')(ev.target.value)} />
              </div>
            ) : (
              <div className="pb-row" style={{ gap: 6 }}>
                <b>Status:</b><RO w={24} value={c.r1} /><RO w={24} value={c.r2} />
                <span style={{ width: 30 }} />
                <b>Expl Code(s):</b>
                {[c.e1, c.e2, c.e3, '', '', '', ''].map((x, i) => <RO key={i} w={28} value={x} />)}
                <DialogButton id="pbf-claim-expl-codes" width={24} onClick={explain}>…</DialogButton>
              </div>
            )}
          </div>
          <div style={{ padding: '4px 10px', borderBottom: '1px solid #c8c8c8' }}>
            <div className="pb-row" style={{ gap: 6 }}>
              <b style={{ width: 52 }}>Patient:</b><span style={lbl}>Chart:</span><RO w={62} bold value={c.chart} />
              <span className="pb-row__spacer" />
              {unsent
                ? <DialogButton id="pbf-claim-refresh-patient" width={120} onClick={() => setRefreshed(true)}>Refresh Patient Data</DialogButton>
                : <><b>Sequence No.:</b><RO w={114} value={c.seq} /></>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 4 }}>
              <div>
                <Row label="First Name:"><RO bold value={p?.first ?? ''} w={120} /></Row>
                <Row label="Middle Initial:"><RO value={(p?.middle ?? '').slice(0, 1)} w={30} /></Row>
                <Row label="Last Name:"><RO bold value={p?.last ?? ''} w={120} /></Row>
              </div>
              <div>
                <Row label="Insured By:"><RO bold value={p?.insuranceBy ?? 'BC'} w={66} /></Row>
                <Row label="Insurance #:"><RO bold value={p?.insurance ?? ''} w={96} /></Row>
                <Row label="Dep. No.:"><RO bold value={p?.dep ?? '00'} w={40} /></Row>
              </div>
            </div>
          </div>
          <div style={{ padding: '4px 10px', borderBottom: '1px solid #c8c8c8', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <Row label={<b style={{ color: '#000' }}>Claim:&nbsp; <span style={lbl}>Service Date:</span></b>} w={128}>
                <PBInput w={82} readOnly={!unsent} value={form.service} onChange={(ev) => set('service')(ev.target.value)} data-tutorial-id="host.mois.field.pbf-claim-service-date" />
              </Row>
              <Row label="Fee Item:" w={128}><RO w={26} value="PG" /><RO w={52} value={c.fee} /></Row>
              <Row label="Diag Code:" w={128}>
                {unsent ? <PBLookup w={86} value={form.diag} onChange={set('diag')} name="pbf-claim-diag" fieldId="host.mois.field.pbf-claim-diag" /> : <RO w={86} value={c.diag} />}
              </Row>
              <Row label="Sub Code:" w={128}>
                {unsent
                  ? <span data-tutorial-id="host.mois.field.pbf-claim-sub-code"><PBSelect w={60} options={['0', 'D', 'E', 'I', 'R']} value={form.sub} onChange={(ev) => set('sub')(ev.target.value)} /></span>
                  : <RO w={86} value={c.sub} />}
              </Row>
              {!unsent && (
                <Row label="Pay Mode:" w={128}>
                  <PBRadio name="pbf-claim-pay" label="Normal" checked={false} disabled />
                  <PBRadio name="pbf-claim-pay" label="Alternate" checked disabled />
                </Row>
              )}
              {unsent && <Row label="Override Code:" w={128}><RO w={66} value="" /></Row>}
            </div>
            <div>
              <Row label="Location:">
                {unsent
                  ? <span data-tutorial-id="host.mois.field.pbf-claim-location"><PBSelect w={66} options={['A', 'B', 'C', 'D', 'E', 'I', 'L']} value={form.loc} onChange={(ev) => set('loc')(ev.target.value)} /></span>
                  : <RO w={80} value={c.loc} />}
              </Row>
              <Row label="No. Service:"><RO w={80} value="1.0000" /></Row>
              {unsent ? (
                <Row label="Pay Mode:">
                  <div>
                    <PBRadio name="pbf-claim-pay" label="Normal" checked={form.payMode === 'Normal'} onChange={() => set('payMode')('Normal')} />
                    <div><PBRadio name="pbf-claim-pay" label="Alternate" checked={form.payMode === 'Alternate'} onChange={() => set('payMode')('Alternate')} /></div>
                  </div>
                </Row>
              ) : (
                <>
                  <Row label="Prev. Seq. No.:"><RO w={110} value={c.replaces ? s.claims.find((x) => x.id === c.replaces)?.seq ?? '' : ''} /></Row>
                  <Row label="Next Seq No.:"><RO w={110} value={s.claims.find((x) => x.replaces === c.id)?.seq || '0'} /></Row>
                </>
              )}
            </div>
          </div>
          <div style={{ padding: '4px 10px', borderBottom: '1px solid #c8c8c8' }}>
            <Row label={<b style={{ color: '#000' }}>Clinic:&nbsp; <span style={lbl}>Doctor:</span></b>} w={110}><span>{c.doctor}</span></Row>
            <Row label="Pract. No.:" w={110}><span>{c.doctor === 'BEARDWOOD, WALTER' ? '12345' : '55555'}</span></Row>
            <Row label="Payee No.:" w={110}><span>00001</span></Row>
            <Row label="Facility No.:" w={110}><RO w={60} value="00000" /></Row>
            <Row label="Sub Facility:" w={110}><RO w={60} value="00000" /></Row>
          </div>
          <div style={{ padding: '4px 10px' }}>
            <div>Created:&nbsp;&nbsp; {stamp}</div>
            {!unsent && <div>Modified:&nbsp; {c.modified}</div>}
          </div>
        </div>

        {/* ---- the benefit plan ---- */}
        <div style={{ ...box, flex: '1 1 50%' }} data-tutorial-id="host.mois.field.pbf-benefit-plan-detail">
          <PanelBand>BENEFIT PLAN DETAIL</PanelBand>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #c8c8c8' }}><Row label="Plan:"><b>BC PCPC ENROLLED</b></Row></div>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #c8c8c8' }}>
            <Row label={<b style={{ color: '#000' }}>Enrollment:</b>}><Dim style={{ paddingLeft: 60 }}>Status</Dim></Row>
            <Row label="Start Date:">
              <PBInput w={72} readOnly={!unsent} value={form.start} onChange={(ev) => set('start')(ev.target.value)} data-tutorial-id="host.mois.field.pbf-plan-start" />
              <span>({e?.startStatus || '-'})</span>
            </Row>
            {(e?.stop || unsent) && (
              <Row label="Stop Date:">
                <PBInput w={72} readOnly={!unsent} value={form.stop} onChange={(ev) => set('stop')(ev.target.value)} data-tutorial-id="host.mois.field.pbf-plan-stop" />
                <span>{e?.stop ? `(${e.stopStatus || '-'})` : ''}</span>
              </Row>
            )}
            {e?.stopReason && <Row label="Stop Reason:"><RO w={50} value={e.stopReason} /></Row>}
          </div>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #c8c8c8' }}>
            <b>Coverage:</b>
            <Row label="Description:"><PBInput w="70%" readOnly={!unsent} /></Row>
            <Row label="Deductible:"><PBInput w={96} readOnly={!unsent} /></Row>
          </div>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #c8c8c8' }}>
            <Row label={<b style={{ color: '#000' }}>Other:</b>}>
              <div>
                <PBCheckbox label="Include on Demographics" checked={unsent} disabled={!unsent} />
                <div><PBCheckbox label="Include on Care Plan Summary" checked={false} disabled={!unsent} /></div>
              </div>
            </Row>
          </div>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #c8c8c8' }}>
            <Row label={<b style={{ color: '#000' }}>Note:</b>}><PBTextArea rows={3} w="100%" readOnly={!unsent} /></Row>
          </div>
          <div style={{ padding: '4px 10px', color: '#6d6d6d' }}>
            <div>Record Created:&nbsp; {e?.created ?? ''}</div>
            <div>Last Modified:&nbsp;&nbsp; {e?.modified ?? ''}</div>
          </div>
        </div>
      </div>
      <div className="pb-row" style={{ padding: '8px 12px 10px', gap: 8, flex: 'none', alignItems: 'flex-end' }}>
        {!unsent && (
          <fieldset style={{ border: '1px solid #c8c8c8', borderRadius: 3, padding: '0 8px 6px', margin: 0 }} data-tutorial-id="host.mois.group.failed-claim-actions">
            <legend style={{ fontWeight: 700 }}>Failed Claim Actions</legend>
            <div className="pb-row" style={{ gap: 6 }}>
              <DialogButton id="pbf-claim-resubmit" disabled={!failed} onClick={() => { billingPrograms.resubmitClaim(c.id); onClose() }}>Resubmit</DialogButton>
              <DialogButton id="pbf-claim-accept" disabled={!failed} onClick={() => { billingPrograms.acceptClaim(c.id); onClose() }}>Accept</DialogButton>
            </div>
          </fieldset>
        )}
        <span className="pb-row__spacer" />
        <DialogButton id="pbf-claim-save" onClick={save}>Save</DialogButton>
        <DialogButton id="pbf-claim-close" onClick={onClose}>{unsent ? 'Cancel' : 'Close'}</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id="pbf-claim-history" onClick={() => openWindow('pbf-enrolment-history', { chart: c.chart })}>History</DialogButton>
      </div>
    </ScreenDialog>
  )
}

/* --- Edit Benefit Plan -------------------------------------------------------- */

function BenefitPlanWindow({ chart, detail, onClose }: { chart: string; detail: boolean; onClose: () => void }) {
  const s = useBillingPrograms()
  const openWindow = useOpenWindow()
  const e = enrolmentOf(s, chart)
  const p = patientOf(chart)
  const [start, setStart] = useState(e?.start ?? '')
  const [stop, setStop] = useState(e?.stop ?? '')
  const [reason, setReason] = useState(e?.stopReason ?? '')
  const changed = start !== (e?.start ?? '') || stop !== (e?.stop ?? '') || reason !== (e?.stopReason ?? '')
  useScreenReport({ overrideDraft: changed, enrolled: !!e && isEnrolledNow(e) })
  const claims = s.claims.filter((c) => c.chart === chart && c.state === 'unsent')

  return (
    <ScreenDialog id="pbf-benefit-plan" title={detail ? 'Benefit Plan Detail' : 'Edit Benefit Plan'} width={560} height={detail && claims.length ? 640 : 560} onClose={onClose}>
      <PBPatientBannerBlue
        top={[
          { label: 'CHART NO.', value: chart, w: 70 },
          { label: 'PATIENT (F/M/L)', value: p ? `${p.first} ${p.last}` : '', w: 200 },
          { label: 'DATE OF BIRTH', value: p?.dob ?? '', w: 120 },
          { label: 'GENDER', value: p?.gender ?? '' },
        ]}
        bottom={[]}
      />
      <div style={{ background: '#fff', flex: '1 1 auto', padding: '6px 12px', overflowY: 'auto' }}>
        <Row label="Source:"><b>MSP</b></Row>
        <Row label="Plan:"><b>BC-PBF</b></Row>
        <div style={{ borderTop: '1px solid #c8c8c8', marginTop: 6, paddingTop: 4 }}>
          <Row label={<b style={{ color: '#000' }}>Enrollment:</b>}><Dim style={{ paddingLeft: 90 }}>Status</Dim></Row>
          <Row label="Start Date:">
            <PBInput w={84} readOnly={detail} value={start} onChange={(ev) => setStart(ev.target.value)} data-tutorial-id="host.mois.field.pbf-override-start" style={start !== (e?.start ?? '') ? { background: '#f4c6bd' } : undefined} />
            <span>({e?.startStatus || '-'})</span>
          </Row>
          <Row label="Stop Date:">
            <PBInput w={84} readOnly={detail} value={stop} onChange={(ev) => setStop(ev.target.value)} data-tutorial-id="host.mois.field.pbf-override-stop" style={stop !== (e?.stop ?? '') ? { background: '#f4c6bd' } : undefined} />
            <span>{e?.stop ? `(${e.stopStatus || '-'})` : ''}</span>
          </Row>
          <Row label="Stop Reason:">
            <span data-tutorial-id="host.mois.field.pbf-override-stop-reason"><PBSelect w={70} options={['', 'L', 'D', 'M', 'O']} value={reason} onChange={(ev) => setReason(ev.target.value)} disabled={detail} /></span>
          </Row>
        </div>
        <div style={{ borderTop: '1px solid #c8c8c8', marginTop: 6, paddingTop: 4 }}>
          <b>Coverage:</b>
          <Row label="Description:"><PBInput w={300} readOnly={detail} /></Row>
          <Row label="Deductible:"><PBInput w={90} readOnly={detail} /></Row>
        </div>
        <div style={{ borderTop: '1px solid #c8c8c8', marginTop: 6, paddingTop: 4 }}>
          <Row label={<b style={{ color: '#000' }}>Other:</b>}>
            <div><PBCheckbox label="Include on Demographics" disabled={detail} /><div><PBCheckbox label="Include on Care Plan Summary" disabled={detail} /></div></div>
          </Row>
        </div>
        <div style={{ borderTop: '1px solid #c8c8c8', marginTop: 6, paddingTop: 4 }}>
          <Row label={<b style={{ color: '#000' }}>Note:</b>}><PBTextArea rows={3} w="100%" readOnly={detail} /></Row>
        </div>
        {detail && claims.length > 0 && (
          <div style={{ borderTop: '1px solid #c8c8c8', marginTop: 6, paddingTop: 4 }} data-tutorial-id="host.mois.field.pbf-plan-unsent-claims">
            <b>Unsent Claims:</b>
            {claims.map((c) => <div key={c.id} style={{ paddingLeft: 12 }}>{c.service}&nbsp;&nbsp; {c.fee}&nbsp;&nbsp; {c.doctor}</div>)}
          </div>
        )}
        <div style={{ color: '#6d6d6d', paddingTop: 6 }}>
          <div>Record Created:&nbsp; {e?.created ?? ''}</div>
          <div>Last Modified:&nbsp;&nbsp; {e?.modified ?? ''}</div>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 8, padding: '8px 12px', flex: 'none' }}>
        <DialogButton id="pbf-plan-history" onClick={() => openWindow('pbf-enrolment-history', { chart })}>History</DialogButton>
        <span className="pb-row__spacer" />
        {!detail && (
          <DialogButton id="pbf-plan-save" isDefault onClick={() => {
            if (changed) billingPrograms.overrideDates(chart, { start, stop, stopReason: reason })
            onClose()
          }}>Save</DialogButton>
        )}
        <DialogButton id="pbf-plan-cancel" onClick={onClose}>{detail ? 'Close' : 'Cancel'}</DialogButton>
      </div>
    </ScreenDialog>
  )
}

/* --- the small INFERRED dialogs -------------------------------------------------- */

const chartOptions = () => [{ value: '', label: '' }, ...patients.map((p) => ({ value: p.chart, label: `${p.chart} - ${p.last}, ${p.first}` }))]

function BypassWindow({ mode, onClose }: { mode: 'enroll' | 'unenroll'; onClose: () => void }) {
  const s = useBillingPrograms()
  const [chart, setChart] = useState('')
  const [date, setDate] = useState(PBF_TODAY)
  const [provider, setProvider] = useState('BEARDWOOD, WALTER')
  const [reason, setReason] = useState('L')
  const [problem, setProblem] = useState('')
  useScreenReport({ bypass: mode, chartPicked: !!chart })
  const ok = () => {
    if (!chart) { setProblem('Select the patient chart.'); return }
    const e = enrolmentOf(s, chart)
    if (mode === 'unenroll' && !(e && isEnrolledNow(e))) { setProblem('The patient is not currently enrolled.'); return }
    billingPrograms.bypass(mode, chart, date, provider, reason)
    onClose()
  }
  return (
    <ScreenDialog id="pbf-bypass" title={mode === 'enroll' ? 'By-Pass Registration Process - Enroll a Patient' : 'By-Pass Registration Process - Unenroll a Patient'} width={520} height={290} onClose={onClose}>
      <div style={{ background: '#fff', flex: '1 1 auto', padding: '10px 14px' }}>
        <div style={{ paddingBottom: 8 }}>The enrollment record is written as Registered. No change request and no MSP claim are created.</div>
        <Row label="Chart:" w={110}><span data-tutorial-id="host.mois.field.pbf-bypass-chart"><PBSelect w={300} options={chartOptions()} value={chart} onChange={(ev) => setChart(ev.target.value)} /></span></Row>
        <Row label={mode === 'enroll' ? 'Start Date:' : 'Stop Date:'} w={110}><PBInput w={90} value={date} onChange={(ev) => setDate(ev.target.value)} data-tutorial-id="host.mois.field.pbf-bypass-date" /></Row>
        {mode === 'enroll'
          ? <Row label="Service Provider:" w={110}><span data-tutorial-id="host.mois.field.pbf-bypass-provider"><PBSelect w={220} options={PROVIDERS} value={provider} onChange={(ev) => setProvider(ev.target.value)} /></span></Row>
          : <Row label="Stop Reason:" w={110}><span data-tutorial-id="host.mois.field.pbf-bypass-reason"><PBSelect w={70} options={['L', 'D', 'M', 'O']} value={reason} onChange={(ev) => setReason(ev.target.value)} /></span></Row>}
      </div>
      <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8, padding: '8px 12px', flex: 'none' }}>
        <DialogButton id="pbf-bypass-ok" isDefault onClick={ok}>OK</DialogButton>
        <DialogButton id="pbf-bypass-cancel" onClick={onClose}>Cancel</DialogButton>
      </div>
      {problem && <Ask id="pbf-bypass-problem" title="MOIS" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => setProblem('')}>{problem}</Ask>}
    </ScreenDialog>
  )
}

function ChangeProviderWindow({ chart, onClose }: { chart: string; onClose: () => void }) {
  const s = useBillingPrograms()
  const [provider, setProvider] = useState(enrolmentOf(s, chart)?.provider ?? '')
  return (
    <ScreenDialog id="pbf-change-provider" title="Change Service Provider" width={420} height={190} onClose={onClose}>
      <div style={{ background: '#fff', flex: '1 1 auto', padding: '10px 14px' }}>
        <Row label="Patient:" w={110}><b>{patientName(chart)}</b></Row>
        <Row label="Service Provider:" w={110}><span data-tutorial-id="host.mois.field.pbf-change-provider"><PBSelect w={220} options={PROVIDERS} value={provider} onChange={(ev) => setProvider(ev.target.value)} /></span></Row>
      </div>
      <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8, padding: '8px 12px', flex: 'none' }}>
        <DialogButton id="pbf-change-provider-ok" isDefault onClick={() => { billingPrograms.changeServiceProvider(chart, provider); onClose() }}>OK</DialogButton>
        <DialogButton id="pbf-change-provider-cancel" onClick={onClose}>Cancel</DialogButton>
      </div>
    </ScreenDialog>
  )
}

function EligibilityWindow({ chart: initial, onClose }: { chart: string; onClose: () => void }) {
  const s = useBillingPrograms()
  const [chart, setChart] = useState(initial)
  const [provider, setProvider] = useState(providerOfChart(s, initial) || 'BEARDWOOD, WALTER')
  useScreenReport({ chartPicked: !!chart })
  return (
    <ScreenDialog id="pbf-eligibility-new" title="New MSP Eligibility Request" width={500} height={220} onClose={onClose}>
      <div style={{ background: '#fff', flex: '1 1 auto', padding: '10px 14px' }}>
        <div style={{ paddingBottom: 8 }}>The request is sent with your next MSP claim submission; MOIS adjusts the patient's PBF registration when the response is processed.</div>
        <Row label="Chart:" w={110}><span data-tutorial-id="host.mois.field.pbf-eligibility-chart"><PBSelect w={300} options={chartOptions()} value={chart} onChange={(ev) => setChart(ev.target.value)} /></span></Row>
        <Row label="Service Provider:" w={110}><span data-tutorial-id="host.mois.field.pbf-eligibility-provider"><PBSelect w={220} options={PROVIDERS} value={provider} onChange={(ev) => setProvider(ev.target.value)} /></span></Row>
      </div>
      <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8, padding: '8px 12px', flex: 'none' }}>
        <DialogButton id="pbf-eligibility-save" isDefault disabled={!chart} onClick={() => { billingPrograms.addEligibility(chart, provider); onClose() }}>Save</DialogButton>
        <DialogButton id="pbf-eligibility-cancel" onClick={onClose}>Cancel</DialogButton>
      </div>
    </ScreenDialog>
  )
}

function MspCrDetailWindow({ id, onClose, onOpenChart }: { id: string; onClose: () => void; onOpenChart?: (chart: string) => void }) {
  const s = useBillingPrograms()
  const m = s.mspErrors.find((x) => x.id === id)
  if (!m) return null
  const e = m.chart ? enrolmentOf(s, m.chart) : undefined
  return (
    <ScreenDialog id="pbf-msp-cr-detail" title="MSP Enrollment Change Request - Remittance Record" width={560} height={380} onClose={onClose}>
      <div style={{ background: '#fff', flex: '1 1 auto', padding: '10px 14px' }}>
        <PanelBand>PCO#R1 Remittance Record</PanelBand>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '6px 4px' }}>
          <Row label="Last Name:"><b>{m.last}</b></Row><Row label="First Name:"><b>{m.first}</b></Row>
          <Row label="PHN:"><b>{m.phn}</b></Row><Row label="DoB:"><b>{m.dob}</b></Row>
          <Row label="Gender:"><b>{m.sex}</b></Row><Row label="Received:"><b>{m.received}</b></Row>
          <Row label="Request:"><b>{m.request}</b></Row><Row label="Reason:"><b>{m.reason}</b></Row>
        </div>
        <PanelBand>Processing</PanelBand>
        <div style={{ padding: '6px 4px' }}>
          <Row label="Matched Chart:" w={110}><b>{m.chart && m.result !== 'chart' ? `${m.chart} - ${patientName(m.chart)}` : '(none)'}</b></Row>
          <Row label="Enrollment:" w={110}><span>{e ? `${e.start} (${e.startStatus || '-'})${e.stop ? ` to ${e.stop} (${e.stopStatus || '-'})` : ''}` : 'no enrollment record'}</span></Row>
          <Row label="Record Status:" w={110}><b style={{ color: m.result === 'ok' ? '#1f8a2c' : '#c00000' }}>{m.message}</b></Row>
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8, padding: '8px 12px', flex: 'none' }}>
        {m.chart && m.result !== 'chart' && onOpenChart && <DialogButton id="pbf-msp-cr-detail-open-chart" onClick={() => { onClose(); onOpenChart(m.chart) }}>Open Chart</DialogButton>}
        <DialogButton id="pbf-msp-cr-detail-close" isDefault onClick={onClose}>Close</DialogButton>
      </div>
    </ScreenDialog>
  )
}

/* --- PCPC ------------------------------------------------------------------------- */

/** A deterministic training score per chart (INFERRED: the calculator's
    rules are 2401462's; the charts' conditions are not in the roster). */
export const pcpcScore = (chart: string) => (1 + ([...chart].reduce((n, c) => n + c.charCodeAt(0), 0) % 90) / 100).toFixed(2)

function LoadPreviousWindow({ provider, output, onClose }: { provider: string; output: string; onClose: () => void }) {
  const s = useBillingPrograms()
  const openWindow = useOpenWindow()
  const win = useScreenWindow()
  const [cur, setCur] = useState(s.pcpcRuns.length - 1)
  const [problem, setProblem] = useState('')
  const runs = s.pcpcRuns
  useScreenReport({ pcpcRuns: runs.length, row: runs[cur] ? `pcpc-${runs[cur]!.id}` : null })
  const load = () => {
    const run: PcpcRun | undefined = runs[cur]
    if (!run) return
    /* 2401462: a Desktop Provider run cannot be reloaded for All */
    if (run.provider === 'desktop' && provider === 'all') { setProblem('This run only included the Desktop Provider; it cannot be loaded for All Providers.'); return }
    if (output === 'Chart Navigator') { onClose(); openWindow('chart-navigator', { charts: run.charts }); return }
    if (output === 'Printable Report') { win.open(PBF_WINDOWS.report, { run: run.id }); return }
    setProblem(`${output} written from the ${run.date} run.`)
  }
  return (
    <ScreenDialog id="pcpc-load-previous" title="Load Previous Results" width={560} height={320} onClose={onClose}>
      <div style={{ background: '#fff', flex: '1 1 auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ paddingBottom: 6 }}>Select the calculator run to load.</div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            columns={[
              { key: 'date', header: 'Run Date', width: 120 },
              { key: 'include', header: 'Include Patients', width: 110, render: (r) => (r.include === 'enrolled' ? 'PBF Enrolled' : 'Other') },
              { key: 'provider', header: 'Primary Provider', width: 120, render: (r) => (r.provider === 'all' ? 'All Providers' : 'Desktop Provider') },
              { key: 'charts', header: 'Charts', width: 60, align: 'right', render: (r) => r.charts.length },
              { key: 'index', header: 'Clinic Index', width: 80, align: 'right' },
            ]}
            rows={runs}
            current={cur}
            onCurrentChange={setCur}
            onActivate={() => load()}
            rowTutorialId={(r) => `host.mois.row.pcpc-${r.id}`}
          />
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8, padding: '8px 12px', flex: 'none' }}>
        <DialogButton id="pcpc-load-ok" isDefault disabled={!runs[cur]} onClick={load}>OK</DialogButton>
        <DialogButton id="pcpc-load-cancel" onClick={onClose}>Cancel</DialogButton>
      </div>
      {problem && <Ask id="pcpc-load-message" title="PCPC Complexity Index" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => { setProblem(''); if (!problem.startsWith('This run')) onClose() }}>{problem}</Ask>}
    </ScreenDialog>
  )
}

function PcpcReportWindow({ run: id, onClose }: { run: string; onClose: () => void }) {
  const s = useBillingPrograms()
  const run = s.pcpcRuns.find((r) => r.id === id)
  if (!run) return null
  const rows = run.charts.map((chart) => {
    const p = patientOf(chart)
    return { chart, insurance: p?.insurance ?? '', dob: p?.dob ?? '', gender: p?.gender ?? '', index: pcpcScore(chart) }
  })
  return (
    <ScreenDialog id="pcpc-report" title="PCPC Burden of Care Complexity Index" width={640} height={520} onClose={onClose}>
      <div style={{ background: '#fff', flex: '1 1 auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', minHeight: 0, fontFamily: 'var(--pb-font-mono, monospace)' }}>
        <b>PCPC Burden of Care Complexity Index — {run.date}</b>
        <div>Include: {run.include === 'enrolled' ? 'PBF Enrolled' : 'Other'}&nbsp;&nbsp; Primary Provider: {run.provider === 'all' ? 'All Providers' : 'Desktop Provider'}</div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', marginTop: 8 }} data-tutorial-id="host.mois.field.pcpc-report">
          <PBDataWindow
            gutter={false}
            columns={[
              { key: 'chart', header: 'Chart', width: 70 },
              { key: 'insurance', header: 'Insurance No.', width: 120 },
              { key: 'dob', header: 'DoB', width: 90 },
              { key: 'gender', header: 'Gender', width: 60, align: 'center' },
              { key: 'index', header: 'Final Index', width: 90, align: 'right' },
            ]}
            rows={rows}
          />
        </div>
        <div style={{ paddingTop: 8 }} data-tutorial-id="host.mois.field.pcpc-clinic-index"><b>Clinic Complexity Index: {run.index}</b> ({rows.length} patients)</div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8, padding: '8px 12px', flex: 'none' }}>
        <DialogButton id="pcpc-report-close" isDefault onClick={onClose}>Close</DialogButton>
      </div>
    </ScreenDialog>
  )
}

/* --- History (area window) ------------------------------------------------------ */

export function EnrolmentHistoryWindow({ args, close }: AreaWindowProps) {
  const s = useBillingPrograms()
  const chart = String(args.chart ?? '')
  const lines = [
    ...s.claims.filter((c) => c.chart === chart).map((c) => ({
      date: c.sent || c.service, change: `${c.fee} ${claimTitle(c.fee, s.pbf).replace(/^PBF-/, '').toLowerCase()}`,
      status: c.state === 'unsent' ? 'Unsent' : c.state === 'unack' ? 'Submitted' : c.state === 'failed' ? 'Failed' : c.r1 === 'R' ? 'Resubmitted' : c.r1 === 'A' ? 'Accepted' : 'Registered',
      by: 'ADMINISTRATOR',
    })),
    ...s.crs.filter((c) => c.chart === chart).map((c) => ({
      date: c.requested, change: `${c.kind === 'enroll' ? 'Enrollment' : 'Unenrollment'} request ${c.date}`, status: c.status.charAt(0) + c.status.slice(1).toLowerCase(), by: c.person,
    })),
    ...s.history.filter((h) => h.chart === chart),
  ].sort((a, b) => a.date.localeCompare(b.date))
  useScreenReport({ historyLines: lines.length })
  return (
    <WorkspaceDialogFrame id="pbf-enrolment-history" title={`Benefit Plan History - ${patientName(chart)}`} width={700} height={380} controls={false} onClose={close}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: 8 }}>
        <PBDataWindow
          columns={[
            { key: 'date', header: 'Date', width: 120 },
            { key: 'change', header: 'Change', width: 330 },
            { key: 'status', header: 'Status', width: 100 },
            { key: 'by', header: 'By', width: 110 },
          ]}
          rows={lines}
          empty="No history."
        />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', padding: '6px 0 10px', flex: 'none' }}>
        <DialogButton id="pbf-history-close" isDefault onClick={close}>Close</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

export function registerPbfWindows() {
  registerAreaWindow('pbf-enrolment-history', EnrolmentHistoryWindow)
}
registerPbfWindows()

export const providerOptions = PROVIDERS
