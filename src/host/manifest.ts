import type { HostEmulatorManifest, HostFixtureSpec } from './types'

/* ============================================================================
   host/manifest — what this emulator offers a host page, as plain data.

   Kept free of React so a host can read it (for its registry, studio
   pickers and drift guards) without pulling the screens into that bundle.
   ========================================================================= */

export const MOIS_CLASSIC_HOST_ID = 'mois-classic'

/** Where each fixture starts: module, selected tree node, and the view it opens. */
export const MOIS_CLASSIC_FIXTURE_STARTS = {
  'no-chart': { module: 'chart', node: 'summary', view: 'summary' },
  'patient-chart': { module: 'chart', node: 'orders', view: 'order' },
  'patient-summary': { module: 'chart', node: 'summary', view: 'summary' },
  'patient-chart-forms': { module: 'chart', node: 'dynamic', view: 'section' },
  scheduler: { module: 'scheduler', node: 'p-daybook', view: 'scheduler' },
  workspace: { module: 'workspace', node: 'ws-summary', view: 'wssummary' },
} as const

export type MoisClassicFixtureId = keyof typeof MOIS_CLASSIC_FIXTURE_STARTS

/* MOIS opens on an empty Patient Summary: no chart is loaded until one is
   looked up (`reference/patient-summary-empty.png`), so that is where the
   bare stage opens. Every tutorial names its own fixture, and the ones with
   a chart open are the rest of this list. */
export const MOIS_CLASSIC_DEFAULT_FIXTURE: MoisClassicFixtureId = 'no-chart'

/** The fixture that starts with no chart loaded. */
export const MOIS_CLASSIC_NO_CHART_FIXTURE: MoisClassicFixtureId = 'no-chart'

/* The one chart with a real export behind it (src/data/charts): every
   screen reads the same record set, so it is the chart lessons are written
   against. The stage opens it for a tutorial run. */
export const MOIS_CLASSIC_TUTORIAL_CHART = '87288'

function initialState(id: MoisClassicFixtureId) {
  const start = MOIS_CLASSIC_FIXTURE_STARTS[id]
  return {
    module: start.module, node: start.node, view: start.view,
    tab: null, dialog: null, patient: id === MOIS_CLASSIC_NO_CHART_FIXTURE ? '' : MOIS_CLASSIC_TUTORIAL_CHART,
    windows: 0, draft: false,
    daybook: '2026.08.11', provider: 'technical-support', theme: 'hybrid',
    invoice: 'open', appt: '', booked: 0, basket: 0, billed: 0, reminderStopped: false,
  }
}

const fixtures: HostFixtureSpec[] = [
  {
    id: 'no-chart',
    label: 'Patient Chart — no chart loaded',
    description: 'MOIS as it opens: Patient Summary with every field blank. The other Patient Chart windows refuse to open until a chart is looked up.',
    initialState: initialState('no-chart'),
  },
  {
    id: 'patient-summary',
    label: 'Patient Chart — Patient Summary',
    description: 'The chart open on Patient Summary, where the chart is identified and another one is looked up.',
    initialState: initialState('patient-summary'),
    chart: MOIS_CLASSIC_TUTORIAL_CHART,
  },
  {
    id: 'patient-chart',
    label: 'Patient Chart — Orders',
    description: 'The chart open on the Orders view, the way MOIS lands after Go To Chart.',
    initialState: initialState('patient-chart'),
    chart: MOIS_CLASSIC_TUTORIAL_CHART,
  },
  {
    id: 'patient-chart-forms',
    label: 'Patient Chart — Dynamic Forms',
    description: 'The Forms branch expanded with Dynamic Forms selected.',
    initialState: initialState('patient-chart-forms'),
    chart: MOIS_CLASSIC_TUTORIAL_CHART,
  },
  {
    id: 'scheduler',
    label: 'Scheduler — Provider Day Book',
    initialState: initialState('scheduler'),
    chart: MOIS_CLASSIC_TUTORIAL_CHART,
  },
  {
    id: 'workspace',
    label: 'Workspace — Summary',
    description: 'The Workspace open on its summary: what is waiting in the basket, the task list and the message board.',
    initialState: initialState('workspace'),
    chart: MOIS_CLASSIC_TUTORIAL_CHART,
  },
]

export const moisClassicHostManifest: HostEmulatorManifest = {
  contractVersion: 1,
  id: MOIS_CLASSIC_HOST_ID,
  label: 'MOIS classic (PowerBuilder)',
  description:
    'A look-alike of the MOIS PowerBuilder client on Windows 10: the seven modules, the Patient Chart tree, DataWindows and MDI child windows, with synthetic training-environment data.',
  fixtures,
  defaultFixture: MOIS_CLASSIC_DEFAULT_FIXTURE,
  snapshotPaths: [
    'host.module', 'host.node', 'host.view', 'host.tab', 'host.dialog',
    'host.patient', 'host.windows', 'host.draft', 'host.daybook', 'host.provider',
    'host.theme', 'host.invoice', 'host.appt', 'host.booked', 'host.basket', 'host.billed', 'host.reminderStopped',
    /* what a work-area window reports of its own state (host/screen-state.tsx):
       the band a System Settings `+` opened, the row that is current, whether
       its edits are saved, how many rows a list holds */
    'host.screen.band', 'host.screen.row', 'host.screen.saved', 'host.screen.rows', 'host.screen.window',
    /* a chart folder's record (host/screen-windows.tsx users): `draft` while
       New Record / Duplicate holds an unsaved row, and `record` for the last
       thing done to it — saved, voided, deleted, cancelled, renewed */
    'host.screen.draft', 'host.screen.record',
    /* the tick box a window last toggled (`host.mois.tickCell`), and its state */
    'host.screen.cell', 'host.screen.checked',
    /* the Workspace (data/workspaceStore.ts): tasks and messages raised this
       session, messages converted to tasks, basket records reassigned or
       marked for review, and whose workspace the banner shows; a sorted
       list's column and direction (`test-name-asc`) */
    'host.workspace.tasks', 'host.workspace.messages', 'host.workspace.acked',
    'host.workspace.reassigned', 'host.workspace.reviews', 'host.workspace.blend', 'host.screen.sort',
    'host.screen.picked',
    /* the Data Exchange screens (screens/ExchangeView.tsx): a Run's status,
       Teleplan's chosen option and the answer to its Download Successful
       prompt, Lab Results' applied filter, Export Chart(s)' format and count */
    'host.screen.status', 'host.screen.option', 'host.screen.answer', 'host.screen.filter',
    'host.screen.format', 'host.screen.exported',
    /* the Encounter Detail Window (host/encounterArea.tsx): which encounter it
       holds, how many progress notes it has, the state of the one on screen
       (empty / draft / incomplete / complete), reviews reported onto it; the
       Encounters list's saved new encounters, and the Measures folder's links */
    'host.screen.encounter', 'host.screen.notes', 'host.screen.noteStatus', 'host.screen.reviews',
    'host.screen.savedEncounters', 'host.screen.linked', 'host.screen.orderLinked', 'host.screen.attached',
    'host.screen.measureFilter', 'host.screen.saveAndAttach', 'host.screen.measurements', 'host.screen.bmiClass',
    /* the letter in progress (data/letterFlow.ts): its document type, the
       template highlighted, the order prompt on screen, tables inserted; and
       the Care Plan summary's row / snapshot / tag counts */
    'host.screen.letterDoc', 'host.screen.letterTemplate', 'host.screen.letterPrompt', 'host.screen.letterInserts',
    'host.screen.carePlanRows', 'host.screen.carePlanSnapshots', 'host.screen.carePlanTags',
    /* Billing's Unsent MSP window (screens/BillingViews.tsx): the claim's
       record state (loaded / new / picked / saved), its Insured By code,
       whether Insurance # is empty / starts with a zero / entered, and what
       Save decided; and the Change Teleplan Password radio chosen */
    'host.screen.claim', 'host.screen.insuredBy', 'host.screen.insurance', 'host.screen.claimStatus',
    'host.screen.teleplanChoice',
    /* Sent To MSP: the claim a Prompt pick loaded (surname slug, or
       `training`), and how many explanatory codes Sent Claim Detail lists
       (screens/SentClaimDetailWindow.tsx) */
    'host.screen.sentClaim', 'host.screen.explCodes',
    /* the Clinic-wide MOIS Lockout (screens/LockoutWindows.tsx): whether
       System Settings' LOCKOUT band has a lock set (none / set / released),
       and whether Confirm Lock Release is up; the Automated Notification
       Service's Task Reminder / Message List (screens/NotificationService
       Windows.tsx): rows listed and rows ticked Ack. */
    'host.screen.lockout', 'host.screen.lockPrompt', 'host.screen.notified', 'host.screen.acked',
    /* Teleplan Web Access (screens/MspExchangeViews.tsx): how many result
       lines Go! has written */
    'host.screen.ran',
    /* Demographics (screens/DemographicsView.tsx): the chart's status code and
       whether it carries a gender designation; and the prompt a window raises
       over itself — a merge confirmation, Merge Complete, a Find / Add list
       (screens/ChartBasicsWindows.tsx) */
    'host.screen.chartStatus', 'host.screen.designation', 'host.screen.prompt',
  ],
  actions: {
    'host.mois.selectModule': {
      label: 'Switch module',
      description: 'Press a module button under the navigator tree.',
      anchor: 'host.mois.module.{module}',
      outcome: { path: 'host.module', arg: 'module' },
    },
    'host.mois.selectNode': {
      label: 'Open a tree node',
      description: 'Select a node in the navigator tree; the work area shows its screen.',
      anchor: 'host.mois.tree.{node}',
      outcome: { path: 'host.node', arg: 'node' },
    },
    'host.mois.toggleNode': {
      label: 'Expand or collapse a branch',
      learner: true,
      anchor: 'host.mois.tree.{node}',
    },
    'host.mois.command': {
      label: 'Press a command button',
      learner: true,
      description: 'A button on the command row under the view header (New Record, Save, Refresh…).',
      anchor: 'host.mois.command.{command}',
    },
    'host.mois.selectRow': {
      label: 'Select a grid row',
      description: 'Click one row of the grid in front, by its row anchor (host.mois.row.{row}); the row must be on screen, so open its band first.',
      anchor: 'host.mois.row.{row}',
      outcome: { path: 'host.screen.row', arg: 'row' },
    },
    'host.mois.sort': {
      label: 'Sort by a column',
      description: "Click a column title on a list that sorts (the Workspace's basket and task folders, art. 303750); clicking the same title again flips ascending and descending. `column` is the column's key slug (test, patient, ra…).",
      anchor: 'host.mois.sort.{column}',
    },
    'host.mois.selectTab': {
      label: 'Select a tab',
      anchor: 'host.mois.tab.{tab}',
      outcome: { path: 'host.tab', arg: 'tab' },
    },
    'host.mois.openFolder': {
      label: 'Open a folder',
      learner: true,
      description: "Press the + beside a banded folder. The Report List's sixteen folders open this way; a folder already open is left open.",
      anchor: 'host.mois.group.{group}',
    },
    'host.mois.menu': {
      label: 'Choose a menu item',
      learner: true,
      anchor: 'host.mois.menu.{menu}.{item}',
    },
    'host.mois.openWindow': {
      label: 'Open a record in its own window',
      description: 'Double-click a grid row that opens an MDI child window (an encounter). Replay opens the encounter numbered args.encounter, or the one at args.index (default the first).',
    },
    'host.mois.encounterMenu': {
      label: "Choose from the encounter window's menu bar",
      learner: true,
      description: "The Encounter Detail Window's own Save / Chart Views / Action / Print / Utilities / Close. Save and Close are commands on the bar (no item); the others drop a menu and take args.item.",
      anchor: 'host.mois.encounter.menu.{menu}',
    },
    'host.mois.selectText': {
      label: 'Highlight the text in a field',
      description: "Select all the text in the field anchored host.mois.field.{field} — the Encounter Detail Window's progress note, before Print ▸ Selected Text. Type into it first with host.mois.fill.",
      anchor: 'host.mois.field.{field}',
    },
    'host.mois.lookup': {
      label: 'Open a lookup',
      description: 'Press the "…" beside a field. On Patient Summary the one beside Chart No. opens the Advanced Lookup Service.',
      anchor: 'host.mois.lookup.{field}',
      outcome: { path: 'host.dialog', arg: 'dialog' },
    },
    'host.mois.selectPatient': {
      label: 'Open a chart',
      description: 'Pick a row in the Advanced Lookup Service; every window in the module switches to that chart. The chart number is a synthetic training id, and is the only patient-derived value this emulator reports.',
      outcome: { path: 'host.patient', arg: 'chart' },
    },
    'host.mois.status': {
      label: 'Press a status-bar link',
      learner: true,
      description: 'Go To Chart… or Create Appointment… on the frame\'s status bar; or a double-click on the flashing Task Item / Msg Item cell (`task-item`, `msg-item`), which opens the Automated Notification Service\'s Task Reminder / Message List.',
      anchor: 'host.mois.status.{link}',
    },
    'host.mois.fill': {
      label: 'Type into a field',
      learner: true,
      description: 'Type `value` into the field anchored host.mois.field.{field}, or several fields in order with `values: { field: value }`. Only the field slug is reported, never what was typed.',
      anchor: 'host.mois.field.{field}',
    },
    'host.mois.closeDialog': {
      label: 'Close the open dialog',
      learner: true,
    },
    'host.mois.focusField': {
      label: 'Put the cursor in a field',
      description: 'Click into a field (host.mois.field.{field}). Record ▸ Prompt / F4 and Maintenance ▸ Default Value Setting act on the field the cursor is in.',
      anchor: 'host.mois.field.{field}',
    },
    'host.mois.look': {
      label: 'Look at a control',
      /* no `anchor` template: any family of control can be looked at, and the
         step's own anchor is what rings it */
      description: 'Bring host.mois.{kind}.{name} into view and change nothing: the action a reading step gives Watch mode, where the step only names what is on screen and its check already holds. Throws when the control is not there.',
    },
    'host.mois.setField': {
      label: 'Fill in a field',
      learner: true,
      description: 'Type into, pick from or tick the control behind host.mois.field.{field}: a text field takes `value` as typed text, a drop-down the entry whose text contains it, a checkbox true / false.',
      anchor: 'host.mois.field.{field}',
    },
    'host.mois.stopReminder': {
      label: 'Stop an opening-chart reminder',
      description: 'Tick Stop Reminder on a due reminder row in the opening-chart notification.',
      anchor: 'host.mois.reminder.stop.{index}',
      outcome: { path: 'host.reminderStopped', arg: 'stopped' },
    },
    'host.mois.openUtility': {
      label: 'Open a chart utility window',
      description:
        "The Patient Chart's taskbar and toolbar modals: find-patient, advance-chart-search, "
        + 'reviewing, order-linking-service, tag-to-care-plan, chart-navigator, add-attachment. '
        + '`node` opens the folder that invokes it first, which is what picks the window\'s variant.',
      outcome: { path: 'host.dialog', arg: 'window' },
    },
    'host.mois.acknowledge': {
      label: 'Check a basket item',
      learner: true,
      description: "Tick the Check box on a Workspace Basket row, by the patient's surname. Refresh (or F2) then drops the checked rows from the Not Checked list.",
      anchor: 'host.mois.check.{patient}',
    },
    'host.mois.tickCell': {
      label: 'Tick a checkbox in a grid cell',
      learner: true,
      description: "Click the checkbox anchored host.mois.cell.{cell} — the Chart Navigator's Exclude column is `exclude-<chart>`.",
      anchor: 'host.mois.cell.{cell}',
    },
    'host.mois.choose': {
      label: 'Pick a radio button or tick a box',
      description: "Click the radio button or check box anchored host.mois.field.{field} — Teleplan Web Access's options (`teleplan-download-fee-codes`), Export Chart(s)' Format (`format-chart-pdf-export`).",
      anchor: 'host.mois.field.{field}',
    },
    'host.mois.openMenu': {
      label: 'Drop a menu',
      learner: true,
      description: 'Open a menu on the menu bar and leave it dropped, so a step can show what it holds. A menu already open stays open.',
      anchor: 'host.mois.menu-region.{menu}',
    },
    'host.mois.activateRow': {
      label: 'Double-click a grid row',
      description: 'Make the row anchored host.mois.row.{row} current and open it, as a double-click does — a Chart Export Log opens its Print Preview.',
      anchor: 'host.mois.row.{row}',
    },
    'host.mois.rightClickRow': {
      label: 'Right-click a grid row',
      learner: true,
      description: "Right-click the row anchored host.mois.row.{row}: it becomes current and its popup menu drops (items anchored host.mois.menu.context.{item}).",
      anchor: 'host.mois.row.{row}',
    },
    'host.mois.print': {
      label: 'Print a report',
      description: "A Print-menu item that has a Selection Parameter window behind it. `stage: 'params'` stops at that window; `'report'` presses Ok and opens the Richtext Report preview.",
      outcome: { path: 'host.dialog', arg: 'dialog' },
    },
    'host.mois.claimPrompt': {
      label: 'Open a claim lookup',
      description: "Billing's \"Prompt -\" buttons: patient or doctor over the unsent claims, chart or recon over the sent ones.",
      anchor: 'host.mois.command.prompt-{prompt}',
      outcome: { path: 'host.dialog', arg: 'dialog' },
    },
    'host.mois.daybookFor': {
      label: "Change whose day book is shown",
      description: 'Pick a provider in the Scheduler\'s "Daybook For" field; the whole day changes with it.',
      anchor: 'host.mois.daybookfor',
      outcome: { path: 'host.provider', arg: 'provider' },
    },
    'host.mois.apptStatus': {
      label: 'Set an appointment status',
      anchor: 'host.mois.as.{appointment}',
      description: "The day book's AS column: A Arrived, I In Room, S Seen, D Discharged, N No Show, R Rebooked, C Cancelled. Applies to the current appointment, or to args.row.",
      outcome: { path: 'host.appt', arg: 'status' },
    },
    'host.mois.daybook': {
      label: 'Move the day book',
      learner: true,
      description: "The Scheduler's date navigator: Today, a day either way (F7 / F8) or a week either way (Page Up / Page Down).",
      anchor: 'host.mois.daybook.{move}',
    },
  },
  anchors: [
    'host.mois.desktop',
    'host.mois.navigator',
    'host.mois.workarea',
    /* the frame's bands, named as the manual's window tour names them:
       Toolbar, Task Bar, Information Bar and Bottom Bar */
    'host.mois.menubar',
    'host.mois.modulebar',
    'host.mois.commandrow',
    'host.mois.viewhead',
    'host.mois.statusbar',
    'host.mois.module.{module}',
    'host.mois.tree.{node}',
    /* one grid row, where a lesson needs to ring the line it is describing */
    'host.mois.row.{row}',
    'host.mois.field.{field}',
    'host.mois.dialog.{dialog}',
    'host.mois.reminder.stop.{index}',
    'host.mois.reminder.close',
    /* one day-book appointment's AS cell */
    'host.mois.as.{appointment}',
    /* one basket row's Check box */
    'host.mois.check.{patient}',
    /* one grid cell, for lessons that must ring a column rather than a row —
       the day book by appointment time, and any other grid by its row key */
    'host.mois.cell.{column}-{appointment}',
    'host.mois.cell.{column}-{row}',
    /* the same cell named whole, as `host.mois.tickCell` takes it */
    'host.mois.cell.{cell}',
    'host.mois.group.{group}',
    /* an MDI child window, for a step whose subject is the open window rather
       than the chart behind it */
    'host.mois.window.{window}',
    'host.mois.daybook.{move}',
    'host.mois.daybookfor',
    'host.mois.command.{command}',
    'host.mois.tab.{tab}',
    'host.mois.lookup.{field}',
    'host.mois.status.{link}',
    /* a sortable list's column title */
    'host.mois.sort.{column}',
    'host.mois.menu.{menu}',
    /* the launcher while closed, then the whole dropdown while open */
    'host.mois.menu-region.{menu}',
    'host.mois.menu.{menu}.{item}',
    /* the Encounter Detail Window's own menu bar, which repeats the frame's
       Print / Action / Utilities captions */
    'host.mois.encounter.menu.{menu}',
    'host.mois.encounter.menu-region.{menu}',
    'host.mois.encounter.menu.{menu}.{item}',
  ],
  /* The size MOIS paints this window at — both Patient Summary captures were
     taken at 1000x736. A stage gives the emulator the whole browser as its
     desktop and opens the window at this size on it, rather than stretching
     the window: MOIS does not reflow, so a wider frame would be more window
     face, not more chart. The window is still movable and resizable from
     there, the way the real one is. */
  windowSize: { width: 1000, height: 736 },
}

/* What the shell opens on when it is not told: a chart open on Patient
   Summary, as it always has. The stage names its fixture — the manifest's
   default, no chart — so the empty start is the stage's, and a host or test
   mounting the shell on its own still gets a chart to look at. */
const SHELL_FALLBACK_FIXTURE: MoisClassicFixtureId = 'patient-summary'

export function resolveMoisClassicFixture(id: string | undefined) {
  const key = (id && id in MOIS_CLASSIC_FIXTURE_STARTS ? id : SHELL_FALLBACK_FIXTURE) as MoisClassicFixtureId
  return { id: key, ...MOIS_CLASSIC_FIXTURE_STARTS[key] }
}
