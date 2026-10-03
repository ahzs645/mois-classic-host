import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  bmiClassification, calculatorMeasureCode, encounterWindowMeasures, measureCalculators,
  measureFlags, measureTemplates, type MeasureSlot, type MeasureTemplate,
} from '../data/measures'
import { useChartRecords } from '../data/chart-records'
import { useScreenReport } from '../host/screen-state'
import { BloodPressureFormWindow } from './BloodPressureFormWindow'
import { Phq9FormWindow } from './Phq9FormWindow'
import { MeasureCalculatorBody } from './MeasureCalculatorBodies'
import { FACE, ModalWindow } from './dialogKit'
import { PatientFieldRow } from './patientKit'
import { MEASURE_FORMS, type Phq9Answers } from '../data/measureEntry'
import { usePatient } from '../data/patient-context'
import {
  PBBand, PBButton, PBDataWindow, PBInput, PBLookup, PBSelect, PBTextArea, pbSlug,
} from '../pb'

/* ============================================================================
   The Measurements command row.

   `New Record` files a blank row and opens Measurement Detail over it;
   `Template` opens the site's default measure grid; `Other Template` picks a
   different one; `Calculator` picks a calculator and opens it. Every one of
   them ends by writing measure rows back into the encounter, so they all
   hand their result back through `onRecord`.
   ========================================================================= */

/** What a measure row looks like on the encounter's Measurements tab. */
/* quick codes MOIS resolves in the Code column (303104: "type the quick
   code BP … Blood Pressure, code 1950") */
const QUICK_CODES: Record<string, Partial<MeasurementRow>> = {
  BP: { code: '1950', name: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', units: 'mm Hg' },
  '1950': { name: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', units: 'mm Hg' },
  /* 303102: "Type in the quick code PHQ9" — PHQ-9 TOTAL SCORE, 43894
     (302837 quick-code table `4bdc30e8…`; normal range to 10 per the export) */
  PHQ9: { code: '43894', name: 'PHQ-9 TOTAL SCORE', units: '', upper: '10' },
  '43894': { name: 'PHQ-9 TOTAL SCORE', units: '', upper: '10' },
}

export type MeasurementRow = {
  code: string
  name: string
  value: string
  flag: string
  units: string
  /** a row that has been filed but not yet saved — MOIS leaves it current */
  fresh?: boolean
  collected?: string
  by?: string
  report?: string
  lower?: string
  upper?: string
  /** the chart record behind the row, when it has one */
  id?: string
  /** the unnamed column right of Value: `.*.` once a form was saved on it */
  marker?: string
}

/* ---------------------------------------------------------------------------
   Measurement Detail — the record behind one measure.

   The window an existing measure opens on, and where a `New Record` row is
   filled in. Its middle block is painted with the selection blue because
   those three fields are the record: everything above them says when it was
   collected and everything below says what was reported about it.
   ------------------------------------------------------------------------ */
export function MeasurementDetailDialog({ row, encounter, onOk, onClose }: {
  row: MeasurementRow
  encounter: string
  onOk: (row: MeasurementRow) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const [draft, setDraft] = useState(row)
  const set = (patch: Partial<MeasurementRow>) => setDraft((d) => ({ ...d, ...patch }))
  /* a blood pressure has a form behind its value (BLOOD PRESSURE
     MEASUREMENT), and so does a PHQ-9 TOTAL SCORE (PATIENT HEALTH
     QUESTIONNAIRE, 303102) */
  const formKind = MEASURE_FORMS[draft.code]
  const hasForm = !!formKind
  const [openForm, setOpenForm] = useState(false)
  const bpForm = openForm && formKind === 'bp'
  const phq9Form = openForm && formKind === 'phq9'
  const setBpForm = setOpenForm
  const [phq9, setPhq9] = useState<{ answers: Phq9Answers; modified: string } | null>(null)
  useScreenReport(bpForm ? { dialog: 'blood-pressure-form' } : phq9Form ? { dialog: 'phq9-form' } : {})

  return (
    <ModalWindow
      id="measurement-detail"
      title="Measurement Detail"
      onClose={onClose}
      zIndex={96}
      windowStyle={{ width: 'min(620px, 100%)', height: 'min(438px, 100%)' }}
      after={<>
        {bpForm && (
          <BloodPressureFormWindow
            initial={draft.value.includes('/') ? { systolic: draft.value.split('/')[0], diastolic: draft.value.split('/')[1] } : undefined}
            onSave={(r) => set({ value: `${r.systolic}/${r.diastolic}` })}
            onClose={() => setBpForm(false)}
          />
        )}
        {phq9Form && (
          <Phq9FormWindow
            initial={phq9?.answers}
            modified={phq9?.modified}
            /* Save Form: "The patient's PHQ9 score is now in the value field" */
            onSave={(r) => { setPhq9({ answers: r.answers, modified: r.modified }); set({ value: r.total, flag: r.flag, report: r.report, marker: '.*.' }) }}
            onClose={() => setOpenForm(false)}
          />
        )}
      </>}
    >
        {/* the yellow identity strip: which record this measure belongs to */}
        <PatientFieldRow
          layout="strong"
          className=""
          style={{
            display: 'flex', gap: 18, flex: 'none', padding: '3px 8px',
            background: 'var(--pb-yellow)', borderBottom: '1px solid var(--pb-yellow-border)',
          }}
          fields={[
            { label: 'ENC #:', value: encounter }, { label: 'CHART:', value: patient.chart },
            { label: 'FIRST:', value: patient.first }, { label: 'LAST:', value: patient.last },
          ]}
        />

        <PBBand>Measurement Detail</PBBand>

        <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', padding: '5px 8px' }}>
          <span className="pb-form__label">Collected:</span>
          <div className="pb-row">
            <PBInput w={158} value={row.by ?? ''} readOnly />
            <PBInput w={82} align="center" defaultValue={row.collected?.replace(/\//g, '.') ?? ''} />
            <PBInput w={46} align="center" defaultValue="" />
          </div>

          <span className="pb-form__label">Code:</span>
          <div className="pb-row">
            <PBLookup
              w={96}
              value={draft.code}
              /* the quick code BP is Blood Pressure, 1950 (303104) */
              onChange={(v) => set(QUICK_CODES[v.toUpperCase()] ? { code: v, ...QUICK_CODES[v.toUpperCase()] } : { code: v })}
              name="measurement-code"
              fieldId="host.mois.field.measurement-code"
            />
            <span style={{ marginLeft: 10 }}>Category:</span>
            <PBInput w={150} />
          </div>
        </div>

        {/* ---- the record itself ------------------------------------------ */}
        <div
          className="pb-form"
          style={{
            gridTemplateColumns: 'auto 1fr', padding: '5px 8px', margin: '0 6px',
            background: 'var(--pb-select)', border: '1px solid var(--pb-select-brd)',
          }}
        >
          <span className="pb-form__label">Test Name:</span>
          <PBInput
            w="100%"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            data-tutorial-id="host.mois.field.test-name"
          />
          <span className="pb-form__label">Value:</span>
          <div className="pb-row">
            <PBInput
              w={132}
              value={draft.value}
              onChange={(e) => set({ value: e.target.value })}
              /* F4 in Value opens the measure's form instead of taking a
                 typed reading (303104) */
              onKeyDown={(e) => { if (e.key === 'F4' && hasForm) { e.preventDefault(); setBpForm(true) } }}
              data-tutorial-id="host.mois.field.measurement-value"
            />
            {/* the "…" right of Value (302837 `17afb92b…`, v02.30.22) */}
            <PBButton
              bare
              className="pb-inputgroup__btn pb-inputgroup__btn--dots"
              disabled={!hasForm}
              command="measurement-value-form"
              onClick={() => setBpForm(true)}
            >
              …
            </PBButton>
            <span style={{ marginLeft: 12 }}>Flag:</span>
            <PBSelect
              w={62}
              options={measureFlags}
              value={draft.flag}
              onChange={(e) => set({ flag: e.target.value })}
            />
          </div>
        </div>

        <RefRanges row={draft} />

        <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', padding: '5px 8px' }}>
          <span className="pb-form__label">Collector Note:</span>
          <PBInput w="100%" />
          <span className="pb-form__label">Report:</span>
          <PBTextArea rows={5} w="100%" value={draft.report ?? ''} readOnly />
        </div>

        <div
          className="pb-row"
          style={{ padding: '2px 8px', flex: 'none', borderTop: '1px solid var(--pb-border-soft)' }}
        >
          <span>Record Created:</span>
          <span style={{ flex: '1 1 auto' }} />
          <span>Last Modified:</span>
        </div>

        <div className="pb-row" style={{ justifyContent: 'center', padding: '8px 0 10px', flex: 'none' }}>
          <PBButton
            style={{ width: 118, flex: 'none' }}
            className="pb-btn--default"
            command="measurement-ok"
            onClick={() => onOk(draft)}
          >
            Ok
          </PBButton>
        </div>
    </ModalWindow>
  )
}

/* The reference-range strip: five boxes reading outwards from the normal
   range, the two extremes pink and the two warnings yellow. The `‹ ›` at each
   end step through the ranges a measure can carry more than one of. */
function RefRanges({ row }: { row: MeasurementRow }) {
  const box = (bg: string) => ({ height: 18, background: bg, border: '1px solid var(--pb-border)' })
  /* four boxes and five captions: the middle caption names the gap between
     the low pair and the high pair, so boxes and captions share one grid */
  const grid = { display: 'grid', gridTemplateColumns: '74px 74px 1fr 74px 74px', gap: 3 }
  return (
    <div style={{ padding: '4px 8px', flex: 'none' }}>
      <div className="pb-row" style={{ gap: 4, alignItems: 'flex-start' }}>
        <span className="pb-form__label" style={{ width: 92 }}>Ref. Ranges:</span>
        <PBButton size="sm" style={{ width: 18, minWidth: 18, flex: 'none' }}>&lsaquo;</PBButton>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={grid}>
            <input className="pb-field" style={box('#ffcfcf')} />
            <PBInput value={row.lower ?? ''} readOnly style={box('var(--pb-dw-flag)')} />
            <span />
            <PBInput value={row.upper ?? ''} readOnly style={box('var(--pb-dw-flag)')} />
            <input className="pb-field" style={box('#ffcfcf')} />
          </div>
          <div style={{ ...grid, marginTop: 1, textAlign: 'center' }}>
            <span>L L</span><span>L</span><span>NORMAL RANGE</span><span>H</span><span>H H</span>
          </div>
        </div>
        <PBButton size="sm" style={{ width: 18, minWidth: 18, flex: 'none' }}>&rsaquo;</PBButton>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Geometry shared by the four dialogs below.

   PROVENANCE: Drive `Mois/` 2026-09-20 11.42.15 (ENCOUNTER WINDOW), 11.42.22
   (Measure Template / Panel Selection), 11.42.28 (Measure Calculators) and
   11.42.35 (Measure Calculator, BMI), all on chart 3924 in the current
   build. Those captures are 2.34 device px to a CSS px: the DataWindow cap
   height (21 px against the 2026-09-29 TRAINING captures' 18 px at 2x) and
   the 66 px title bar (ours is 28.5) both give it. Every number below is a
   capture measurement divided by 2.34, measured from the window face (the
   pixel under the title bar), so they carry about ±0.5 px of error.

   What the captures show that the kit has no prop for, kept here as scoped
   CSS (kit-prop candidates):
     - `mea-vbar`: the vertical scroll bar both grids paint even when every
       row fits (PB's VScrollBar = yes);
     - `mea-clip`: a cell too narrow for its text is cut, not ellipsed (the
       Template List's "… 3Q SCREENEF");
     - `mea-grid`: the ENCOUNTER WINDOW caption row is 19.3 px over 18.36 px
       rows, where the kit makes the header the row height;
     - `mea-calc`: an empty numeric box reads "-" until it takes focus — the
       BMI capture shows "-" in every box but Height, which has the caret.
   ------------------------------------------------------------------------ */
const MEASURE_DIALOG_CSS = `
.mea-vbar .pb-dw__scroll { overflow-y: scroll; }
.mea-clip .pb-dw__table > tbody > tr > td { text-overflow: clip; }
.mea-grid .pb-dw__table > thead > tr > th { height: 19.3px; }
.mea-calc .pb-field::placeholder { color: var(--pb-text); opacity: 1; }
.mea-calc .pb-field:focus::placeholder { color: transparent; }
`

/** A DataWindow's band row in these four captures is 17.5 px (41 device px). */
const LIST_ROW_H = '17.5px'

/** Absolute placement on a window face, from capture measurements. */
const at = (left: number, top: number, width?: number, height?: number): CSSProperties => ({
  position: 'absolute', left, top, width, height,
})

/** The face under the title bar, as a positioning context. */
const FACE_ABS: CSSProperties = { ...FACE, position: 'relative' }

/** A bordered group: the grey caption band, ruled off, over a white body. */
function BandBox({ title, band, style, children }: {
  title: string
  /** the band's height inside the box's top border */
  band: number
  style: CSSProperties
  children: ReactNode
}) {
  return (
    <div
      style={{
        ...style, display: 'flex', flexDirection: 'column', border: '1px solid #7b7b7b',
        background: '#fff', ['--pb-band-h' as string]: `${band}px`,
      }}
    >
      <div className="pb-band--ruled"><PBBand>{title}</PBBand></div>
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   The measure template grid — `Template`, and what `Other Template` opens.

   One row per measure in the template, each with an empty Value box and a
   Flag drop-down. Nothing is a record until `Save Changes (F2)`, and MOIS
   files only the rows that were given a value.

   2026-09-20 11.42.15 (the window 648 x 627): the grid is ruled off at
   8.9 / 7.3 on the face, 627 x 538, its rows on the window face rather than
   white, no hairlines, a bold caption row with a 1px black rule under it,
   and a scroll bar. Code text sits 7 px in, Test Name at 58, the Value box
   (120 x 16) at 317.5, the Flag drop-down (70) at 439, Units at 513; rows
   18.36 px apart. Save Changes (F2) and Close w/o Save are 118 x 20,
   centred, 9 px apart, 13 px under the grid.
   ------------------------------------------------------------------------ */
export function MeasureTemplateGridDialog({ title, slots, initial, onSave, onClose }: {
  /** the template's own name, which is what MOIS puts in the caption */
  title: string
  slots: MeasureSlot[]
  /** "This window will also retrieve measurements that were already
      entered" (art. 303070): by code, the records linked to the encounter
      it was opened from, or the ones carrying today's date from Measures */
  initial?: Record<string, { value: string; flag: string }>
  onSave: (rows: MeasurementRow[]) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, { value: string; flag: string }>>(() => initial ?? {})
  const cell = (code: string) => values[code] ?? { value: '', flag: '' }
  const set = (code: string, patch: Partial<{ value: string; flag: string }>) => (
    setValues((v) => ({ ...v, [code]: { ...cell(code), ...patch } }))
  )

  const save = () => onSave(slots
    .filter((s) => cell(s.code).value.trim() !== '')
    .map((s) => ({ ...s, value: cell(s.code).value, flag: cell(s.code).flag || '-', fresh: true })))

  /* each column's text inset, since the grid's own cell padding is zeroed */
  const pad = (left: number, children: ReactNode) => <span style={{ paddingLeft: left }}>{children}</span>
  return (
    <ModalWindow
      tutorialId="host.mois.dialog.measure-template"
      title={title}
      onClose={onClose}
      zIndex={96}
      windowStyle={{ width: 'min(648px, 100%)', height: 'min(627px, 100%)' }}
    >
      <style>{MEASURE_DIALOG_CSS}</style>
      <div style={FACE_ABS}>
        <div className="mea-vbar mea-grid" style={{ ...at(8.9, 7.3, 627, 538.4), display: 'flex' }}>
          <PBDataWindow
            /* a data-entry form, not a list: no current row, no zebra, no
               hairlines, and the header is the plain ruled one */
            gutter={false}
            zebra={false}
            rules={false}
            head="grey"
            current={-1}
            style={{
              flex: '1 1 auto', minHeight: 0,
              ['--pb-dw-row-h' as string]: '18.36px',
              ['--pb-dw-row' as string]: '#f0f0f0',
              ['--pb-dw-pad-x' as string]: '0px',
              ['--pb-row-h' as string]: '16px',
            }}
            columns={[
              { key: 'code', header: pad(7, 'Code'), width: 52.6, render: (s) => pad(5, s.code) },
              { key: 'name', header: pad(7.5, 'Test Name'), width: 263, render: (s) => pad(5.5, s.name) },
              {
                key: 'value',
                header: pad(2.5, 'Value'),
                width: 122,
                render: (s) => (
                  <PBInput
                    w={120}
                    value={cell(s.code).value}
                    onChange={(e) => set(s.code, { value: e.target.value })}
                    /* the box hangs 2.2 px under the row's top, not centred */
                    style={{ display: 'block', margin: '2.2px 0 0 1.5px' }}
                    data-tutorial-id={`host.mois.field.measure-${s.code}`}
                  />
                ),
              },
              {
                key: 'flag',
                header: 'Flag',
                headAlign: 'center',
                width: 72.6,
                render: (s) => (
                  <PBSelect
                    w={70}
                    options={measureFlags}
                    value={cell(s.code).flag}
                    onChange={(e) => set(s.code, { flag: e.target.value })}
                    style={{ display: 'inline-flex', verticalAlign: 'top', margin: '2.2px 0 0 1px' }}
                  />
                ),
              },
              { key: 'units', header: pad(3, 'Units'), render: (s) => pad(3, s.units) },
            ]}
            rows={slots}
          />
        </div>
        <PBButton style={{ ...at(195.7, 559.8, 118, 20.1), minWidth: 0 }} command="save-changes" onClick={save}>
          Save Changes (F2)
        </PBButton>
        <PBButton style={{ ...at(323, 559.8, 118, 20.1), minWidth: 0 }} onClick={onClose}>Close w/o Save</PBButton>
      </div>
    </ModalWindow>
  )
}

/* ---------------------------------------------------------------------------
   Measure Template / Panel Selection — `Other Template`.

   Templates and panels share one list: a TEMPLATE opens the measure grid, a
   PANEL is a scored instrument MOIS opens its own window for.

   2026-09-20 11.42.22: the Template List group at 11 / 12.4 on the face,
   849.5 x 543, its band 21 px and ruled off; gutter 16, Name 285 and
   Description 426 with centred captions, Type the rest, and a scroll bar.
   Open and Cancel are 70 x 19.5, 17 px apart, 18.7 px under the group. The
   capture cuts the window at its right and foot; 873 x 642 assumes the
   right margin matches the left (11) and the foot the Measure Calculators'
   (20.5 under the buttons) — INFERRED. The scroll thumb shows the list goes
   on past POCT URINALYSIS MANUAL READ; those rows were not captured.
   ------------------------------------------------------------------------ */
export function MeasureTemplateSelectionDialog({ onOpen, onClose }: {
  onOpen: (template: MeasureTemplate) => void
  onClose: () => void
}) {
  const [cur, setCur] = useState(0)
  const row = measureTemplates[cur]
  return (
    <ModalWindow
      tutorialId="host.mois.dialog.measure-template-selection"
      title="Measure Template / Panel Selection"
      onClose={onClose}
      zIndex={96}
      windowStyle={{ width: 'min(873px, 100%)', height: 'min(642px, 100%)' }}
    >
      <style>{MEASURE_DIALOG_CSS}</style>
      <div style={FACE_ABS}>
        <BandBox title="Template List" band={21} style={at(11, 12.4, 849.5, 543)}>
          <div className="mea-vbar mea-clip" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              flush
              style={{
                flex: '1 1 auto', minHeight: 0,
                ['--pb-dw-row-h' as string]: LIST_ROW_H, ['--pb-dw-gutter-width' as string]: '16px',
              }}
              columns={[
                { key: 'name', header: 'Name', width: 285, headAlign: 'center' },
                { key: 'description', header: 'Description', width: 426, headAlign: 'center' },
                { key: 'type', header: 'Type', headAlign: 'center' },
              ]}
              rows={measureTemplates}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(r) => onOpen(r)}
            />
          </div>
        </BandBox>
        <PBButton style={{ ...at(365.5, 574.1, 70.2, 19.5), minWidth: 0 }} command="open-template" onClick={() => row && onOpen(row)}>
          Open
        </PBButton>
        <PBButton style={{ ...at(452.7, 574.1, 70.2, 19.5), minWidth: 0 }} onClick={onClose}>Cancel</PBButton>
      </div>
    </ModalWindow>
  )
}

/* ---------------------------------------------------------------------------
   Measure Calculators — the picker, then the calculator.

   2026-09-20 11.42.28 (the window 268 x 308, captured whole): the Select
   Calculator group at 15.5 / 15.4 on the face, 232 x 213, its band 19 px;
   inside it the DataWindow is only 212 wide (gutter 15, Calculator 197),
   leaving the group's white body to its right; five rows, BMI current.
   Open (F2) and Cancel are 88 x 19 at 34.6 and 141.4, 240.2 down.
   ------------------------------------------------------------------------ */
export function MeasureCalculatorsDialog({ onOpen, onClose }: {
  onOpen: (calculator: string) => void
  onClose: () => void
}) {
  const [cur, setCur] = useState(0)
  return (
    <ModalWindow
      tutorialId="host.mois.dialog.measure-calculators"
      title="Measure Calculators"
      onClose={onClose}
      zIndex={96}
      windowStyle={{ width: 268, height: 308 }}
    >
      <div style={FACE_ABS}>
        <BandBox title="Select Calculator" band={19} style={at(15.5, 15.4, 232, 213)}>
          <PBDataWindow
            flush
            style={{
              width: 212, flex: '1 1 auto', minHeight: 0,
              ['--pb-dw-row-h' as string]: LIST_ROW_H, ['--pb-dw-gutter-width' as string]: '15px',
            }}
            columns={[{ key: 'name', header: 'Calculator', headAlign: 'center' }]}
            rows={measureCalculators.map((name) => ({ name }))}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(r) => onOpen(String(r.name))}
            empty=""
          />
        </BandBox>
        <PBButton style={{ ...at(34.6, 240.2, 87.6, 19), minWidth: 0 }} command="open-calculator" onClick={() => onOpen(measureCalculators[cur]!)}>
          Open (F2)
        </PBButton>
        <PBButton style={{ ...at(141.4, 240.2, 88, 19), minWidth: 0 }} onClick={onClose}>Cancel</PBButton>
      </div>
    </ModalWindow>
  )
}

/* The BMI calculator, which is the one the training database opens on. It
   really calculates: MOIS converts as you type and `Populate` is what carries
   the result out to the measure grid.

   2026-09-20 11.42.35 (the window 462 wide; the capture cuts its foot, so
   465 tall assumes the Measure Calculators' 20.5 px under the buttons —
   INFERRED): one group at 10.6 / 10.2 on the face, 437.6 x 371.8, banded
   BODY MASS INDEX (BMI) CALCULATOR (19 px). Under the band it is ten
   sections ruled off from each other — the first two by a dark rule, the
   classification table's by a light one — with these heights: 45.6 (Height
   / Weight), 52.4 (BMI / Ideal Weight Range), 28.5 (Classification), 54.5
   (Underweight), 24.2, 24.3, 55.4 (Obese), 28 (Based on…), 29 (Measure
   Code). Every box is white and 16 px tall: Height, Weight, BMI and Measure
   Code 58.5 wide at 88, (ft)/(lb) 33 at 258, (in)/(oz) 33.4 at 337, the two
   Ideal Weight boxes 59 at 147 and 237.6. Empty boxes read "-", right-set in
   the unit boxes and centred in BMI and Ideal; Height has the caret. The
   four buttons are 92.7 x 20.6, 395 down, Save (F2) enabled with nothing in
   it. The `< OVERWEIGHT >` badge and the yellow band come from the older
   help-site image (302837 `ff51e56c…`), not this capture. */
export function MeasureCalculatorDialog({ calculator, onSave, onClose }: {
  calculator: string
  onSave: (row: MeasurementRow) => void
  onClose: () => void
}) {
  const [cms, setCms] = useState('')
  const [kgs, setKgs] = useState('')
  /* Populate (Ctrl+P) "for previously inputted height and weight
     measurements to be used" (art. 303065; 302837 "the calculator will pull
     the patient's last weight and height measured"): the latest HEIGHT
     (1948) and WEIGHT (22732) on the chart. */
  const measures = useChartRecords('measure', 'dtm_collect_date')
  const latest = (code: string) => measures.find((r) => r.str_code === code && Number(r.str_value) > 0)?.str_value ?? ''
  const populate = () => { setCms(latest('1948')); setKgs(latest('22732')) }

  const { bmi, ideal } = useMemo(() => {
    const m = Number(cms) / 100
    const kg = Number(kgs)
    if (!(m > 0) || !(kg > 0)) return { bmi: '', ideal: ['', ''] as [string, string] }
    return {
      bmi: (kg / (m * m)).toFixed(2),
      ideal: [(18.5 * m * m).toFixed(1), (24.99 * m * m).toFixed(1)] as [string, string],
    }
  }, [cms, kgs])

  /* the WHO band the index falls in: Underweight < 18.5, Normal Weight
     18.50–24.99, Overweight 25.00–29.99, Obese >= 30.00 */
  const klass = !bmi ? '' : Number(bmi) < 18.5 ? 'Underweight' : Number(bmi) < 25 ? 'Normal Weight'
    : Number(bmi) < 30 ? 'Overweight' : 'Obese'
  useScreenReport({ bmiClass: klass ? pbSlug(klass) : 'none' })
  const imperial = (value: number, per: number) => (value > 0 ? String(Math.floor(value / per)) : '')
  const code = calculatorMeasureCode[calculator] ?? ''

  /* BSA, Cardiac Risk, Predicted PEF and Gestational Age are their own
     layouts (302837 `27fd978b…`, `4d69f496…`, `eb9d27d7…`, `14e8d18a…`) */
  if (calculator !== 'BMI') return <MeasureCalculatorBody calculator={calculator} onSave={onSave} onClose={onClose} />

  /* one ruled section of the group; `light` is the classification table's
     grey rule, otherwise the dark one */
  const section = (height: number, children: ReactNode, light = false, last = false) => (
    <div style={{ position: 'relative', height, flex: 'none', borderBottom: last ? 0 : `1px solid ${light ? '#ababaf' : '#262626'}` }}>
      {children}
    </div>
  )
  /* a computed box: white like the typed ones, "-" while it has nothing */
  const shown = (left: number, top: number, width: number, value: string, align: 'center' | 'right') => (
    <PBInput style={{ ...at(left, top, width), background: '#fff' }} align={align} value={value} placeholder="-" readOnly tabIndex={-1} />
  )
  const label = (left: number, text: ReactNode, top?: number) => (
    <span style={{ position: 'absolute', left, ...(top === undefined ? { top: 0, bottom: 0, display: 'flex', alignItems: 'center' } : { top }) }}>{text}</span>
  )
  /* a classification row: label, range, and the sub-classes beside it,
     15.7 px a line */
  const classRow = (c: (typeof bmiClassification)[number], height: number, first: number) => {
    const hit = !!klass && c.label.startsWith(klass)
    return section(height, (
      <div style={{ position: 'absolute', inset: 0, lineHeight: '15.7px', ...(hit ? { background: 'var(--pb-yellow)', fontWeight: 700 } : {}) }}>
        {c.detail ? (
          <>
            <span style={at(c.label === 'Underweight:' ? 8.6 : 9.8, first)}>{c.label}</span>
            <span style={at(130.8, first)}>{c.range}</span>
            {c.detail.map(([name, range], i) => (
              <span key={name}>
                <span style={at(216.2, first + i * 15.7)}>{name}</span>
                <span style={at(314.6, first + i * 15.7)}>{range}</span>
              </span>
            ))}
          </>
        ) : (
          <>{label(9.8, c.label)}{label(130.8, c.range)}</>
        )}
      </div>
    ), true)
  }
  const [under, normal, over, obese] = bmiClassification

  return (
    <ModalWindow
      tutorialId="host.mois.dialog.measure-calculator"
      title="Measure Calculator"
      onClose={onClose}
      zIndex={97}
      windowStyle={{ width: 'min(462px, 100%)', height: 'min(465px, 100%)' }}
    >
      <style>{MEASURE_DIALOG_CSS}</style>
      <div className="mea-calc" style={{ ...FACE_ABS, ['--pb-row-h' as string]: '16.2px' }}>
        {/* the BMI calculator; the BSA, Cardiac Risk, Predicted PEF and
            Gestational Age windows are their own layouts and return above
            (MeasureCalculatorBodies.tsx) */}
        <div
          style={{
            ...at(10.6, 10.2, 437.6, 371.8), display: 'flex', flexDirection: 'column',
            border: '1px solid #7b7b7b', ['--pb-band-h' as string]: '19px',
          }}
        >
          <div className="pb-band--ruled"><PBBand>BODY MASS INDEX (BMI) CALCULATOR</PBBand></div>
          {section(45.6, <>
            {label(8.6, 'Height (cms):', 3.5)}
            <PBInput
              style={at(88.1, 2.2, 58.5)}
              align="right"
              autoFocus
              placeholder="-"
              value={cms}
              onChange={(e) => setCms(e.target.value)}
              data-tutorial-id="host.mois.field.calculator-height"
            />
            {label(239.8, '(ft):', 3.5)}
            {shown(258.2, 2.2, 33, imperial(Number(cms) / 30.48 || 0, 1), 'right')}
            {label(313.2, '(in):', 3.5)}
            {shown(336.8, 2.2, 33.4, imperial((Number(cms) / 2.54) % 12 || 0, 1), 'right')}

            {label(8.6, 'Weight (kgs):', 26.1)}
            <PBInput
              style={at(88.1, 24.8, 58.5)}
              align="right"
              placeholder="-"
              value={kgs}
              onChange={(e) => setKgs(e.target.value)}
              data-tutorial-id="host.mois.field.calculator-weight"
            />
            {label(237.6, '(lb):', 26.1)}
            {shown(258.2, 24.8, 33, imperial(Number(kgs) * 2.20462 || 0, 1), 'right')}
            {label(313.2, '(oz):', 26.1)}
            {shown(336.8, 24.8, 33.4, imperial((Number(kgs) * 35.274) % 16 || 0, 1), 'right')}
          </>)}
          {section(52.4, <>
            {label(8.6, 'BMI (kg/m2):', 7.2)}
            {shown(88.1, 5.9, 58.5, bmi, 'center')}
            {/* the classification badge beside the index, `< OVERWEIGHT >`
                (help-site 302837; the 2026-09-20 capture is empty) */}
            {klass && (
              <span data-tutorial-id="host.mois.field.bmi-class" style={{ ...at(154.6, 5.9), padding: '1px 8px', background: 'var(--pb-yellow)' }}>
                {`< ${klass.toUpperCase()} >`}
              </span>
            )}
            {label(9.8, 'Ideal Weight Range (kgs):', 31.2)}
            {shown(147, 29.9, 59, ideal[0], 'center')}
            {label(218.4, 'to', 31.2)}
            {shown(237.6, 29.9, 58.5, ideal[1], 'center')}
          </>)}
          {section(28.5, <>{label(8.6, 'Classification')}{label(130.8, 'BMI (kg/m2)')}</>, true)}
          {classRow(under!, 54.5, 5.6)}
          {classRow(normal!, 24.2, 0)}
          {classRow(over!, 24.3, 0)}
          {classRow(obese!, 55.4, 7.8)}
          {section(28, label(9.8, 'Based on Health Canada Guidelines, 2004 & WHO'), true)}
          {section(29, <>
            {label(8.6, 'Measure Code:')}
            <PBInput style={{ ...at(88.1, 6.4, 58.5), background: '#fff' }} defaultValue={code} />
          </>, true, true)}
        </div>

        {/* Populate pulls the chart's last height and weight in; Save (F2)
            is what files the index as a measure row (nothing to file until
            there is an index — INFERRED, the capture shows it enabled) */}
        <PBButton style={{ ...at(11.9, 395.2, 92.7, 20.6), minWidth: 0 }} command="populate" onClick={populate}>
          Populate (Ctrl+P)
        </PBButton>
        <PBButton
          style={{ ...at(131.6, 395.2, 92.7, 20.6), minWidth: 0 }}
          command="calculator-save"
          onClick={() => { if (bmi) onSave({ code, name: 'BODY MASS INDEX', value: Number(bmi).toFixed(1), flag: '-', units: '', fresh: true }) }}
        >
          Save (F2)
        </PBButton>
        <PBButton style={{ ...at(235.4, 395.2, 92.7, 20.6), minWidth: 0 }} onClick={onClose}>Cancel</PBButton>
        <PBButton style={{ ...at(354.2, 395.2, 92.7, 20.6), minWidth: 0 }} onClick={() => { setCms(''); setKgs('') }}>Clear (F5)</PBButton>
      </div>
    </ModalWindow>
  )
}

/** The template `Template` opens: the site default, `ENCOUNTER WINDOW`. */
export const defaultMeasureTemplate = { name: 'ENCOUNTER WINDOW', slots: encounterWindowMeasures }
