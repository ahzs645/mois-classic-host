import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  PBInstrumentationProvider, PBMdiHost, PBMdiProvider, PBMenuBar, PBModuleBar, PBStatusBar, PBTree, PBWindow,
  useMdi, type PBInstrumentationPayload, type PBTreeNode, type PBWindowClass,
} from '../pb'
import {
  adminTree, billingTree, encounterRows, exchangeTree, makeMainMenu, modules, patientChartTree,
  reportsTree, schedulerTree, statusCells, workspaceTree,
  type CarePlanKey, type PBTheme,
} from '../data/mois'
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
  | 'order' | 'encounters' | 'scheduler' | 'demographics' | 'notifications'
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

function Frame({ fixture, onAction, onStateChange, onReady, formSlot, className, onOpenKit }: MoisClassicShellProps) {
  const start = useMemo(() => resolveMoisClassicFixture(fixture), [fixture])
  const [module, setModule] = useState<string>(start.module)
  const [view, setView] = useState<View>(start.view)
  const [selected, setSelected] = useState<string>(start.node)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(DEFAULT_EXPANDED))
  const mdi = useMdi()
  const [serviceEventOpen, setServiceEventOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [theme, setTheme] = useState<PBTheme>('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [carePlan, setCarePlan] = useState<CarePlanKey>('needs')
  const [section, setSection] = useState(() => chartScreens[start.node] ?? moduleScreens[start.node] ?? chartScreens.summary)
  const [report, setReport] = useState(reportScreens.imaging)
  const [dayGrid, setDayGrid] = useState({ columns: 3, mode: 'day' as 'day' | 'week', title: 'Day View' })
  /* the last tab a screen reported; screens own their tab state, so this is
     cleared whenever the navigator moves on */
  const [tab, setTab] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

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
    report_('host.mois.closeDialog')
  }, [report_])

  /* instrumented kit controls (command rows, tabs, menus) report through here */
  const onKitAction = useCallback((action: string, payload?: PBInstrumentationPayload) => {
    if (action === 'host.mois.selectTab' && typeof payload?.tab === 'string') setTab(payload.tab)
    report_(action, payload as HostRecord | undefined)
  }, [report_])

  const dialog = serviceEventOpen ? 'service-event' : goalOpen ? 'new-goal' : loginOpen ? 'login' : null
  const state = useMemo<HostRecord>(() => ({
    module,
    node: selected,
    view,
    tab,
    dialog,
    windows: mdi.instances.length,
    theme: theme === '' ? 'hybrid' : theme === 'pb-theme--flat' ? 'flat' : 'classic',
  }), [dialog, mdi.instances.length, module, selected, tab, theme, view])
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
        case 'host.mois.closeDialog': closeDialogs(); return undefined
        default: throw new Error(`This MOIS action is not available: ${actionId}`)
      }
    },
  }), [clickAnchor, closeDialogs, openEncounter, openNode, pickModule, toggle])

  useEffect(() => { onReady?.(api) }, [api, onReady])

  const menu = makeMainMenu(setTheme, () => setLoginOpen(true), mdi, onOpenKit)
  const sectionContent: ReactNode = selected === 'dynamic' && formSlot ? formSlot : undefined

  return (
    <PBInstrumentationProvider namespace="host.mois" onAction={onKitAction}>
    <div ref={rootRef} className={cx('pb-root', 'pb-host', theme, className)}>
      <div className="pb-desktop" data-tutorial-id="host.mois.desktop">
        <PBWindow
          title="MOIS: MOIS DEV"
          /* PB windows do not reflow — they have a minimum size and the
             desktop scrolls underneath them. */
          style={{
            position: 'absolute', left: 24, top: 18, bottom: 18,
            width: 'calc(100% - 48px)', minWidth: 1180,
          }}
        >
          <PBMenuBar items={menu} />

          {/* "Desktop For:" strip that floats at the top right of the MDI frame */}
          <div style={{ position: 'relative', height: 0 }}>
            <div className="pb-row" style={{ position: 'absolute', right: 8, top: 2, zIndex: 5 }}>
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

          <PBStatusBar cells={statusCells} />
        </PBWindow>

        {/* ---- MDI sheets: one per open record ---- */}
        <PBMdiHost classes={WINDOW_CLASSES} />

        {/* modal child window — layered above the MDI frame and any child */}
        {serviceEventOpen && <ServiceEventDialog onClose={closeDialogs} />}
        {loginOpen && <LoginDialog onClose={closeDialogs} />}
      </div>
    </div>
    </PBInstrumentationProvider>
  )
}
