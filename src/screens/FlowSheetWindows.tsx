import { useEffect, useMemo, useRef, useState, type UIEvent, type WheelEvent } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import type { MoisRecord } from '../data/charts/types'
import {
  FLOWSHEET_ELEMENTS, FLOWSHEET_TYPES, LTM_HEADING, LTM_RULE, periodStart, type FlowSheetElement,
} from '../data/flowSheets'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { PBButton, PBDropDownDataWindow, PBInput } from '../pb'
import { ModalWindow } from './dialogKit'
import { useMedRows, type Med } from './medication-model'
import './flow-sheet.css'

/* ============================================================================
   Flow Sheet Review — Utilities ▸ Flow Sheet Review, the Health Maintenance
   Review's `Flow Sheet` button, and an Encounter Form's `Flow Sheet` toolbar
   button all open the same two windows: the parameters prompt, then the
   sheet itself.

   PROVENANCE
   - Drive `MOIS Screenshot/` 2026-07-27 12.11.17 PM and 12.11.27 PM — the
     current build's DIABETES flow sheet for a training chart, cropped to
     the window's client area (no title bar or toolbar in frame), scrolled to
     the top and then to the bottom. ≈1.3665 device px per CSS px, from the
     20px DataWindow row (27.33 device px). These are the authority for the
     sheet below; the help-site images are an older build.
   - art. 303789 "How to Create a Flow Sheet", image `570bfeace7ac…` (the
     annotated composite: 3a/3b are the parameters dialog with its Type list
     dropped, 4 is the "DIABETES Flowsheet" window). The text: dates are
     yyyy.mm.dd; "click Print or Close/Exit"; "At the bottom of every flow
     sheet, there's a list of all the patient's LONG TERM MEDICATIONS. Hover
     your mouse over the medication to view the dosage."
   - art. 303225 "Use a Flow Sheet", image `5be0ba8b665d…` — the same
     parameters dialog opened from the Health Maintenance Review with Type
     still blank, and a "TEST FLOWSHEET Flowsheet" window (Height / Weight /
     Cholesterol - HDL / CHOLESTEROL - LDL / "Known Tiggers?*" — MOIS's typo).
     Its second image `9d01b1910…` is the Diabetes Encounter Template toolbar
     (Save | Refresh | Flow Sheet | Close/Exit); "Ok (F2)" per the text.
   - art. 359179 "Print a Flow Sheet": both of its screenshots are missing
     from the manual capture (`missing-image.svg`); the text only confirms
     "Click 'Ok' or F2" then "click 'Print'".
   - System Settings (data/systemSettings.ts): `Flow Sheet Order` = A,
     "(A)scending or (D)escending from Left to Right", and `Flow Sheet
     Period` = 2, "Default Period Length in Years". The help-site captures
     default From to two years back plus a day (2014.06.04 – 2016.06.03,
     2010.08.10 – 2012.08.09); the 2026-07-27 sheet prints exactly two years
     (2024.07.27 TO 2026.07.27), which is what data/flowSheets.ts follows.
   ========================================================================= */

export type FlowSheetParams = { from: string; to: string; type: string }

export { FLOWSHEET_TYPES }

/* ============================================================================
   Flow Sheet Parameters

   Measured off `5be0ba8b` (the clean, un-annotated copy): the window is
   ≈333 × 200 client; a sunken group headed by the grey band "Please Enter
   Date Range (inclusive)" holds two navy captions — "Date Range
   (Inclusive):" and "Flow Sheet:" — over From/To and Type; Ok (F2) and
   Cancel sit centred under the group. Note the band says "(inclusive)" and
   the caption "(Inclusive)": both are transcribed as MOIS prints them.
   ========================================================================= */
export function FlowSheetParametersDialog({ defaultType = 'DIABETES', onOk, onClose }: {
  defaultType?: string
  onOk: (params: FlowSheetParams) => void
  onClose: () => void
}) {
  const [from, setFrom] = useState(() => periodStart(MOIS_TODAY))
  const [to, setTo] = useState(MOIS_TODAY)
  const [type, setType] = useState(defaultType)

  const ok = () => { if (type) onOk({ from, to, type }) }

  /* the button says (F2), and in MOIS it means it */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); ok() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <ModalWindow
      id="flow-sheet-parameters"
      title="Flow Sheet Parameters"
      onClose={onClose}
      zIndex={96}
      layerStyle={{ position: 'fixed', padding: 8 }}
      windowClassName="pb-fsparams"
      windowStyle={{ width: 'min(333px, 100%)' }}
    >
      <div className="pb-fsparams__body">
        <div className="pb-fsparams__group">
          <div className="pb-fsparams__band">Please Enter Date Range (inclusive)</div>
          <div className="pb-fsparams__inner">
            <div className="pb-fsparams__caption">Date Range (Inclusive):</div>
            <div className="pb-fsparams__row">
              <label className="pb-fsparams__lbl" htmlFor="fs-from">From:</label>
              <PBInput id="fs-from" w={90} value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.flow-sheet-from" />
              <label className="pb-fsparams__lbl pb-fsparams__lbl--to" htmlFor="fs-to">To:</label>
              <PBInput id="fs-to" w={90} value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.flow-sheet-to" />
            </div>
            <div className="pb-fsparams__caption">Flow Sheet:</div>
            <div className="pb-fsparams__row">
              <span className="pb-fsparams__lbl">Type:</span>
              <PBDropDownDataWindow
                w={176}
                listW={255}
                tutorialId="host.mois.field.flow-sheet-type"
                value={type}
                display="flowsheet"
                rows={FLOWSHEET_TYPES}
                columns={[
                  { key: 'flowsheet', header: 'Flowsheet', width: 125 },
                  { key: 'description', header: 'Description', width: 130 },
                ]}
                onSelect={(r) => setType(r.flowsheet)}
              />
            </div>
          </div>
        </div>
        <div className="pb-fsparams__buttons">
          <PBButton style={{ minWidth: 85 }} command="flow-sheet-ok" disabled={!type} onClick={ok}>Ok (F2)</PBButton>
          <PBButton style={{ minWidth: 85 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </div>
    </ModalWindow>
  )
}


/* ============================================================================
   The flow sheet window.

   Layout from the 2026-07-27 captures (CSS px at ×1.3665):
   - a white identity strip, 22px with a black rule under it: Chart: /
     Patient: / DoB: / Sex: / BC Health No.: at fixed x, the values bold and
     the name LAST, FIRST MIDDLE. (The help-site build labelled the last one
     "Insurance:"; the current build says "BC Health No.:" and prints the
     insurer code with the number, "AB *912…" — the asterisk is not
     explained by anything captured, so it is not reproduced.)
   - a 28px strip "FLOW SHEET AS OF <to>" / "DATE RANGE: <from> TO <to>".
   - the Element / Date crosstab in a split DataWindow: the element column
     (252px) frozen in a left pane with its own horizontal scroll bar, a 1px
     split rule, and a right pane holding the date columns (104px each,
     ascending — `Flow Sheet Order` = A) with the vertical scroll bar. Both
     panes show the whole report; the right one opens scrolled past the
     element column, onto a 5px blank gap before the first date: the date
     headers centre on 257 + 104n, and the gap shows no text even where a
     long medication name runs to the split rule (ESOMEPRAZOLE 40 MG TABLET
     (DELAYED), so it is space between the column objects, not the tail of
     the element column. Header 22px, #C8DCFA; rows 20px, zebra #E8E8E8 / white from
     the first row; the current row salmon across both panes; a grey rule
     on the right of every date column, header included.
   - the element rows, a 23-hyphen rule, LONG TERM MEDICATIONS, an empty
     row, then one row per long-term medication with a navy "========" bar
     in every date column the medication was current on.

   The toolbar strip (printer glyph + Print, Close/Exit) is above the
   captures' crop; it is kept from art. 303789 / 303225 (older build).

   A column exists for every date an element has a record on, valued or not
   (`5be0ba8b` shows an entirely empty 2012.02.10 column); every column in
   the 2026-07-27 sheet has at least one measure. INFERRED: a long-term
   medication's start or end does not add a column of its own. The heavier
   rule where the year turns over is from the help-site images (2014.12.02 |
   2015.01.27, 2010.12.14 | 2011.05.10); the 2026-07-27 columns never cross
   a year.

   The grid is a PB crosstab report rather than an editable DataWindow — the
   kit's PBDataWindow has neither a split pane nor per-column rules — so it
   is a plain table, drawn once per pane, styled in flow-sheet.css.
   ========================================================================= */

/** element column, the gap after it, and date column widths (2026-07-27 captures) */
const ELEMENT_W = 252
const ELEMENT_GAP = 5
const DATE_W = 104
/** the element cell's text box: the column less its 3px left inset */
const ELEMENT_TEXT_W = ELEMENT_W - 3
/** a medication bar's fill, the same eight equals signs in every cell */
const BAR = '========'

type SheetRow =
  | { kind: 'element'; el: FlowSheetElement; index: number }
  | { kind: 'ltm-rule' }
  | { kind: 'ltm-head' }
  | { kind: 'ltm-gap' }
  | { kind: 'med'; med: Med }

function measureMatches(el: Extract<FlowSheetElement, { kind: 'measure' }>, r: MoisRecord) {
  if (el.codes?.includes(r.str_code ?? '')) return true
  return !!el.match && el.match.test((r.str_description ?? '').toUpperCase())
}

/** `8.9 LL`, `132 H`, `148/80` — the value and its abnormal flag, as the grid prints them. */
const cellText = (r: MoisRecord) => [r.str_value, r.str_abnormal].filter(Boolean).join(' ')

/** Was this long-term medication current on `day`? Start and End are both
    inclusive: in the 12.11.27 capture the first APO-WARFARIN row's bar ends
    on 2024.08.26 and the renewal's starts in the same column. */
const onMed = (med: Med, day: string) => !!med.order && med.order <= day && (!med.end || day <= med.end)

/** The order the 12.11.27 capture lists them in: by name — a leading `*`
    ignored, *GEN-METOPROLOL sits between GABAPENTIN and *LORAZEPAM — then
    by start date (the three LORAZEPAM SUBLINGUAL and five METFORMIN rows
    step later down the page). */
const medKey = (med: Med) => med.med.replace(/^\*/, '').toUpperCase()
function byNameThenStart(a: Med, b: Med) {
  return medKey(a).localeCompare(medKey(b)) || a.order.localeCompare(b.order)
}

export function FlowSheetWindow({ params, onClose }: { params: FlowSheetParams; onClose: () => void }) {
  const patient = usePatient()
  const measures = useChartRecords('measure')
  const ltm = useMedRows('ltm')
  const [current, setCurrent] = useState(0)
  const left = useRef<HTMLDivElement>(null)
  const right = useRef<HTMLDivElement>(null)

  const elements = useMemo(() => FLOWSHEET_ELEMENTS[params.type.toUpperCase()] ?? [], [params.type])
  /* INFERRED: a voided long-term medication is not listed */
  const meds = useMemo(() => ltm.filter((med) => !med.voided).sort(byNameThenStart), [ltm])

  const { from, to } = params
  const { dates, cells } = useMemo(() => {
    const cells = new Map<string, string>() // `${element}|${date}` → text
    const days = new Set<string>()
    elements.forEach((el, i) => {
      if (el.kind !== 'measure') return
      for (const r of measures) {
        const day = date(r.dtm_collect_date)
        if (!day || day < from || day > to || !measureMatches(el, r)) continue
        days.add(day)
        const key = `${i}|${day}`
        /* two readings on one day: the later-listed record wins, as a
           crosstab cell can only hold one */
        cells.set(key, cellText(r) || cells.get(key) || '')
      }
    })
    return { dates: [...days].sort(), cells }
  }, [elements, measures, from, to])

  const rows = useMemo<SheetRow[]>(() => [
    ...elements.map((el, index) => ({ kind: 'element' as const, el, index })),
    { kind: 'ltm-rule' }, { kind: 'ltm-head' }, { kind: 'ltm-gap' },
    ...meds.map((med) => ({ kind: 'med' as const, med })),
  ], [elements, meds])

  /* the right pane opens past the element column, the left one at 0 */
  useEffect(() => {
    if (right.current) right.current.scrollLeft = ELEMENT_W
  }, [])

  /* one vertical position for both panes; the scroll bar is the right pane's */
  const onRightScroll = (e: UIEvent<HTMLDivElement>) => {
    if (left.current) left.current.scrollTop = e.currentTarget.scrollTop
  }
  const onLeftWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (right.current && e.deltaY) right.current.scrollTop += e.deltaY
  }

  const yearStart = (i: number) => i > 0 && dates[i].slice(0, 4) !== dates[i - 1].slice(0, 4)
  const name = `${patient.last}, ${[patient.first, patient.middle].filter(Boolean).join(' ')}`.toUpperCase()
  const healthNo = [patient.insuranceBy, patient.insurance ?? patient.bchn].filter(Boolean).join(' ')

  const grid = (pane: 'left' | 'right') => {
    const anchored = pane === 'left'
    const dateCells = (fill: (day: string) => string) => dates.map((day, i) => {
      const bar = fill(day)
      return (
        <td key={day} className={yearStart(i) ? 'is-year' : undefined}>
          {bar === BAR ? <span className="pb-flowsheet__bar">{BAR}</span> : bar}
        </td>
      )
    })
    return (
      <table
        className="pb-flowsheet__grid"
        style={{
          width: ELEMENT_W + ELEMENT_GAP + dates.length * DATE_W,
          /* INFERRED: the right pane always opens past the element column,
             so it has room to scroll that far even when the dates fit (both
             captures overflow, so neither shows the short case) */
          minWidth: pane === 'right' ? `calc(100% + ${ELEMENT_W}px)` : undefined,
        }}
      >
        <colgroup>
          <col style={{ width: ELEMENT_W + ELEMENT_GAP }} />
          {dates.map((day) => <col key={day} style={{ width: DATE_W }} />)}
          <col />
        </colgroup>
        <thead>
          <tr>
            <th className="pb-flowsheet__el"><span style={{ width: ELEMENT_TEXT_W }}>Element / Date</span></th>
            {dates.map((day, i) => (
              <th key={day} className={yearStart(i) ? 'is-year' : undefined}>{day}</th>
            ))}
            <th className="pb-flowsheet__rest" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const label =
              row.kind === 'element' ? row.el.label
                : row.kind === 'ltm-rule' ? LTM_RULE
                  : row.kind === 'ltm-head' ? LTM_HEADING
                    : row.kind === 'med' ? row.med.med : ''
            const ltmBlock = row.kind !== 'element'
            return (
              <tr
                key={row.kind === 'med' ? row.med.id : row.kind === 'element' ? `el-${row.index}` : row.kind}
                className={[r === current && 'is-current', ltmBlock && 'is-ltm'].filter(Boolean).join(' ') || undefined}
                onClick={() => setCurrent(r)}
                data-tutorial-id={anchored ? `host.mois.row.flow-sheet-${r}` : undefined}
              >
                <td
                  className="pb-flowsheet__el"
                  /* "Hover your mouse over the medication to view the dosage" (303789) */
                  title={row.kind === 'med' ? row.med.dose : undefined}
                >
                  <span style={{ width: ELEMENT_TEXT_W }}>{label}</span>
                </td>
                {dateCells((day) =>
                  row.kind === 'element' ? cells.get(`${row.index}|${day}`) ?? ''
                    : row.kind === 'med' && onMed(row.med, day) ? BAR : '')}
                <td className="pb-flowsheet__rest" />
              </tr>
            )
          })}
          {/* the column rules carry on down the empty body */}
          <tr className="pb-flowsheet__filler">
            <td className="pb-flowsheet__el" />
            {dates.map((day, i) => <td key={day} className={yearStart(i) ? 'is-year' : undefined} />)}
            <td className="pb-flowsheet__rest" />
          </tr>
        </tbody>
      </table>
    )
  }

  return (
    <ModalWindow
      id="flow-sheet"
      title={`${params.type} Flowsheet`}
      onClose={onClose}
      zIndex={96}
      layerStyle={{ position: 'fixed', padding: 8 }}
      windowClassName="pb-flowsheet"
      /* INFERRED: the 2026-07-27 client is ≈1622 × 926 CSS px — the window
         fills the screen — so it takes what the desktop offers */
      windowStyle={{ width: 'min(1640px, 100%)', height: 'min(980px, 100%)' }}
    >
      <div className="pb-flowsheet__toolbar">
        <PBButton bare className="pb-flowsheet__tool" command="flow-sheet-print">
          <PrinterGlyph />Print
        </PBButton>
        <span className="pb-flowsheet__toolsep" />
        <PBButton bare className="pb-flowsheet__tool" command="flow-sheet-close" onClick={onClose}>
          Close/Exit
        </PBButton>
        <span className="pb-flowsheet__toolsep" />
      </div>

      <div className="pb-flowsheet__ident">
        <span style={{ left: 9 }}>Chart:</span><b style={{ left: 60 }}>{patient.chart}</b>
        <span style={{ left: 158 }}>Patient:</span><b style={{ left: 204 }}>{name}</b>
        <span style={{ left: 436 }}>DoB:</span><b style={{ left: 466 }}>{patient.dob}</b>
        <span style={{ left: 569 }}>Sex:</span><b style={{ left: 596 }}>{patient.sex}</b>
        <span style={{ left: 659 }}>BC Health No.:</span><b style={{ left: 745 }}>{healthNo}</b>
      </div>
      <div className="pb-flowsheet__asof">
        <span style={{ left: 9 }}>FLOW SHEET AS OF</span><b style={{ left: 129 }}>{to}</b>
        <span style={{ left: 381 }}>DATE RANGE:</span><b style={{ left: 469 }}>{from}</b>
        <span style={{ left: 552 }}>TO</span><b style={{ left: 581 }}>{to}</b>
      </div>

      <div className="pb-flowsheet__panes">
        <div
          ref={left}
          className="pb-flowsheet__pane pb-flowsheet__pane--left"
          style={{ width: ELEMENT_W }}
          onWheel={onLeftWheel}
        >
          {grid('left')}
        </div>
        <div ref={right} className="pb-flowsheet__pane pb-flowsheet__pane--right" onScroll={onRightScroll}>
          {grid('right')}
        </div>
      </div>
    </ModalWindow>
  )
}

/** The 16px printer glyph in front of "Print" on the flow sheet toolbar. */
function PrinterGlyph() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" aria-hidden="true" style={{ marginRight: 4 }}>
      <rect x="3.5" y="0.5" width="7" height="4" fill="#fff" stroke="#555" />
      <rect x="0.5" y="4.5" width="13" height="5" rx="1" fill="#b9c6d6" stroke="#4d5b6c" />
      <rect x="3.5" y="8.5" width="7" height="4" fill="#fff" stroke="#555" />
      <rect x="11" y="6" width="1.5" height="1" fill="#2c8a2c" />
    </svg>
  )
}
