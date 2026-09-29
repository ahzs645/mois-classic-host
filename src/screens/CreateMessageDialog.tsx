import { useState } from 'react'
import { MOIS_TODAY } from '../data/patients'
import { argStr } from '../data/text'
import { CURRENT_USER, TASK_PRIORITIES, WORKSPACE_USERS } from '../data/tasks'
import { workspaceStore } from '../data/workspaceStore'
import { PBInput, PBLookup, PBRadio, PBSelect, PBTextArea } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogFooter, FormLabel } from './formKit'
import { DialogButton, FormBand, FormRule, WorkspaceDialogFrame } from './WorkspaceDialogFrame'
import { MhkMessageNotes, MhkSendToPatient } from './MyHealthKeyChartView'

/* ============================================================================
   Create New Message.

   PROVENANCE
   · 303767 image `cd5ed806` (v02.21.18) — opened with Create Message on
     Acknowledge - Consults: a "Message Information" band; on the left two
     stacked grids, Send To and Copies To, each ending in a greyed
     `< select user >` row; on the right the four Priority radios in one row
     with Medium chosen, Message (the title), Detail pre-filled from the
     record, and a footer reading Chart / Patient on the left and Linked to /
     Record ID on the right. Its button is Save (F2).
   · 303597 image `2d2878a0` (v02.17.19) — the same window from Notifications
     ▸ Messages ▸ New Record, with nothing linked: Chart is an editable field
     with the ellipsis (F4), Patient under it, and the button reads
     Create (F2). The article text says "Create (F2)" throughout.

   The v02.21.18 capture is the build this emulator's Workspace follows, so
   the button is Save (F2) when the window is opened on a record and
   Create (F2) when it is not — exactly the two captures.

   Saving sends a copy to everyone in Send To and Copies To at once and files
   the message in Sent Messages (art. 303597: "this will immediately send a
   copy to the recipient(s) listed").

   ARGS (all optional): `chart`, `patient`, `linkedTo` (the record type, e.g.
   "Consult"), `recordId` ("Consult - record id: 500090"), `detail`,
   `subject`, `sendTo` (a user to pre-fill — Create Message from Task puts the
   task's creator there, art. 303599).
   ========================================================================= */

const SELECT_USER = '< select user >'

/** One of the two recipient grids: a blue caption, the picked users, and the
    `< select user >` row that picks the next one. */
function RecipientGrid({ caption, users, onChange, id }: {
  caption: string; users: string[]; onChange: (next: string[]) => void; id: string
}) {
  const [cur, setCur] = useState(users.length)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0, background: '#fff' }} data-tutorial-id={`host.mois.field.${id}`}>
      <div style={{ display: 'flex', height: 19, flex: 'none', background: '#c6dcf5' }}>
        <span style={{ width: 16, flex: 'none', background: '#e6e6e6' }} />
        <span style={{ flex: '1 1 auto', textAlign: 'center', lineHeight: '19px' }}>{caption}</span>
      </div>
      {[...users, null].map((u, i) => (
        <div
          key={i}
          onMouseDown={() => setCur(i)}
          style={{ display: 'flex', height: 20, flex: 'none', alignItems: 'center', background: i === cur ? '#f6b8a0' : undefined }}
        >
          <span style={{ width: 16, flex: 'none', textAlign: 'center', fontSize: 9 }}>{i === cur ? '>' : ''}</span>
          {u !== null ? (
            <span style={{ flex: '1 1 auto', padding: '0 3px' }}>{u}</span>
          ) : (
            /* the placeholder row is the picker: choosing a user adds a row */
            <PBSelect
              className="pb-select--cell"
              style={{ flex: '1 1 auto', color: '#8a8a8a' }}
              value=""
              options={[{ value: '', label: SELECT_USER }, ...WORKSPACE_USERS.filter((w) => !users.includes(w))]}
              data-tutorial-id={`host.mois.field.${id}-select-user`}
              onChange={(e) => { if (e.target.value) { onChange([...users, e.target.value]); setCur(users.length + 1) } }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function CreateMessageDialog({ args, close }: AreaWindowProps) {
  const linked = Boolean(argStr(args.recordId) || argStr(args.linkedTo))
  const [sendTo, setSendTo] = useState<string[]>(argStr(args.sendTo) ? [argStr(args.sendTo)] : [])
  const [copies, setCopies] = useState<string[]>(argStr(args.copiesTo) ? argStr(args.copiesTo).split(';').map((c) => c.trim()).filter(Boolean) : [])
  const [priority, setPriority] = useState('M')
  const [subject, setSubject] = useState(argStr(args.subject))
  const [detail, setDetail] = useState(argStr(args.detail))
  const [chart, setChart] = useState(argStr(args.chart))
  /* myhealthkey patient messaging (2280708 `8150b451…`; MyHealthKeyChartView.tsx):
     Send To Patient, and the record's notes (`args.notes`, ';'-separated) */
  const [toPatient, setToPatient] = useState(false)
  const [pickedNotes, setPickedNotes] = useState<string[]>([])
  const notes = argStr(args.notes) ? argStr(args.notes).split(';').map((n) => n.trim()).filter(Boolean) : []

  const save = () => {
    workspaceStore.addMessage({
      p: priority,
      sent: MOIS_TODAY,
      patient: argStr(args.patient),
      subject: subject || '(no subject)',
      sentBy: CURRENT_USER.login,
      sentTo: sendTo.join('; '),
      copiedTo: copies.join('; '),
      detail,
      chart,
    })
    close()
  }

  return (
    <WorkspaceDialogFrame id="create-message" title="Create New Message" width={922} height={592} onClose={close}>
      <div style={{ margin: '12px 18px 0', border: '1px solid #a0a0a0', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
        <FormBand>Message Information</FormBand>
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
          {/* the two recipient grids */}
          <div style={{ width: 234, flex: 'none', display: 'flex', flexDirection: 'column', borderRight: '1px solid #a0a0a0' }}>
            <RecipientGrid caption="Send To" users={sendTo} onChange={setSendTo} id="message-send-to" />
            <div style={{ height: 1, background: '#a0a0a0', flex: 'none' }} />
            <RecipientGrid caption="Copies To" users={copies} onChange={setCopies} id="message-copies-to" />
            <MhkSendToPatient chart={chart} send={toPatient} onChange={setToPatient} />
          </div>

          <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="pb-row" style={{ gap: 8, padding: '14px 10px', flex: 'none' }} data-tutorial-id="host.mois.field.message-priority">
              <FormLabel w={76}>Priority:</FormLabel>
              <span className="pb-row" style={{ gap: 0, flex: '1 1 auto', justifyContent: 'space-between', paddingRight: 30 }}>
                {TASK_PRIORITIES.map((p) => (
                  <PBRadio key={p.code} name="message-priority" label={p.label} checked={priority === p.code} onChange={() => setPriority(p.code)} />
                ))}
              </span>
            </div>
            <FormRule />
            <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gridTemplateRows: 'auto 1fr', rowGap: 6, padding: '10px 10px', flex: '1 1 auto', minHeight: 0 }}>
              <FormLabel w={76}>Message:</FormLabel>
              <PBInput w="100%" value={subject} data-tutorial-id="host.mois.field.message-subject" onChange={(e) => setSubject(e.target.value)} />
              <FormLabel w={76}>Detail:</FormLabel>
              <PBTextArea
                value={detail}
                data-tutorial-id="host.mois.field.message-detail"
                onChange={(e) => setDetail(e.target.value)}
                style={{ height: '100%', minHeight: 150, resize: 'none' }}
              />
            </div>
            <FormRule />
            <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr auto 220px', rowGap: 8, columnGap: 8, padding: '10px 10px 14px', flex: 'none' }}>
              <FormLabel w={76}>Chart:</FormLabel>
              {linked ? <span>{chart}</span> : <PBLookup w={96} value={chart} name="message-chart" onChange={setChart} />}
              {linked ? <span className="pb-form__label">Linked to:</span> : <span />}
              <span>{linked ? argStr(args.linkedTo) : ''}</span>
              <FormLabel w={76}>Patient:</FormLabel>
              <span>{argStr(args.patient)}</span>
              {linked ? <span className="pb-form__label">Record ID:</span> : <span />}
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>{linked ? argStr(args.recordId) : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {toPatient && notes.length > 0 && <MhkMessageNotes notes={notes} picked={pickedNotes} onPick={setPickedNotes} />}
      <DialogFooter gap={14} padding="14px 0">
        <DialogButton id="message-save" onClick={save} isDefault>{linked ? 'Save (F2)' : 'Create (F2)'}</DialogButton>
        <DialogButton id="message-cancel" onClick={close}>Cancel</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('create-message', CreateMessageDialog)
