import { useState, type ReactNode } from 'react'
import { MHK_ACTIVITY, MHK_ACTIVITY_KEY, daysFromToday, useMhkChart, type MhkActivity } from '../data/myhealthkey'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { savePatient, updatePatient, usePatientEdits } from '../data/patient-edits'
import { MOIS_TODAY, type Patient } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput, PBSelect, PBViewHeader, pbSlug } from '../pb'
import { Btn, DetailWindow, FieldLabel, TopMessage, stampNow } from './AdminExchangeKit'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'

/* ============================================================================
   Patient Chart ▸ myhealthkey — registering and deregistering a patient
   (2280708 "myhealthkey Patient Chart"), and the two myhealthkey windows the
   messaging workflow adds (Send To Patient's letter preview and the retract
   prompt).

   PROVENANCE
   · The folder — `692b3809…` (current: Invite, Deregister, Check Status,
     Refresh; Deregister greyed before registration), `8325f5a1…` /
     `1d0cb386…` (older: Register in place of Invite; the identity strip
     FIRST / MIDDLE / LAST / DoB / Active ENC#), `77d248f2…` (Patient Consent:
     Instruction INVITED with a red dot, Instruction Detail "Patient has been
     sent an invite to myhealthkey", Valid from / Until, Reason "Patient
     Registration", Created … THOMSON, SAM, Last Modified), `6aae0140…`
     (ALLOW, "Patient has completed registration with myhealthkey", and the
     Patient Scheduling band: Current Status ENABLED on green, Prevent
     Scheduling), `fffe1feb…` (DISABLED on red, Allow Scheduling),
     `1d0cb386…` (NOT ALLOW, "Patient has deregistered via myhealthkey",
     Reason "Patient deregistered by Clinic.").
     The current build's caption, Invite, is used. The patient's own log
     ("Individual patient logs can be found in the myhealthkey folder") is
     the grid the folder always had here (Date / Time, Event, Channel,
     Status), now filled by this session's events.
   · Patient Identity Confirmation — `e3191e41…`: "Please carefully review
     the patient's Government issued ID to confirm these values are
     accurate."; an "Identity" band with Correct Demographics; Chart No.,
     First Name, Last Name, DoB, Admin Gender, Insurance No., eMail, each with
     an OK? tick, a red × where the value is missing; Confirm (F2) / Cancel.
     "You will be blocked from continuing until all information is entered
     and verified and checked off."
   · Update Patient Information — `806374d0…`: Patient Identification (Chart
     No., Name F/M/L, Alias, Birth Date, Gender, Insurance by / No.,
     Dependant No., Status Code / Date) and Contact Information (Address ×2,
     City, Province, Postal Code, Country, Home / Work / Cell / Pager / Fax,
     Preferred Phone, eMail Home / Work); Save (F2) / Cancel. Saves write the
     chart's Demographics ("Any updates made here will automatically save on
     the patient's main Demographics screen") — data/patient-edits.ts. This
     window keeps the fields the invite needs plus the address block; the
     rest of the capture's rows are drawn read-only.
   · Deregister: the capture shows only the result; the Yes / No question
     before it is INFERRED. Deregister before registration is complete is
     refused ("Selecting Deregister prior to this point will not work").
   · Check Status: on an INVITED chart it brings back ALLOW — the patient
     finishing registration from the e-mail, which happens outside MOIS
     (see data/myhealthkey.ts).
   · mhk-letter-preview — `4f8e9c3a…`: "This file has been converted to PDF
     to send to the patient via myhealthkey. Please review and approve or
     reject." Accept / Reject.
   · mhk-retract-message — `4f711d94…` "Delete Current Record": Alert "This
     message was sent to a myhealthkey patient account …", the privacy-breach
     note on pink, "Please enter a reason for deleting the message.", User
     Name / Date / Time, Reason, Continue / Cancel; then `06d98991…`
     "Success": "This message has been retracted. Please reach out to the
     myhealthkey support team if you require an audit report for this:
     support@myhealthkey.ca" OK.

   Reported: `host.screen.registration` (none / invited / allow /
   not-allow), `host.screen.scheduling` (enabled / disabled),
   `host.screen.checked` (identity rows ticked), `host.screen.retracted`,
   `host.dialog`.
   ========================================================================= */

const regSlug = (r: string) => pbSlug(r)

function Line({ label, children, w = 110 }: { label: string; children: ReactNode; w?: number }) {
  return <div className="pb-row" style={{ gap: 6 }}><span style={{ width: w, flex: 'none' }}>{label}</span>{children}</div>
}

function MyHealthKeyChartView(_: FolderViewProps) {
  const base = usePatient()
  const edits = usePatientEdits(base.chart)
  const p = { ...base, ...edits }
  const [mhk, setMhk] = useMhkChart(base.chart)
  const [, setActivity] = useSessionState<MhkActivity[]>(MHK_ACTIVITY_KEY, MHK_ACTIVITY)
  const [dialog, setDialog] = useState<null | 'identity' | 'deregister' | 'too-soon' | 'checked'>(null)
  useScreenReport({ registration: regSlug(mhk.registration), scheduling: mhk.registration === 'NONE' ? null : mhk.scheduling ? 'enabled' : 'disabled' })

  const log = (event: string) => [{ when: stampNow().replace(/\s+/g, ' '), event, channel: 'MOIS', status: 'DONE' }, ...mhk.log]
  const activity = (registration: string, reason: string) => setActivity((all) => [{
    chart: base.chart, last: (p.last ?? '').toUpperCase(), first: (p.first ?? '').toUpperCase(), registration,
    validFrom: MOIS_TODAY.replace(/\./g, '-'), validTo: registration === 'INVITED' ? daysFromToday(30).replace(/\./g, '-') : '',
    reason, createdBy: 'ADMINISTRATOR', updatedBy: '', updated: `${MOIS_TODAY.replace(/\./g, '-')} ${stampNow().slice(-5)}:00`,
  }, ...all])

  const invite = () => {
    setMhk({
      registration: 'INVITED', detail: 'Patient has been sent an invite to myhealthkey', reason: 'Patient Registration',
      validFrom: MOIS_TODAY, until: daysFromToday(30), created: stampNow(), createdBy: 'ADMINISTRATOR', modified: '', modifiedBy: '',
      scheduling: false, log: log('Patient Invite'),
    })
    activity('INVITED', 'Patient Registration')
    setDialog(null)
  }
  const checkStatus = () => {
    if (mhk.registration === 'INVITED') {
      setMhk({ registration: 'ALLOW', detail: 'Patient has completed registration with myhealthkey', until: '', modified: stampNow(), modifiedBy: 'SYSTEM.POLLING.PHR', scheduling: true, log: log('Patient Status - Registration Complete') })
    }
    setDialog('checked')
  }
  const deregister = () => {
    setMhk({
      registration: 'NOT ALLOW', detail: 'Patient has deregistered via myhealthkey', reason: 'Patient deregistered by Clinic.',
      validFrom: MOIS_TODAY, until: '', created: stampNow(), createdBy: 'ADMINISTRATOR', modified: '', modifiedBy: '',
      scheduling: false, log: log('Patient Deregistration'),
    })
    activity('NOT ALLOW', 'Patient Deregistration')
    setDialog(null)
  }
  const registered = mhk.registration === 'ALLOW' || mhk.registration === 'NOT ALLOW'
  const canInvite = mhk.registration === 'NONE' || mhk.registration === 'NOT ALLOW'

  return (
    <>
      <PBViewHeader title="myhealthkey" right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={[
        { label: 'Invite', disabled: !canInvite, onClick: () => setDialog('identity') },
        { label: 'Deregister', disabled: mhk.registration === 'NONE' || mhk.registration === 'NOT ALLOW', onClick: () => setDialog(mhk.registration === 'ALLOW' ? 'deregister' : 'too-soon') },
        { label: 'Check Status', onClick: checkStatus },
        { label: 'Refresh' },
      ]} />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: (p.first ?? '').toUpperCase(), w: 170 },
          { label: 'MIDDLE:', value: (p.middle ?? '').toUpperCase(), w: 150 },
          { label: 'LAST:', value: (p.last ?? '').toUpperCase(), w: 190 },
          { label: 'DoB:', value: p.dob ?? '' },
        ]}
        encounter="NO ENCOUNTER"
      />
      {mhk.registration !== 'NONE' ? (
        <>
          <div className="pb-groupbox" data-tutorial-id="host.mois.group.mhk-patient-consent" style={{ flex: 'none' }}>
            <PBBand>Patient Consent</PBBand>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '4px 8px' }}>
              <div>
                <Line label="Instruction:">
                  <b data-tutorial-id="host.mois.field.mhk-instruction">{mhk.registration}</b>
                  {mhk.registration === 'INVITED' && <span style={{ color: '#e00000' }}>●</span>}
                </Line>
                <Line label="Valid from:"><span style={{ width: 100 }}>{mhk.validFrom}</span><span>Until:&nbsp;&nbsp;{mhk.until}</span></Line>
              </div>
              <div>
                <Line label="Instruction Detail:"><PBInput w="100%" readOnly value={mhk.detail} /></Line>
                <Line label="Reason:"><PBInput w="100%" readOnly value={mhk.reason} style={{ height: 36 }} /></Line>
              </div>
            </div>
            <div className="pb-row" style={{ gap: 30, padding: '3px 8px', borderTop: '1px solid #c8c8c8' }}>
              <span>Created:&nbsp;&nbsp; {mhk.created}&nbsp;&nbsp;&nbsp; {mhk.createdBy}</span>
              <span>Last Modified:&nbsp;&nbsp; {mhk.modified}&nbsp;&nbsp;&nbsp; {mhk.modifiedBy}</span>
            </div>
          </div>
          {registered && (
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.mhk-patient-scheduling" style={{ flex: 'none' }}>
              <PBBand>Patient Scheduling</PBBand>
              <div className="pb-row" style={{ gap: 12, padding: '6px 8px' }}>
                <span>Current Status:</span>
                <span data-tutorial-id="host.mois.field.mhk-scheduling-status" style={{ width: 150, textAlign: 'center', fontWeight: 700, border: '1px solid #888', background: mhk.scheduling ? '#8cf08c' : '#f07070' }}>
                  {mhk.scheduling ? 'ENABLED' : 'DISABLED'}
                </span>
                {mhk.scheduling
                  ? <Btn id="prevent-scheduling" onClick={() => setMhk({ scheduling: false, log: log('Prevent Scheduling') })}>Prevent Scheduling</Btn>
                  : <Btn id="allow-scheduling" disabled={mhk.registration !== 'ALLOW'} onClick={() => setMhk({ scheduling: true, log: log('Allow Scheduling') })}>Allow Scheduling</Btn>}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '10px 12px', color: '#555', flex: 'none' }}>This patient has not been invited to myhealthkey.</div>
      )}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBBand>Communication History</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow rows={mhk.log}
            columns={[
              { key: 'when', header: 'Date / Time', width: 130, align: 'center' }, { key: 'event', header: 'Event', width: 300 },
              { key: 'channel', header: 'Channel', width: 110, align: 'center' }, { key: 'status', header: 'Status', width: 100, align: 'center' },
            ]}
            empty="No myhealthkey events for this chart." />
        </div>
      </div>
      {dialog === 'identity' && <IdentityConfirmation patient={p} onClose={() => setDialog(null)} onConfirm={invite} />}
      {dialog === 'deregister' && (
        <TopMessage id="mhk-deregister" title="myhealthkey" icon="question" buttons={['Yes', 'No']} prefix="mhk-deregister-"
          onClose={(b) => (b === 'Yes' ? deregister() : setDialog(null))}>
          {'Deregister this patient from myhealthkey?\nThe patient will no longer be able to book appointments with the clinic.'}
        </TopMessage>
      )}
      {dialog === 'too-soon' && (
        <TopMessage id="mhk-deregister-refused" title="myhealthkey" icon="warn" buttons={['OK']} prefix="mhk-refused-" onClose={() => setDialog(null)}>
          The patient can only be deregistered after completing registration.
        </TopMessage>
      )}
      {dialog === 'checked' && (
        <TopMessage id="mhk-check-status" title="myhealthkey" buttons={['OK']} prefix="mhk-status-" onClose={() => setDialog(null)}>
          {`myhealthkey status: ${mhk.registration === 'NONE' ? 'NOT REGISTERED' : mhk.registration}`}
        </TopMessage>
      )}
    </>
  )
}

/* --- Patient Identity Confirmation ------------------------------------------------ */
function IdentityConfirmation({ patient, onClose, onConfirm }: { patient: Patient; onClose: () => void; onConfirm: () => void }) {
  const [correcting, setCorrecting] = useState(false)
  const rows: [string, string][] = [
    ['First Name:', patient.first ?? ''],
    ['Last Name:', patient.last ?? ''],
    ['DoB:', patient.dob ?? ''],
    ['Admin Gender:', patient.gender ?? ''],
    ['Insurance No.:', patient.bchn || patient.insurance ? `${patient.insuranceBy ?? 'BC'}  ${patient.bchn ?? patient.insurance}` : ''],
    ['eMail:', patient.emailHome ?? ''],
  ]
  const [ok, setOk] = useState<Record<string, boolean>>({})
  const allOk = rows.every(([k, v]) => v && ok[k])
  useScreenReport({ checked: Object.values(ok).filter(Boolean).length })
  return (
    <DetailWindow id="patient-identity-confirmation" title="Patient Identity Confirmation" width={380} onClose={onClose}
      buttons={<>
        <Btn id="identity-confirm" isDefault width={90} disabled={!allOk} onClick={onConfirm}>Confirm (F2)</Btn>
        <Btn id="identity-cancel" width={80} onClick={onClose}>Cancel</Btn>
      </>}>
      <div style={{ margin: 8, padding: 6, border: '2px solid #d33', textAlign: 'center', whiteSpace: 'normal', background: '#fff' }}>
        Please carefully review the patient's Government issued ID to confirm these values are accurate.
      </div>
      <div className="pb-groupbox" style={{ margin: '0 8px 6px' }}>
        <PBBand right={<Btn id="correct-demographics" onClick={() => setCorrecting(true)}>Correct Demographics</Btn>}>Identity</PBBand>
        <div className="pb-row" style={{ padding: '3px 8px', fontWeight: 700 }}>
          <span style={{ width: 90 }}>Chart No.:</span><span style={{ flex: 1 }}>{patient.chart}</span><span>OK?</span>
        </div>
        {rows.map(([k, v]) => (
          <div key={k} className="pb-row" style={{ padding: '2px 8px' }} data-tutorial-id={`host.mois.row.identity-${pbSlug(k)}`}>
            <span style={{ width: 90 }}>{k}</span>
            <span style={{ flex: 1 }}>{v}</span>
            {!v && <span style={{ color: '#e00000', fontWeight: 700, marginRight: 8 }}>✕</span>}
            <PBCheckbox checked={!!ok[k]} disabled={!v} onChange={(c) => setOk((o) => ({ ...o, [k]: c }))} tutorialId={`host.mois.cell.identity-${pbSlug(k)}`} />
          </div>
        ))}
      </div>
      {correcting && <UpdatePatientInformation patient={patient} onClose={() => setCorrecting(false)} />}
    </DetailWindow>
  )
}

function UpdatePatientInformation({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [draft, setDraft] = useState<Partial<Patient>>({
    first: patient.first, middle: patient.middle, last: patient.last, dob: patient.dob, gender: patient.gender,
    insuranceBy: patient.insuranceBy ?? 'BC', insurance: patient.bchn ?? patient.insurance, dep: patient.dep ?? '00',
    address: patient.address, city: patient.city, province: patient.province ?? 'BC', postal: patient.postal, country: patient.country ?? 'Canada',
    home: patient.home, work: patient.work, cell: patient.cell, emailHome: patient.emailHome, emailWork: patient.emailWork,
  })
  const f = (key: keyof Patient, w: number | string = 180) => (
    <PBInput w={w} value={String(draft[key] ?? '')} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} data-tutorial-id={`host.mois.field.update-${pbSlug(String(key))}`} />
  )
  const save = () => {
    const { insurance, ...rest } = draft
    updatePatient(patient.chart, { ...rest, insurance, bchn: insurance })
    savePatient(patient.chart)
    onClose()
  }
  return (
    <DetailWindow id="update-patient-information" title="Update Patient Information" width={520} zIndex={92} onClose={onClose}
      buttons={<>
        <Btn id="update-patient-save" isDefault width={80} onClick={save}>Save (F2)</Btn>
        <Btn id="update-patient-cancel" width={80} onClick={onClose}>Cancel</Btn>
      </>}>
      <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 3, background: '#fff' }}>
        <b style={{ color: '#0a246a' }}>Patient Identification</b>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Chart No.:</FieldLabel><PBInput w={90} readOnly value={patient.chart} style={{ background: '#e8e8e8' }} /></div>
        <div className="pb-row" style={{ gap: 4 }}><FieldLabel>Name (F/M/L):</FieldLabel>{f('first', 110)}{f('middle', 90)}{f('last', 130)}</div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Birth Date:</FieldLabel>{f('dob', 90)}<FieldLabel w={50}>Gender:</FieldLabel>
          <PBSelect w={60} options={['', 'M', 'F', 'X', 'U']} value={String(draft.gender ?? '')} onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value as Patient['gender'] }))} data-tutorial-id="host.mois.field.update-gender" /></div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Insurance by:</FieldLabel>{f('insuranceBy', 50)}<FieldLabel w={80}>Insurance No.:</FieldLabel>{f('insurance', 120)}</div>
        <b style={{ color: '#0a246a', marginTop: 4 }}>Contact Information</b>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Address:</FieldLabel>{f('address', 320)}</div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>City:</FieldLabel>{f('city', 150)}<FieldLabel w={60}>Province:</FieldLabel>{f('province', 50)}</div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Postal Code:</FieldLabel>{f('postal', 90)}<FieldLabel w={60}>Country:</FieldLabel>{f('country', 90)}</div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Home:</FieldLabel>{f('home', 120)}<FieldLabel w={40}>Work:</FieldLabel>{f('work', 120)}</div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>Cell:</FieldLabel>{f('cell', 120)}</div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>eMail (Home):</FieldLabel>{f('emailHome', 320)}</div>
        <div className="pb-row" style={{ gap: 6 }}><FieldLabel>eMail (Work):</FieldLabel>{f('emailWork', 320)}</div>
      </div>
    </DetailWindow>
  )
}

/* --- messaging: the letter-to-PDF approval, and retracting a sent message --------------- */
function MhkLetterPreview({ args, close }: AreaWindowProps) {
  return <LetterPdfPreview name={String(args.name ?? 'Letter')} onDone={close} />
}

function LetterPdfPreview({ name, onDone }: { name: string; onDone: (accepted: boolean) => void }) {
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null)
  useScreenReport({ letter: decision })
  const close = () => onDone(false)
  const args = { text: name }
  return (
    <DetailWindow id="mhk-letter-preview" title={`myhealthkey - ${name}.pdf`} width={640} height={620} zIndex={95} onClose={close}>
      <div style={{ flex: '1 1 auto', minHeight: 0, background: '#808080', padding: 12, overflow: 'auto' }}>
        <div style={{ background: '#fff', maxWidth: 480, margin: '0 auto', minHeight: 420, padding: 30, whiteSpace: 'pre-wrap' }}>{String(args.text ?? 'Letter')}</div>
      </div>
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>This file has been converted to PDF to send to the patient via myhealthkey. Please review and approve or reject.</div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 20, paddingBottom: 10 }}>
        <Btn id="mhk-letter-accept" width={80} onClick={() => { setDecision('accepted'); onDone(true) }}>Accept</Btn>
        <Btn id="mhk-letter-reject" width={80} onClick={() => { setDecision('rejected'); onDone(false) }}>Reject</Btn>
      </div>
    </DetailWindow>
  )
}

function MhkRetractMessage({ close }: AreaWindowProps) {
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  useScreenReport({ retracted: done })
  if (done) {
    return (
      <TopMessage id="mhk-message-retracted" title="Success" buttons={['OK']} prefix="mhk-retracted-" onClose={close}>
        {'This message has been retracted. Please reach out to the myhealthkey support team if you require an audit report for this:\nsupport@myhealthkey.ca'}
      </TopMessage>
    )
  }
  return (
    <DetailWindow id="mhk-retract-message" title="Delete Current Record" width={630} onClose={close}
      buttons={<>
        <Btn id="mhk-retract-continue" isDefault width={110} disabled={!reason.trim()} onClick={() => setDone(true)}>Continue</Btn>
        <Btn id="mhk-retract-cancel" width={110} onClick={close}>Cancel</Btn>
      </>}>
      <div style={{ background: '#fff', whiteSpace: 'normal' }}>
        <div style={{ padding: '8px 12px' }}>
          <div style={{ color: '#e00000', fontWeight: 700 }}>Alert</div>
          This message was sent to a myhealthkey patient account and will be removed from their mhk inbox.  The patient will be notified that a message has been removed from their inbox.
        </div>
        <div style={{ padding: '8px 12px', background: '#fde4e4', borderTop: '1px solid #444', borderBottom: '1px solid #444' }}>
          If this message was sent in error and contains sensitive, personal health information for another patient, please consult your clinic's privacy breach policy.
        </div>
        <div style={{ padding: '8px 12px' }}>Please enter a reason for deleting the message.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 6, padding: '0 12px 10px 70px' }}>
          <span>User Name:</span><b>ADMINISTRATOR</b>
          <span>Date:</span><span>{MOIS_TODAY}</span>
          <span>Time:</span><span>{stampNow().slice(-5)}</span>
          <span>Reason:</span>
          <textarea className="pb-field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.mhk-retract-reason" style={{ resize: 'none', width: 340 }} />
        </div>
      </div>
    </DetailWindow>
  )
}

/* --- Create New Message's myhealthkey parts (inserted by CreateMessageDialog) --------
   `8150b451…`: under Send To / Copies To, a "Copy Patient" grid with "Send To
   Patient" (greyed, with the tooltip "This patient does not have an active
   myhealthkey account." — `12118a0d…`), and across the foot of the window a
   "Notes" grid of the record's attachments with a tick and a blue View
   link; ticked rows go green (`1e681ff7…`). */
export function MhkSendToPatient({ chart, send, onChange }: { chart: string; send: boolean; onChange: (v: boolean) => void }) {
  const [mhk] = useMhkChart(chart)
  const active = !!chart && mhk.registration === 'ALLOW'
  useScreenReport({ sendToPatient: send })
  return (
    <div style={{ flex: 'none', borderTop: '1px solid #a0a0a0', background: '#fff' }} data-tutorial-id="host.mois.group.copy-patient">
      <div style={{ background: '#c6dcf5', textAlign: 'center', height: 19, lineHeight: '19px' }}>Copy Patient</div>
      <div style={{ padding: '4px 6px' }} title={active ? undefined : 'This patient does not have an active myhealthkey account.'}>
        <PBCheckbox label="Send To Patient" checked={send && active} disabled={!active} onChange={onChange} tutorialId="host.mois.field.send-to-patient" />
      </div>
    </div>
  )
}

export function MhkMessageNotes({ notes, picked, onPick }: { notes: string[]; picked: string[]; onPick: (next: string[]) => void }) {
  const [previewing, setPreviewing] = useState<string | null>(null)
  return (
    <div style={{ flex: 'none', margin: '0 18px', border: '1px solid #a0a0a0', borderTop: 0, background: '#fff' }} data-tutorial-id="host.mois.group.message-notes">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', background: '#c6dcf5' }}><span style={{ textAlign: 'center' }}>Notes</span><span /></div>
      {notes.map((n) => (
        <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', alignItems: 'center', background: picked.includes(n) ? '#bff5bf' : undefined }}>
          <PBCheckbox label={n} checked={picked.includes(n)} tutorialId={`host.mois.cell.note-${pbSlug(n)}`}
            onChange={(v) => {
              onPick(v ? [...picked, n] : picked.filter((x) => x !== n))
              /* 2280708: a MOIS letter is converted and must be approved first */
              if (v && /letter/i.test(n)) setPreviewing(n)
            }} />
          <button type="button" className="pb-link" style={{ fontWeight: 700, textDecoration: 'underline' }} data-tutorial-id={`host.mois.command.view-note-${pbSlug(n)}`}>View</button>
        </div>
      ))}
      {previewing && (
        <LetterPdfPreview name={previewing} onDone={(accepted) => {
          if (!accepted) onPick(picked.filter((x) => x !== previewing))
          setPreviewing(null)
        }} />
      )}
    </div>
  )
}

registerFolderView(['mhk'], MyHealthKeyChartView)
registerAreaWindow('mhk-letter-preview', MhkLetterPreview)
registerAreaWindow('mhk-retract-message', MhkRetractMessage)
