import { useState, type ReactNode } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBSelect, PBTextArea,
  PBViewHeader, PBWindow, pbSlug, usePBInstrumentation,
  type PBColumn,
} from '../pb'
import {
  BENEFIT_SERVICES, BENEFIT_SOURCES, CHART_SUMMARIES, CHART_SUMMARY_COMMANDS, CODE_SOURCES,
  GENERIC_MANAGED_LIST, LOOKUP_CODE_SYSTEMS, LOOKUP_COMMANDS, LOOKUP_REFERENCE_SETS, LOOKUP_SETTINGS,
  MANAGED_LISTS, PROMPT_LISTS, REFERENCE_SETS, REFERENCE_SET_COMMANDS, SELECTION_LISTS,
  SERVICE_CODE_WINDOW, SNIPPETS, SNIPPET_COMMANDS, SUMMARY_SECTIONS, TEXT_LABELS, TEXT_LABEL_BODY,
  TEXT_LABEL_COMMANDS,
  type AdminColumn, type AdminRow, type ManagedList, type SummarySection,
} from '../data/adminLists'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { AdminLanding } from './AdminLandingViews'

/* ============================================================================
   Administration list windows with no Clinic Management twin:

     Prompt / Selection List Mgt ▸ Prompt Lists      Prompt List Management
                                  ▸ Selection Lists  Selection List Management
                                  ▸ Text / Labels    Text / Label List
                                  ▸ Snippet          Snippet List
     Configuration ▸ Chart Summaries                  Chart Summary Configuration
     Codeset Management ▸ Reference Sets              Code Reference Sets
                        ▸ Lookup Settings             Code Lookup Configuration

   and the editors they open: the Selection List Manager, the Service Code
   Prompt Management Window, the Benefit Source List / New Benefit Source /
   Benefit Source Detail run, and Configure Code Lookup Setting. Every window
   is transcribed from the capture its data block in `data/adminLists.ts`
   cites; none of them has patient context.

   Behaviour is kept minimal but real: New Record adds a row and makes it
   current, Delete Record removes the current one, Save stamps the footer
   where the window has one, and Close Window shuts the sheet (`onClose`).

   Reported to the frame: `host.screen.row` (the current row's anchor id),
   `host.screen.rows` (how many rows the list holds), `host.screen.saved`,
   and `host.dialog` for whichever editor is open.
   ========================================================================= */

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/** yy.mm.dd hh:mm — the footer stamp format (`f183bf64…`: 09.07.04 19:53). */
function stamp(): string {
  const [y, m, d] = MOIS_TODAY.split('.')
  const now = new Date()
  return `${y!.slice(2)}.${m}.${d}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const rgb = (r: unknown, g: unknown, b: unknown) => `rgb(${Number(r) || 0}, ${Number(g) || 0}, ${Number(b) || 0})`

/** A data-file column table as the kit's columns. */
function toColumns(columns: AdminColumn[]): PBColumn<AdminRow>[] {
  return columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    headAlign: 'center',
    render: c.check
      ? (r: AdminRow) => <PBCheckbox checked={Boolean(r[c.key])} />
      : c.swatch
        ? (r: AdminRow) => {
          const fill = c.swatch === 'row' ? rgb(r.r, r.g, r.b) : rgb(r.br ?? r.r, r.bg ?? r.g, r.bb ?? r.b)
          return (
            <span style={{ display: 'block', background: fill, textAlign: 'center', margin: '0 -2px' }}>
              {c.swatch === 'row' ? 'ROW COLOR' : 'BLOCK COLOR'}
            </span>
          )
        }
        : c.drop
          ? (r: AdminRow) => (
            <span className="pb-row" style={{ gap: 0, border: '1px solid #a0a0a0', background: '#fff', height: 16 }}>
              <span style={{ flex: 1, overflow: 'hidden', paddingLeft: 2 }}>{String(r[c.key] ?? '')}</span>
              <span style={{ width: 14, textAlign: 'center', borderLeft: '1px solid #c0c0c0' }}>▾</span>
            </span>
          )
          : undefined,
  }))
}

/* --- the child-window chrome these editors share ------------------------ */

function EditorWindow({ title, id, width, height, onClose, children, z = 70 }: {
  title: string
  id: string
  width: number
  height?: number
  onClose: () => void
  children: ReactNode
  z?: number
}) {
  useScreenReport({ dialog: id })
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: z }}>
      <PBWindow
        child
        controls={false}
        title={title}
        onClose={onClose}
        tutorialId={`host.mois.dialog.${id}`}
        style={{ width, height, maxWidth: '100%', maxHeight: '100%' }}
      >
        {children}
      </PBWindow>
    </div>
  )
}

function Footer({ buttons, onPress }: { buttons: string[]; onPress: (label: string) => void }) {
  const host = usePBInstrumentation()
  return (
    <div className="pb-footer">
      <span className="pb-footer__spacer" />
      {buttons.map((b) => (
        <PBButton
          key={b}
          wide
          data-tutorial-id={host?.anchor('command', pbSlug(b))}
          onClick={() => { host?.report('command', { command: pbSlug(b) }); onPress(b) }}
        >
          {b}
        </PBButton>
      ))}
      <span className="pb-footer__spacer" />
    </div>
  )
}

/** A white filter strip with one box over each named column. */
function FilterStrip({ widths }: { widths: (number | null)[] }) {
  return (
    <div className="pb-row" style={{ gap: 2, padding: '3px 3px 3px 16px', background: '#fff', flex: 'none' }}>
      {widths.map((w, i) => (w === null
        ? <span key={i} style={{ width: 0 }} />
        : <PBInput key={i} w={w} data-tutorial-id={`host.mois.field.filter-${i + 1}`} />))}
    </div>
  )
}

/* ===========================================================================
   The router
   ======================================================================== */

export function AdminListsView({ node, onClose }: { node: string; onClose?: () => void }) {
  const close = () => onClose?.()
  switch (node) {
    case 'ad-prompt-lists': return <PromptListManagement onClose={close} />
    case 'ad-selection-lists': return <SelectionListManagement onClose={close} />
    case 'ad-text-labels': return <TextLabelList onClose={close} />
    case 'ad-snippet': return <SnippetList onClose={close} />
    case 'ad-chart-summaries': return <ChartSummaryConfiguration />
    case 'ad-reference-sets': return <CodeReferenceSets />
    case 'ad-lookup-settings': return <CodeLookupConfiguration />
    case 'ad-designer':
    case 'ad-clinic-mgt': return <AdminLanding node={node} />
    default: return null
  }
}

/* ===========================================================================
   Prompt List Management                 `78b0e486…` (303078)
   Open List (or a double-click) opens the list: Service Code has its own
   window (`3eb6a249…`, 303219); the other seven open the Selection List
   Manager, whose record is a code, a description and a category (303219:
   "Key in the desired code, description and category").
   ======================================================================== */

const PROMPT_LIST_COLUMNS: AdminColumn[] = [
  { key: 'code', header: 'Code', width: 140 },
  { key: 'desc', header: 'Description', width: 300 },
  { key: 'category', header: 'Category', width: 160 },
]

function PromptListManagement({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const row = PROMPT_LISTS[cur]
  useScreenReport({ row: row ? `list-${pbSlug(String(row.list))}` : null, rows: PROMPT_LISTS.length })
  const openList = (r = row) => { if (r) setOpen(String(r.list)) }

  return (
    <>
      <PBViewHeader title="Prompt List Management" />
      <PBCommandRow commands={[{ label: 'Open List', onClick: () => openList() }, { label: 'Close Window', onClick: onClose }]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow<AdminRow>
          rows={PROMPT_LISTS}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => openList(r)}
          rowTutorialId={(r) => `host.mois.row.list-${pbSlug(String(r.list))}`}
          columns={[
            { key: 'list', header: 'Selection List', width: 236, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 540, headAlign: 'center' },
          ]}
        />
      </div>
      {open === 'Service Code' && <ServiceCodePromptWindow onClose={() => setOpen(null)} />}
      {open && open !== 'Service Code' && (
        <SelectionListManager name={open} list={{ ...GENERIC_MANAGED_LIST, columns: PROMPT_LIST_COLUMNS }} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

/** `3eb6a249…`: the Service Code prompt list's own window. */
function ServiceCodePromptWindow({ onClose }: { onClose: () => void }) {
  const w = SERVICE_CODE_WINDOW
  const [code, setCode] = useState(w.code)
  const [condition, setCondition] = useState(w.defaultHealthCondition)
  const dot = <span style={{ color: '#e00000', width: 10, display: 'inline-block' }}>●</span>
  const head = (text: string) => <div style={{ color: '#000080', fontWeight: 700, padding: '6px 0 2px', borderBottom: '1px solid #b0b0b0' }}>{text}</div>
  const line = (label: string, control: ReactNode, pre?: ReactNode) => (
    <div className="pb-row" style={{ gap: 4, padding: '2px 0' }}>
      <span style={{ width: 10 }}>{pre}</span>
      <span className="pb-form__label" style={{ width: 96 }}>{label}</span>
      {control}
    </div>
  )
  return (
    <EditorWindow title={w.title} id="service-code-prompt-management-window" width={820} height={620} onClose={onClose}>
      <PBCommandRow commands={w.commands.map((label) => ({ label, onClick: label === 'Close Window' ? onClose : undefined }))} />
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)', padding: '0 8px 8px' }}>
        {head('Identification')}
        {line('Code:', <><PBLookup w={170} value={code} onChange={setCode} name="code" fieldId="host.mois.field.code" /><span style={{ color: '#808080' }}>(mandatory)</span></>, dot)}
        {line('Code System:', <><PBSelect w={170} options={w.codeSystems} defaultValue={w.codeSystem} /><span style={{ color: '#808080' }}>(mandatory)</span></>)}
        {line('Description:', <PBInput w={390} defaultValue={w.description} />)}
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 40 }}>
          <div style={{ flex: '1 1 0' }}>
            {head('Amounts')}
            {w.amounts.map(([label, value]) => line(label, <PBInput w={74} defaultValue={value} align="right" />))}
          </div>
          <div style={{ flex: '1 1 0' }}>
            {head('Alternate Codes')}
            <div className="pb-row" style={{ gap: 6, padding: '2px 0', justifyContent: 'flex-end' }}>
              Alternate Low:<PBInput w={110} /> Age (Min):<PBInput w={42} defaultValue={w.alternate.ageMin} align="right" />
            </div>
            <div className="pb-row" style={{ gap: 6, padding: '2px 0', justifyContent: 'flex-end' }}>
              Alternate High:<PBInput w={110} /> Age (Max):<PBInput w={42} defaultValue={w.alternate.ageMax} align="right" />
            </div>
            <div className="pb-row" style={{ gap: 6, padding: '2px 0' }}>
              <span style={{ marginLeft: 'auto' }}>PBF Core Primary Care Service Code:</span><PBCheckbox />
              <span style={{ width: 150 }} />
            </div>
          </div>
        </div>
        {head('Other Information')}
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 40 }}>
          <div style={{ flex: '1 1 0' }}>
            {line('Time Dependent:', <PBSelect w={164} options={['']} />)}
            {w.other.map(([label, value]) => line(label, <PBInput w={110} defaultValue={value} />))}
          </div>
          <div style={{ flex: '1 1 0' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="pb-row" style={{ gap: 6, padding: '2px 0', justifyContent: 'flex-end' }}>
                Specialty Code {n}:<PBInput w={110} />
              </div>
            ))}
            <div className="pb-row" style={{ gap: 6, padding: '8px 0 2px', justifyContent: 'flex-end' }} data-tutorial-id="host.mois.field.default-health-condition">
              {dot}Default Health Condition:
              <PBLookup w={110} value={condition} onChange={setCondition} name="default-health-condition" />
            </div>
          </div>
        </div>
      </div>
    </EditorWindow>
  )
}

/* ===========================================================================
   Selection List Management              `87e9de33…` / `297befda…` (303081)
   Open List opens the Selection List Manager on the current list —
   except Benefit Source, which has its own Benefit Source List (1784166).
   ======================================================================== */

function SelectionListManagement({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const row = SELECTION_LISTS[cur]
  useScreenReport({ row: row ? `list-${pbSlug(String(row.list))}` : null, rows: SELECTION_LISTS.length })
  const openList = (r = row) => { if (r) setOpen(String(r.list)) }

  return (
    <>
      <PBViewHeader title="Selection List Management" />
      <PBCommandRow commands={[{ label: 'Open List', onClick: () => openList() }, { label: 'Close Window', onClick: onClose }]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow<AdminRow>
          rows={SELECTION_LISTS}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => openList(r)}
          rowTutorialId={(r) => `host.mois.row.list-${pbSlug(String(r.list))}`}
          columns={[
            { key: 'list', header: 'Selection List', width: 296, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 480, headAlign: 'center' },
          ]}
        />
      </div>
      {open === 'Benefit Source' && <BenefitSourceList onClose={() => setOpen(null)} />}
      {open && open !== 'Benefit Source' && (
        <SelectionListManager name={open} list={MANAGED_LISTS[open] ?? GENERIC_MANAGED_LIST} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

/**
 * `Selection List Manager` — `318eb80b…`, `b679cbb1…`, `08a4b560…`: a child
 * window whose navy band names the list, New Record / Delete Record / Save
 * and Close / Cancel and Close, and the list's own grid. The current cell of
 * a new row takes the #FFC09C focus wash (`318eb80b…`, the LUNCH row).
 */
function SelectionListManager({ name, list, onClose }: { name: string; list: ManagedList; onClose: () => void }) {
  const [rows, setRows] = useState<AdminRow[]>(list.rows)
  const [cur, setCur] = useState(0)
  useScreenReport({ rows: rows.length, row: rows[cur] ? `code-${pbSlug(String(rows[cur]!.code ?? '')) || 'new'}` : null })
  const width = Math.min(1000, list.columns.reduce((sum, c) => sum + (c.width ?? 80), 40))
  const columns = toColumns(list.columns)
  const first = columns[0]
  if (first) {
    /* the current row's first cell is where a new record is typed */
    first.render = (r, i) => (i === cur
      ? <span style={{ display: 'block', background: '#ffc09c', margin: '0 -2px', paddingLeft: 2 }}>{String(r.code ?? '')}</span>
      : String(r.code ?? ''))
  }

  return (
    <EditorWindow title="Selection List Manager" id="selection-list-manager" width={Math.max(width, 620)} height={560} onClose={onClose}>
      <PBViewHeader title={name} />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { setRows((r) => [...r, { code: '', desc: '', order: '' }]); setCur(rows.length) } },
          { label: 'Delete Record', onClick: () => { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0) } },
          { label: 'Save and Close', onClick: onClose },
          { label: 'Cancel and Close', onClick: onClose },
        ]}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, background: '#fff' }}>
        <PBDataWindow<AdminRow>
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          hscroll
          columns={columns}
          rowTutorialId={(r) => (r.code ? `host.mois.row.code-${pbSlug(String(r.code))}` : undefined)}
          empty=" "
        />
      </div>
    </EditorWindow>
  )
}

/* --- Benefit Source (1784166) ------------------------------------------- */

function BenefitSourceList({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<AdminRow[]>(BENEFIT_SOURCES)
  const [cur, setCur] = useState(0)
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<AdminRow | null>(null)
  useScreenReport({ rows: rows.length })

  return (
    <EditorWindow title="Benefit Source List" id="benefit-source-list" width={1000} height={560} onClose={onClose}>
      <PBViewHeader title="Benefit Source List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => setCreating(true) },
          { label: 'Delete Record', onClick: () => { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0) } },
          { label: 'Edit Record', onClick: () => { const r = rows[cur]; if (r) setDetail(r) } },
          { label: 'Close Window', onClick: onClose },
        ]}
      />
      <div className="pb-admin-inactive" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, background: '#fff' }}>
        <style>{'.pb-admin-inactive .pb-dw__table > tbody > tr.is-inactive > td { color: #9c9c9c; }'}</style>
        <PBDataWindow<AdminRow>
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => setDetail(r)}
          rowClassName={(r) => (r.status === 'INACTIVE' ? 'is-inactive' : undefined)}
          rowTutorialId={(r) => `host.mois.row.benefit-${pbSlug(String(r.source))}${r.status === 'INACTIVE' ? '-inactive' : ''}`}
          columns={[
            { key: 'source', header: 'Benefit Source', width: 176, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 682, headAlign: 'center' },
            { key: 'status', header: 'Status', width: 120, headAlign: 'center' },
          ]}
        />
      </div>
      {creating && (
        <NewBenefitSource
          onCancel={() => setCreating(false)}
          onCreate={(row) => { setRows((r) => [...r, row]); setCur(rows.length); setCreating(false); setDetail(row) }}
        />
      )}
      {detail && <BenefitSourceDetail row={detail} onClose={() => setDetail(null)} />}
    </EditorWindow>
  )
}

/** `8c38f7d7…`: the New Benefit Source dialog. */
function NewBenefitSource({ onCreate, onCancel }: { onCreate: (row: AdminRow) => void; onCancel: () => void }) {
  const [source, setSource] = useState('')
  const [desc, setDesc] = useState('')
  return (
    <EditorWindow title="New Benefit Source" id="new-benefit-source" width={640} onClose={onCancel} z={80}>
      <div style={{ background: 'var(--pb-face)', padding: '10px 26px' }}>
        <div style={{ border: '1px solid #909090', background: '#f4f4f4' }}>
          <div style={{ background: '#dcd7d2', fontWeight: 700, padding: '4px 6px', borderBottom: '1px solid #909090' }}>New Benefit Source</div>
          <div style={{ padding: '6px 10px' }}>
            <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
              <span className="pb-form__label" style={{ width: 88 }}>Source:</span>
              <PBInput w={420} value={source} onChange={(e) => setSource(e.target.value)} data-tutorial-id="host.mois.field.source" />
            </div>
            <div className="pb-row" style={{ gap: 6, padding: '1px 0 8px', borderBottom: '1px solid #c0c0c0' }}>
              <span className="pb-form__label" style={{ width: 88 }}>Description:</span>
              <PBInput w={420} value={desc} onChange={(e) => setDesc(e.target.value)} data-tutorial-id="host.mois.field.description" />
            </div>
            <div style={{ padding: '10px 0 2px' }}>Source Contact Information:</div>
            <PBTextArea rows={3} w={420} style={{ marginLeft: 94 }} />
            <div style={{ padding: '6px 0 2px' }}>Source Note:</div>
            <PBTextArea rows={3} w={420} style={{ marginLeft: 94 }} />
          </div>
        </div>
      </div>
      <Footer
        buttons={['Create Record', 'Cancel']}
        onPress={(b) => (b === 'Create Record'
          ? onCreate({ source: source || 'NEW SOURCE', desc, status: 'ACTIVE' })
          : onCancel())}
      />
    </EditorWindow>
  )
}

/** `e6a6a6be…`: Benefit Source Detail, with its Services band. */
function BenefitSourceDetail({ row, onClose }: { row: AdminRow; onClose: () => void }) {
  const [services, setServices] = useState<AdminRow[]>(row.source === 'BLUE CROSS' ? BENEFIT_SERVICES : [])
  const [cur, setCur] = useState(0)
  const host = usePBInstrumentation()
  return (
    <EditorWindow title="Benefit Source Detail" id="benefit-source-detail" width={740} height={520} onClose={onClose} z={85}>
      <PBViewHeader title="Benefit Source" />
      <div style={{ background: '#fff', padding: '4px 10px', flex: 'none' }}>
        <div className="pb-row" style={{ gap: 6 }}>
          <span style={{ width: 84 }}>Source:</span><PBInput w={420} defaultValue={String(row.source ?? '')} />
          <span style={{ marginLeft: 20 }}><PBCheckbox label="Active" checked={row.status !== 'INACTIVE'} tutorialId="host.mois.field.active" /></span>
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '2px 0 6px' }}>
          <span style={{ width: 84 }}>Description:</span><PBInput w={420} defaultValue={String(row.desc ?? '')} />
        </div>
        <div style={{ borderTop: '1px solid #c0c0c0', paddingTop: 6 }}>Source Contact Information:</div>
        <PBTextArea rows={3} w={420} style={{ marginLeft: 90 }} />
        <div style={{ paddingTop: 4 }}>Source Note:</div>
        <PBTextArea rows={3} w={420} style={{ marginLeft: 90 }} />
      </div>
      <PBBand
        right={['New Record', 'Delete Record', 'Edit Record'].map((b) => (
          <PBButton
            key={b}
            size="sm"
            data-tutorial-id={host?.anchor('command', `services-${pbSlug(b)}`)}
            onClick={() => {
              host?.report('command', { command: `services-${pbSlug(b)}` })
              if (b === 'New Record') { setServices((s) => [...s, { service: '', desc: '', status: 'ACTIVE' }]); setCur(services.length) }
              if (b === 'Delete Record') { setServices((s) => s.filter((_, i) => i !== cur)); setCur(0) }
            }}
          >
            {b}
          </PBButton>
        ))}
      >
        Services
      </PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 60, display: 'flex', background: '#fff' }}>
        <PBDataWindow<AdminRow>
          head={false}
          rows={services}
          current={cur}
          onCurrentChange={setCur}
          columns={[
            { key: 'service', header: '', width: 210 },
            { key: 'desc', header: '', width: 378 },
            { key: 'status', header: '', width: 110 },
          ]}
          empty=" "
        />
      </div>
      <Footer buttons={['Save Changes (F2)', 'Cancel']} onPress={onClose} />
    </EditorWindow>
  )
}

/* ===========================================================================
   Text / Label List                      `f183bf64…` (303086, 303194)
   ======================================================================== */

function TextLabelList({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<AdminRow[]>(TEXT_LABELS)
  const [cur, setCur] = useState(0)
  const [bodies, setBodies] = useState<Record<number, string>>({ 0: TEXT_LABEL_BODY })
  const [modified, setModified] = useState('09.07.04  20:29')
  const [saved, setSaved] = useState(false)
  const row = rows[cur]
  useScreenReport({ rows: rows.length, row: row?.name ? `text-${pbSlug(String(row.name))}` : 'text-new', saved })

  const command = (label: string) => {
    if (label === 'New Record') {
      /* 303086: "make sure your name is entered as the author" — a new row
         carries the signed-in user */
      setRows((r) => [...r, { author: 'JALA2', name: '', desc: '' }])
      setCur(rows.length)
      setSaved(false)
    }
    if (label === 'Delete Record') { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0) }
    if (label === 'Save') { setModified(stamp()); setSaved(true) }
    if (label === 'Undo') setSaved(false)
    if (label === 'Close Window') onClose()
  }

  return (
    <>
      <PBViewHeader title="Text / Label List" />
      <PBCommandRow commands={TEXT_LABEL_COMMANDS.map((label) => ({ label, onClick: () => command(label) }))} />
      <FilterStrip widths={[100, 272, 396]} />
      <div style={{ flex: '1 1 55%', minHeight: 0, display: 'flex', padding: '0 3px' }}>
        <PBDataWindow<AdminRow>
          rows={rows}
          current={cur}
          onCurrentChange={(i) => { setCur(i); setSaved(false) }}
          rowTutorialId={(r) => (r.name ? `host.mois.row.text-${pbSlug(String(r.name))}` : 'host.mois.row.text-new')}
          columns={[
            { key: 'author', header: 'Author', width: 102, headAlign: 'center' },
            { key: 'name', header: 'Name', width: 276, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 398, headAlign: 'center' },
          ]}
        />
      </div>
      <fieldset className="pb-fieldset" style={{ flex: '1 1 45%', minHeight: 0, margin: '4px 6px', display: 'flex', flexDirection: 'column' }} data-tutorial-id="host.mois.field.text-note-label">
        <legend className="pb-fieldset__legend">Text / Note / Label</legend>
        <textarea
          className="pb-field"
          value={bodies[cur] ?? ''}
          onChange={(e) => { const v = e.target.value; setBodies((b) => ({ ...b, [cur]: v })); setSaved(false) }}
          style={{ flex: '1 1 auto', minHeight: 60, fontFamily: '"Courier New", Courier, monospace', fontSize: 12, resize: 'none', whiteSpace: 'pre-wrap' }}
          aria-label="Text / Note / Label"
        />
      </fieldset>
      <div className="pb-row" style={{ gap: 30, padding: '2px 10px 4px', flex: 'none' }}>
        <span>Record Created:</span><span>09.07.04  19:53</span><span>Owner</span>
        <span style={{ marginLeft: 'auto' }}>Last Modified:</span><span>{modified}</span><span>Owner</span>
      </div>
    </>
  )
}

/* ===========================================================================
   Snippet List                           `77c3c212…` / `1b873663…` (303195)
   ======================================================================== */

function SnippetList({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<AdminRow[]>(SNIPPETS)
  const [cur, setCur] = useState(2)
  const [saved, setSaved] = useState(false)
  useScreenReport({ rows: rows.length, saved })
  const command = (label: string) => {
    if (label === 'New Record') { setRows((r) => [...r, { code: '', value: '' }]); setCur(rows.length); setSaved(false) }
    if (label === 'Delete Record') { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0) }
    if (label === 'Save') setSaved(true)
    if (label === 'Undo') { setRows(SNIPPETS); setCur(0); setSaved(false) }
    if (label === 'Close Window') onClose()
  }
  return (
    <>
      <PBViewHeader title="Snippet List" />
      <PBCommandRow commands={SNIPPET_COMMANDS.map((label) => ({ label, onClick: () => command(label) }))} />
      <FilterStrip widths={[68, 240]} />
      <div className="pb-snippet-grid" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px', background: '#fff' }}>
        {/* the grid stops at its last column; the rest of the pane is white */}
        <div style={{ width: 332, display: 'flex' }}>
          <PBDataWindow<AdminRow>
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(r) => (r.code ? `host.mois.row.snippet-${pbSlug(String(r.code))}` : 'host.mois.row.snippet-new')}
            columns={[
              { key: 'code', header: 'Code', width: 70, headAlign: 'center' },
              { key: 'value', header: 'Value', width: 242, headAlign: 'center' },
            ]}
          />
        </div>
      </div>
    </>
  )
}

/* ===========================================================================
   Chart Summary Configuration            `a6122e83…`, `4cd9daf9…`,
                                          `eaed1b34…`, `09798532…`
   Change Summary lists the five summaries 303353 names; the list it drops
   is not captured, so it is a plain drop-down under the button.
   ======================================================================== */

function ChartSummaryConfiguration() {
  const host = usePBInstrumentation()
  const [summary, setSummary] = useState('patient')
  const [picking, setPicking] = useState(false)
  const [cur, setCur] = useState(0)
  const [saved, setSaved] = useState(false)
  const sections: SummarySection[] = SUMMARY_SECTIONS[summary] ?? []
  const section = sections[cur]
  const caption = CHART_SUMMARIES.find((s) => s.key === summary)?.caption ?? ''
  const rowId = (s: SummarySection, i: number) => `section-${pbSlug(s.code)}${sections.findIndex((x) => x.code === s.code) === i ? '' : `-${i}`}`
  useScreenReport({ window: summary, row: section ? rowId(section, cur) : null, saved })

  return (
    <>
      <PBViewHeader title={`Chart Summary Configuration ${caption}`} />
      <div style={{ position: 'relative', flex: 'none' }}>
        <PBCommandRow
          commands={CHART_SUMMARY_COMMANDS.map((label) => ({
            label,
            onClick: label === 'Change Summary' ? () => setPicking((p) => !p)
              : label === 'Save' ? () => setSaved(true)
                : label === 'Undo' ? () => setSaved(false) : undefined,
          }))}
        />
        {picking && (
          <div className="pb-menu" style={{ position: 'absolute', left: 405, top: 22, zIndex: 20, background: '#fff', border: '1px solid #808080', minWidth: 190 }} data-tutorial-id="host.mois.dialog.change-summary">
            {CHART_SUMMARIES.map((s) => (
              <button
                key={s.key}
                type="button"
                className="pb-menu__item"
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '2px 8px', background: s.key === summary ? '#cce4f7' : 'transparent', border: 0 }}
                data-tutorial-id={host?.anchor('command', `summary-${s.key}`)}
                onClick={() => {
                  host?.report('command', { command: `summary-${s.key}` })
                  setSummary(s.key); setCur(0); setPicking(false); setSaved(false)
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="pb-row" style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'stretch', gap: 0 }}>
        <div style={{ width: 360, flex: 'none', display: 'flex', padding: 3, background: '#fff', borderRight: '1px solid #a0a0a0' }}>
          <PBDataWindow<SummarySection>
            rows={sections}
            current={cur}
            onCurrentChange={(i) => { setCur(i); setSaved(false) }}
            rowTutorialId={(s, i) => `host.mois.row.${rowId(s, i)}`}
            columns={[
              { key: 'code', header: 'Section Code', width: 246, headAlign: 'center' },
              { key: 'rank', header: 'Rank', width: 78, align: 'center' },
            ]}
            empty=" "
          />
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }} data-tutorial-id="host.mois.field.section-detail">
          <div style={{ background: '#a7c9ed', padding: '3px 6px' }}>Section Detail</div>
          {section && <SectionDetail key={`${summary}:${cur}`} section={section} />}
        </div>
      </div>
    </>
  )
}

function SectionDetail({ section }: { section: SummarySection }) {
  const label = (text: string) => <span style={{ width: 128, flex: 'none' }}>{text}</span>
  const row = (children: ReactNode, style?: React.CSSProperties) => (
    <div className="pb-row" style={{ gap: 6, padding: '3px 0', alignItems: 'flex-start', ...style }}>{children}</div>
  )
  return (
    <div style={{ padding: '6px 10px', overflow: 'auto', flex: '1 1 auto' }}>
      {row(<>{label('Section Code:')}<span>{section.code}</span></>, { paddingBottom: 12 })}
      {row(<>
        {label('Expand Node:')}<span data-tutorial-id="host.mois.field.expand-node"><PBCheckbox label="Yes" checked={Boolean(section.expand)} /></span>
        <span style={{ marginLeft: 'auto' }}>Rank:</span><PBInput w={74} align="center" defaultValue={String(section.rank)} />
      </>)}
      {row(<>
        {label('Banner Colour:')}
        <span data-tutorial-id="host.mois.field.banner-colour"><PBLookup w={150} defaultValue={section.colour ?? ''} /></span>
        {section.swatch && <span style={{ background: section.swatch, padding: '0 14px', marginLeft: 16 }}>...Banner Colour...</span>}
      </>)}
      {row(<>{label('Banner Title:')}<PBInput w={360} defaultValue={section.title ?? ''} data-tutorial-id="host.mois.field.banner-title" /></>, { paddingBottom: 18 })}
      {row(<>
        {label('Include All Records:')}<span data-tutorial-id="host.mois.field.include-all-records"><PBCheckbox label="Yes" checked={Boolean(section.includeAll)} /></span>
        <span style={{ marginLeft: 12 }}>(this will include records with Stop Dates)</span>
      </>)}
      {row(<>{label('Hide Sensitive:')}<span data-tutorial-id="host.mois.field.hide-sensitive"><PBCheckbox label="Yes" checked={Boolean(section.hideSensitive)} /></span></>)}
      {row(<>
        {label('Record Filter:')}
        <div>
          <PBTextArea rows={4} w={360} defaultValue={section.filter ?? ''} data-tutorial-id="host.mois.field.record-filter" />
          <div style={{ width: 360, whiteSpace: 'normal', paddingTop: 2 }}>RECENT: will be replaced with an expression that includes the recent date parameter.</div>
          <div style={{ width: 360, whiteSpace: 'normal', paddingTop: 8 }}>REQUIRED: will be replaced with an expression that includes the required by date parameter.</div>
        </div>
      </>, { paddingBottom: 12 })}
      {row(<>
        {label('Red Flag:')}
        <div>
          <PBTextArea rows={3} w={360} defaultValue={section.redFlag ?? ''} data-tutorial-id="host.mois.field.red-flag" />
          <div style={{ paddingTop: 2 }}>ERROR, WARNING, DISABLE:</div>
          <div>if (str_field_name = "","NOTHING","DISABLE")</div>
        </div>
      </>)}
    </div>
  )
}

/* ===========================================================================
   Code Reference Sets                    `d0fd9579…`, `8e222b72…` (2069356)
   ======================================================================== */

function CodeReferenceSets() {
  const host = usePBInstrumentation()
  const [rows, setRows] = useState<AdminRow[]>(REFERENCE_SETS)
  const [cur, setCur] = useState(0)
  const [saved, setSaved] = useState(false)
  const [codes, setCodes] = useState<AdminRow[]>([])
  const row = rows[cur]
  useScreenReport({ rows: rows.length, row: row?.set ? `set-${pbSlug(String(row.set))}` : 'set-new', saved })
  const command = (label: string) => {
    if (label === 'New') { setRows((r) => [...r, { set: '', source: '', oid: '', desc: '', active: true }]); setCur(rows.length); setSaved(false) }
    if (label === 'Delete') { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0) }
    if (label === 'Save') setSaved(true)
    if (label === 'Undo') { setRows(REFERENCE_SETS); setCur(0); setSaved(false) }
  }
  return (
    <>
      <PBViewHeader title="Code Reference Sets" />
      <PBCommandRow commands={REFERENCE_SET_COMMANDS.map((label) => ({ label, onClick: () => command(label) }))} />
      <div style={{ flex: '1 1 50%', minHeight: 0, display: 'flex', padding: 3, background: '#fff' }}>
        <PBDataWindow<AdminRow>
          rows={rows}
          current={cur}
          onCurrentChange={(i) => { setCur(i); setCodes([]) }}
          rowTutorialId={(r) => (r.set ? `host.mois.row.set-${pbSlug(String(r.set))}` : 'host.mois.row.set-new')}
          columns={[
            {
              key: 'set', header: 'Reference Set', width: 180, headAlign: 'center',
              render: (r, i) => (i === cur && !r.set
                ? <span style={{ display: 'block', background: '#ffc09c', margin: '0 -2px' }}>&nbsp;</span>
                : String(r.set ?? '')),
            },
            {
              key: 'source', header: 'Source', width: 88, headAlign: 'center',
              render: (r, i) => (i === cur && !r.set
                ? <PBSelect w={84} options={['', ...CODE_SOURCES]} data-tutorial-id="host.mois.field.source" />
                : String(r.source ?? '')),
            },
            { key: 'oid', header: 'OID', width: 154, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 326, headAlign: 'center' },
            { key: 'active', header: 'Active', width: 44, align: 'center', render: (r) => <PBCheckbox checked={Boolean(r.active)} /> },
          ]}
        />
      </div>
      <PBBand
        right={['Add', 'Delete', 'Reset'].map((b) => (
          <PBButton
            key={b}
            size="sm"
            data-tutorial-id={host?.anchor('command', `codes-${pbSlug(b)}`)}
            onClick={() => {
              host?.report('command', { command: `codes-${pbSlug(b)}` })
              if (b === 'Add') setCodes((c) => [...c, { system: '', code: '', term: '', category: '', active: true }])
              if (b === 'Delete') setCodes((c) => c.slice(0, -1))
            }}
          >
            {b}
          </PBButton>
        ))}
      >
        Codes in Reference Set
      </PBBand>
      <div className="pb-row" style={{ gap: 2, padding: '3px 3px 3px 16px', background: '#fff', flex: 'none' }}>
        <PBSelect w={128} options={['', 'ICD-9', 'ICD-10', 'SNOMED-CT', 'LOINC']} />
        <PBInput w={124} /><span style={{ width: 16 }} /><PBInput w={300} /><PBInput w={156} />
      </div>
      <div style={{ flex: '1 1 35%', minHeight: 0, display: 'flex', padding: '0 3px 3px', background: '#fff' }} data-tutorial-id="host.mois.field.codes-in-reference-set">
        <PBDataWindow<AdminRow>
          rows={codes}
          columns={[
            { key: 'system', header: 'Code System', width: 128, headAlign: 'center' },
            { key: 'code', header: 'Code', width: 124, headAlign: 'center' },
            { key: 'dots', header: '', width: 16, dots: true },
            { key: 'term', header: 'Term', width: 300, headAlign: 'center' },
            { key: 'category', header: 'Category', width: 156, headAlign: 'center' },
            { key: 'active', header: 'Active', width: 44, align: 'center', render: (r) => <PBCheckbox checked={Boolean(r.active)} /> },
          ]}
          empty=" "
        />
      </div>
    </>
  )
}

/* ===========================================================================
   Code Lookup Configuration              `77260e59…` (2069358)
   Tick the rows to change, then Edit: Configure Code Lookup Setting opens
   over them with a Code System pane and a Reference Set pane (Available /
   Selected), Continue / Cancel.
   ======================================================================== */

function CodeLookupConfiguration() {
  const host = usePBInstrumentation()
  const [ticked, setTicked] = useState<Set<number>>(new Set())
  const [cur, setCur] = useState(0)
  const [configuring, setConfiguring] = useState(false)
  const [saved, setSaved] = useState(false)
  useScreenReport({ rows: ticked.size, saved })
  const toggle = (i: number) => setTicked((t) => { const n = new Set(t); n.has(i) ? n.delete(i) : n.add(i); return n })

  return (
    <>
      <PBViewHeader title="Code Lookup Configuration" />
      <PBCommandRow
        commands={LOOKUP_COMMANDS.map((label) => ({
          label,
          onClick: label === 'Edit' ? () => { if (ticked.size) setConfiguring(true) }
            : label === 'Save' ? () => setSaved(true)
              : () => { setTicked(new Set()); setSaved(false) },
        }))}
      />
      <div className="pb-row" style={{ gap: 6, padding: '3px 6px', flex: 'none' }}>
        Only show :<PBSelect w={190} options={['']} />
        <span style={{ marginLeft: 70 }}>Show special settings:</span><PBCheckbox />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, background: '#fff' }}>
        <PBDataWindow<AdminRow>
          rows={LOOKUP_SETTINGS}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.lookup-${pbSlug(String(r.desc))}`}
          columns={[
            {
              key: 'tick', header: '', width: 18,
              render: (r, i) => (
                <input
                  type="checkbox"
                  className="pb-check__box"
                  checked={ticked.has(i)}
                  onChange={() => { host?.report('command', { command: `tick-${pbSlug(String(r.desc))}` }); toggle(i) }}
                  data-tutorial-id={host?.anchor('command', `tick-${pbSlug(String(r.desc))}`)}
                  aria-label={`Select ${String(r.desc)}`}
                />
              ),
            },
            { key: 'desc', header: 'Description', width: 322, headAlign: 'center' },
            { key: 'systems', header: 'Code Systems', width: 118 },
            { key: 'systemsOn', header: 'Code Systems On', width: 116 },
            { key: 'sets', header: 'Reference Sets', width: 116 },
            { key: 'setsOn', header: 'Reference Sets On', width: 116 },
          ]}
        />
      </div>
      {configuring && <ConfigureCodeLookupSetting onClose={() => setConfiguring(false)} />}
    </>
  )
}

function ConfigureCodeLookupSetting({ onClose }: { onClose: () => void }) {
  const pane = (title: string, first: string, rows: AdminRow[]) => (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #909090', background: '#fff' }}>
      <div style={{ background: '#dcd7d2', fontWeight: 700, padding: '4px 6px' }}>{title}</div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow<AdminRow>
          rows={rows}
          columns={[
            { key: 'name', header: first, width: 170, headAlign: 'center' },
            { key: 'available', header: 'Available', width: 76, align: 'center', render: (r) => <PBCheckbox checked={Boolean(r.available)} /> },
            { key: 'selected', header: 'Selected', width: 76, align: 'center', render: (r) => <PBCheckbox checked={Boolean(r.selected)} /> },
          ]}
        />
      </div>
    </div>
  )
  return (
    <EditorWindow title="Configure Code Lookup Setting" id="configure-code-lookup-setting" width={780} height={540} onClose={onClose}>
      <div className={cx('pb-row')} style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'stretch', gap: 0, padding: 8, background: 'var(--pb-face)' }}>
        {pane('Code System Settings', 'Code System', LOOKUP_CODE_SYSTEMS)}
        {pane('Reference Set Settings', 'Reference Set', LOOKUP_REFERENCE_SETS)}
      </div>
      <Footer buttons={['Continue', 'Cancel']} onPress={onClose} />
    </EditorWindow>
  )
}
