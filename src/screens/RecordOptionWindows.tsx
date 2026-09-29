import { useState, type CSSProperties, type ReactNode } from 'react'
import { usePatient } from '../data/patient-context'
import { stageStamp } from '../data/clock'
import { MOIS_TODAY, type Patient } from '../data/patients'
import { CURRENT_USER } from '../data/tasks'
import { argStr } from '../data/text'
import { userListSpecs } from '../data/userManagement'
import { useWorkspaceStore } from '../data/workspaceStore'
import { useSessionState } from '../host/screen-windows'
import { useScreenReport, type ScreenReport } from '../host/screen-state'
import { PBBand, PBCheckbox, PBDataWindow, PBTextArea, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogFooter } from './formKit'
import { useTickSet } from './listKit'
import { PatientFieldRow } from './patientKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The three windows behind the provenance items of a chart record's
   right-click Option List (screens/RecordOptionList.tsx):

     Workflow Summary    → Workflow Summary     1802768 `13dd06a5…png`,
                                                 `9a1ef52e…png`
     Audit Report        → MOIS Audit Report    304682, 303809 (text only)
     Access Control      → Access Control /     304682, 303809 (text only)
                           Record Masking

   Each is opened by name (`useOpenWindow`) with the record it was raised on:
   `{ recordKey, category, date, description, value? }` — recordKey is
   `recordKeyOf(chart, node, record)` from reportRecordEdits.tsx, the same
   identity the SIGNED / UNSIGNED link keeps its Record History under.
   ========================================================================= */

/** The key the Option List's Mark for Review files a record under in the
    workspace store, beside the basket's own `folder:patient` keys. */
export const reviewKeyOf = (recordKey: string) => `record:${recordKey}`

/* --- Workflow Summary -------------------------------------------------------
   PROVENANCE: 1802768 `13dd06a5…png` / `9a1ef52e…png` (a v2.2x build). A
   dark-blue patient band (FIRST / MIDDLE / LAST / DoB / Gender over PHN /
   Home / Work / Cell), a lighter band naming the record (`MEASUREMENT
   [2012.10.31] HEMOGLOBIN A1C Value: 8.4 SI Units Flag: H`), Expand All /
   Collapse All links, a Date / Description / Status list banded MESSAGES [n],
   TASKS [n], ACKNOWLEDGEMENTS [n] under ⊟ boxes, a Detail band over a
   read-only pane headed "Acknowledgement History:", and one Close.

   The right-click item in the v02.20 captures is "Acknowledge History"
   (302837 `2702f065…png`); 304682 says it "indicates if a record was
   reviewed, by whom, and when". The v02.21+ menus replace the item with
   Workflow Summary (303741 `fee0d51c…png`), and the current build's Imaging,
   Consults, Rx and Long Term Medication menus end on Workflow Summary with
   no Acknowledge History at all (user capture 2026-09-25 #34, #35, #36, #45
   (v02.31.23)) — its Acknowledgements section and "Acknowledgement
   History:" detail are what the old item showed. The item, and the folder
   rail's View Detail... link, open this window.

   Content: the chart export carries no workflow tables (no messages, tasks or
   acknowledgements hang off any record), which is why the folders' own
   Workflow Summary rail reads 0 / 0 / 0. The one acknowledgement this stage
   can make is a Review: Mark for Review on the record's Option List files
   one for the desktop user, and 303741 says "an Acknowledgment History is
   created for the entry you've marked for review" — it is listed as
   `9a1ef52e…png` lists its own (NOT CHECKED, "MARKED FOR REVIEW", CREATED
   By / For). With no messages or tasks behind a chart record, this one
   lists MESSAGES [0] and TASKS [0] (`showEmpty`); the basket's leaves out
   an empty one. No capture shows an empty section either way.
   ------------------------------------------------------------------------ */
const BAND_DARK: CSSProperties = { background: 'linear-gradient(var(--pb-banner-top-a, #2f6fb4), var(--pb-banner-top-b, #1c4f8c))', color: '#fff', padding: '4px 10px', flex: 'none' }
const BAND_LIGHT: CSSProperties = { background: 'var(--pb-banner-bottom, #3d86c6)', color: '#fff', padding: '3px 10px', fontWeight: 700, flex: 'none' }
const SECTION: CSSProperties = { background: 'linear-gradient(#fff, #d8e6f8)', padding: '2px 8px', fontWeight: 700 }

export type WorkflowSection = 'messages' | 'tasks' | 'acks'
/** One row of the Workflow Summary list, with what the Detail pane shows for it. */
export type WorkflowLine = {
  id: string; section: WorkflowSection; date: string; description: string; status: string; detail: string
  /** the row's anchor, where it is not `host.mois.row.workflow-<section>-<description>` */
  anchor?: string
}

/** The Workflow Summary window, whoever raised it: a chart record's Option
    List and the rail's View Detail... (below), or a Workspace Basket record
    (WorkspaceBasketWindows.tsx) — "This Workflow Summary window is
    consistent with the same folders in the Patient Chart" (1802768). The
    size, the field spacing of the patient band (220 / 200 / 220), the grey /
    white row banding and the ten-line Detail pane are 1802768 `13dd06a5…`
    and `9a1ef52e…`, whose window is about 1050 × 910 with its frame. */
export function WorkflowSummary({ id, zIndex, patient: p, record, lines, showEmpty = false, report, onClose }: {
  /** the window's anchor slug */
  id: string
  zIndex?: number
  patient: Patient
  /** the light band naming the record */
  record: ReactNode
  lines: WorkflowLine[]
  /** list MESSAGES and TASKS with no rows under them (ACKNOWLEDGEMENTS always shows) */
  showEmpty?: boolean
  /** what the window reports, from its lines and the row picked */
  report: (lines: WorkflowLine[], current: WorkflowLine | undefined) => ScreenReport
  onClose: () => void
}) {
  const [open, setOpen] = useState({ messages: true, tasks: true, acks: true })
  const [picked, setPicked] = useState<string>(() => lines.find((l) => l.section === 'acks' && l.description === CURRENT_USER.name)?.id ?? lines[0]?.id ?? '')
  const current = lines.find((l) => l.id === picked)
  useScreenReport(report(lines, current))
  const count = (s: WorkflowSection) => lines.filter((l) => l.section === s).length
  const section = (id: WorkflowSection, title: string) => (
    <>
      <div style={SECTION} className="pb-row" data-tutorial-id={`host.mois.group.workflow-${id}`}>
        <button
          type="button" aria-expanded={open[id]} onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}
          style={{ width: 11, height: 11, padding: 0, border: '1px solid #808080', background: '#fff', font: 'inherit', fontSize: 9, lineHeight: '9px', cursor: 'pointer' }}
        >
          {open[id] ? '−' : '+'}
        </button>
        <span>{title}&nbsp;&nbsp;&nbsp;[{count(id)}]</span>
      </div>
      {open[id] && lines.filter((l) => l.section === id).map((l, i) => (
        <div
          key={l.id}
          className="pb-row"
          data-tutorial-id={l.anchor ?? `host.mois.row.workflow-${id}-${pbSlug(l.description).slice(0, 20)}`}
          onMouseDown={() => setPicked(l.id)}
          style={{ gap: 0, padding: '3px 8px', background: picked === l.id ? '#f3c3b8' : i % 2 ? '#fff' : '#ececec' }}
        >
          <span style={{ width: 90 }}>{l.date}</span><span style={{ width: 430 }}>{l.description}</span><span>{l.status}</span>
        </div>
      ))}
    </>
  )
  return (
    <WorkspaceDialogFrame id={id} title="Workflow Summary" width={1000} height={700} onClose={onClose} zIndex={zIndex}>
      <div style={BAND_DARK}>
        <PatientFieldRow
          layout="inline"
          fields={[
            { label: 'FIRST:', value: p.first.toUpperCase(), w: 220 },
            { label: 'MIDDLE:', value: p.middle.toUpperCase(), w: 200 },
            { label: 'LAST:', value: p.last.toUpperCase(), w: 220 },
            { label: 'DoB:', value: p.dob, w: 130 },
            { label: 'Gender:', value: p.gender },
          ]}
        />
        <PatientFieldRow
          layout="inline"
          style={{ gap: 0, paddingTop: 2 }}
          fields={[
            { label: 'PHN:', value: <>{p.insuranceBy ?? 'BC'}&nbsp;&nbsp;{p.bchn ?? p.insurance ?? ''}</>, w: 220 },
            { label: <u>Home:</u>, value: p.home ?? '', w: 200 },
            { label: 'Work:', value: p.work ?? '', w: 220 },
            { label: 'Cell:', value: p.cell ?? '' },
          ]}
        />
      </div>
      <div style={BAND_LIGHT} data-tutorial-id="host.mois.field.workflow-record">{record}</div>
      <div className="pb-row" style={{ gap: 28, padding: '3px 10px', flex: 'none' }}>
        <button type="button" className="pb-link" onClick={() => setOpen({ messages: true, tasks: true, acks: true })}>Expand All</button>
        <button type="button" className="pb-link" onClick={() => setOpen({ messages: false, tasks: false, acks: false })}>Collapse All</button>
      </div>
      <div data-tutorial-id="host.mois.group.workflow-summary" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', margin: '0 6px', background: '#fff', border: '1px solid var(--pb-border)' }}>
        <div className="pb-row" style={{ gap: 0, padding: '3px 8px', fontWeight: 700, borderBottom: '1px solid var(--pb-border)' }}>
          <span style={{ width: 90 }}>Date</span><span style={{ width: 430 }}>Description</span><span>Status</span>
        </div>
        {(showEmpty || count('messages') > 0) && section('messages', 'MESSAGES')}
        {(showEmpty || count('tasks') > 0) && section('tasks', 'TASKS')}
        {section('acks', 'ACKNOWLEDGEMENTS')}
      </div>
      <div style={{ margin: '4px 6px 0', flex: 'none' }}>
        <PBBand>Detail</PBBand>
        <PBTextArea rows={10} w="100%" readOnly value={current?.detail ?? ''} data-tutorial-id="host.mois.field.acknowledgement-history" />
      </div>
      <DialogFooter padding="8px 0">
        <DialogButton id="workflow-summary-close" onClick={onClose} isDefault>Close</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/** A chart record's Workflow Summary: the review Mark for Review filed, if any. */
function WorkflowSummaryWindow({ args, close }: AreaWindowProps) {
  const p = usePatient()
  const ws = useWorkspaceStore()
  const review = ws.reviews.includes(reviewKeyOf(argStr(args.recordKey)))
  const [stamp] = useState(() => stageStamp())
  const lines: WorkflowLine[] = review ? [{
    id: 'review', section: 'acks', date: MOIS_TODAY, description: CURRENT_USER.name, status: 'NOT CHECKED',
    detail: `MARKED FOR REVIEW\n\nAcknowledgement History:\n\n${stamp}  CREATED    By: ${CURRENT_USER.name}    For: ${CURRENT_USER.name}`,
    anchor: 'host.mois.row.workflow-review',
  }] : []
  return (
    <WorkflowSummary
      id="workflow-summary"
      patient={p}
      record={<>{argStr(args.category)}&nbsp;&nbsp;&nbsp;[{argStr(args.date)}]&nbsp;&nbsp;&nbsp;{argStr(args.description)}{argStr(args.value) ? `   ${argStr(args.value)}` : ''}</>}
      lines={lines}
      showEmpty
      report={() => ({ acknowledgements: review ? 1 : 0 })}
      onClose={close}
    />
  )
}

/* --- MOIS Audit Report ------------------------------------------------------
   PROVENANCE (text only; no capture of the window survives in the manual —
   304682's option-list image is missing):
     304682  "Audit Report (Ctrl+Shift+A) — Show audits that were set up
             previously that include the users' names, and the date and time
             used."
     303741  "Opens the MOIS Audit Report that logs changes made to this
             record if available."
     303163  Field Audit Setup: an audit is set up per Table Name + Field
             Name, with a Description.
   So the window lists, for this record, each audited field's change with who
   made it and when, and is empty when no field audit was set up. It is drawn
   in the kit's plain list-window idiom: the record on a band, a Date / Time /
   User Name / Field Name / Description list, Close. The chart export carries
   no audit rows, so on this stage the list is empty — "if available".
   ------------------------------------------------------------------------ */
function AuditReportWindow({ args, close }: AreaWindowProps) {
  return (
    <WorkspaceDialogFrame id="audit-report" title="MOIS Audit Report" width={720} height={420} onClose={close}>
      <div style={{ margin: '6px 6px 0', flex: 'none' }}>
        <PBBand>Record</PBBand>
        <div className="pb-row" style={{ background: '#fff', padding: '3px 8px', gap: 18 }}>
          <b>{argStr(args.category)}</b><span>{argStr(args.date)}</span><span>{argStr(args.description)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, margin: '0 6px' }}>
        <PBBand>Field Audits</PBBand>
        <PBDataWindow
          flush style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={[] as Record<string, string>[]}
          columns={[
            { key: 'date', header: 'Date', width: 82, align: 'center' },
            { key: 'time', header: 'Time', width: 52, align: 'center' },
            { key: 'user', header: 'User Name', width: 160 },
            { key: 'field', header: 'Field Name', width: 150 },
            { key: 'desc', header: 'Description' },
          ]}
          empty="No field audits are recorded for this record."
        />
      </div>
      <DialogFooter padding="8px 0">
        <DialogButton id="audit-report-close" onClick={close} isDefault>Close</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* --- Access Control / Record Masking ------------------------------------------
   PROVENANCE (text only; no capture of the window):
     304682  "Access Control — Provide a list of current users to which masks
             may be applied. The mask removes them from access on that
             specific record."
     303809  "Opens the Access Control/Record Masking window, which will allow
             you to select all users who are NOT able to view this record."
     303741  "Allows the user to mask this record from other users' view."
   The current users are the User Accounts training list (data/
   userManagement.ts, 28bcccbceb53) less the inactive ones; each carries a
   Mask tick. Ok keeps the masks on the record for the session, Cancel drops
   the edit. The count of masked users is reported (`host.screen.masked`).
   ------------------------------------------------------------------------ */
const CURRENT_USERS = (userListSpecs.find((s) => s.node === 'ad-users')?.rows ?? [])
  .filter((u) => u.status !== 'I')
  .map((u) => ({ display: String(u.display ?? ''), user: String(u.user ?? ''), role: String(u.role ?? '') }))

function AccessControlWindow({ args, close }: AreaWindowProps) {
  const [saved, save] = useSessionState<string[]>(`record-masks:${argStr(args.recordKey)}`, [])
  const masked = useTickSet<string>(() => saved)
  const [cur, setCur] = useState(0)
  useScreenReport({ masked: masked.size })
  return (
    <WorkspaceDialogFrame id="access-control" title="Access Control / Record Masking" width={620} height={470} onClose={close}>
      <div style={{ margin: '6px 6px 0', flex: 'none' }}>
        <PBBand>Record</PBBand>
        <div className="pb-row" style={{ background: '#fff', padding: '3px 8px', gap: 18 }}>
          <b>{argStr(args.category)}</b><span>{argStr(args.date)}</span><span>{argStr(args.description)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, margin: '0 6px' }}>
        <PBBand>Select the users who are NOT able to view this record</PBBand>
        <PBDataWindow
          flush style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={CURRENT_USERS}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(u) => `host.mois.row.mask-${u.user}`}
          columns={[
            {
              key: 'mask', header: 'Mask', width: 44, align: 'center',
              render: (u) => (
                <PBCheckbox
                  checked={masked.has(u.user)}
                  tutorialId={`host.mois.cell.mask-${u.user}`}
                  onChange={(on) => masked.set(u.user, on)}
                />
              ),
            },
            { key: 'display', header: 'Display Name' },
            { key: 'user', header: 'User Name', width: 130 },
            { key: 'role', header: 'Role', width: 110 },
          ]}
        />
      </div>
      <DialogFooter gap={12} padding="8px 0">
        <DialogButton id="access-control-ok" isDefault onClick={() => { save([...masked.ticked]); close() }}>Ok</DialogButton>
        <DialogButton id="access-control-cancel" onClick={close}>Cancel</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

export const RECORD_OPTION_WINDOWS = {
  workflowSummary: 'workflow-summary',
  auditReport: 'audit-report',
  accessControl: 'access-control',
} as const

registerAreaWindow(RECORD_OPTION_WINDOWS.workflowSummary, WorkflowSummaryWindow)
registerAreaWindow(RECORD_OPTION_WINDOWS.auditReport, AuditReportWindow)
registerAreaWindow(RECORD_OPTION_WINDOWS.accessControl, AccessControlWindow)
