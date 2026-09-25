import { useMemo, useState } from 'react'
import {
  bmiClassification, calculatorMeasureCode, encounterWindowMeasures, measureCalculators,
  measureFlags, measureTemplates, type MeasureSlot, type MeasureTemplate,
} from '../data/measures'
import { useChartRecords } from '../data/chart-records'
import { useScreenReport } from '../host/screen-state'
import { BloodPressureFormWindow } from './BloodPressureFormWindow'
import { usePatient } from '../data/patient-context'
import {
  PBBand, PBButton, PBDataWindow, PBInput, PBLookup, PBSelect, PBTextArea, PBWindow, pbSlug,
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
  /* a blood pressure has a form behind its value: BLOOD PRESSURE MEASUREMENT */
  const hasForm = draft.code === '1950'
  const [bpForm, setBpForm] = useState(false)
  useScreenReport(bpForm ? { dialog: 'blood-pressure-form' } : {})

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.measurement-detail"
        title="Measurement Detail"
        onClose={onClose}
        style={{ width: 'min(620px, 100%)', height: 'min(438px, 100%)' }}
      >
        {/* the yellow identity strip: which record this measure belongs to */}
        <div
          style={{
            display: 'flex', gap: 18, flex: 'none', padding: '3px 8px',
            background: 'var(--pb-yellow)', borderBottom: '1px solid var(--pb-yellow-border)',
          }}
        >
          <span><strong>ENC #:</strong> {encounter}</span>
          <span><strong>CHART:</strong> {patient.chart}</span>
          <span><strong>FIRST:</strong> {patient.first}</span>
          <span><strong>LAST:</strong> {patient.last}</span>
        </div>

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
            <button
              type="button"
              className="pb-inputgroup__btn pb-inputgroup__btn--dots"
              disabled={!hasForm}
              data-tutorial-id="host.mois.command.measurement-value-form"
              onClick={() => setBpForm(true)}
            >
              …
            </button>
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
            data-tutorial-id="host.mois.command.measurement-ok"
            onClick={() => onOk(draft)}
          >
            Ok
          </PBButton>
        </div>
      </PBWindow>
      {bpForm && (
        <BloodPressureFormWindow
          initial={draft.value.includes('/') ? { systolic: draft.value.split('/')[0], diastolic: draft.value.split('/')[1] } : undefined}
          onSave={(r) => set({ value: `${r.systolic}/${r.diastolic}` })}
          onClose={() => setBpForm(false)}
        />
      )}
    </div>
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
   The measure template grid — `Template`, and what `Other Template` opens.

   One row per measure in the template, each with an empty Value box and a
   Flag drop-down. Nothing is a record until `Save Changes (F2)`, and MOIS
   files only the rows that were given a value.
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
  const at = (code: string) => values[code] ?? { value: '', flag: '' }
  const set = (code: string, patch: Partial<{ value: string; flag: string }>) => (
    setValues((v) => ({ ...v, [code]: { ...at(code), ...patch } }))
  )

  const save = () => onSave(slots
    .filter((s) => at(s.code).value.trim() !== '')
    .map((s) => ({ ...s, value: at(s.code).value, flag: at(s.code).flag || '-', fresh: true })))

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.measure-template"
        title={title}
        onClose={onClose}
        style={{ width: 'min(760px, 100%)', height: 'min(700px, 100%)' }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 8 }}>
          <PBDataWindow
            /* the template grid is a data-entry form, not a list: no current
               row, no zebra, and the header is the plain ruled one */
            gutter={false}
            zebra={false}
            head="grey"
            /* a data-entry grid has no current row: nothing is salmon until
               the user picks one, and MOIS never picks one here */
            current={-1}
            columns={[
              { key: 'code', header: 'Code', width: 72 },
              { key: 'name', header: 'Test Name', width: 300 },
              {
                key: 'value',
                header: 'Value',
                width: 180,
                render: (s) => (
                  <PBInput
                    w="100%"
                    value={at(s.code).value}
                    onChange={(e) => set(s.code, { value: e.target.value })}
                    data-tutorial-id={`host.mois.field.measure-${s.code}`}
                  />
                ),
              },
              {
                key: 'flag',
                header: 'Flag',
                width: 96,
                render: (s) => (
                  <PBSelect
                    w="100%"
                    options={measureFlags}
                    value={at(s.code).flag}
                    onChange={(e) => set(s.code, { flag: e.target.value })}
                  />
                ),
              },
              { key: 'units', header: 'Units', width: 90 },
            ]}
            rows={slots}
          />
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 18, padding: '6px 0 10px', flex: 'none' }}>
          <PBButton
            style={{ minWidth: 168 }}
            data-tutorial-id="host.mois.command.save-changes"
            onClick={save}
          >
            Save Changes (F2)
          </PBButton>
          <PBButton style={{ minWidth: 168 }} onClick={onClose}>Close w/o Save</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Measure Template / Panel Selection — `Other Template`.

   Templates and panels share one list: a TEMPLATE opens the measure grid, a
   PANEL is a scored instrument MOIS opens its own window for.
   ------------------------------------------------------------------------ */
export function MeasureTemplateSelectionDialog({ onOpen, onClose }: {
  onOpen: (template: MeasureTemplate) => void
  onClose: () => void
}) {
  const [cur, setCur] = useState(0)
  const row = measureTemplates[cur]
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.measure-template-selection"
        title="Measure Template / Panel Selection"
        onClose={onClose}
        style={{ width: 'min(1000px, 100%)', height: 'min(690px, 100%)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            <div className="pb-band--ruled"><PBBand>Template List</PBBand></div>
            <PBDataWindow
              flush
              style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={[
                { key: 'name', header: 'Name', width: 340, headAlign: 'center' },
                { key: 'description', header: 'Description', headAlign: 'center' },
                { key: 'type', header: 'Type', width: 120, headAlign: 'center' },
              ]}
              rows={measureTemplates}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(r) => onOpen(r)}
            />
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 18, padding: '2px 0 10px', flex: 'none' }}>
          <PBButton
            style={{ minWidth: 132 }}
            data-tutorial-id="host.mois.command.open-template"
            onClick={() => row && onOpen(row)}
          >
            Open
          </PBButton>
          <PBButton style={{ minWidth: 132 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Measure Calculators — the picker, then the calculator.
   ------------------------------------------------------------------------ */
export function MeasureCalculatorsDialog({ onOpen, onClose }: {
  onOpen: (calculator: string) => void
  onClose: () => void
}) {
  const [cur, setCur] = useState(0)
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.measure-calculators"
        title="Measure Calculators"
        onClose={onClose}
        style={{ width: 320, height: 300 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            <div className="pb-band--ruled"><PBBand>Select Calculator</PBBand></div>
            <PBDataWindow
              flush
              style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={[{ key: 'name', header: 'Calculator', headAlign: 'center' }]}
              rows={measureCalculators.map((name) => ({ name }))}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(r) => onOpen(String(r.name))}
              empty=""
            />
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 14, padding: '0 0 10px', flex: 'none' }}>
          <PBButton
            style={{ minWidth: 118 }}
            data-tutorial-id="host.mois.command.open-calculator"
            onClick={() => onOpen(measureCalculators[cur]!)}
          >
            Open (F2)
          </PBButton>
          <PBButton style={{ minWidth: 118 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* The BMI calculator, which is the one the training database opens on. It
   really calculates: MOIS converts as you type and `Populate` is what carries
   the result out to the measure grid. */
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
  const imperial = (value: number, per: number) => (value > 0 ? String(Math.floor(value / per)) : '-')
  const rule = { borderTop: '1px solid var(--pb-border)' }
  const code = calculatorMeasureCode[calculator] ?? ''

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 97 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.measure-calculator"
        title="Measure Calculator"
        onClose={onClose}
        style={{ width: 'min(560px, 100%)', height: 'min(660px, 100%)' }}
      >
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <div style={{ border: '1px solid var(--pb-border)', flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)' }}>
            {/* only the BMI calculator is transcribed (302837 `ff51e56c…`); the
                BSA, Cardiac Risk, Predicted PEF and Gestational Age windows are
                their own layouts in MOIS and are not built on this stage */}
            <PBBand>{calculator === 'BMI' ? 'BODY MASS INDEX (BMI) CALCULATOR' : `${calculator.toUpperCase()} CALCULATOR`}</PBBand>
            {calculator !== 'BMI' && (
              <div className="pb-dw__empty" style={{ padding: 16 }}>
                The {calculator} calculator is not built on this practice stage yet.
              </div>
            )}
            {calculator === 'BMI' && <>

            <div style={{ padding: '5px 8px' }}>
              <div className="pb-row" style={{ gap: 6, marginBottom: 4 }}>
                <span style={{ width: 96 }}>Height (cms):</span>
                <PBInput
                  w={122}
                  value={cms}
                  onChange={(e) => setCms(e.target.value)}
                  data-tutorial-id="host.mois.field.calculator-height"
                />
                <span style={{ marginLeft: 20 }}>(ft):</span>
                <PBInput w={72} align="center" value={imperial(Number(cms) / 30.48 || 0, 1)} readOnly />
                <span style={{ marginLeft: 12 }}>(in):</span>
                <PBInput w={72} align="center" value={imperial((Number(cms) / 2.54) % 12 || 0, 1)} readOnly />
              </div>
              <div className="pb-row" style={{ gap: 6 }}>
                <span style={{ width: 96 }}>Weight (kgs):</span>
                <PBInput
                  w={122}
                  value={kgs}
                  onChange={(e) => setKgs(e.target.value)}
                  data-tutorial-id="host.mois.field.calculator-weight"
                />
                <span style={{ marginLeft: 20 }}>(lb):</span>
                <PBInput w={72} align="center" value={imperial(Number(kgs) * 2.20462 || 0, 1)} readOnly />
                <span style={{ marginLeft: 12 }}>(oz):</span>
                <PBInput w={72} align="center" value={imperial((Number(kgs) * 35.274) % 16 || 0, 1)} readOnly />
              </div>
            </div>

            <div style={{ ...rule, padding: '5px 8px' }}>
              <div className="pb-row" style={{ gap: 6, marginBottom: 4 }}>
                <span style={{ width: 96 }}>BMI (kg/m2):</span>
                <PBInput w={122} align="center" value={bmi || '-'} readOnly />
                {/* the classification badge beside the index, `< OVERWEIGHT >` */}
                {klass && (
                  <span data-tutorial-id="host.mois.field.bmi-class" style={{ marginLeft: 8, padding: '1px 8px', background: 'var(--pb-yellow)' }}>
                    {`< ${klass.toUpperCase()} >`}
                  </span>
                )}
              </div>
              <div className="pb-row" style={{ gap: 6 }}>
                <span>Ideal Weight Range (kgs):</span>
                <PBInput w={132} align="center" value={ideal[0] || '-'} readOnly />
                <span>to</span>
                <PBInput w={132} align="center" value={ideal[1] || '-'} readOnly />
              </div>
            </div>

            <div style={{ ...rule, padding: '4px 8px', display: 'flex' }}>
              <span style={{ width: 132 }}>Classification</span>
              <span>BMI (kg/m2)</span>
            </div>
            {bmiClassification.map((c) => (
              /* the band the computed index falls in is painted yellow and bold */
              <div key={c.label} style={{ ...rule, padding: '4px 8px', display: 'flex', ...(klass && c.label.startsWith(klass) ? { background: 'var(--pb-yellow)', fontWeight: 700 } : {}) }}>
                <span style={{ width: 132 }}>{c.label}</span>
                <span style={{ width: 118 }}>{c.range}</span>
                <span>
                  {c.detail?.map(([name, range]) => (
                    <span key={name} style={{ display: 'flex', gap: 10 }}>
                      <span style={{ width: 132 }}>{name}</span>
                      <span>{range}</span>
                    </span>
                  ))}
                </span>
              </div>
            ))}
            <div style={{ ...rule, padding: '4px 8px' }}>Based on Health Canada Guidelines, 2004 &amp; WHO</div>
            <div style={{ ...rule, padding: '5px 8px' }} className="pb-row">
              <span>Measure Code:</span>
              <PBInput w={122} defaultValue={code} />
            </div>
            </>}
          </div>
        </div>

        <div className="pb-row" style={{ justifyContent: 'space-between', padding: '0 8px 10px', flex: 'none' }}>
          <PBButton
            style={{ minWidth: 132 }}
            /* Populate pulls the chart's last height and weight in; Save (F2)
               is what files the index as a measure row */
            data-tutorial-id="host.mois.command.populate"
            disabled={calculator !== 'BMI'}
            onClick={populate}
          >
            Populate (Ctrl+P)
          </PBButton>
          <PBButton
            style={{ minWidth: 132 }}
            data-tutorial-id="host.mois.command.calculator-save"
            disabled={!bmi}
            onClick={() => onSave({ code, name: 'BODY MASS INDEX', value: Number(bmi).toFixed(1), flag: '-', units: '', fresh: true })}
          >
            Save (F2)
          </PBButton>
          <PBButton style={{ minWidth: 132 }} onClick={onClose}>Cancel</PBButton>
          <PBButton style={{ minWidth: 132 }} onClick={() => { setCms(''); setKgs('') }}>Clear (F5)</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/** The template `Template` opens: the site default, `ENCOUNTER WINDOW`. */
export const defaultMeasureTemplate = { name: 'ENCOUNTER WINDOW', slots: encounterWindowMeasures }
