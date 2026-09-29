import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { PBCheckbox, PBDataWindow, PBInput, PBMessageBox, PBRadio, PBSelect, PBTextArea } from '../../pb'
import { plusDays, unsentFromSent, useSentClaims, useUnsentClaims } from '../../data/billingStore'
import { sentClaimPatient, type SentClaim } from '../../data/claims'
import { usePatientRoster } from '../../data/patient-context'
import { MOIS_TODAY } from '../../data/patients'
import { useScreenReport } from '../../host/screen-state'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import { FormLine } from '../formKit'
import { useTickSet } from '../listKit'

/* ============================================================================
   Sent Claims ▸ Utilities ▸ Claim Review Wizard: find a batch of sent claims
   that share a problem and act on them together (3786544 "How to Use the
   Claim Review Wizard"; 303602 "This allows the user to resubmit batches of
   Failed or Rejected Claims").

   Three windows, each opened by id and handing the claim ids on:

   · MSP - Review Wizard — `msp-review-wizard`. PROVENANCE: `989ee848`
     (1195 x 922). A blue "Choose claims that match:" band; Claim Sent Date
     (Ignore Sent Date · Sent in the last [ ] day(s) · Sent date after · Sent
     date before · Sent date between [ ] and [ ]) beside Service Date (the
     same five); Reconciliation Codes (Include ALL R1 codes ☐; R1 Code(s)
     [<blank only>] ◉ Claims with these codes ○ Claims without these codes;
     R2 Code(s) [ ] with the same pair; ☐ Included Written Off Claims.);
     Other Parameters (Explanatory Code(s), Fee Code(s), Diagnosis Code(s) —
     "Seperate additional codes with commas." — Doctor and Last Name — "Use *
     for wildcald search" — and Payee No.); Continue and Cancel. The
     captions' own spellings are kept.
   · Claim Review Window — `claim-review-window`. PROVENANCE: `b83a4544`
     (672 x 1020): R1 | R2 | W/O | Patient | Doctor | Exclude, "Claim Count:
     n" at the foot, Resubmit... Accept... Write Off... Delete... and Close.
   · The action box each of those four raises. PROVENANCE: `6cd43398`
     ("Accept Selected Claim(s)": an "Additional Actions:" group with
     "Include the following office note on each claim:" and "☐ Update the
     patient's status to [Transient Patient ▼]"; the yellow note "Claims
     with the following MSP reconciliation status will be excluded from the
     list: - Unacknowledged Claims (U) - not adjudicated by MSP - Held
     Claims (H) - held by MSP for further review"; "Would you like to accept
     the selected claims?" Yes / No). Resubmit / Write Off / Delete use the
     same box with their own verb — INFERRED, only Accept is captured.
   · Resubmission Wizard — `resubmission-wizard`. PROVENANCE: `4e254b41`
     (553 x 600): "Change resubmitted claim value(s):"; Select Item to Change
     / New Code — Fee Code, Clarification Code, Submission Code, Facility
     No., Location; Add Note ◉ No Note ○ Claim Note ○ MSP Note with its box;
     the NOTE (U and H claims skipped, previously resubmitted and
     marked-for-delete claims not resubmitted); Continue / Cancel. "Once
     done select continue, the claims will now be created and found in the
     Unsent Claims Folder ready for resubmission."

   What each action does to a claim: Resubmit — R1 = R and a corrected copy
   in Unsent Claims; Accept — R1 = A (the code Toggle - Approve / Adjust
   sets); Write Off — WO = Y; Delete — R1 = D ("Mark for Delete"). U and H
   claims are skipped by all four.
   ========================================================================= */

const band: CSSProperties = {
  background: 'linear-gradient(#5aa9e6, #2f7fc8)', color: '#0a1f5c', fontWeight: 700, padding: '4px 8px', flex: 'none',
}
const group: CSSProperties = { borderTop: '1px solid #c8c8c8', padding: '8px 14px' }
const hint: CSSProperties = { color: '#404040' }

type DateMode = 'ignore' | 'last' | 'after' | 'before' | 'between'

function DateBlock({ title, noun, state, set, id }: {
  title: string; noun: 'Sent' | 'Service'
  state: { mode: DateMode; a: string; b: string }
  set: (s: { mode: DateMode; a: string; b: string }) => void
  id: string
}) {
  const row = (mode: DateMode, label: string, extra?: ReactNode) => (
    <FormLine
      w={170} gap={8} minHeight={24} align="center" labelClass={false}
      label={<PBRadio name={`${id}-date`} label={label} checked={state.mode === mode} onChange={() => set({ ...state, mode })} tutorialId={`host.mois.radio.${id}-${mode}`} />}
    >
      {extra}
    </FormLine>
  )
  const box = (key: 'a' | 'b', w = 110, on = true) => (
    <PBInput w={w} value={state[key]} disabled={!on} onChange={(e) => set({ ...state, [key]: e.target.value })} data-tutorial-id={`host.mois.field.${id}-${key}`} />
  )
  return (
    <div style={{ flex: '1 1 50%' }}>
      <div style={{ fontWeight: 700, paddingBottom: 6 }}>{title}</div>
      <div style={{ paddingLeft: 30 }}>
        {row('ignore', `Ignore ${noun} Date`)}
        {row('last', `${noun} in the last`, <>{box('a', 56, state.mode === 'last')}<span style={hint}>day(s)</span></>)}
        {row('after', `${noun} date after`, box('a', 110, state.mode === 'after'))}
        {row('before', `${noun} date before`, box('a', 110, state.mode === 'before'))}
        {row('between', `${noun} date between`, <>{box('a', 110, state.mode === 'between')}<span style={hint}>and</span>{box('b', 110, state.mode === 'between')}</>)}
      </div>
    </div>
  )
}

const dateMatches = (value: string, s: { mode: DateMode; a: string; b: string }) => {
  const a = s.a.trim()
  const b = s.b.trim()
  switch (s.mode) {
    case 'last': return !a || value >= plusDays(MOIS_TODAY, -(Number(a) || 0))
    case 'after': return !a || value > a
    case 'before': return !a || value < a
    case 'between': return (!a || value >= a) && (!b || value <= b)
    default: return true
  }
}

const codes = (v: string) => v.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)
const wild = (pattern: string, value: string) => {
  const p = pattern.trim().toUpperCase()
  if (!p) return true
  const re = new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}`)
  return re.test(value.toUpperCase())
}

export function MspReviewWizard({ close, open }: AreaWindowProps) {
  const sent = useSentClaims()
  const [sentDate, setSentDate] = useState({ mode: 'ignore' as DateMode, a: '', b: '' })
  const [serviceDate, setServiceDate] = useState({ mode: 'ignore' as DateMode, a: '', b: '' })
  const [allR1, setAllR1] = useState(false)
  const [r1, setR1] = useState('<blank only>')
  const [r1With, setR1With] = useState(true)
  const [r2, setR2] = useState('')
  const [r2With, setR2With] = useState(true)
  const [writtenOff, setWrittenOff] = useState(false)
  const [expl, setExpl] = useState('')
  const [fees, setFees] = useState('')
  const [diags, setDiags] = useState('')
  const [doctor, setDoctor] = useState('')
  const [last, setLast] = useState('')
  const [payee, setPayee] = useState('')
  const [none, setNone] = useState(false)

  const matches = useMemo(() => sent.rows.filter((c) => {
    if (!dateMatches(c.sent, sentDate) || !dateMatches(c.service, serviceDate)) return false
    if (!allR1) {
      const want = r1.trim() === '<blank only>' || !r1.trim() ? [''] : codes(r1)
      const has = want.includes(c.r1.toUpperCase())
      if (has !== r1With) return false
    }
    if (r2.trim()) { const has = codes(r2).includes(c.r2.toUpperCase()); if (has !== r2With) return false }
    if (!writtenOff && c.wo === 'Y') return false
    if (expl.trim() && !codes(expl).some((e) => [c.e1, c.e2, c.e3].includes(e))) return false
    if (fees.trim() && !codes(fees).includes(c.fee)) return false
    if (diags.trim() && !codes(diags).includes(c.diag)) return false
    if (!wild(doctor, c.doctor) || !wild(last, c.last)) return false
    if (payee.trim() && c.payee !== payee.trim()) return false
    return true
  }), [allR1, diags, doctor, expl, fees, last, payee, r1, r1With, r2, r2With, sent.rows, sentDate, serviceDate, writtenOff])

  useScreenReport({ matches: matches.length })

  const other = (label: string, value: string, set: (v: string) => void, note: string, id: string) => (
    <FormLine label={label} w={150} gap={10} minHeight={25} align="center" labelClass={false} labelStyle={{ paddingLeft: 20 }}>
      <PBInput w={330} value={value} onChange={(e) => set(e.target.value)} data-tutorial-id={`host.mois.field.review-${id}`} />
      <span>{note}</span>
    </FormLine>
  )

  return (
    <WorkspaceDialogFrame id="msp-review-wizard" title="MSP - Review Wizard" width={1000} height={780} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff', border: '1px solid #8c8c8c', margin: 1 }}>
        <div style={band}>Choose claims that match:</div>
        <div style={{ display: 'flex', padding: '8px 14px' }}>
          <DateBlock title="Claim Sent Date:" noun="Sent" state={sentDate} set={setSentDate} id="review-sent" />
          <DateBlock title="Service Date:" noun="Service" state={serviceDate} set={setServiceDate} id="review-service" />
        </div>
        <div style={group}>
          <div style={{ fontWeight: 700, paddingBottom: 6 }}>Reconciliation Codes:</div>
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '176px 130px auto', rowGap: 4, alignItems: 'center', paddingLeft: 36 }}>
              <span>Include ALL R1 codes:</span>
              <PBCheckbox checked={allR1} onChange={setAllR1} tutorialId="host.mois.check.review-all-r1" />
              <span />
              <span>R1 Code(s):</span>
              <PBInput w={120} value={r1} disabled={allR1} onChange={(e) => setR1(e.target.value)} data-tutorial-id="host.mois.field.review-r1" />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <PBRadio name="review-r1" label="Claims with these codes" checked={r1With} disabled={allR1} onChange={() => setR1With(true)} />
                <PBRadio name="review-r1" label="Claims without these codes" checked={!r1With} disabled={allR1} onChange={() => setR1With(false)} />
              </span>
              <span>R2 Code(s):</span>
              <PBInput w={120} value={r2} onChange={(e) => setR2(e.target.value.toUpperCase())} data-tutorial-id="host.mois.field.review-r2" />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <PBRadio name="review-r2" label="Claims with these codes" checked={r2With} onChange={() => setR2With(true)} />
                <PBRadio name="review-r2" label="Claims without these codes" checked={!r2With} onChange={() => setR2With(false)} />
              </span>
            </div>
            <span style={{ flex: '1 1 auto' }} />
            <PBCheckbox label="Included Written Off Claims." checked={writtenOff} onChange={setWrittenOff} tutorialId="host.mois.check.review-written-off" />
            <span style={{ width: 120 }} />
          </div>
        </div>
        <div style={group}>
          <div style={{ fontWeight: 700, paddingBottom: 6 }}>Other Parameters:</div>
          {other('Explanatory Code(s):', expl, (v) => setExpl(v.toUpperCase()), 'Seperate additional codes with commas.', 'explanatory-codes')}
          {other('Fee Code(s) :', fees, setFees, 'Seperate additional codes with commas.', 'fee-codes')}
          {other('Diagnosis Code(s):', diags, setDiags, 'Seperate additional codes with commas.', 'diagnosis-codes')}
          {other('Doctor:', doctor, (v) => setDoctor(v.toUpperCase()), 'Use * for wildcald search', 'doctor')}
          {other('Last Name:', last, (v) => setLast(v.toUpperCase()), 'Use * for wildcald search', 'last-name')}
          {other('Payee No.:', payee, setPayee, '', 'payee')}
        </div>
        <span style={{ flex: '1 1 auto' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '14px 0', flex: 'none' }}>
        <DialogButton
          id="review-continue"
          isDefault
          width={110}
          onClick={() => {
            if (!matches.length) { setNone(true); return }
            open('claim-review-window', { ids: matches.map((c) => c.id) })
          }}
        >
          Continue
        </DialogButton>
        <DialogButton id="review-wizard-cancel" width={110} onClick={close}>Cancel</DialogButton>
      </div>
      {none && (
        <PBMessageBox title="MSP - Review Wizard" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'review-none-ok' }]} onClose={() => setNone(false)}>
          No claims match these parameters.
        </PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- Claim Review Window ------------------------------------------------- */

type Action = 'resubmit' | 'accept' | 'write-off' | 'delete'
const ACTION_TITLE: Record<Action, [string, string]> = {
  resubmit: ['Resubmit Selected Claim(s)', 'resubmit'],
  accept: ['Accept Selected Claim(s)', 'accept'],
  'write-off': ['Write Off Selected Claim(s)', 'write off'],
  delete: ['Delete Selected Claim(s)', 'delete'],
}

const STATUSES = ['Transient Patient', 'Active', 'Inactive', 'Deceased', 'Moved']

/** U and H claims are never acted on (the yellow note, `6cd43398`). */
const actionable = (c: SentClaim) => c.r2 !== 'U' && c.r2 !== 'H'

export function ClaimReviewWindow({ args, close, open }: AreaWindowProps) {
  const sent = useSentClaims()
  const ids = (args.ids as string[] | undefined) ?? []
  const rows = sent.rows.filter((c) => ids.includes(c.id)).sort((a, b) => a.last.localeCompare(b.last))
  const excluded = useTickSet<string>()
  const [cur, setCur] = useState(0)
  const [action, setAction] = useState<Action | null>(null)
  const [note, setNote] = useState('')
  const [updateStatus, setUpdateStatus] = useState(false)
  const [status, setStatus] = useState(STATUSES[0]!)
  const [done, setDone] = useState<string | null>(null)
  const chosen = rows.filter((c) => !excluded.has(c.id) && actionable(c))

  useScreenReport({
    claims: rows.length,
    excluded: excluded.size,
    ...(action ? { confirm: action } : {}),
  })

  const apply = (a: Action) => {
    const target = chosen.map((c) => c.id)
    const withNote = note.trim() ? { note: note.trim() } : {}
    if (a === 'resubmit') { open('resubmission-wizard', { ids: target, note: note.trim() }); return }
    if (a === 'accept') sent.patch(target, { r1: 'A', approved: true, ...withNote })
    else if (a === 'write-off') sent.patch(target, { wo: 'Y', woDate: MOIS_TODAY, ...withNote })
    else sent.patch(target, { r1: 'D', ...withNote })
    setDone(`${target.length} claim(s) ${a === 'accept' ? 'accepted' : a === 'write-off' ? 'written off' : 'marked for delete'}.`)
  }

  return (
    <WorkspaceDialogFrame id="claim-review-window" title="Claim Review Window" width={672} height={760} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8 }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #8c8c8c', background: '#fff' }}>
          <PBDataWindow
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[
              { key: 'r1', header: 'R1', width: 36, align: 'center' },
              { key: 'r2', header: 'R2', width: 36, align: 'center' },
              { key: 'wo', header: 'W/O', width: 40, align: 'center' },
              { key: 'patient', header: 'Patient', width: 250, render: (c: SentClaim) => `${c.last} ${c.first}` },
              { key: 'doctor', header: 'Doctor', width: 150 },
              {
                key: 'exclude', header: 'Exclude', width: 70, align: 'center',
                render: (c: SentClaim) => (
                  <PBCheckbox
                    checked={excluded.has(c.id)}
                    onChange={(v) => excluded.set(c.id, v)}
                    tutorialId={`host.mois.check.claim-review-exclude-${c.last.toLowerCase()}`}
                  />
                ),
              },
            ]}
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            rowTutorialId={(c) => `host.mois.row.claim-review-${c.last.toLowerCase()}`}
          />
          <div style={{ color: '#707070', padding: '4px 20px', flex: 'none' }}>Claim Count: {rows.length}</div>
        </div>
        <div className="pb-row" style={{ gap: 6, paddingTop: 8, flex: 'none' }}>
          <DialogButton id="claim-review-resubmit" width={110} disabled={!chosen.length} onClick={() => setAction('resubmit')}>Resubmit...</DialogButton>
          <DialogButton id="claim-review-accept" width={110} disabled={!chosen.length} onClick={() => setAction('accept')}>Accept...</DialogButton>
          <DialogButton id="claim-review-write-off" width={110} disabled={!chosen.length} onClick={() => setAction('write-off')}>Write Off...</DialogButton>
          <DialogButton id="claim-review-delete" width={110} disabled={!chosen.length} onClick={() => setAction('delete')}>Delete...</DialogButton>
          <span style={{ flex: '1 1 auto' }} />
          <DialogButton id="claim-review-close" width={100} onClick={close}>Close</DialogButton>
        </div>
      </div>

      {action && (
        <>
          <WorkspaceDialogFrame id={`claim-review-${action}-confirm`} title={ACTION_TITLE[action][0]} width={530} height={500} controls={false} zIndex={90} onClose={() => setAction(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: '10px 14px', gap: 10 }}>
              <fieldset style={{ border: '1px solid #c8c8c8', padding: '6px 8px', flex: '1 1 auto' }}>
                <legend>Additional Actions:</legend>
                <div>Include the following office note on each claim:</div>
                <PBTextArea rows={3} w="100%" value={note} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.claim-review-note" />
                <div className="pb-row" style={{ gap: 8, paddingTop: 8 }}>
                  <PBCheckbox label="Update the patient's status to" checked={updateStatus} onChange={setUpdateStatus} tutorialId="host.mois.check.claim-review-update-status" />
                  <PBSelect w={260} options={STATUSES} value={status} disabled={!updateStatus} onChange={(e) => setStatus(e.target.value)} data-tutorial-id="host.mois.field.claim-review-status" />
                </div>
              </fieldset>
              <div style={{ background: '#ffffd8', border: '1px solid #404040', padding: '6px 10px', flex: 'none' }}>
                Claims with the following MSP reconciliation status will be excluded from the list:
                <div style={{ paddingLeft: 12 }}>- Unacknowledged Claims (U) - not adjudicated by MSP</div>
                <div style={{ paddingLeft: 12 }}>- Held Claims (H) - held by MSP for further review</div>
              </div>
              <div>Would you like to {ACTION_TITLE[action][1]} the selected claims?</div>
              <div className="pb-row" style={{ justifyContent: 'center', gap: 20 }}>
                <DialogButton id="claim-review-yes" isDefault onClick={() => { const a = action; setAction(null); apply(a) }}>Yes</DialogButton>
                <DialogButton id="claim-review-no" onClick={() => setAction(null)}>No</DialogButton>
              </div>
            </div>
          </WorkspaceDialogFrame>
        </>
      )}
      {done && (
        <PBMessageBox title="Claim Review Window" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'claim-review-ok' }]} onClose={() => setDone(null)}>
          {done}
        </PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- Resubmission Wizard ---------------------------------------------------- */

type Item = 'fee' | 'clar' | 'sub' | 'facility' | 'location'
const ITEMS: { key: Item; label: string }[] = [
  { key: 'fee', label: 'Fee Code' },
  { key: 'clar', label: 'Clarification Code' },
  { key: 'sub', label: 'Submission Code' },
  { key: 'facility', label: 'Facility No.' },
  { key: 'location', label: 'Location' },
]

export function ResubmissionWizard({ args, close }: AreaWindowProps) {
  const roster = usePatientRoster()
  const sent = useSentClaims()
  const unsent = useUnsentClaims(roster)
  const ids = (args.ids as string[] | undefined) ?? []
  const [on, setOn] = useState<Record<Item, boolean>>({ fee: false, clar: false, sub: false, facility: false, location: false })
  const [value, setValue] = useState<Record<Item, string>>({ fee: '', clar: '', sub: '', facility: '', location: '' })
  const [noteKind, setNoteKind] = useState<'none' | 'claim' | 'msp'>('none')
  const [note, setNote] = useState(String(args.note ?? ''))
  const [done, setDone] = useState<number | null>(null)

  useScreenReport({ items: ITEMS.filter((i) => on[i.key]).map((i) => i.key).join(',') || 'none', note: noteKind })

  const cont = () => {
    /* "Previously resubmitted claims and marked for delete claims will not be
       resubmitted"; U and H are skipped */
    const target = sent.rows.filter((c) => ids.includes(c.id) && actionable(c) && c.r1 !== 'R' && c.r1 !== 'D')
    const copies = target.map((c) => {
      const row = unsentFromSent(c, sentClaimPatient(c), 'resubmit')
      return {
        ...row,
        ...(on.fee && value.fee.trim() ? { fee: value.fee.trim() } : {}),
        ...(on.clar && value.clar.trim() ? { clar: value.clar.trim().toUpperCase() } : {}),
        ...(on.sub && value.sub.trim() ? { sub: value.sub.trim().toUpperCase() } : {}),
        ...(on.facility && value.facility.trim() ? { facility: value.facility.trim() } : {}),
        ...(on.location && value.location.trim() ? { location: value.location.trim().toUpperCase() } : {}),
      }
    })
    unsent.add(copies)
    sent.patch(target.map((c) => c.id), { r1: 'R', ...(noteKind !== 'none' && note.trim() ? { note: note.trim() } : {}) })
    setDone(copies.length)
  }

  return (
    <WorkspaceDialogFrame id="resubmission-wizard" title="Resubmission Wizard" width={553} height={600} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff', border: '1px solid #8c8c8c', margin: 1 }}>
        <div style={band}>Change resubmitted claim value(s):</div>
        <div style={{ padding: '10px 36px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 30, paddingBottom: 6 }}><span style={{ width: 134 }}>Select Item to Change</span><span>New Code</span></div>
          {ITEMS.map((i) => (
            <FormLine
              key={i.key} w={134} gap={30} minHeight={26} labelClass={false}
              label={<PBCheckbox label={i.label} checked={on[i.key]} onChange={(v) => setOn({ ...on, [i.key]: v })} tutorialId={`host.mois.check.resubmit-${i.key}`} />}
            >
              <PBInput
                w={104}
                value={value[i.key]}
                disabled={!on[i.key]}
                onChange={(e) => setValue({ ...value, [i.key]: e.target.value })}
                data-tutorial-id={`host.mois.field.resubmit-${i.key}`}
              />
            </FormLine>
          ))}
          <div style={{ paddingTop: 8 }}>Add Note</div>
          <div className="pb-row" style={{ alignItems: 'flex-start', gap: 30, paddingTop: 4 }}>
            <div style={{ width: 134, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <PBRadio name="resubmit-note" label="No Note" checked={noteKind === 'none'} onChange={() => setNoteKind('none')} tutorialId="host.mois.radio.resubmit-no-note" />
              <PBRadio name="resubmit-note" label="Claim Note" checked={noteKind === 'claim'} onChange={() => setNoteKind('claim')} tutorialId="host.mois.radio.resubmit-claim-note" />
              <PBRadio name="resubmit-note" label="MSP Note" checked={noteKind === 'msp'} onChange={() => setNoteKind('msp')} tutorialId="host.mois.radio.resubmit-msp-note" />
            </div>
            <PBTextArea rows={3} w={250} value={note} disabled={noteKind === 'none'} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.resubmit-note" />
          </div>
        </div>
        <div style={{ borderTop: '1px solid #8c8c8c', padding: '6px 12px', flex: '1 1 auto' }}>
          <div>NOTE:</div>
          <div style={{ paddingLeft: 40 }}>U claims will not be resubmitted (these will be automatically skipped)</div>
          <div style={{ paddingLeft: 40 }}>H claims will not be resubmitted (these will be automatically skipped)</div>
          <div style={{ paddingLeft: 40 }}>Previously resubmitted claims and marked for delete claims will not be resubmitted.</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '10px 0', flex: 'none' }}>
        <DialogButton id="resubmit-continue" isDefault width={94} onClick={cont}>Continue</DialogButton>
        <DialogButton id="resubmit-cancel" width={94} onClick={close}>Cancel</DialogButton>
      </div>
      {done !== null && (
        <PBMessageBox
          title="Resubmission Wizard"
          buttons={[{ label: 'OK', value: 'ok', default: true, command: 'resubmit-ok' }]}
          onClose={() => { setDone(null); close() }}
        >
          {`${done} claim(s) created in Unsent Claims, ready for resubmission.`}
        </PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

export function registerSentReviewWizard() {
  registerAreaWindow('msp-review-wizard', MspReviewWizard)
  registerAreaWindow('claim-review-window', ClaimReviewWindow)
  registerAreaWindow('resubmission-wizard', ResubmissionWizard)
}

registerSentReviewWizard()
