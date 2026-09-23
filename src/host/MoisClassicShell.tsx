import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { basketFolders } from '../data/basket'
import { billingAdminViews } from '../data/billingAdmin'
import { chartRowsFor } from '../data/chart-records'
import { hasChartExport, loadChartExport } from '../data/charts'
import { chartScreens, moduleScreens, schedulerScreens, type ChartScreen } from '../data/chartScreens'
import { clinicListSpecs } from '../data/clinicManagement'
import { bookedAppointment, type Appointment } from '../data/daybook'
import { designerNodes } from '../data/designerSection'
import {
  adminTree, billingTree, daybookProviders,
  exchangeTree, makeMainMenu, makeStatusCells, modules,
  patientChartTree, reportsTree, schedulerTree, workspaceTree,
  type CarePlanKey, type PBTextMode, type PBTheme
} from '../data/mois'
import { PatientProvider } from '../data/patient-context'
import { dueOpeningReminders } from '../data/opening-reminders'
import {
  DEFAULT_CHART, MOIS_TODAY, findPatient, normalizePatient,
  stepChart,
  patients as trainingRoster,
  type Patient,
} from '../data/patients'
import { printReportByMenu, type PrintReport } from '../data/printReports'
import { reportScreens } from '../data/reportScreens'
import { taskScreens } from '../data/tasks'
import { userManagementNodes } from '../data/userManagement'
import {
  PBInstrumentationProvider, PBMdiHost, PBMdiProvider, PBMenuBar, PBModuleBar, PBStatusBar, PBTree, PBWindow,
  pbSlug, useMdi, type PBInstrumentationPayload, type PBTreeNode, type PBWindowClass,
} from '../pb'
import '../pb/kit.css'
import { AddAttachmentDialog } from '../screens/AddAttachmentDialog'
import { AdvanceChartSearchDialog } from '../screens/AdvanceChartSearchDialog'
import { AdvancedLookupDialog } from '../screens/AdvancedLookupDialog'
import { BasketFolderView } from '../screens/BasketFolderView'
import { BillingAdminView } from '../screens/BillingAdminView'
import { InvoiceView, SentMspView, UnsentMspView } from '../screens/BillingViews'
import { CarePlanSummaryView } from '../screens/CarePlanSummaryView'
import { CarePlanView } from '../screens/CarePlanView'
import {
  InboundMessagesView, OutboundMessagesView, PatientMessageDetailWindow, RecordNavigatorWindow,
} from '../screens/CdxMessageViews'
import { ChartNavigatorWindow } from '../screens/ChartNavigatorWindow'
import { ChartSectionView } from '../screens/ChartSectionView'
import { ClaimPromptDialog, type ClaimPrompt } from '../screens/ClaimPromptDialog'
import { ClinicalReportView } from '../screens/ClinicalReportView'
import { ClinicListView } from '../screens/ClinicListView'
import { DayGridView } from '../screens/DayGridView'
import { DemographicsView } from '../screens/DemographicsView'
import { DesignerSectionView } from '../screens/DesignerSectionView'
import { DeterminantsView } from '../screens/DeterminantsView'
import { EncounterWindow, type EncounterRecord } from '../screens/EncounterWindow'
import { FindPatientDialog } from '../screens/FindPatientDialog'
import { GoalDialog } from '../screens/GoalDialog'
import { GoalsView } from '../screens/GoalsView'
import { GroupVisitView } from '../screens/GroupVisitView'
import { LetterSetupWindow, SelectLetterTemplateDialog } from '../screens/LetterFlow'
import { LetterWriterWindow } from '../screens/LetterWriterWindow'
import { LoginDialog } from '../screens/LoginDialog'
import { MarView } from '../screens/MarView'
import { MedicationView, PrintHistoryView } from '../screens/MedicationView'
import { ProviderWorkloadView, UserManagementLanding } from '../screens/ModuleLandingViews'
import { NewAppointmentDialog } from '../screens/NewAppointmentDialog'
import { NotificationView } from '../screens/NotificationView'
import { OrderLinkingServiceDialog } from '../screens/OrderLinkingServiceDialog'
import { OpeningChartReminderDialog } from '../screens/OpeningChartReminderDialog'
import { EncounterListView, OrderView } from '../screens/OrderView'
import { PatientSummaryView } from '../screens/PatientSummaryView'
import { RichtextReportWindow, SelectionParameterDialog } from '../screens/PrintFlow'
import { ReportListView } from '../screens/ReportListView'
import { ReviewingDialog } from '../screens/ReviewingDialog'
import { SchedulerView, daybookOffsetAfter, daybookStamp, type DaybookMove } from '../screens/SchedulerView'
import { ServiceEventDialog } from '../screens/ServiceEventDialog'
import { SystemSettingsView } from '../screens/SystemSettingsView'
import { TagToCarePlanDialog } from '../screens/TagToCarePlanDialog'
import { TaskListView } from '../screens/TaskListView'
import { UserManagementView } from '../screens/UserManagementView'
import { WaitingListView } from '../screens/WaitingListView'
import { WorkspaceSummaryView } from '../screens/WorkspaceSummaryView'
import { resolveMoisClassicFixture } from './manifest'
import type { HostRecord, HostShellApi, HostShellProps, HostValue } from './types'

/* ============================================================================
   MoisClassicShell — the MOIS MDI frame as an embeddable, instrumented host.

   The standalone viewer and Webforms' tutorial stage both render this. What
   the host page gets back:

   - `onAction`     every navigation the learner makes, as `host.mois.*`
                    semantic actions with slug-only payloads;
   - `onStateChange` the frame's structural state (module, node, view, tab,
                    dialog, open windows, theme) for practice checks;
   - `onReady(api)` `perform()` replays any manifest action so autoplay and
                    resume work without simulated clicks on hidden controls;
   - `data-tutorial-id` anchors on the desktop, navigator, work area, every
                    tree node, module button, command button, tab and menu item.
   ========================================================================= */

type View =
  | 'providerworkload' | 'userlanding' | 'summary' | 'order' | 'encounters' | 'scheduler' | 'demographics' | 'notifications'
  | 'groupvisit' | 'careplan' | 'goals' | 'imaging' | 'resourcebook' | 'section' | 'daygrid' | 'rx' | 'ltm' | 'printhx' | 'waitprov' | 'waitres' | 'report' | 'mar' | 'determinants' | 'settings' | 'wssummary' | 'reportlist' | 'unsentmsp' | 'sentmsp' | 'invoice' | 'basket' | 'billingadmin' | 'tasklist' | 'cliniclist' | 'designer' | 'cdxinbound' | 'cdxoutbound' | 'usermgt'

/* The MDI window classes this frame can instantiate. Each is opened by key,
   so the same record never opens twice. */
const WINDOW_CLASSES: Record<string, PBWindowClass> = {
  encounter: EncounterWindow,
}

const DEFAULT_EXPANDED = [
  'summary', 'allergy', 'rx', 'issues', 'careplan', 'forms',
  'prov', 'res', 'waiting', 'blocks', 'shift',
  'ws-basket', 'ws-tasklist', 'ws-board', 'ws-settings', 'dx-manual', 'dx-interfaces',
  /* the Administration sections that have screens behind them. The annotated
     master capture shows every section open; the rest stay shut until they
     are more than a labelled fallback. */
  'ad-user-mgt', 'ad-clinic-mgt', 'ad-designer', 'ad-config',
  /* the Billing tree draws no +/- boxes in any capture: it is always open */
  'bl-msp', 'bl-pbf', 'bl-lfp', 'bl-pas',
]

const MODULE_TREES: Record<string, { tree: PBTreeNode[]; label: string; first: string }> = {
  chart:     { tree: patientChartTree, label: 'Patient Chart',  first: 'orders' },
  workspace: { tree: workspaceTree,    label: 'Workspace',      first: 'ws-summary' },
  scheduler: { tree: schedulerTree,    label: 'Scheduler',      first: 'p-daybook' },
  billing:   { tree: billingTree,      label: 'Billing',        first: 'bl-unsent' },
  admin:     { tree: adminTree,        label: 'Administration', first: 'ad-settings' },
  exchange:  { tree: exchangeTree,     label: 'Data Exchange',  first: 'dx-orders' },
  reports:   { tree: reportsTree,      label: 'Reports',        first: 'rp-list' },
}

/* Tree nodes that have a screen behind them. Everything else falls back to
   the shared chart-section window, the way an unimplemented MOIS node lands
   somewhere. */
const ROUTES: Record<string, View> = {
  prov: 'providerworkload',
  'ad-user-mgt': 'userlanding',
  'ad-settings': 'settings',
  'ws-summary': 'wssummary',
  'rp-list': 'reportlist',
  ...Object.fromEntries(basketFolders.map((f) => [f.id, 'basket' as View])),
  ...Object.fromEntries(billingAdminViews.map((v) => [v.node, 'billingadmin' as View])),
  ...Object.fromEntries(taskScreens.map((t) => [t.node, 'tasklist' as View])),
  ...Object.fromEntries(clinicListSpecs.map((v) => [v.node, 'cliniclist' as View])),
  ...Object.fromEntries(designerNodes.map((n) => [n, 'designer' as View])),
  ...Object.fromEntries(userManagementNodes.map((n) => [n, 'usermgt' as View])),
  'dx-inbound-msg': 'cdxinbound',
  'dx-outbound-msg': 'cdxoutbound',
  'bl-unsent': 'unsentmsp',
  'bl-sent': 'sentmsp',
  'bl-invoices': 'invoice',
  summary: 'summary',
  orders: 'order',
  demographic: 'demographics',
  notifications: 'notifications',
  encounters: 'encounters',
  group: 'groupvisit',
  goals: 'goals',
  imaging: 'report',
  consults: 'report',
  procedures: 'report',
  paper: 'report',
  measures: 'report',
  mar: 'mar',
  determinants: 'determinants',
  allergy: 'report',
  reaction: 'report',
  admissions: 'report',
  interventions: 'report',
  famhx: 'report',
  alerts: 'report',
  conditions: 'report',
  socialhx: 'report',
  barriers: 'report',
  resources: 'report',
  prefs: 'report',
  events: 'report',
  rx: 'rx',
  ltm: 'ltm',
  printhx: 'printhx',

  'p-daybook': 'scheduler',
  res: 'resourcebook',
  waiting: 'waitprov',
  'w-prov': 'waitprov',
  'w-res': 'waitres',
  'r-daybook': 'resourcebook',
}

/* the multi-column day and week views share one grid component */
const DAY_GRIDS: Record<string, { columns: number; mode: 'day' | 'week'; title: string }> = {
  'p-week1':  { columns: 1, mode: 'week', title: 'Week View - 1 Provider' },
  'p-day1':   { columns: 1, mode: 'day',  title: 'Day View - 1 Provider' },
  'p-day3':   { columns: 3, mode: 'day',  title: 'Day View - 3 Providers' },
  'p-day8':   { columns: 8, mode: 'day',  title: 'Day View - 8 Providers' },
  'r-week1':  { columns: 1, mode: 'week', title: 'Week View - 1 Resource' },
  'r-day3':   { columns: 3, mode: 'day',  title: 'Day View - 3 Resources' },
  'r-day8':   { columns: 8, mode: 'day',  title: 'Day View - 8 Resources' },
}

/* a module tree's root node opens that module's landing screen */
/* A module tree that hangs off one root node opens that root's first child.
   Administration has no single root — its folders sit at the top level. */
const MODULE_ROOTS: Record<string, string> = {}

/* six tree nodes share one window, bound to a different DataWindow each */
const CARE_PLAN: Record<string, CarePlanKey> = {
  needs: 'needs',
  actions: 'actions',
  barriers: 'barriers',
  risks: 'risks',
  conditions: 'conditions',
}

/** The ids of every ancestor of `id` in `nodes`, root first; null when absent. */
function ancestorsOf(nodes: PBTreeNode[], id: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === id) return trail
    if (node.children) {
      const found = ancestorsOf(node.children, id, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}

/** A node's caption, for the window a node with no screen of its own opens. */
function labelOf(nodes: PBTreeNode[], id: string): string | null {
  for (const node of nodes) {
    if (node.id === id) return node.label
    const found = node.children ? labelOf(node.children, id) : null
    if (found) return found
  }
  return null
}

/**
 * The window a tree node opens when nothing purpose-built is registered for
 * it. MOIS has a window behind every node; the emulator has one behind most,
 * so the rest get a list captioned with the node's own name rather than
 * whatever screen happened to be showing. Without this a node falls through to
 * the Order window and reads as the wrong screen entirely.
 */
function fallbackScreen(label: string): ChartScreen {
  return {
    title: label,
    noEncounter: true,
    commands: ['New Record', 'Delete Record', 'Save', 'Undo', 'Refresh', 'Print'],
    disabled: ['Save', 'Undo'],
    columns: [
      { key: 'date', header: 'Date', width: 92, align: 'center' },
      { key: 'description', header: 'Description', width: 260 },
      { key: 'detail', header: 'Detail' },
      { key: 'by', header: 'Entered By', width: 150 },
    ],
  }
}

/** Which module tree holds `id`. */
function moduleOfNode(id: string): string | null {
  for (const [module, { tree }] of Object.entries(MODULE_TREES)) {
    if (ancestorsOf(tree, id)) return module
  }
  return null
}

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/* ---------------------------------------------------------------------------
   The frame window's geometry.

   Maximised it fills the desktop with the inset a Windows app keeps; restored
   it is an ordinary movable, resizable window whose `MIN_W` is the width below
   which the PowerBuilder window stops shrinking and the desktop scrolls
   instead — real MOIS behaves the same way, and it is worth being able to see.

   A *maximised* window keeps no minimum: a maximised Windows app never hangs
   off its desktop. Holding one there pushed the right edge of the work area —
   the summary grid's Hyperlink column among it — past the stage's own edge on
   any pane narrower than MIN_W, which is the one place the emulator was
   showing less than MOIS would.
   ------------------------------------------------------------------------ */
/** The desktop margin the frame keeps when maximised. Exported because a
    viewer that wants the window at a painted size has to size the desktop
    around it. */
export const FRAME_INSET = { left: 24, top: 18, bottom: 18 }
/* The narrowest MOIS actually paints this window at. Both 1000px-wide
   captures (`reference/patient-summary-3598.png`, `-3924.png`) show every
   grid column inside the frame at that width, so 1180 was too wide a floor —
   it made the emulator refuse a window size the real client uses. */
const MIN_W = 1000
const MIN_H = 420

type Rect = { left: number; top: number; width: number; height: number }

/* useLayoutEffect where there is a DOM, so the window is placed before the
   first paint rather than jumping from maximised to its painted size. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function useFrameGeometry(
  desktopRef: React.RefObject<HTMLDivElement | null>,
  windowSize?: { width: number; height: number },
) {
  const inset = FRAME_INSET
  /* A host that knows what size the real window is painted at opens it at
     that size on its desktop; otherwise the frame starts maximised, which is
     how the standalone viewer and the older stages come up. */
  const [maximized, setMaximized] = useState(!windowSize)
  const [rect, setRect] = useState<Rect | null>(null)

  useIsoLayoutEffect(() => {
    if (!windowSize) return
    const desktop = desktopRef.current
    if (!desktop) return
    const width = Math.min(windowSize.width, desktop.clientWidth)
    const height = Math.min(windowSize.height, desktop.clientHeight)
    setRect({
      left: Math.max(0, Math.round((desktop.clientWidth - width) / 2)),
      top: Math.max(0, Math.round((desktop.clientHeight - height) / 2)),
      width,
      height,
    })
    /* only where the window opens: a resize moves the desktop under it, the
       way it does under a real window, and `current()` keeps it on screen */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /* the live drag: written by pointermove, read on every frame */
  const drag = useRef<
    | { kind: 'move'; dx: number; dy: number; start: Rect }
    | { kind: 'resize'; edge: string; x: number; y: number; start: Rect }
    | null
  >(null)

  /** The box the window occupies now, whether maximised or not. */
  const current = useCallback((): Rect => {
    const desktop = desktopRef.current
    const width = desktop?.clientWidth ?? MIN_W + 48
    const height = desktop?.clientHeight ?? MIN_H + 36
    if (!maximized && rect) {
      /* A restored window is kept on its desktop. Its rect outlives the
         desktop it was dragged on — a stage resized around it, a pane
         narrowed, a hot reload that keeps state — and a window parked off the
         bottom right of a smaller desktop is unreachable, since the title bar
         you would drag it back by is the part that is gone. Windows itself
         pulls windows back on a resolution change for the same reason. */
      const w = Math.min(rect.width, Math.max(MIN_W, width))
      const h = Math.min(rect.height, Math.max(MIN_H, height))
      return {
        width: w,
        height: h,
        left: Math.max(0, Math.min(rect.left, width - w)),
        top: Math.max(0, Math.min(rect.top, height - h)),
      }
    }
    return {
      left: inset.left,
      top: inset.top,
      width: Math.max(MIN_W, width - inset.left * 2),
      height: Math.max(MIN_H, height - inset.top - inset.bottom),
    }
  }, [desktopRef, inset, maximized, rect])

  const toggleMaximized = useCallback(() => {
    /* restoring down for the first time: come back a little smaller, the way
       a window remembers a size it has never actually had yet. Computed out
       here — a setState inside another one's updater does not run reliably. */
    if (maximized && !rect) {
      const box = current()
      setRect({
        left: box.left + 20,
        top: box.top + 16,
        width: Math.max(MIN_W, Math.round(box.width * 0.86)),
        height: Math.max(MIN_H, Math.round(box.height * 0.88)),
      })
    }
    setMaximized((was) => !was)
  }, [current, maximized, rect])

  const begin = useCallback((event: React.PointerEvent<HTMLElement>, start: () => typeof drag.current) => {
    if (event.button !== 0) return
    /* the title-bar buttons live inside the drag surface */
    if ((event.target as HTMLElement).closest('.pb-titlebar__btn')) return
    event.preventDefault()
    /* capture keeps the drag alive past the window's edge; without it the
       desktop's own move/up handlers still see the pointer */
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* not capturable */ }
    drag.current = start()
  }, [])

  /** The size a maximised window comes back to, so a drag has somewhere to go. */
  const restoredBox = useCallback((box: Rect): Rect => (rect ?? {
    left: box.left + 20,
    top: box.top + 16,
    width: Math.max(MIN_W, Math.round(box.width * 0.86)),
    height: Math.max(MIN_H, Math.round(box.height * 0.88)),
  }), [rect])

  /**
   * Dragging a maximised window's title bar restores it and keeps dragging,
   * the way Windows does — the pointer stays at the same place along the bar
   * so the window does not jump out from under it.
   */
  const onMovePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const box = current()
    if (!maximized) {
      begin(event, () => ({ kind: 'move', dx: event.clientX - box.left, dy: event.clientY - box.top, start: box }))
      return
    }
    const restored = restoredBox(box)
    const grip = ((event.clientX - box.left) / box.width) * restored.width
    const start = { ...restored, left: event.clientX - grip, top: Math.max(0, event.clientY - 12) }
    setMaximized(false)
    setRect(start)
    begin(event, () => ({ kind: 'move', dx: grip, dy: event.clientY - start.top, start }))
  }, [begin, current, maximized, restoredBox])

  /** Dragging any edge does the same: a maximised window restores under the grip. */
  const onResizePointerDown = useCallback((edge: string, event: React.PointerEvent<HTMLElement>) => {
    const box = current()
    if (maximized) {
      setMaximized(false)
      setRect(box)
    }
    begin(event, () => ({ kind: 'resize', edge, x: event.clientX, y: event.clientY, start: box }))
  }, [begin, current, maximized])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const move = drag.current
    if (!move) return
    if (move.kind === 'move') {
      setRect({
        ...move.start,
        left: Math.max(0, event.clientX - move.dx),
        top: Math.max(0, event.clientY - move.dy),
      })
      return
    }
    const dx = event.clientX - move.x
    const dy = event.clientY - move.y
    const { left, top, width, height } = move.start
    const next = { left, top, width, height }
    if (move.edge.includes('e')) next.width = Math.max(MIN_W, width + dx)
    if (move.edge.includes('s')) next.height = Math.max(MIN_H, height + dy)
    if (move.edge.includes('w')) {
      next.width = Math.max(MIN_W, width - dx)
      next.left = Math.max(0, left + (width - next.width))
    }
    if (move.edge.includes('n')) {
      next.height = Math.max(MIN_H, height - dy)
      next.top = Math.max(0, top + (height - next.height))
    }
    setRect(next)
  }, [])

  const endDrag = useCallback(() => { drag.current = null }, [])

  const style: React.CSSProperties = maximized
    ? {
        position: 'absolute',
        left: inset.left,
        top: inset.top,
        bottom: inset.bottom,
        width: `calc(100% - ${inset.left * 2}px)`,
      }
    : { position: 'absolute', ...current(), minWidth: MIN_W }

  return { maximized, style, toggleMaximized, onMovePointerDown, onResizePointerDown, onPointerMove, endDrag }
}

export interface MoisClassicShellProps extends HostShellProps {
  /** Standalone viewer only: adds Help ▸ UI Kit gallery. */
  onOpenKit?: () => void
  /**
   * How the client area's text is rasterised (see `pb/text.css`). Omitted,
   * the frame takes `?text=pixel|tahoma` off the URL, then whatever the
   * Utilities menu last chose. Passing it pins the mode instead.
   */
  text?: PBTextMode
}

/* --- text rasterisation, remembered ---------------------------------------
   The choice is a viewing preference rather than frame state, so it does not
   ride `onStateChange` — it lives in the URL for a link to pin and in local
   storage for the next visit.

   The frame starts in the bitmap mode. MOIS asks for Tahoma and Windows hints
   it onto the pixel grid; nothing turns that hinting on for macOS or Linux, so
   Tahoma here comes out soft and the stage stops looking like the captures.
   The bitmap reconstruction lands on the grid everywhere, which is what a
   learner should see by default — Maintenance > Text still switches back.

   The key is versioned because the old one was written on every mount, not
   only when the menu changed it, so a stored "tahoma" there recorded nothing
   but a visit. */
const TEXT_MODE_KEY = 'pb.text-mode.2'

function textModeParam(): PBTextMode | null {
  if (typeof window === 'undefined') return null
  const asked = new URLSearchParams(window.location.search).get('text')
  if (asked === 'pixel' || asked === 'bitmap') return 'pb-text--pixel'
  if (asked === 'tahoma' || asked === 'smooth') return ''
  return null
}

function initialTextMode(pinned?: PBTextMode): PBTextMode {
  const fromUrl = textModeParam()
  if (fromUrl !== null) return fromUrl
  if (pinned !== undefined) return pinned
  try {
    return window.localStorage.getItem(TEXT_MODE_KEY) === 'tahoma' ? '' : 'pb-text--pixel'
  } catch {
    return 'pb-text--pixel'
  }
}

function rememberTextMode(mode: PBTextMode) {
  try {
    window.localStorage.setItem(TEXT_MODE_KEY, mode === 'pb-text--pixel' ? 'pixel' : 'tahoma')
  } catch {
    /* private mode, or storage the host has blocked — the menu still works */
  }
}

export function MoisClassicShell(props: MoisClassicShellProps) {
  return (
    <PBMdiProvider>
      <Frame {...props} />
    </PBMdiProvider>
  )
}

function Frame({
  fixture, patients, chart: chartProp, onChartChange,
  onAction, onStateChange, onReady, formSlot, className, onOpenKit, text, windowSize,
  loadEncounterForms, encounterFormSlot,
}: MoisClassicShellProps) {
  const start = useMemo(() => resolveMoisClassicFixture(fixture), [fixture])
  /* the roster this frame can open: the host's charts, or the training set */
  const roster: Patient[] = useMemo(
    () => (patients?.length ? patients.map(normalizePatient) : trainingRoster),
    [patients],
  )
  const [module, setModule] = useState<string>(start.module)
  const [view, setView] = useState<View>(start.view)
  const [selected, setSelected] = useState<string>(start.node)
  const [recordSelection, setRecordSelection] = useState<{ chart: string; node: string; id: string } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(DEFAULT_EXPANDED))
  const mdi = useMdi()
  /* a New Record on the Encounters list, unsaved: the frame holds it so the
     tutorial layer can grade "you started one, then saved it" */
  const [encounterDraft, setEncounterDraft] = useState(false)
  /* days from the day book's opening day — the manual's Today / < / > / << / >> */
  const [daybook, setDaybook] = useState(0)
  /* whose day book is on screen — the manual's "Daybook For" field */
  const [daybookProvider, setDaybookProvider] = useState('TECHNICAL SUPPORT')
  /* the day book's current row, and the AS code set against each row */
  const [apptRow, setApptRow] = useState(0)
  const [apptStatuses, setApptStatuses] = useState<Record<number, string>>({})
  /* appointments booked from the New Appointment window this session */
  const [booked, setBooked] = useState<Appointment[]>([])
  /* day-book rows billed to MSP this session */
  const [billedRows, setBilledRows] = useState<Set<number>>(new Set())
  const [newApptOpen, setNewApptOpen] = useState(false)
  /* which of Billing's four "Prompt -" lookups is open, if any */
  const [claimPrompt, setClaimPrompt] = useState<ClaimPrompt | null>(null)
  /* a print in flight: first its Selection Parameter window, then the
     Richtext Report window Ok opens */
  const [printParams, setPrintParams] = useState<PrintReport | null>(null)
  const [printOutput, setPrintOutput] = useState<PrintReport | null>(null)
  /* how many basket items have been acknowledged and refreshed away */
  const [basketAck, setBasketAck] = useState(0)
  /* the open invoice: Pay Balance writes a P transaction and clears the
     balance, which is what art. 303603's "Mark an Invoice as Paid" grades on */
  const [invoicePaid, setInvoicePaid] = useState(false)
  const [serviceEventOpen, setServiceEventOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [theme, setTheme] = useState<PBTheme>('')
  const [textMode, setTextModeState] = useState<PBTextMode>(() => initialTextMode(text))
  /* only a deliberate choice is remembered — see TEXT_MODE_KEY */
  const setTextMode = useCallback((mode: PBTextMode) => {
    setTextModeState(mode)
    rememberTextMode(mode)
  }, [])
  const [loginOpen, setLoginOpen] = useState(false)
  /* the open chart: MOIS holds one at a time and every window reads it. The
     host may own it (so its own patient picker and this frame agree), in which
     case chartProp leads and onChartChange reports every change. */
  const [ownChart, setOwnChart] = useState(DEFAULT_CHART)
  const chart = chartProp ?? (findPatient(ownChart, roster) ? ownChart : roster[0]?.chart ?? ownChart)
  const [stoppedReminders, setStoppedReminders] = useState<Set<string>>(() => new Set())
  const [reminderChart, setReminderChart] = useState<string | null>(() =>
    dueOpeningReminders(findPatient(chart, roster), MOIS_TODAY).length ? chart : null,
  )
  const [lookupOpen, setLookupOpen] = useState(false)
  /* the Patient Chart's taskbar and toolbar utility windows */
  const [findPatientOpen, setFindPatientOpen] = useState(false)
  const [chartNavOpen, setChartNavOpen] = useState(false)
  const [chartSearchOpen, setChartSearchOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [orderLinkOpen, setOrderLinkOpen] = useState(false)
  const [tagCarePlanOpen, setTagCarePlanOpen] = useState(false)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [cdxDetail, setCdxDetail] = useState(false)
  const [cdxNavigator, setCdxNavigator] = useState(false)
  /* the Letter Writer is reached through a two-dialog run-up, so one state
     holds where in it we are rather than three booleans that can disagree */
  const [letterStep, setLetterStep] = useState<null | 'template' | 'setup' | 'writer' | 'design'>(null)
  const [carePlan, setCarePlan] = useState<CarePlanKey>('needs')
  const [section, setSection] = useState(() => chartScreens[start.node] ?? moduleScreens[start.node] ?? chartScreens.summary)
  const [report, setReport] = useState(reportScreens.imaging)
  const [dayGrid, setDayGrid] = useState({ columns: 3, mode: 'day' as 'day' | 'week', title: 'Day View' })
  /* the last tab a screen reported; screens own their tab state, so this is
     cleared whenever the navigator moves on */
  const [tab, setTab] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const desktopRef = useRef<HTMLDivElement>(null)
  const frame = useFrameGeometry(desktopRef, windowSize)

  const onActionRef = useRef(onAction)
  onActionRef.current = onAction
  const report_ = useCallback((id: string, payload?: HostRecord, result?: HostValue) => {
    onActionRef.current?.(id, payload, result)
  }, [])

  const current = MODULE_TREES[module]
  const tree: PBTreeNode[] = current.tree
  const isScheduler = module === 'scheduler'

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      const open = !next.has(id)
      open ? next.add(id) : next.delete(id)
      report_('host.mois.toggleNode', { node: id, expanded: open })
      return next
    })
  }, [report_])

  /* purpose-built screens win; everything else falls to the shared
     chart-section window, so no tree node is a dead end */
  const routeNode = useCallback((id: string, inScheduler: boolean) => {
    if (inScheduler) {
      if (DAY_GRIDS[id]) { setDayGrid(DAY_GRIDS[id]); setView('daygrid'); return }
      if (ROUTES[id]) { setView(ROUTES[id]); return }
      if (schedulerScreens[id]) { setSection(schedulerScreens[id]); setView('section'); return }
      setView('scheduler')
      return
    }
    if (MODULE_ROOTS[id]) { setSection(moduleScreens[MODULE_ROOTS[id]]); setView('section'); return }
    if (reportScreens[id]) { setReport(reportScreens[id]); setView('report'); return }
    if (CARE_PLAN[id]) { setCarePlan(CARE_PLAN[id]); setView('careplan'); return }
    if (ROUTES[id]) { setView(ROUTES[id]); return }
    if (chartScreens[id]) { setSection(chartScreens[id]); setView('section'); return }
    if (moduleScreens[id]) { setSection(moduleScreens[id]); setView('section'); return }
    const label = labelOf(MODULE_TREES[moduleOfNode(id) ?? 'chart']?.tree ?? [], id)
    if (label) { setSection(fallbackScreen(label)); setView('section'); return }
    setView('order')
  }, [])

  const selectNode = useCallback((id: string) => {
    setRecordSelection(null)
    setSelected(id)
    setTab(null)
    routeNode(id, isScheduler)
    report_('host.mois.selectNode', { node: id })
  }, [isScheduler, report_, routeNode])

  const pickModule = useCallback((id: string) => {
    const m = MODULE_TREES[id]
    if (!m) throw new Error(`Unknown MOIS module: ${id}`)
    setModule(id)
    setSelected(m.first)
    setTab(null)
    if (id === 'scheduler') setView('scheduler')
    else if (id === 'chart') setView('order')
    /* route the module's first node the way a click on it would: some of them
       (Administration ▸ System Settings) have a window of their own rather
       than a generic section screen */
    else routeNode(m.first, false)
    report_('host.mois.selectModule', { module: id })
  }, [report_, routeNode])

  /* autoplay opens a nested node the learner never expanded: switch to its
     module, open every ancestor, then select it exactly as a click would */
  const openNode = useCallback((id: string, recordId?: string) => {
    setRecordSelection(recordId ? { chart, node: id, id: recordId } : null)
    const owner = moduleOfNode(id)
    if (!owner) throw new Error(`Unknown MOIS tree node: ${id}`)
    const ancestors = ancestorsOf(MODULE_TREES[owner].tree, id) ?? []
    if (owner !== module) {
      setModule(owner)
    }
    setExpanded((prev) => {
      const next = new Set(prev)
      ancestors.forEach((a) => next.add(a))
      return next
    })
    setSelected(id)
    setTab(null)
    routeNode(id, owner === 'scheduler')
    report_('host.mois.selectNode', { node: id })
  }, [chart, module, report_, routeNode])

  const openEncounter = useCallback((row: EncounterRecord) => {
    mdi.open({
      kind: 'encounter',
      key: `encounter:${chart}:${row.id}`,
      title: `Encounter ${row.id}`,
      props: { encounter: row, loadEncounterForms, encounterFormSlot },
    })
    report_('host.mois.openWindow', { kind: 'encounter' })
  }, [chart, mdi, report_, loadEncounterForms, encounterFormSlot])

  const closeDialogs = useCallback(() => {
    setReminderChart(null)
    setServiceEventOpen(false)
    setGoalOpen(false)
    setLoginOpen(false)
    setLookupOpen(false)
    setNewApptOpen(false)
    setClaimPrompt(null)
    setPrintParams(null)
    setPrintOutput(null)
    setFindPatientOpen(false)
    setChartNavOpen(false)
    setChartSearchOpen(false)
    setReviewOpen(false)
    setOrderLinkOpen(false)
    setTagCarePlanOpen(false)
    setAttachmentOpen(false)
    setCdxDetail(false)
    setCdxNavigator(false)
    setLetterStep(null)
    report_('host.mois.closeDialog')
  }, [report_])

  const previousChart = useRef(chart)
  useLayoutEffect(() => {
    if (previousChart.current === chart) return
    previousChart.current = chart
    mdi.closeAll()
    closeDialogs()
    const reminders = dueOpeningReminders(findPatient(chart, roster), MOIS_TODAY)
    setReminderChart(reminders.some((reminder) => !stoppedReminders.has(`${chart}:${reminder.code}`)) ? chart : null)
    setEncounterDraft(false)
  }, [chart, mdi.closeAll, closeDialogs, roster, stoppedReminders])

  /* picking a row in the Advanced Lookup Service is what changes the chart */
  const selectPatient = useCallback((next: string) => {
    if (!findPatient(next, roster)) throw new Error(`No MOIS chart ${next} is on file.`)
    setOwnChart(next)
    onChartChange?.(next)
    setLookupOpen(false)
    const reminders = dueOpeningReminders(findPatient(next, roster), MOIS_TODAY)
    setReminderChart(reminders.some((reminder) => !stoppedReminders.has(`${next}:${reminder.code}`)) ? next : null)
    report_('host.mois.selectPatient', { chart: next })
  }, [onChartChange, report_, roster, stoppedReminders])

  const openLookup = useCallback(() => setLookupOpen(true), [])

  /* the day book's date navigator; the frame holds the day so a lesson can
     check where a move landed */
  const moveDaybook = useCallback((move: DaybookMove) => {
    setDaybook((prev) => daybookOffsetAfter(prev, move))
  }, [])

  /* instrumented kit controls (command rows, tabs, menus) report through here */
  /* the callback is created once; read the current node through a ref */
  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])

  const onKitAction = useCallback((action: string, payload?: PBInstrumentationPayload) => {
    if (action === 'host.mois.selectTab' && typeof payload?.tab === 'string') setTab(payload.tab)
    /* Taskbar buttons that raise a utility window. Without this the button is
       instrumented but inert: `host.mois.openUtility` opens the window, so a
       lesson passes in autoplay while the same step in practice mode waits on a
       click that does nothing. The folder gates are MOIS's own — Search sits
       only on Patient Summary and Demographics, Review only on the three
       folders that carry a review history, Link to Order only where a record
       can belong to one. */
    if (action === 'host.mois.command' && typeof payload?.command === 'string') {
      const on = (...nodes: string[]) => nodes.includes(selectedRef.current)
      if (payload.command === 'search' && on('summary', 'demographic')) setChartSearchOpen(true)
      if (payload.command === 'review' && on('reaction', 'ltm', 'conditions')) setReviewOpen(true)
      if (payload.command === 'link-to-order' && on('measures', 'imaging', 'consults', 'procedures')) {
        setOrderLinkOpen(true)
      }
    }
    /* the kit only knows a "…" was pressed; the frame knows it opens the
       chart lookup, so it is the frame that reports the dialog that follows */
    const opensLookup = action === 'host.mois.lookup'
      || (action === 'host.mois.status' && payload?.link === 'go-to-chart')
    report_(action, { ...(payload as HostRecord | undefined), ...(opensLookup ? { dialog: 'chart-lookup' } : {}) })
  }, [report_])

  /* The open chart's own records, when it has an export behind it.

     The export is a lazy chunk. Rows stay empty until it arrives;
     `loadedChart` then re-runs the lookup and resets the selected detail. */
  const [loadedChart, setLoadedChart] = useState<string | null>(null)
  useEffect(() => {
    if (!hasChartExport(chart)) return
    let live = true
    void loadChartExport(chart).then(() => { if (live) setLoadedChart(chart) }).catch(() => { if (live) setLoadedChart(null) })
    return () => { live = false }
  }, [chart])
  const exportRows = useMemo(
    () => chartRowsFor(chart, selected),
    /* loadedChart is a dependency even though it is not read: it is the signal
       that the cache `chartRowsFor` reads has been filled */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chart, selected, loadedChart],
  )

  /* topmost first: the Chart Navigator is opened from the Find Patient window
     and paints over it, so it has to win the chain. */
  const dialog = reminderChart === chart ? 'opening-chart-reminder'
    : cdxNavigator ? 'record-navigator'
    : cdxDetail ? 'patient-message-detail'
    : letterStep === 'template' ? 'select-letter-template'
    : letterStep === 'setup' ? 'letter-setup'
    : letterStep === 'writer' || letterStep === 'design' ? 'letter-writer'
    : chartNavOpen ? 'chart-navigator'
    : findPatientOpen ? 'find-patient'
    : attachmentOpen ? 'add-attachment'
    : chartSearchOpen ? 'advance-chart-search'
    : reviewOpen ? 'reviewing'
    : orderLinkOpen ? 'order-linking-service'
    : tagCarePlanOpen ? 'tag-to-care-plan'
    : printOutput ? 'print-report'
    : printParams ? 'print-params'
      : claimPrompt ? `claim-${claimPrompt}`
    : newApptOpen ? 'new-appointment'
    : lookupOpen ? 'chart-lookup'
    : serviceEventOpen ? 'service-event'
      : goalOpen ? 'new-goal'
        : loginOpen ? 'login' : null
  const state = useMemo<HostRecord>(() => ({
    module,
    node: selected,
    view,
    tab,
    dialog,
    reminderStopped: (() => {
      const due = dueOpeningReminders(findPatient(chart, roster), MOIS_TODAY)
      return due.length > 0 && due.every((reminder) => stoppedReminders.has(`${chart}:${reminder.code}`))
    })(),
    patient: chart,
    windows: mdi.instances.length,
    draft: encounterDraft,
    invoice: invoicePaid ? 'paid' : 'open',
    appt: apptStatuses[apptRow] ?? '',
    booked: booked.length,
    basket: basketAck,
    billed: billedRows.size,
    daybook: daybookStamp(daybook),
    provider: pbSlug(daybookProvider),
    theme: theme === '' ? 'hybrid' : theme === 'pb-theme--flat' ? 'flat' : 'classic',
  }), [apptRow, apptStatuses, basketAck, billedRows.size, booked.length, chart, claimPrompt, printOutput, printParams, daybook, daybookProvider, dialog, encounterDraft, invoicePaid, mdi.instances.length, module, roster, selected, stoppedReminders, tab, theme, view])
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => { onStateChange?.(state) }, [onStateChange, state])

  /* exact-attribute lookup inside this shell only: ids never become selector text */
  const clickAnchor = useCallback((id: string) => {
    const root = rootRef.current
    if (!root) throw new Error('The MOIS shell is not mounted.')
    for (const el of root.querySelectorAll<HTMLElement>('[data-tutorial-id]')) {
      if (el.getAttribute('data-tutorial-id') === id) {
        if (el.hasAttribute('disabled')) throw new Error(`${id} is disabled on this screen.`)
        el.click()
        return
      }
    }
    throw new Error(`No MOIS control is on screen for ${id}.`)
  }, [])

  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  const api = useMemo<HostShellApi>(() => ({
    getState: () => stateRef.current,
    perform: async (actionId, args = {}) => {
      const slug = (key: string) => {
        const value = args[key]
        if (typeof value !== 'string' || !value) throw new Error(`${actionId} needs a "${key}" argument.`)
        return value
      }
      switch (actionId) {
        case 'host.mois.selectModule': pickModule(slug('module')); return undefined
        case 'host.mois.selectNode': openNode(slug('node')); return undefined
        case 'host.mois.toggleNode': toggle(slug('node')); return undefined
        case 'host.mois.command': clickAnchor(`host.mois.command.${slug('command')}`); return undefined
        case 'host.mois.selectTab': clickAnchor(`host.mois.tab.${slug('tab')}`); return undefined
        /* the AS cell on the day book's current row, or on args.row */
        case 'host.mois.apptStatus': {
          const row = typeof args.row === 'number' ? args.row : apptRow
          const code = String(args.status ?? '').toUpperCase()
          if (!code) throw new Error(`${actionId}: no status given`)
          setApptRow(row)
          setApptStatuses((m) => ({ ...m, [row]: code }))
          return undefined
        }
        /* tick one basket row's Check box, by the patient's surname slug */
        case 'host.mois.acknowledge': {
          clickAnchor(`host.mois.check.${slug('patient')}`)
          return undefined
        }
        case 'host.mois.print': {
          const menu = String(args.menu ?? '')
          const found = printReportByMenu(menu)
          if (!found) throw new Error(`${actionId}: no Selection Parameter window for "${menu}".`)
          const stage = args.stage === 'report' ? 'report' : 'params'
          if (stage === 'report') { setPrintParams(null); setPrintOutput(found) }
          else { setPrintOutput(null); setPrintParams(found) }
          return undefined
        }
        case 'host.mois.claimPrompt': {
          const want = String(args.prompt ?? '')
          if (!['patient', 'doctor', 'service', 'chart', 'recon'].includes(want)) {
            throw new Error(`${actionId}: unknown claim lookup "${want}".`)
          }
          openNode(want === 'chart' || want === 'recon' ? 'bl-sent' : 'bl-unsent')
          await nextFrame()
          setClaimPrompt(want as ClaimPrompt)
          return undefined
        }
        case 'host.mois.openFolder': {
          /* a banded folder's +/- box (the Report List's sixteen). Opening an
             already-open folder does nothing, so a replay is idempotent. */
          const id = `host.mois.group.${slug('group')}`
          const root = rootRef.current
          if (!root) throw new Error('The MOIS shell is not mounted.')
          let band: HTMLElement | undefined
          for (const el of root.querySelectorAll<HTMLElement>('[data-tutorial-id]')) {
            if (el.getAttribute('data-tutorial-id') === id) { band = el; break }
          }
          if (!band) throw new Error(`No folder is on screen for ${id}.`)
          const box = band.querySelector<HTMLElement>('.pb-dw__groupbox')
          if (!box) throw new Error(`${id} has no +/- box.`)
          if (box.dataset.state === 'shut') box.click()
          return undefined
        }
        case 'host.mois.menu': {
          const menu = slug('menu')
          clickAnchor(`host.mois.menu.${menu}`)
          await nextFrame()
          clickAnchor(`host.mois.menu.${menu}.${slug('item')}`)
          return undefined
        }
        case 'host.mois.openWindow': {
          /* replays a double-click on a grid row: the first encounter, or
             the one at args.index, opens in its own MDI window */
          if (args.kind !== undefined && args.kind !== 'encounter') throw new Error(`${actionId}: unknown window kind ${String(args.kind)}`)
          const index = typeof args.index === 'number' ? args.index : 0
          await loadChartExport(chart)
          if (previousChart.current !== chart) throw new Error(`${actionId}: chart changed while opening encounter`)
          const row = chartRowsFor(chart, 'encounters')[index] as EncounterRecord | undefined
          if (!row) throw new Error(`${actionId}: no encounter row ${index}`)
          openNode('encounters')
          await nextFrame()
          if (previousChart.current !== chart) throw new Error(`${actionId}: chart changed while opening encounter`)
          openEncounter(row)
          return undefined
        }
        case 'host.mois.lookup': {
          /* the "…" lives on Patient Summary, so open that first */
          openNode('summary')
          await nextFrame()
          clickAnchor(`host.mois.lookup.${typeof args.field === 'string' ? args.field : 'chart'}`)
          return undefined
        }
        case 'host.mois.selectPatient': selectPatient(slug('chart')); return undefined
        case 'host.mois.status': clickAnchor(`host.mois.status.${slug('link')}`); return undefined
        case 'host.mois.closeDialog': closeDialogs(); return undefined
        case 'host.mois.stopReminder': {
          const index = typeof args.index === 'number' ? args.index : 0
          const reminder = dueOpeningReminders(findPatient(chart, roster), MOIS_TODAY)[index]
          if (!reminder) throw new Error(`${actionId}: no reminder row ${index}`)
          const stopped = args.stopped !== false
          setStoppedReminders((previous) => {
            const next = new Set(previous)
            stopped ? next.add(`${chart}:${reminder.code}`) : next.delete(`${chart}:${reminder.code}`)
            return next
          })
          return undefined
        }
        case 'host.mois.openUtility': {
          const which = slug('window')
          /* each utility window is invoked from a folder and takes its variant
             from it, so open the folder first, exactly as pressing the Taskbar
             button does. FindPatientDialog and ReviewingDialog render null for
             a folder they have no variant or noun for, which is why these
             defaults matter. */
          const folder = typeof args.node === 'string' ? args.node
            : which === 'find-patient' || which === 'reviewing' ? 'conditions'
            : which === 'tag-to-care-plan' ? 'consults'
            : which === 'advance-chart-search' ? 'summary'
            : which === 'order-linking-service' ? 'measures'
            : which === 'add-attachment' ? 'encounters' : undefined
          if (folder) { openNode(folder); await nextFrame() }
          switch (which) {
            case 'find-patient': setFindPatientOpen(true); return undefined
            case 'chart-navigator': setChartNavOpen(true); return undefined
            case 'advance-chart-search': setChartSearchOpen(true); return undefined
            case 'reviewing': setReviewOpen(true); return undefined
            case 'order-linking-service': setOrderLinkOpen(true); return undefined
            case 'tag-to-care-plan': setTagCarePlanOpen(true); return undefined
            case 'add-attachment': setAttachmentOpen(true); return undefined
            default: throw new Error(`${actionId}: unknown utility window "${which}"`)
          }
        }
        case 'host.mois.daybookFor': {
          const want = typeof args.provider === 'string' ? args.provider : ''
          const found = daybookProviders.find((p) => pbSlug(p.provider) === want)
          if (!found) throw new Error(`No MOIS provider matches "${want}".`)
          openNode('p-daybook')
          setDaybookProvider(found.provider)
          return undefined
        }
        case 'host.mois.daybook': {
          const move = typeof args.move === 'string' ? args.move : 'today'
          moveDaybook(move as DaybookMove)
          return undefined
        }
        default: throw new Error(`This MOIS action is not available: ${actionId}`)
      }
    },
  }), [apptRow, chart, clickAnchor, closeDialogs, moveDaybook, openEncounter, openNode, pickModule, roster, selectPatient, toggle])

  useEffect(() => { onReady?.(api) }, [api, onReady])

  const menu = makeMainMenu(setTheme, setTextMode, () => setLoginOpen(true), mdi, onOpenKit, {
    node: openNode,
    module: pickModule,
    lookup: openLookup,
    stepChart: (delta) => selectPatient(stepChart(chart, delta, roster)),
    print: (menu) => {
      const found = printReportByMenu(menu)
      if (!found) return
      /* A report with no Selection Parameter fields — the problem list, the
         family history, the social history — goes straight to the preview in
         MOIS: there is nothing to ask for. This branch has to match
         `host.mois.print` above, because a lesson in practice mode drives this
         path with a real click while autoplay drives the action, and the two
         diverging is invisible to every test we have. */
      if (found.fields.length === 0) { setPrintParams(null); setPrintOutput(found) }
      else { setPrintOutput(null); setPrintParams(found) }
    },
    letter: () => setLetterStep('template'),
  })
  const status = makeStatusCells(openLookup)
  const sectionContent: ReactNode = selected === 'dynamic' && formSlot ? formSlot : undefined

  return (
    <PBInstrumentationProvider namespace="host.mois" onAction={onKitAction}>
    <PatientProvider key={chart} chart={chart} roster={roster}>
    <div ref={rootRef} className={cx('pb-root', 'pb-host', theme, textMode, className)}>
      <div
        className="pb-desktop"
        data-tutorial-id="host.mois.desktop"
        ref={desktopRef}
        /* the move/resize drag is captured by the window, but the pointer
           travels across the desktop while it runs */
        onPointerMove={frame.onPointerMove}
        onPointerUp={frame.endDrag}
        onPointerCancel={frame.endDrag}
      >
        <PBWindow
          title="MOIS: MOIS DEV"
          /* PB windows do not reflow — they have a minimum size and the
             desktop scrolls underneath them. */
          style={frame.style}
          maximized={frame.maximized}
          onMaximize={frame.toggleMaximized}
          onMovePointerDown={frame.onMovePointerDown}
          onResizePointerDown={frame.onResizePointerDown}
        >
          <PBMenuBar items={menu} />

          {/* "Desktop For:" strip that floats at the top right of the MDI frame */}
          <div style={{ position: 'relative', height: 0 }}>
            <div className="pb-row" style={{ position: 'absolute', right: 8, top: -21, zIndex: 5 }}>
              <span>Desktop For:</span>
              <span style={{
                width: 210, height: 17, padding: '0 4px',
                background: 'var(--pb-yellow)', border: '1px solid var(--pb-border)',
              }}>
                TECHNICAL SUPPORT
              </span>
            </div>
          </div>

          <div className="pb-split">
            {/* ---- left navigation ---- */}
            <div className="pb-panel" style={{ width: 186, flex: 'none', padding: '0 2px 2px' }} data-tutorial-id="host.mois.navigator">
              {/* the module header measures 25 in the captures, the same band
                  the view header beside it occupies */}
              <div className="pb-viewhead" style={{ height: 25.5 }}>
                <span className="pb-viewhead__title">{current.label}</span>
              </div>
              <PBTree
                nodes={tree}
                selected={selected}
                onSelect={selectNode}
                expanded={expanded}
                onToggle={toggle}
                getTutorialId={(id) => `host.mois.tree.${id}`}
                /* only the Workspace draws buttons on its root folders — see
                   PBTree, where the three captures are cited */
                rootButtons={module === 'workspace'}
              />
              <PBModuleBar
                modules={modules}
                active={module}
                onSelect={pickModule}
                getTutorialId={(id) => `host.mois.module.${id}`}
              />
            </div>

            <div className="pb-split__gutter" />

            {/* ---- right work area ---- */}
            <div key={`${chart}:${selected}:${loadedChart === chart}`} className="pb-panel" style={{ flex: '1 1 auto', position: 'relative' }} data-tutorial-id="host.mois.workarea">
              {view === 'summary' && (
                <PatientSummaryView
                  key={chart}
                  onLookup={openLookup}
                  onStepChart={(delta) => selectPatient(stepChart(chart, delta, roster))}
                  onOpenChart={(next) => { if (findPatient(next, roster)) selectPatient(next) }}
                  onOpenSection={openNode}
                />
              )}
              {view === 'scheduler' && (
                <SchedulerView
                  offset={daybook}
                  onMove={moveDaybook}
                  provider={daybookProvider}
                  onProvider={setDaybookProvider}
                  apptRow={apptRow}
                  apptStatuses={apptStatuses}
                  booked={booked}
                  billedRows={billedRows}
                  onBill={(row) => setBilledRows((b) => new Set(b).add(row))}
                  onNewAppt={() => setNewApptOpen(true)}
                  onApptRow={setApptRow}
                  onApptStatus={(row, code) => {
                    setApptRow(row)
                    setApptStatuses((m) => ({ ...m, [row]: code }))
                  }}
                />
              )}
              {view === 'resourcebook' && <SchedulerView mode="resource" offset={daybook} onMove={moveDaybook} />}
              {view === 'order' && <OrderView onAttachment={() => setServiceEventOpen(true)} />}
              {view === 'settings' && <SystemSettingsView />}
              {view === 'userlanding' && <UserManagementLanding />}
              {view === 'providerworkload' && <ProviderWorkloadView offset={daybook} onMove={moveDaybook} onOpen={(provider) => { setDaybookProvider(provider); selectNode('p-daybook') }} />}
              {view === 'wssummary' && <WorkspaceSummaryView />}
              {view === 'reportlist' && <ReportListView />}
              {view === 'basket' && (
                <BasketFolderView
                  node={selected}
                  onOpenChart={() => openNode('summary')}
                  onAcknowledged={setBasketAck}
                />
              )}
              {view === 'billingadmin' && <BillingAdminView node={selected} />}
              {view === 'cliniclist' && <ClinicListView node={selected} />}
              {view === 'designer' && <DesignerSectionView node={selected} />}
              {view === 'usermgt' && <UserManagementView node={selected} />}
              {view === 'cdxinbound' && (
                <InboundMessagesView
                  onOpenDetail={() => setCdxDetail(true)}
                  onTearOff={() => setCdxNavigator(true)}
                />
              )}
              {view === 'cdxoutbound' && <OutboundMessagesView onOpenChart={() => openNode('summary')} />}
              {view === 'tasklist' && (
                <TaskListView node={selected} onOpenChart={() => openNode('summary')} />
              )}
              {view === 'unsentmsp' && <UnsentMspView onPrompt={setClaimPrompt} />}
              {view === 'sentmsp' && <SentMspView onPrompt={setClaimPrompt} />}
              {view === 'invoice' && <InvoiceView paid={invoicePaid} onPaid={() => setInvoicePaid(true)} />}
              {view === 'encounters' && (
                <EncounterListView
                  onOpen={openEncounter}
                  draft={encounterDraft}
                  onDraft={setEncounterDraft}
                />
              )}
              {view === 'demographics' && <DemographicsView />}
              {view === 'notifications' && <NotificationView />}
              {view === 'groupvisit' && <GroupVisitView />}
              {view === 'careplan' && <CarePlanView screen={carePlan} />}
              {/* New Record on the Goals screen is what opens the dialog */}
              {view === 'goals' && <GoalsView onNew={() => setGoalOpen(true)} />}
              {/* Patient records come only from this chart; missing exports stay empty */}
              {view === 'report' && (
                <ClinicalReportView
                  node={selected} screen={{ ...report, rows: exportRows }}
                  initialRecordId={recordSelection?.chart === chart && recordSelection.node === selected ? recordSelection.id : undefined}
                />
              )}
              {view === 'mar' && <MarView />}
              {view === 'determinants' && <DeterminantsView />}
              {view === 'rx' && <MedicationView mode="rx" />}
              {view === 'ltm' && <MedicationView mode="ltm" />}
              {view === 'printhx' && <PrintHistoryView />}
              {view === 'waitprov' && <WaitingListView mode="provider" />}
              {view === 'waitres' && <WaitingListView mode="resource" />}
              {view === 'section' && section.title === 'Care Plan' && <CarePlanSummaryView key={chart} screen={{ ...section, rows: chartRowsFor(chart, selected) }} />}
              {view === 'section' && section.title !== 'Care Plan' && (
                <ChartSectionView
                  screen={module === 'chart' ? { ...section, rows: exportRows } : section}
                  content={sectionContent}
                />
              )}
              {view === 'daygrid' && (
                <DayGridView columns={dayGrid.columns} mode={dayGrid.mode} title={dayGrid.title} />
              )}

              {goalOpen && <GoalDialog onClose={closeDialogs} />}
            </div>
          </div>

          <PBStatusBar cells={status} />
        </PBWindow>

        {/* ---- MDI sheets: one per open record ---- */}
        <PBMdiHost classes={WINDOW_CLASSES} />

        {/* modal child window — layered above the MDI frame and any child */}
        {reminderChart === chart && findPatient(chart, roster) && (
          <OpeningChartReminderDialog
            patient={findPatient(chart, roster)!}
            reminders={dueOpeningReminders(findPatient(chart, roster), MOIS_TODAY)}
            stopped={stoppedReminders}
            onStop={(index, value) => {
              const reminder = dueOpeningReminders(findPatient(chart, roster), MOIS_TODAY)[index]
              if (!reminder) return
              setStoppedReminders((previous) => {
                const next = new Set(previous)
                value ? next.add(`${chart}:${reminder.code}`) : next.delete(`${chart}:${reminder.code}`)
                return next
              })
              report_('host.mois.stopReminder', { index, stopped: value })
            }}
            onClose={closeDialogs}
          />
        )}
        {serviceEventOpen && <ServiceEventDialog onClose={closeDialogs} />}
        {loginOpen && <LoginDialog onClose={closeDialogs} />}
        {printOutput && (
          <RichtextReportWindow report={printOutput} onClose={() => setPrintOutput(null)} />
        )}
        {printParams && !printOutput && (
          <SelectionParameterDialog
            report={printParams}
            onOk={() => { setPrintOutput(printParams); setPrintParams(null) }}
            onClose={() => setPrintParams(null)}
          />
        )}
        {claimPrompt && (
          <ClaimPromptDialog
            prompt={claimPrompt}
            onPick={() => setClaimPrompt(null)}
            onClose={() => setClaimPrompt(null)}
          />
        )}
        {newApptOpen && (
          <NewAppointmentDialog
            provider={daybookProvider}
            day={daybookStamp(daybook)}
            onSave={(draft) => { setBooked((b) => [...b, bookedAppointment(draft)]); setNewApptOpen(false) }}
            onClose={() => setNewApptOpen(false)}
          />
        )}
        {lookupOpen && (
          <AdvancedLookupDialog
            chart={chart}
            roster={roster}
            onPick={selectPatient}
            onClose={() => setLookupOpen(false)}
          />
        )}
        {findPatientOpen && (
          <FindPatientDialog
            node={selected}
            onChartNavigator={() => setChartNavOpen(true)}
            onSelect={(next) => { selectPatient(next); setFindPatientOpen(false) }}
            onClose={() => setFindPatientOpen(false)}
          />
        )}
        {chartNavOpen && (
          <ChartNavigatorWindow onOpenChart={selectPatient} onClose={() => setChartNavOpen(false)} />
        )}
        {/* Ok opens a Search Results dialog that is nowhere in the corpus, so
            it only closes rather than showing an invented results window. */}
        {chartSearchOpen && (
          <AdvanceChartSearchDialog
            onOk={() => setChartSearchOpen(false)}
            onClose={() => setChartSearchOpen(false)}
          />
        )}
        {reviewOpen && <ReviewingDialog node={selected} onClose={() => setReviewOpen(false)} />}
        {orderLinkOpen && (
          <OrderLinkingServiceDialog
            onLink={() => setOrderLinkOpen(false)}
            onClose={() => setOrderLinkOpen(false)}
          />
        )}
        {tagCarePlanOpen && (
          <TagToCarePlanDialog
            node={selected}
            onOk={() => setTagCarePlanOpen(false)}
            onClose={() => setTagCarePlanOpen(false)}
          />
        )}
        {attachmentOpen && (
          <AddAttachmentDialog
            onOk={() => setAttachmentOpen(false)}
            onClose={() => setAttachmentOpen(false)}
          />
        )}
        {cdxDetail && <PatientMessageDetailWindow onClose={() => setCdxDetail(false)} />}
        {cdxNavigator && <RecordNavigatorWindow onClose={() => setCdxNavigator(false)} />}
        {letterStep === 'template' && (
          <SelectLetterTemplateDialog
            onSelect={() => setLetterStep('setup')}
            onClose={() => setLetterStep(null)}
          />
        )}
        {letterStep === 'setup' && (
          <LetterSetupWindow onContinue={() => setLetterStep('writer')} onClose={() => setLetterStep(null)} />
        )}
        {letterStep === 'writer' && <LetterWriterWindow onClose={() => setLetterStep(null)} />}
        {letterStep === 'design' && <LetterWriterWindow mode="template" onClose={() => setLetterStep(null)} />}
      </div>
    </div>
    </PatientProvider>
    </PBInstrumentationProvider>
  )
}
