import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  PBInstrumentationProvider, PBMdiHost, PBMdiProvider, PBMenuBar, PBModuleBar, PBStatusBar, PBTree, PBWindow,
  useMdi, type PBInstrumentationPayload, type PBTreeNode, type PBWindowClass,
} from '../pb'
import {
  adminTree, billingTree, encounterRows, exchangeTree, makeMainMenu, makeStatusCells, modules,
  patientChartTree, reportsTree, schedulerTree, workspaceTree,
  type CarePlanKey, type PBTheme,
} from '../data/mois'
import {
  DEFAULT_CHART, findPatient, normalizePatient, patients as trainingRoster, stepChart, type Patient,
} from '../data/patients'
import { PatientProvider } from '../data/patient-context'
import { PatientSummaryView } from '../screens/PatientSummaryView'
import { AdvancedLookupDialog } from '../screens/AdvancedLookupDialog'
import { EncounterListView, OrderView } from '../screens/OrderView'
import { SchedulerView } from '../screens/SchedulerView'
import { DemographicsView } from '../screens/DemographicsView'
import { NotificationView } from '../screens/NotificationView'
import { GroupVisitView } from '../screens/GroupVisitView'
import { CarePlanView } from '../screens/CarePlanView'
import { GoalsView } from '../screens/GoalsView'
import { ClinicalReportView } from '../screens/ClinicalReportView'
import { reportScreens } from '../data/reportScreens'
import { ChartSectionView } from '../screens/ChartSectionView'
import { DayGridView } from '../screens/DayGridView'
import { LoginDialog } from '../screens/LoginDialog'
import { MedicationView, PrintHistoryView } from '../screens/MedicationView'
import { WaitingListView } from '../screens/WaitingListView'
import { MarView } from '../screens/MarView'
import { DeterminantsView } from '../screens/DeterminantsView'
import { chartScreens, moduleScreens, schedulerScreens } from '../data/chartScreens'
import { EncounterWindow, type EncounterRecord } from '../screens/EncounterWindow'
import { ServiceEventDialog } from '../screens/ServiceEventDialog'
import { GoalDialog } from '../screens/GoalDialog'
import '../pb/kit.css'
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
  | 'summary' | 'order' | 'encounters' | 'scheduler' | 'demographics' | 'notifications'
  | 'groupvisit' | 'careplan' | 'goals' | 'imaging' | 'resourcebook' | 'section' | 'daygrid' | 'rx' | 'ltm' | 'printhx' | 'waitprov' | 'waitres' | 'report' | 'mar' | 'determinants'

/* The MDI window classes this frame can instantiate. Each is opened by key,
   so the same record never opens twice. */
const WINDOW_CLASSES: Record<string, PBWindowClass> = {
  encounter: ({ encounter, onClose }: { encounter: EncounterRecord; onClose: () => void }) => (
    <EncounterWindow encounter={encounter} onClose={onClose} onAttachment={() => {}} />
  ),
}

const DEFAULT_EXPANDED = [
  'summary', 'allergy', 'rx', 'issues', 'careplan', 'forms',
  'prov', 'res', 'waiting', 'blocks', 'shift',
  'ws', 'bl', 'ad', 'dx', 'rp',
]

const MODULE_TREES: Record<string, { tree: PBTreeNode[]; label: string; first: string }> = {
  chart:     { tree: patientChartTree, label: 'Patient Chart',  first: 'orders' },
  workspace: { tree: workspaceTree,    label: 'Workspace',      first: 'ws-inbox' },
  scheduler: { tree: schedulerTree,    label: 'Scheduler',      first: 'p-daybook' },
  billing:   { tree: billingTree,      label: 'Billing',        first: 'bl-claims' },
  admin:     { tree: adminTree,        label: 'Administration', first: 'ad-users' },
  exchange:  { tree: exchangeTree,     label: 'Data Exchange',  first: 'dx-inbound' },
  reports:   { tree: reportsTree,      label: 'Reports',        first: 'rp-clinical' },
}

/* Tree nodes that have a screen behind them. Everything else falls back to
   the shared chart-section window, the way an unimplemented MOIS node lands
   somewhere. */
const ROUTES: Record<string, View> = {
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
  prov: 'scheduler',
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
const MODULE_ROOTS: Record<string, string> = {
  ws: 'ws-inbox', bl: 'bl-claims', ad: 'ad-users', dx: 'dx-inbound', rp: 'rp-clinical',
}

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
   it is an ordinary movable, resizable window. `MIN_W` is the width below
   which the PowerBuilder window stops shrinking and the desktop scrolls
   instead — real MOIS behaves the same way, and it is worth being able to see.
   ------------------------------------------------------------------------ */
const FRAME_INSET = { left: 24, top: 18, bottom: 18 }
const MIN_W = 1180
const MIN_H = 420

type Rect = { left: number; top: number; width: number; height: number }

function useFrameGeometry(desktopRef: React.RefObject<HTMLDivElement | null>) {
  const [maximized, setMaximized] = useState(true)
  const [rect, setRect] = useState<Rect | null>(null)
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
    if (!maximized && rect) return rect
    return {
      left: FRAME_INSET.left,
      top: FRAME_INSET.top,
      width: Math.max(MIN_W, width - FRAME_INSET.left * 2),
      height: Math.max(MIN_H, height - FRAME_INSET.top - FRAME_INSET.bottom),
    }
  }, [desktopRef, maximized, rect])

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
        left: FRAME_INSET.left,
        top: FRAME_INSET.top,
        bottom: FRAME_INSET.bottom,
        width: `calc(100% - ${FRAME_INSET.left * 2}px)`,
        minWidth: MIN_W,
      }
    : { position: 'absolute', ...(rect ?? current()), minWidth: MIN_W }

  return { maximized, style, toggleMaximized, onMovePointerDown, onResizePointerDown, onPointerMove, endDrag }
}

export interface MoisClassicShellProps extends HostShellProps {
  /** Standalone viewer only: adds Help ▸ UI Kit gallery. */
  onOpenKit?: () => void
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
  onAction, onStateChange, onReady, formSlot, className, onOpenKit,
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(DEFAULT_EXPANDED))
  const mdi = useMdi()
  const [serviceEventOpen, setServiceEventOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [theme, setTheme] = useState<PBTheme>('')
  const [loginOpen, setLoginOpen] = useState(false)
  /* the open chart: MOIS holds one at a time and every window reads it. The
     host may own it (so its own patient picker and this frame agree), in which
     case chartProp leads and onChartChange reports every change. */
  const [ownChart, setOwnChart] = useState(DEFAULT_CHART)
  const chart = chartProp ?? (findPatient(ownChart, roster) ? ownChart : roster[0]?.chart ?? ownChart)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [carePlan, setCarePlan] = useState<CarePlanKey>('needs')
  const [section, setSection] = useState(() => chartScreens[start.node] ?? moduleScreens[start.node] ?? chartScreens.summary)
  const [report, setReport] = useState(reportScreens.imaging)
  const [dayGrid, setDayGrid] = useState({ columns: 3, mode: 'day' as 'day' | 'week', title: 'Day View' })
  /* the last tab a screen reported; screens own their tab state, so this is
     cleared whenever the navigator moves on */
  const [tab, setTab] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const desktopRef = useRef<HTMLDivElement>(null)
  const frame = useFrameGeometry(desktopRef)

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
    setView('order')
  }, [])

  const selectNode = useCallback((id: string) => {
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
    else { setSection(moduleScreens[m.first]); setView('section') }
    report_('host.mois.selectModule', { module: id })
  }, [report_])

  /* autoplay opens a nested node the learner never expanded: switch to its
     module, open every ancestor, then select it exactly as a click would */
  const openNode = useCallback((id: string) => {
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
  }, [module, report_, routeNode])

  const openEncounter = useCallback((row: EncounterRecord) => {
    mdi.open({
      kind: 'encounter',
      key: `encounter:${row.id}`,
      title: `Encounter ${row.id}`,
      props: { encounter: row },
    })
    report_('host.mois.openWindow', { kind: 'encounter' })
  }, [mdi, report_])

  const closeDialogs = useCallback(() => {
    setServiceEventOpen(false)
    setGoalOpen(false)
    setLoginOpen(false)
    setLookupOpen(false)
    report_('host.mois.closeDialog')
  }, [report_])

  /* picking a row in the Advanced Lookup Service is what changes the chart */
  const selectPatient = useCallback((next: string) => {
    if (!findPatient(next, roster)) throw new Error(`No MOIS chart ${next} is on file.`)
    setOwnChart(next)
    onChartChange?.(next)
    setLookupOpen(false)
    report_('host.mois.selectPatient', { chart: next })
  }, [onChartChange, report_, roster])

  const openLookup = useCallback(() => setLookupOpen(true), [])

  /* instrumented kit controls (command rows, tabs, menus) report through here */
  const onKitAction = useCallback((action: string, payload?: PBInstrumentationPayload) => {
    if (action === 'host.mois.selectTab' && typeof payload?.tab === 'string') setTab(payload.tab)
    /* the kit only knows a "…" was pressed; the frame knows it opens the
       chart lookup, so it is the frame that reports the dialog that follows */
    const opensLookup = action === 'host.mois.lookup'
      || (action === 'host.mois.status' && payload?.link === 'go-to-chart')
    report_(action, { ...(payload as HostRecord | undefined), ...(opensLookup ? { dialog: 'chart-lookup' } : {}) })
  }, [report_])

  const dialog = lookupOpen ? 'chart-lookup'
    : serviceEventOpen ? 'service-event'
      : goalOpen ? 'new-goal'
        : loginOpen ? 'login' : null
  const state = useMemo<HostRecord>(() => ({
    module,
    node: selected,
    view,
    tab,
    dialog,
    patient: chart,
    windows: mdi.instances.length,
    theme: theme === '' ? 'hybrid' : theme === 'pb-theme--flat' ? 'flat' : 'classic',
  }), [chart, dialog, mdi.instances.length, module, selected, tab, theme, view])
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
          const row = encounterRows[index]
          if (!row) throw new Error(`${actionId}: no encounter row ${index}`)
          openNode('encounters')
          await nextFrame()
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
        default: throw new Error(`This MOIS action is not available: ${actionId}`)
      }
    },
  }), [clickAnchor, closeDialogs, openEncounter, openNode, pickModule, selectPatient, toggle])

  useEffect(() => { onReady?.(api) }, [api, onReady])

  const menu = makeMainMenu(setTheme, () => setLoginOpen(true), mdi, onOpenKit, {
    node: openNode,
    module: pickModule,
    lookup: openLookup,
    stepChart: (delta) => selectPatient(stepChart(chart, delta, roster)),
  })
  const status = makeStatusCells(openLookup)
  const sectionContent: ReactNode = selected === 'dynamic' && formSlot ? formSlot : undefined

  return (
    <PBInstrumentationProvider namespace="host.mois" onAction={onKitAction}>
    <PatientProvider chart={chart} roster={roster}>
    <div ref={rootRef} className={cx('pb-root', 'pb-host', theme, className)}>
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
              <div className="pb-viewhead" style={{ height: 22 }}>
                <span className="pb-viewhead__title">{current.label}</span>
              </div>
              <PBTree
                nodes={tree}
                selected={selected}
                onSelect={selectNode}
                expanded={expanded}
                onToggle={toggle}
                getTutorialId={(id) => `host.mois.tree.${id}`}
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
            <div className="pb-panel" style={{ flex: '1 1 auto', position: 'relative' }} data-tutorial-id="host.mois.workarea">
              {view === 'summary' && (
                <PatientSummaryView
                  key={chart}
                  onLookup={openLookup}
                  onStepChart={(delta) => selectPatient(stepChart(chart, delta, roster))}
                  onOpenChart={(next) => { if (findPatient(next, roster)) selectPatient(next) }}
                />
              )}
              {view === 'scheduler' && <SchedulerView />}
              {view === 'resourcebook' && <SchedulerView mode="resource" />}
              {view === 'order' && <OrderView onAttachment={() => setServiceEventOpen(true)} />}
              {view === 'encounters' && <EncounterListView onOpen={openEncounter} />}
              {view === 'demographics' && <DemographicsView />}
              {view === 'notifications' && <NotificationView />}
              {view === 'groupvisit' && <GroupVisitView />}
              {view === 'careplan' && <CarePlanView screen={carePlan} />}
              {/* New Record on the Goals screen is what opens the dialog */}
              {view === 'goals' && <GoalsView onNew={() => setGoalOpen(true)} />}
              {view === 'report' && <ClinicalReportView screen={report} />}
              {view === 'mar' && <MarView />}
              {view === 'determinants' && <DeterminantsView />}
              {view === 'rx' && <MedicationView mode="rx" />}
              {view === 'ltm' && <MedicationView mode="ltm" />}
              {view === 'printhx' && <PrintHistoryView />}
              {view === 'waitprov' && <WaitingListView mode="provider" />}
              {view === 'waitres' && <WaitingListView mode="resource" />}
              {view === 'section' && <ChartSectionView screen={section} content={sectionContent} />}
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
        {serviceEventOpen && <ServiceEventDialog onClose={closeDialogs} />}
        {loginOpen && <LoginDialog onClose={closeDialogs} />}
        {lookupOpen && (
          <AdvancedLookupDialog
            chart={chart}
            roster={roster}
            onPick={selectPatient}
            onClose={() => setLookupOpen(false)}
          />
        )}
      </div>
    </div>
    </PatientProvider>
    </PBInstrumentationProvider>
  )
}
