import { useState, type ReactNode } from 'react'
import { useChartRows } from '../data/chart-records'
import { notificationTabs } from '../data/mois'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { SESSION_USER } from '../data/session'
import { useWorkspaceStore } from '../data/workspaceStore'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow,
  PBInput, PBRadio, PBSelect, PBTabs, PBTextArea,
  PBViewHeader, type PBColumn,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { FormLabel } from './formKit'
import { useTickSet } from './listKit'
import { ChartIdentityStrip } from './patientKit'

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

/* ----------------------------------------------------------------------------
   The list half of each tab, measured off the 1:1 DEV captures
   (notification-reminders-empty.png, notification-recalls.png,
   notification-tasks.png, notification-messages.png,
   notification-responses.png; MOIS window 705px tall, the stage's ~40px
   taller, so the panes keep DEV's heights and the extra goes to the detail).

   Each list is a framed box inset 6px into the tab page: its caption band,
   then a filter row on the same grey ruled off above and below, then the
   grid. The frame runs y 201–593 on Reminders and Recalls, 201–460 on Tasks,
   201–451 on Messages, 201–557 for Responses' first grid. Column widths are
   the painted pitches (a cell and its 2px rule), x from the frame:
     Reminders  gutter · Reminder 516 · Start Date 105 · Stop 68 · M 16
     Recalls    gutter · Code 94 · Note 422 · Due 105 · Stop 68 · M 16
     Tasks      gutter · (blank) 18 · Due 85 · Task 358 · Ack. 54 ·
                Complete 55 · Created 69 · Created By 108 · M 16
     Messages   gutter · (blank) 18 · Sent 77 · Subject 513 · Sent By 140 · M 16
     Responses  no gutter · Called 118 · Contact 139 · Description 201 ·
                Status 192 · Response · / Last Called 118 · Contact 139 ·
                Contact Data 201 · Status 230 · Total Calls
   Reminders and Recalls draw no column before the first caption but the
   row gutter, and Tasks and Messages one 16px one: the extra `flag` /
   `att` pair the kit config carries is not in any capture. The run stops
   short of the frame and the white runs on (M ends at 1208 / 1268).
   The filter boxes sit over the columns they filter: Reminder; Code and
   Note; Task, with a box under Ack. and Complete; Subject and Sent By.
   With no rows a list is a bare header over white, and the pane under it
   is blank — the detail is a freeform DataWindow with nothing to show.    */
const LIST_FRAME_H: Record<string, number> = {
  Reminders: 392, Recalls: 392, Tasks: 259, Messages: 250, 'Responses - READ ONLY': 356,
}
const COLUMN_WIDTHS: Record<string, Record<string, number | undefined>> = {
  Reminders: { reminder: 516, start: 105, stop: 68, m: 16 },
  Recalls: { code: 94, note: 422, due: 105, stop: 68, m: 16 },
  Tasks: { flag: 18, due: 85, task: 358, ack: 54, complete: 55, created: 69, by: 108, m: 16 },
  Messages: { flag: 18, sent: 77, subject: 513, by: 140, m: 16 },
  'Responses - READ ONLY': { called: 118, contact: 139, desc: 201, status: 192, response: undefined },
}
const LOWER_WIDTHS: Record<string, number | undefined> = { last: 118, contact: 139, data: 201, status: 230, total: undefined }
/** the run's last cell is followed by white to the frame, not stretched —
    header included (the kit's blank caption cell) */
const TAIL = { key: '_tail', header: '', headClassName: 'pb-dw__th--blank' }

/** The tab strip: five 157px tabs from the left, not stretched to the frame
 *  (DEV captures: 480 / 638 / 794 / 951 / 1108 / 1265, white past the last). */
const NOTIF_CSS = [
  '.pb-notif > .pb-tabs > .pb-tabs__strip--justified > .pb-tabs__tab { flex: 0 0 157px; }',
  '.pb-notif-list { display: flex; flex-direction: column; flex: none; margin: 6px 6px 0; border: 1px solid #6d6d6d; background: var(--pb-window); min-height: 0; min-width: 0; overflow: hidden; }',
  /* an editing cell's 100% input must not widen the window past its frame */
  '.pb-notif > .pb-tabs, .pb-notif > .pb-tabs > .pb-tabs__page { min-width: 0; }',
  '.pb-notif-list > .pb-band { min-height: 21px; }',
  '.pb-notif-filter { display: flex; align-items: center; flex: none; height: 23px; background: var(--pb-band); border-top: 1px solid #656565; border-bottom: 1px solid #656565; }',
].join('\n')

/** a filter box at its painted x (from the frame's inner edge) */
const at = (x: number, w: number, prev: number) => ({ marginLeft: x - prev, width: w, flex: 'none' as const })

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
      }
  }
  const save = () => {
    setAdded((a) => ({ ...a, [tab]: (a[tab] ?? []).map((r) => ({ ...r, saved: 'saved' })) }))
  }
  const undo = () => {
    setAdded((a) => ({ ...a, [tab]: (a[tab] ?? []).filter((r) => r.saved) }))
  }

  const widths = COLUMN_WIDTHS[tab] ?? {}
  const columns = (cfg.columns as PBColumn<NoteRow>[])
    .filter((c) => c.key in widths)
    .map((c): PBColumn<NoteRow> => ({ ...c, width: widths[c.key] }))
    .map((c): PBColumn<NoteRow> => {
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
  /* the last measured column keeps its width; white runs on to the frame */
  const tail = columns.length > 0 && columns[columns.length - 1]!.width !== undefined
  if (tail) columns.push(TAIL as PBColumn<NoteRow>)

  const onlyTwo = tab === 'Reminders' || tab === 'Recalls'
  const split = !!cfg.split
  const frameH = LIST_FRAME_H[tab] ?? 300
  return (
    <>
      <style href="mois-classic/notification" precedence="medium">{NOTIF_CSS}</style>
      <PBViewHeader title="Notification" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          /* black on Responses - READ ONLY too (notification-responses.png):
             MOIS leaves the Task Bar alone and the read-only grids ignore it */
          { label: 'New Record', onClick: newRecord },
          { label: 'Delete Record' },
          /* Save and Undo are drawn enabled at rest — all five DEV captures
             of this window show the five buttons in full black. They only
             do something while a row is being added. */
          { label: 'Save', onClick: save },
          { label: 'Undo', onClick: undo },
          { label: 'Refresh' },
        ]}
      />

      <ChartIdentityStrip noEncounter />

      <div className="pb-notif" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBTabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setCur(0) }} justified>
          <div className="pb-notif-list" style={{ height: frameH }}>
            <PBBand>{cfg.list}</PBBand>

            {/* each list has its own filter row above the grid */}
            {cfg.filters !== 'none' && (
              <div className="pb-notif-filter">
                {tab === 'Messages' && (<><PBInput style={at(113, 511, 0)} /><PBInput style={at(626, 138, 624)} /></>)}
                {cfg.filters === 'recall' && (<><PBInput style={at(16, 93, 0)} /><PBInput style={at(110, 421, 109)} /></>)}
                {cfg.filters === 'task' && (
                  <>
                    <PBInput style={at(121, 357, 0)} />
                    <span style={{ marginLeft: 499 - 478, flex: 'none', display: 'flex' }}><PBCheckbox /></span>
                    <span style={{ marginLeft: 553 - 512, flex: 'none', display: 'flex' }}><PBCheckbox /></span>
                  </>
                )}
                {cfg.filters === 'one' && <PBInput style={at(16, 515, 0)} />}
              </div>
            )}

            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                gutter={!split}
                style={{ ['--pb-dw-gutter-width' as string]: '17px' }}
                rows={rows}
                current={cur}
                onCurrentChange={setCur}
                columns={columns}
                rowTutorialId={(_, i) => (i === 0 ? `host.mois.row.${tab === 'Recalls' ? 'recall' : tab === 'Reminders' ? 'reminder' : 'notification'}-first` : undefined)}
                empty={false}
              />
            </div>
          </div>

          {/* Responses stacks a second read-only grid instead of a detail pane */}
          {split && cfg.lower && (
            <div className="pb-notif-list" style={{ flex: '1 1 auto', marginTop: 2, marginBottom: 4 }}>
              <PBBand>{cfg.lower.list}</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  gutter={false}
                  rows={[]}
                  columns={(cfg.lower.columns as PBColumn<Record<string, string>>[]).map((c) => ({ ...c, width: LOWER_WIDTHS[c.key] }))}
                  empty={false}
                />
              </div>
            </div>
          )}

          {/* the detail under a list is drawn only for a row the list has */}
          {onlyTwo && (row
            ? <ReminderBand key={tab} recall={tab === 'Recalls'} row={row} onDetail={(v) => setRow({ detail: v })} />
            : <div style={{ flex: '1 1 auto', borderTop: '1px solid #9a9a9a', marginTop: 1 }} />)}
          {tab === 'Tasks' && (
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '5px 6px 4px' }}>
              <PBTabs tabs={['Detail', 'Follow Up Notes (0)']} active={lower === 'Detail' ? 'Detail' : 'Follow Up Notes (0)'} onChange={setLower} compact face>
                {lower === 'Detail' ? (row ? <TaskDetail row={row} /> : null) : null}
              </PBTabs>
            </div>
          )}
          {tab === 'Messages' && <MessageDetail row={row} />}
        </PBTabs>
      </div>
    </>
  )
}

const label = (text: ReactNode, w?: number) => <FormLabel w={w} flex={!!w}>{text}</FormLabel>

/* the Reminders / Recalls detail band */
function ReminderBand({ recall, row, onDetail }: { recall: boolean; row?: NoteRow; onDetail: (v: string) => void }) {
  const triggers = useTickSet<string>(() => (recall ? ['Patient Arrival'] : TRIGGERS))
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
              <PBCheckbox label={t} checked={triggers.has(t)} onChange={(c) => triggers.set(t, c)} />
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

/* The Messages tab's lower half: a Detail / Attachments tab set on the left
   and the Sent To / Copied To grids at the right (notification-messages.png,
   DEV 1:1: tabs from 487, page to 1072; the grids 1077–1285, Sent To 120 ·
   Ack 40 · Comp the rest, Copied To from y 600). Detail is drawn only for a
   message the list has; Attachments was captured on an empty list only, so
   its page stays blank. */
function MessageDetail({ row }: { row?: NoteRow }) {
  const pri = row?.flag || 'M'
  const [page, setPage] = useState('Detail')
  return (
    <div data-tutorial-id="host.mois.group.message-detail" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 5, padding: '1px 6px 4px' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex' }}>
        <PBTabs tabs={['Detail', 'Attachments']} active={page} onChange={setPage} compact face>
          {page === 'Detail' && row && (
            <div style={{ flex: '1 1 auto', display: 'grid', gridTemplateColumns: '74px 1fr', rowGap: 5, alignContent: 'start', padding: '5px 6px' }}>
              {label('Priority:')}
              <span className="pb-row" style={{ gap: 18 }}>
                {[['L', 'Low'], ['M', 'Medium'], ['H', 'High'], ['V', 'V. High']].map(([c, l]) => <PBRadio key={c} name="message-priority" label={l} checked={pri === c} />)}
              </span>
              {label('Linked to:')}<span />
              {label('Subject:')}<PBInput w="100%" value={row.subject ?? ''} readOnly />
              {label('Detail:')}<PBTextArea key={row.subject ?? 'none'} defaultValue={row.detail ?? ''} rows={5} />
            </div>
          )}
        </PBTabs>
      </div>
      <div style={{ width: 208, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(['Sent To', 'Copied To'] as const).map((who) => (
          <div key={who} style={{ flex: '1 1 0', minHeight: 0, display: 'flex', border: '1px solid #6d6d6d', background: 'var(--pb-window)' }}>
            <PBDataWindow
              flush
              gutter={false}
              rows={who === 'Sent To' && row?.to ? [{ to: row.to, ack: '', comp: '' }] : []}
              columns={[
                { key: 'to', header: who, width: 120 },
                { key: 'ack', header: 'Ack', width: 40, align: 'center' },
                { key: 'comp', header: 'Comp', align: 'center' },
              ]}
              empty={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
