import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartExport, useChartRows } from '../data/chart-records'
import { carePlanRows } from '../data/carePlanRows'
import { useChartSession } from '../data/chartSession'
import {
  CARE_PLAN_TYPES, letterBody, letterHeader, letterTables, setLetterFlow, useLetterFlow,
  type BodyLine, type BodyTable, type LetterHeader,
} from '../data/letterFlow'
import { TEMPLATE_PREVIEW } from '../data/letterSetup'
import {
  ADVANCE_SELECTION_BLOCKS, ADVANCE_SELECTION_MODES,
  LETTER_MENUS, LETTER_TOOLBOX, LETTER_WRITER_COMMANDS,
  LW, LW_BANDS, LW_CREATED_ROW, LW_HEADER_GRID, LW_RAIL, LW_SOURCE_ROW,
  LW_STATUS, LW_TOOLBAR,
  SELECTION_LISTS, TEMPLATE_DESIGN_COMMANDS,
  TEMPLATE_TOOLBOX,
  type LetterCommand, type LetterMetaRun,
  type SelectionList,
  type ToolboxGroup
} from '../data/letterWriter'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBCheckbox, PBGroup, PBInput, PBLookup, PBMenuBar, PBRadio, PBSelect, PBStatusBar, PBWindow,
  pbSlug, usePBInstrumentation,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'

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
           command row, behind this window, has a Distribute... of its own */
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
   Report / Comment, which reads back to the Order). */
function LetterPage({ lines, tables, inserts }: {
  lines: BodyLine[]
  tables: BodyTable[]
  inserts: ReactNode
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
      {tables.map((t) => (
        <div key={t.title} style={{ margin: '18px 0 6px' }} data-tutorial-id={`host.mois.field.table-${pbSlug(t.title)}`}>
          <div style={{ textDecoration: 'underline', marginBottom: 6 }}>{t.title}</div>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead><tr>{t.columns.map((c) => <th key={c} style={{ background: LW.tableHead, border: '1px solid #808080', padding: '4px 6px', textAlign: 'left' }}>{c}</th>)}</tr></thead>
            <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ border: '1px solid #808080', padding: '3px 6px' }}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
      {inserts}
    </div>
  )
}

/* --- format toolbar -------------------------------------------------------
   The band is 48px; the capture gives one horizontal sequence of control
   borders, so this is one row. How the controls are distributed VERTICALLY
   inside the 48px was not measured — centring them is inferred.           */
function FormatToolbar() {
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
      <PBSelect w={56} options={[...LW_TOOLBAR.zooms]} />
      <PBButton size="sm" style={sq}>1.</PBButton>
      <PBButton size="sm" style={sq}>{'•'}</PBButton>
      <PBButton size="sm" style={sq}>{'⇥'}</PBButton>
      <PBButton size="sm" style={sq}>[L]</PBButton>
      <PBButton size="sm" style={sq}>{'¶'}</PBButton>
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

/* --- toolbox rail ---------------------------------------------------------
   Panel #f0f0f0, 145px wide, group boxes bordered #dcdcdc, buttons 107x24 on
   a 27px pitch. The rail is the same shape in both modes; only its groups
   change.                                                                  */
function RailButton({ label, hint, onClick }: { label: string; hint?: string; onClick?: () => void }) {
  const host = usePBInstrumentation()
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
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => {
        host?.report('command', { command: pbSlug(label) })
        onClick?.()
      }}
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
  groups, source, onSource, onAction,
}: {
  groups: ToolboxGroup[]
  source: Record<string, string>
  onSource: (title: string, value: string) => void
  onAction: (group: ToolboxGroup, label: string) => void
}) {
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
                value={source[g.title] ?? g.options[0]}
                data-tutorial-id={`host.mois.field.${pbSlug(g.label)}`}
                onChange={(e) => onSource(g.title, e.target.value)}
                style={{ marginBottom: 4 }}
              />
              <RailButton label={g.button} hint={g.note} onClick={() => onAction(g, g.button)} />
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
                    data-tutorial-id={`host.mois.field.${pbSlug(f.label)}`}
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
    <div className="pb-modal-layer" style={{ zIndex: 90 }}>
      <PBWindow
        child
        controls={false}
        title="Selection Window"
        onClose={onClose}
        style={{ width: 'min(1022px, calc(100vw - 40px))', height: 'min(684px, calc(100vh - 60px))' }}
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
            data-tutorial-id="host.mois.command.continue"
            onClick={() => onContinue(rows)}
          >
            Continue
          </PBButton>
          <PBButton style={{ width: 80 }} data-tutorial-id="host.mois.command.cancel" onClick={onClose}>
            Cancel
          </PBButton>
        </div>
        </div>
      </PBWindow>
    </div>
  )
}

/* ===========================================================================
   The window itself.
   ======================================================================== */
export type LetterWriterMode = 'letter' | 'template'

export function LetterWriterWindow({
  mode = 'letter',
  documentType,
  raw = false,
  onClose,
  onCommand,
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
}) {
  const patient = usePatient()
  const template = mode === 'template'
  const flow = useLetterFlow()
  const data = useChartExport()
  const session = useChartSession(patient.chart)
  const doc = (documentType ?? flow.doc) as typeof flow.doc
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
  const command = (label: string) => {
    if (label === 'Distribute...') openWindow('create-distribution', { doc })
    if (label === 'Create Task') openWindow('create-task', { chart: patient.chart, linked: header?.title })
    if (label === 'Create Message') openWindow('create-message', { chart: patient.chart, linked: header?.title })
    if (label === 'Save') setLetterFlow({})
    onCommand?.(label)
  }

  const [source, setSource] = useState<Record<string, string>>({})
  const [inserts, setInserts] = useState<{ kind: 'table' | 'detail'; list: SelectionList }[]>([])
  const [selection, setSelection] = useState<{ list: SelectionList; insert: 'table' | 'detail' | null } | null>(null)
  /* the document type and the template picked two windows back, so a lesson
     can check the letter it is grading is the one that was chosen */
  useScreenReport(template || raw ? {} : { letterDoc: doc, ...(flow.template ? { letterTemplate: pbSlug(flow.template) } : {}), letterInserts: inserts.length })
  useEffect(() => {
    const body = bodyRef.current
    if (body && inserts.length) body.scrollTop = body.scrollHeight
  }, [inserts.length])

  const measures = useChartRows('measures')
  const documents = useChartRows('documents')
  const chartList = (key: string): SelectionList => {
    const layout = SELECTION_LISTS[key] ?? SELECTION_LISTS['MEASURE LIST']!
    return { ...layout, rows: key === 'MEASURE LIST' ? measures.map(r => ({
      ...r, date: r.collected ?? '', test: r.test ?? '', value: [r.value, r.units].filter(Boolean).join(' '), table: false, detail: false,
    })) : key === 'ATTACHMENTS' ? documents.map(r => ({ ...r, select: false, open: '' })) : [] }
  }

  const railAction = (group: ToolboxGroup, label: string) => {
    if (label === 'Add Table') {
      const key = source[group.title] ?? (group.kind === 'source' ? group.options[0]! : '')
      setSelection({ list: chartList(key), insert: 'table' })
      return
    }
    if (label === 'Add Detail') {
      setSelection({ list: chartList('MEASURE LIST'), insert: 'detail' })
      return
    }
    if (label === 'Attachments') {
      setSelection({ list: chartList('ATTACHMENTS'), insert: null })
    }
  }

  const status = [
    ...LW_STATUS.map((c) => ({ text: '', width: c.width })),
    { text: '', grow: true },
    /* the right-hand zoom widgets, from x=647: fit-page icons, - slider +, 90% */
    { text: <span className="pb-row" style={{ gap: 6 }}><span>{'⊟'}</span><span>{'⊖'}</span><span>{'—'}</span><span>{'⊕'}</span><span>90%</span></span>, width: 150 },
  ]

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
        <PBMenuBar items={LETTER_MENUS} />

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
              {template ? 'LETTER TEMPLATE' : header?.title ?? (doc === 'consult' ? 'CONSULT NOTE' : doc === 'information-request' ? 'INFORMATION REQUEST' : doc === 'care-plan' ? 'SHARED CARE PLAN' : 'REFERRAL NOTE')}
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

            <FormatToolbar />
            <Ruler />

            <div
              ref={bodyRef}
              data-tutorial-id="host.mois.field.letter-body"
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                background: '#ffffff',
                padding: '14px 20px',
                lineHeight: 1.35,
              }}
            >
              {template || raw
                ? TEMPLATE_PREVIEW.map((p, i) => (
                  <div key={i} style={{ marginBottom: p.gap ?? 0, minHeight: '1.4em' }}>
                    {p.tokens.map((t, j) => (
                      <span
                        key={j}
                        style={
                          t.t === 'field'
                            ? { background: LW.yellow }
                            : t.t === 'tag'
                              ? { background: LW.yellow, color: '#6b6b00', fontWeight: 700 }
                              : undefined
                        }
                      >
                        {t.s}
                      </span>
                    ))}
                  </div>
                ))
                : (
                  <LetterPage
                    lines={lines}
                    tables={tables}
                    inserts={inserts.map((entry, i) => <GeneratedRecords key={i} list={entry.list} detail={entry.kind === 'detail'} />)}
                  />
                )}
            </div>
          </div>

          {/* ---- the rail: 1px #646464 rule, #c8c8c8 splitter, #f0f0f0 panel */}
          <div style={{ width: 1, flex: 'none', background: LW.rule }} />
          <div style={{ width: 5, flex: 'none', background: LW.ruleSoft }} />
          <ToolboxRail
            groups={template ? TEMPLATE_TOOLBOX : LETTER_TOOLBOX}
            source={source}
            onSource={(title, value) => setSource((s) => ({ ...s, [title]: value }))}
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
              if (selected.length) setInserts((v) => [...v, { kind, list: { ...selection.list, rows: selected } }])
            }
            setSelection(null)
          }}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  )
}
