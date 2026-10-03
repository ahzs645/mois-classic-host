import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBTabs, PBTextArea, pbSlug, usePBInstrumentation,
} from '../pb'
import {
  BASKET_CHARTS, BASKET_COMMAND_WIDTH, BASKET_MORE, BASKET_PANELS, CHART_FOLDER_FOR_BASKET, basketCommands, basketFolderById,
  basketFolders, rowOwners, rowsForView, type BasketFolder, type BasketMoreRow, type BasketRow,
} from '../data/basket'
import { SUMMARY_DEFAULT_ACCENT, SUMMARY_SELECTED_ROW } from '../data/summary'
import { buildAtLeast } from '../data/environment'
import { registerConfirmCurrent } from '../host/confirmCurrent'
import { useChartRecords } from '../data/chart-records'
import { date as chartDate } from '../data/charts/relations'
import { usePatient } from '../data/patient-context'
import { CURRENT_USER } from '../data/tasks'
import { useWorkspaceExtras, workspaceExtras } from '../data/workspaceExtras'
import { useEncounterSession } from '../host/encounterArea'
import { BLEND_BANNER } from './WorkspaceBanner'
import { SEARCH_FIELDS, matchesSearch } from '../data/workspaceSearch'
import {
  basketKey, setCurrentWorkspaceRow, useWorkspaceStore, workspaceStore,
} from '../data/workspaceStore'
import { schedulerStore } from '../data/schedulerStore'
import { useScreenReport } from '../host/screen-state'
import { useOpenWindow } from './areaWindowRegistry'
import { toggled } from './listKit'
import { WorkspaceBanner } from './WorkspaceBanner'

/* ============================================================================
   A Workspace Basket folder — "Acknowledge - Measures" and its seven siblings.

   Transcribed from `source_info.PNG`, `AcknowledgeManualEntries.PNG`,
   `checked_since.PNG` and `review.PNG` (MOIS v02.21.18), and from the
   manual's 303756 image `24c0798b` / 303764 image `22acb4da` for the lower
   half: a nine-button command row, a Search For / Showing Records filter strip
   with a rule between the two halves, the grid whose Check column is the
   point of the screen, and under it the Report / Detail tabs beside the
   Acknowledgements and Workflow Summary panels.

   The behaviours the manual describes and this reproduces:
     · ticking Check greys the row's ink (#606060) but leaves it in place, and
       puts a green box beside your name in the Acknowledgements panel;
       Refresh — or F2, which in the Basket also saves — drops it from the
       Not Checked list (art. ID303756)
     · Showing Records switches between Not Checked and Checked, and Since is
       enabled only for the latter (art. ID303763)
     · a click on a column title sorts by it; a second click on the same
       title flips ascending / descending (art. ID303750)
     · an abnormal result paints four cells yellow — Test Name, Value, Units
       and Flag — not the whole row
     · the T column is A for an acknowledgement and a bold R for a review,
       and a review shows a bold R beside the name in Acknowledgements
       (art. 303764)
     · the paperclip column shows a count, or "-" for none; double-clicking it
       opens the record's attachments (art. 303765)
     · the command row's Create Task / Create Message open those windows on
       the current row, Reassign Items / Copy Items and Change W/S theirs

   Added for art. 1802749 "Basket" and the per-folder pages (1802756–1802763):
     · Print (and a double-click on a row, "in the same manner as pressing
       the Print button") opens the record's MOIS report; a right-click drops
       the Basket's own menu (WorkspaceBasketWindows.tsx);
     · Alt+Z once puts the cursor in Report, twice opens the Text Capture
       Window (Zoom Text); so does a double-click on the Report box;
     · the Report tab's Order # carries the "…" that opens the Order Linking
       Service (every folder but Orders), and shows the order once linked;
     · the Detail tab lists the folder page's own Detail fields where the page
       has them; Measures has a Panel (n) tab (the panel's other results and
       its note, with Graph) and, as of 2.24, a View: List View / Panel View
       selector (Panel View is read-only, grouped by panel);
     · Search For filters on the folder's default fields and the "…" opens
       Advanced Search on the rest;
     · the rows are the workspace view's: another user's appear only while
       their workspace is blended in or viewed, and a record waiting for two
       people in the blend is one row whose Assignee reads `*` (1802767); the
       Acknowledgements panel paints the blend's names in the banner colour;
     · View Detail… opens the record's Workflow Summary (1802768);
     · Progress Notes also lists a note whose author was changed to someone
       other than its creator on the open chart's encounters — "Progress
       Notes are only entered into the Workspace if a note is created and
       then the author is explicitly changed to another user" (1802762;
       the resident → preceptor routing of art. 304078).

   Added for MOIS 2.31.41 (art. 303492, image `4d6a5577…` — a Measures
   folder, the newest capture of this screen there is):
     · the filter strip's drop-down reads "Records:", and a second strip
       under it carries "Results for: ALL RESULTS", "Showing n of m total
       results" and a "Show all results" box;
     · a fourth tab, More, draws the Workspace Summary chart summary for the
       row's patient (MoreTab below);
     · Panel (0) is greyed when the result has no panel.

   No capture of the current build exists for any Basket folder: every one
   is registered for confirmation below, by its navigator node.
   ========================================================================= */

/* CONFIRM-CURRENT: each Basket folder's layout — the grid's columns, the
   command row, the Report / Detail fields — comes from the help site's
   per-folder pages (older builds; their images are not in the supplemented
   manual, so what the folder files transcribe is the earlier pass) and
   1802749's shared-chrome images, v02.21–v02.28; More, Records: and the
   Results-for strip from 303492 `4d6a5577…`, v2.31.41. */
const FOLDER_EVIDENCE: Record<string, string> = {
  'ws-measures': 'art. 1802756 + 1802749 `48b5b4a7…` (v02.21–2.24); 303492 `4d6a5577…` (v2.31.41)',
  'ws-imaging': 'art. 1802757 (text; images missing) + 1802749 (v02.21)',
  'ws-consults': 'art. 1802758 (text; images missing) + 303764 `22acb4da…` (v02.21)',
  'ws-procedures': 'art. 1802759 (text; images missing) + 1802749 `2805acd3…` / `59b0cc32…` (v02.21)',
  'ws-documents': 'art. 1802760 (text; images missing), v02.21',
  'ws-admissions': 'art. 1802761 (text; images missing), v02.21',
  'ws-progress': 'art. 1802762 (text; images missing), v02.21',
  'ws-orders': 'art. 1802763 `d86d53f9…` + text, v02.28',
}
registerConfirmCurrent(basketFolders.map((f) => ({
  target: { node: f.id },
  source: `help-site ${FOLDER_EVIDENCE[f.id] ?? 'art. 1802749'}`,
  check: f.id === 'ws-measures'
    ? 'columns and widths, Records: / Results for strip, More tab'
    : 'columns, Report / Detail fields, Records: / Results for strip, More tab',
})))

/** Showing Records has exactly two entries in the capture. */
const SHOWING = ['Not Checked', 'Checked']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** `26.03.17` (YY.MM.DD) → `Mar 17 2026`, the way a record's Detail text dates it. */
function longDate(short: unknown): string {
  const [y, m, d] = String(short ?? '').split('.')
  if (!y || !m || !d) return ''
  return `${MONTHS[Number(m) - 1] ?? m} ${d} 20${y}`
}

/** The record text a linked Create Task / Create Message pre-fills its Detail
    with — shaped like the two captures (303766 `8ae409de`, 1802744 `8742b3f6`). */
export function basketDetailText(folder: BasketFolder, r: BasketRow): string {
  switch (folder.id) {
    case 'ws-measures':
      return `Test Name: ${r.test}\nValue: ${[r.value, r.units].filter(Boolean).join(' ')}\nDate Collected: ${longDate(r.collected)}`
    case 'ws-imaging':
      return `Test Name: ${r.test}\nDate Collected: ${longDate(r.collected)}`
    case 'ws-consults':
      return `Description: ${r.reason}\n\nRefer By: ${r.referredBy ?? ''}\n\nSeen By: ${r.seenBy}\nDate Seen: ${longDate(r.seen)}`
    case 'ws-procedures':
      return `Description: ${r.description}\n\nPerformed By: ${r.by}\nDate Performed: ${longDate(r.performed)}`
    case 'ws-documents':
      return `Description: ${r.note}\n\nAuthor: ${r.author}\nDate: ${longDate(r.date)}`
    case 'ws-admissions':
      return `Description: ${r.description}\n\nFacility: ${r.facility}\nDischarge: ${longDate(r.discharge)}`
    case 'ws-progress':
      return `Appointment Note: ${r.note}\n\nProvider: ${r.provider}\nAppt. Date: ${longDate(r.apptDate)}`
    default:
      return `Description: ${r.description}\n\nOrdered By: ${r.orderedBy}\nOrder Date: ${longDate(r.ordDate)}`
  }
}

/** What Create Task / Create Message / Mark For Review carry from a row. */
export function basketRowArgs(folder: BasketFolder, r: BasketRow): Record<string, unknown> {
  const recordId = `${folder.recordType} - record id: ${String(r.recordId ?? '')}`
  return {
    chart: BASKET_CHARTS[String(r.patient)] ?? '',
    patient: String(r.patient),
    linkedTo: folder.id === 'ws-consults' ? recordId : recordId,
    recordType: folder.recordType,
    recordId,
    detail: basketDetailText(folder, r),
    folder: folder.id,
    rowKey: basketKey(folder.id, String(r.patient)),
  }
}

/** How many attachments a row carries, counting ones added this session. */
export function basketAttachmentCount(folder: BasketFolder, r: BasketRow, extra: Record<string, number>): number {
  return (r.clip === '-' || !r.clip ? 0 : Number(r.clip)) + (extra[basketKey(folder.id, String(r.patient))] ?? 0)
}

const rowSlug = (r: BasketRow) => `basket-${pbSlug(String(r.patient).split(',')[0] ?? '')}`

/* ---------------------------------------------------------------------------
   The lower half: Report / Detail form, Acknowledgements, Workflow Summary.
   ------------------------------------------------------------------------ */
function ReportForm({ folder, r, tab, orderNo, comment, onOrderLink, onZoom, reportRef }: {
  folder: BasketFolder; r: BasketRow | undefined; tab: string
  /** the order this record was linked to this session */
  orderNo?: string
  /** Show History's saved comment */
  comment?: string
  onOrderLink?: () => void
  onZoom?: () => void
  reportRef?: { current: HTMLTextAreaElement | null }
}) {
  const value = (key: string): string => {
    if (!r) return ''
    if (key === 'valueUnits') return [r.value, r.units].filter(Boolean).join('  ')
    if (key === 'orderNo' && orderNo) return orderNo
    return String(r[key] ?? '')
  }
  const layout = folder.report
  const detail = tab === 'Detail' ? layout.detail : undefined
  /* Detail repeats the record's identity and adds where it came from */
  const left = detail ? detail.left : tab === 'Detail' ? [...layout.left.slice(0, 2), ['Facility:', 'facility'] as [string, string]] : layout.left
  const right = detail ? detail.right : tab === 'Detail' ? [['Facility Location:', 'facilityLoc'] as [string, string], ['Facility Reference:', 'facilityRef'] as [string, string]] : layout.right
  const cell = ([label, key]: [string, string]) => (
    <div key={label} className="pb-row" style={{ gap: 6, height: 22 }}>
      <span className="pb-form__label pb-form__label--dim" style={{ width: 92, flex: 'none' }}>{label}</span>
      <PBInput w="100%" readOnly value={value(key)} style={{ background: key === 'range' ? '#ffffcc' : undefined }} />
      {key === 'orderNo' && layout.orderLink && tab === 'Report' && (
        <PBButton
          bare
          className="pb-inputgroup__btn pb-inputgroup__btn--dots"
          title="Order Linking Service"
          command="order-link-lookup"
          onClick={() => onOrderLink?.()}
        >
          …
        </PBButton>
      )}
    </div>
  )
  const memo = detail?.memo ?? layout.memo
  const memoValue = detail ? (memo === 'Key Word' ? value('keyWord') : value('collectionNote')) : value('report')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '4px 6px', gap: 3, background: 'var(--pb-face)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, flex: 'none' }}>
        <div>{left.map(cell)}</div>
        <div>{right.map(cell)}</div>
      </div>
      <div className="pb-row" style={{ gap: 6, flex: '1 1 auto', minHeight: 0, alignItems: 'stretch' }}>
        <span className="pb-form__label pb-form__label--dim" style={{ width: 92, flex: 'none' }}>{memo}:</span>
        {/* a plain textarea (PBTextArea's own markup) so Alt+Z can focus it */}
        <textarea
          rows={3}
          className="pb-field"
          readOnly
          ref={detail ? undefined : (el: HTMLTextAreaElement | null) => { if (reportRef) reportRef.current = el }}
          value={memoValue}
          onDoubleClick={detail ? undefined : onZoom}
          data-tutorial-id={detail ? undefined : 'host.mois.field.basket-report'}
          style={{ flex: '1 1 auto', resize: 'none', minHeight: 40 }}
        />
      </div>
      {layout.comments && !detail && (
        <div className="pb-row" style={{ gap: 6, flex: 'none', height: 40, alignItems: 'stretch' }}>
          <span className="pb-form__label pb-form__label--dim" style={{ width: 92, flex: 'none' }}>Comments:</span>
          <PBTextArea readOnly value={comment ?? ''} style={{ flex: '1 1 auto', resize: 'none' }} />
        </div>
      )}
      {!layout.noFooter && (
        <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: '70px 1fr auto', rowGap: 2, paddingTop: 2 }}>
          <span>Source:</span>
          <span>SYSTEM{'      '}Sent Date:{'      '}Code:  -</span>
          <u>UNSIGNED</u>
          <span>Created:</span>
          <span>2026.03.18 06:12 SYSTEM{'      '}Last Modified:</span>
          <u>ENC# EMPTY</u>
        </div>
      )}
    </div>
  )
}

/** Measures ▸ Panel (n): the panel's other results and its Panel Notes
    (1802756 "Panel Tab"); Graph plots the selected result. */
function PanelTab({ r, onGraph }: { r: BasketRow | undefined; onGraph: (test: string, value: string, units: string, range: string) => void }) {
  const panel = r?.panel ? BASKET_PANELS[`${String(r.patient)}|${String(r.panel)}`] : undefined
  const [cur, setCur] = useState(0)
  const results = panel?.results ?? []
  const pick = results[cur]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '4px 6px', gap: 4, background: 'var(--pb-face)' }} data-tutorial-id="host.mois.field.basket-panel">
      <div className="pb-row" style={{ gap: 8, flex: 'none' }}>
        <span className="pb-form__label pb-form__label--dim">Panel:</span><b>{String(r?.panel ?? '')}</b>
        <span className="pb-row__spacer" />
        <PBButton
          disabled={!pick}
          command="panel-graph"
          onClick={() => { if (pick) onGraph(pick.test, pick.value, pick.units, pick.range) }}
        >
          Graph
        </PBButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={results}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(x) => `host.mois.row.panel-${pbSlug(x.test).slice(0, 20)}`}
          columns={[
            { key: 'test', header: 'Test Name', width: 220 },
            { key: 'value', header: 'Value', width: 60 },
            { key: 'units', header: 'Units', width: 70 },
            { key: 'flag', header: 'Flag', width: 40, align: 'center' },
            { key: 'range', header: 'Ref. Range', width: 100 },
            { key: 'status', header: 'Status', width: 50, align: 'center' },
          ]}
          empty="This result is not part of a panel."
        />
      </div>
      <div className="pb-row" style={{ gap: 6, flex: 'none', height: 40, alignItems: 'stretch' }}>
        <span className="pb-form__label pb-form__label--dim" style={{ width: 92, flex: 'none' }}>Panel Notes:</span>
        <PBTextArea readOnly value={panel?.note ?? ''} style={{ flex: '1 1 auto', resize: 'none' }} />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   More (2.31.41): the "Workspace Summary" chart summary for the row's patient.
   CONFIRM-CURRENT: 303492 `4d6a5577…` — "Expand All  Collapse All" links
   over a Date | Description | Detail | Hyperlink grid with ENCOUNTER [5] and
   CONNECTIONS [1] bands, the jump glyph in Hyperlink. The grid is the
   Patient Summary's (same chart-summary engine), so its look is that
   current-build screen's; the column widths are INFERRED to fit the tab.
   The glyph opening the chart's Encounters / Demographics is INFERRED, after
   Patient Summary's own Hyperlink column.
   ------------------------------------------------------------------------ */
type MoreRow = BasketMoreRow & { section: string; link: string }
const MORE_BANDS = ['ENCOUNTER', 'CONNECTIONS']

function MoreTab({ r, onOpen }: { r: BasketRow | undefined; onOpen: (node: string) => void }) {
  const more = r ? BASKET_MORE[String(r.patient)] : undefined
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  /* the section's own filter: the last five encounters (`5e0c9979…`) */
  const rows: MoreRow[] = more
    ? [
      ...more.encounters.slice(0, 5).map((x) => ({ ...x, section: 'ENCOUNTER', link: 'encounters' })),
      ...more.connections.map((x) => ({ ...x, section: 'CONNECTIONS', link: 'demographic' })),
    ]
    : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }} data-tutorial-id="host.mois.field.basket-more">
      {/* "If a record is not associated with a patient chart … the More tab
          is blank" — and so is a row whose patient has no seeded summary */}
      {more && (
        <>
          <div className="pb-row" style={{ gap: 21, padding: '3px 8px', flex: 'none' }}>
            <button type="button" className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
            <button type="button" className="pb-link" onClick={() => setCollapsed(new Set(MORE_BANDS))}>Collapse All</button>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              flush
              style={{ ['--pb-dw-pad-x' as string]: '8px', ['--pb-dw-select' as string]: SUMMARY_SELECTED_ROW }}
              head="grey"
              gutter={false}
              rules={false}
              rows={rows}
              rowTutorialId={(x) => `host.mois.row.more-${pbSlug(x.section)}-${x.date.replace(/\./g, '')}`}
              groupBy={(x) => x.section}
              groups={MORE_BANDS}
              groupLabel={(g, inGroup) => `${g}  [${inGroup.length}]`}
              groupAccent={() => SUMMARY_DEFAULT_ACCENT}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
              columns={[
                /* `4d6a5577…`'s proportions, narrowed so Hyperlink stays in
                   the tab beside the Acknowledgements panel */
                { key: 'date', header: 'Date', width: 76 },
                { key: 'description', header: 'Description', width: 250 },
                { key: 'detail', header: 'Detail', width: 190 },
                {
                  key: 'link', header: 'Hyperlink', width: 70, align: 'center', headAlign: 'left',
                  render: (x) => (
                    <button
                      type="button"
                      className="pb-link pb-link--mois"
                      title={`Open ${x.link === 'encounters' ? 'Encounters' : 'Demographics'} in MOIS`}
                      aria-label={`Open ${x.link === 'encounters' ? 'Encounters' : 'Demographics'} in MOIS`}
                      onClick={() => onOpen(x.link)}
                    />
                  ),
                },
                { key: '_pad', header: '' },
              ]}
              empty={false}
            />
          </div>
        </>
      )}
    </div>
  )
}

function SidePanels({ r, checked, review, tasks, messages, people, fill, onDetail }: {
  r: BasketRow | undefined; checked: boolean; review: boolean; tasks: number; messages: number
  /** whose workspace is on screen, and the banner colour their names take */
  people: string[]; fill?: string
  onDetail: () => void
}) {
  const owners = r ? rowOwners(r).filter((o) => o !== CURRENT_USER.name) : []
  const others = r ? [...new Set([...owners, ...[r.orderedBy, r.referredBy, r.recipient, r.attending].filter(Boolean).map(String)])] : []
  const head = (text: string) => (
    <div style={{ textAlign: 'center', fontWeight: 'bold', background: 'linear-gradient(#f4f4f4, #dcdcdc)', borderBottom: '1px solid #a0a0a0', height: 20, lineHeight: '20px', flex: 'none' }}>
      {text}
    </div>
  )
  return (
    <div style={{ width: 196, flex: 'none', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #a0a0a0', background: '#fff' }}>
      {head('Acknowledgements')}
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }} data-tutorial-id="host.mois.field.acknowledgements">
        {r && rowOwners(r).includes(CURRENT_USER.name) && (
          <div style={{ padding: '2px 6px', borderBottom: '1px solid #e0e0e0' }}>
            <div className="pb-row" style={{ gap: 4 }}>
              {checked && <span data-tutorial-id="host.mois.field.ack-green" style={{ width: 9, height: 12, background: '#2fb14a', flex: 'none' }} />}
              {review && <b style={{ color: '#000' }}>R</b>}
              <b style={{ color: people.includes(CURRENT_USER.name) ? fill ?? '#003c8f' : '#9c9c9c' }}>{CURRENT_USER.name}</b>
              {r.ir ? <span style={{ marginLeft: 'auto', color: '#606060' }}>IR:{String(r.ir)}</span> : null}
            </div>
            <div style={{ color: '#606060', paddingLeft: 10 }}>Initials: {CURRENT_USER.login}</div>
          </div>
        )}
        {others.map((o) => (
          <div key={o} style={{ padding: '2px 6px', borderBottom: '1px solid #e0e0e0', color: people.includes(o) ? fill ?? '#003c8f' : '#9c9c9c' }}>
            <b>{o}</b>
            <div style={{ paddingLeft: 10 }}>Initials: {o.split(/[ ,]+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2)}</div>
          </div>
        ))}
      </div>
      {head('Workflow Summary')}
      <div style={{ flex: 'none', padding: '4px 10px', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3 }} data-tutorial-id="host.mois.field.workflow-summary">
        <span>Messages:</span><span>{messages}</span>
        <span>Tasks:</span><span>{tasks}</span>
        <span>Acknowledgements:</span><span>{r ? 1 + others.length : 0}</span>
        <span style={{ gridColumn: 'span 2', textAlign: 'center' }}>
          <PBButton
            bare
            className="pb-link"
            disabled={!r}
            command="view-detail"
            onClick={() => onDetail()}
          >
            View Detail...
          </PBButton>
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   The folder
   ------------------------------------------------------------------------ */
export function BasketFolderView({
  node, onOpenChart, onAcknowledged,
}: {
  node: string
  /** Open Chart: the chart folder holding this kind of record (art. 303599 —
      "pressing this will take you to the Measures folder in that patient's
      Chart, with the same record already selected") */
  onOpenChart?: (chartFolder?: string) => void
  /** how many items this folder has had acknowledged, so a lesson can grade it */
  onAcknowledged?: (count: number) => void
}) {
  const folder: BasketFolder | undefined = basketFolderById(node)
  const store = useWorkspaceStore()
  const extras = useWorkspaceExtras()
  const openWindow = useOpenWindow()
  const host = usePBInstrumentation()
  const patient = usePatient()
  const { session } = useEncounterSession()
  const encounters = useChartRecords('encounter')
  const [search, setSearch] = useState('')
  const [criteria, setCriteria] = useState<Record<string, string>>({})
  const reportRef = useRef<HTMLTextAreaElement | null>(null)
  /* whose workspace is on screen (1802767's four banner cases) */
  const people = store.blend === 'own' ? [CURRENT_USER.name]
    : store.blend === 'blend-with-me' ? [CURRENT_USER.name, ...store.sharedWith]
      : store.sharedWith
  const peopleKey = people.join('|')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [showing, setShowing] = useState(SHOWING[0]!)
  const [cur, setCur] = useState(0)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [tab, setTab] = useState('Report')
  /* 2.31.41's "Show all results" (INFERRED: kept, inert) */
  const [showAll, setShowAll] = useState(true)
  /* a record marked for review is a new Workspace item, and the folder only
     shows it once it is re-read — "If the item is not there, press
     'Refresh'" (art. 303764) */
  const [seenReviews, setSeenReviews] = useState(() => store.reviews)

  /* the folder's rows as the session has left them: reassigned records gone,
     records marked for review this session added as R rows (art. 303764) */
  /* a note whose author was changed to someone other than its creator goes
     to that author's Progress Notes (1802762) — the open chart's encounters */
  const routed = useMemo((): BasketRow[] => {
    if (node !== 'ws-progress') return []
    const name = `${patient.last}, ${patient.first}`.toUpperCase()
    return Object.entries(session.notes).flatMap(([enc, notes]) => notes
      .filter((n) => !n.exported && n.createdBy && n.author && n.author !== n.createdBy)
      .map((n): BasketRow => {
        const rec = encounters.find((e) => e.id_encounter === enc)
        const saved = session.saved.find((e) => e.id === enc)
        const when = saved?.date ?? chartDate(rec?.dtm_appoint)
        const author = n.author.replace(/^[([][A-Z]+[)\]]\s*/, '')
        return {
          ra: '0', t: 'A', patient: name, age: patient.age ?? '', status: '',
          apptDate: when ? when.slice(2) : '', provider: saved?.provider ?? String(rec?.lkp_provider ?? rec?.str_attending ?? ''),
          note: (saved?.reason ?? String(rec?.str_appt_note ?? '')).toUpperCase(), author, creator: n.createdBy,
          report: n.text, owners: author, recordId: n.key, assignee: '',
        }
      }))
  }, [node, session.notes, session.saved, encounters, patient.first, patient.last, patient.age])

  const unfiltered = useMemo(() => {
    if (!folder) return [] as BasketRow[]
    const base = rowsForView([...routed, ...folder.rows], peopleKey.split('|'))
      .filter((r) => !store.reassigned.includes(basketKey(folder.id, String(r.patient))))
    const reviews = folder.rows
      .filter((r) => r.t !== 'R' && seenReviews.includes(basketKey(folder.id, String(r.patient))))
      .map((r): BasketRow => ({ ...r, t: 'R', ra: '0', reviewOf: 'session' }))
    return [...reviews, ...base]
  }, [folder, store.reassigned, seenReviews, routed, peopleKey])
  const all = useMemo(() => {
    const fields = folder ? SEARCH_FIELDS[folder.id] ?? [] : []
    return unfiltered.filter((r) => matchesSearch(r, search, criteria, fields))
  }, [folder, unfiltered, search, criteria])
  /* "Showing n of m total results" (2.31.41) — m is INFERRED, see the strip */
  const total = unfiltered.length

  const keyOf = (r: BasketRow) => `${r.t}:${String(r.patient)}:${String(r.test ?? r.description ?? r.note ?? r.reason ?? '')}`
  const wantChecked = showing === 'Checked'
  const shown = useMemo(() => {
    const list = all.filter((r) => saved.has(keyOf(r)) === wantChecked)
    if (!sort) return list
    const num = (v: unknown) => (v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null)
    return [...list].sort((a, b) => {
      const x = a[sort.key]; const y = b[sort.key]
      const nx = num(x); const ny = num(y)
      const c = nx !== null && ny !== null ? nx - ny : String(x ?? '').localeCompare(String(y ?? ''))
      return c * sort.dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, saved, wantChecked, sort])

  const current = shown[cur]
  const openChart = () => onOpenChart?.(CHART_FOLDER_FOR_BASKET[node])
  const refresh = () => { setSaved(new Set(checked)); setSeenReviews(workspaceStore.get().reviews) }
  useEffect(() => { onAcknowledged?.(saved.size) }, [onAcknowledged, saved])

  /* the current row, for the frame and for the Action menu */
  const args = folder && current
    ? { ...basketRowArgs(folder, current), attachments: basketAttachmentCount(folder, current, store.attachments), row: current, checked: checked.has(keyOf(current)) }
    : null
  useEffect(() => {
    setCurrentWorkspaceRow(folder && current && args ? { node, row: rowSlug(current), args } : null)
  })
  /* the status bar's Create Appointment… books the highlighted record's
     patient (art. 3797338: "context sensitive") — the New Appointment window
     reads it from the Scheduler's prefill while this folder is on screen */
  const prefillFor = current ? String(current.patient) : ''
  useEffect(() => {
    if (!prefillFor) return
    const [last = '', first = ''] = prefillFor.split(',').map((p) => p.trim())
    schedulerStore.setPrefill({ chart: BASKET_CHARTS[prefillFor] ?? '', first, last })
  }, [prefillFor])
  useEffect(() => () => { schedulerStore.setPrefill(null) }, [])
  useScreenReport({
    ...(current ? { row: rowSlug(current) } : {}),
    sort: sort ? `${pbSlug(sort.key)}-${sort.dir > 0 ? 'asc' : 'desc'}` : '',
    showingRecords: showing,
    currentAcknowledged: current ? checked.has(keyOf(current)) : false,
    acknowledgedCount: checked.size,
    visibleReviews: shown.filter((row) => row.t === 'R').length,
  })

  if (!folder) return null

  const onSort = (key: string) => {
    if (key === 'check' || key === 'clip') return
    setSort((s) => (s && s.key === key ? { key, dir: s.dir > 0 ? -1 : 1 } : { key, dir: 1 }))
    setCur(0)
  }

  const print = (r: BasketRow | undefined = current) => {
    if (!r) return
    openWindow('basket-print', { ...basketRowArgs(folder, r), row: r, attachments: basketAttachmentCount(folder, r, store.attachments) })
  }
  const rowWindowArgs = (r: BasketRow) => ({
    ...basketRowArgs(folder, r),
    row: r,
    checked: checked.has(keyOf(r)),
    attachments: basketAttachmentCount(folder, r, store.attachments),
    openChart,
  })
  /* right-click: the row becomes current and the Basket's menu drops */
  const onContextMenu = (e: ReactMouseEvent) => {
    const tr = (e.target as HTMLElement).closest('tbody tr')
    if (!tr) return
    e.preventDefault()
    const n = [...(tr.parentElement?.children ?? [])].indexOf(tr)
    const r = shown[n]
    if (!r) return
    setCur(n)
    openWindow('basket-row-menu', { ...rowWindowArgs(r), x: e.clientX, y: e.clientY })
  }
  /* Alt+Z: once to the Report box, twice to the Zoom Text window (1802749) */
  const zoom = () => { if (current) openWindow('zoom-text', { text: String(current.report ?? '') }) }
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (!(e.altKey && (e.key === 'z' || e.key === 'Z'))) return
    e.preventDefault()
    if (document.activeElement === reportRef.current) { host?.report('command', { command: 'zoom-text' }); zoom() } else reportRef.current?.focus()
  }
  const graph = (test: string, value: string, units: string, range: string) => {
    if (!current) return
    const [lo, hi] = range.split(' to ')
    const [y, m, d] = String(current.collected ?? '').split('.')
    openWindow('basket-measure-graph', {
      patient: String(current.patient), chart: BASKET_CHARTS[String(current.patient)] ?? '', test, units,
      points: Number.isNaN(Number(value)) ? [] : [{ date: y && m && d ? `20${y}.${m}.${d}` : '', value: Number(value) }],
      lower: lo && !Number.isNaN(Number(lo)) ? Number(lo) : undefined, upper: hi && !Number.isNaN(Number(hi)) ? Number(hi) : undefined,
    })
  }
  const panelCount = folder.id === 'ws-measures' && current?.panel
    ? (BASKET_PANELS[`${String(current.patient)}|${String(current.panel)}`]?.results.length ?? 0)
    : 0
  /* More, Records: and the Results-for strip arrived in v02.31.41
     (303492); an earlier environment's build (TRAINING, v02.31.23) keeps
     the older Showing Records: strip and no More tab */
  const v23141 = buildAtLeast('02.31.41')
  const tabs = folder.tabs
    .filter((t) => v23141 || t !== 'More')
    .map((t) => (t.startsWith('Panel') ? `Panel (${panelCount})` : t))
  /* Panel (0) is greyed — 303492 `4d6a5577…` (v2.31.41), and the chart's
     own Measures in the current build (evidence/MATRIX-R0480) — so a row
     with no panel falls back to Report */
  const panelOff: string[] = tabs.filter((t) => t === 'Panel (0)')
  const picked = tabs.find((t) => t === tab || (t.startsWith('Panel') && tab.startsWith('Panel')))
  const activeTab = picked && !panelOff.includes(picked) ? picked : tabs[0]!
  const panelView = folder.id === 'ws-measures' && extras.measuresView === 'Panel View'

  const commandAction = (label: string): (() => void) | undefined => {
    switch (label) {
      case 'Print': return () => print()
      case 'Refresh': return refresh
      case 'Open Chart': return openChart
      case 'Change W/S': return () => { openWindow('change-workspace') }
      case 'Create Task': return () => { openWindow('create-task', args ?? {}) }
      case 'Create Message': return () => { openWindow('create-message', args ?? {}) }
      case 'Reassign Items': return () => { openWindow('reassign-items', { folder: node }) }
      case 'Copy Items': return () => { openWindow('copy-items', { folder: node }) }
      default: return undefined
    }
  }

  const tasksFor = (r: BasketRow | undefined) =>
    r ? store.tasks.filter((t) => t.patient === r.patient).length : 0
  const messagesFor = (r: BasketRow | undefined) =>
    r ? store.messages.filter((m) => m.patient === r.patient).length : 0

  return (
    <>
      {/* the banner is not always the tree label: Imaging shows "Images",
          and the singular Progress Note node shows "Progress Notes" */}
      <WorkspaceBanner title={folder.header} />
      <PBCommandRow commands={basketCommands(folder).map((label) => ({
        label,
        width: BASKET_COMMAND_WIDTH[label] ?? 81,
        onClick: commandAction(label),
      }))} />

      {/* the filter strip: Search For on the left, Showing Records on the
          right, with a 1px #646464 rule between them */}
      <div className="pb-row" style={{ gap: 6, padding: '4px 6px', background: '#f0f0f0', flex: 'none', alignItems: 'center' }}>
        <span className="pb-form__label">Search For:</span>
        <PBInput
          w={420}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCur(0) }}
          onKeyDown={(e) => {
            if (e.key !== 'F4') return
            e.preventDefault()
            openWindow('advanced-search', { fields: SEARCH_FIELDS[folder.id] ?? [], initial: criteria, onApply: (v: Record<string, string>) => { setCriteria(v); setCur(0) } })
          }}
          data-tutorial-id="host.mois.field.basket-search"
        />
        <PBButton
          bare
          className="pb-inputgroup__btn pb-inputgroup__btn--dots"
          title="Advanced search…"
          command="basket-advanced-search"
          onClick={() => {
            openWindow('advanced-search', { fields: SEARCH_FIELDS[folder.id] ?? [], initial: criteria, onApply: (v: Record<string, string>) => { setCriteria(v); setCur(0) } })
          }}
        >
          …
        </PBButton>
        <span style={{ width: 1, alignSelf: 'stretch', background: '#646464', margin: '0 8px' }} />
        {/* CONFIRM-CURRENT: "Records:" — 303492 `4d6a5577…` (v2.31.41); the
            v02.21 captures and 1802749's text say "Showing Records:" */}
        <span className="pb-form__label">{v23141 ? 'Records:' : 'Showing Records:'}</span>
        <PBSelect
          w={113}
          options={SHOWING}
          value={showing}
          data-tutorial-id="host.mois.field.showing-records"
          onChange={(e) => { setShowing(e.target.value); setCur(0) }}
        />
        <span className="pb-form__label" style={{ marginLeft: 8 }}>Since:</span>
        <PBInput w={96} disabled={!wantChecked} defaultValue={wantChecked ? '2026.03.01' : ''} />
        {folder.id === 'ws-measures' && (
          <>
            {/* 2.24: List View / Panel View, top right (1802756 "Panel View") */}
            <span className="pb-form__label" style={{ marginLeft: 'auto' }}>View:</span>
            <PBSelect
              w={96}
              options={['List View', 'Panel View']}
              value={extras.measuresView}
              data-tutorial-id="host.mois.field.basket-view"
              onChange={(e) => { workspaceExtras.setMeasuresView(e.target.value as 'List View' | 'Panel View'); setCur(0) }}
            />
          </>
        )}
      </div>

      {/* CONFIRM-CURRENT: the second strip of 303492 `4d6a5577…` (v2.31.41):
          "Results for: ALL RESULTS" on the left, "Showing 45 of 47 total
          results" and a ticked "Show all results" on the right. What else
          Results for can name, what the total counts and what unticking Show
          all results does are INFERRED: here the total is the folder's rows
          for this view before Search For and Records narrow them, and the
          box is kept but changes nothing. */}
      {v23141 && (
        <div className="pb-row" style={{ gap: 6, padding: '2px 6px 3px', background: '#f0f0f0', flex: 'none', alignItems: 'center' }} data-tutorial-id="host.mois.group.basket-results">
          <span className="pb-form__label pb-form__label--dim">Results for:</span>
          <b style={{ fontSize: '1.08em', marginLeft: 4 }}>ALL RESULTS</b>
          <span className="pb-row__spacer" />
          <span className="pb-form__label pb-form__label--dim">Showing</span>
          <span style={{ minWidth: 40, textAlign: 'right' }} data-tutorial-id="host.mois.field.basket-showing">{shown.length}</span>
          <span className="pb-form__label pb-form__label--dim" style={{ margin: '0 4px 0 14px' }}>of</span>
          <span style={{ minWidth: 30, textAlign: 'right' }}>{total}</span>
          <span className="pb-form__label pb-form__label--dim" style={{ margin: '0 18px 0 12px' }}>total results</span>
          <PBCheckbox label="Show all results" checked={showAll} onChange={setShowAll} tutorialId="host.mois.field.basket-show-all" />
        </div>
      )}

      <div style={{ flex: '1 1 auto', minHeight: 110, display: 'flex', padding: 3 }} onContextMenu={onContextMenu} onKeyDown={onKeyDown}>
        <PBDataWindow
          rows={shown}
          current={cur}
          onCurrentChange={setCur}
          /* a double-click prints, the same as the Print button (1802749) */
          onActivate={(r) => print(r)}
          onSort={panelView ? undefined : onSort}
          groupBy={panelView ? (r) => String(r.panel || r.test || '') : undefined}
          groupLabel={panelView ? (g) => <b>{g}</b> : undefined}
          rowClassName={(r) => (checked.has(keyOf(r)) ? 'pb-dw--checked' : undefined)}
          rowTutorialId={(r) => `host.mois.row.${rowSlug(r)}`}
          columns={folder.columns.map((c) => {
            if (c.key === 'check') {
              return {
                ...c,
                render: (r: BasketRow) => (
                  <span style={{ display: 'block' }}>
                    <PBCheckbox
                      tutorialId={`host.mois.check.${pbSlug(String(r.patient).split(',')[0] ?? '')}`}
                      checked={checked.has(keyOf(r))}
                      onChange={(v) => setChecked((s) => toggled(s, keyOf(r), v))}
                    />
                  </span>
                ),
              }
            }
            if (c.key === 't') {
              return { ...c, render: (r: BasketRow) => (r.t === 'R' ? <b>R</b> : r.t) }
            }
            if (c.key === 'assignee') {
              /* a blended record reads *, and says so on hover (1802767) */
              return {
                ...c,
                render: (r: BasketRow) => (
                  <span
                    data-tutorial-id={r.assignee === '*' ? `host.mois.cell.blended-${rowSlug(r)}` : undefined}
                    title={r.assignee === '*' ? `Blended record: acknowledgements for ${String(r.blendedFor ?? '')} are combined in this row. Checking it checks it for all of them.` : undefined}
                  >
                    {String(r.assignee ?? '')}
                  </span>
                ),
              }
            }
            if (c.key === 'clip') {
              /* the paperclip cell is a control: a double-click opens the
                 record's attachments rather than the chart (art. 303765) */
              return {
                ...c,
                render: (r: BasketRow) => {
                  const count = basketAttachmentCount(folder, r, store.attachments)
                  return (
                    <span
                      style={{ display: 'block' }}
                      data-tutorial-id={`host.mois.cell.clip-${rowSlug(r)}`}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        openWindow('basket-attachments', { ...basketRowArgs(folder, r), attachments: count })
                      }}
                    >
                      {count ? String(count) : '-'}
                    </span>
                  )
                },
              }
            }
            /* the cells that carry the abnormal highlight — four in Measures
               (Units included even when empty), two in Imaging. Selection
               beats the flag: a flagged row that is current shows no yellow. */
            if (folder.abnormalCells?.includes(c.key)) {
              return {
                ...c,
                render: (r: BasketRow, n: number) => (
                  <span
                    style={r.abnormal && n !== cur
                      ? { background: '#ffff60', display: 'block', margin: '0 -4px', padding: '0 4px' }
                      : undefined}
                  >
                    {String(r[c.key] ?? '')}
                  </span>
                ),
              }
            }
            return c
          })}
          empty={wantChecked ? 'Nothing has been checked yet.' : 'Nothing is waiting in this folder.'}
        />
      </div>

      {/* Report / Detail beside Acknowledgements and Workflow Summary */}
      <div style={{ height: 262, flex: 'none', display: 'flex', padding: '0 3px 3px', minHeight: 0 }} data-tutorial-id="host.mois.field.basket-detail" onKeyDown={onKeyDown}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBTabs tabs={tabs} active={activeTab} onChange={setTab} compact face disabled={panelOff}>
            {activeTab === 'More'
              ? <MoreTab r={current} onOpen={(n) => onOpenChart?.(n)} />
              : activeTab.startsWith('Panel')
              ? <PanelTab key={current ? rowSlug(current) : ''} r={current} onGraph={graph} />
              : (
                <ReportForm
                  folder={folder}
                  r={current}
                  tab={activeTab}
                  orderNo={current ? extras.orderLinks[basketKey(folder.id, String(current.patient))]?.order : undefined}
                  comment={current ? extras.comments[basketKey(folder.id, String(current.patient))] : undefined}
                  onOrderLink={() => { if (current) openWindow('basket-order-link', basketRowArgs(folder, current)) }}
                  onZoom={zoom}
                  reportRef={reportRef}
                />
              )}
          </PBTabs>
        </div>
        <SidePanels
          r={current}
          checked={current ? checked.has(keyOf(current)) : false}
          review={current?.t === 'R'}
          tasks={tasksFor(current)}
          messages={messagesFor(current)}
          people={people}
          fill={BLEND_BANNER[store.blend].fill}
          onDetail={() => { if (current) openWindow('basket-workflow-summary', rowWindowArgs(current)) }}
        />
      </div>
    </>
  )
}
