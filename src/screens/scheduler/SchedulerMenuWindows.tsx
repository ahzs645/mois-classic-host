import { useMemo, useState, type ReactNode } from 'react'
import {
  PBBand, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBTextArea, PBWindow, pbSlug,
  usePBInstrumentation,
} from '../../pb'
import { daybookProviders } from '../../data/mois'
import {
  currentRow, dayRows, offsetOfStamp, schedulerBridge, schedulerStore, stampOf, useSchedulerStore, type DayRow,
} from '../../data/schedulerStore'
import { CHART_SUMMARIES, schedulerExtras, useSchedulerExtras } from '../../data/schedulerExtras'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { useScreenReport } from '../../host/screen-state'
import { MasterProviderListDialog } from '../MasterProviderListDialog'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import { RaisedMessageBox } from '../RaisedMessageBox'

/* ============================================================================
   The Scheduler's menu and day-book-form windows that are not a booking.

   PROVENANCE: art. 303239 "Scheduler Contents" (Action `21e7e068…`,
   Print `f1ed2d5f…` / `3c48e3af…`, right-click `4df7bdc1…`) and art.
   303795 "Provider Schedules" (the day-book form `69c09716…`, the Patient
   Detail Slide `9c616765…` / `0772b03d…` / `62604fcd…`, Select Summary
   `377de417…`); art. 3268648 "Tasks and Messages" (the TK / MG cells
   `e528187d…`, the row menu `2495314b…`); art. 303385 (Call List `68d46b7e…`).

   · summary-all-visit      Action ▸ Summary All Visit (Alt+F1): "a list of
                            all the patient's encounters starting with the
                            selected patient and continuing in alphabetical
                            order. If a record on a different date is
                            selected, the Day Book for that date opens."
                            INFERRED layout (no capture): a list window.
   · scheduler-print-encounter  Print Encounter (the day book's button and
                            Print ▸ Print Encounter): Offset Note from Top /
                            Cumulative Note over a date range. Drawn as the
                            chart's Print Encounter Note window (user capture
                            2026-09-25 #21, v02.31.23), which has no "spaces
                            from the top" box — the user's build wins over
                            303239's older description.
   · paste-encounter-data   Action ▸ Paste Encounter Data (Ctrl+Shift+P):
                            "Will replace the selected encounter with the
                            copied one." INFERRED confirmation wording.
   · daybook-select-summary The Patient Detail Slide's Change View: Select
                            Summary (`377de417…`): Chart Summaries list, Ok /
                            Cancel.
   · daybook-call-list      Open Call List: the Call List window
                            (`68d46b7e…`) for the day book's date.
   · daybook-comment        the Comment box's "see more". INFERRED: a plain
                            text window.
   · appointment-tasks / appointment-messages   a double-click on a row's TK
                            / MG cell: "view or create a new task for this
                            patient". INFERRED layout: the patient's tasks
                            (messages) in the Task Inbox's columns, with New.
   · provider-address-clipboard   Utilities ▸ Provider Address to Clipboard:
                            the Master Provider List, then the copied notice.
   · switch-service-group   Utilities ▸ Switch Service Group / Pathway.
                            INFERRED chooser.
   ========================================================================= */

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/* --- Summary All Visit -------------------------------------------------------- */
type VisitLine = DayRow & { date: string; provider: string; offset: number; patient: string }

function SummaryAllVisit({ close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const here = s.current ?? { provider: 'TECHNICAL SUPPORT', offset: 0, key: '' }
  const selected = currentRow(s)
  const lines = useMemo(() => {
    const out: VisitLine[] = []
    for (let off = here.offset - 14; off <= here.offset + 14; off += 1) {
      for (const p of daybookProviders) {
        for (const r of dayRows(s, p.provider, off)) {
          if (!r.last && !r.first) continue
          out.push({ ...r, date: stampOf(off), provider: p.provider, offset: off, patient: `${r.last}, ${r.first}` })
        }
      }
    }
    out.sort((a, b) => a.patient.localeCompare(b.patient) || b.offset - a.offset)
    /* starting with the selected patient, then on round the alphabet */
    const start = selected ? out.findIndex((l) => l.patient >= `${selected.last}, ${selected.first}`) : 0
    return start > 0 ? [...out.slice(start), ...out.slice(0, start)] : out
  }, [s, here.offset, selected])
  const [cur, setCur] = useState(0)
  useScreenReport({ rows: lines.length })
  const open = (l: VisitLine | undefined) => {
    if (!l) return
    schedulerExtras.done('summary-all-visit-opened')
    schedulerBridge().showDay?.(l.provider, l.offset)
    close()
  }
  return (
    <WorkspaceDialogFrame id="summary-all-visit" title="Summary All Visit" width={900} height={560} onClose={close} controls={false} zIndex={85}>
      <div style={{ margin: 6, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #646464' }}>
        <PBBand>Summary All Visit</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            flush
            rows={lines}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(l) => open(l)}
            rowTutorialId={(l) => `host.mois.row.visit-${l.chart || pbSlug(l.last)}-${l.date.replace(/\./g, '')}-${l.hr}${l.mn}`}
            groupBy={(l) => l.patient}
            groupLabel={(g) => <b>{g}</b>}
            columns={[
              { key: 'date', header: 'Date', width: 80, align: 'center' },
              { key: 'hr', header: 'HR', width: 28, align: 'center' },
              { key: 'mn', header: 'MN', width: 28, align: 'center' },
              { key: 'code', header: 'Code', width: 44, align: 'center' },
              { key: 'chart', header: 'Chart', width: 60, align: 'center' },
              { key: 'provider', header: 'Provider', width: 170 },
              { key: 'reason', header: 'Visit Reason', width: 220 },
              { key: 'as', header: 'AS', width: 30, align: 'center' },
              { key: 'ds', header: 'DS', width: 30, align: 'center' },
              { key: 'bs', header: 'BS', width: 30, align: 'center' },
            ]}
          />
        </div>
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '4px 0 10px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="summary-all-visit-select" width={75} onClick={() => open(lines[cur])} isDefault>Select</DialogButton>
        <DialogButton id="summary-all-visit-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Print Encounter (the Scheduler's) ------------------------------------------ */
const Caption = ({ children }: { children: ReactNode }) => (
  <div style={{ color: '#000080', fontWeight: 700, padding: '5px 10px 3px', borderBottom: '1px solid #a0a0a0', boxShadow: '0 1px 0 #fff' }}>{children}</div>
)

function SchedulerPrintEncounter({ close, open }: AreaWindowProps) {
  const s = useSchedulerStore()
  const row = currentRow(s)
  const here = s.current
  const stamp = here ? stampOf(here.offset) : ''
  const [option, setOption] = useState<'offset' | 'cumulative'>('cumulative')
  const [from, setFrom] = useState(stamp)
  const [to, setTo] = useState(stamp)
  useScreenReport({ printOption: option })
  if (!row || !here) {
    return (
      <RaisedMessageBox title="Print Encounter" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={close}>
        Select an appointment first.
      </RaisedMessageBox>
    )
  }
  const name = `${row.first} ${row.last}`.trim()
  const print = () => {
    let page: string
    if (option === 'offset') {
      page = ['', `%LINE:14,86%${stamp}|${name}`, row.reason, '', here.provider].join('\n')
    } else {
      const lo = offsetOfStamp(from.trim() || stamp)
      const hi = offsetOfStamp(to.trim() || stamp)
      const visits: string[] = []
      for (let off = Math.min(hi, lo + 366); off >= lo; off -= 1) {
        for (const p of daybookProviders) {
          for (const r of dayRows(s, p.provider, off)) {
            if (row.chart ? r.chart !== row.chart : `${r.first} ${r.last}` !== `${row.first} ${row.last}`) continue
            visits.push(
              `%LINE:27,73%${stampOf(off)}|${name}${r.reason ? `  /  ${r.reason}` : ''}`,
              `%MONO%   PROVIDER ${p.provider.padEnd(24)}  AUTHOR:  ${p.provider}`,
              '%RULE%',
            )
          }
        }
      }
      page = [`%BAND%**${name}**|**CHART: ${row.chart}**|**${from} to ${to}**`, ...visits].join('\n')
    }
    schedulerExtras.done(option === 'offset' ? 'encounter-printed-offset' : 'encounter-printed-cumulative')
    close()
    open('print-preview', { title: option === 'offset' ? 'Encounter Note' : 'Cumulative Progress Notes', pages: [page], bare: true })
  }
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 88 }}>
      <PBWindow child controls={false} tutorialId="host.mois.dialog.scheduler-print-encounter" title="Print Encounter Note" onClose={close} style={{ width: 'min(360px, 100%)' }}>
        <div style={{ padding: '14px 12px 0' }} onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); print() } }}>
          <div style={{ border: '1px solid #a0a0a0', boxShadow: 'inset 1px 1px 0 #fff', paddingBottom: 18 }}>
            <Caption>Print Type</Caption>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0 6px 82px' }}>
              <PBRadio name="sched-print-mode" label="Offset Note from Top" checked={option === 'offset'} onChange={() => setOption('offset')} tutorialId="host.mois.field.sched-print-offset" />
              <PBRadio name="sched-print-mode" label="Cumulative Note" checked={option === 'cumulative'} onChange={() => setOption('cumulative')} tutorialId="host.mois.field.sched-print-cumulative" />
            </div>
            <Caption>Appointment Date Range (inclusive)</Caption>
            <div className="pb-row" style={{ gap: 6, padding: '4px 10px 0' }}>
              <span>Date(s):</span>
              <PBInput w={84} align="center" value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.sched-print-from" />
              <span style={{ margin: '0 4px' }}>to</span>
              <PBInput w={84} align="center" value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.sched-print-to" />
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '14px 0 14px', flex: 'none' }}>
          <DialogButton id="sched-print-encounter-print" width={74} onClick={print} isDefault>Print (F2)</DialogButton>
          <DialogButton id="sched-print-encounter-cancel" width={74} onClick={close}>Cancel</DialogButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* --- Paste Encounter Data ------------------------------------------------------- */
function PasteEncounterData({ close }: AreaWindowProps) {
  const extras = useSchedulerExtras()
  const row = currentRow()
  const source = extras.clipboard
  if (!source) {
    return (
      <RaisedMessageBox title="Paste Encounter Data" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={close}>
        <span data-tutorial-id="host.mois.dialog.paste-encounter-data">No encounter data has been copied. Use Copy Encounter Data (Ctrl+Shift+C) first.</span>
      </RaisedMessageBox>
    )
  }
  return (
    <RaisedMessageBox
      title="Paste Encounter Data"
      icon="question"
      buttons={[{ label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.msgbox-yes' }, { label: 'No', value: 'no', tutorialId: 'host.mois.command.msgbox-no' }]}
      onClose={(v) => {
        if (v === 'yes' && row) {
          schedulerStore.pasteEncounter(row.key, source)
          schedulerExtras.pasteEncounter(row.key)
        }
        close()
      }}
    >
      <span data-tutorial-id="host.mois.dialog.paste-encounter-data">
        Replace the selected encounter{row ? ` (${row.hr}:${row.mn} ${row.first} ${row.last})` : ''} with the copied encounter data?
      </span>
    </RaisedMessageBox>
  )
}

/* --- Select Summary (Patient Detail Slide ▸ Change View) ------------------------- */
function SelectSummary({ close }: AreaWindowProps) {
  const extras = useSchedulerExtras()
  const rows = CHART_SUMMARIES.map((summary) => ({ summary }))
  const [cur, setCur] = useState(Math.max(0, CHART_SUMMARIES.indexOf(extras.slide.summary as typeof CHART_SUMMARIES[number])))
  const ok = (i = cur) => {
    const pick = rows[i]
    if (pick) schedulerExtras.setSlide({ summary: pick.summary, mode: extras.slide.mode === 'hidden' ? 'summary' : extras.slide.mode })
    close()
  }
  return (
    <WorkspaceDialogFrame id="daybook-select-summary" title="Select Summary" width={300} height={434} onClose={close} controls={false} zIndex={85}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow
          flush
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_r, i) => ok(i)}
          rowTutorialId={(r) => `host.mois.row.summary-${pbSlug(r.summary)}`}
          columns={[{ key: 'summary', header: 'Chart Summaries' }]}
        />
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="select-summary-ok" width={90} onClick={() => ok()} isDefault>Ok</DialogButton>
        <DialogButton id="select-summary-cancel" width={90} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Call List (Open Call List) -------------------------------------------------- */
const RESPONSES = ['CONFIRMED', 'CONFIRMED', 'OTHER', 'CANCELED', 'CONFIRMED', '']

function DaybookCallList({ close, open }: AreaWindowProps) {
  const s = useSchedulerStore()
  const here = s.current ?? { provider: 'TECHNICAL SUPPORT', offset: 0, key: '' }
  const date = stampOf(here.offset)
  const form = schedulerExtras.daybookForm(here.provider, here.offset)
  const rows = dayRows(s, here.provider, here.offset)
    .filter((r) => r.chart)
    .map((r, i) => ({
      key: r.key, contact: 'PATIENT', chart: r.chart, first: r.first, last: r.last, appt: `${r.hr}:${r.mn}`, loc: r.loc,
      lastCall: form.noCallList ? '' : `${stampOf(here.offset - 1)} 11:1${i % 10}`,
      status: form.noCallList ? '' : 'DELIVERED',
      response: form.noCallList ? '' : RESPONSES[i % RESPONSES.length]!,
    }))
  const [cur, setCur] = useState(0)
  const [acked, setAcked] = useState<Set<string>>(new Set())
  const [excluded, setExcluded] = useState(true)
  useScreenReport({ acknowledged: acked.size })
  const current = rows[cur]
  const field = (w: number | string, value: string) => <PBInput w={w} readOnly value={value} style={{ background: '#e8e8e8' }} />
  return (
    <WorkspaceDialogFrame id="daybook-call-list" title="Call List" width={900} height={520} onClose={close} controls={false} zIndex={85}>
      <div style={{ display: 'grid', gridTemplateColumns: '84px 340px 90px 110px 1fr', rowGap: 3, columnGap: 6, padding: '6px 8px', background: '#fff', flex: 'none', alignItems: 'center' }}>
        <span>Description:</span>{field(330, `${here.provider} FOR DAY BOOK ${date}`)}<span /><span />
        <span style={{ gridRow: 'span 5' }}>Note:<PBTextArea rows={5} w="100%" /></span>
        <span>List Type:</span>{field(120, 'SCHEDULER')}<span>Status:</span>{field(100, form.noCallList ? 'NOT STARTED' : 'STARTED')}
        <span>Provider:</span>{field(120, here.provider)}<span /><span />
        <span>Begin Calling:</span><span className="pb-row" style={{ gap: 6 }}>{field(40, '2')} Days in Advance</span><span>Calling Begins:</span>{field(100, stampOf(here.offset - 2))}
        <span>Message:</span>{field(120, 'APPOINTMENTS')}<span>Day Book Date:</span>{field(100, date)}
      </div>
      <div className="pb-row" style={{ gap: 6, padding: '4px 8px', background: '#f0f0f0', borderTop: '1px solid #c0c0c0', flex: 'none' }}>
        <b>Items</b>
        <span className="pb-row__spacer" />
        <PBCheckbox label="Show Excluded" checked={excluded} onChange={setExcluded} />
        <DialogButton id="call-list-open-chart" width={84} onClick={() => { close(); schedulerBridge().openNode?.('encounters') }}>Open Chart</DialogButton>
        <DialogButton id="call-list-create-task" width={84} onClick={() => { if (current) open('create-task', { chart: current.chart, patient: `${current.last}, ${current.first}` }) }}>Create Task</DialogButton>
        <DialogButton id="call-list-ack-all" width={84} onClick={() => setAcked(new Set(rows.map((r) => r.key)))}>Ack. All</DialogButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 4px 4px' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.call-${r.chart}`}
          columns={[
            { key: 'contact', header: 'Contact', width: 90 },
            { key: 'chart', header: 'Chart', width: 56 },
            { key: 'first', header: 'First Name', width: 100 },
            { key: 'last', header: 'Last Name', width: 100 },
            { key: 'appt', header: 'Appointment', width: 70, align: 'center' },
            { key: 'loc', header: 'Service Location', width: 130 },
            { key: 'lastCall', header: 'Last Call', width: 110 },
            { key: 'status', header: 'Status', width: 80 },
            { key: 'response', header: 'Response', width: 90 },
            {
              key: 'ack', header: 'Acknowledge', width: 76, align: 'center',
              render: (r) => (
                <PBCheckbox checked={acked.has(r.key)} onChange={(on) => setAcked((x) => { const n = new Set(x); on ? n.add(r.key) : n.delete(r.key); return n })} />
              ),
            },
          ]}
          empty={form.noCallList ? 'Do Not Auto-Generate a Call List is ticked for this day book.' : 'No charted appointments on this day book.'}
        />
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Day Book Comment (see more) -------------------------------------------------- */
function DaybookComment({ close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const here = s.current ?? { provider: 'TECHNICAL SUPPORT', offset: 0, key: '' }
  const [text, setText] = useState(() => schedulerExtras.daybookForm(here.provider, here.offset).comment)
  const save = () => { schedulerExtras.setDaybookForm(here.provider, here.offset, { comment: text }); schedulerExtras.done('daybook-comment-saved'); close() }
  return (
    <WorkspaceDialogFrame id="daybook-comment" title={`Day Book Comment - ${here.provider} ${stampOf(here.offset)}`} width={560} height={360} onClose={close} controls={false} zIndex={85}>
      <div style={{ flex: '1 1 auto', display: 'flex', padding: 8 }}>
        <PBTextArea value={text} onChange={(e) => setText(e.target.value)} style={{ flex: '1 1 auto', resize: 'none' }} data-tutorial-id="host.mois.field.daybook-comment-full" />
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="daybook-comment-save" width={80} onClick={save} isDefault>Save (F2)</DialogButton>
        <DialogButton id="daybook-comment-cancel" width={80} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- TK / MG ------------------------------------------------------------------------ */
function AppointmentItems({ args, close, open, kind }: AreaWindowProps & { kind: 'task' | 'message' }) {
  const ws = useWorkspaceStore()
  const row = currentRow()
  const chart = str(args.chart) || row?.chart || ''
  const patient = str(args.patient) || (row ? `${row.last}, ${row.first}` : '')
  const items = (kind === 'task' ? ws.tasks : ws.messages).filter((t) => (chart ? t.chart === chart : t.patient === patient))
  const [cur, setCur] = useState(0)
  const id = kind === 'task' ? 'appointment-tasks' : 'appointment-messages'
  const create = () => { if (!open(kind === 'task' ? 'create-task' : 'create-message', { chart, patient })) close() }
  return (
    <WorkspaceDialogFrame id={id} title={kind === 'task' ? `Tasks - ${patient}` : `Messages - ${patient}`} width={720} height={360} onClose={close} controls={false} zIndex={85}>
      <div className="pb-row" style={{ gap: 4, padding: '4px 6px', flex: 'none' }}>
        <DialogButton id={`${id}-new`} width={70} onClick={create}>New</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id={`${id}-close`} width={70} onClick={close}>Close</DialogButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 6px 6px' }}>
        <PBDataWindow
          rows={items}
          current={cur}
          onCurrentChange={setCur}
          columns={kind === 'task'
            ? [
              { key: 'p', header: 'P', width: 19, align: 'center' },
              { key: 'due', header: 'Due', width: 76 },
              { key: 'task', header: 'Task', width: 280 },
              { key: 'assignee', header: 'Assignee', width: 70 },
              { key: 'created', header: 'Created', width: 76 },
              { key: 'createdBy', header: 'Created By' },
            ]
            : [
              { key: 'p', header: 'P', width: 19, align: 'center' },
              { key: 'sent', header: 'Sent', width: 76 },
              { key: 'subject', header: 'Subject', width: 320 },
              { key: 'sentTo', header: 'Sent To' },
            ]}
          empty={kind === 'task' ? 'No tasks for this patient. Press New to create one.' : 'No messages for this patient. Press New to create one.'}
        />
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Utilities ------------------------------------------------------------------------ */
function ProviderAddressToClipboard({ close }: AreaWindowProps) {
  const [copied, setCopied] = useState<string | null>(null)
  if (copied !== null) {
    return (
      <RaisedMessageBox title="MOIS" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={close}>
        <span data-tutorial-id="host.mois.dialog.address-copied">The address for {copied} has been copied to the clipboard. Paste it into another program with Ctrl+V.</span>
      </RaisedMessageBox>
    )
  }
  return <MasterProviderListDialog onPick={(name) => { schedulerExtras.done('provider-address-copied'); setCopied(name) }} onClose={close} />
}

const SERVICE_GROUPS = ['PRIMARY CARE', 'MENTAL HEALTH', 'MATERNITY PATHWAY', 'CHRONIC DISEASE PATHWAY']

function SwitchServiceGroup({ close }: AreaWindowProps) {
  const [pick, setPick] = useState(SERVICE_GROUPS[0]!)
  const host = usePBInstrumentation()
  return (
    <WorkspaceDialogFrame id="switch-service-group" title="Switch Service Group / Pathway" width={360} height={260} onClose={close} controls={false} zIndex={85}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 14, flex: '1 1 auto' }}>
        {SERVICE_GROUPS.map((g) => (
          <PBRadio key={g} name="service-group" label={g} checked={pick === g} onChange={() => setPick(g)} tutorialId={host?.anchor('field', `service-group-${pbSlug(g)}`)} />
        ))}
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="service-group-ok" width={75} onClick={() => { schedulerExtras.done(`service-group-${pbSlug(pick)}`); close() }} isDefault>Ok</DialogButton>
        <DialogButton id="service-group-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}


registerAreaWindow('summary-all-visit', SummaryAllVisit)
registerAreaWindow('scheduler-print-encounter', SchedulerPrintEncounter)
registerAreaWindow('paste-encounter-data', PasteEncounterData)
registerAreaWindow('daybook-select-summary', SelectSummary)
registerAreaWindow('daybook-call-list', DaybookCallList)
registerAreaWindow('daybook-comment', DaybookComment)
registerAreaWindow('appointment-tasks', (p) => <AppointmentItems {...p} kind="task" />)
registerAreaWindow('appointment-messages', (p) => <AppointmentItems {...p} kind="message" />)
registerAreaWindow('provider-address-clipboard', ProviderAddressToClipboard)
registerAreaWindow('switch-service-group', SwitchServiceGroup)
