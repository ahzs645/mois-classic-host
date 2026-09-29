import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartExport, useChartRows } from '../data/chart-records'
import { carePlanRows, carePlanSnapshotText } from '../data/carePlanRows'
import { useChartSession } from '../data/chartSession'
import {
  CARE_PLAN_TYPES, DOC_TYPE_OF, consultOrders, letterBody, letterHeader, letterOrder, letterTables, setLetterFlow, useLetterFlow,
  type BodyLine, type BodyTable, type LetterDocId, type LetterHeader,
} from '../data/letterFlow'
import {
  FIELD_CATALOGUE, IMPORTED_DOCX_BODY, readLetterClipboard, useAttachedLetters, useOrderResponses,
  type DesignerStart,
} from '../data/letterDocs'
import { MOIS_TODAY } from '../data/patients'
import {
  ADVANCE_SELECTION_BLOCKS, ADVANCE_SELECTION_MODES,
  LETTER_MENUS, LETTER_TOOLBOX, LETTER_WRITER_COMMANDS,
  LW, LW_BANDS, LW_CREATED_ROW, LW_HEADER_GRID, LW_RAIL, LW_SOURCE_ROW,
  LW_STATUS, LW_TOOLBAR,
  SELECTION_LISTS, TEMPLATE_DESIGN_COMMANDS,
  TEMPLATE_TOOLBOX,
  type LetterCommand, type LetterMenuItem, type LetterMetaRun,
  type SelectionList,
  type ToolboxGroup
} from '../data/letterWriter'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBCheckbox, PBGroup, PBInput, PBLookup, PBMenuBar, PBMessageBox, PBRadio, PBSelect, PBStatusBar, PBWindow,
  pbSlug, usePBInstrumentation, type PBMenuBarEntry, type PBMenuItem,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { LetterEditorDialog, NewLetterDialog } from './LetterEditorDialogs'
import { TemplateCanvas, TemplatePreviewLines, useTemplateDesign } from './LetterTemplateCanvas'
import { MasterProviderListDialog } from './MasterProviderListDialog'
import { OrderLinkingServiceDialog } from './OrderLinkingServiceDialog'
import { RowContextMenu, type ContextMenuAt } from './RowContextMenu'
import { ModalWindow } from './dialogKit'

/* ============================================================================
   MOIS Letter Writer — the CURRENT FLAT generation.

   Two modes out of one window, because MOIS really does open the same frame
   both ways:

     `letter`   — the letter the Order produced. Six command buttons, the 4+4
                  header field panel, and the six-group toolbox rail.
     `template` — the same frame opened from Administration > Letter Templates
                  to DESIGN a template. Two command buttons (`Save`,
                  `Spelling...`), NO header field panel at all — the format
                  toolbar follows the title band directly — and a completely
                  different rail.

   The two colours this window exists for:

     #ffc09c  salmon, on text populated from the source record. Read-only:
              "these fields are read-only from the top of the Letter Writer to
              encourage users to change the details only from the source
              record (the Order)".
     #bee6f8  blue, on the one field the user may edit here: "this can be
              modified in the Letter Writer by the user and will read
              back/update the Order".

   The header panel's fill is a GRADIENT, #b8d5f3 at the top to #fefeff at the
   bottom, not the flat #c8dcfa a DataWindow header uses. It only grazes
   (199,222,246) about a fifth of the way down.

   Every measurement, and the capture it was taken from, is in
   `data/letterWriter.ts`.
   ========================================================================= */

/* The current generation's cyan caption, and the #f0f0f0 menu bar under it.
   The kit paints a flat white Win10 title bar and a white menu bar, and
   neither colour is a token, so this window carries its own rule rather than
   the kit growing a variant for it. React 19 hoists and de-duplicates it by
   `href`; React 18 leaves it in place, where it still applies. */
const LETTER_CAPTION = `
.pb-window--mois-letter > .pb-titlebar {
  height: ${LW_BANDS.titleBar}px; background: ${LW.titleBar};
}
.pb-window--mois-letter .pb-menubar {
  height: ${LW_BANDS.menuBar}px; background: ${LW.face};
}
`

const RULE = (colour: string) => (
  <div style={{ height: 1, background: colour, flex: 'none' }} />
)

/* --- the collapse glyph at the right of the command row -------------------
   Measured at x 836-848, y 57-68 in 304687/fe7ad734ae59: a 12x11 double
   chevron. Drawn rather than typed so it keeps its weight. */
function CollapseChevrons() {
  return (
    <svg width="12" height="11" viewBox="0 0 12 11" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M1 7 L3.5 3.5 L6 7" fill="none" stroke="#3c3c3c" strokeWidth="1.3" />
      <path d="M6 7 L8.5 3.5 L11 7" fill="none" stroke="#3c3c3c" strokeWidth="1.3" />
    </svg>
  )
}

/* --- command row ----------------------------------------------------------
   Six flat buttons at 77/77/87/77/77/77, butted, with the 2px black rule
   between neighbours that two 1px borders make. The kit's own PBCommandRow
   paints every button at MOIS's usual 80.5px Task Bar pitch and its `width`
   prop only raises a minimum, so this row is built from the same classes with
   the measured widths set explicitly.

   The run's left inset is between 0 and 6px across the four captures
   (0 / 5 / 6 / 6); 5 is used here.                                         */
function LetterCommandRow({
  commands, onCommand,
}: {
  commands: LetterCommand[]
  onCommand?: (label: string) => void
}) {
  const host = usePBInstrumentation()
  return (
    <div
      className="pb-cmdrow"
      style={{ height: LW_BANDS.commandRow, background: LW.band, paddingLeft: 5, alignItems: 'center' }}
      data-tutorial-id={host?.anchor('commandrow')}
    >
      {commands.map((c) => {
        /* Distribute... is anchored `letter-distribute`: the Care Plan's own
           command row, behind this window, has a Distribute... of its own.
           The others keep their caption slugs (`save`, `spelling`, …), which
           the existing lessons press. */
        const slug = c.label === 'Distribute...' ? 'letter-distribute' : pbSlug(c.label)
        return (
        <button
          key={c.label}
          type="button"
          className="pb-cmdrow__btn"
          style={{ width: c.width, height: LW_BANDS.commandRow }}
          title={c.hint}
          data-tutorial-id={host?.anchor('command', slug)}
          onClick={() => {
            host?.report('command', { command: slug })
            onCommand?.(c.label)
          }}
        >
          {c.label}
        </button>
        )
      })}
      <span className="pb-cmdrow__spacer" />
      <span style={{ paddingRight: 8, display: 'flex', alignItems: 'center' }}>
        <CollapseChevrons />
      </span>
    </div>
  )
}

/* --- the Source and Created rows ------------------------------------------
   Both were measured run by run, so each run is placed at its own x rather
   than flowed. The signed indicator (`UNSIGNED`) is #000000 BOLD on this
   window and is NOT a hyperlink — it is a blue link on the classic consult
   variant and on Order Detail, which is why it is not drawn as one here.  */
function MetaRow({ runs, height, anchor }: { runs: LetterMetaRun[]; height: number; anchor: string }) {
  return (
    <div style={{ position: 'relative', height, flex: 'none' }} data-tutorial-id={anchor}>
      {runs.map((r) => (
        <span
          key={r.x}
          data-tutorial-id={r.field ? `host.mois.field.${r.field}` : undefined}
          style={{
            position: 'absolute',
            left: r.x,
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            fontWeight: r.bold ? 700 : 400,
          }}
        >
          {r.text}
        </span>
      ))}
    </div>
  )
}

/* --- the 4+4 header field grid --------------------------------------------
   Left labels at x=17 with their values at x~127; right labels right-aligned
   ending x~490 with their values from x~493. Row pitch 21px.

   Row 3 of the right column is document-type dependent — `Diagnosis:` for a
   referral, `Service Event:` on a service event, `Note:` on a Shared Care
   Plan — so it is read from the document type rather than written in.     */
function HeaderFieldPanel({ header, editable }: { header: LetterHeader | null; editable?: boolean }) {
  const [type, setType] = useState(header?.right[0]?.value ?? '')
  const cell = (label: string, value: string, side: 'left' | 'right') => (
    <>
      <span
        className="pb-form__label"
        style={{
          height: LW_BANDS.headerRowPitch,
          display: 'flex',
          alignItems: 'center',
          justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
          paddingRight: side === 'right' ? 3 : 0,
          fontWeight: side === 'left' ? 700 : 700,
        }}
      >
        {label}
      </span>
      {editable && !(side === 'right' && label === 'Type:') ? (
        /* the shared-care-plan variant (2070139/5dc6ad4fc232): every header
           field is an edit, the left ones with a "…" lookup */
        <span data-tutorial-id={`host.mois.field.${pbSlug(label)}`} style={{ display: 'flex', alignItems: 'center', height: LW_BANDS.headerRowPitch, paddingRight: 8 }}>
          {side === 'left'
            ? <PBLookup w="100%" value={value} name={pbSlug(label)} />
            : <PBInput w="100%" value={value} readOnly={false} onChange={() => {}} />}
        </span>
      ) : editable ? (
        <span data-tutorial-id="host.mois.field.type" style={{ display: 'flex', alignItems: 'center', gap: 6, height: LW_BANDS.headerRowPitch }}>
          <PBSelect w={170} options={CARE_PLAN_TYPES} value={type} onChange={(e) => setType(e.target.value)} />
          <span className="pb-form__label" style={{ fontWeight: 700 }}>Date:</span>
          <PBInput w={80} value={header?.date ?? ''} onChange={() => {}} />
        </span>
      ) : (
        <span
          data-tutorial-id={`host.mois.field.${pbSlug(label)}`}
          style={{
            height: LW_BANDS.headerRowPitch,
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            paddingLeft: 2,
          }}
        >
          {value}
        </span>
      )}
    </>
  )

  const left = header?.left ?? ['Attending:', 'Author:', 'Responsible Org.:', 'Primary Recipient:'].map((label) => ({ label, value: '' }))
  const right = header?.right ?? ['Type:', 'Code:', 'Diagnosis:', 'Copies To:'].map((label) => ({ label, value: '' }))
  return (
    <div
      style={{
        height: LW_BANDS.headerPanel,
        display: 'grid',
        gridTemplateColumns:
          `${LW_HEADER_GRID.labelLeftW}px ${LW_HEADER_GRID.valueLeftW}px `
          + `${LW_HEADER_GRID.labelRightW}px 1fr`,
        gridAutoRows: `${LW_BANDS.headerRowPitch}px`,
        alignContent: 'start',
        paddingLeft: LW_HEADER_GRID.padLeft,
        paddingTop: 6,
        flex: 'none',
        overflow: 'hidden',
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{ display: 'contents' }}>
          {cell(left[i]!.label, left[i]!.value, 'left')}
          {cell(right[i]!.label, right[i]!.value, 'right')}
        </span>
      ))}
    </div>
  )
}

/* --- the populated letter --------------------------------------------------
   `pop` runs carry the #ffc09c salmon wash (populated from the record,
   read-only here), the one `order` run the #bee6f8 blue (the Order's Record
   Report / Comment, which reads back to the Order).

   A table is right-clickable: 303589 "If you wish to delete a row or column
   within a table of data, right-click and choose the 'Delete Row' or
   'Delete Column' option. If you wish to delete the entire table, select the
   entire table … right-click and select 'Cut'." What was removed is kept per
   table title in `edits`. */
export type TableEdit = { rows: number[]; cols: number[]; cut?: boolean }
export type TableCell = { table: string; row: number; col: number }

function LetterPage({ lines, tables, edits, inserts, onTableMenu, selectedTable, onSelectTable }: {
  lines: BodyLine[]
  tables: BodyTable[]
  edits: Record<string, TableEdit>
  inserts: ReactNode
  onTableMenu: (cell: TableCell, event: ReactMouseEvent<HTMLElement>) => void
  selectedTable: string | null
  onSelectTable: (title: string) => void
}) {
  const style = (t: string) => t === 'pop' ? { background: LW.populator }
    : t === 'order' ? { background: LW.orderField }
    : t === 'bold' ? { fontWeight: 700 } : undefined
  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 13 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ marginBottom: l.gap ?? 0, minHeight: '1.35em', fontSize: l.big ? 20 : undefined }}>
          {l.runs.map((r, j) => (
            <span
              key={j}
              style={style(r.t)}
              data-tutorial-id={r.t === 'order' ? 'host.mois.field.record-report' : undefined}
              contentEditable={r.t === 'order' ? true : undefined}
              suppressContentEditableWarning
            >
              {r.s}
            </span>
          ))}
        </div>
      ))}
      {tables.filter((t) => !edits[t.title]?.cut).map((t) => {
        const e = edits[t.title] ?? { rows: [], cols: [] }
        const cols = t.columns.map((c, j) => [c, j] as const).filter(([, j]) => !e.cols.includes(j))
        return (
          <div
            key={t.title}
            style={{ margin: '18px 0 6px', outline: selectedTable === t.title ? '1px dashed #1d4f91' : undefined }}
            data-tutorial-id={`host.mois.field.table-${pbSlug(t.title)}`}
            onMouseDown={() => onSelectTable(t.title)}
          >
            <div style={{ textDecoration: 'underline', marginBottom: 6 }}>{t.title}</div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead><tr>{cols.map(([c, j]) => <th key={c} onContextMenu={(ev) => onTableMenu({ table: t.title, row: -1, col: j }, ev)} style={{ background: LW.tableHead, border: '1px solid #808080', padding: '4px 6px', textAlign: 'left' }}>{c}</th>)}</tr></thead>
              <tbody>
                {t.rows.map((r, i) => [r, i] as const).filter(([, i]) => !e.rows.includes(i)).map(([r, i]) => (
                  <tr key={i} data-tutorial-id={`host.mois.row.letter-table-${pbSlug(t.title)}-${i}`}>
                    {cols.map(([, j]) => (
                      <td key={j} onContextMenu={(ev) => onTableMenu({ table: t.title, row: i, col: j }, ev)} style={{ border: '1px solid #808080', padding: '3px 6px' }}>{r[j]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
      {inserts}
    </div>
  )
}

/* --- header and footer regions (Insert ▸ Header …) ---------------------------
   304687: "First Page Header: Inserts a header on the first page only ·
   Header: Inserts a header which will appear on every page … · Page Number:
   Inserts the page number. This option is available when entering a header
   or a footer." Drawn as a dashed, captioned band the text is typed into —
   the TX Text Control marks its header area the same way (INFERRED). */
export type LetterRegionState = { text: string; first: boolean; pageNumber: boolean }

function LetterRegionBox({ which, region, onText }: {
  which: 'header' | 'footer'
  region: LetterRegionState
  onText: (text: string) => void
}) {
  const label = `${region.first ? 'First Page ' : ''}${which === 'header' ? 'Header' : 'Footer'}`
  return (
    <div data-tutorial-id={`host.mois.field.letter-${which}`} style={{ position: 'relative', border: '1px dashed #7a9cc8', padding: '8px 6px 4px', margin: which === 'header' ? '0 0 14px' : '14px 0 0' }}>
      <span style={{ position: 'absolute', top: -8, left: 6, background: '#fff', color: '#4a6a98', fontSize: 10, padding: '0 3px' }}>{label}</span>
      <div contentEditable suppressContentEditableWarning spellCheck={false} style={{ minHeight: '1.4em', outline: 'none', whiteSpace: 'pre-wrap' }}
        onBlur={(e) => onText(e.currentTarget.textContent ?? '')}>
        {region.text}
      </div>
      {region.pageNumber && <div style={{ textAlign: 'right' }}><span style={{ background: LW.yellow }}>Page 1</span></div>}
    </div>
  )
}

/* --- format toolbar -------------------------------------------------------
   The band is 48px; the capture gives one horizontal sequence of control
   borders, so this is one row. How the controls are distributed VERTICALLY
   inside the 48px was not measured — centring them is inferred.           */
function FormatToolbar({ zoom, onZoom, onControlChars, controlChars }: {
  zoom: string
  onZoom: (z: string) => void
  onControlChars: () => void
  controlChars: boolean
}) {
  const sq = { minWidth: 22, width: 22, height: 22 } as const
  return (
    <div
      className="pb-row"
      style={{
        height: LW_BANDS.formatToolbar,
        background: LW.face,
        gap: 4,
        padding: '0 6px',
        flex: 'none',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <PBSelect w={78} options={[...LW_TOOLBAR.styles]} />
      <PBSelect w={100} options={[...LW_TOOLBAR.fonts]} />
      <PBSelect w={44} options={[...LW_TOOLBAR.sizes]} />
      <PBButton size="sm" style={{ ...sq, fontWeight: 700 }}>B</PBButton>
      <PBButton size="sm" style={{ ...sq, fontStyle: 'italic' }}>I</PBButton>
      <PBButton size="sm" style={{ ...sq, textDecoration: 'underline' }}>U</PBButton>
      {/* align-left is the pressed one in the capture: a #cce4f7 highlight */}
      <PBButton size="sm" style={{ ...sq, background: '#cce4f7' }} aria-pressed>{'≡'}</PBButton>
      <PBButton size="sm" style={sq}>{'≡'}</PBButton>
      <PBButton size="sm" style={sq}>{'≡'}</PBButton>
      <PBButton size="sm" style={sq}>{'≡'}</PBButton>
      <PBSelect w={56} options={[...new Set([zoom, ...LW_TOOLBAR.zooms])]} value={zoom} onChange={(e) => onZoom(e.target.value)} data-tutorial-id="host.mois.field.letter-zoom" />
      <PBButton size="sm" style={sq}>1.</PBButton>
      <PBButton size="sm" style={sq}>{'•'}</PBButton>
      <PBButton size="sm" style={sq}>{'⇥'}</PBButton>
      <PBButton size="sm" style={sq}>[L]</PBButton>
      <PBButton size="sm" style={{ ...sq, ...(controlChars ? { background: '#cce4f7' } : null) }} aria-pressed={controlChars} onClick={onControlChars}>{'¶'}</PBButton>
    </div>
  )
}

/* The ruler strip between the toolbar and the page. Decorative: the spec
   records that a ruler is there and nothing about its scale. */
function Ruler() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 16,
        flex: 'none',
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${LW.ruleSoft}`,
        backgroundImage:
          'repeating-linear-gradient(to right, #9a9a9a 0 1px, transparent 1px 48px)',
        backgroundPosition: '24px bottom',
        backgroundSize: 'auto 6px',
        backgroundRepeat: 'repeat-x',
      }}
    />
  )
}


/* --- the page -------------------------------------------------------------
   The body is a token stream because the colours are the content. */
function GeneratedRecords({ list, detail }: { list: SelectionList; detail: boolean }) {
  const columns = list.columns.filter(c => !c.check && !c.link && c.key !== 'clip')
  return <div data-tutorial-id={`host.mois.field.generated-${detail ? 'detail' : 'table'}`} style={{ margin: '10px 0 14px' }}>
    <strong>{list.title}</strong>
    {detail ? list.rows.map((row, i) => <div key={i} style={{ marginTop: 8 }}>
      {columns.map(c => <div key={c.key}><span>{c.header}: </span><span style={{ background: LW.yellow }}>{String(row[c.key] ?? '')}</span></div>)}
    </div>) : <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
      <thead><tr>{columns.map(c => <th key={c.key} style={{ background: LW.tableHead, border: '1px solid #808080', padding: '1px 6px' }}>{c.header}</th>)}</tr></thead>
      <tbody>{list.rows.map((row, i) => <tr key={i}>{columns.map(c => <td key={c.key} style={{ background: LW.yellow, border: '1px solid #808080', padding: '1px 6px' }}>{String(row[c.key] ?? '')}</td>)}</tr>)}</tbody>
    </table>}
  </div>
}

/** What the rail's Other buttons, Edit ▸ Paste and Table ▸ Insert put in the letter. */
export type LetterInsert =
  | { kind: 'table' | 'detail'; list: SelectionList }
  | { kind: 'text'; source: string; lines: string[] }
  | { kind: 'graph'; svg: string; title: string }
  | { kind: 'signature'; name: string }
  | { kind: 'grid'; rows: number; cols: number }

function InsertBlock({ insert, selected, onSelect }: { insert: LetterInsert; selected: boolean; onSelect: () => void }) {
  const ring = selected ? { outline: '1px dashed #1d4f91' } : undefined
  if (insert.kind === 'table' || insert.kind === 'detail') {
    return <div style={ring} onMouseDown={onSelect}><GeneratedRecords list={insert.list} detail={insert.kind === 'detail'} /></div>
  }
  if (insert.kind === 'text') {
    return (
      <div data-tutorial-id={`host.mois.field.pasted-${insert.source}`} style={{ margin: '10px 0', ...ring }} onMouseDown={onSelect}>
        {insert.lines.map((l, i) => <div key={i} style={{ minHeight: '1.3em', whiteSpace: 'pre-wrap' }}>{l}</div>)}
      </div>
    )
  }
  if (insert.kind === 'graph') {
    /* 304699 `6c9a284f…`: the pasted graph sits in the letter as a picture */
    return (
      <div data-tutorial-id="host.mois.field.pasted-graph" style={{ margin: '10px 0', ...ring }} onMouseDown={onSelect}>
        <div style={{ fontSize: 11, color: '#444' }}>{insert.title}</div>
        <div style={{ width: 460, border: '1px solid #888' }} dangerouslySetInnerHTML={{ __html: insert.svg }} />
      </div>
    )
  }
  if (insert.kind === 'signature') {
    return (
      <div data-tutorial-id="host.mois.field.inserted-signature" style={{ margin: '10px 0', ...ring }} onMouseDown={onSelect}>
        <svg width="190" height="42" viewBox="0 0 190 42" aria-hidden="true"><path d="M6 30c14-22 20 8 34-6s10-16 22-2 12 10 26-4 16 2 30-6 18 8 30 2 12-10 30-6" fill="none" stroke="#1b2f6b" strokeWidth="2" /></svg>
        <div style={{ borderTop: '1px solid #000', width: 220 }}>{insert.name}</div>
      </div>
    )
  }
  if (insert.kind !== 'grid') return null
  return (
    <table data-tutorial-id="host.mois.field.inserted-table" style={{ borderCollapse: 'collapse', width: '100%', margin: '10px 0', ...ring }} onMouseDown={onSelect}>
      <tbody>
        {Array.from({ length: insert.rows }, (_, r) => (
          <tr key={r}>{Array.from({ length: insert.cols }, (_, c) => <td key={c} contentEditable suppressContentEditableWarning style={{ border: '1px solid #808080', height: 18, padding: '1px 4px' }} />)}</tr>
        ))}
      </tbody>
    </table>
  )
}

/* --- toolbox rail ---------------------------------------------------------
   Panel #f0f0f0, 145px wide, group boxes bordered #dcdcdc, buttons 107x24 on
   a 27px pitch. The rail is the same shape in both modes; only its groups
   change. Every drop-down is controlled from `values`, keyed
   `<group title>` for a `source` group and `<group title>:<label>` for a
   `fields` group, so the template designer's Field list can follow its
   Source.                                                                  */
function RailButton({ label, hint, onClick }: { label: string; hint?: string; onClick?: () => void }) {
  return (
    <PBButton
      title={hint}
      style={{
        width: LW_RAIL.buttonW,
        height: LW_RAIL.buttonH,
        marginBottom: LW_RAIL.buttonPitch - LW_RAIL.buttonH,
        background: LW.btnFace,
        borderColor: LW.btnBorder,
      }}
      command={pbSlug(label)}
      onClick={() => onClick?.()}
    >
      {label}
    </PBButton>
  )
}

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div data-tutorial-id={`host.mois.group.${pbSlug(title)}`} style={{ marginBottom: 8 }}>
      <PBGroup title={title} style={{ borderColor: LW.groupBorder, padding: '2px 4px 6px' }}>
        {children}
      </PBGroup>
    </div>
  )
}

function ToolboxRail({
  groups, values, onValue, onAction,
}: {
  groups: ToolboxGroup[]
  values: Record<string, string>
  onValue: (key: string, value: string) => void
  onAction: (group: ToolboxGroup, label: string) => void
}) {
  const host = usePBInstrumentation()
  return (
    <div
      data-tutorial-id="host.mois.group.toolbox"
      style={{
        width: LW_RAIL.panelW,
        flex: 'none',
        background: LW.face,
        overflowY: 'auto',
        padding: '6px 0 8px',
      }}
    >
      {groups.map((g) => {
        if (g.kind === 'link') {
          return (
            <div key={g.title} style={{ textAlign: 'center', marginBottom: 8 }}>
              <button
                className="pb-link"
                style={{ color: LW.link }}
                data-tutorial-id={`host.mois.command.${pbSlug(g.label)}`}
                onClick={() => host?.report('command', { command: pbSlug(g.label) })}
              >
                {g.label}
              </button>
            </div>
          )
        }
        if (g.kind === 'source') {
          return (
            <RailGroup key={g.title} title={g.title}>
              <span className="pb-form__label">{g.label}</span>
              {/* a DropDownListBox; no capture shows any of these lists
                  expanded, so their height and sort order are unmeasured */}
              <PBSelect
                w={LW_RAIL.buttonW}
                options={g.options}
                value={values[g.title] ?? g.options[0]}
                data-tutorial-id={`host.mois.field.${g.label === 'Source:' ? `${pbSlug(g.title)}-` : ''}${pbSlug(g.label)}`}
                onChange={(e) => onValue(g.title, e.target.value)}
                style={{ marginBottom: 4 }}
              />
              {g.showNote && <div style={{ whiteSpace: 'normal', lineHeight: 1.3, marginBottom: 4 }}>{g.note}</div>}
              <RailButton label={g.button} hint={g.showNote ? undefined : g.note} onClick={() => onAction(g, g.button)} />
            </RailGroup>
          )
        }
        if (g.kind === 'fields') {
          return (
            <RailGroup key={g.title} title={g.title}>
              {g.fields.map((f) => (
                <div key={f.label}>
                  <span className="pb-form__label">{f.label}</span>
                  <PBSelect
                    w={LW_RAIL.buttonW}
                    options={f.options}
                    value={values[`${g.title}:${f.label}`] ?? f.options[0]}
                    data-tutorial-id={`host.mois.field.${pbSlug(g.title)}-${pbSlug(f.label)}`}
                    onChange={(e) => onValue(`${g.title}:${f.label}`, e.target.value)}
                    style={{ marginBottom: 4 }}
                  />
                </div>
              ))}
              <RailButton label={g.button} onClick={() => onAction(g, g.button)} />
            </RailGroup>
          )
        }
        if (g.kind === 'text') {
          return (
            <RailGroup key={g.title} title={g.title}>
              <div style={{ whiteSpace: 'normal', lineHeight: 1.3, marginBottom: 4 }}>{g.text}</div>
              {g.button && <RailButton label={g.button} onClick={() => onAction(g, g.button!)} />}
              {g.note && <div style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{g.note}</div>}
            </RailGroup>
          )
        }
        return (
          <RailGroup key={g.title} title={g.title}>
            {g.buttons.map((b) => (
              <RailButton key={b.label} label={b.label} hint={b.hint} onClick={() => onAction(g, b.label)} />
            ))}
          </RailGroup>
        )
      })}
    </div>
  )
}

/* ===========================================================================
   The Selection Window — what `Add Table`, `Add Detail` and `Attachments` all
   open (304687/ba222444b2c6 and 304687/4b38950212f4, both 1022x684).

   The first two columns of a RECORD list are headed `Table` and `Detail`;
   only the Attachment List uses `Select`, and carries a second header button
   (`Select All`) and a blue `Open` link per row. The prose in the same
   article calls the first column `Select` for every list; the captures win.

   The right pane is four identical stacked blocks, each with a code lookup, a
   4-way radio group whose default is `All records`, and a checkbox that is
   checked by default.
   ======================================================================== */
function SelectionWindow({
  list, onContinue, onClose,
}: {
  list: SelectionList
  onContinue: (rows: SelectionList['rows']) => void
  onClose: () => void
}) {
  const [cur, setCur] = useState(0)
  const [rows, setRows] = useState(list.rows)
  const selectAll = (checked: boolean) => setRows(all => all.map(row => ({ ...row, ...Object.fromEntries(list.columns.filter(c => c.check).map(c => [c.key, checked])) })))
  return (
    <ModalWindow
      title="Selection Window"
      onClose={onClose}
      zIndex={90}
      layerClassName="pb-modal-layer"
      windowStyle={{ width: 'min(1022px, calc(100vw - 40px))', height: 'min(684px, calc(100vh - 60px))' }}
    >
        <div
          data-tutorial-id="host.mois.dialog.selection-window"
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
        >
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: 6 }}>
          {/* ---- left: the record list ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }}>
            <div
              className="pb-band"
              data-tutorial-id={`host.mois.group.${pbSlug(list.title)}`}
            >
              <span>{list.title}</span>
              <span className="pb-band__spacer" />
              {list.selectAll && <PBButton size="sm" onClick={() => selectAll(true)}>Select All</PBButton>}
              <PBButton size="sm" onClick={() => selectAll(false)}>Clear Selections</PBButton>
            </div>
            <div className="pb-dw" style={{ flex: '1 1 auto', minHeight: 0 }}>
              <div className="pb-dw__scroll">
                <table className="pb-dw__table">
                  <colgroup>
                    <col style={{ width: 13 }} />
                    {list.columns.map((c) => <col key={c.key} style={{ width: c.width }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="pb-dw__gutter" />
                      {list.columns.map((c) => <th key={c.key}>{c.header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={i === cur ? 'is-current' : undefined}
                        onMouseDown={() => setCur(i)}
                      >
                        <td className="pb-dw__gutter" />
                        {list.columns.map((c) => (
                          <td
                            key={c.key}
                            className={c.check ? 'pb-dw__c--center' : undefined}
                            /* the row is wider than a ring should be, so the
                               anchor goes on the check cell, not the row */
                          >
                            {c.check
                              ? (
                                /* the anchor sits on the box itself, so a
                                   replayed click ticks it; the first row also
                                   answers to `…-first` */
                                <PBCheckbox
                                  checked={Boolean(r[c.key])}
                                  tutorialId={i === 0 ? `host.mois.cell.${c.key}-first` : `host.mois.cell.${c.key}-${pbSlug(String(r.date ?? i))}`}
                                  onChange={checked => setRows(all => all.map((row, j) => j === i ? { ...row, [c.key]: checked } : row))}
                                />
                              )
                              : c.link
                                ? <button className="pb-link">{String(r[c.key] ?? '')}</button>
                                : String(r[c.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ---- right: Advance Selection ---- */}
          <div
            data-tutorial-id="host.mois.group.advance-selection"
            style={{ width: 398, flex: 'none', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <div className="pb-band"><span>Advance Selection</span></div>
            <div className="pb-row" style={{ background: LW.band, padding: '1px 4px', gap: 8, flex: 'none' }}>
              <span style={{ width: 96 }}>Code</span>
              <span>Concept or Code Description</span>
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', background: 'var(--pb-window)', padding: 4 }}>
              {Array.from({ length: ADVANCE_SELECTION_BLOCKS }, (_, b) => (
                <div key={b} style={{ borderBottom: `1px solid ${LW.ruleSoft}`, paddingBottom: 5, marginBottom: 5 }}>
                  <div className="pb-row" style={{ gap: 4 }}>
                    <span className="pb-inputgroup" style={{ width: 96 }}>
                      <input type="text" className="pb-field" />
                      <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
                    </span>
                    <PBInput w={272} />
                  </div>
                  {ADVANCE_SELECTION_MODES.map((m, i) => (
                    <div key={m.label} style={{ paddingLeft: 4 }}>
                      <PBRadio
                        name={`adv-${b}`}
                        label={m.label}
                        /* `All records` is the default selection */
                        checked={i === ADVANCE_SELECTION_MODES.length - 1}
                        onChange={() => {}}
                      />
                    </div>
                  ))}
                  <div style={{ paddingLeft: 4 }}>
                    {/* checked by default */}
                    <PBCheckbox label="If applicable, include report." checked onChange={() => {}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '6px 0 10px', flex: 'none' }}>
          <PBButton
            className="pb-btn--default"
            style={{ width: 80 }}
            command="continue"
            onClick={() => onContinue(rows)}
          >
            Continue
          </PBButton>
          <PBButton style={{ width: 80 }} command="cancel" onClick={onClose}>
            Cancel
          </PBButton>
        </div>
        </div>
    </ModalWindow>
  )
}


/* ===========================================================================
   The window itself.

   Letter mode adds, beyond the captures above (all from 304687's glossary,
   INFERRED where no capture exists):
     - the seven menus wired: File (Save Letter, Load Template / File…, Page
       Setup…, Print Preview, Print, Print To…, Distribute…, Close), Edit,
       View, Insert (headers, footers, page number, image, object, break),
       Format and Table (screens/LetterEditorDialogs.tsx for their windows);
     - Save writes the letter to its Order as UNDISTRIBUTED
       (data/letterDocs.ts), which is what the Attached Letters window lists;
     - Link to Order raises the Order Linking Service; Spelling… the spell
       checker; the Re-populate buttons refresh the populated fields;
     - Paste Provider Data (the Master Provider List), Paste Patient Data,
       Paste Care Plan, Paste Progress Note and Insert Signature put their
       blocks in the letter;
     - Edit ▸ Paste puts a measurement graph copied with the graph window's
       Options ▸ Copy to Clipboard into the letter (304699);
     - a right-click on a table offers Delete Row / Delete Column / Cut
       (303589).
   Template mode is the designer (screens/LetterTemplateCanvas.tsx).
   ======================================================================== */
export type LetterWriterMode = 'letter' | 'template'

const FIELD_HINT = "Place your cursor in the yellow field you want to remove, then press 'Delete Field'."

export function LetterWriterWindow({
  mode = 'letter',
  documentType,
  raw = false,
  onClose,
  onCommand,
  designer,
}: {
  mode?: LetterWriterMode
  /** which document type the header block and title band describe; by
      default, the one the letter in progress was started as */
  documentType?: string
  /** the template as picked, before Letter Setup: header empty, populators
      still yellow — what 303099 `4bb2668b…` shows behind the order prompt */
  raw?: boolean
  onClose?: () => void
  onCommand?: (label: string) => void
  /** template mode: which template is being designed, and how it started */
  designer?: DesignerStart
}) {
  const patient = usePatient()
  const template = mode === 'template'
  const flow = useLetterFlow()
  const data = useChartExport()
  const session = useChartSession(patient.chart)
  const doc = (documentType ?? flow.doc) as LetterDocId
  const header = useMemo(() => (template || raw ? null : letterHeader(doc, data, flow)), [data, doc, flow, raw, template])
  const lines = useMemo(() => (header ? letterBody(doc, patient, header) : []), [doc, header, patient])
  const tables = useMemo(() => {
    if (!header) return []
    if (doc !== 'care-plan') return letterTables(data, flow.selected)
    /* a shared care plan carries the plan itself, section by section */
    const rows = carePlanRows(data, session.tags)
    return [...new Set(rows.map((r) => r.section))].map((section) => ({
      title: `${section.charAt(0)}${section.slice(1).toLowerCase()}:`,
      columns: ['DATE', 'DESCRIPTION', 'DETAIL'],
      rows: rows.filter((r) => r.section === section).map((r) => [r.date.replace(/\./g, '-'), r.description, r.detail]),
    }))
  }, [data, doc, flow.selected, header, session.tags])
  const openWindow = useOpenWindow()
  /* an inserted table lands at the end of the letter: bring it into view */
  const bodyRef = useRef<HTMLDivElement>(null)
  /* Distribute (F2) on Create Distribution sends the letter, and a sent
     letter's writer closes */
  useEffect(() => {
    if (flow.distributed && !template && !raw) onClose?.()
  }, [flow.distributed, onClose, raw, template])

  const design = useTemplateDesign(designer?.template ?? '', designer)
  const [letters, setLetters] = useAttachedLetters()
  const [, setResponses] = useOrderResponses()

  const [values, setValues] = useState<Record<string, string>>({})
  const [inserts, setInsertsRaw] = useState<LetterInsert[]>([])
  const [history, setHistory] = useState<{ past: LetterInsert[][]; future: LetterInsert[][] }>({ past: [], future: [] })
  const setInserts = (next: LetterInsert[]) => { setHistory((h) => ({ past: [...h.past, inserts], future: [] })); setInsertsRaw(next) }
  const [selection, setSelection] = useState<{ list: SelectionList; insert: 'table' | 'detail' | null } | null>(null)
  const [tableEdits, setTableEdits] = useState<Record<string, TableEdit>>({})
  const [selTable, setSelTable] = useState<string | null>(null)
  const [selInsert, setSelInsert] = useState<number | null>(null)
  const [cell, setCell] = useState<TableCell | null>(null)
  const [menuAt, setMenuAt] = useState<ContextMenuAt>(null)
  const [regions, setRegions] = useState<{ header?: LetterRegionState; footer?: LetterRegionState }>({})
  const [dialog, setDialog] = useState<string | null>(null)
  const [message, setMessage] = useState<{ title: string; text: string } | null>(null)
  const [picking, setPicking] = useState<'provider' | 'link-order' | null>(null)
  const [zoom, setZoom] = useState('90%')
  const [outline, setOutline] = useState(false)
  const [controlChars, setControlChars] = useState(false)
  const [repopulated, setRepopulated] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [printed, setPrinted] = useState(false)

  /* the document type and the template picked two windows back, so a lesson
     can check the letter it is grading is the one that was chosen */
  useScreenReport(template
    ? {
      templateName: pbSlug(design.name), templateFields: design.counts.fields, templateTags: design.counts.tags,
      templateHeader: design.counts.header, templateFooter: design.counts.footer, templateSaved: design.saved,
      templateImported: !!design.importedFrom,
    }
    : raw ? {} : {
      letterDoc: doc, ...(flow.template ? { letterTemplate: pbSlug(flow.template) } : {}), letterInserts: inserts.length,
      letterSaved: saved, letterPrinted: printed, letterHeader: !!regions.header, letterFooter: !!regions.footer,
      letterGraph: inserts.some((i) => i.kind === 'graph'), letterRepopulated: repopulated,
      letterTablesEdited: Object.keys(tableEdits).length, letterCorrection: !!flow.correctionOf,
    })
  useEffect(() => {
    const body = bodyRef.current
    if (body && inserts.length) body.scrollTop = body.scrollHeight
  }, [inserts.length])

  const measures = useChartRows('measures')
  const documents = useChartRows('documents')
  const dash = (v?: string) => (v ?? '').split(' ')[0]!.replace(/\//g, '.')
  const chartList = (key: string): SelectionList => {
    const layout = SELECTION_LISTS[key] ?? SELECTION_LISTS['MEASURE LIST']!
    const tick = { table: false, detail: false }
    const rows: SelectionList['rows'] = key === 'MEASURE LIST' ? measures.map(r => ({
      ...r, date: r.collected ?? '', test: r.test ?? '', value: [r.value, r.units].filter(Boolean).join(' '), ...tick,
    }))
      : key === 'ATTACHMENTS' ? documents.map(r => ({ ...r, select: false, open: '' }))
      : key === 'BPMH LIST' || key === 'LT MEDS LIST' ? (data?.medication_lt ?? []).map((m) => ({
        ...tick, date: dash(m.dtm_start), medication: m.str_medication ?? m.str_generic_name ?? '', dose: m.str_dose_freq ?? '', prescriber: m.str_ordered_by ?? '',
      }))
      : key === 'HEALTH ISSUE LIST' ? (data?.health_issue ?? []).map((h) => ({ ...tick, date: dash(h.dtm_start), resolved: dash(h.dtm_resolve), problem: h.str_problem_name ?? '' }))
      : key === 'ALLERGY LIST' ? (data?.allergy ?? []).map((a) => ({ ...tick, date: dash(a.dtm_start), substance: a.str_substance ?? '', reactions: a.str_reactions ?? '' }))
      : key === 'CONSULT LIST' ? consultOrders(data).map((o) => ({ ...tick, date: dash(o.dtm_ord_date), description: o.str_description ?? '', to: o.str_performed_by ?? '' }))
      : key === 'DOCUMENT LIST' ? documents.map((d) => ({ ...tick, date: d.date ?? '', type: d.type ?? '', note: d.note ?? '' }))
      : key === 'ENCOUNTER LIST' ? (data?.encounter ?? []).slice(0, 40).map((e) => ({ ...tick, date: dash(e.dtm_appoint), provider: e.lkp_provider ?? e.str_attending ?? '', reason: e.str_appt_note ?? '' }))
      : []
    return { ...layout, rows }
  }

  const author = header?.left.find((f) => f.label === 'Author:')?.value ?? flow.author
  const pasteText = (source: string, text: string[]) => setInserts([...inserts, { kind: 'text', source, lines: text }])

  const railAction = (group: ToolboxGroup, label: string) => {
    if (template) {
      if (label === 'Add Field') design.addField(values['Add Database Field:Source:'] ?? '', values['Add Database Field:Field:'] ?? '')
      if (label === 'Delete Field' && !design.deleteField()) setMessage({ title: 'Remove Field', text: FIELD_HINT })
      if (label === 'Add Tag') design.addTag(values['Add Tag'] ?? '')
      return
    }
    if (label === 'Add Table') {
      const key = values[group.title] ?? (group.kind === 'source' ? group.options[0]! : '')
      setSelection({ list: chartList(key), insert: 'table' })
      return
    }
    if (label === 'Add Detail') {
      setSelection({ list: chartList('MEASURE LIST'), insert: 'detail' })
      return
    }
    if (label === 'Attachments') { setSelection({ list: chartList('ATTACHMENTS'), insert: null }); return }
    if (group.title === 'Re-populate Fields') { setRepopulated(pbSlug(label)); return }
    if (label === 'Paste Provider Data') { setPicking('provider'); return }
    if (label === 'Paste Patient Data') {
      pasteText('patient-data', [
        `${patient.first} ${patient.middle ?? ''} ${patient.last}`.replace(/\s+/g, ' ').toUpperCase(),
        patient.address ?? '', [patient.city, patient.province, patient.postal].filter(Boolean).join(' '),
        `H: ${patient.home ?? ''}  W: ${patient.work ?? ''}  C: ${patient.cell ?? ''}`,
      ].filter((l) => l.trim()))
      return
    }
    if (label === 'Paste Care Plan') {
      pasteText('care-plan', carePlanSnapshotText(carePlanRows(data, session.tags), patient, MOIS_TODAY, ['HALLIWELL MEDICAL CLINIC']).split('\n'))
      return
    }
    if (label === 'Paste Progress Note') {
      const note = [...(data?.encounter_note ?? [])].sort((a, b) => String(b.stp_date_create ?? '').localeCompare(String(a.stp_date_create ?? '')))[0]
      if (!note?.str_note) { setMessage({ title: 'Paste Progress Note', text: 'There is no progress note on the encounter this letter was created from.' }); return }
      pasteText('progress-note', ['Progress Notes:', ...note.str_note.split(/\r\n?|\n/)])
      return
    }
    if (label === 'Insert Signature') setInserts([...inserts, { kind: 'signature', name: author }])
  }

  /* --- Save ------------------------------------------------------------- */
  const saveLetter = () => {
    setSaved(true)
    if (flow.responseTo) {
      const id = flow.letterId ?? `response-${flow.responseTo}-${Date.now()}`
      setResponses((all) => [
        { id, chart: patient.chart, orderId: flow.responseTo!, date: MOIS_TODAY, author, type: DOC_TYPE_OF[doc], note: header?.title ?? '', status: 'UNDISTRIBUTED', recipient: flow.recipient, correctionOf: flow.correctionOf ?? undefined },
        ...all.filter((r) => r.id !== id),
      ])
      setLetterFlow({ letterId: id })
      return
    }
    const order = doc === 'referral' || doc === 'consult' ? letterOrder(data, flow.orderId) : undefined
    if (!order?.id_order) { setLetterFlow({}); return }
    const id = flow.letterId ?? `letter-${order.id_order}-${Date.now()}`
    const existing = letters.find((l) => l.id === id)
    setLetters((all) => [
      {
        id, chart: patient.chart, orderId: order.id_order!, date: existing?.date ?? MOIS_TODAY, author, doc, type: DOC_TYPE_OF[doc],
        note: order.str_description ?? order.str_code_term ?? '', status: 'UNDISTRIBUTED', template: flow.template,
        correctionOf: flow.correctionOf ?? undefined,
      },
      ...all.filter((l) => l.id !== id),
    ])
    setLetterFlow({ letterId: id, orderId: order.id_order! })
  }

  const command = (label: string) => {
    if (template) {
      if (label === 'Save') design.save()
      if (label === 'Spelling...') setDialog('spelling')
      onCommand?.(label)
      return
    }
    if (label === 'Distribute...') openWindow('create-distribution', { doc })
    if (label === 'Create Task') openWindow('create-task', { chart: patient.chart, linked: header?.title })
    if (label === 'Create Message') openWindow('create-message', { chart: patient.chart, linked: header?.title })
    if (label === 'Save') saveLetter()
    if (label === 'Link to Order') setPicking('link-order')
    if (label === 'Spelling...') setDialog('spelling')
    onCommand?.(label)
  }

  /* --- the menus -------------------------------------------------------- */
  const tableAct = (a: string) => {
    const t = cell?.table ?? selTable
    if (!t) return
    const e = tableEdits[t] ?? { rows: [], cols: [] }
    if (a === 'delete-table' || a === 'cut') setTableEdits({ ...tableEdits, [t]: { ...e, cut: true } })
    if (a === 'delete-row' && cell && cell.row >= 0) setTableEdits({ ...tableEdits, [t]: { ...e, rows: [...e.rows, cell.row] } })
    if (a === 'delete-column' && cell) setTableEdits({ ...tableEdits, [t]: { ...e, cols: [...e.cols, cell.col] } })
    if (a === 'select-table') setSelTable(t)
  }
  const act = (a: string) => {
    if (a.startsWith('zoom-')) { setZoom(`${a.slice(5)}%`); return }
    switch (a) {
      case 'save': command('Save'); return
      case 'distribute': command('Distribute...'); return
      case 'link-to-order': command('Link to Order'); return
      case 'create-message': command('Create Message'); return
      case 'create-task': command('Create Task'); return
      case 'close': onClose?.(); return
      case 'page-view': setOutline(false); return
      case 'outline-view': setOutline(true); return
      case 'control-characters': setControlChars((v) => !v); return
      case 'undo': {
        const prev = history.past[history.past.length - 1]
        if (!prev) return
        setHistory((h) => ({ past: h.past.slice(0, -1), future: [inserts, ...h.future] }))
        setInsertsRaw(prev)
        return
      }
      case 'redo': {
        const next = history.future[0]
        if (!next) return
        setHistory((h) => ({ past: [...h.past, inserts], future: h.future.slice(1) }))
        setInsertsRaw(next)
        return
      }
      case 'cut':
      case 'delete':
        if (template) {
          if (design.removeSelected() === 'field') setMessage({ title: 'Remove Field', text: FIELD_HINT })
          return
        }
        if (selInsert !== null) { setInserts(inserts.filter((_, i) => i !== selInsert)); setSelInsert(null); return }
        tableAct('cut')
        return
      case 'paste': {
        const clip = readLetterClipboard()
        if (clip && !template) setInserts([...inserts, { kind: 'graph', svg: clip.svg, title: clip.title }])
        return
      }
      case 'header':
      case 'first-page-header':
      case 'footer':
      case 'first-page-footer': {
        const which = a.endsWith('header') ? 'header' : 'footer'
        const first = a.startsWith('first')
        if (template) design.insertRegion(which, first)
        else setRegions((r) => ({ ...r, [which]: { text: r[which]?.text ?? '', pageNumber: r[which]?.pageNumber ?? false, first } }))
        return
      }
      case 'page-number':
        if (template) design.pageNumber()
        else setRegions((r) => (r.footer && !r.header
          ? { ...r, footer: { ...r.footer, pageNumber: true } }
          : { ...r, header: { text: r.header?.text ?? '', first: r.header?.first ?? false, pageNumber: true } }))
        return
      default:
        tableAct(a)
    }
  }
  const toItems = (items: LetterMenuItem[]): PBMenuItem[] => items.map((it) => (it.sep ? { sep: true } : {
    label: it.label,
    key: it.key,
    menu: it.menu ? toItems(it.menu) : undefined,
    onSelect: it.menu ? undefined : () => { if (it.window) setDialog(it.window); else if (it.act) act(it.act) },
  }))
  const menus: PBMenuBarEntry[] = LETTER_MENUS.map((m) => ({ label: m.label, menu: m.menu ? toItems(m.menu) : undefined }))

  const railGroups: ToolboxGroup[] = template
    ? TEMPLATE_TOOLBOX.map((g) => (g.kind === 'fields'
      ? { ...g, fields: g.fields.map((f) => (f.label === 'Field:' ? { ...f, options: ['', ...(FIELD_CATALOGUE[values['Add Database Field:Source:'] ?? ''] ?? [])] } : f)) }
      : g))
    : LETTER_TOOLBOX

  const status = [
    ...LW_STATUS.map((c) => ({ text: '', width: c.width })),
    { text: '', grow: true },
    /* the right-hand zoom widgets, from x=647: fit-page icons, - slider +, 90% */
    { text: <span className="pb-row" style={{ gap: 6 }}><span>{'⊟'}</span><span>{'⊖'}</span><span>{'—'}</span><span>{'⊕'}</span><span>{zoom}</span></span>, width: 150 },
  ]
  const zoomFactor = (parseInt(zoom, 10) || 90) / 90

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <style href="mois-classic/letter-writer" precedence="medium">{LETTER_CAPTION}</style>
      <PBWindow
        title="MOIS - Letter Writer"
        className="pb-window--mois-letter"
        onClose={onClose}
        style={{
          /* 1009 outer = 1007 client inside the frame's 1px borders, which
             leaves the left column at exactly the measured 856 once the
             rail's 1 + 5 + 145 is taken off. Height from the 766px capture. */
          width: 'min(1009px, calc(100vw - 30px))',
          height: 'min(768px, calc(100vh - 50px))',
        }}
      >
        <div
          data-tutorial-id={template ? 'host.mois.dialog.letter-template' : 'host.mois.dialog.letter-writer'}
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
        >
        <PBMenuBar items={menus} />

        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
          {/* ---- left column: the document and everything above it ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }}>
            {RULE(LW.rule)}
            <LetterCommandRow
              commands={template ? TEMPLATE_DESIGN_COMMANDS : LETTER_WRITER_COMMANDS}
              onCommand={command}
            />
            {RULE(LW.rule)}

            {/* the bold document-title band, text from x=12 */}
            <div
              data-tutorial-id="host.mois.field.document-title"
              style={{
                height: LW_BANDS.docTitle,
                flex: 'none',
                background: LW.band,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {template ? 'LETTER TEMPLATE' : header?.title ?? (DOC_TYPE_OF[doc] === 'CONSULTATION' ? 'CONSULT NOTE' : doc === 'referral' ? 'REFERRAL NOTE' : DOC_TYPE_OF[doc])}
            </div>
            {RULE(LW.rule)}

            {/* Template-design mode has NO header field panel: the format
                toolbar follows the title band directly (303101). */}
            {!template && (
              <>
                <div
                  style={{
                    flex: 'none',
                    background: `linear-gradient(to bottom, ${LW.headerTop}, ${LW.headerBottom})`,
                  }}
                >
                  <HeaderFieldPanel header={header} editable={doc === 'care-plan'} />
                  {RULE(LW.ruleSoft)}
                  <MetaRow
                    runs={LW_SOURCE_ROW.map(r => ({ ...r, text: !header ? (r.field || r.text.startsWith('- ') ? '' : r.text)
                      : r.field === 'record-date' ? header.date
                      : r.field === 'loinc' ? header.loinc
                      : r.text.startsWith('- ') ? header.loincName
                      : r.text }))}
                    height={LW_BANDS.sourceRow}
                    anchor="host.mois.field.source-row"
                  />
                  {RULE(LW.ruleSoft)}
                  <MetaRow
                    runs={LW_CREATED_ROW.map(r => ({ ...r, text: !header ? (r.field ? '' : r.text)
                      : r.field === 'created' ? header.created
                      : r.field === 'last-modified' ? `Last Modified: ${header.created}`
                      : r.text }))}
                    height={LW_BANDS.createdRow}
                    anchor="host.mois.field.created-row"
                  />
                </div>
                {RULE(LW.rule)}
              </>
            )}

            <FormatToolbar zoom={zoom} onZoom={setZoom} controlChars={controlChars} onControlChars={() => setControlChars((v) => !v)} />
            <Ruler />

            <div
              ref={bodyRef}
              data-tutorial-id="host.mois.field.letter-body"
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                position: 'relative',
                background: outline ? '#ffffff' : '#d4d4d4',
                padding: outline ? 0 : '14px 20px',
                lineHeight: 1.35,
              }}
            >
              <div
                style={{
                  zoom: zoomFactor,
                  background: '#ffffff',
                  minHeight: outline ? '100%' : 640,
                  padding: outline ? '14px 20px' : '30px 40px',
                  boxShadow: outline ? undefined : '0 0 0 1px #8a8a8a, 2px 2px 3px rgba(0,0,0,.25)',
                }}
              >
                {template ? <TemplateCanvas design={design} controlChars={controlChars} />
                  : raw
                    ? <TemplatePreviewLines />
                    : (
                      <>
                        {regions.header && <LetterRegionBox which="header" region={regions.header} onText={(text) => setRegions((r) => ({ ...r, header: { ...r.header!, text } }))} />}
                        <LetterPage
                          lines={lines}
                          tables={tables}
                          edits={tableEdits}
                          selectedTable={selTable}
                          onSelectTable={(t) => { setSelTable(t); setSelInsert(null) }}
                          onTableMenu={(c, ev) => {
                            ev.preventDefault()
                            const box = bodyRef.current!.getBoundingClientRect()
                            setCell(c)
                            setSelTable(c.table)
                            setMenuAt({ x: ev.clientX - box.left + bodyRef.current!.scrollLeft, y: ev.clientY - box.top + bodyRef.current!.scrollTop })
                          }}
                          inserts={inserts.map((entry, i) => (
                            <InsertBlock key={i} insert={entry} selected={selInsert === i} onSelect={() => { setSelInsert(i); setSelTable(null) }} />
                          ))}
                        />
                        {regions.footer && <LetterRegionBox which="footer" region={regions.footer} onText={(text) => setRegions((r) => ({ ...r, footer: { ...r.footer!, text } }))} />}
                      </>
                    )}
              </div>
              <RowContextMenu
                at={menuAt}
                onClose={() => setMenuAt(null)}
                items={[
                  { label: 'Delete Row', disabled: !cell || cell.row < 0, onSelect: () => tableAct('delete-row') },
                  { label: 'Delete Column', onSelect: () => tableAct('delete-column') },
                  { sep: true },
                  { label: 'Cut', onSelect: () => tableAct('cut') },
                ]}
              />
            </div>
          </div>

          {/* ---- the rail: 1px #646464 rule, #c8c8c8 splitter, #f0f0f0 panel */}
          <div style={{ width: 1, flex: 'none', background: LW.rule }} />
          <div style={{ width: 5, flex: 'none', background: LW.ruleSoft }} />
          <ToolboxRail
            groups={railGroups}
            values={values}
            onValue={(key, value) => setValues((v) => ({
              ...v,
              [key]: value,
              /* a new Source empties the Field it filtered */
              ...(key === 'Add Database Field:Source:' ? { 'Add Database Field:Field:': '' } : {}),
            }))}
            onAction={railAction}
          />
        </div>

        <PBStatusBar cells={status} />
        </div>
      </PBWindow>

      {selection && (
        <SelectionWindow
          list={selection.list}
          onContinue={(rows) => {
            if (selection.insert) {
              const kind = selection.insert
              const selected = rows.filter(row => row[kind])
              if (selected.length) setInserts([...inserts, { kind, list: { ...selection.list, rows: selected } }])
            }
            setSelection(null)
          }}
          onClose={() => setSelection(null)}
        />
      )}

      {dialog === 'new-letter' && (
        <NewLetterDialog
          onClose={() => setDialog(null)}
          onContinue={(choice) => {
            setDialog(null)
            if (template) {
              if (choice.option === 'file') design.load(IMPORTED_DOCX_BODY)
              if (choice.option === 'template' && choice.template) design.loadTemplate(choice.template)
              if (choice.option === 'blank') design.load({ lines: [{ region: 'body', tokens: [] }] })
              return
            }
            if (choice.option === 'template' && choice.template) setLetterFlow({ template: choice.template })
            if (choice.option === 'file') pasteText('file', IMPORTED_DOCX_BODY.lines.map((l) => l.tokens.map((t) => t.s).join('')))
          }}
        />
      )}
      {dialog && dialog !== 'new-letter' && (
        <LetterEditorDialog
          id={dialog}
          onClose={() => setDialog(null)}
          onOk={() => {
            if (dialog === 'insert-table') setInserts([...inserts, { kind: 'grid', rows: 2, cols: 3 }])
            if (dialog === 'print') setPrinted(true)
          }}
        />
      )}
      {picking === 'provider' && (
        <MasterProviderListDialog
          onClose={() => setPicking(null)}
          onPick={(name, row) => {
            setPicking(null)
            pasteText('provider-data', [name, String(row.address ?? row.city ?? ''), [row.primary && `Ph ${row.primary}`, row.fax && `Fax ${row.fax}`].filter(Boolean).join('  ')].filter(Boolean) as string[])
          }}
        />
      )}
      {picking === 'link-order' && (
        <OrderLinkingServiceDialog onClose={() => setPicking(null)} onLink={() => setPicking(null)} />
      )}
      {design.prompt && (
        <PBMessageBox title="Field Properties" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'field-prompt-ok' }]} onClose={() => design.setPrompt(null)}>
          [{design.prompt}] — MOIS fills this field when the letter is created. If the value cannot be found, you will be prompted with a selection list.
        </PBMessageBox>
      )}
      {message && (
        <PBMessageBox title={message.title} buttons={[{ label: 'OK', value: 'ok', default: true, command: 'letter-message-ok' }]} onClose={() => setMessage(null)}>
          {message.text}
        </PBMessageBox>
      )}
    </div>
  )
}
