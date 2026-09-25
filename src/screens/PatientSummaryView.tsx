import { useMemo, useState } from 'react'
import { useChartExport } from '../data/chart-records'
import { genderRows, insuranceCarrierRows, serviceProviderRows } from '../data/mois'
import { usePatient } from '../data/patient-context'
import {
  SUMMARY_DEFAULT_ACCENT, SUMMARY_LINK_NODES, SUMMARY_SELECTED_ROW, headerIdentity, sectionCaption, summarySections, type SummaryRow,
} from '../data/summary'
import {
  PBButton, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBInput, PBLookup, PBViewHeader,
  type PBColumn, type PBCommand,
} from '../pb'
import { AdvancedGenderDialog } from './AdvancedGenderDialog'
import { nameInRed } from './DemographicsView'

/* ============================================================================
   Patient Summary — the window MOIS lands on when a chart is opened.

   Three bands: the chart-identification block (which is both how the open
   chart is displayed and how another one is found), the day-window links, and
   the summary DataWindow, whose rows are grouped into coloured section bands.

   PROVENANCE: transcribed from `reference/patient-summary-empty.png` (no
   chart loaded) and `reference/patient-summary-loaded.png` (chart 3424).
   ========================================================================= */

type Row = SummaryRow & { section: string }

export function PatientSummaryView({ onLookup, onStepChart, onOpenChart, onOpenSection }: {
  /** opens the Advanced Lookup Service — the "…", and Search */
  onLookup: () => void
  onStepChart: (delta: 1 | -1) => void
  /** a chart number typed into Chart No. and committed with Enter */
  onOpenChart: (chart: string) => void
  /** Navigate within the current chart through the shell's normal routing. */
  onOpenSection: (node: typeof SUMMARY_LINK_NODES[keyof typeof SUMMARY_LINK_NODES], recordId?: string) => void
}) {
  const patient = usePatient()
  const data = useChartExport()
  const [typed, setTyped] = useState(patient.chart)
  const [lastDays, setLastDays] = useState('60')
  const [requiredDays, setRequiredDays] = useState('90')
  const [genderOpen, setGenderOpen] = useState(false)
  /* MOIS opens the summary with every section collapsed but the first; the
     frame remounts this window per chart, so the state starts over there */
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(summarySections(patient, data, lastDays).filter((s) => !s.open).map((s) => s.id)),
  )

  const { rows, captions, accents, order, counts } = useMemo(() => {
    const sections = summarySections(patient, data, lastDays)
    const rows: Row[] = []
    const captions = new Map<string, string>()
    const accents = new Map<string, string>()
    const counts = new Map<string, number>()
    /* every band the window paints, in order: a section whose rows were not
       captured is still a band and a count in MOIS */
    const order = sections.map((s) => s.id)
    for (const s of sections) {
      const caption = sectionCaption(s, lastDays, requiredDays)
      captions.set(s.id, caption)
      if (s.accent) accents.set(s.id, s.accent)
      if (s.count !== undefined) counts.set(s.id, s.count)
      for (const r of s.rows) rows.push({ ...r, section: s.id })
    }
    return { rows, captions, accents, order, counts }
  }, [lastDays, patient, requiredDays, data])

  const commands: PBCommand[] = [
    { label: 'New Chart' },
    { label: 'Delete Chart' },
    { label: 'Save' },
    { label: 'Undo' },
    { label: 'Refresh' },
    /* Search opens Advance Chart Search (art. 301562) — the frame raises it
       on the kit's `search` command, not the Patient Chart List */
    { label: 'Search' },
    { label: 'Previous Chart', onClick: () => onStepChart(-1) },
    { label: 'Next Chart', onClick: () => onStepChart(1) },
    { label: 'Tear Off' },
  ]

  /* Painted widths. The two 1000px captures put the four captions at 199 /
     269 / 613.5 / 900.5 and `patient-summary-loaded.png` — a window 1321px
     wider in the grid — puts them at 199 / 270 / 617 / 906. The columns do
     not move with the window, so they are painted pixels, not proportions:

         Date 0..70 | Description 70..415 | Detail 415..702 | Hyperlink 702..808

     A wider window leaves everything past Hyperlink as empty band, which is
     what `_pad` carries while the coloured bands still run the full width. */
  const columns: PBColumn<Row>[] = [
    { key: 'date', header: 'Date', width: 70, align: 'left' },
    { key: 'description', header: 'Description', width: 345, render: (r) => <>
      {r.description}
      {r.instructionComment && <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>Instruction Comment:<br />{r.instructionComment}</div>}
    </> },
    /* Detail's caption is left-aligned on its own data, not centred */
    { key: 'detail', header: 'Detail', width: 287, align: 'left' },
    {
      /* The caption is left-aligned in the column like every other one; the
         glyph is centred in it. Measured in `patient-summary-3598.png`: the
         caption's ink runs 900.5..951.5 and every glyph 937.5..949.5, so the
         glyph ends where the caption ends — which is what a centred glyph in
         a 109px column comes to, not an alignment of its own. */
      key: 'link', header: 'Hyperlink', width: 109, align: 'center', headAlign: 'left',
      /* the jump into the module that owns the row: MOIS's own glyph and
         nothing else, the way a form's LinkToMois button shows it. The module
         name is the tooltip and the accessible name, not printed text. */
      render: (r) => (r.link
        ? (
          <button
            type="button"
            className="pb-link pb-link--mois"
            title={`Open ${r.link} in MOIS`}
            aria-label={`Open ${r.link} in MOIS`}
            onClick={() => { if (r.link) onOpenSection(SUMMARY_LINK_NODES[r.link], r.recordId) }}
          />
        )
        : null),
    },
    { key: '_pad', header: '' },
  ]

  return (
    <>
      <PBViewHeader
        title="Patient Summary"
        /* `.pb-viewhead__chart` carries the 13px the capture measures and the
           gap before `Chart NNNN`; the screen used to inline its own span and
           lost both. Ink-to-ink the gap is 14px and the number ends 7px from
           the window edge. */
        right={patient.chart ? (
          <span className="pb-viewhead__chart">
            {headerIdentity(patient)}
            <span className="pb-viewhead__chartno">Chart {patient.chart}</span>
          </span>
        ) : undefined}
      />
      <PBCommandRow commands={commands} />

      {/* ---- chart identification ----
           Widths are the field borders detected in `patient-summary-loaded.png`
           and `patient-summary-empty.png`, halved. Those two captures are of
           different sessions at the same window size and give byte-identical
           box positions, which is what makes them the authority here:
           `patient-summary-header.png` is the same screen at another zoom, and
           reading it as 1.5x inflates every width by 4/3.

           Relative to this block's content edge: the label column is 79 wide,
           the chart fields end at 361, and the insurance column runs 457..772.
           The controls stop there; the blue gradient behind them does not — it
           runs on to the window edge, so this block stays full width and its
           rows simply do not grow. */}
      <div className="pb-chartfilter">
        <div className="pb-chartfilter__row">
          <span className="pb-chartfilter__label">Chart No.:</span>
          {/* typing a chart number and pressing Enter loads it, as MOIS does */}
          <span data-tutorial-id="host.mois.field.chart-no" style={{ display: 'inline-flex' }}>
            <PBLookup
              w={113}
              value={typed}
              name="chart"
              onChange={setTyped}
              onEnter={(v) => onOpenChart(v.trim())}
              onDots={onLookup}
            />
          </span>
          <Gap to={231} from={192} label="Status:" />
          {/* the status letter sits in a plain outline on the window gradient,
              not in a white edit field — see the capture at x=317 */}
          <span className="pb-chartfilter__status">{patient.status}</span>
          <Gap to={296} from={263} label="Date:" />
          <PBInput w={65} align="center" value={patient.registered ?? ''} readOnly />
          <Gap to={457} from={361} label="Insurance By:" />
          <PBDropDownDataWindow
            w={66}
            value={patient.insuranceBy ?? ''}
            display="code"
            columns={[{ key: 'code', header: 'Code', width: 52 }, { key: 'insurer', header: 'Description' }]}
            rows={insuranceCarrierRows}
          />
          <Gap to={634} from={523} label="Service Provider:" />
          <PBDropDownDataWindow
            w={138}
            value={patient.provider ?? ''}
            display="provider"
            columns={[{ key: 'provider', header: 'Service Provider' }, { key: 'type', header: 'Type', width: 56 }]}
            rows={serviceProviderRows}
          />
        </div>

        <div className="pb-chartfilter__row">
          <span className="pb-chartfilter__label">Name (F/M/L):</span>
          {/* art. 301149: an IA or DE chart's name is red here too */}
          <PBInput w={95} value={patient.first} readOnly style={nameInRed(patient.status) ? { color: '#d00000' } : undefined} />
          <span style={{ width: 2 }} />
          <PBInput w={88} value={patient.middle} readOnly style={nameInRed(patient.status) ? { color: '#d00000' } : undefined} />
          <span style={{ width: 2 }} />
          <PBInput w={95} value={patient.last} readOnly style={nameInRed(patient.status) ? { color: '#d00000' } : undefined} />
          <Gap to={457} from={361} label="Insurance No.:" />
          <PBInput w={88} value={patient.insurance ?? ''} readOnly />
          <Gap to={579} from={545} label="Dep:" />
          <PBInput w={35} value={patient.dep ?? ''} readOnly />
        </div>

        <div className="pb-chartfilter__row">
          <span className="pb-chartfilter__label">Birth Date:</span>
          <PBInput w={95} align="center" value={patient.dob} readOnly />
          {/* MOIS paints the caption of a flagged control yellow and says
              what the flag means in a tip on hover */}
          {/* The caption is yellow on every chart captured so far — 3424, 3598
              and 3924 alike — so it is the Data Audit Service's flag on a
              registered field (`reference/field-audit.md` lists Gender), not
              something one chart earns. */}
          {/* …though not with no chart loaded, where it is a plain caption */}
          {patient.chart
            ? <Gap to={266} from={174} label="Gender:" flagged tip="This patient has multiple gender designations" />
            : <Gap to={266} from={174} label="Gender:" />}
          <PBDropDownDataWindow
            w={74}
            value={patient.gender}
            display="code"
            columns={[{ key: 'code', header: 'Code', width: 46 }, { key: 'gender', header: 'Gender' }]}
            rows={genderRows}
          />
          <span style={{ width: 3 }} />
          {/* the `.*.` beside Gender opens Advanced Gender Designations */}
          <PBButton
            size="sm"
            style={{ minWidth: 18, padding: 0 }}
            title="Advanced Gender Designations"
            data-tutorial-id="host.mois.command.gender-designations"
            onClick={() => setGenderOpen(true)}
          >
            .*.
          </PBButton>
          <Gap to={457} from={361} label="BC Health No.:" />
          <PBInput w={88} value={patient.bchn ?? ''} readOnly />
        </div>
      </div>

      {/* ---- expand / collapse + the two day windows ---- */}
      {/* Painted x, measured off `reference/patient-summary-3598.png` and
          given here as the gap before each control, the way the chart block
          above carries its own tab stops. The two links land on the Date and
          Description column origins (197.5 and 268); the day-window cluster
          to their right lands on nothing in particular, which is why it can
          only be transcribed, not derived. */}
      <div className="pb-summarybar">
        <button className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
        <BarGap w={21} />
        <button className="pb-link" onClick={() => setCollapsed(new Set(captions.keys()))}>Collapse All</button>
        {/* every label sits in a run that ends where the capture ends it, so a
            wider or narrower face moves the text, never the controls */}
        <BarGap w={278} label="In the last" />
        <BarGap w={5} />
        <PBInput w={42} align="center" value={lastDays} onChange={(e) => setLastDays(e.target.value)} />
        <BarGap w={29} label="days" />
        <BarGap w={7} />
        <PBButton size="sm" style={{ width: 67 }}>Since Last</PBButton>
        <BarGap w={126} label="Required in the next" />
        <BarGap w={5} />
        <PBInput w={42} align="center" value={requiredDays} onChange={(e) => setRequiredDays(e.target.value)} />
        <BarGap w={27} label="days" />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          /* the Detail column runs to a second line rather than being cut */
          wrap
          /* the painter sets this grid's text 8px into each column, where a
             lookup grid sets its own 3-4px in */
          style={{ ['--pb-dw-pad-x' as string]: '8px', ['--pb-dw-select' as string]: SUMMARY_SELECTED_ROW }}
          head="grey"
          /* MOIS's summary grid has no gutter and no hairlines: the bands run
             edge to edge and the rows are separated by banding alone */
          gutter={false}
          rules={false}
          columns={columns}
          rows={rows}
          groupBy={(r) => r.section}
          groups={order}
          groupLabel={(id, inGroup) => `${captions.get(id) ?? id}  [${counts.get(id) ?? inGroup.length}]`}
          groupAccent={(id) => accents.get(id) ?? SUMMARY_DEFAULT_ACCENT}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          empty="No summary sections configured for this chart."
        />
      </div>

      {genderOpen && <AdvancedGenderDialog onClose={() => setGenderOpen(false)} />}
    </>
  )
}

/** A painted run of face in the summary bar, with its label against the end. */
const BarGap = ({ w, label }: { w: number; label?: string }) => (
  <span className="pb-summarybar__gap" style={{ width: w }}>{label}</span>
)

/**
 * The run of window face between one control and the next, carrying the next
 * control's label right-aligned against it. Keeping the painted x offsets in
 * the markup is what stops the row drifting as label text changes length.
 */
function Gap({ from, to, label, flagged, tip }: {
  from: number
  to: number
  label: string
  /** paint the caption yellow — the flag itself, not the face it sits on */
  flagged?: boolean
  /** the Win10 tip that says what the flag means */
  tip?: string
}) {
  const classes = ['pb-chartfilter__gap']
  if (tip) classes.push('pb-chartfilter__gap--tip')
  const caption: string[] = []
  if (flagged) caption.push('pb-form__label--flagged')
  if (tip) caption.push('pb-tip')
  return (
    <span className={classes.join(' ')} style={{ width: to - from }}>
      {flagged || tip ? <span className={caption.join(' ')} data-tip={tip}>{label}</span> : label}
    </span>
  )
}
