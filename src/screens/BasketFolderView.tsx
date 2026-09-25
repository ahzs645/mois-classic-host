import { useEffect, useMemo, useState } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput, PBSelect, PBTabs, PBTextArea, pbSlug,
} from '../pb'
import {
  BASKET_CHARTS, BASKET_COMMAND_WIDTH, CHART_FOLDER_FOR_BASKET, basketCommands, basketFolderById,
  type BasketFolder, type BasketRow,
} from '../data/basket'
import { CURRENT_USER } from '../data/tasks'
import {
  basketKey, setCurrentWorkspaceRow, useWorkspaceStore, workspaceStore,
} from '../data/workspaceStore'
import { schedulerStore } from '../data/schedulerStore'
import { useScreenReport } from '../host/screen-state'
import { useOpenWindow } from './areaWindowRegistry'
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
   ========================================================================= */

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
function ReportForm({ folder, r, tab }: { folder: BasketFolder; r: BasketRow | undefined; tab: string }) {
  const value = (key: string): string => {
    if (!r) return ''
    if (key === 'valueUnits') return [r.value, r.units].filter(Boolean).join('  ')
    return String(r[key] ?? '')
  }
  const layout = folder.report
  /* Detail repeats the record's identity and adds where it came from */
  const left = tab === 'Detail' ? [...layout.left.slice(0, 2), ['Facility:', 'facility'] as [string, string]] : layout.left
  const right = tab === 'Detail' ? [['Facility Location:', 'facilityLoc'] as [string, string], ['Facility Reference:', 'facilityRef'] as [string, string]] : layout.right
  const cell = ([label, key]: [string, string]) => (
    <div key={label} className="pb-row" style={{ gap: 6, height: 22 }}>
      <span className="pb-form__label pb-form__label--dim" style={{ width: 92, flex: 'none' }}>{label}</span>
      <PBInput w="100%" readOnly value={value(key)} style={{ background: key === 'range' ? '#ffffcc' : undefined }} />
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '4px 6px', gap: 3, background: 'var(--pb-face)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, flex: 'none' }}>
        <div>{left.map(cell)}</div>
        <div>{right.map(cell)}</div>
      </div>
      <div className="pb-row" style={{ gap: 6, flex: '1 1 auto', minHeight: 0, alignItems: 'stretch' }}>
        <span className="pb-form__label pb-form__label--dim" style={{ width: 92, flex: 'none' }}>{layout.memo}:</span>
        <PBTextArea readOnly value={value('report')} style={{ flex: '1 1 auto', resize: 'none', minHeight: 40 }} />
      </div>
      {layout.comments && (
        <div className="pb-row" style={{ gap: 6, flex: 'none', height: 40, alignItems: 'stretch' }}>
          <span className="pb-form__label pb-form__label--dim" style={{ width: 92, flex: 'none' }}>Comments:</span>
          <PBTextArea readOnly value="" style={{ flex: '1 1 auto', resize: 'none' }} />
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

function SidePanels({ r, checked, review, tasks, messages }: {
  r: BasketRow | undefined; checked: boolean; review: boolean; tasks: number; messages: number
}) {
  const others = r ? [...new Set([r.orderedBy, r.referredBy, r.recipient, r.attending].filter(Boolean).map(String))] : []
  const head = (text: string) => (
    <div style={{ textAlign: 'center', fontWeight: 'bold', background: 'linear-gradient(#f4f4f4, #dcdcdc)', borderBottom: '1px solid #a0a0a0', height: 20, lineHeight: '20px', flex: 'none' }}>
      {text}
    </div>
  )
  return (
    <div style={{ width: 196, flex: 'none', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #a0a0a0', background: '#fff' }}>
      {head('Acknowledgements')}
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }} data-tutorial-id="host.mois.field.acknowledgements">
        {r && (
          <div style={{ padding: '2px 6px', borderBottom: '1px solid #e0e0e0' }}>
            <div className="pb-row" style={{ gap: 4 }}>
              {checked && <span data-tutorial-id="host.mois.field.ack-green" style={{ width: 9, height: 12, background: '#2fb14a', flex: 'none' }} />}
              {review && <b style={{ color: '#000' }}>R</b>}
              <b style={{ color: '#003c8f' }}>{CURRENT_USER.name}</b>
            </div>
            <div style={{ color: '#606060', paddingLeft: 10 }}>Initials: {CURRENT_USER.login}</div>
          </div>
        )}
        {others.map((o) => (
          <div key={o} style={{ padding: '2px 6px', borderBottom: '1px solid #e0e0e0', color: '#9c9c9c' }}>
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
        <span style={{ gridColumn: 'span 2', textAlign: 'center' }}><u style={{ color: '#0000ee' }}>View Detail...</u></span>
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
  const openWindow = useOpenWindow()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [showing, setShowing] = useState(SHOWING[0]!)
  const [cur, setCur] = useState(0)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [tab, setTab] = useState('Report')
  /* a record marked for review is a new Workspace item, and the folder only
     shows it once it is re-read — "If the item is not there, press
     'Refresh'" (art. 303764) */
  const [seenReviews, setSeenReviews] = useState(() => store.reviews)

  /* the folder's rows as the session has left them: reassigned records gone,
     records marked for review this session added as R rows (art. 303764) */
  const all = useMemo(() => {
    if (!folder) return [] as BasketRow[]
    const base = folder.rows.filter((r) => !store.reassigned.includes(basketKey(folder.id, String(r.patient))))
    const reviews = folder.rows
      .filter((r) => r.t !== 'R' && seenReviews.includes(basketKey(folder.id, String(r.patient))))
      .map((r): BasketRow => ({ ...r, t: 'R', ra: '0', reviewOf: 'session' }))
    return [...reviews, ...base]
  }, [folder, store.reassigned, seenReviews])

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
    ? { ...basketRowArgs(folder, current), attachments: basketAttachmentCount(folder, current, store.attachments) }
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
  useScreenReport(current ? { row: rowSlug(current), sort: sort ? `${pbSlug(sort.key)}-${sort.dir > 0 ? 'asc' : 'desc'}` : '' } : {})

  if (!folder) return null

  const onSort = (key: string) => {
    if (key === 'check' || key === 'clip') return
    setSort((s) => (s && s.key === key ? { key, dir: s.dir > 0 ? -1 : 1 } : { key, dir: 1 }))
    setCur(0)
  }

  const commandAction = (label: string): (() => void) | undefined => {
    switch (label) {
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
        <PBDropField w={420} />
        <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button" title="Advanced search…">…</button>
        <span style={{ width: 1, alignSelf: 'stretch', background: '#646464', margin: '0 8px' }} />
        <span className="pb-form__label">Showing Records:</span>
        <PBSelect
          w={113}
          options={SHOWING}
          value={showing}
          data-tutorial-id="host.mois.field.showing-records"
          onChange={(e) => { setShowing(e.target.value); setCur(0) }}
        />
        <span className="pb-form__label" style={{ marginLeft: 8 }}>Since:</span>
        <PBInput w={96} disabled={!wantChecked} defaultValue={wantChecked ? '2026.03.01' : ''} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 110, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={shown}
          current={cur}
          onCurrentChange={setCur}
          onActivate={openChart}
          onSort={onSort}
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
                      onChange={(v) => setChecked((s) => {
                        const next = new Set(s)
                        v ? next.add(keyOf(r)) : next.delete(keyOf(r))
                        return next
                      })}
                    />
                  </span>
                ),
              }
            }
            if (c.key === 't') {
              return { ...c, render: (r: BasketRow) => (r.t === 'R' ? <b>R</b> : r.t) }
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
      <div style={{ height: 262, flex: 'none', display: 'flex', padding: '0 3px 3px', minHeight: 0 }} data-tutorial-id="host.mois.field.basket-detail">
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBTabs tabs={folder.tabs} active={folder.tabs.includes(tab) ? tab : folder.tabs[0]!} onChange={setTab} compact face>
            <ReportForm folder={folder} r={current} tab={tab} />
          </PBTabs>
        </div>
        <SidePanels
          r={current}
          checked={current ? checked.has(keyOf(current)) : false}
          review={current?.t === 'R'}
          tasks={tasksFor(current)}
          messages={messagesFor(current)}
        />
      </div>
    </>
  )
}
