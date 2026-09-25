import { useState, type ReactNode } from 'react'
import { useChartRows } from '../data/chart-records'
import { notificationTabs } from '../data/mois'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { SESSION_USER } from '../data/chartSession'
import { useWorkspaceStore } from '../data/workspaceStore'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow,
  PBIdentityStrip,
  PBInput, PBRadio, PBSelect, PBTabs, PBTextArea,
  PBViewHeader, type PBColumn,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'

/* ============================================================================
   Notification — the Patient Chart's Notifications folder (art. 303528).

   Five tabs, each its own list with the detail for the current row under it:

     Reminders   303528 `b03ea265…` / 303594 `bc66bd81…`: Detail, Triggering
                 Event (five boxes), Recurring (if applicable) Repeat every
                 [ ] [Month(s)], Other Items — Flag Item / Highlight Row,
                 Start Date, Grace Per. (days before due), Stopped By — and a
                 Record Created / Last Modified line.
     Recalls     `fde48b33…` / `a731266f…`: the same band with Due Date, and a
                 Stop when group (No End / Repeat for / End By) under
                 Recurring; the Code cell drops the recall-code list
                 (303595 `33dda4ac…`).
     Tasks       `e422b6f8…`: Detail / Follow Up Notes tabs; Resp'blty User and
                 Team drop-downs, Priority radios, Due, Status (Acknowledged,
                 Completed), Linked to, Group, Detail, Created / Last Modified.
     Messages    `36b3bf43…`: Priority, Linked to, Subject, Detail, and the
                 Sent To / Copied To grids at the right.
     Responses   `df1f56b7…`: the Inphonite automated-call results, two
                 read-only grids (Response Summary, Call Statistics).

   New Record adds a row to Reminders or Recalls, and raises Create New Task /
   Create New Message on those two tabs, as Action ▸ Create Task / Create
   Message do. Tasks and messages raised for this chart during the session
   (data/workspaceStore.ts) list here.
   ========================================================================= */

const TABS = ['Reminders', 'Recalls', 'Tasks', 'Messages', 'Responses - READ ONLY']

/** 303595 `33dda4ac…`: the recall codes, verbatim */
const RECALL_CODES = [
  { code: 'CC', description: 'Complex Care' }, { code: 'CHF', description: 'Congestive Heart Failure' },
  { code: 'COLON', description: 'Colonoscopy' }, { code: 'COPD', description: 'COPD Screening' },
  { code: 'CT', description: 'CT Scan' }, { code: 'DIAB', description: 'Diabetes Annual Visit' },
  { code: 'FLU', description: 'Flu Vaccination' }, { code: 'HTN', description: 'Hypertension Screening' },
  { code: 'MAMMO', description: 'Mammogram' }, { code: 'MRI', description: 'MRI Scan' },
  { code: 'PAP', description: 'Pap Test' }, { code: 'XYZ', description: 'XYZ Code' },
  { code: 'OTHER', description: 'Other' },
]

const TRIGGERS = ['Patient Arrival', 'Patient Discharge', 'Booking Appointment', 'Open Chart', 'Open Encounter Detail']

type NoteRow = Record<string, string | undefined>

export function NotificationView() {
  const exportedRows = useChartRows('notifications')
  const patient = usePatient()
  const openWindow = useOpenWindow()
  const workspace = useWorkspaceStore()
  const [tab, setTab] = useState('Reminders')
  const [lower, setLower] = useState('Detail')
  const [cur, setCur] = useState(0)
  /* rows a learner added this session, per chart, kept when the folder is left */
  const [added, setAdded] = useSessionState<Record<string, NoteRow[]>>(`notifications:${patient.chart}`, {})
  const [dirty, setDirty] = useState(false)

  const cfg = notificationTabs[tab]!
  const own = added[tab] ?? []
  const workspaceRows: NoteRow[] = tab === 'Tasks'
    ? workspace.tasks.filter((t) => t.chart === patient.chart).map((t) => ({
      flag: String(t.p ?? ''), att: '', due: String(t.due ?? ''), task: String(t.task ?? ''), ack: '', complete: '',
      created: String(t.created ?? ''), by: String(t.createdBy ?? ''), m: '', detail: String(t.detail ?? ''),
      to: String(t.team || t.assignee || ''),
    }))
    : tab === 'Messages'
      ? workspace.messages.filter((m) => m.chart === patient.chart).map((m) => ({
        flag: String(m.p ?? ''), att: '', sent: String(m.sent ?? m.created ?? MOIS_TODAY), subject: String(m.subject ?? m.task ?? ''),
        by: String(m.sentBy ?? m.createdBy ?? ''), m: '', detail: String(m.detail ?? ''), to: String(m.sentTo ?? m.assignee ?? ''),
      }))
      : []
  const rows: NoteRow[] = [...own, ...workspaceRows, ...(exportedRows as NoteRow[])]
  const row = rows[cur]
  const draft = own.some((r) => !r.saved)
  useScreenReport({ draft, rows: rows.length, record: own.some((r) => r.saved === 'saved') ? 'saved' : '' })

  const setRow = (patch: Partial<NoteRow>) => {
    if (cur >= own.length) return
    setAdded((a) => ({ ...a, [tab]: (a[tab] ?? []).map((r, i) => (i === cur ? { ...r, ...patch } : r)) }))
    setDirty(true)
  }

  const newRecord = () => {
    if (tab === 'Tasks') { openWindow('chart-create-task'); return }
    if (tab === 'Messages') { openWindow('chart-create-message'); return }
    if (tab === 'Reminders' || tab === 'Recalls') {
      const blank: NoteRow = tab === 'Reminders'
        ? { flag: '', reminder: '', start: MOIS_TODAY, stop: '', m: '', created: `${MOIS_TODAY} 10:05`, by: SESSION_USER }
        : { flag: '', code: '', note: '', due: MOIS_TODAY, stop: '', m: '', created: `${MOIS_TODAY} 10:05`, by: SESSION_USER }
      setAdded((a) => ({ ...a, [tab]: [blank, ...(a[tab] ?? [])] }))
      setCur(0)
      setDirty(true)
    }
  }
  const save = () => {
    setAdded((a) => ({ ...a, [tab]: (a[tab] ?? []).map((r) => ({ ...r, saved: 'saved' })) }))
    setDirty(false)
  }
  const undo = () => {
    setAdded((a) => ({ ...a, [tab]: (a[tab] ?? []).filter((r) => r.saved) }))
    setDirty(false)
  }

  const columns = (cfg.columns as PBColumn<NoteRow>[]).map((c): PBColumn<NoteRow> => {
    if (c.key === 'stop' || c.key === 'ack' || c.key === 'complete') {
      return { ...c, render: (r) => <PBCheckbox checked={r[c.key] === 'Y'} /> }
    }
    if (tab === 'Recalls' && c.key === 'code') {
      return {
        ...c,
        render: (r, i) => (i < own.length && !r.saved
          ? (
            <PBDropDownDataWindow
              w="100%"
              listW={320}
              value={r.code}
              tutorialId="host.mois.field.recall-code"
              columns={[{ key: 'code', header: 'Code', width: 90 }, { key: 'description', header: 'Description' }]}
              rows={RECALL_CODES}
              onSelect={(pick) => setRow({ code: pick.code, note: pick.description })}
            />
          )
          : r.code),
      }
    }
    if (tab === 'Reminders' && c.key === 'reminder') {
      return {
        ...c,
        render: (r, i) => (i < own.length && !r.saved
          ? <PBInput w="100%" value={r.reminder} data-tutorial-id="host.mois.field.reminder" onChange={(e) => setRow({ reminder: e.target.value })} />
          : r.reminder),
      }
    }
    return c
  })

  const onlyTwo = tab === 'Reminders' || tab === 'Recalls'
  return (
    <>
      <PBViewHeader title="Notification" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: newRecord, disabled: tab === 'Responses - READ ONLY' },
          { label: 'Delete Record', disabled: tab === 'Responses - READ ONLY' },
          { label: 'Save', disabled: !dirty, onClick: save },
          { label: 'Undo', disabled: !dirty, onClick: undo },
          { label: 'Refresh' },
        ]}
      />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBTabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setCur(0) }} justified>
          <PBBand>{cfg.list}</PBBand>

          {/* each list has its own filter row above the grid */}
          {cfg.filters !== 'none' && (
            <div className="pb-row" style={{ padding: '3px 6px 3px 20px', gap: 6 }}>
              {tab === 'Messages' && (<><span style={{ width: 120 }} /><PBInput w={500} /><PBInput w={150} /></>)}
              {cfg.filters === 'recall' && (<><PBInput w={96} /><PBInput w={420} /></>)}
              {cfg.filters === 'task' && (
                <>
                  <span style={{ width: 130 }} />
                  <PBInput w={440} />
                  <span style={{ width: 20 }} />
                  <PBCheckbox /><span style={{ width: 50 }} /><PBCheckbox />
                </>
              )}
              {cfg.filters === 'one' && <PBInput w={510} />}
            </div>
          )}

          <div style={{ height: cfg.split ? 196 : onlyTwo ? 250 : 220, display: 'flex', padding: '0 6px', flex: 'none' }}>
            <PBDataWindow
              rows={rows}
              current={cur}
              onCurrentChange={setCur}
              columns={columns}
              rowTutorialId={(_, i) => (i === 0 ? `host.mois.row.${tab === 'Recalls' ? 'recall' : tab === 'Reminders' ? 'reminder' : 'notification'}-first` : undefined)}
              empty={`No ${tab.replace(' - READ ONLY', '').toLowerCase()} for this patient.`}
            />
          </div>

          {/* Responses stacks a second read-only grid instead of a detail pane */}
          {cfg.split && cfg.lower && (
            <>
              <PBBand>{cfg.lower.list}</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
                <PBDataWindow rows={[]} columns={cfg.lower.columns as PBColumn<Record<string, string>>[]} empty=" " />
              </div>
            </>
          )}

          {onlyTwo && <ReminderBand key={tab} recall={tab === 'Recalls'} row={row} onDetail={(v) => setRow({ detail: v })} />}
          {tab === 'Tasks' && (
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '5px 6px 4px' }}>
              <PBTabs tabs={['Detail', 'Follow Up Notes (0)']} active={lower === 'Detail' ? 'Detail' : 'Follow Up Notes (0)'} onChange={setLower} compact>
                {lower === 'Detail' ? <TaskDetail row={row} /> : <div className="pb-dw__empty" style={{ padding: 20 }}>No follow up notes.</div>}
              </PBTabs>
            </div>
          )}
          {tab === 'Messages' && <MessageDetail row={row} />}
        </PBTabs>
      </div>
    </>
  )
}

const label = (text: ReactNode, w?: number) => <span className="pb-form__label" style={{ width: w, flex: w ? 'none' : undefined }}>{text}</span>

/* the Reminders / Recalls detail band */
function ReminderBand({ recall, row, onDetail }: { recall: boolean; row?: NoteRow; onDetail: (v: string) => void }) {
  const [triggers, setTriggers] = useState<Set<string>>(() => new Set(recall ? ['Patient Arrival'] : TRIGGERS))
  const [stopWhen, setStopWhen] = useState('No End')
  return (
    <div data-tutorial-id="host.mois.group.notification-detail" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid #9a9a9a', padding: '6px 10px 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '230px 158px 204px 1fr', columnGap: 14, flex: '1 1 auto', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {label('Detail:')}
          <PBTextArea
            key={row?.created ?? 'none'}
            value={row?.detail ?? ''}
            onChange={(e) => onDetail(e.target.value)}
            data-tutorial-id="host.mois.field.notification-detail"
            style={{ flex: '1 1 auto', height: 104, marginTop: 3 }}
          />
        </div>
        <div data-tutorial-id="host.mois.group.triggering-event">
          {label('Triggering Event:')}
          {TRIGGERS.map((t) => (
            <div key={t} style={{ padding: '1px 0' }}>
              <PBCheckbox label={t} checked={triggers.has(t)} onChange={(c) => setTriggers((s) => { const n = new Set(s); c ? n.add(t) : n.delete(t); return n })} />
            </div>
          ))}
        </div>
        <div data-tutorial-id="host.mois.group.recurring">
          {label('Recurring (if applicable):')}
          <div className="pb-row" style={{ gap: 4, paddingLeft: 8, marginTop: 4 }}>
            {label('Repeat every')}<PBInput w={32} defaultValue={recall ? '' : ''} /><PBInput w={58} value="Month(s)" readOnly />
          </div>
          {recall && (
            <div style={{ paddingLeft: 8, marginTop: 8 }}>
              {label('Stop when:')}
              {['No End', 'Repeat for', 'End By'].map((s) => (
                <div key={s} style={{ paddingLeft: 4 }}><PBRadio name="recall-stop-when" label={s} checked={stopWhen === s} onChange={() => setStopWhen(s)} /></div>
              ))}
            </div>
          )}
        </div>
        <div data-tutorial-id="host.mois.group.other-items" style={{ display: 'grid', gridTemplateColumns: '78px 1fr', rowGap: 3, alignContent: 'start' }}>
          <span className="pb-form__label" style={{ gridColumn: 'span 2' }}>Other Items:</span>
          <span className="pb-form__label" style={{ textAlign: 'right' }}>Flag Item:</span><PBCheckbox label="Highlight Row" />
          <span className="pb-form__label" style={{ textAlign: 'right' }}>{recall ? 'Due Date:' : 'Start Date:'}</span>
          <PBInput w={82} value={(recall ? row?.due : row?.start) ?? ''} readOnly />
          <span className="pb-form__label" style={{ textAlign: 'right' }}>Grace Per.:</span><PBInput w={38} defaultValue={recall ? '90' : '0'} align="center" />
          <span /><span>(days before due)</span>
          <span className="pb-form__label" style={{ textAlign: 'right' }}>Stopped By:</span><span />
        </div>
      </div>
      <div className="pb-row" style={{ gap: 12, paddingTop: 4, flex: 'none' }}>
        {label('Record Created:')}<span style={{ width: 240 }}>{row?.created ? `${row.created}  ${row.by ?? ''}` : ''}</span>
        {label('Last Modified:')}
      </div>
    </div>
  )
}

/* the Tasks tab's Detail page */
function TaskDetail({ row }: { row?: NoteRow }) {
  const pri = row?.flag || 'M'
  return (
    <div data-tutorial-id="host.mois.group.task-detail" style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: '84px 1fr 1fr', rowGap: 4, padding: '4px 8px', alignContent: 'start' }}>
      {label("Resp'blty:")}
      <span className="pb-row" style={{ gap: 6 }}><PBSelect w={180} options={[row?.to ?? '']} />(User)</span>
      <span>Created By: {row?.by ?? ''}</span>
      <span />
      <span className="pb-row" style={{ gap: 6 }}><PBSelect w={180} options={['']} />(Team)</span>
      <span>{row?.created ?? ''}</span>
      {label('Priority:')}
      <span className="pb-row" style={{ gap: 18, gridColumn: 'span 2' }}>
        {[['L', 'Low'], ['M', 'Medium'], ['H', 'High'], ['V', 'V. High']].map(([c, l]) => <PBRadio key={c} name="task-priority" label={l} checked={pri === c} />)}
      </span>
      {label('Due:')}<span style={{ gridColumn: 'span 2' }}><PBInput w={90} value={row?.due ?? ''} readOnly /></span>
      {label('Status:')}
      <span><PBCheckbox label="Acknowledged" /><br /><PBCheckbox label="Completed" /></span>
      <span>Linked to: </span>
      {label('Group:')}<span style={{ gridColumn: 'span 2' }}><PBSelect w={200} options={['']} /></span>
      {label('Detail:')}
      <PBTextArea key={row?.task ?? 'none'} defaultValue={row?.detail ?? ''} rows={4} style={{ gridColumn: 'span 2' }} />
    </div>
  )
}

/* the Messages tab's detail: no tab strip, the recipient grids at the right */
function MessageDetail({ row }: { row?: NoteRow }) {
  const pri = row?.flag || 'M'
  return (
    <div data-tutorial-id="host.mois.group.message-detail" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 6, padding: '5px 6px 4px', borderTop: '1px solid #9a9a9a' }}>
      <div style={{ flex: '1 1 auto', display: 'grid', gridTemplateColumns: '74px 1fr', rowGap: 5, alignContent: 'start' }}>
        {label('Priority:')}
        <span className="pb-row" style={{ gap: 18 }}>
          {[['L', 'Low'], ['M', 'Medium'], ['H', 'High'], ['V', 'V. High']].map(([c, l]) => <PBRadio key={c} name="message-priority" label={l} checked={pri === c} />)}
        </span>
        {label('Linked to:')}<span />
        {label('Subject:')}<PBInput w="100%" value={row?.subject ?? ''} readOnly />
        {label('Detail:')}<PBTextArea key={row?.subject ?? 'none'} defaultValue={row?.detail ?? ''} rows={5} />
      </div>
      <div style={{ width: 230, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(['Sent To', 'Copied To'] as const).map((who) => (
          <div key={who} style={{ flex: '1 1 0', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              gutter={false}
              rows={who === 'Sent To' && row?.to ? [{ to: row.to, ack: '', comp: '' }] : []}
              columns={[
                { key: 'to', header: who, width: 136 },
                { key: 'ack', header: 'Ack', width: 34, align: 'center' },
                { key: 'comp', header: 'Comp', width: 40, align: 'center' },
              ]}
              empty=" "
            />
          </div>
        ))}
      </div>
    </div>
  )
}
