import { useState, type CSSProperties, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { SESSION_USER } from '../data/chartSession'
import {
  DETERMINANT_CHARTS, DETERMINANT_PANELS, DETERMINANT_TABS, ENROLLED_AS, INSTITUTION_CATEGORIES, OCCUPANT_RELATIONSHIPS,
  historyOrder, nextHistoryKey, saveHistory, setHistory, undoHistory, useDeterminants,
  type DeterminantTab, type HistoryList, type HistoryRow,
} from '../data/determinants'
import { clockNow } from '../data/measureEntry'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBGroup, PBInput, PBLookup,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, pbSlug, type PBColumn,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { useColumnFilters } from './listKit'
import { ChartIdentityStrip } from './patientKit'

/* ============================================================================
   Patient Chart ▸ Determinants of Health — four tabs, each opening on its
   status panel ("Update" · <domain> Status · Trend / Less…).

   PROVENANCE: art. 2593946 (v02.30.22) — Employment `1b786cef…`, Education
   `7ee611bf…`, Housing `0b2e3725…`, Socioeconomic `d7f58b3c…`; what each tab
   holds is transcribed in data/determinants.ts. Per tab:
     Employment     status (EMPLOYMENT STATUS, EMPLOYMENT HOURS) · Employment
                    History with New / Delete and two search boxes · "Total
                    Hrs/Wk for all Current Employment Records:" · Employer
                    Information beside General Notes · Record Created / Last
                    Modified.
     Education      status · Education History · the institution detail
                    (Educational Institution …, Level of Education …,
                    Institution Category, Completed Date, Enrollment Period
                    … to …, Field of Study …, Enrolled As, Comment).
     Housing        status · Contact Information as per Demographics
                    (read-only) · Who Lives with Me with New / Delete.
     Socioeconomic  status only.
   Update opens the domain's panel (DeterminantWindows.tsx) — "Use the Update
   button to select options from a panel"; what it saves becomes the tab's
   Most Recent Value and a row in Measures. Trend lists the values recorded
   over time; Less… folds the status rows away (More… brings them back).

   Behaviour: the history grids are the session's (data/determinants.ts):
   New / Delete on a band, or New Record / Delete Record on the command row,
   act on the current tab's list; Save commits, Undo returns to the last
   Save. The current row's Start / End / Hrs/Wk (Employment) and every Who
   Lives with Me cell are edited in the grid — the article gives them no
   other place — and the rest in the detail below.
   INFERRED: the Trend / Less… behaviour, and that the two search boxes over
   each history grid filter it by the column below them.

   GEOMETRY: the 2026-09-29 TRAINING captures (2x, the standalone viewer's
   1000x736 window) — charts 3598 and 3924, every tab. Measured there and
   drawn here, in CSS px:
     · tab page on the window face (#f0f0f0), caption-sized tabs padded 9;
     · status panel: soft grey captions over a #e2e2e2 rule, 18px rows,
       columns 70 | 288 | 222 | 60 | 40 | rest;
     · a history band (#dbd7d3, 50px New / Delete), then — Employment and
       Education only — a strip of the same grey holding the two search boxes
       over the columns they filter;
     · the grid: 18px gutter, 18px rows, a white body with no "no rows" line,
       closed by a dark rule; Employment's total sits in the grid's own
       summary band, its caption ending where Occupation ends and its value
       right-aligned under Hrs/Wk;
     · a history grid with no rows shows no detail below it — the window face
       only — and the detail and its Record Created / Last Modified line
       appear with the first row (Education, chart 3598);
     · Education's detail is two sections on 20px rows: fields at 120
       (219 wide + "…"), right-hand captions at 394, fields at 500;
     · Housing's contact block on 20px rows: fields at 105 / 291 on the left,
       490 / 610 / 676 on the right, Leave Message boxes at 679;
     · Who Lives with Me edits in place: a click on a cell of the current row
       puts that cell alone into edit (the Start date's text comes up
       selected, Occupant Relationship drops its Value | Description list),
       the rest of the row stays painted text. Ended rows are greyed and
       sorted under the current ones.
   ========================================================================= */

const LIST_OF: Record<DeterminantTab, HistoryList | null> = {
  Employment: 'employment', Education: 'education', Housing: 'occupants', Socioeconomic: null,
}

type StatusRow = { collected: string; name: string; value: string; units: string; flag: string; ranges: string }
/** the cell of the current row that is in edit, by row key */
type CellFocus = { key: string; col: string } | null

const dash = (mois: string) => mois.replace(/[./]/g, '-')
const stampNow = () => `${MOIS_TODAY}  ${clockNow()}   ${SESSION_USER}`
/** the Housing contact block prints phone numbers with dashes, where Patient
    Summary prints the same number with dots */
const phone = (v?: string) => (v ?? '').replace(/\./g, '-')

/** DataWindow metrics every Determinants grid shares */
const GRID_VARS = { ['--pb-dw-row-h' as string]: '18px', ['--pb-dw-gutter-width' as string]: '18px' } as CSSProperties
const BAND = 'var(--pb-band)'
const RULE = '1px solid var(--pb-border)'

export function DeterminantsView() {
  const patient = usePatient()
  const chart = patient.chart
  const det = useDeterminants(chart)
  const measures = useChartRecords('measure', 'dtm_collect_date')
  const occupants = useChartRecords('chart_occupant')
  const open = useOpenWindow()
  const [tab, setTab] = useState<DeterminantTab>('Employment')
  const [less, setLess] = useState(false)
  const [cur, setCur] = useState<Record<HistoryList, number>>({ employment: 0, education: 0, occupants: 0 })
  const [focus, setFocus] = useState<CellFocus>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const captured = DETERMINANT_CHARTS[chart]

  /* the chart's own lists: the export carries occupants (tdt_chart_occupant);
     employment and education history are not in it. A captured chart
     without an export brings its lists from DETERMINANT_CHARTS. */
  const exported: HistoryRow[] = occupants.map((o, i) => ({
    key: o.id_chart_occupant ?? `occupant-${i}`, start: (o.dtm_start ?? '').split(' ')[0]!.replace(/\//g, '.'), stop: (o.dtm_end ?? '').split(' ')[0]!.replace(/\//g, '.'),
    relationship: o.str_occupant_relationship ?? '', quantity: o.num_quantity ?? '', note: o.str_note ?? '', clip: '-',
  }))
  const baseline: Record<HistoryList, HistoryRow[]> = {
    employment: [],
    education: historyOrder(captured?.education ?? []),
    occupants: historyOrder(exported.length ? exported : captured?.occupants ?? []),
  }
  const rowsOf = (list: HistoryList) => det.rows[list] ?? baseline[list]
  const dirty = JSON.stringify(det.rows) !== JSON.stringify(det.saved)
  const list = LIST_OF[tab]
  const cfg = DETERMINANT_PANELS[tab]

  /* the status rows: an Update this session, else the chart's latest
     measure of that code, else what the captured chart shows, else NOT
     DOCUMENTED */
  const status: StatusRow[] = cfg.observations.map((o) => {
    const blank = { units: '', flag: '', ranges: '' }
    const own = det.observations.find((x) => x.name === o.name)
    if (own) return { ...blank, collected: dash(own.collected), name: o.name, value: own.value }
    const m = measures.find((r) => (o.code ? r.str_code === o.code : r.str_description === o.name) && (r.str_value ?? '') !== '')
    if (m) return { ...blank, collected: dash((m.dtm_collect_date ?? '').split(' ')[0]!), name: o.name, value: m.str_value ?? '', units: m.str_units ?? '', flag: m.str_abnormal ?? '' }
    const seen = captured?.observations.find((x) => x.name === o.name)
    if (seen) return { ...blank, collected: seen.collected, name: o.name, value: seen.value, ranges: seen.ranges ?? '' }
    return { ...blank, collected: '', name: o.name, value: 'NOT DOCUMENTED' }
  })

  const edit = (l: HistoryList, key: string, patch: Record<string, string>) => {
    setHistory(chart, l, rowsOf(l).map((r) => (r.key === key ? { ...r, ...patch, modified: stampNow() } : r)))
  }
  const addRow = (l: HistoryList) => {
    const blank: HistoryRow = l === 'occupants'
      ? { key: nextHistoryKey(chart), start: MOIS_TODAY, stop: '', relationship: '', quantity: '', note: '', clip: '-' }
      : { key: nextHistoryKey(chart), start: MOIS_TODAY, clip: '-', created: stampNow() }
    setHistory(chart, l, [blank, ...rowsOf(l)])
    setCur((c) => ({ ...c, [l]: 0 }))
    setFocus(null)
  }
  const deleteRow = (l: HistoryList) => {
    const rows = rowsOf(l)
    const at = Math.min(cur[l], rows.length - 1)
    if (at < 0) return
    setHistory(chart, l, rows.filter((_, i) => i !== at))
    setCur((c) => ({ ...c, [l]: Math.max(0, at - 1) }))
    setFocus(null)
  }
  /* a "…" pick list writes to the list the store holds, so hand it the
     chart's own rows first if nothing has been edited yet */
  const pick = (l: HistoryList, key: string, field: string, listName: string) => {
    if (!det.rows[l]) setHistory(chart, l, rowsOf(l))
    open('determinant-lookup', { list: listName, target: l, key, field })
  }
  const tabProps = (l: HistoryList): TabProps => ({
    rows: rowsOf(l), cur: cur[l], setCur: (i) => setCur((c) => ({ ...c, [l]: i })),
    edit: (key, patch) => edit(l, key, patch), onNew: () => addRow(l), onDelete: () => deleteRow(l),
    focus, setFocus,
  })

  useScreenReport({
    determinantsTab: pbSlug(tab),
    employmentRows: rowsOf('employment').length,
    educationRows: rowsOf('education').length,
    occupantRows: rowsOf('occupants').length,
    observationsRecorded: det.observations.length,
    statusCollapsed: less,
    dirty,
  })

  /* MOIS paints the five commands live on every tab — Delete Record, Save
     and Undo included, with nothing to act on (all four captures) */
  return (
    <>
      <PBViewHeader title="Determinants of Health" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { if (list) addRow(list) } },
          { label: 'Delete Record', onClick: () => { if (list) deleteRow(list) } },
          { label: 'Save', onClick: () => { if (dirty) saveHistory(chart) } },
          { label: 'Undo', onClick: () => { if (dirty) undoHistory(chart) } },
          { label: 'Refresh' },
        ]}
      />
      <ChartIdentityStrip />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '3px 3px 3px 4px' }}>
        <PBTabs tabs={DETERMINANT_TABS} active={tab} onChange={(t) => { setTab(t as DeterminantTab); setFocus(null) }} compact tabPad={11} face>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'auto', border: RULE, borderTop: 0 }}>
            {/* the status panel */}
            <div style={{ flex: 'none', background: '#fff', borderBottom: RULE }}>
              <div className="pb-row" style={{ gap: 0, height: 22, padding: '0 0 0 2px', background: 'var(--pb-face)', borderBottom: '1px solid #000' }}>
                <PBButton size="sm" style={{ width: 65, minWidth: 65, height: 20 }} command="determinants-update" onClick={() => open('determinant-panel', { tab })}>Update</PBButton>
                <b style={{ marginLeft: 8 }}>{cfg.band}</b>
                <span className="pb-row__spacer" />
                <PBButton bare className="pb-link" command="determinants-trend" onClick={() => open('determinant-trend', { tab })}>Trend</PBButton>
                <PBButton bare className="pb-link" style={{ margin: '0 22px 0 8px' }} command={less ? 'determinants-more' : 'determinants-less'} onClick={() => setLess((v) => !v)}>
                  {less ? 'More...' : 'Less...'}
                </PBButton>
              </div>
              {!less && (
                <div data-tutorial-id="host.mois.group.determinants-status" style={{ padding: '0 16px 2px 0' }}>
                  <PBDataWindow
                    flush
                    gutter={false}
                    zebra={false}
                    rules={false}
                    head="caption"
                    current={-1}
                    empty={false}
                    style={{ ['--pb-dw-row-h' as string]: '18px' }}
                    columns={[
                      { key: 'collected', header: 'Collected', width: 70 },
                      { key: 'name', header: 'Name', width: 288 },
                      { key: 'value', header: 'Most Recent Value', width: 222 },
                      { key: 'units', header: 'Units', width: 60 },
                      { key: 'flag', header: 'Flag', width: 40 },
                      { key: 'ranges', header: 'Ref. Ranges' },
                    ]}
                    rows={status}
                    rowTutorialId={(r) => `host.mois.row.determinant-${pbSlug(r.name)}`}
                  />
                </div>
              )}
            </div>

            {tab === 'Employment' && (
              <EmploymentTab
                {...tabProps('employment')}
                filters={filters} setFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
                onPick={(key, field, name) => pick('employment', key, field, name)}
              />
            )}
            {tab === 'Education' && (
              <EducationTab
                {...tabProps('education')}
                filters={filters} setFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
                onPick={(key, field, name) => pick('education', key, field, name)}
              />
            )}
            {tab === 'Housing' && <HousingTab {...tabProps('occupants')} />}
          </div>
        </PBTabs>
      </div>
    </>
  )
}

/* --- shared pieces --------------------------------------------------------- */

type TabProps = {
  rows: HistoryRow[]
  cur: number
  setCur: (i: number) => void
  edit: (key: string, patch: Record<string, string>) => void
  onNew: () => void
  onDelete: () => void
  focus: CellFocus
  setFocus: (f: CellFocus) => void
}

function HistoryBand({ title, onNew, onDelete, id }: { title: string; onNew: () => void; onDelete: () => void; id: string }) {
  return (
    <div className="pb-row" style={{ gap: 0, flex: 'none', padding: '0 0 0 5px', height: 24, background: BAND, borderBottom: RULE }}>
      <b style={{ flex: '1 1 auto' }}>{title}</b>
      <PBButton style={{ width: 50, minWidth: 50, height: 24 }} command={`${id}-new`} onClick={() => onNew()}>New</PBButton>
      <PBButton style={{ width: 50, minWidth: 50, height: 24 }} command={`${id}-delete`} onClick={() => onDelete()}>Delete</PBButton>
    </div>
  )
}

/** The history grid: search strip (as the DataWindow's filter row), rows,
    and an optional summary band, in a white body closed by a dark rule. */
function HistoryGrid({ columns, rows, cur, setCur, filters, summary, height, id, ended, inset = 4 }: {
  columns: PBColumn<HistoryRow>[]
  rows: HistoryRow[]
  cur: number
  setCur: (i: number) => void
  filters?: (ReactNode | null)[]
  summary?: ReactNode
  /** fixed painted height; omitted, the grid takes the rest of the page */
  height?: number
  id: string
  ended?: (r: HistoryRow) => boolean
  /** white the grid leaves at its right edge: 4px under the search strip's
      grids, 20px under Who Lives with Me */
  inset?: number
}) {
  /* the search strip runs the page's full width in grey while the grid
     below stops short of the edge, so the boxes are laid on the columns'
     own widths rather than in the DataWindow's filter row */
  const strip = filters && (
    <div className="pb-row" style={{ flex: 'none', gap: 0, height: 24, padding: `0 ${inset}px 0 1px`, background: BAND, borderBottom: RULE }}>
      <span style={{ width: 18, flex: 'none' }} />
      {columns.map((c, i) => (
        <span key={c.key} style={{ ...(c.width === undefined ? { flex: '1 1 0', minWidth: 0 } : { width: c.width, flex: 'none' }), padding: '0 3px 0 0', display: 'flex' }}>
          {filters[i]}
        </span>
      ))}
    </div>
  )
  return (
    <div style={{ ...(height ? { height, flex: 'none' } : { flex: '1 1 auto', minHeight: 120 }), display: 'flex', flexDirection: 'column', background: '#fff', borderBottom: '1px solid #545454' }}>
      {strip}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: `0 ${inset}px 0 1px` }}>
      <PBDataWindow
        flush
        empty={false}
        columns={columns}
        rows={rows}
        current={cur}
        onCurrentChange={setCur}
        rowClassName={ended ? (r) => (ended(r) ? 'pb-dw--ended' : undefined) : undefined}
        rowTutorialId={(_r, i) => `host.mois.row.${id}-${i}`}
        style={{ ...GRID_VARS, flex: '1 1 auto' }}
      />
      {summary}
      </div>
    </div>
  )
}

/** A cell of the current row goes into edit when it is clicked; every other
    cell is painted text. */
function EditCell({ row, col, current, focus, setFocus, children, editor, onClick }: {
  row: HistoryRow; col: string; current: boolean; focus: CellFocus; setFocus: (f: CellFocus) => void
  children: ReactNode; editor: () => ReactNode
  /** a drop-down cell opens on the click, once the press is over: opened on
      the press, the release would land on the list's own ▾ and shut it */
  onClick?: boolean
}) {
  if (current && focus?.key === row.key && focus.col === col) return <>{editor()}</>
  if (onClick) return <span style={{ display: 'block', minHeight: 14 }} onClick={() => setFocus({ key: row.key, col })}>{children}</span>
  /* the editor mounts and takes focus inside this mousedown; letting the
     press's default run afterwards would hand focus straight back to the
     page, so it is cancelled (the row still becomes current) */
  return <span style={{ display: 'block', minHeight: 14 }} onMouseDown={(e) => { e.preventDefault(); setFocus({ key: row.key, col }) }}>{children}</span>
}

/** the in-cell edit: no border or focus ring, the peach of a cell in edit
    (the same #ffc49f the relationship DDDW takes), its text selected */
const cellInput = (value: string, onChange: (v: string) => void, id: string, align?: 'center' | 'right') => (
  <input
    autoFocus
    className="pb-dw__edit"
    style={{ border: 0, outline: 0, padding: '0 2px', height: 14, background: '#ffc49f', textAlign: align }}
    value={value}
    data-tutorial-id={id}
    onFocus={(e) => e.currentTarget.select()}
    onClick={(e) => e.stopPropagation()}
    onChange={(e) => onChange(e.target.value)}
  />
)

/** Occupant Relationship's in-cell DDDW, dropped as soon as it takes the cell */
function RelationshipCell({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <span className="pb-dw__cellddw" style={{ display: 'block' }}>
      <PBDropDownDataWindow
        autoOpen
        w="100%"
        listW={529}
        columns={[{ key: 'value', header: 'Value', width: 201 }, { key: 'description', header: 'Description' }]}
        rows={OCCUPANT_RELATIONSHIPS}
        value={value}
        display="value"
        onSelect={(r) => onSelect(r.value)}
        tutorialId="host.mois.field.occupant-relationship"
      />
    </span>
  )
}

const dotsCell = (command: string, onClick: () => void) => (
  <PBButton bare style={{ display: 'block', width: '100%', height: 14, border: 0, background: 'transparent', padding: 0, font: 'inherit', lineHeight: '14px', color: 'inherit' }} command={command} onClick={onClick}>...</PBButton>
)

function Footer({ row }: { row?: HistoryRow }) {
  return (
    <div className="pb-row" style={{ flex: 'none', gap: 0, height: 22, padding: '0 5px', borderTop: RULE }}>
      <span style={{ width: 409 }}>Record Created:&nbsp;&nbsp;{row?.created ?? ''}</span>
      <span>Last Modified:&nbsp;&nbsp;{row?.modified ?? ''}</span>
    </div>
  )
}

const label = (text: string, style?: CSSProperties) => <span className="pb-form__label" style={{ whiteSpace: 'nowrap', ...style }}>{text}</span>

/* --- Employment ------------------------------------------------------------ */

function EmploymentTab({ rows, cur, setCur, edit, onNew, onDelete, focus, setFocus, filters, setFilter, onPick }: TabProps & {
  filters: Record<string, string>; setFilter: (k: string, v: string) => void
  onPick: (key: string, field: string, list: string) => void
}) {
  const { shown, box } = useColumnFilters(rows, [
    { key: 'occupation', w: '100%', style: { height: 15 }, anchor: 'employment-search-occupation' },
    { key: 'company', w: '100%', style: { height: 15 }, anchor: 'employment-search-company' },
  ], { match: 'upper', state: [filters, setFilter] })
  const at = Math.max(0, Math.min(cur, shown.length - 1))
  const row = shown[at]
  const total = rows.filter((r) => !r.end).reduce((sum, r) => sum + (Number(r.hrs) || 0), 0)
  const bind = (field: string) => ({
    value: row?.[field] ?? '',
    disabled: !row,
    onChange: (e: { target: { value: string } }) => { if (row) edit(row.key, { [field]: e.target.value }) },
  })
  const inCell = (field: string, anchor: string, align?: 'center' | 'right') => (r: HistoryRow) => (
    <EditCell row={r} col={field} current={r.key === row?.key} focus={focus} setFocus={setFocus}
      editor={() => cellInput(r[field] ?? '', (v) => edit(r.key, { [field]: v }), `host.mois.field.${anchor}`, align)}>
      {r[field]}
    </EditCell>
  )
  const columns: PBColumn<HistoryRow>[] = [
    { key: 'start', header: 'Start', width: 72, align: 'center', render: inCell('start', 'employment-start', 'center') },
    { key: 'end', header: 'End', width: 72, align: 'center', render: inCell('end', 'employment-end', 'center') },
    { key: 'occupation', header: 'Occupation' },
    { key: 'd', header: '', width: 17, align: 'center', render: (r) => dotsCell('employment-occupation-lookup', () => onPick(r.key, 'occupation', 'occupation')) },
    { key: 'hrs', header: 'Hrs/Wk', width: 88, align: 'right', headAlign: 'center', render: inCell('hrs', 'employment-hours', 'right') },
    { key: 'company', header: 'Company', width: 146 },
    { key: 'phoneMain', header: 'Phone (M)', width: 83 },
    { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
  ]
  /* the summary band reuses the grid's widths: the caption ends where
     Occupation ends, the value is right-aligned under Hrs/Wk */
  const summary = (
    <div className="pb-row" style={{ flex: 'none', gap: 0, height: 22, background: '#fff' }}>
      <span style={{ flex: '1 1 auto', textAlign: 'right', paddingRight: 4 }}>Total Hrs/Wk for all Current Employment Records:</span>
      <span style={{ width: 17 }} />
      <span style={{ width: 88, textAlign: 'right', paddingRight: 4 }}>{total.toFixed(2)}</span>
      <span style={{ width: 146 + 83 + 18 }} />
    </div>
  )
  return (
    <>
      <HistoryBand title="Employment History" onNew={onNew} onDelete={onDelete} id="employment" />
      <HistoryGrid
        id="employment" height={214} columns={columns} rows={shown} cur={at} setCur={setCur}
        filters={[null, null, box('occupation'), null, null, box('company'), null, null]}
        summary={summary}
      />
      {row && (
        <>
          <div style={{ flex: '1 1 auto', minHeight: 190, display: 'flex', gap: 6, padding: '2px 8px 4px' }}>
            <PBGroup title="Employer Information" style={{ width: 400, flex: 'none' }}>
              <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '72px 1fr', rowGap: 2 }}>
                {label('Occupation:')}
                <PBLookup w="100%" value={row.occupation ?? ''} readOnly name="employment-occupation" onDots={() => onPick(row.key, 'occupation', 'occupation')} />
                {label('Company:')}<PBInput w={286} {...bind('company')} data-tutorial-id="host.mois.field.employment-company" />
                {label('Address:')}<PBInput w={286} {...bind('address')} data-tutorial-id="host.mois.field.employment-address" />
                <span /><PBInput w={286} {...bind('address2')} />
                {label('City:')}
                <div className="pb-row" style={{ gap: 6 }}><PBInput w={120} {...bind('city')} />{label('Postal Code:', { width: 72, textAlign: 'right' })}<PBInput w={88} {...bind('postal')} /></div>
                {label('Province:')}
                <div className="pb-row" style={{ gap: 6 }}><PBInput w={120} {...bind('province')} />{label('Country:', { width: 72, textAlign: 'right' })}<PBInput w={88} {...bind('country')} /></div>
                {label('Office - Main:')}
                <div className="pb-row" style={{ gap: 6 }}><PBInput w={120} {...bind('phoneMain')} data-tutorial-id="host.mois.field.employment-phone" />{label('Office - Other:', { width: 72, textAlign: 'right' })}<PBInput w={88} {...bind('phoneOther')} /></div>
                {label('Office Fax:')}<PBInput w={86} {...bind('fax')} />
              </div>
            </PBGroup>
            <PBGroup title="General Notes" style={{ flex: '1 1 auto', minWidth: 0 }}>
              <PBTextArea rows={8} w="100%" {...bind('note')} data-tutorial-id="host.mois.field.employment-notes" style={{ resize: 'none' }} />
            </PBGroup>
          </div>
          <Footer row={row} />
        </>
      )}
    </>
  )
}

/* --- Education ------------------------------------------------------------- */

/** Education's detail grid: caption | field (+ "…") | gap | caption | field */
const EDU_GRID: CSSProperties = {
  display: 'grid', gridTemplateColumns: '115px 235px 39px 106px 256px', gridAutoRows: 16, rowGap: 4,
  alignItems: 'center', padding: '3px 0 3px 5px',
}

function EducationTab({ rows, cur, setCur, edit, onNew, onDelete, filters, setFilter, onPick }: TabProps & {
  filters: Record<string, string>; setFilter: (k: string, v: string) => void
  onPick: (key: string, field: string, list: string) => void
}) {
  const { shown, box } = useColumnFilters(rows, [
    { key: 'institution', w: '100%', style: { height: 15 }, anchor: 'education-search-institution' },
    { key: 'level', w: '100%', style: { height: 15 }, anchor: 'education-search-level' },
  ], { match: 'upper', state: [filters, setFilter] })
  const at = Math.max(0, Math.min(cur, shown.length - 1))
  const row = shown[at]
  const bind = (field: string) => ({
    value: row?.[field] ?? '',
    onChange: (e: { target: { value: string } }) => { if (row) edit(row.key, { [field]: e.target.value }) },
  })
  const dots = (field: string, list: string) => (r: HistoryRow) => dotsCell(`education-${field}-lookup`, () => onPick(r.key, field, list))
  const columns: PBColumn<HistoryRow>[] = [
    { key: 'start', header: 'Start', width: 72, align: 'center' },
    { key: 'stop', header: 'Stop', width: 72, align: 'center' },
    { key: 'institution', header: 'Educational Institution' },
    { key: 'd1', header: '', width: 17, align: 'center', render: dots('institution', 'institution') },
    { key: 'level', header: 'Level of Education', width: 223 },
    { key: 'd2', header: '', width: 17, align: 'center', render: dots('level', 'level') },
    { key: 'completed', header: 'Completed', width: 72, align: 'center' },
    { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
  ]
  return (
    <>
      <HistoryBand title="Education History" onNew={onNew} onDelete={onDelete} id="education" />
      <HistoryGrid
        id="education" height={278} columns={columns} rows={shown} cur={at} setCur={setCur}
        filters={[null, null, box('institution'), null, box('level'), null, null, null]}
      />
      {row && (
        <>
          <div style={{ ...EDU_GRID, flex: 'none', height: 41, boxSizing: 'border-box', borderBottom: RULE }}>
            {label('Educational Institution:')}
            <PBLookup w={235} value={row.institution ?? ''} name="education-institution" onChange={(v) => edit(row.key, { institution: v })} onDots={() => onPick(row.key, 'institution', 'institution')} fieldId="host.mois.field.education-institution" />
            <span />
            {label('Level of Education:')}
            <PBLookup w={256} value={row.level ?? ''} name="education-level" onChange={(v) => edit(row.key, { level: v })} onDots={() => onPick(row.key, 'level', 'level')} fieldId="host.mois.field.education-level" />
            {label('Institution Category:')}
            <PBSelect w={219} options={INSTITUTION_CATEGORIES} {...bind('category')} data-tutorial-id="host.mois.field.education-category" />
            <span />
            {label('Completed Date:')}
            <PBInput w={72} {...bind('completed')} data-tutorial-id="host.mois.field.education-completed" />
          </div>
          <div style={{ ...EDU_GRID, flex: '1 1 auto', gridTemplateRows: '16px 16px 50px' }}>
            {label('Enrollment Period:')}
            <div className="pb-row" style={{ gap: 0 }}>
              <PBInput w={71} align="center" {...bind('start')} data-tutorial-id="host.mois.field.education-start" />
              <span style={{ width: 26, textAlign: 'center' }}>to</span>
              <PBInput w={72} align="center" {...bind('stop')} data-tutorial-id="host.mois.field.education-stop" />
            </div>
            <span /><span /><span />
            {label('Field of Study:')}
            <PBLookup w={235} value={row.field ?? ''} name="education-field-of-study" onChange={(v) => edit(row.key, { field: v })} onDots={() => onPick(row.key, 'field', 'field')} fieldId="host.mois.field.education-field-of-study" />
            <span />
            {label('Enrolled As:')}
            <PBSelect w={219} options={ENROLLED_AS} {...bind('enrolledAs')} data-tutorial-id="host.mois.field.education-enrolled-as" />
            <span style={{ alignSelf: 'start' }}>{label('Comment:')}</span>
            <div style={{ gridColumn: '2 / 6', width: 600, alignSelf: 'stretch' }}>
              <PBTextArea rows={3} w="100%" {...bind('comment')} data-tutorial-id="host.mois.field.education-comment" style={{ resize: 'none', height: '100%' }} />
            </div>
          </div>
          <Footer row={row} />
        </>
      )}
    </>
  )
}

/* --- Housing --------------------------------------------------------------- */

function HousingTab({ rows, cur, setCur, edit, onNew, onDelete, focus, setFocus }: TabProps) {
  const patient = usePatient()
  const at = Math.max(0, Math.min(cur, rows.length - 1))
  const row = rows[at]
  const inCell = (field: string, anchor: string, align?: 'center' | 'right') => (r: HistoryRow) => (
    <EditCell row={r} col={field} current={r.key === row?.key} focus={focus} setFocus={setFocus}
      editor={() => cellInput(r[field] ?? '', (v) => edit(r.key, { [field]: v }), `host.mois.field.${anchor}`, align)}>
      {r[field]}
    </EditCell>
  )
  const columns: PBColumn<HistoryRow>[] = [
    { key: 'start', header: 'Start', width: 73, align: 'center', render: inCell('start', 'occupant-start', 'center') },
    { key: 'stop', header: 'Stop', width: 73, align: 'center', render: inCell('stop', 'occupant-stop', 'center') },
    {
      key: 'relationship', header: 'Occupant Relationship', width: 206,
      render: (r) => (
        <EditCell row={r} col="relationship" current={r.key === row?.key} focus={focus} setFocus={setFocus} onClick
          editor={() => <RelationshipCell value={r.relationship ?? ''} onSelect={(v) => edit(r.key, { relationship: v })} />}>
          {r.relationship}
        </EditCell>
      ),
    },
    { key: 'quantity', header: 'Quantity', width: 69, align: 'center', render: inCell('quantity', 'occupant-quantity', 'center') },
    { key: 'note', header: 'Note', render: inCell('note', 'occupant-note') },
    { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
  ]
  const preferred = patient.preferredPhone ?? ''
  /* a read-only field of the block, at its painted x and width */
  const ro = (value: string | undefined, x: number, w: number, y: number) => (
    <PBInput w={w} value={value ?? ''} readOnly tabIndex={-1} style={{ position: 'absolute', left: x, top: y, height: 16 }} />
  )
  const cap = (text: string, x: number, y: number, opts: { right?: boolean; underline?: boolean } = {}) => (
    <span style={{
      position: 'absolute', top: y, lineHeight: '16px', color: '#808080', whiteSpace: 'nowrap',
      ...(opts.right ? { right: `calc(100% - ${x}px)` } : { left: x }),
      textDecoration: opts.underline ? 'underline' : undefined,
    }}>{text}</span>
  )
  const Y = [4, 24, 44, 64, 84, 104]
  return (
    <>
      {/* Contact Information as per Demographics (read-only) */}
      <div style={{ flex: 'none' }} data-tutorial-id="host.mois.group.housing-contact">
        <div style={{ height: 20, lineHeight: '20px', padding: '0 5px', fontWeight: 700, background: BAND, borderBottom: RULE }}>
          Contact Information as per Demographics (read-only)
        </div>
        <div style={{ position: 'relative', height: 129, background: 'var(--pb-face)' }}>
          {cap('Address:', 15, Y[0]!)}{ro(patient.address, 105, 279, Y[0]!)}
          {cap('Address:', 15, Y[1]!)}{ro(patient.address2, 105, 279, Y[1]!)}
          {cap('City:', 15, Y[2]!)}{ro(patient.city, 105, 124, Y[2]!)}
          {cap('Province:', 287, Y[2]!, { right: true })}{ro(patient.province, 291, 94, Y[2]!)}
          {cap('Postal Code:', 15, Y[3]!)}{ro(patient.postal, 105, 87, Y[3]!)}
          {cap('Country:', 287, Y[3]!, { right: true })}{ro(patient.country, 291, 94, Y[3]!)}

          {cap('Home:', 399, Y[0]!, { underline: preferred === 'Home' })}{ro(phone(patient.home), 490, 87, Y[0]!)}
          {cap('Work:', 399, Y[1]!, { underline: preferred === 'Work' })}{ro(phone(patient.work), 490, 87, Y[1]!)}{ro(patient.workExt, 610, 59, Y[1]!)}
          {cap('Cell:', 399, Y[2]!, { underline: preferred === 'Cell' })}{ro(phone(patient.cell), 490, 87, Y[2]!)}
          {cap('Preferred Phone:', 399, Y[3]!)}{ro(preferred, 490, 87, Y[3]!)}
          {cap('eMail (Home):', 399, Y[4]!)}{ro(patient.emailHome, 490, 279, Y[4]!)}
          {cap('eMail (Work):', 399, Y[5]!)}{ro(patient.emailWork, 490, 279, Y[5]!)}
          <span style={{ position: 'absolute', left: 679, top: Y[0]! }}><PBCheckbox label="Leave Message" checked={!!patient.homeMessage} disabled /></span>
          <span style={{ position: 'absolute', left: 679, top: Y[1]! }}><PBCheckbox label="Leave Message" checked={!!patient.workMessage} disabled /></span>
          {cap('Pager:', 672, Y[2]!, { right: true })}{ro(patient.pager, 676, 93, Y[2]!)}
          {cap('Fax:', 672, Y[3]! - 3, { right: true })}{ro(patient.fax, 676, 93, Y[3]!)}
        </div>
      </div>
      <HistoryBand title="Who Lives with Me" onNew={onNew} onDelete={onDelete} id="occupants" />
      <HistoryGrid id="occupant" inset={20} columns={columns} rows={rows} cur={at} setCur={setCur} ended={(r) => !!r.stop && r.stop.replace(/\./g, '') <= MOIS_TODAY.replace(/\./g, '')} />
    </>
  )
}
