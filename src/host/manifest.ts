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
  'patient-chart-forms': { module: 'chart', node: 'dynamic', view: 'section' },
  scheduler: { module: 'scheduler', node: 'p-daybook', view: 'scheduler' },
  workspace: { module: 'workspace', node: 'ws-inbox', view: 'section' },
} as const

export type MoisClassicFixtureId = keyof typeof MOIS_CLASSIC_FIXTURE_STARTS

export const MOIS_CLASSIC_DEFAULT_FIXTURE: MoisClassicFixtureId = 'patient-chart'

function initialState(id: MoisClassicFixtureId) {
  const start = MOIS_CLASSIC_FIXTURE_STARTS[id]
  return { module: start.module, node: start.node, view: start.view, tab: null, dialog: null, windows: 0, theme: 'hybrid' }
}

const fixtures: HostFixtureSpec[] = [
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
    label: 'Workspace — Inbox',
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
  snapshotPaths: ['host.module', 'host.node', 'host.view', 'host.tab', 'host.dialog', 'host.windows', 'host.theme'],
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
    'host.mois.menu': {
      label: 'Choose a menu item',
      anchor: 'host.mois.menu.{menu}.{item}',
    },
    'host.mois.openWindow': {
      label: 'Open a record in its own window',
      description: 'Double-click a grid row that opens an MDI child window (an encounter).',
    },
    'host.mois.closeDialog': {
      label: 'Close the open dialog',
    },
  },
  anchors: [
    'host.mois.desktop',
    'host.mois.navigator',
    'host.mois.workarea',
    'host.mois.module.{module}',
    'host.mois.tree.{node}',
    'host.mois.command.{command}',
    'host.mois.tab.{tab}',
    'host.mois.menu.{menu}',
    'host.mois.menu.{menu}.{item}',
  ],
}

export function resolveMoisClassicFixture(id: string | undefined) {
  const key = (id && id in MOIS_CLASSIC_FIXTURE_STARTS ? id : MOIS_CLASSIC_DEFAULT_FIXTURE) as MoisClassicFixtureId
  return { id: key, ...MOIS_CLASSIC_FIXTURE_STARTS[key] }
}
