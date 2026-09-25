import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { PBBand, PBButton, PBDataWindow, PBInput, PBLookup, PBWindow, type PBColumn } from '../pb'
import {
  superfindForNode, type SuperfindRow, type SuperfindScreen,
} from '../data/chartUtilities'

/* ============================================================================
   Find Patient — the Superfind window.

   Toolbar `Record` ▸ `Superfind` (Shift + F9) from one of the ten folders that
   offer it. It searches the *folder*, not the chart: every patient with a
   matching Health Condition, or a matching Prescription, comes back in the
   Patient List, and picking one fills the lower grid with that patient's
   other entries in the same folder. Wildcards are allowed in the search
   fields; Enter runs the search.

   Two variants are built because two were captured — `304702 / 11fe47608b45`
   (Health Conditions, 808x588 @1.00x) and `303787 / 95d0bdaa6aa8`
   (Prescriptions, ≈0.98x). See `data/chartUtilities.ts` for why the other
   eight folders are not.

   Gaps left deliberately (spec §13): the `Statuses` ellipsis picker is never
   shown in the corpus, so its button opens nothing.
   ========================================================================= */

/** Measured off `11fe47608b45` at 1.00x: the window, and its client top edge. */
const W = 808
const H = 588
const TITLEBAR_H = 20

/* The teal build's caption. The kit paints the flat white Win10 title bar and
   its colour is not a token, so this one window carries its own rule rather
   than the kit growing a variant for it. React 19 hoists and de-duplicates it
   by `href`; React 18 leaves it in place, where it still applies. */
const TEAL_CAPTION = `
.pb-window--mois-teal > .pb-titlebar {
  height: ${TITLEBAR_H}px; padding-left: 20px;
  background: #00b7c3; color: #ffffff;
}
.pb-window--mois-teal > .pb-titlebar .pb-titlebar__icon { display: none; }
.pb-window--mois-teal > .pb-titlebar .pb-titlebar__btn { width: 32px; color: #ffffff; }
`

/** Every y below is the capture's, less the 20px the title bar occupies. */
const y = (captureY: number) => captureY - TITLEBAR_H

/** A group band: #DCD7D2, with a 1px #646464 rule above and below it. */
function Band({ top, height, children }: { top: number; height: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top,
        borderTop: '1px solid #646464', borderBottom: '1px solid #646464',
        ['--pb-band' as string]: '#dcd7d2',
        ['--pb-band-h' as string]: `${height}px`,
      }}
    >
      <PBBand>{children}</PBBand>
    </div>
  )
}

/** A control at the x the capture paints it at, with its caption to its left. */
function Painted({
  left, top, width, label, children, style,
}: {
  left: number; top: number; width?: number
  label?: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <>
      {label && (
        <span
          className="pb-form__label"
          style={{ position: 'absolute', right: `calc(100% - ${left - 4}px)`, top: top + 1, textAlign: 'right' }}
        >
          {label}
        </span>
      )}
      <span style={{ position: 'absolute', left, top, width, ...style }}>{children}</span>
    </>
  )
}

/**
 * `304702` describes the Description field as "the key word **or
 * abbreviation**" — which is why the capture's `DM` returns diabetes rows.
 * So a term matches either as a substring or as the leading initials of the
 * value's words: `DM` against `DIABETES MELLITUS - TYPE 2` is `DM` against
 * `DMT2`.
 */
function matches(value: string, want: string): boolean {
  const upper = value.toUpperCase()
  if (upper.includes(want)) return true
  const initials = upper.split(/[^A-Z0-9]+/).filter(Boolean).map((w) => w[0]).join('')
  return initials.startsWith(want)
}

/* Grid content runs x 6–788 with the vertical scrollbar in 789–805. */
const GRID_LEFT = 6
const GRID_RIGHT = 3

function SuperfindGrid({
  screen, rows, current, onCurrentChange, top, height, anchor, empty,
}: {
  screen: SuperfindScreen
  rows: SuperfindRow[]
  current?: number
  onCurrentChange?: (i: number) => void
  top: number
  height: number
  anchor: (row: SuperfindRow) => string
  empty: string
}) {
  const columns: PBColumn<SuperfindRow>[] = screen.columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
  }))
  return (
    <div style={{ position: 'absolute', left: GRID_LEFT, right: GRID_RIGHT, top, height, display: 'flex' }}>
      <PBDataWindow
        rows={rows}
        columns={columns}
        current={current}
        onCurrentChange={onCurrentChange}
        rowTutorialId={anchor}
        empty={empty}
        style={{
          flex: '1 1 auto', minWidth: 0,
          /* v2.20 chrome: 15px data-row pitch under a 16px header band. The
             kit drives both off one variable, so the header is drawn 15 here
             and the 1px difference the capture shows is not reproduced.
             The kit's current-row gutter is a fixed 13px where the capture
             measures 10, and the slack that leaves is taken by the last
             column — Description / Medication — which is the widest anyway. */
          ['--pb-dw-row-h' as string]: '15px',
        }}
      />
    </div>
  )
}

export function FindPatientDialog({
  node, onChartNavigator, onPrintList, onSelect, onClose,
}: {
  /** the folder that invoked Superfind — it picks the variant */
  node: string
  /** the `Chart Navigator` button, which opens that window over this one */
  onChartNavigator?: (rows?: { chart: string; name: string; description: string }[]) => void
  onPrintList?: () => void
  /** `Select` or a double-click: the chart the caller should open */
  onSelect?: (chart: string) => void
  onClose: () => void
}) {
  const screen = superfindForNode(node)

  const [terms, setTerms] = useState<string[]>(
    () => (screen ? screen.fields.map((f) => f.value ?? '') : []),
  )
  /* MOIS retrieves on Enter, not as you type; the window opens showing the
     capture's own search, already retrieved. */
  const [query, setQuery] = useState<string[]>(terms)
  const [current, setCurrent] = useState(0)

  const rows = useMemo(() => {
    if (!screen) return []
    return screen.rows.filter((row) => screen.fields.every((f, i) => {
      /* the manual says wildcards are allowed; a bare term is a contains */
      const want = (query[i] ?? '').trim().replace(/[*%]/g, '').toUpperCase()
      return !want || matches(String(row[f.key] ?? ''), want)
    }))
  }, [query, screen])

  const picked = rows[Math.min(current, Math.max(0, rows.length - 1))]
  const others = (picked && screen?.others[picked.chart]) ?? []

  if (!screen) return null

  const search = () => { setQuery(terms); setCurrent(0) }
  const setTerm = (i: number, v: string) => setTerms((t) => t.map((old, j) => (j === i ? v : old)))

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <style href="mois-classic/find-patient" precedence="medium">{TEAL_CAPTION}</style>
      <PBWindow
        child
        controls={false}
        className="pb-window--mois-teal"
        title="Find Patient"
        onClose={onClose}
        style={{ width: W, height: H }}
      >
        <div
          data-tutorial-id="host.mois.dialog.find-patient"
          style={{
            position: 'relative', flex: '1 1 auto', minHeight: 0,
            background: '#f0f0f0',
            /* the capture's fields are 15px tall, not the kit's 19 */
            ['--pb-row-h' as string]: '15px',
          }}
        >
          <Band top={y(25)} height={15}>Search Parameters</Band>

          {/* `Find Patient with the following Condition:` — the last word
              swaps per folder (`… Prescription:` in the Rx capture) */}
          <span style={{ position: 'absolute', left: GRID_LEFT, top: y(45) }}>
            {`Find Patient with the following ${screen.noun}:`}
          </span>

          {/* Both variants start their two fields on the same two stops: the
              Health-Conditions capture measures Code at 66 and Description at
              209, and the Prescriptions capture's Medication is 442 wide,
              which puts its right edge on 651 — two pixels short of the Print
              List button, exactly where the other variant's Statuses run
              ends. */}
          {screen.fields.map((f, i) => (
            <Painted key={f.label} left={i === 0 ? 66 : 209} top={y(61)} width={f.width} label={f.label}>
              <PBInput
                w={f.width}
                value={terms[i] ?? ''}
                data-tutorial-id={`host.mois.field.superfind-${f.key}`}
                onChange={(e) => setTerm(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') search() }}
              />
            </Painted>
          ))}

          {/* Statuses is a read-only display with its own "..."; the picker
              behind that button is never shown anywhere in the corpus, so it
              opens nothing (spec §13.11). Field 85 + button 13 = 98. */}
          {screen.statuses !== undefined && (
            <Painted left={518} top={y(61)} width={98} label="Statuses:">
              <PBLookup w={98} readOnly value={screen.statuses} name="superfind-statuses" />
            </Painted>
          )}

          <Painted left={653} top={y(60)} width={72}>
            <PBButton
              style={{ width: 72, height: 16, minWidth: 0 }}
              data-tutorial-id="host.mois.command.superfind-print-list"
              onClick={onPrintList}
            >
              Print List
            </PBButton>
          </Painted>
          <Painted left={728} top={y(60)} width={69}>
            <PBButton
              style={{ width: 69, height: 16, minWidth: 0 }}
              data-tutorial-id="host.mois.command.chart-navigator"
              /* the navigator holds the patients this search found (303787:
                 "open the Chart Navigator to … populate a call list") */
              onClick={() => onChartNavigator?.([...new Map(rows.map((r) => [r.chart, {
                chart: r.chart, name: `${r.last},${r.first}`, description: String(r[screen.fields[1]?.key ?? ''] ?? ''),
              }])).values()])}
            >
              Chart Navigator
            </PBButton>
          </Painted>

          <Band top={y(85)} height={15}>Patient List</Band>
          <SuperfindGrid
            screen={screen}
            rows={rows}
            current={Math.min(current, Math.max(0, rows.length - 1))}
            onCurrentChange={setCurrent}
            top={y(102)}
            height={290}
            anchor={(row) => `host.mois.row.superfind-${row.chart}`}
            empty="No patient matches those search parameters."
          />

          {/* the trailing period is in the UI */}
          <Band top={y(401)} height={14}>Selected Patient&apos;s Other Problems.</Band>
          <SuperfindGrid
            screen={screen}
            rows={others}
            top={y(418)}
            height={112}
            anchor={(row) => `host.mois.row.superfind-other-${row[screen.fields[1]!.key] ?? ''}`}
            empty="No other entries in this folder."
          />

          {/* Select 325..386, Cancel 392..453, both w 61 h 16 */}
          <Painted left={325} top={y(557)} width={61}>
            <PBButton
              style={{ width: 61, height: 16, minWidth: 0 }}
              data-tutorial-id="host.mois.command.superfind-select"
              disabled={!picked}
              onClick={() => picked && onSelect?.(picked.chart)}
            >
              Select
            </PBButton>
          </Painted>
          <Painted left={392} top={y(557)} width={61}>
            <PBButton
              style={{ width: 61, height: 16, minWidth: 0 }}
              data-tutorial-id="host.mois.command.superfind-cancel"
              onClick={onClose}
            >
              Cancel
            </PBButton>
          </Painted>
        </div>
      </PBWindow>
    </div>
  )
}
