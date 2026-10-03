import { useState } from 'react'
import { PBCommandRow, PBMessageBox, PBTextArea, PBViewHeader } from '../../pb'
import { useBillingCommands } from '../../data/billingCommands'
import { plusDays, sequenceOf, unsentFromSent, useSentClaims, useUnsentClaims } from '../../data/billingStore'
import { CHART_PROMPT_KEY, claimFromRow, SENT_CLAIM_KEY, sentClaimPatient, sentClaims, UNSENT_CLAIM_KEY, type ClaimForm, type SentClaim } from '../../data/claims'
import { billingNavigate } from '../../data/menus/billing'
import { usePatientRoster } from '../../data/patient-context'
import { MOIS_TODAY } from '../../data/patients'
import { useScreenReport } from '../../host/screen-state'
import { useSessionState } from '../../host/screen-windows'
import { useOpenWindow } from '../areaWindowRegistry'
import { registerConfirmCurrent } from '../../host/confirmCurrent'
import { Prompt } from '../ExchangeKit'
import { At, Band, Body, Dots, Field, G, Hair, LL, Line, Radios, RL, SALMON } from './claimLayout'

/* ============================================================================
   Sent To MSP — Billing ▸ MSP Claims ▸ Sent Claims.

   PROVENANCE:
     303602 "Window Descriptions" and the cloud captures in 3786544 —
       `86eedb19` (v02.31.41, the empty window: Doctor / Sequence No.,
       PATIENT, IDENTITY, RECON, SERVICE, OPTIONS, WCB, OTHER),
       `e0d70551` (a loaded claim under "Confirmation: Resubmit Claim":
       Insurance BC | 9035808413 | 00, Recon Code [ ][A], Write Off [N][ ],
       Billed 164.89, Net Paid 92.84, Expl Code(s) K4 …),
       `8ad93010` / `de31aa5b` / `cdefd066` (its Action menu).
     Laid out on the Unsent MSP grid (billing/claimLayout.tsx), which is the
     same DataWindow class: every field is read-only except Sequence No.
     ("Please note, all of these fields are read-only. If they need to be
     changed, press Resubmit Claim and make your edits." — 303602).

   The claim on screen is the one a Prompt - Recon / Prompt - Chart pick
   loaded (data/claims SENT_CLAIM_KEY), with this session's toggles laid
   over it (data/billingStore `useSentClaims`); with none picked, the first
   training claim.

   BEHAVIOUR (303602 Action menu, 3786544 How To's):
     Resubmit Claim (F2)   "Confirmation: Resubmit Claim" / "Would you like
                           to resubmit the current claim?" → Yes marks R1 = R,
                           files a copy in Unsent Claims, loads it there and
                           opens the Unsent to MSP folder.
     Debit Claim (Ctrl+F2) "Creates a debit and moves the claim to Unsent
                           Claims." INFERRED confirmation, worded as
                           Resubmit's; the debit is the claim with a negative
                           amount and Sub code D.
     Duplicate Claim (F3)  "Will duplicate the claim for the Desktop Provider.
                           The claim will then be marked 'Hold'" — a held copy
                           in Unsent Claims; INFERRED information box after.
     Toggle - Approve / Adjust (Ctrl+A)  R1 A ↔ blank.
     Toggle - Write Off (Ctrl+W)         WO Y ↔ N, and the date beside it.
     Toggle - Mark For Delete (Shift+F2) R1 D ↔ blank ("puts a 'D' in the
                                         R1 field").
     Toggle - Private Claim Flag         R1 V ↔ blank ("V Private invoice
                                         created for claim").
     Detail Expl Code (Ctrl+E), Detail Adjustment Summary (Alt+Z) and
     Remittance History open their windows (SentClaimDetailWindow.tsx,
     billing/SentClaimWindows.tsx).

   Reported: `host.screen.sentClaim` (the claim's last name, lowercased, or
   `training`), `r1`, `r2`, `writeOff`, and `host.dialog` = resubmit-claim /
   debit-claim while those questions are up.
   ========================================================================= */

/* CONFIRM-CURRENT: no capture of the current build's Billing exists; the
   layout is the help site's cloud captures (v02.31.23–41), its styling the
   kit's. */
registerConfirmCurrent([
  { target: { node: 'bl-sent' }, source: 'help-site 3786544 `86eedb19` v02.31.41, 303602 `8b55e226` v02.31.23, `e0d70551`' },
  { target: { anchor: 'host.mois.dialog.confirmation-resubmit-claim' }, source: 'help-site 3786544 `e0d70551` (cloud build)' },
  { target: { anchor: 'host.mois.dialog.confirmation-debit-claim' }, source: 'INFERRED: worded as Resubmit\'s; not captured' },
  { target: { anchor: 'host.mois.dialog.claim-duplicated' }, source: 'INFERRED: 303602 text only ("marked \'Hold\'")' },
])

const fallback = sentClaims[0]!

type Ask = 'resubmit' | 'debit' | 'duplicated' | null

export function SentMspView({ onPrompt }: { onPrompt?: (prompt: 'recon' | 'chart') => void }) {
  const [ask, setAsk] = useState<Ask>(null)
  const [picked] = useSessionState<SentClaim | null>(SENT_CLAIM_KEY, null)
  const [, setUnsentClaim] = useSessionState<ClaimForm | null>(UNSENT_CLAIM_KEY, null)
  const [, setChartAsked] = useSessionState<string | null>(CHART_PROMPT_KEY, null)
  const roster = usePatientRoster()
  const sent = useSentClaims()
  const unsent = useUnsentClaims(roster)
  const openWindow = useOpenWindow()
  const base = picked ?? fallback
  const c = sent.rows.find((r) => r.id === base.id) ?? base
  const edit = sent.edit(c.id)
  const who = sentClaimPatient(c)
  const paid = c.paid === '-' ? '' : c.paid
  /** Prompt - Chart / Alt+F1: the claims sent for this claim's chart */
  const promptChart = () => { setChartAsked(who?.chart ?? ''); onPrompt?.('chart') }

  const toggle = (patch: (row: SentClaim) => Parameters<typeof sent.patch>[1]) => sent.patch([c.id], patch(c))
  /** a sent claim copied back into Unsent Claims, loaded there */
  const carry = (origin: 'resubmit' | 'debit' | 'duplicate', go: boolean) => {
    const row = unsentFromSent(c, who, origin)
    const [id] = unsent.add([row])
    if (go) {
      setUnsentClaim({ ...claimFromRow({ ...row, id }), state: 'picked' })
      billingNavigate('bl-unsent')
    }
  }

  const answer = (which: 'resubmit' | 'debit', button: string) => {
    setAsk(null)
    if (button !== 'Yes') return
    if (which === 'resubmit') { sent.patch([c.id], { r1: 'R' }); carry('resubmit', true) }
    else { sent.patch([c.id], { debited: true }); carry('debit', true) }
  }

  const commands = {
    resubmit: () => setAsk('resubmit'),
    debit: () => setAsk('debit'),
    duplicate: () => { carry('duplicate', false); setAsk('duplicated') },
  }

  useBillingCommands((cmd) => {
    if (cmd === 'prompt-recon') onPrompt?.('recon')
    else if (cmd === 'prompt-chart') promptChart()
    else if (cmd === 'resubmit-claim') commands.resubmit()
    else if (cmd === 'debit-claim') commands.debit()
    else if (cmd === 'duplicate-sent') commands.duplicate()
    else if (cmd === 'toggle-approve') toggle((r) => ({ r1: r.r1 === 'A' ? '' : 'A' }))
    else if (cmd === 'toggle-write-off') toggle((r) => (r.wo === 'Y' ? { wo: 'N', woDate: '' } : { wo: 'Y', woDate: MOIS_TODAY }))
    else if (cmd === 'toggle-delete') toggle((r) => ({ r1: r.r1 === 'D' ? '' : 'D' }))
    else if (cmd === 'toggle-private') toggle((r) => ({ r1: r.r1 === 'V' ? '' : 'V', privateFlag: r.r1 !== 'V' }))
    else if (cmd === 'adjustment-summary') openWindow('sent-adjustment-summary')
    else if (cmd === 'remittance-history') openWindow('sent-remittance-history')
  })

  useScreenReport({
    sentClaim: picked ? picked.last.toLowerCase() : 'training',
    r1: c.r1 || 'blank',
    r2: c.r2 || 'blank',
    writeOff: c.wo,
    ...(ask === 'resubmit' ? { dialog: 'resubmit-claim' } : ask === 'debit' ? { dialog: 'debit-claim' } : ask === 'duplicated' ? { dialog: 'claim-duplicated' } : {}),
  })

  const expl = [c.e1, c.e2, c.e3].filter(Boolean)
  const doctor = c.doctor.split(',')[0] + (c.doctor.includes(',') ? ', ' + (c.doctor.split(',')[1] ?? '').trim().slice(0, 1) + '.' : '')
  const ro = (w: number, value: string, id?: string, align?: 'center' | 'right') => <Field w={w} value={value} style={G} readOnly id={id} align={align} />

  return (
    <>
      <PBViewHeader title="Sent To MSP" />
      <PBCommandRow commands={[
        { label: 'Resubmit Claim', onClick: commands.resubmit },
        { label: 'Debit Claim', onClick: commands.debit },
        { label: 'Duplicate Claim', onClick: commands.duplicate },
        { label: 'Prompt - Recon', onClick: () => onPrompt?.('recon') },
        { label: 'Prompt - Chart', onClick: () => promptChart() },
        { label: 'Close Window' },
      ]} />
      {/* keyed on the claim: the read-only boxes take their values afresh
          when a Prompt pick loads another one */}
      <Body key={c.id}>
        <Line h={22}>
          <LL>Doctor:</LL>
          <At x={346}><Field w={130} value={doctor} readOnly style={{ background: '#f4b4b4', color: '#800000', fontWeight: 700 }} /></At>
          <RL end={838}><b>Sequence No.:</b></RL>
          <At x={840}><Field w={76} value={sequenceOf(c)} style={SALMON} id="sent-sequence" /></At>
        </Line>

        <Band caption="PATIENT:">
          <Line>
            <LL>First Name:</LL>
            <At x={346}>{ro(128, c.first, 'sent-first')}</At>
            <RL end={578}>Middle Initial:</RL>
            <At x={580}>{ro(24, c.m)}</At>
            <RL end={838}>Last Name:</RL>
            {/* "You can press F4 in the patient Last Name field to find other
                claims for the same patient" (303602) */}
            <At x={840}><Dots w={112} value={c.last} readOnly style={G} id="sent-last" onDots={() => promptChart()} /></At>
          </Line>
        </Band>

        <Band caption="IDENTITY:">
          <Line>
            <LL>Insurance:</LL>
            <At x={346}>{ro(28, c.ins, undefined, 'center')}{ro(76, who?.insrNbr ?? '', 'sent-insurance')}{ro(30, '00', undefined, 'center')}</At>
            <RL end={578}>DoB:</RL>
            <At x={580}>{ro(76, who?.dob ?? '')}</At>
            <RL end={838}>Sex:</RL>
            <At x={840}>{ro(34, '')}</At>
          </Line>
          <Line>
            <LL>Chart:</LL>
            <At x={346}>{ro(84, who?.chart ?? '')}</At>
            <RL end={578}>Prev. Seq. No.:</RL>
            <At x={580}>{ro(76, '0')}</At>
            <RL end={838}>Next Seq No.:</RL>
            <At x={840}>{ro(76, '0')}</At>
          </Line>
        </Band>

        <Band caption="RECON:">
          <Line>
            <LL>Code:</LL>
            <At x={346}>
              <span style={{ display: 'inline-flex' }} data-tutorial-id="host.mois.field.sent-recon">
                {ro(18, c.r1, 'sent-r1', 'center')}{ro(18, c.r2, 'sent-r2', 'center')}
              </span>
            </At>
            <RL end={578}>Write Off:</RL>
            <At x={580}>{ro(18, c.wo, 'sent-write-off', 'center')}{ro(76, edit.woDate ?? '', 'sent-write-off-date')}</At>
            {/* CONFIRM-CURRENT: Sent and Paid sit in the third column, Paid
                after Sent's box (`86eedb19`, `8b55e226`, `e0d70551`) */}
            <RL end={838}>Sent:</RL>
            <At x={840}>{ro(68, c.sent, 'sent-sent-date')}</At>
            <RL end={946}>Paid:</RL>
            <At x={948}>{ro(68, paid ? plusDays(c.sent, 14) : '', 'sent-paid-date')}</At>
          </Line>
          <Line>
            <LL>Billed:</LL>
            <At x={346}>{ro(84, c.billed, 'sent-billed', 'right')}</At>
            <RL end={578}>Net Paid:</RL>
            <At x={580}>{ro(76, paid || '0.00', 'sent-net-paid', 'right')}</At>
            <RL end={838}>Expl Code(s):</RL>
            <At x={840}>
              {/* Action ▸ Detail Expl Code (Ctrl+E) explains these in Sent Claim
                  Detail (screens/SentClaimDetailWindow.tsx) */}
              <span className="pb-row" style={{ gap: 0 }} data-tutorial-id="host.mois.field.expl-codes">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <Field key={i} w={22} align="center" value={expl[i] ?? ''} style={G} readOnly />
                ))}
              </span>
            </At>
          </Line>
        </Band>

        <Band caption="SERVICE:">
          <Line>
            <LL>Service Date:</LL>
            <At x={346}>{ro(84, c.service, 'sent-service-date')}</At>
            <RL end={578}>Location:</RL>
            <At x={580}>{ro(28, 'A', undefined, 'center')}</At>
            <RL end={838}>Service To Date:</RL>
            <At x={840}>{ro(24, '')}</At>
          </Line>
          <Line>
            <LL>No. Service:</LL>
            <At x={346}>{ro(84, '1.0000', undefined, 'right')}</At>
            <RL end={578}>Diag Code(s) 1:</RL>
            <At x={580}>{ro(76, c.diag, 'sent-diag-1')}</At>
            <At x={722} top={3}><span className="pb-form__label">Time(s)</span></At>
            <RL end={838}>Received:</RL>
            <At x={856} top={3}><span>:</span></At>
          </Line>
          <Line>
            <LL>Fee Item:</LL>
            <At x={346}>{ro(24, 'PG', undefined, 'center')}{ro(76, c.fee, 'sent-fee')}</At>
            <RL end={578}>2:</RL>
            <At x={580}>{ro(76, '')}</At>
            <RL end={838}>Start:</RL>
            <At x={856} top={3}><span>:</span></At>
          </Line>
          <Line>
            <LL>Unit Amount:</LL>
            <At x={346}>{ro(84, c.billed, undefined, 'right')}</At>
            <RL end={578}>3:</RL>
            <At x={580}>{ro(76, '')}</At>
            <RL end={838}>Finish:</RL>
            <At x={856} top={3}><span>:</span></At>
          </Line>
          <Hair />
          <Line>
            <LL>Pay Mode:</LL>
            <Radios name="sent-pay-mode" disabled value="Normal" options={[{ value: 'Normal', label: 'Normal', x: 348 }]} />
            <RL end={578}>After-Hour Ind.:</RL>
            <Radios name="sent-after-hour" disabled value="Normal" options={[
              { value: 'Normal', label: 'Normal', x: 584 }, { value: 'Night', label: 'Night', x: 666 },
            ]} />
            <RL end={838}>Anatomic Area:</RL>
            <At x={840}>{ro(42, '00', undefined, 'center')}</At>
          </Line>
          <Line>
            <Radios name="sent-pay-mode" disabled value="Normal" options={[{ value: 'Alternate', label: 'Alternate', x: 348 }]} />
            <Radios name="sent-after-hour" disabled value="Normal" options={[
              { value: 'Even', label: 'Even', x: 584 }, { value: 'W/End', label: 'W/End', x: 666 },
            ]} />
            <RL end={838}>NPI:</RL>
            <At x={840}>{ro(42, '00', undefined, 'center')}</At>
          </Line>
          <Line>
            <LL>Referring 1:</LL>
            <At x={346}><Dots w={96} value={c.ref === 'X' ? '' : c.pract} readOnly style={G} /></At>
            <RL end={578}>Referring 2:</RL>
            <At x={580}><Dots w={96} value="" readOnly style={G} /></At>
          </Line>
        </Band>

        <Band caption="OPTIONS:">
          <Line>
            <LL>MVA:</LL>
            <Radios name="sent-mva" disabled value="No" options={[{ value: 'Yes', label: 'Yes', x: 348 }, { value: 'No', label: 'No', x: 388 }]} />
            <RL end={578}>Correspondence Code:</RL>
            <At x={580}>{ro(20, '0', undefined, 'center')}</At>
          </Line>
          <Line>
            <LL>ICBC No.:</LL>
            <At x={346}>{ro(96, '')}</At>
            <RL end={578}>Memo:</RL>
            <At x={580}>{ro(220, '')}</At>
          </Line>
          <Line>
            <LL>Sub Code:</LL>
            <At x={346}>{ro(96, '0')}</At>
            <RL end={578}>Claim Note:</RL>
            <At x={580}>{ro(220, edit.note ?? '')}</At>
          </Line>
          {/* CONFIRM-CURRENT: Office / MSP Note is a two-line box, and the
              Address 1–4 / Postal Code block under the rule (`86eedb19`,
              `8b55e226`, `e0d70551`, v02.31.23–41); no DoB / Sex row here,
              unlike Unsent MSP */}
          <Line h={38}>
            <LL>Ext. Sub Cd:</LL>
            <At x={346}>{ro(96, '')}</At>
            <RL end={578}>Office / MSP Note:</RL>
            <At x={579}>
              <PBTextArea rows={2} w={410} readOnly value="" style={{ ...G, height: 35, resize: 'none' }} data-tutorial-id="host.mois.field.sent-msp-note" />
            </At>
          </Line>
          <Hair />
          <Line>
            <LL>Address</LL>
            <RL end={343}>1:</RL>
            <At x={346}>{ro(196, '', 'sent-address-1')}</At>
            <RL end={578}>3:</RL>
            <At x={580}>{ro(196, '')}</At>
          </Line>
          <Line>
            <RL end={343}>2:</RL>
            <At x={346}>{ro(196, '')}</At>
            <RL end={578}>4:</RL>
            <At x={580}>{ro(196, '')}</At>
          </Line>
          <Line>
            <LL>Postal Code:</LL>
            <At x={346}>{ro(64, '')}</At>
          </Line>
        </Band>

        <Band caption="WCB:">
          <Line>
            <LL>WCB No.</LL>
            <At x={346}>{ro(96, '')}</At>
            <RL end={578}>Date of Injury:</RL>
            <At x={580}>{ro(76, '')}</At>
            <RL end={838}>WCB Form:</RL>
          </Line>
          {/* CONFIRM-CURRENT: Area of Inj., Anatomic Position and Nature of
              Inj. (`86eedb19`, `8b55e226`, `e0d70551`) */}
          <Line>
            <LL>Area of Inj.:</LL>
            <At x={346}>{ro(96, '')}</At>
            <RL end={578}>Anatomic Position:</RL>
            <At x={580}>{ro(30, '')}</At>
          </Line>
          <Line>
            <LL>Nature of Inj.:</LL>
            <At x={346}>{ro(96, '')}</At>
          </Line>
        </Band>

        <Band caption="OTHER:">
          <Line>
            <LL>Pract. No.:</LL>
            <At x={346} top={3}><span>{c.pract}</span></At>
            <RL end={578}>Facility No.:</RL>
            <At x={582} top={3}><span>00000</span></At>
            <RL end={838}>PBF Class.:</RL>
            <At x={842} top={3}><span>FFS</span></At>
          </Line>
          <Line>
            <LL>Payee No.:</LL>
            <At x={346} top={3}><span>{c.payee}</span></At>
            <RL end={578}>Sub Facility:</RL>
            <At x={582} top={3}><span>00000</span></At>
          </Line>
        </Band>
      </Body>

      {ask === 'resubmit' && (
        /* e0d70551: "Confirmation: Resubmit Claim" / "Would you like to
           resubmit the current claim?" (303501 has the same words) */
        <Prompt title="Confirmation: Resubmit Claim" buttons={['Yes', 'No']} onClose={(b) => answer('resubmit', b)}>
          Would you like to resubmit the current claim?
        </Prompt>
      )}
      {ask === 'debit' && (
        <Prompt title="Confirmation: Debit Claim" buttons={['Yes', 'No']} onClose={(b) => answer('debit', b)}>
          Would you like to debit the current claim?
        </Prompt>
      )}
      {ask === 'duplicated' && (
        <PBMessageBox
          title="Duplicate Claim"
          tutorialId="host.mois.dialog.claim-duplicated"
          buttons={[{ label: 'OK', value: 'ok', default: true, command: 'duplicate-ok' }]}
          onClose={() => setAsk(null)}
        >
          The claim has been duplicated to Unsent Claims for the Desktop Provider and marked Hold.
        </PBMessageBox>
      )}
    </>
  )
}
