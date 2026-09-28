import { Fragment, useState } from 'react'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { accessId, isPrivate, running, usePrivateNotes, type PrivateNote } from '../data/privateNotes'
import { DESKTOP_USER, encounterRowById } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { registerScreenWindows, useScreenWindow } from '../host/screen-windows'
import { PBCommandRow, PBSelect, PBViewHeader, pbSlug, useMdi } from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'
import { DirectorySearchWindow, PRIVATE_WINDOWS } from './PrivateNoteWindows'
import { StageMessageBox } from './StageWindow'
import { WorkspaceBanner } from './WorkspaceBanner'

/* ============================================================================
   The two places private notes are managed from outside the encounter.

   · Workspace ▸ Other ▸ My Private Notes (node `ws-private-notes`) — "Go to
     Workspace module, select Other from the folder options available and
     open My Private Notes. Available actions in folder: View all private
     notes, Open the associated encounter, Review access permissions, Add,
     edit, or delete access" (3799734). The folder itself is not captured:
     INFERRED from the administrator's Private Notes window below (same
     columns, the Workspace banner, Refresh · Review Access · Open Encounter ·
     Close Window). Review Access is the Access Control list
     (screens/PrivateNoteWindows.tsx, `0657d92e…png` from the Workspace).
   · Administration ▸ Chart Access Control ▸ Private Notes (node
     `ad-private-notes`) — 3799750 `2f2f9da1…png`: navy "Private Notes"; the
     Task Bar Refresh · Review Access · Open Encounter · Grant Access · Change
     Owner · Close Window, Grant Access and Change Owner greyed until a User
     is chosen; a "Parameters" box with User ▾; the notes grouped under each
     owner's name in a pale-blue band that carries the column captions
     Appointment Date · Visit Reason · Access Started / Stopped; an ended
     record in grey. Grant Access (`15469d8b…`): "Grant Access- Confirmation
     — Would you like to grant access to all of the below encounter notes?",
     the MOIS - Search Window, the Access Control record with Break Glass
     greyed, then "Warning: there is no bulk undo process. Would you like to
     grant access to <user> to the <n> encounter notes?". Change Owner
     (`1ca0d66a…`): Change Owner - Confirmation (the two consequences),
     Provider Consent, Patient Consent (both ✖ Yes · No), then the Search
     Window; "Previous owner access is end-dated, New owner assumes control"
     (3799750).

   The notes are the private-note store (data/privateNotes.ts), which holds
   the training overlay's two and every note made private on the stage.
   Open Encounter opens the note's encounter when its chart is the open
   one (the stage does not switch charts from here).

   Screen windows: private-grant-confirm, private-grant-search,
   private-owner-confirm, private-owner-provider-consent,
   private-owner-patient-consent, private-owner-search. Anchors:
   host.mois.field.private-notes-user; rows host.mois.row.private-<chart>-
   <encounter>; host.mois.group.private-owner-<slug>. Reported:
   host.screen.rows, .privateUser.
   ========================================================================= */

const WIN = {
  grantConfirm: 'private-grant-confirm',
  grantSearch: 'private-grant-search',
  ownerConfirm: 'private-owner-confirm',
  ownerProvider: 'private-owner-provider-consent',
  ownerPatient: 'private-owner-patient-consent',
  ownerSearch: 'private-owner-search',
} as const
registerScreenWindows(Object.values(WIN))

const COLS = '70px 170px 90px 60px 1fr 110px 110px'

function ownerRow(n: PrivateNote) {
  return n.access.find((r) => r.kind === 'owner' && r.who === n.owner)
}

/** The grouped list both folders draw. */
function NoteList({ notes, cur, onPick }: { notes: PrivateNote[]; cur: string | null; onPick: (id: string) => void }) {
  const owners = [...new Set(notes.map((n) => n.owner))].sort()
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', margin: '0 3px 3px', border: '1px solid var(--pb-border)' }}
      data-tutorial-id="host.mois.group.private-notes-list">
      {owners.length === 0 && <div className="pb-dw__empty" style={{ padding: 20 }}>No private notes.</div>}
      {owners.map((owner) => (
        <Fragment key={owner}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, background: '#c8dcfa', padding: '6px 6px', alignItems: 'center' }}
            data-tutorial-id={`host.mois.group.private-owner-${pbSlug(owner)}`}>
            <b style={{ gridColumn: 'span 3' }}>{owner}</b>
            <span style={{ gridColumn: 'span 2', color: '#7a7a7a' }}>Appointment Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Visit Reason</span>
            <span style={{ gridColumn: 'span 2', color: '#7a7a7a' }}>Access Started / Stopped</span>
          </div>
          {notes.filter((n) => n.owner === owner).map((n, i) => {
            const own = ownerRow(n)
            /* a note the store made before its encounter row was at hand
               (the training overlay's) takes the visit from the chart */
            const visit = !n.apptDate ? encounterRowById(n.chart, n.encounter) : undefined
            if (visit) n = { ...n, apptDate: visit.date ?? '', apptTime: visit.hr && visit.mn ? `${visit.hr.padStart(2, '0')}:${visit.mn.padStart(2, '0')}` : '', visitReason: visit.reason ?? '' }
            const ended = !isPrivate(n)
            return (
              <div key={n.id}
                data-tutorial-id={`host.mois.row.private-${n.chart}-${n.encounter}`}
                onMouseDown={() => onPick(n.id)}
                style={{
                  display: 'grid', gridTemplateColumns: COLS, padding: '6px 6px', cursor: 'default',
                  background: cur === n.id ? 'var(--pb-dw-select, #e39b83)' : i % 2 ? '#fff' : '#ececec',
                  color: ended && cur !== n.id ? '#9a9a9a' : undefined,
                }}>
                <span>{n.chart}</span><span>{n.patient}</span><span>{n.apptDate}</span><span>{n.apptTime}</span><span>{n.visitReason}</span>
                <span>{own?.start ?? ''}</span><span>{own?.stop || (ended ? MOIS_TODAY : '-')}</span>
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

/** Opening a note's encounter, when its chart is the one open. */
function useOpenNoteEncounter() {
  const mdi = useMdi()
  const { chart } = usePatient()
  return (n: PrivateNote | undefined) => {
    if (!n || n.chart !== chart) return false
    const row = encounterRowById(chart, n.encounter)
    mdi.open({ kind: 'encounter', key: `encounter:${chart}:${n.encounter}`, title: `Encounter ${n.encounter}`, props: { encounter: row ?? { id: n.encounter } } })
    return true
  }
}

/* --- Workspace ▸ Other ▸ My Private Notes ----------------------------------- */
function MyPrivateNotesView({ close }: FolderViewProps) {
  const [all] = usePrivateNotes()
  const open = useOpenWindow()
  const openEncounter = useOpenNoteEncounter()
  const { chart } = usePatient()
  const notes = Object.values(all).filter((n) => n.owner === DESKTOP_USER || n.access.some((r) => r.who === DESKTOP_USER && r.kind === 'direct' && running(r)))
  const [cur, setCur] = useState<string | null>(null)
  const picked = notes.find((n) => n.id === cur)
  useScreenReport({ rows: notes.length, row: picked ? `private-${picked.chart}-${picked.encounter}` : null })
  return (
    <>
      <WorkspaceBanner title="My Private Notes" />
      <PBCommandRow commands={[
        { label: 'Refresh' },
        { label: 'Review Access', disabled: !picked, onClick: () => { if (picked) open(PRIVATE_WINDOWS.access, { id: picked.id }) } },
        { label: 'Open Encounter', disabled: !picked || picked.chart !== chart, onClick: () => { openEncounter(picked) } },
        { label: 'Close Window', onClick: close },
      ]} />
      <NoteList notes={notes} cur={cur} onPick={setCur} />
    </>
  )
}

/* --- Administration ▸ Chart Access Control ▸ Private Notes ------------------ */
function AdminPrivateNotesView({ close }: FolderViewProps) {
  const [all, update] = usePrivateNotes()
  const open = useOpenWindow()
  const win = useScreenWindow()
  const openEncounter = useOpenNoteEncounter()
  const { chart } = usePatient()
  const [user, setUser] = useState('')
  const owners = [...new Set(Object.values(all).map((n) => n.owner))].sort()
  /* "Leave User field blank to view all notes" */
  const notes = Object.values(all).filter((n) => !user || n.owner === user)
  const [cur, setCur] = useState<string | null>(null)
  const picked = notes.find((n) => n.id === cur)
  const ids = notes.filter(isPrivate).map((n) => n.id)
  useScreenReport({ rows: notes.length, privateUser: user ? pbSlug(user) : null })

  const changeOwner = (to: string) => {
    ids.forEach((id) => update(id, (n) => n && ({
      ...n,
      owner: to,
      access: [
        ...n.access.map((r) => (r.kind === 'owner' && running(r) ? { ...r, stop: MOIS_TODAY, ended: true } : r)),
        { id: accessId(), who: to, kind: 'owner' as const, start: MOIS_TODAY, stop: '', note: 'Change Owner' },
      ],
    })))
    setUser(to)
  }

  return (
    <>
      <PBViewHeader title="Private Notes" />
      <PBCommandRow commands={[
        { label: 'Refresh' },
        { label: 'Review Access', disabled: !picked, onClick: () => { if (picked) open(PRIVATE_WINDOWS.access, { id: picked.id }) } },
        { label: 'Open Encounter', disabled: !picked || picked.chart !== chart, onClick: () => { openEncounter(picked) } },
        { label: 'Grant Access', disabled: !user || !ids.length, onClick: () => win.open(WIN.grantConfirm) },
        { label: 'Change Owner', disabled: !user || !ids.length, onClick: () => win.open(WIN.ownerConfirm) },
        { label: 'Close Window', onClick: close },
      ]} />
      <div style={{ padding: '4px 12px 8px', flex: 'none' }}>
        <div className="pb-groupbox" style={{ padding: '4px 10px 8px', border: '1px solid #d0d0d0' }}>
          <b style={{ color: '#000080' }}>Parameters</b>
          <div className="pb-row" style={{ gap: 20, paddingTop: 4 }}>
            <span>User:</span>
            <PBSelect w={320} value={user} options={['', ...owners]} onChange={(e) => { setUser(e.target.value); setCur(null) }} data-tutorial-id="host.mois.field.private-notes-user" />
          </div>
        </div>
      </div>
      <NoteList notes={notes} cur={cur} onPick={setCur} />

      {win.is(WIN.grantConfirm) && (
        <StageMessageBox id={WIN.grantConfirm} title="Grant Access- Confirmation" icon="question"
          buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
          onClose={(v) => (v === 'yes' ? win.open(WIN.grantSearch) : win.close())}>
          Would you like to grant access to all of the below encounter notes?
        </StageMessageBox>
      )}
      {win.is(WIN.grantSearch) && (
        <DirectorySearchWindow onClose={win.close}
          onPick={(r) => { win.close(); open(PRIVATE_WINDOWS.edit, { mode: 'grant', ids, grantee: r.name }) }} />
      )}
      {win.is(WIN.ownerConfirm) && (
        <StageMessageBox id={WIN.ownerConfirm} title="Change Owner - Confirmation" icon="warn"
          buttons={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true }]}
          onClose={(v) => (v === 'yes' ? win.open(WIN.ownerProvider) : win.close())}>
          Changing the owner for the below records will:<br /><br />- Stop the previous owner&apos;s access<br />- Start access for the selected user<br /><br />
          Would you like to change the owner of all the below encounter notes?
        </StageMessageBox>
      )}
      {win.is(WIN.ownerProvider) && (
        <StageMessageBox id={WIN.ownerProvider} title="Change Owner - Provider Consent" icon="error"
          buttons={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true }]}
          onClose={(v) => (v === 'yes' ? win.open(WIN.ownerPatient) : win.close())}>
          Has the current provider given consent to update the ownership of the encounter notes listed below?
        </StageMessageBox>
      )}
      {win.is(WIN.ownerPatient) && (
        <StageMessageBox id={WIN.ownerPatient} title="Change Owner - Patient Consent" icon="error"
          buttons={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true }]}
          onClose={(v) => (v === 'yes' ? win.open(WIN.ownerSearch) : win.close())}>
          Has the patient given consent to update the ownership of the encounter notes listed below?
        </StageMessageBox>
      )}
      {win.is(WIN.ownerSearch) && (
        <DirectorySearchWindow onClose={win.close} onPick={(r) => { changeOwner(r.name); win.close() }} />
      )}
    </>
  )
}

registerFolderView(['ws-private-notes'], MyPrivateNotesView)
registerFolderView(['ad-private-notes'], AdminPrivateNotesView)
