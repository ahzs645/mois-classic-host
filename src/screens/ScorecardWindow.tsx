import { Fragment, useState, type CSSProperties } from 'react'
import { useScreenReport } from '../host/screen-state'
import {
  SCORECARD_METRICS, loadReportNavigator, pct, scorecardByProvider, scorecardNavigatorRows, type ScorecardMetric,
} from '../data/reportParams'
import { PBCheckbox, PBInput, PBRadio, PBSelect, pbSlug, usePBInstrumentation } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Clinical Value Scorecard — Reports ▸ Clinical - Audits ▸ Scorecard -
   Clinical Value.

   PROVENANCE
   · 304048 `62706421` — the window as it opens: Select Provider [▼]
     ☐ Unassigned Patients Only · Look Back [3] [Year(s) ▼] · View by
     (•) Metric ( ) Provider · Retrieve; Status Code(s) [A][…] (comma
     separated) · Scorecard Target [CVM LEVEL 3 - MAR 2014 ▼] · Help?;
     Expand All / Collapse All; the PROVIDER · NUMERATOR · DENOMINATOR ·
     PERCENTAGE · TARGET · INVESTIGATE header over an empty grid; Previous
     Scorecard... / Compare Results... bottom-left, Save / Print bottom-right.
   · 304028 `4c1bc34f` — after Retrieve: one blue band per metric (M01
     PATIENT INFORMATION … M14 ENCOUNTER NOTES, with XX90 between M09 and
     M10a), its totals bold, its target grey italic, a yellow dot where the
     target is not met (304048: "The yellow dot beside the target indicates
     that the target has not yet been met"); an expanded metric lists its
     providers, each with a green and a red Investigate button.
   · 304029 `ce48c6e6` — M03 expanded to its providers, UNASSIGNED last.
   · 304023 `6f6f1a20` — the Meaningful Use: Objective Data Scorecard, the
     older sibling, labels the same button Refresh.

   Behaviour: Retrieve fills the grid (the numbers are synthetic, from
   data/reportParams); a band's +/- expands it; green loads the patients who
   meet the metric, red the ones who do not, into the Chart Navigator
   ("FAILED: M01 - PATIENT INFORMATION", 304023 `2cb8c9cb`) and opens it over
   the scorecard, which stays open for the Refresh the article ends on.

   Reports `host.screen.retrieved`, `expanded` (the metric codes open, e.g.
   `m01`) and `investigate` (`red-m01`). Anchors: `host.mois.command.
   scorecard-retrieve`, `host.mois.group.scorecard-<code>`, and the buttons
   `host.mois.command.scorecard-green-<code>` / `…-red-<code>` on the
   metric's first provider row.
   ========================================================================= */

const BAND = 'linear-gradient(#ffffff 0%, #d6ecfb 45%, #9fd2f5 100%)'
const COLS = '1fr 90px 100px 100px 90px 90px'

function below(m: { num: number; den: number }, target: string) {
  const t = Number.parseFloat(target)
  if (Number.isNaN(t) || !m.den) return false
  return (m.num / m.den) * 100 < t
}

function ScorecardWindow({ close, open }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const [retrieved, setRetrieved] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [investigate, setInvestigate] = useState('')
  const [viewBy, setViewBy] = useState<'metric' | 'provider'>('metric')
  useScreenReport({
    retrieved,
    expanded: [...expanded].map((c) => c.toLowerCase()).join(','),
    investigate,
  })

  const toggle = (code: string) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(code) ? next.delete(code) : next.add(code)
    return next
  })

  const press = (m: ScorecardMetric, passed: boolean) => {
    const id = `scorecard-${passed ? 'green' : 'red'}-${m.code.toLowerCase()}`
    host?.report('command', { command: id })
    setInvestigate(`${passed ? 'green' : 'red'}-${m.code.toLowerCase()}`)
    loadReportNavigator(scorecardNavigatorRows(m, passed))
    open('chart-navigator')
  }

  const investigateButton = (m: ScorecardMetric, passed: boolean, anchored: boolean) => (
    <button
      type="button"
      title={passed ? 'Patients who meet this metric' : 'Patients missing this metric'}
      data-tutorial-id={anchored ? `host.mois.command.scorecard-${passed ? 'green' : 'red'}-${m.code.toLowerCase()}` : undefined}
      onClick={() => press(m, passed)}
      style={{
        width: 20, height: 16, borderRadius: 5, padding: 0, cursor: 'pointer',
        border: `1px solid ${passed ? '#38a838' : '#c84848'}`,
        background: passed ? 'linear-gradient(#b8f8a8, #78e060)' : 'linear-gradient(#ffc0c0, #f08080)',
      }}
    />
  )

  const cell = (v: string | number, extra?: CSSProperties) => (
    <span style={{ textAlign: 'right', paddingRight: 8, ...extra }}>{v}</span>
  )

  return (
    <WorkspaceDialogFrame id="clinical-value-scorecard" title="Clinical Value Scorecard" width={934} height={700} zIndex={79} onClose={close}>
      {/* ---- parameters ---------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 300px 1fr 86px', rowGap: 4, padding: '8px 8px 6px', borderBottom: '1px solid #a0a0a0', flex: 'none', alignItems: 'center' }}>
        <span className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label" style={{ width: 80 }}>Select Provider:</span>
          <PBSelect w={154} options={['', 'BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'FAIRCHILD, NESRIN L', 'HOWSER, DOOGIE']} />
          <PBCheckbox label="Unassigned Patients Only" />
        </span>
        <span className="pb-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <span className="pb-form__label">Look Back:</span>
          <PBInput w={40} align="center" defaultValue="3" />
          <PBSelect w={72} options={['Year(s)', 'Month(s)']} />
        </span>
        <span className="pb-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <span className="pb-form__label">View by:</span>
          <PBRadio name="scorecard-view" label="Metric" checked={viewBy === 'metric'} onChange={() => setViewBy('metric')} />
        </span>
        <DialogButton id="scorecard-retrieve" width={78} onClick={() => setRetrieved(true)}>Retrieve</DialogButton>
        <span className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label" style={{ width: 80 }}>Status Code(s):</span>
          <span className="pb-inputgroup" style={{ width: 154 }}>
            <input className="pb-field" defaultValue="A" />
            <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
          </span>
          <span>(comma separated)</span>
        </span>
        <span className="pb-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <span className="pb-form__label">Scorecard Target:</span>
          <PBSelect w={196} options={['CVM LEVEL 3 - MAR 2014']} />
        </span>
        <span className="pb-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <PBRadio name="scorecard-view" label="Provider" checked={viewBy === 'provider'} onChange={() => setViewBy('provider')} />
        </span>
        <button type="button" className="pb-link" style={{ justifySelf: 'end' }}>Help?</button>
      </div>
      <div className="pb-row" style={{ gap: 20, padding: '4px 8px', flex: 'none', borderBottom: '1px solid #c8c8c8' }}>
        <button type="button" className="pb-link" onClick={() => retrieved && setExpanded(new Set(SCORECARD_METRICS.map((m) => m.code)))}>Expand All</button>
        <button type="button" className="pb-link" onClick={() => setExpanded(new Set())}>Collapse All</button>
      </div>

      {/* ---- the grid ------------------------------------------------ */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, fontWeight: 700, padding: '4px 0', background: '#f0eef0', borderBottom: '1px solid #a0a0a0', flex: 'none' }}>
        <span style={{ paddingLeft: 36 }}>PROVIDER</span>
        {cell('NUMERATOR')}{cell('DENOMINATOR')}{cell('PERCENTAGE')}{cell('TARGET')}
        <span style={{ textAlign: 'center' }}>INVESTIGATE</span>
      </div>
      <div data-tutorial-id="host.mois.field.scorecard-grid" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', margin: '0 0 0 0' }}>
        {retrieved && SCORECARD_METRICS.map((m) => {
          const open_ = expanded.has(m.code)
          const miss = below(m, m.target)
          return (
            <Fragment key={m.code}>
              <div
                data-tutorial-id={`host.mois.group.scorecard-${pbSlug(m.code)}`}
                onClick={() => toggle(m.code)}
                style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', height: 26, background: BAND, borderBottom: '1px solid #7fb4de', fontWeight: 700, cursor: 'default' }}
              >
                <span className="pb-row" style={{ gap: 6, paddingLeft: 8 }}>
                  {/* the kit's +/- box, so `host.mois.openFolder` opens a metric
                      the way it opens a Report List folder */}
                  <button
                    type="button"
                    className="pb-expander pb-dw__groupbox"
                    data-state={open_ ? 'open' : 'shut'}
                    aria-expanded={open_}
                    aria-label={m.code}
                  />
                  {m.code} {m.name}
                </span>
                {cell(m.num)}{cell(m.den)}{cell(pct(m.num, m.den))}
                {cell(m.target, { fontStyle: 'italic', fontWeight: 400, color: '#808080' })}
                <span style={{ paddingLeft: 4 }}>
                  {miss && <span style={{ display: 'inline-block', width: 13, height: 13, borderRadius: '50%', background: '#ffee00', border: '1px solid #d8c800' }} />}
                </span>
              </div>
              {open_ && scorecardByProvider(m).map((p, i) => (
                <div
                  key={p.provider}
                  style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', height: 24, background: i % 2 ? '#fff' : '#efebef', borderBottom: '1px solid #f1f1f1' }}
                >
                  <span style={{ paddingLeft: 36 }}>{p.provider}</span>
                  {cell(p.num)}{cell(p.den)}
                  {cell(p.den ? pct(p.num, p.den) : '-', p.den ? undefined : { background: '#ffff80' })}
                  {cell(m.target, { fontStyle: 'italic', color: '#808080' })}
                  <span className="pb-row" style={{ gap: 10, justifyContent: 'center' }}>
                    {investigateButton(m, true, i === 0)}
                    {investigateButton(m, false, i === 0)}
                  </span>
                </div>
              ))}
            </Fragment>
          )
        })}
      </div>

      {/* ---- the foot ------------------------------------------------ */}
      <div className="pb-row" style={{ gap: 4, padding: '6px 6px', flex: 'none' }}>
        <DialogButton id="scorecard-previous" width={124}>Previous Scorecard...</DialogButton>
        <DialogButton id="scorecard-compare" width={120}>Compare Results...</DialogButton>
        <span style={{ flex: '1 1 auto' }} />
        <DialogButton id="scorecard-save" width={78}>Save</DialogButton>
        <DialogButton id="scorecard-print" width={78}>Print</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('clinical-value-scorecard', ScorecardWindow)
