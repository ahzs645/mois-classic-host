import { useState, type CSSProperties, type ReactNode } from 'react'
import { FN_BREAK_GLASS_PRIVATE, FN_MAKE_PRIVATE, useSpecialFunction } from '../data/accessSettings'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import {
  ACCESS_DIRECTORY, ALERT_METHODS, ALERT_PRIORITIES, BREAK_GLASS_DURATIONS, BREAK_GLASS_REASONS,
  accessId, blockedByAuthor, canManage, canRead, daysFromToday, isPrivate, noteId, privateLine, running, usePrivateNotes,
  type AccessRow, type BreakGlassMode, type DirectoryRow, type PrivateNote,
} from '../data/privateNotes'
import { DESKTOP_USER, type SessionNote } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { workspaceExtras } from '../data/workspaceExtras'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTextArea, pbSlug } from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowArgs, type AreaWindowProps } from './areaWindowRegistry'
import { FooterButton, StageMessageBox, StageWindow } from './StageWindow'

/* ============================================================================
   Private Progress Notes — the windows (3799725 / 3799734 / 3799750).

   PROVENANCE (all 3799734 / 3799750 captures, current Windows 11 build):
   · the Progress Note(s) band: "Make Private" before Print Note · New Note ·
     Delete Note on a note of one's own (`61426b44…`); once private the band
     turns yellow with grey "This is a private note." after "Note 1 of 1" and
     the first button reads "View Access" for the author or anyone with access
     (`0e1fe3b0…`, `7f023ffe…`) and "Break Glass" for anyone else
     (`6557b258…`); a reader without access sees "<NAME> has marked this note
     private." in the note box (`e039b91c…`). `usePrivateNoteBand` below is
     what screens/EncounterWindow.tsx's ProgressNotePage draws from.
   · Access Control (the list, `b86485ef…`, `0657d92e…`, `2404ed57…`,
     `993b0fe7…`): Users/Roles · Start · Stop · Note / Reason on a pale-blue
     head with ☐ Show Stopped at its right; the owner's row bold; Add ·
     Delete · Edit at the left and Close at the right — greyed for anyone who
     is not the owner or directly added ("you only have temporary access").
   · Access Control (the record, `2f61265f…` for another user, `bbb543b5…`
     for the owner): "Applies to" [name] Select...; "Duration" Start ▾ /
     Stop ▾ 0000.00.00 (optional); "Reason (optional)" Note; "Break Glass
     Access" — the explanation, "Who can break glass: (not available for bulk
     operations)" ◉ Authorized Users Only ○ Selected Users Only [Select
     Users...] ○ Nobody, ☐ Send an alert when users breakglass to access the
     record, Method ▾ (MOIS Message), Priority ▾ (High) — greyed and captioned
     "Break Glass Access can only be accessed by the owner" on anyone else's
     record; Continue · Cancel. Make Private opens this for the author.
   · Private Note Access (`d9d78c27…`): "As the transcriptionist, do you
     require access to the note for the next seven days?" Yes · No.
   · Access Control - Temporary Access (`94ad4d14…`): "You do not have access
     to the selected record. If you require temporary access, please complete
     the information below."; Reason For Temporary Access ▾ (CHECK FOR
     DUPLICATE · REGISTER NEW PATIENT · STANDARD CARE · UPDATE PATIENT'S
     RECORD · EMERGENCY CARE · OTHER); Additional Note; Duration of Access ◉
     Just today ○ Today and Tomorrow ○ For a week; Continue · Cancel.
   · Blocked by Author (`b9b11c0d…`): ✖ "The record author has not authorized
     you to break glass." OK.
   · MOIS - Search Window (`15469d8b…`): Search for Name / Group / Provider /
     Members of ▾; Include ☑ Users ☑ Providers ☑ Org. Roles ☑ Organizations;
     Membership ☐ Limit to My Active Memberships; Record Status ☑ Active ☐
     Inactive; Name · Role / Group · Type · Associated Provider(s) / Members ·
     Status. Its buttons are below the capture's edge: Select · Cancel is
     INFERRED.

   INFERRED: the message a user without the Break Glass Private Notes special
   function gets (the Blocked box, reworded); "Selected Users Only" keeps the
   picked names beside its button; the Break Glass alert is not delivered to a
   Workspace inbox (Message / Task lists belong to the Workspace stream) — the
   break is recorded on the note's access list, which is what Show Stopped and
   the admin Review Access read.

   Area windows (opened by id): private-note-access, private-note-access-edit
   (args mode = make-private | add | edit | grant, id, row), private-note-
   break-glass, private-note-blocked. Anchors: host.mois.dialog.<id>;
   host.mois.command.private-{add, delete, edit, close, continue, cancel,
   select, select-users, search-select}; host.mois.field.private-{show-stopped,
   start, stop, note, breakglass-<mode>, alert, method, priority, reason,
   additional-note, duration-<slug>}; rows host.mois.row.access-<slug>,
   host.mois.row.directory-<slug>. Reported: host.screen.privateNote
   (private / readable / none), .accessRows, .breakGlass.
   ========================================================================= */

export const PRIVATE_WINDOWS = {
  access: 'private-note-access',
  edit: 'private-note-access-edit',
  breakGlass: 'private-note-break-glass',
  blocked: 'private-note-blocked',
} as const

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const GROUP: CSSProperties = { border: '1px solid #d0d0d0', borderRadius: 3, padding: '18px 12px 10px', position: 'relative', margin: '12px 12px 0', background: '#fff' }
const CAPTION: CSSProperties = { position: 'absolute', top: -9, left: 8, background: '#fff', padding: '0 4px', color: '#000080', fontWeight: 700 }

function Group({ caption, disabled, children }: { caption: string; disabled?: boolean; children: ReactNode }) {
  return (
    <div style={{ ...GROUP, color: disabled ? '#8a8a8a' : undefined }}>
      <span style={{ ...CAPTION, color: disabled ? '#8a8a8a' : CAPTION.color }}>{caption}</span>
      {children}
    </div>
  )
}

/* --- the Progress Note(s) band's private-note state ----------------------- */

/** What ProgressNotePage draws for the current note: the band's first
    button, the yellow band, and the text a reader without access sees. */
export function usePrivateNoteBand(encounter: { id: string; date?: string; hr?: string; mn?: string; reason?: string }, note: SessionNote | null | undefined) {
  const patient = usePatient()
  const [notes] = usePrivateNotes()
  const open = useOpenWindow()
  const mayMake = useSpecialFunction(FN_MAKE_PRIVATE)
  const mayBreak = useSpecialFunction(FN_BREAK_GLASS_PRIVATE)
  const id = note ? noteId(patient.chart, encounter.id, note.key) : ''
  const pn = id ? notes[id] : undefined
  const priv = isPrivate(pn)
  const readable = !pn || !priv || canRead(pn, DESKTOP_USER)
  useScreenReport({ privateNote: !note ? null : priv ? (readable ? 'readable' : 'private') : 'none' })
  /* only the author or the creator may mark a saved note private
     ("Only the author/creator can mark a note as private") */
  const own = !!note && !!note.created && (note.author === DESKTOP_USER || note.createdBy === DESKTOP_USER || (!note.exported && !note.author))
  const meta: AreaWindowArgs = {
    id, chart: patient.chart, patient: `${patient.last}, ${patient.first}`.toUpperCase(), encounter: encounter.id, noteKey: note?.key ?? '',
    apptDate: encounter.date ?? '', apptTime: encounter.hr && encounter.mn ? `${encounter.hr.padStart(2, '0')}:${encounter.mn.padStart(2, '0')}` : '',
    visitReason: encounter.reason ?? '', author: note?.author || DESKTOP_USER, creator: note?.createdBy || DESKTOP_USER,
  }
  let button: { label: string; id: string; onClick: () => void } | null = null
  if (priv && readable) button = { label: 'View Access', id: 'view-access', onClick: () => { open(PRIVATE_WINDOWS.access, { id }) } }
  else if (priv && pn) {
    button = {
      label: 'Break Glass', id: 'break-glass', onClick: () => {
        if (!mayBreak || blockedByAuthor(pn, DESKTOP_USER)) open(PRIVATE_WINDOWS.blocked, { permission: !mayBreak })
        else open(PRIVATE_WINDOWS.breakGlass, { id })
      },
    }
  } else if (own && mayMake) button = { label: 'Make Private', id: 'make-private', onClick: () => { open(PRIVATE_WINDOWS.edit, { ...meta, mode: 'make-private' }) } }
  return {
    private: priv,
    readable,
    /** the line that stands in for the note's text */
    hidden: priv && !readable && pn ? privateLine(pn) : null,
    button,
  }
}

/** Private notes as the summaries and printouts show them: the line, not the
    text ("Private notes are excluded from: Summaries, Reports, Printouts,
    Letters … (unless the private status is removed)"; `e039b91c…`,
    `2e02c986…`). */
export function usePrivateNoteMask(encounterId: string): (notes: SessionNote[]) => SessionNote[] {
  const patient = usePatient()
  const [notes] = usePrivateNotes()
  return (list) => list.map((n) => {
    const pn = notes[noteId(patient.chart, encounterId, n.key)]
    return pn && isPrivate(pn) ? { ...n, text: privateLine(pn) } : n
  })
}

/* --- Access Control (the list) --------------------------------------------- */
function AccessListWindow({ args, close, open }: AreaWindowProps) {
  const id = str(args.id)
  const [notes] = usePrivateNotes()
  const note = notes[id]
  const [stopped, setStopped] = useState(false)
  const [cur, setCur] = useState(0)
  const rows = (note?.access ?? []).filter((r) => stopped || running(r))
  const row = rows[Math.min(cur, rows.length - 1)]
  const manage = !!note && canManage(note, DESKTOP_USER)
  useScreenReport({ accessRows: rows.length })
  const [, update] = usePrivateNotes()
  const endDate = () => {
    if (!row || !note) return
    update(id, (n) => n && ({ ...n, access: n.access.map((r) => (r.id === row.id ? { ...r, stop: MOIS_TODAY, ended: true } : r)) }))
  }
  const btn = (key: string, label: string, onClick: () => void, disabled = !manage) => (
    <PBButton style={{ minWidth: 100 }} disabled={disabled} data-tutorial-id={`host.mois.command.private-${key}`} onClick={onClick}>{label}</PBButton>
  )
  return (
    <StageWindow id={PRIVATE_WINDOWS.access} title="Access Control" width={940} height={380} onClose={close} bodyStyle={{ background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: '#c8dcfa', color: '#7a7a7a', padding: '4px 8px 4px 24px', flex: 'none' }}>
        <span style={{ width: 300 }}>Users/Roles</span><span style={{ width: 104 }}>Start</span><span style={{ width: 104 }}>Stop</span><span style={{ flex: '1 1 auto' }}>Note / Reason</span>
        <PBCheckbox label="Show Stopped" checked={stopped} onChange={setStopped} tutorialId="host.mois.field.private-show-stopped" />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow flush head={false} style={{ flex: '1 1 auto', minHeight: 0 }} rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))} onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.access-${pbSlug(r.who)}`}
          rowClassName={(r) => (running(r) ? undefined : 'pb-dw--struck')}
          columns={[
            { key: 'who', header: 'Users/Roles', width: 296, render: (r) => (r.kind === 'owner' ? <b>{r.who}</b> : r.who) },
            { key: 'start', header: 'Start', width: 104 },
            { key: 'stop', header: 'Stop', width: 104, render: (r) => r.stop || '-' },
            { key: 'note', header: 'Note / Reason' },
          ]}
          empty={note ? 'No access records.' : 'This note is not private.'} />
      </div>
      <div className="pb-row" style={{ padding: '6px 4px', gap: 4, borderTop: '1px solid #d0d0d0', background: 'var(--pb-face)', flex: 'none' }}>
        {btn('add', 'Add', () => { open(PRIVATE_WINDOWS.edit, { mode: 'add', id }) })}
        {btn('delete', 'Delete', endDate, !manage || !row)}
        {btn('edit', 'Edit', () => { if (row) open(PRIVATE_WINDOWS.edit, { mode: 'edit', id, row: row.id }) }, !manage || !row)}
        <span style={{ flex: '1 1 auto' }} />
        {btn('close', 'Close', close, false)}
      </div>
    </StageWindow>
  )
}

/* --- MOIS - Search Window --------------------------------------------------- */
export function DirectorySearchWindow({ onPick, onClose }: { onPick: (row: DirectoryRow) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [provider, setProvider] = useState('')
  const [types, setTypes] = useState<Record<string, boolean>>({ USER: true, PROVIDER: true, 'ORG. ROLE': true, ORGANIZATION: true })
  const [active, setActive] = useState(true)
  const [inactive, setInactive] = useState(false)
  const [mine, setMine] = useState(false)
  const rows = ACCESS_DIRECTORY.filter((r) => types[r.type]
    && ((active && r.status === 'A') || (inactive && r.status === 'I'))
    && (!name || r.name.toLowerCase().includes(name.toLowerCase()))
    && (!group || r.group.toLowerCase().includes(group.toLowerCase()))
    && (!provider || (r.type === 'PROVIDER' && r.name.toLowerCase().includes(provider.toLowerCase()))))
  const [cur, setCur] = useState(0)
  const tick = (t: string, label: string) => (
    <PBCheckbox label={label} checked={types[t]} onChange={(v) => setTypes((x) => ({ ...x, [t]: v }))} tutorialId={`host.mois.field.search-include-${pbSlug(label)}`} />
  )
  return (
    <StageWindow id="mois-search-window" title="MOIS - Search Window" width={1290} height={560} onClose={onClose}
      bodyStyle={{ padding: 6, background: '#fff' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={!rows[cur]} onClick={() => rows[cur] && onPick(rows[cur]!)} tutorialId="host.mois.command.private-search-select">Select</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
      </>}>
      <div style={{ border: '1px solid #c8c8c8', flex: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 300px 150px', background: 'linear-gradient(#e8f0fb, #fff)', padding: '2px 8px' }}>
          <span>Search for:</span><span>Include:</span><span>Membership</span><span>Record Status:</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 300px 150px', padding: 8, gap: 4, alignItems: 'start' }}>
          <div className="pb-form" style={{ gridTemplateColumns: '90px 290px', gap: 4 }}>
            <span>Name:</span><PBInput w={290} value={name} onChange={(e) => { setName(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.search-name" />
            <span>Group:</span><PBInput w={290} value={group} onChange={(e) => { setGroup(e.target.value); setCur(0) }} />
            <span>Provider:</span><PBInput w={290} value={provider} onChange={(e) => { setProvider(e.target.value); setCur(0) }} />
            <span>Members of:</span><PBSelect w={290} options={['', 'MENTAL HEALTH', 'ADMINISTRATION']} />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>{tick('USER', 'Users')}{tick('PROVIDER', 'Providers')}{tick('ORG. ROLE', 'Org. Roles')}{tick('ORGANIZATION', 'Organizations')}</div>
          <div><PBCheckbox label="Limit to My Active Memberships" checked={mine} onChange={setMine} /></div>
          <div style={{ display: 'grid', gap: 6 }}><PBCheckbox label="Active" checked={active} onChange={setActive} /><PBCheckbox label="Inactive" checked={inactive} onChange={setInactive} /></div>
        </div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', marginTop: 4 }}>
        <PBDataWindow flush style={{ flex: '1 1 auto', minHeight: 0 }} rows={rows} current={Math.min(cur, Math.max(0, rows.length - 1))} onCurrentChange={setCur}
          onActivate={(r) => onPick(r)} rowTutorialId={(r) => `host.mois.row.directory-${pbSlug(r.name)}`}
          columns={[
            { key: 'name', header: 'Name', width: 350 },
            { key: 'group', header: 'Role / Group', width: 270 },
            { key: 'type', header: 'Type', width: 170 },
            { key: 'members', header: 'Associated Provider(s) / Members', render: (r) => (r.members === 'View Members' ? <span className="pb-link">View Members</span> : r.members) },
            { key: 'status', header: 'Status', width: 90, align: 'center' },
          ]}
          empty="Nobody matches." />
      </div>
    </StageWindow>
  )
}

/* --- Access Control (the record) -------------------------------------------
   mode make-private: the owner's own record, for a note not yet private.
   mode add: a new user / group's record (Break Glass greyed).
   mode edit: the row `row` — the owner's (Break Glass live) or another's.
   mode grant: an administrator's Grant Access (screens/PrivateNotesViews.tsx)
   for `ids` (Break Glass greyed: "not available for bulk operations"). */
export function AccessRecordWindow({ args, close, open }: AreaWindowProps) {
  const mode = str(args.mode) || 'add'
  const id = str(args.id)
  const [notes, update] = usePrivateNotes()
  const note = notes[id]
  const editing = mode === 'edit' ? note?.access.find((r) => r.id === str(args.row)) : undefined
  const ownerRecord = mode === 'make-private' || (editing?.kind === 'owner')
  const [who, setWho] = useState(mode === 'make-private' ? str(args.author) : editing?.who ?? '')
  const [start, setStart] = useState(editing?.start ?? MOIS_TODAY)
  const [stop, setStop] = useState(editing?.stop ?? '')
  const [reasonNote, setReasonNote] = useState(editing?.note ?? (ownerRecord ? note?.reason ?? '' : ''))
  const [mode_, setBreakGlass] = useState<BreakGlassMode>(note?.breakGlass ?? 'authorized')
  const [users, setUsers] = useState<string[]>(note?.breakGlassUsers ?? [])
  const [alert, setAlert] = useState(note?.alert ?? false)
  const [method, setMethod] = useState(note?.method ?? ALERT_METHODS[0]!)
  const [priority, setPriority] = useState(note?.priority ?? 'High')
  const [searching, setSearching] = useState<'applies' | 'users' | null>(null)
  const [asking, setAsking] = useState<'transcriptionist' | 'grant' | null>(null)
  useScreenReport({ breakGlass: ownerRecord ? mode_ : null })

  const finish = () => {
    if (mode === 'grant') { setAsking('grant'); return }
    if (mode === 'make-private') {
      const creator = str(args.creator)
      const author = str(args.author) || DESKTOP_USER
      const made: PrivateNote = {
        id, chart: str(args.chart), patient: str(args.patient), encounter: str(args.encounter), noteKey: str(args.noteKey),
        apptDate: str(args.apptDate), apptTime: str(args.apptTime), visitReason: str(args.visitReason),
        owner: author, author, creator, reason: reasonNote, breakGlass: mode_, breakGlassUsers: users, alert, method, priority,
        access: [{ id: accessId(), who: author, kind: 'owner', start, stop, note: reasonNote }],
      }
      update(id, () => made)
      /* "If a user (creator) is documenting on behalf of the author … Yes
         (creator not finished editing): Creator retains access for up to 7
         days" (`d9d78c27…`) */
      if (creator && creator !== author) { setAsking('transcriptionist'); return }
      close()
      return
    }
    if (!who) return
    update(id, (n) => {
      if (!n) return n
      const row: AccessRow = { id: editing?.id ?? accessId(), who, kind: editing?.kind ?? 'direct', start, stop, note: reasonNote }
      const access = editing ? n.access.map((r) => (r.id === editing.id ? { ...r, ...row, ended: r.ended && !!stop && stop <= MOIS_TODAY } : r)) : [...n.access, row]
      return ownerRecord
        ? { ...n, access, reason: reasonNote, breakGlass: mode_, breakGlassUsers: users, alert, method, priority }
        : { ...n, access }
    })
    open(PRIVATE_WINDOWS.access, { id })
  }
  const cancel = () => (mode === 'add' || mode === 'edit' ? open(PRIVATE_WINDOWS.access, { id }) : close())

  return (
    <StageWindow id={PRIVATE_WINDOWS.edit} title="Access Control" width={680} height={840} onClose={cancel}
      bodyStyle={{ background: '#fff', overflow: 'auto', paddingBottom: 12 }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={finish} tutorialId="host.mois.command.private-continue">Continue</FooterButton>
        <FooterButton onClick={cancel} tutorialId="host.mois.command.private-cancel">Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <Group caption="Applies to">
        <div className="pb-row" style={{ gap: 12 }}>
          <PBInput w={440} readOnly value={mode === 'grant' ? str(args.grantee) || who : who} style={{ background: '#f0f0f0', color: '#666' }} data-tutorial-id="host.mois.field.private-applies-to" />
          <PBButton disabled={ownerRecord || mode === 'edit'} data-tutorial-id="host.mois.command.private-select" onClick={() => setSearching('applies')}>Select...</PBButton>
        </div>
      </Group>
      <Group caption="Duration">
        <div className="pb-row" style={{ gap: 12 }}>
          <span>Start:</span><PBInput w={100} value={start} onChange={(e) => setStart(e.target.value)} data-tutorial-id="host.mois.field.private-start" />
          <span style={{ marginLeft: 60 }}>Stop:</span><PBInput w={100} value={stop} placeholder="0000.00.00" onChange={(e) => setStop(e.target.value)} data-tutorial-id="host.mois.field.private-stop" />
          <span style={{ color: '#8a8a8a' }}>(optional)</span>
        </div>
      </Group>
      <Group caption="Reason (optional)">
        <div>Note:</div>
        <PBTextArea rows={2} w="100%" value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} data-tutorial-id="host.mois.field.private-note" />
      </Group>
      <Group caption={ownerRecord ? 'Break Glass Access' : 'Break Glass Access can only be accessed by the owner'} disabled={!ownerRecord}>
        <p style={{ margin: '0 0 12px' }}>Break glass access allows authorized users to view the private record. All user actions are logged and monitored, and you will be alerted whenever this private record is accessed.</p>
        <div>Who can break glass: (not available for bulk operations)</div>
        <div style={{ display: 'grid', gap: 6, padding: '6px 0 10px 20px' }}>
          <PBRadio name="private-breakglass" label="Authorized Users Only" checked={mode_ === 'authorized'} disabled={!ownerRecord} onChange={() => setBreakGlass('authorized')} tutorialId="host.mois.field.private-breakglass-authorized" />
          <span className="pb-row" style={{ gap: 30 }}>
            <PBRadio name="private-breakglass" label="Selected Users Only" checked={mode_ === 'selected'} disabled={!ownerRecord} onChange={() => setBreakGlass('selected')} tutorialId="host.mois.field.private-breakglass-selected" />
            <PBButton disabled={!ownerRecord || mode_ !== 'selected'} data-tutorial-id="host.mois.command.private-select-users" onClick={() => setSearching('users')}>Select Users...</PBButton>
            {mode_ === 'selected' && users.length > 0 && <span style={{ color: '#555' }}>{users.join('; ')}</span>}
          </span>
          <PBRadio name="private-breakglass" label="Nobody" checked={mode_ === 'nobody'} disabled={!ownerRecord} onChange={() => setBreakGlass('nobody')} tutorialId="host.mois.field.private-breakglass-nobody" />
        </div>
        <PBCheckbox label="Send an alert when users breakglass to access the record" checked={alert} disabled={!ownerRecord} onChange={setAlert} tutorialId="host.mois.field.private-alert" />
        <div className="pb-form" style={{ gridTemplateColumns: '60px 300px', gap: 4, padding: '6px 0 0 20px' }}>
          <span>Method:</span><PBSelect w={300} value={method} options={ALERT_METHODS} disabled={!ownerRecord || !alert} onChange={(e) => setMethod(e.target.value)} data-tutorial-id="host.mois.field.private-method" />
          <span>Priority:</span><PBSelect w={300} value={priority} options={ALERT_PRIORITIES} disabled={!ownerRecord || !alert} onChange={(e) => setPriority(e.target.value)} data-tutorial-id="host.mois.field.private-priority" />
        </div>
      </Group>
      {searching && (
        <DirectorySearchWindow
          onClose={() => setSearching(null)}
          onPick={(r) => {
            if (searching === 'users') setUsers((u) => (u.includes(r.name) ? u : [...u, r.name]))
            else setWho(r.name)
            setSearching(null)
          }}
        />
      )}
      {asking === 'transcriptionist' && (
        <StageMessageBox id="private-note-transcriptionist" title="Private Note Access" icon="question"
          buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
          onClose={(v) => {
            if (v === 'yes') {
              update(id, (n) => n && ({ ...n, access: [...n.access, { id: accessId(), who: str(args.creator), kind: 'direct', start: MOIS_TODAY, stop: daysFromToday(7), note: 'Transcriptionist' }] }))
            }
            close()
          }}>
          As the transcriptionist, do you require access to the note for the next seven days?
        </StageMessageBox>
      )}
      {asking === 'grant' && (
        <StageMessageBox id="private-grant-warning" title="Grant Access" icon="warn"
          buttons={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true }]}
          onClose={(v) => {
            const ids = Array.isArray(args.ids) ? (args.ids as string[]) : []
            const grantee = str(args.grantee) || who
            if (v === 'yes' && grantee) {
              ids.forEach((nid) => update(nid, (n) => n && ({ ...n, access: [...n.access, { id: accessId(), who: grantee, kind: 'direct', start, stop, note: reasonNote }] })))
            }
            close()
          }}>
          Warning: there is no bulk undo process.<br /><br />
          Would you like to grant access to {str(args.grantee) || who} to the {Array.isArray(args.ids) ? args.ids.length : 0} encounter notes?
        </StageMessageBox>
      )}
    </StageWindow>
  )
}

/* --- Access Control - Temporary Access (Break Glass) ----------------------- */
function BreakGlassWindow({ args, close }: AreaWindowProps) {
  const id = str(args.id)
  const [notes, update] = usePrivateNotes()
  const [reason, setReason] = useState('')
  const [extra, setExtra] = useState('')
  const [duration, setDuration] = useState<string>(BREAK_GLASS_DURATIONS[0])
  const go = () => {
    if (!reason) return
    const days = duration === 'For a week' ? 6 : duration === 'Today and Tomorrow' ? 1 : 0
    const label = reason.charAt(0) + reason.slice(1).toLowerCase()
    update(id, (n) => n && ({
      ...n,
      access: [...n.access, { id: accessId(), who: DESKTOP_USER, kind: 'temporary', start: MOIS_TODAY, stop: daysFromToday(days), note: `Temporary Access: ${label}${extra ? ` - ${extra}` : ''}` }],
    }))
    /* the owner's "Send an alert when Users break glass": a message (or a
       task) in the owner's Workspace inbox (stream D, data/workspaceExtras) */
    const note = notes[id]
    if (note?.alert) {
      workspaceExtras.breakGlassAlert({
        owner: note.owner, by: DESKTOP_USER, chart: note.chart, patient: note.patient,
        reason: label, duration, method: note.method, priority: note.priority, date: MOIS_TODAY,
      })
    }
    close()
  }
  return (
    <StageWindow id={PRIVATE_WINDOWS.breakGlass} title="Access Control - Temporary Access" width={453} height={377} onClose={close}
      bodyStyle={{ background: '#fff', padding: '10px 14px' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={!reason} onClick={go} tutorialId="host.mois.command.private-continue">Continue</FooterButton>
        <FooterButton onClick={close} tutorialId="host.mois.command.private-cancel">Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <p style={{ margin: '0 0 10px' }}>You do not have access to the selected record.  If you require temporary access, please complete the information below.</p>
      <div>Reason For Temporary Access:</div>
      <PBSelect w={320} value={reason} options={BREAK_GLASS_REASONS} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.private-reason" />
      <div style={{ marginTop: 10 }}>Additional Note:</div>
      <PBTextArea rows={4} w="100%" value={extra} onChange={(e) => setExtra(e.target.value)} data-tutorial-id="host.mois.field.private-additional-note" />
      <div style={{ marginTop: 10 }}>Duration of Access:</div>
      <div className="pb-row" style={{ gap: 16, paddingTop: 4 }}>
        {BREAK_GLASS_DURATIONS.map((d) => (
          <PBRadio key={d} name="private-duration" label={d} checked={duration === d} onChange={() => setDuration(d)} tutorialId={`host.mois.field.private-duration-${pbSlug(d)}`} />
        ))}
      </div>
    </StageWindow>
  )
}

/* --- Blocked by Author ------------------------------------------------------ */
function BlockedWindow({ args, close }: AreaWindowProps) {
  return (
    <StageMessageBox id={PRIVATE_WINDOWS.blocked} title="Blocked by Author" icon="error" buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={close}>
      {args.permission ? 'You have not been given permission to break glass on private notes.' : 'The record author has not authorized you to break glass.'}
    </StageMessageBox>
  )
}

registerAreaWindow(PRIVATE_WINDOWS.access, AccessListWindow)
registerAreaWindow(PRIVATE_WINDOWS.edit, AccessRecordWindow)
registerAreaWindow(PRIVATE_WINDOWS.breakGlass, BreakGlassWindow)
registerAreaWindow(PRIVATE_WINDOWS.blocked, BlockedWindow)
