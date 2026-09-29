import { useState, type CSSProperties } from 'react'
import { useChartRecords } from '../data/chart-records'
import { SESSION_USER } from '../data/chartSession'
import {
  DETERMINANT_PANELS, DETERMINANT_TABS, ENROLLED_AS, INSTITUTION_CATEGORIES, OCCUPANT_RELATIONSHIPS,
  nextHistoryKey, saveHistory, setHistory, undoHistory, useDeterminants,
  type DeterminantTab, type HistoryList, type HistoryRow,
} from '../data/determinants'
import { clockNow } from '../data/measureEntry'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBGroup, PBInput, PBLookup,
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
   INFERRED: the Trend / Less… behaviour, in-grid editing, and that the two
   search boxes over each history grid filter it by the column below them.
   ========================================================================= */

const LIST_OF: Record<DeterminantTab, HistoryList | null> = {
  Employment: 'employment', Education: 'education', Housing: 'occupants', Socioeconomic: null,
}

type StatusRow = { collected: string; name: string; value: string; units: string; flag: string; ranges: string }

const dash = (mois: string) => mois.replace(/[./]/g, '-')
const stampNow = () => `${MOIS_TODAY}  ${clockNow()}  ${SESSION_USER}`

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
  const [filters, setFilters] = useState<Record<string, string>>({})

  /* the chart's own lists: the export carries occupants (tdt_chart_occupant);
     employment and education history are not in it */
  const baseline: Record<HistoryList, HistoryRow[]> = {
    employment: [],
    education: [],
    occupants: occupants.map((o, i) => ({
      key: o.id_chart_occupant ?? `occupant-${i}`, start: (o.dtm_start ?? '').split(' ')[0]!.replace(/\//g, '.'), stop: (o.dtm_end ?? '').split(' ')[0]!.replace(/\//g, '.'),
      relationship: o.str_occupant_relationship ?? '', quantity: o.num_quantity ?? '', note: o.str_note ?? '', clip: '-',
    })),
  }
  const rowsOf = (list: HistoryList) => det.rows[list] ?? baseline[list]
  const dirty = JSON.stringify(det.rows) !== JSON.stringify(det.saved)
  const list = LIST_OF[tab]
  const cfg = DETERMINANT_PANELS[tab]

  /* the status rows: an Update this session, else the chart's latest
     measure of that code, else NOT DOCUMENTED */
  const status: StatusRow[] = cfg.observations.map((o) => {
    const own = det.observations.find((x) => x.name === o.name)
    if (own) return { collected: dash(own.collected), name: o.name, value: own.value, units: '', flag: '', ranges: '' }
    const m = measures.find((r) => (o.code ? r.str_code === o.code : r.str_description === o.name) && (r.str_value ?? '') !== '')
    return m
      ? { collected: dash((m.dtm_collect_date ?? '').split(' ')[0]!), name: o.name, value: m.str_value ?? '', units: m.str_units ?? '', flag: m.str_abnormal ?? '', ranges: '' }
      : { collected: '', name: o.name, value: 'NOT DOCUMENTED', units: '', flag: '', ranges: '' }
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
  }
  const deleteRow = (l: HistoryList) => {
    const rows = rowsOf(l)
    const at = Math.min(cur[l], rows.length - 1)
    if (at < 0) return
    setHistory(chart, l, rows.filter((_, i) => i !== at))
    setCur((c) => ({ ...c, [l]: Math.max(0, at - 1) }))
  }
  /* a "…" pick list writes to the list the store holds, so hand it the
     chart's own rows first if nothing has been edited yet */
  const pick = (l: HistoryList, key: string, field: string, listName: string) => {
    if (!det.rows[l]) setHistory(chart, l, rowsOf(l))
    open('determinant-lookup', { list: listName, target: l, key, field })
  }

  useScreenReport({
    determinantsTab: pbSlug(tab),
    employmentRows: rowsOf('employment').length,
    educationRows: rowsOf('education').length,
    occupantRows: rowsOf('occupants').length,
    observationsRecorded: det.observations.length,
    statusCollapsed: less,
    dirty,
  })

  return (
    <>
      <PBViewHeader title="Determinants of Health" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New Record', disabled: !list, onClick: () => { if (list) addRow(list) } },
          { label: 'Delete Record', disabled: !list || !rowsOf(list).length, onClick: () => { if (list) deleteRow(list) } },
          { label: 'Save', disabled: !dirty, onClick: () => saveHistory(chart) },
          { label: 'Undo', disabled: !dirty, onClick: () => undoHistory(chart) },
          { label: 'Refresh' },
        ]}
      />
      <ChartIdentityStrip />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBTabs tabs={DETERMINANT_TABS} active={tab} onChange={(t) => setTab(t as DeterminantTab)} compact>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
            {/* the status panel */}
            <div style={{ flex: 'none', border: '1px solid var(--pb-border)', margin: '0 0 2px', background: '#fff' }}>
              <div className="pb-row" style={{ gap: 6, padding: '2px 4px', background: 'var(--pb-face)', borderBottom: '1px solid var(--pb-border)' }}>
                <PBButton size="sm" style={{ minWidth: 64 }} command="determinants-update" onClick={() => open('determinant-panel', { tab })}>Update</PBButton>
                <b>{cfg.band}</b>
                <span className="pb-row__spacer" />
                <PBButton bare className="pb-link" command="determinants-trend" onClick={() => open('determinant-trend', { tab })}>Trend</PBButton>
                <PBButton bare className="pb-link" style={{ marginLeft: 12 }} command={less ? 'determinants-more' : 'determinants-less'} onClick={() => setLess((v) => !v)}>
                  {less ? 'More...' : 'Less...'}
                </PBButton>
              </div>
              {!less && (
                <div data-tutorial-id="host.mois.group.determinants-status">
                  <PBDataWindow
                    flush
                    gutter={false}
                    zebra={false}
                    rules={false}
                    head="grey"
                    current={-1}
                    columns={[
                      { key: 'collected', header: 'Collected', width: 70 },
                      { key: 'name', header: 'Name', width: 290 },
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
                rows={rowsOf('employment')} cur={cur.employment} setCur={(i) => setCur((c) => ({ ...c, employment: i }))}
                filters={filters} setFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
                edit={(key, patch) => edit('employment', key, patch)}
                onNew={() => addRow('employment')} onDelete={() => deleteRow('employment')}
                onPick={(key, field, name) => pick('employment', key, field, name)}
              />
            )}
            {tab === 'Education' && (
              <EducationTab
                rows={rowsOf('education')} cur={cur.education} setCur={(i) => setCur((c) => ({ ...c, education: i }))}
                filters={filters} setFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
                edit={(key, patch) => edit('education', key, patch)}
                onNew={() => addRow('education')} onDelete={() => deleteRow('education')}
                onPick={(key, field, name) => pick('education', key, field, name)}
              />
            )}
            {tab === 'Housing' && (
              <HousingTab
                rows={rowsOf('occupants')} cur={cur.occupants} setCur={(i) => setCur((c) => ({ ...c, occupants: i }))}
                edit={(key, patch) => edit('occupants', key, patch)}
                onNew={() => addRow('occupants')} onDelete={() => deleteRow('occupants')}
              />
            )}
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
}

function HistoryBand({ title, onNew, onDelete, id }: { title: string; onNew: () => void; onDelete: () => void; id: string }) {
  return (
    <div className="pb-row" style={{ gap: 0, flex: 'none', padding: '0 0 0 4px', height: 24, background: 'linear-gradient(#e4e0dc, #d6d1cc)', borderTop: '1px solid var(--pb-border)', borderBottom: '1px solid var(--pb-border)' }}>
      <b style={{ flex: '1 1 auto' }}>{title}</b>
      <PBButton style={{ minWidth: 52, height: 23 }} command={`${id}-new`} onClick={() => onNew()}>New</PBButton>
      <PBButton style={{ minWidth: 52, height: 23 }} command={`${id}-delete`} onClick={() => onDelete()}>Delete</PBButton>
    </div>
  )
}

const cellInput = (value: string, onChange: (v: string) => void, id: string, align?: 'center' | 'right') => (
  <PBInput w="100%" align={align} value={value} data-tutorial-id={id} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange(e.target.value)} />
)

function Footer({ row }: { row?: HistoryRow }) {
  return (
    <div className="pb-row" style={{ flex: 'none', gap: 0, padding: '3px 8px', borderTop: '1px solid var(--pb-border)' }}>
      <span style={{ width: 390 }}>Record Created:&nbsp;&nbsp;{row?.created ?? ''}</span>
      <span>Last Modified:&nbsp;&nbsp;{row?.modified ?? ''}</span>
    </div>
  )
}

const label = (text: string, style?: CSSProperties) => <span className="pb-form__label" style={{ whiteSpace: 'nowrap', ...style }}>{text}</span>

/* --- Employment ------------------------------------------------------------ */

function EmploymentTab({ rows, cur, setCur, edit, onNew, onDelete, filters, setFilter, onPick }: TabProps & {
  filters: Record<string, string>; setFilter: (k: string, v: string) => void
  onPick: (key: string, field: string, list: string) => void
}) {
  const { shown, box } = useColumnFilters(rows, [
    { key: 'occupation', w: 276, anchor: 'employment-search-occupation' },
    { key: 'company', w: 148, anchor: 'employment-search-company' },
  ], { match: 'upper', state: [filters, setFilter] })
  const row = shown[Math.min(cur, shown.length - 1)]
  const at = Math.max(0, Math.min(cur, shown.length - 1))
  const total = rows.filter((r) => !r.end).reduce((sum, r) => sum + (Number(r.hrs) || 0), 0)
  const bind = (field: string) => ({
    value: row?.[field] ?? '',
    disabled: !row,
    onChange: (e: { target: { value: string } }) => { if (row) edit(row.key, { [field]: e.target.value }) },
  })
  const isCur = (r: HistoryRow) => r.key === row?.key
  const columns: PBColumn<HistoryRow>[] = [
    { key: 'start', header: 'Start', width: 84, align: 'center', render: (r) => (isCur(r) ? cellInput(r.start ?? '', (v) => edit(r.key, { start: v }), 'host.mois.field.employment-start', 'center') : r.start) },
    { key: 'end', header: 'End', width: 84, align: 'center', render: (r) => (isCur(r) ? cellInput(r.end ?? '', (v) => edit(r.key, { end: v }), 'host.mois.field.employment-end', 'center') : r.end) },
    { key: 'occupation', header: 'Occupation' },
    { key: 'd', header: '', dots: true, render: (r) => <PBButton bare className="pb-link" command="employment-occupation-lookup" onClick={() => onPick(r.key, 'occupation', 'occupation')}>…</PBButton> },
    { key: 'hrs', header: 'Hrs/Wk', width: 70, align: 'right', render: (r) => (isCur(r) ? cellInput(r.hrs ?? '', (v) => edit(r.key, { hrs: v }), 'host.mois.field.employment-hours', 'right') : r.hrs) },
    { key: 'company', header: 'Company', width: 150 },
    { key: 'phoneMain', header: 'Phone (M)', width: 100 },
    { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
  ]
  return (
    <>
      <HistoryBand title="Employment History" onNew={onNew} onDelete={onDelete} id="employment" />
      <div className="pb-row" style={{ gap: 0, padding: '3px 0', flex: 'none' }}>
        <span style={{ width: 186 }} />
        {box('occupation')}
        <span style={{ width: 106 }} />
        {box('company')}
      </div>
      <div style={{ height: 150, flex: 'none', display: 'flex', padding: '0 2px' }}>
        <PBDataWindow flush columns={columns} rows={shown} current={at} onCurrentChange={setCur} rowTutorialId={(_r, i) => `host.mois.row.employment-${i}`} empty="" />
      </div>
      <div style={{ textAlign: 'center', padding: '4px 0', flex: 'none' }}>
        Total Hrs/Wk for all Current Employment Records:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{total.toFixed(2)}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 190, display: 'flex', gap: 6, padding: '2px 8px 4px', borderTop: '1px solid var(--pb-border)' }}>
        <PBGroup title="Employer Information" style={{ width: 400, flex: 'none' }}>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '72px 1fr', rowGap: 2 }}>
            {label('Occupation:')}
            <PBLookup w="100%" value={row?.occupation ?? ''} readOnly disabled={!row} name="employment-occupation" onDots={() => { if (row) onPick(row.key, 'occupation', 'occupation') }} />
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
  )
}

/* --- Education ------------------------------------------------------------- */

function EducationTab({ rows, cur, setCur, edit, onNew, onDelete, filters, setFilter, onPick }: TabProps & {
  filters: Record<string, string>; setFilter: (k: string, v: string) => void
  onPick: (key: string, field: string, list: string) => void
}) {
  const { shown, box } = useColumnFilters(rows, [
    { key: 'institution', w: 276, anchor: 'education-search-institution' },
    { key: 'level', w: 196, anchor: 'education-search-level' },
  ], { match: 'upper', state: [filters, setFilter] })
  const at = Math.max(0, Math.min(cur, shown.length - 1))
  const row = shown[at]
  const bind = (field: string) => ({
    value: row?.[field] ?? '',
    disabled: !row,
    onChange: (e: { target: { value: string } }) => { if (row) edit(row.key, { [field]: e.target.value }) },
  })
  const dots = (field: string, list: string) => (r: HistoryRow) => (
    <PBButton bare className="pb-link" command={`education-${field}-lookup`} onClick={() => onPick(r.key, field, list)}>…</PBButton>
  )
  const columns: PBColumn<HistoryRow>[] = [
    { key: 'start', header: 'Start', width: 72, align: 'center' },
    { key: 'stop', header: 'Stop', width: 72, align: 'center' },
    { key: 'institution', header: 'Educational Institution' },
    { key: 'd1', header: '', dots: true, render: dots('institution', 'institution') },
    { key: 'level', header: 'Level of Education', width: 222 },
    { key: 'd2', header: '', dots: true, render: dots('level', 'level') },
    { key: 'completed', header: 'Completed', width: 80, align: 'center' },
    { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
  ]
  return (
    <>
      <HistoryBand title="Education History" onNew={onNew} onDelete={onDelete} id="education" />
      <div className="pb-row" style={{ gap: 0, padding: '3px 0', flex: 'none' }}>
        <span style={{ width: 164 }} />
        {box('institution')}
        <span style={{ width: 18 }} />
        {box('level')}
      </div>
      <div style={{ height: 222, flex: 'none', display: 'flex', padding: '0 2px' }}>
        <PBDataWindow flush columns={columns} rows={shown} current={at} onCurrentChange={setCur} rowTutorialId={(_r, i) => `host.mois.row.education-${i}`} empty="" />
      </div>
      <div style={{ flex: 'none', borderTop: '1px solid var(--pb-border)', padding: '4px 6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '112px 240px 120px 1fr', columnGap: 6, rowGap: 3, alignItems: 'center' }}>
          {label('Educational Institution:')}
          <PBLookup w={240} value={row?.institution ?? ''} disabled={!row} name="education-institution" onChange={(v) => { if (row) edit(row.key, { institution: v }) }} onDots={() => { if (row) onPick(row.key, 'institution', 'institution') }} fieldId="host.mois.field.education-institution" />
          {label('Level of Education:', { paddingLeft: 30 })}
          <PBLookup w={260} value={row?.level ?? ''} disabled={!row} name="education-level" onChange={(v) => { if (row) edit(row.key, { level: v }) }} onDots={() => { if (row) onPick(row.key, 'level', 'level') }} fieldId="host.mois.field.education-level" />
          {label('Institution Category')}
          <PBSelect w={220} options={INSTITUTION_CATEGORIES} {...bind('category')} data-tutorial-id="host.mois.field.education-category" />
          {label('Completed Date:', { paddingLeft: 30 })}
          <PBInput w={74} align="center" {...bind('completed')} data-tutorial-id="host.mois.field.education-completed" />
        </div>
      </div>
      <div style={{ flex: '1 1 auto', borderTop: '1px solid var(--pb-border)', padding: '4px 6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '112px 240px 120px 1fr', columnGap: 6, rowGap: 3, alignItems: 'center' }}>
          {label('Enrollment Period:')}
          <div className="pb-row" style={{ gap: 6 }}>
            <PBInput w={74} align="center" {...bind('start')} data-tutorial-id="host.mois.field.education-start" />
            <span>to</span>
            <PBInput w={74} align="center" {...bind('stop')} data-tutorial-id="host.mois.field.education-stop" />
          </div>
          <span /><span />
          {label('Field of Study:')}
          <PBLookup w={240} value={row?.field ?? ''} disabled={!row} name="education-field-of-study" onChange={(v) => { if (row) edit(row.key, { field: v }) }} onDots={() => { if (row) onPick(row.key, 'field', 'field') }} fieldId="host.mois.field.education-field-of-study" />
          {label('Enrolled As:', { paddingLeft: 30 })}
          <PBSelect w={220} options={ENROLLED_AS} {...bind('enrolledAs')} data-tutorial-id="host.mois.field.education-enrolled-as" />
          {label('Comment:')}
          <div style={{ gridColumn: '2 / 5' }}>
            <PBTextArea rows={3} w="100%" {...bind('comment')} data-tutorial-id="host.mois.field.education-comment" style={{ resize: 'none' }} />
          </div>
        </div>
      </div>
      <Footer row={row} />
    </>
  )
}

/* --- Housing --------------------------------------------------------------- */

function HousingTab({ rows, cur, setCur, edit, onNew, onDelete }: TabProps) {
  const patient = usePatient()
  const at = Math.max(0, Math.min(cur, rows.length - 1))
  const row = rows[at]
  const ro = (value: string | undefined, w: number | string) => <PBInput w={w} value={value ?? ''} readOnly disabled />
  const grey = { color: '#7a7a7a' }
  const isCur = (r: HistoryRow) => r.key === row?.key
  const columns: PBColumn<HistoryRow>[] = [
    { key: 'start', header: 'Start', width: 92, align: 'center', render: (r) => (isCur(r) ? cellInput(r.start ?? '', (v) => edit(r.key, { start: v }), 'host.mois.field.occupant-start', 'center') : r.start) },
    { key: 'stop', header: 'Stop', width: 72, align: 'center', render: (r) => (isCur(r) ? cellInput(r.stop ?? '', (v) => edit(r.key, { stop: v }), 'host.mois.field.occupant-stop', 'center') : r.stop) },
    {
      key: 'relationship', header: 'Occupant Relationship', width: 206,
      render: (r) => (isCur(r)
        ? <PBSelect w="100%" options={OCCUPANT_RELATIONSHIPS.includes(r.relationship ?? '') ? OCCUPANT_RELATIONSHIPS : [...OCCUPANT_RELATIONSHIPS, r.relationship ?? '']} value={r.relationship ?? ''} data-tutorial-id="host.mois.field.occupant-relationship" onChange={(e) => edit(r.key, { relationship: e.target.value })} />
        : r.relationship),
    },
    { key: 'quantity', header: 'Quantity', width: 68, align: 'center', render: (r) => (isCur(r) ? cellInput(r.quantity ?? '', (v) => edit(r.key, { quantity: v }), 'host.mois.field.occupant-quantity', 'center') : r.quantity) },
    { key: 'note', header: 'Note', render: (r) => (isCur(r) ? cellInput(r.note ?? '', (v) => edit(r.key, { note: v }), 'host.mois.field.occupant-note') : r.note) },
    { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
  ]
  const preferred = patient.preferredPhone ?? ''
  return (
    <>
      {/* Contact Information as per Demographics (read-only) */}
      <div style={{ flex: 'none', borderTop: '1px solid var(--pb-border)' }} data-tutorial-id="host.mois.group.housing-contact">
        <div style={{ padding: '3px 4px', fontWeight: 700, background: 'linear-gradient(#e4e0dc, #d6d1cc)', borderBottom: '1px solid var(--pb-border)' }}>
          Contact Information as per Demographics (read-only)
        </div>
        <div style={{ display: 'flex', gap: 16, padding: '4px 10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '84px 124px 58px 94px', columnGap: 6, rowGap: 3, alignItems: 'center' }}>
            <span style={grey}>Address:</span><div style={{ gridColumn: '2 / 5' }}>{ro(patient.address, '100%')}</div>
            <span style={grey}>Address:</span><div style={{ gridColumn: '2 / 5' }}>{ro(patient.address2, '100%')}</div>
            <span style={grey}>City:</span>{ro(patient.city, '100%')}<span style={{ ...grey, textAlign: 'right' }}>Province:</span>{ro(patient.province, '100%')}
            <span style={grey}>Postal Code:</span>{ro(patient.postal, '100%')}<span style={{ ...grey, textAlign: 'right' }}>Country:</span>{ro(patient.country, '100%')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 88px 60px auto', columnGap: 6, rowGap: 3, alignItems: 'center' }}>
            <span style={{ ...grey, textDecoration: preferred === 'Home' ? 'underline' : undefined }}>Home:</span>{ro(patient.home, '100%')}<span />
            <PBCheckbox label="Leave Message" checked={!!patient.homeMessage} disabled />
            <span style={{ ...grey, textDecoration: preferred === 'Work' ? 'underline' : undefined }}>Work:</span>{ro(patient.work, '100%')}{ro(patient.workExt, '100%')}
            <PBCheckbox label="Leave Message" checked={!!patient.workMessage} disabled />
            <span style={{ ...grey, textDecoration: preferred === 'Cell' ? 'underline' : undefined }}>Cell:</span>{ro(patient.cell, '100%')}<span style={{ ...grey, textAlign: 'right' }}>Pager:</span>{ro(patient.pager, 94)}
            <span style={grey}>Preferred Phone:</span>{ro(preferred, '100%')}<span style={{ ...grey, textAlign: 'right' }}>Fax:</span>{ro(patient.fax, 94)}
            <span style={grey}>eMail (Home):</span><div style={{ gridColumn: '2 / 5' }}>{ro(patient.emailHome, '100%')}</div>
            <span style={grey}>eMail (Work):</span><div style={{ gridColumn: '2 / 5' }}>{ro(patient.emailWork, '100%')}</div>
          </div>
        </div>
      </div>
      <HistoryBand title="Who Lives with Me" onNew={onNew} onDelete={onDelete} id="occupants" />
      <div style={{ flex: '1 1 auto', minHeight: 160, display: 'flex', padding: '0 2px 2px' }}>
        <PBDataWindow flush columns={columns} rows={rows} current={at} onCurrentChange={setCur} rowTutorialId={(_r, i) => `host.mois.row.occupant-${i}`} empty="" />
      </div>
    </>
  )
}
