import { DEFAULT_CHART } from '../data/patients'
import type { HostEmulatorManifest, HostFixtureSpec } from './types'

/* ============================================================================
   host/manifest — what this emulator offers a host page, as plain data.

   Kept free of React so a host can read it (for its registry, studio
   pickers and drift guards) without pulling the screens into that bundle.
   ========================================================================= */

export const MOIS_CLASSIC_HOST_ID = 'mois-classic'

/** Where each fixture starts: module, selected tree node, and the view it opens. */
export const MOIS_CLASSIC_FIXTURE_STARTS = {
  'patient-chart': { module: 'chart', node: 'orders', view: 'order' },
  'patient-summary': { module: 'chart', node: 'summary', view: 'summary' },
  'patient-chart-forms': { module: 'chart', node: 'dynamic', view: 'section' },
  scheduler: { module: 'scheduler', node: 'p-daybook', view: 'scheduler' },
  workspace: { module: 'workspace', node: 'ws-summary', view: 'wssummary' },
} as const

export type MoisClassicFixtureId = keyof typeof MOIS_CLASSIC_FIXTURE_STARTS

/* Patient Summary is where MOIS lands with a chart open, so it is where the
   stage opens too — a tutorial or `?fixture=` can still ask for another. */
export const MOIS_CLASSIC_DEFAULT_FIXTURE: MoisClassicFixtureId = 'patient-summary'

function initialState(id: MoisClassicFixtureId) {
  const start = MOIS_CLASSIC_FIXTURE_STARTS[id]
  return {
    module: start.module, node: start.node, view: start.view,
    tab: null, dialog: null, patient: DEFAULT_CHART, windows: 0, draft: false,
    daybook: '2026.08.11', provider: 'technical-support', theme: 'hybrid',
    invoice: 'open', appt: '', booked: 0, basket: 0, billed: 0,
  }
}

const fixtures: HostFixtureSpec[] = [
  {
    id: 'patient-summary',
    label: 'Patient Chart — Patient Summary',
    description: 'The chart open on Patient Summary, where the chart is identified and another one is looked up.',
    initialState: initialState('patient-summary'),
  },
  {
    id: 'patient-chart',
    label: 'Patient Chart — Orders',
    description: 'The chart open on the Orders view, the way MOIS lands after Go To Chart.',
    initialState: initialState('patient-chart'),
  },
  {
    id: 'patient-chart-forms',
    label: 'Patient Chart — Dynamic Forms',
    description: 'The Forms branch expanded with Dynamic Forms selected.',
    initialState: initialState('patient-chart-forms'),
  },
  {
    id: 'scheduler',
    label: 'Scheduler — Provider Day Book',
    initialState: initialState('scheduler'),
  },
  {
    id: 'workspace',
    label: 'Workspace — Summary',
    description: 'The Workspace open on its summary: what is waiting in the basket, the task list and the message board.',
    initialState: initialState('workspace'),
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
    'host.theme', 'host.invoice', 'host.appt', 'host.booked', 'host.basket', 'host.billed',
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
      anchor: 'host.mois.tree.{node}',
    },
    'host.mois.command': {
      label: 'Press a command button',
      description: 'A button on the command row under the view header (New Record, Save, Refresh…).',
      anchor: 'host.mois.command.{command}',
    },
    'host.mois.selectTab': {
      label: 'Select a tab',
      anchor: 'host.mois.tab.{tab}',
      outcome: { path: 'host.tab', arg: 'tab' },
    },
    'host.mois.openFolder': {
      label: 'Open a folder',
      description: "Press the + beside a banded folder. The Report List's sixteen folders open this way; a folder already open is left open.",
      anchor: 'host.mois.group.{group}',
    },
    'host.mois.menu': {
      label: 'Choose a menu item',
      anchor: 'host.mois.menu.{menu}.{item}',
    },
    'host.mois.openWindow': {
      label: 'Open a record in its own window',
      description: 'Double-click a grid row that opens an MDI child window (an encounter). Replay opens the first encounter, or args.index.',
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
      description: 'Go To Chart… or Create Appointment… on the frame\'s status bar.',
      anchor: 'host.mois.status.{link}',
    },
    'host.mois.closeDialog': {
      label: 'Close the open dialog',
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
      description: "Tick the Check box on a Workspace Basket row, by the patient's surname. Refresh (or F2) then drops the checked rows from the Not Checked list.",
      anchor: 'host.mois.check.{patient}',
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
    /* one day-book appointment's AS cell */
    'host.mois.as.{appointment}',
    /* one basket row's Check box */
    'host.mois.check.{patient}',
    /* one grid cell, for lessons that must ring a column rather than a row —
       the day book by appointment time, and any other grid by its row key */
    'host.mois.cell.{column}-{appointment}',
    'host.mois.cell.{column}-{row}',
    'host.mois.group.{group}',
    'host.mois.daybook.{move}',
    'host.mois.daybookfor',
    'host.mois.command.{command}',
    'host.mois.tab.{tab}',
    'host.mois.lookup.{field}',
    'host.mois.status.{link}',
    'host.mois.menu.{menu}',
    'host.mois.menu.{menu}.{item}',
  ],
  /* The size MOIS paints this window at — both Patient Summary captures were
     taken at 1000x736. A stage gives the emulator the whole browser as its
     desktop and opens the window at this size on it, rather than stretching
     the window: MOIS does not reflow, so a wider frame would be more window
     face, not more chart. The window is still movable and resizable from
     there, the way the real one is. */
  windowSize: { width: 1000, height: 736 },
}

export function resolveMoisClassicFixture(id: string | undefined) {
  const key = (id && id in MOIS_CLASSIC_FIXTURE_STARTS ? id : MOIS_CLASSIC_DEFAULT_FIXTURE) as MoisClassicFixtureId
  return { id: key, ...MOIS_CLASSIC_FIXTURE_STARTS[key] }
}
