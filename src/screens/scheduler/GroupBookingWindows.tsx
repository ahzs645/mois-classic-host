import { useEffect, useState, type ReactNode } from 'react'
import {
  PBBand, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTabs, PBTextArea, pbSlug,
} from '../../pb'
import { UNSENT_ADDED_KEY, type UnsentClaim } from '../../data/claims'
import { daybookProviders } from '../../data/mois'
import { usePatientRoster } from '../../data/patient-context'
import {
  groupKeyOf, schedulerExtras, useSchedulerExtras,
  type GroupPatient, type GroupVisitRow, type GroupVisitState,
} from '../../data/schedulerExtras'
import { useSessionState } from '../../host/screen-windows'
import { useScreenReport } from '../../host/screen-state'
import { UniversalSearchDialog } from '../CodeLookupDialogs'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import { RaisedMessageBox } from '../RaisedMessageBox'
import { NAVY } from '../formKit'
import { useTickSet } from '../listKit'

/* ============================================================================
   Group Bookings — the windows behind the Group Visit List's Prepare for
   Meeting, Create MSP Claims and Clone Appt buttons.

   PROVENANCE: art. 303808 "Group Bookings".
   - Prepare for Meeting: `95a60b59…` (the button on the Group Visit List)
     and `3d8ad014…` (the window): a `Group Appointment` band — Date: @ hh :
     mm, Provider:, Topic: code and description; `Encounter Information`
     (Diagnostic Code […], Fee Code […], "(if above fields are blank, do
     nothing; if above fields have a value, existing codes will be
     updated)"); `Other` (Name Tags: ◉ Not required ○ Print label ○ Export
     to CSV); `Progress Note` (◉ Create new note with text ○ Replace last
     note with text ○ Add text to end of last note ○ Add text to beginning
     of last note, and Lookup Template…), the note text, Ok / Cancel.
   - Batch MSP Billing Summary: `fd614f7b…` (Create MSP Claims on the
     v02.3x Group Visit List) and `e54c6a8f…` (Group Visit - Bill MSP):
     `Group Visit Detail` (Appointment Date @ time, Provider, Topic);
     four Fee Code […] / Health Issues […] / Services rows; `Other Detail
     (optional)`: Start Time, Stop Time, two Refer: ○ N/A ○ To ○ By lines
     with a provider box […], MSP Note, and Create MSP Claims; then the
     Patient List (last, first, Appt. Status, Payor, Exclude) where a
     Cancelled / Rebooked / No Show patient is struck through and cannot be
     billed. `b006fbc2…` / `f5dbf0ca…`: the claims land in Billing ▸ Unsent
     MSP.
   - Clone Appointment: `6726c142…` (Clone Appt) and `934bc8a3…` (Clone
     Group Booking): `Group Visit Detail` beside `New Group Visit
     Information` (Appt Date, Time, Duration, Visit Code; Provider; Service
     Location; Topic […] and its description; Clone Appt), then Patient List
     / Other Provider List / Other Resource List tabs whose rows carry an
     Include tick (Last Name, First Name, Chart, AS). The article: "You must
     reselect the Topic by clicking the ellipses (…) and confirm the
     selection."
   - Group Bookings ▸ Action ▸ Print Name Tags (art. 303239).

   INFERRED: Lookup Template…'s list (art. 303808 names it the "Text and
   Label list"); what Print label / Export to CSV print (drawn as the name
   tag page and the spreadsheet's columns — "full name, provider,
   appointment date and visit code" — in the Print Preview); the refusal
   when Clone Appt is pressed before the Topic is reselected.

   Window ids: `prepare-for-meeting`, `group-visit-bill-msp`,
   `clone-group-booking`, `print-name-tags`. Each acts on the Group Visit
   List's current row (`schedulerExtras.currentVisit`).
   ========================================================================= */

/** The two patients the training group visits open with. */
export const SEED_PATIENTS: GroupPatient[] = [
  { chart: '10204', first: 'PRIYA', last: 'RAO', code: 'G', mode: 'DE', reason: 'Group session', issue: '', services: '', as: '', ds: 'I', bs: 'I', t: '-' },
  { chart: '10177', first: 'OSCAR', last: 'LINDQVIST', code: 'G', mode: 'DE', reason: 'Group session', issue: '', services: '', as: '', ds: 'I', bs: 'I', t: '-' },
  { chart: '10088', first: 'MARGARET', last: 'HALE', code: 'G', mode: 'DE', reason: 'Group session', issue: '', services: '', as: 'N', ds: 'I', bs: 'I', t: '-' },
]

export const blankGroup = (): GroupVisitState => ({
  patients: [], providers: [], resources: [], comment: '', room: '', resource: '',
  notes: [], nameTags: 'Not required', claimed: false,
})

/** A visit's lists as the session has left them; a training visit with a
    topic opens with the seed patients. */
export function groupListsFor(v: GroupVisitRow | null | undefined, groups = schedulerExtras.get().groups): GroupVisitState {
  if (!v) return blankGroup()
  const saved = groups[groupKeyOf(v)]
  if (saved) return saved
  return {
    ...blankGroup(),
    patients: v.desc && v.date ? SEED_PATIENTS.map((p) => ({ ...p, code: v.code || p.code })) : [],
    providers: v.series ? [{ name: 'DHALIWAL, RUPINDER', note: '', reserved: false }] : [],
  }
}

export function updateGroup(v: GroupVisitRow, patch: Partial<GroupVisitState>) {
  schedulerExtras.setGroup(groupKeyOf(v), patch, groupListsFor(v))
}

const BAND = { background: '#dce6f4', color: '#606080', padding: '2px 6px', borderBottom: '1px solid #b8c8e0' } as const

function VisitDetail({ v }: { v: GroupVisitRow }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 8px' }}>
      <span style={{ color: '#606060' }}>Appointment Date</span>
      <b>{v.date}{'  '}@ {v.hr} : {v.min}</b>
      <span style={{ color: '#606060' }}>Provider</span>
      <b>{v.provider}</b>
      <span><span style={{ color: '#606060' }}>Topic</span>{'  '}{v.topic}</span>
      <b>{v.desc}</b>
    </div>
  )
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid #a8a8a8', boxShadow: 'inset 1px 1px 0 #fff', padding: '2px 8px 6px' }}>
      <div style={{ fontWeight: 700, padding: '2px 0 4px' }}>{title}</div>
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Prepare for Meeting
   ------------------------------------------------------------------------ */
const NOTE_MODES = [
  'Create new note with text', 'Add text to end of last note',
  'Replace last note with text', 'Add text to beginning of last note',
] as const

/** Lookup Template… — INFERRED list (art. 303808: "prompts a Text and Label list") */
const TEXT_TEMPLATES: { label: string; text: string }[] = [
  {
    label: 'DM GROUP - PLAN FOR PATIENT CARE',
    text: 'Plan for Patient Care   DM\n-hemoglobin A1c <7.0 reduces risk of cardiac disease, kidney failure, visual loss and amputation.\n-blood pressure target <130/80, or less\n-reduction of cholesterol - LDL-C <2.0 mmol/L and TC/HDL-C ratio <4.0\n-independence, self-management, exercise, smoking cessation (if applicable), moderate alcohol consumption\n-doctor visits every three months, blood work planned three months ahead and done one week before each doctor visit\n\nPatient Values and Personal Health Goals\n\n\nExpected Outcomes\n-prevention of complications, quality of life, longevity\n\nLinkages\n-diabetic education clinic visits as needed for certification\n-home care nursing\n-social worker\n-home and community care assessment\n-medical consultations planned',
  },
  { label: 'GROUP ATTENDANCE', text: 'Patient attended the group session. Education provided; questions answered.' },
  { label: 'PRENATAL GROUP', text: 'Group prenatal visit. Topics reviewed: nutrition, activity, warning signs. Vitals recorded individually.' },
]

function PrepareForMeeting({ close, open }: AreaWindowProps) {
  const extras = useSchedulerExtras()
  const v = extras.currentVisit
  const lists = groupListsFor(v, extras.groups)
  const [diag, setDiag] = useState('')
  const [fee, setFee] = useState('')
  const [tags, setTags] = useState('Not required')
  const [mode, setMode] = useState<string>(NOTE_MODES[0])
  /* "your previous text will not show in this text box if you close the
     window and reopen" (303808) — it always opens empty */
  const [text, setText] = useState('')
  const [stage, setStage] = useState<'' | 'template' | 'diag'>('')
  const [tplCur, setTplCur] = useState(0)
  useScreenReport({ window: stage === 'template' ? 'text-template-list' : stage === 'diag' ? 'universal-search' : '', nameTags: pbSlug(tags), noteMode: pbSlug(mode) })
  if (!v) {
    return (
      <RaisedMessageBox title="Prepare for Meeting" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={close}>
        Select a group visit first.
      </RaisedMessageBox>
    )
  }
  const ok = () => {
    const attending = lists.patients.filter((p) => !['C', 'R', 'N'].includes(p.as))
    const patients = lists.patients.map((p) => (attending.includes(p)
      ? { ...p, ds: text.trim() ? 'C' : p.ds, ...(diag.trim() ? { issue: diag.trim() } : {}), ...(fee.trim() ? { services: fee.trim() } : {}) }
      : p))
    updateGroup(v, {
      patients,
      nameTags: tags,
      notes: text.trim() ? [...lists.notes, { mode, text, at: v.date }] : lists.notes,
    })
    schedulerExtras.done(text.trim() ? 'group-notes-written' : 'meeting-prepared')
    close()
    if (tags === 'Print label') open('print-name-tags')
    if (tags === 'Export to CSV') open('print-name-tags', { csv: true })
  }
  return (
    <>
      <WorkspaceDialogFrame id="prepare-for-meeting" title="Prepare for Meeting" width={915} height={640} onClose={close} controls={false} zIndex={85}>
        <div style={{ margin: 6, border: '1px solid #a0a0a0', flex: 'none' }}>
          <PBBand>Group Appointment</PBBand>
          <div className="pb-row" style={{ gap: 0, padding: '8px 10px' }} data-tutorial-id="host.mois.field.group-appointment">
            <span style={{ width: 290 }}>Date:&nbsp;&nbsp;<b>{v.date}&nbsp;&nbsp;@ {v.hr} : {v.min}</b></span>
            <span style={{ width: 240 }}>Provider:&nbsp;&nbsp;<b>{v.provider}</b></span>
            <span>Topic:&nbsp;&nbsp;<b>{v.topic}</b>&nbsp;&nbsp;&nbsp;&nbsp;<b>{v.desc}</b></span>
          </div>
        </div>
        <div className="pb-row" style={{ gap: 6, margin: '0 6px', alignItems: 'stretch', flex: 'none' }}>
          <div style={{ flex: '1 1 auto' }}>
            <Frame title="Encounter Information">
              <div className="pb-row" style={{ gap: 6 }}>
                <span>Diagnostic Code:</span>
                <PBInput w={92} value={diag} onChange={(e) => setDiag(e.target.value)} data-tutorial-id="host.mois.field.meeting-diagnostic-code" />
                <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button" onClick={() => setStage('diag')}>…</button>
                <span style={{ marginLeft: 60 }}>Fee Code:</span>
                <PBInput w={92} value={fee} onChange={(e) => setFee(e.target.value)} data-tutorial-id="host.mois.field.meeting-fee-code" />
                <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button">…</button>
              </div>
              <div style={{ color: '#404040', paddingTop: 4 }}>(if above fields are blank, do nothing; if above fields have a value, existing codes will be updated)</div>
            </Frame>
          </div>
          <div style={{ width: 390, flex: 'none' }}>
            <Frame title="Other">
              <div className="pb-row" style={{ gap: 18, paddingTop: 6 }} data-tutorial-id="host.mois.field.name-tags">
                <span>Name Tags:</span>
                {['Not required', 'Print label', 'Export to CSV'].map((t) => (
                  <PBRadio key={t} name="name-tags" label={t} checked={tags === t} onChange={() => setTags(t)} tutorialId={`host.mois.field.name-tags-${pbSlug(t)}`} />
                ))}
              </div>
            </Frame>
          </div>
        </div>
        <div style={{ margin: 6, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #a8a8a8', padding: '2px 8px 8px' }}>
          <div style={{ fontWeight: 700, padding: '2px 0 4px' }}>Progress Note</div>
          <div className="pb-row" style={{ alignItems: 'flex-start', flex: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '230px 240px', rowGap: 3 }} data-tutorial-id="host.mois.field.progress-note-mode">
              {NOTE_MODES.map((m) => (
                <PBRadio key={m} name="meeting-note-mode" label={m} checked={mode === m} onChange={() => setMode(m)} tutorialId={`host.mois.field.meeting-${pbSlug(m)}`} />
              ))}
            </div>
            <span className="pb-row__spacer" />
            <DialogButton id="lookup-template" width={88} onClick={() => setStage('template')}>Lookup Template...</DialogButton>
          </div>
          <PBTextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ flex: '1 1 auto', resize: 'none', marginTop: 6 }}
            data-tutorial-id="host.mois.field.meeting-note-text"
          />
        </div>
        <div className="pb-row" style={{ gap: 12, padding: '4px 0 12px', justifyContent: 'center', flex: 'none' }}>
          <DialogButton id="meeting-ok" width={75} onClick={ok} isDefault>Ok</DialogButton>
          <DialogButton id="meeting-cancel" width={75} onClick={close}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>

      {stage === 'template' && (
        <WorkspaceDialogFrame id="text-template-list" title="Text Template List" width={520} height={340} onClose={() => setStage('')} controls={false} zIndex={92}>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: 8 }}>
            <PBDataWindow
              rows={TEXT_TEMPLATES}
              current={tplCur}
              onCurrentChange={setTplCur}
              onActivate={(t) => { setText(t.text); setStage('') }}
              rowTutorialId={(t) => `host.mois.row.template-${pbSlug(t.label).slice(0, 24)}`}
              columns={[{ key: 'label', header: 'Label', width: 230 }, { key: 'text', header: 'Text' }]}
            />
          </div>
          <div className="pb-row" style={{ gap: 8, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }}>
            <DialogButton id="template-select" width={75} onClick={() => { const t = TEXT_TEMPLATES[tplCur]; if (t) setText(t.text); setStage('') }} isDefault>Select</DialogButton>
            <DialogButton id="template-cancel" width={75} onClick={() => setStage('')}>Cancel</DialogButton>
          </div>
        </WorkspaceDialogFrame>
      )}
      {stage === 'diag' && (
        <UniversalSearchDialog onPick={(r) => { setDiag(r.code); setStage('') }} onClose={() => setStage('')} />
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Print Name Tags (Action ▸ Print Name Tags, and Prepare for Meeting's
   Print label / Export to CSV) → the Print Preview
   ------------------------------------------------------------------------ */
function PrintNameTags({ args, open, close }: AreaWindowProps) {
  const extras = useSchedulerExtras()
  const v = extras.currentVisit
  const lists = groupListsFor(v, extras.groups)
  const [sent] = useState(() => {
    const people = lists.patients.filter((p) => !['C', 'R', 'N'].includes(p.as))
    if (args.csv) {
      return {
        title: 'Name Tags - Export to CSV',
        columns: [
          { key: 'name', header: 'Full Name', width: 200 }, { key: 'provider', header: 'Provider', width: 180 },
          { key: 'date', header: 'Appointment Date', width: 110 }, { key: 'code', header: 'Visit Code', width: 70 },
        ],
        rows: people.map((p) => ({ name: `${p.first} ${p.last}`, provider: v?.provider ?? '', date: v?.date ?? '', code: p.code })),
      }
    }
    return {
      title: 'Name Tags',
      pages: [people.map((p) => `%RULE%\n**${p.first} ${p.last}**\n${p.chart}\n${v?.desc ?? ''}\n`).join('\n')],
    }
  })
  useEffect(() => {
    schedulerExtras.done(args.csv ? 'name-tags-exported' : 'name-tags-printed')
    if (!open('print-preview', sent)) close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/* ---------------------------------------------------------------------------
   Group Visit - Bill MSP
   ------------------------------------------------------------------------ */
const NO_CLAIM = new Set(['C', 'R', 'N'])
const STATUS_WORD: Record<string, string> = { C: 'Cancelled', R: 'Rebooked', N: 'No Show' }

function GroupVisitBillMsp({ close }: AreaWindowProps) {
  const extras = useSchedulerExtras()
  const roster = usePatientRoster()
  const v = extras.currentVisit
  const lists = groupListsFor(v, extras.groups)
  const [, setAdded] = useSessionState<UnsentClaim[]>(UNSENT_ADDED_KEY, [])
  const [fees, setFees] = useState<string[]>(['', '', '', ''])
  const [issues, setIssues] = useState<string[]>(['', '', '', ''])
  const [units, setUnits] = useState<string[]>(['1.00', '1.00', '1.00', '1.00'])
  const [start, setStart] = useState('')
  const [stop, setStop] = useState('')
  const [refer1, setRefer1] = useState('N/A')
  const [refer2, setRefer2] = useState('N/A')
  const [referBy, setReferBy] = useState('')
  const [note, setNote] = useState('')
  const excluded = useTickSet<string>()
  const [lookup, setLookup] = useState<number | null>(null)
  const [done, setDone] = useState<number | null>(null)
  useScreenReport({ excluded: excluded.size, fees: fees.filter(Boolean).length })
  if (!v) return null

  const billable = lists.patients.filter((p) => !NO_CLAIM.has(p.as) && !excluded.has(p.chart))
  const create = () => {
    const fee = fees.find((f) => f.trim()) ?? ''
    const claims: UnsentClaim[] = billable.map((p) => {
      const r = roster.find((x) => x.chart === p.chart)
      return {
        chart: p.chart, last: p.last, first: p.first, service: v.date, doctor: v.provider, fee,
        dob: r?.dob ?? '', insrBy: r?.insuranceBy ?? 'BC', insrNbr: r?.insurance ?? '', billed: '0.00',
        compl: true, hold: false, sub: 'R',
      }
    })
    setAdded((prev) => [...claims, ...prev])
    updateGroup(v, {
      claimed: true,
      patients: lists.patients.map((p) => (billable.includes(p) ? { ...p, bs: 'B', services: fee || p.services, issue: issues.find(Boolean) || p.issue } : p)),
    })
    schedulerExtras.done('group-claims-created')
    setDone(claims.length)
  }

  const codeRow = (i: number) => (
    <div key={i} className="pb-row" style={{ gap: 4 }}>
      <PBInput w={56} value={fees[i]} onChange={(e) => setFees(fees.map((f, j) => (j === i ? e.target.value : f)))} data-tutorial-id={`host.mois.field.bill-fee-${i + 1}`} />
      <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button">…</button>
      <PBInput w={56} value={issues[i]} onChange={(e) => setIssues(issues.map((f, j) => (j === i ? e.target.value : f)))} data-tutorial-id={`host.mois.field.bill-issue-${i + 1}`} />
      <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button" onClick={() => setLookup(i)}>…</button>
      <PBInput w={40} align="center" value={units[i]} onChange={(e) => setUnits(units.map((f, j) => (j === i ? e.target.value : f)))} />
    </div>
  )
  const refer = (value: string, set: (v: string) => void, n: number) => (
    <span className="pb-row" style={{ gap: 6 }}>
      <u>Refer.</u>
      {['N/A', 'To', 'By'].map((o) => <PBRadio key={o} name={`bill-refer-${n}`} label={o} checked={value === o} onChange={() => set(o)} />)}
    </span>
  )

  return (
    <>
      <WorkspaceDialogFrame id="group-visit-bill-msp" title="Group Visit - Bill MSP" width={820} height={600} onClose={close} controls={false} zIndex={85}>
        <div style={{ display: 'flex', margin: 6, border: '1px solid #b8c8e0', background: '#fff', flex: 'none' }}>
          <div style={{ width: 300, borderRight: '1px solid #b8c8e0' }}>
            <div style={BAND}>Group Visit Detail</div>
            <VisitDetail v={v} />
          </div>
          <div style={{ width: 230, borderRight: '1px solid #b8c8e0' }}>
            <div className="pb-row" style={{ ...BAND, gap: 0 }}><span style={{ width: 82 }}>Fee Code</span><span style={{ width: 82 }}>Health Issues</span><span>Services</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 4 }} data-tutorial-id="host.mois.field.bill-codes">
              {[0, 1, 2, 3].map(codeRow)}
            </div>
          </div>
          <div style={{ flex: '1 1 auto' }}>
            <div style={BAND}>Other Detail (optional)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 4 }}>
              <span className="pb-row" style={{ gap: 6 }}>
                <u>Start Time</u><PBInput w={46} value={start} onChange={(e) => setStart(e.target.value)} />
                <u>Stop Time</u><PBInput w={46} value={stop} onChange={(e) => setStop(e.target.value)} />
              </span>
              <span className="pb-row" style={{ gap: 6 }}>
                {refer(refer1, setRefer1, 1)}
                <PBInput w={70} value={referBy} onChange={(e) => setReferBy(e.target.value)} disabled={refer1 === 'N/A'} />
                <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button">…</button>
              </span>
              {refer(refer2, setRefer2, 2)}
              <u>MSP Note</u>
              <PBInput w="100%" value={note} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.bill-msp-note" />
              <span className="pb-row" style={{ justifyContent: 'flex-end' }}>
                <DialogButton id="bill-create-msp-claims" width={110} onClick={create} disabled={!billable.length || lists.claimed}>Create MSP Claims</DialogButton>
              </span>
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 6px 6px', border: '1px solid #b8c8e0' }} data-tutorial-id="host.mois.field.bill-patient-list">
          <PBDataWindow
            flush
            gutter={false}
            rows={lists.patients.map((p) => ({ ...p, status: STATUS_WORD[p.as] ?? '', payor: 'MSP' }))}
            rowClassName={(p) => (NO_CLAIM.has(p.as) ? 'pb-dw--struck' : undefined)}
            rowTutorialId={(p) => `host.mois.row.bill-${p.chart}`}
            columns={[
              { key: 'last', header: 'Patient List', width: 150 },
              { key: 'first', header: '', width: 150 },
              { key: 'status', header: 'Appt. Status', width: 110 },
              { key: 'payor', header: 'Payor', width: 90 },
              {
                key: 'exclude', header: 'Exclude', width: 60, align: 'center',
                render: (p) => (NO_CLAIM.has(p.as) ? null : (
                  <PBCheckbox
                    checked={excluded.has(p.chart)}
                    tutorialId={`host.mois.cell.bill-exclude-${p.chart}`}
                    onChange={(on) => excluded.set(p.chart, on)}
                  />
                )),
              },
            ]}
            empty="No patients are booked into this group visit."
          />
        </div>
      </WorkspaceDialogFrame>
      {lookup !== null && (
        <UniversalSearchDialog onPick={(r) => { setIssues(issues.map((f, j) => (j === lookup ? r.code : f))); setLookup(null) }} onClose={() => setLookup(null)} />
      )}
      {done !== null && (
        <RaisedMessageBox title="Group Visit - Bill MSP" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={close}>
          <span data-tutorial-id="host.mois.dialog.group-claims-created">{done} MSP claim(s) created. They are in Billing ▸ Unsent MSP.</span>
        </RaisedMessageBox>
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Clone Group Booking
   ------------------------------------------------------------------------ */
function CloneGroupBooking({ close }: AreaWindowProps) {
  const extras = useSchedulerExtras()
  const v = extras.currentVisit
  const lists = groupListsFor(v, extras.groups)
  const [date, setDate] = useState(v?.date ?? '')
  const [time, setTime] = useState(v ? `${v.hr}:${v.min}` : '')
  const [duration, setDuration] = useState(v?.n ?? '')
  const [code, setCode] = useState(v?.code ?? '')
  const [provider, setProvider] = useState(v?.provider ?? '')
  const [loc, setLoc] = useState(v?.loc ?? '')
  const [topic, setTopic] = useState(v?.topic ?? '')
  const [desc, setDesc] = useState(v?.desc ?? '')
  /* "You must reselect the Topic by clicking the ellipses (…) and confirm
     the selection" (303808) */
  const [topicOk, setTopicOk] = useState(false)
  const [tab, setTab] = useState('Patient List')
  const incPatients = useTickSet<string>(() => lists.patients.map((p) => p.chart))
  const incProviders = useTickSet<string>(() => lists.providers.map((p) => p.name))
  const incResources = useTickSet<string>(() => lists.resources.map((p) => p.name))
  const [stage, setStage] = useState<'' | 'topic' | 'refused'>('')
  useScreenReport({ window: stage === 'topic' ? 'universal-search' : stage === 'refused' ? 'reselect-topic' : '', topicConfirmed: topicOk })
  if (!v) return null

  const clone = () => {
    if (!topicOk) { setStage('refused'); return }
    const [hr = v.hr, min = v.min] = time.split(':')
    const next: GroupVisitRow = { date, hr: hr.padStart(2, '0'), min: min.padStart(2, '0'), n: duration, provider, topic, desc, code, loc, series: false }
    schedulerExtras.addVisit(next, {
      patients: lists.patients.filter((p) => incPatients.has(p.chart)).map((p) => ({ ...p, as: '', ds: 'I', bs: 'I' })),
      providers: lists.providers.filter((p) => incProviders.has(p.name)).map((p) => ({ ...p, reserved: false })),
      resources: lists.resources.filter((p) => incResources.has(p.name)),
    }, blankGroup())
    schedulerExtras.done('group-visit-cloned')
    close()
  }
  const include = (tick: ReturnType<typeof useTickSet<string>>, key: string, prefix: string) => ({
    key: 'include', header: 'Include', width: 56, align: 'center' as const,
    render: (r: Record<string, string>) => (
      <PBCheckbox checked={tick.has(r[key]!)} onChange={(on) => tick.set(r[key]!, on)} tutorialId={`host.mois.cell.clone-${prefix}-${pbSlug(r[key]!)}`} />
    ),
  })

  return (
    <>
      <WorkspaceDialogFrame id="clone-group-booking" title="Clone Group Booking" width={760} height={560} onClose={close} controls={false} zIndex={85}>
        <div style={{ display: 'flex', gap: 6, margin: 6, flex: 'none' }}>
          <div style={{ width: 280, border: '1px solid #b8c8e0', background: '#fff' }}>
            <div style={BAND}>Group Visit Detail</div>
            <VisitDetail v={v} />
          </div>
          <div style={{ flex: '1 1 auto', border: '1px solid #b8c8e0', background: '#fff' }} data-tutorial-id="host.mois.group.new-group-visit-information">
            <div style={{ ...BAND, color: NAVY.win }}>New Group Visit Information</div>
            <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="pb-row" style={{ gap: 8 }}>
                <span style={{ width: 70 }}>Appt Date</span><span style={{ width: 54 }}>Time</span><span style={{ width: 54 }}>Duration</span><span>Visit Code</span>
              </div>
              <div className="pb-row" style={{ gap: 8 }}>
                <PBInput w={70} align="center" value={date} onChange={(e) => setDate(e.target.value)} data-tutorial-id="host.mois.field.clone-date" />
                <PBInput w={54} align="center" value={time} onChange={(e) => setTime(e.target.value)} data-tutorial-id="host.mois.field.clone-time" />
                <PBInput w={54} align="center" value={duration} onChange={(e) => setDuration(e.target.value)} />
                <PBInput w={44} align="center" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="pb-row" style={{ gap: 8 }}><span style={{ width: 200 }}>Provider</span><span>Service Location</span></div>
              <div className="pb-row" style={{ gap: 8 }}>
                <PBSelect w={200} options={[...new Set([v.provider, ...daybookProviders.map((p) => p.provider)])]} value={provider} onChange={(e) => setProvider(e.target.value)} />
                <PBSelect w={200} options={[...new Set(['', v.loc, 'PRINCE GEORGE CLINIC', 'CLOUD CITY', 'FRASER LAKE'])]} value={loc} onChange={(e) => setLoc(e.target.value)} />
              </div>
              <span>Topic</span>
              <div className="pb-row" style={{ gap: 4 }}>
                <PBInput w={60} value={topic} readOnly style={topicOk ? undefined : { background: '#ffff99' }} />
                <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button" data-tutorial-id="host.mois.command.clone-topic" onClick={() => setStage('topic')}>…</button>
                <PBInput w={300} value={desc} readOnly />
              </div>
              <div className="pb-row" style={{ justifyContent: 'flex-end' }}>
                <DialogButton id="clone-group-appt" width={80} onClick={clone} isDefault>Clone Appt</DialogButton>
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 6px 6px' }}>
          <PBTabs tabs={['Patient List', 'Other Provider List', 'Other Resource List']} active={tab} onChange={setTab} compact>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              {tab === 'Patient List' && (
                <PBDataWindow
                  flush gutter={false}
                  rows={lists.patients as unknown as Record<string, string>[]}
                  columns={[
                    include(incPatients, 'chart', 'patient'),
                    { key: 'last', header: 'Last Name', width: 140 },
                    { key: 'first', header: 'First Name', width: 140 },
                    { key: 'chart', header: 'Chart', width: 70 },
                    { key: 'as', header: 'AS', width: 40 },
                  ]}
                  empty="No patients on the original visit."
                />
              )}
              {tab === 'Other Provider List' && (
                <PBDataWindow
                  flush gutter={false}
                  rows={lists.providers as unknown as Record<string, string>[]}
                  columns={[include(incProviders, 'name', 'provider'), { key: 'name', header: 'Provider', width: 240 }, { key: 'note', header: 'Note' }]}
                  empty="No other providers on the original visit."
                />
              )}
              {tab === 'Other Resource List' && (
                <PBDataWindow
                  flush gutter={false}
                  rows={lists.resources as unknown as Record<string, string>[]}
                  columns={[include(incResources, 'name', 'resource'), { key: 'name', header: 'Resource', width: 240 }, { key: 'note', header: 'Note' }]}
                  empty="No resources on the original visit."
                />
              )}
            </div>
          </PBTabs>
        </div>
      </WorkspaceDialogFrame>
      {stage === 'topic' && (
        <UniversalSearchDialog
          onPick={(r) => { setTopic(r.code); setDesc(r.term.toUpperCase()); setTopicOk(true); setStage('') }}
          onClose={() => setStage('')}
        />
      )}
      {stage === 'refused' && (
        <RaisedMessageBox title="Clone Group Booking" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={() => setStage('')}>
          <span data-tutorial-id="host.mois.dialog.reselect-topic">Please reselect the Topic by clicking the ellipsis (…) and confirming the selection.</span>
        </RaisedMessageBox>
      )}
    </>
  )
}

registerAreaWindow('prepare-for-meeting', PrepareForMeeting)
registerAreaWindow('print-name-tags', PrintNameTags)
registerAreaWindow('group-visit-bill-msp', GroupVisitBillMsp)
registerAreaWindow('clone-group-booking', CloneGroupBooking)
