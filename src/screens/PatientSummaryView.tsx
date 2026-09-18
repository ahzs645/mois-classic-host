import { useMemo, useState } from 'react'
import {
  PBButton, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBInput, PBLookup, PBViewHeader,
  type PBColumn, type PBCommand,
} from '../pb'
import { genderRows, insuranceCarrierRows, serviceProviderRows } from '../data/mois'
import { usePatient } from '../data/patient-context'
import {
  SUMMARY_DEFAULT_ACCENT, headerIdentity, sectionCaption, summarySections, type SummaryRow,
} from '../data/summary'

/* ============================================================================
   Patient Summary — the window MOIS lands on when a chart is opened.

   Three bands: the chart-identification block (which is both how the open
   chart is displayed and how another one is found), the day-window links, and
   the summary DataWindow, whose rows are grouped into coloured section bands.

   PROVENANCE: transcribed from `reference/patient-summary-empty.png` (no
   chart loaded) and `reference/patient-summary-loaded.png` (chart 3424).
   ========================================================================= */

type Row = SummaryRow & { section: string }

export function PatientSummaryView({ onLookup, onStepChart, onOpenChart }: {
  /** opens the Advanced Lookup Service — the "…", and Search */
  onLookup: () => void
  onStepChart: (delta: 1 | -1) => void
  /** a chart number typed into Chart No. and committed with Enter */
  onOpenChart: (chart: string) => void
}) {
  const patient = usePatient()
  const [typed, setTyped] = useState(patient.chart)
  const [lastDays, setLastDays] = useState('60')
  const [requiredDays, setRequiredDays] = useState('90')
  /* MOIS opens the summary with every section collapsed but the first; the
     frame remounts this window per chart, so the state starts over there */
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(summarySections(patient).filter((s) => !s.open).map((s) => s.id)),
  )

  const { rows, captions, accents } = useMemo(() => {
    const sections = summarySections(patient)
    const rows: Row[] = []
    const captions = new Map<string, string>()
    const accents = new Map<string, string>()
    for (const s of sections) {
      const caption = sectionCaption(s, lastDays, requiredDays)
      captions.set(s.id, caption)
      if (s.accent) accents.set(s.id, s.accent)
      for (const r of s.rows) rows.push({ ...r, section: s.id })
    }
    return { rows, captions, accents }
  }, [lastDays, patient, requiredDays])

  const commands: PBCommand[] = [
    { label: 'New Chart', width: 78 },
    { label: 'Delete Chart', width: 78 },
    { label: 'Save', width: 78 },
    { label: 'Undo', width: 78 },
    { label: 'Refresh', width: 78 },
    { label: 'Search', width: 78, onClick: onLookup },
    { label: 'Previous Chart', width: 78, onClick: () => onStepChart(-1) },
    { label: 'Next Chart', width: 78, onClick: () => onStepChart(1) },
    { label: 'Tear Off', width: 78 },
  ]

  /* Painted widths, measured off `reference/patient-summary-loaded.png`.
     The caption blocks sit at 9..54, 144..270, 846..909 and 1332..1440 of the
     grid; Date and Description are left-aligned in their columns and Detail
     and Hyperlink centred, and only one set of widths fits all four:

         Date 0..140 | Description 140..614 | Detail 614..1140 | Hyperlink 1140..1632

     `_pad` carries whatever the window has past 1632, so the columns keep
     those positions while the group bands still run the full width. */
  const columns: PBColumn<Row>[] = [
    { key: 'date', header: 'Date', width: 140, align: 'left' },
    { key: 'description', header: 'Description', width: 474 },
    { key: 'detail', header: 'Detail', width: 526, align: 'left', headAlign: 'center' },
    {
      key: 'link', header: 'Hyperlink', width: 492, align: 'center', headAlign: 'center',
      /* the jump into the module that owns the row: MOIS's own glyph and
         nothing else, the way a form's LinkToMois button shows it. The module
         name is the tooltip and the accessible name, not printed text. */
      render: (r) => (r.link
        ? (
          <button
            className="pb-link pb-link--mois"
            title={`Open ${r.link} in MOIS`}
            aria-label={`Open ${r.link} in MOIS`}
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
        right={
          <span style={{ fontWeight: 700, paddingRight: 6 }}>
            {headerIdentity(patient)}
            <span style={{ display: 'inline-block', width: 22 }} />
            Chart {patient.chart}
          </span>
        }
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
          <PBLookup
            w={113}
            value={typed}
            name="chart"
            onChange={setTyped}
            onEnter={(v) => onOpenChart(v.trim())}
            onDots={onLookup}
          />
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
            columns={[{ key: 'code', header: 'By', width: 52 }, { key: 'insurer', header: 'Insurer' }]}
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
          <PBInput w={95} value={patient.first} readOnly />
          <span style={{ width: 2 }} />
          <PBInput w={88} value={patient.middle} readOnly />
          <span style={{ width: 2 }} />
          <PBInput w={95} value={patient.last} readOnly />
          <Gap to={457} from={361} label="Insurance No.:" />
          <PBInput w={88} value={patient.insurance ?? ''} readOnly />
          <Gap to={579} from={545} label="Dep:" />
          <PBInput w={35} value={patient.dep ?? '00'} readOnly />
        </div>

        <div className="pb-chartfilter__row">
          <span className="pb-chartfilter__label">Birth Date:</span>
          <PBInput w={95} align="center" value={patient.dob} readOnly />
          {/* MOIS paints the label of a flagged control yellow */}
          <Gap to={266} from={174} label="Gender:" flagged />
          <PBDropDownDataWindow
            w={74}
            value={patient.gender}
            display="code"
            columns={[{ key: 'code', header: 'Code', width: 46 }, { key: 'gender', header: 'Gender' }]}
            rows={genderRows}
          />
          <span style={{ width: 3 }} />
          <PBButton size="sm" style={{ minWidth: 18, padding: 0 }}>.*.</PBButton>
          <Gap to={457} from={361} label="BC Health No.:" />
          <PBInput w={88} value={patient.bchn ?? ''} readOnly />
        </div>
      </div>

      {/* ---- expand / collapse + the two day windows ---- */}
      <div className="pb-summarybar">
        <button className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
        <span style={{ width: 16 }} />
        <button className="pb-link" onClick={() => setCollapsed(new Set(captions.keys()))}>Collapse All</button>
        <span className="pb-summarybar__spacer" />
        <span>In the last</span>
        <PBInput w={56} align="center" value={lastDays} onChange={(e) => setLastDays(e.target.value)} />
        <span>days</span>
        <PBButton size="sm">Since Last</PBButton>
        <span className="pb-summarybar__spacer" />
        <span>Required in the next</span>
        <PBInput w={56} align="center" value={requiredDays} onChange={(e) => setRequiredDays(e.target.value)} />
        <span>days</span>
        <span className="pb-summarybar__spacer" />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          head="grey"
          /* MOIS's summary grid has no gutter and no hairlines: the bands run
             edge to edge and the rows are separated by banding alone */
          gutter={false}
          rules={false}
          columns={columns}
          rows={rows}
          groupBy={(r) => r.section}
          groupLabel={(id, inGroup) => `${captions.get(id) ?? id}  [${inGroup.length}]`}
          groupAccent={(id) => accents.get(id) ?? SUMMARY_DEFAULT_ACCENT}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          empty="No summary sections configured for this chart."
        />
      </div>
    </>
  )
}

/**
 * The run of window face between one control and the next, carrying the next
 * control's label right-aligned against it. Keeping the painted x offsets in
 * the markup is what stops the row drifting as label text changes length.
 */
function Gap({ from, to, label, flagged }: { from: number; to: number; label: string; flagged?: boolean }) {
  return (
    <span
      className={flagged ? 'pb-chartfilter__gap pb-form__label--flagged' : 'pb-chartfilter__gap'}
      style={{ width: to - from }}
    >
      {label}
    </span>
  )
}
