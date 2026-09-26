import { useMemo, useState, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBCheckbox, PBDataWindow, PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   Health Issues — the picker the MOIS Viewer (Embedded) Find bar's "Patient
   Health Issues" opens.

   PROVENANCE: user capture 2026-09-25 #6 (v02.31.23). A window titled
   "Health Issues" with a close box only, about 1150 x 740, over the viewer.
   One blue patient band: CHART NO. · PATIENT (F/M/L) · DATE OF BIRTH (with
   the age, "66 YR OLD") · GENDER · PERSONAL HEALTH NO. (insured-by province,
   number, dependant) · PREFERRED PHONE NUMBER (the number, then its type in
   plain type — "Work Phone"). The grid: Start · End · Problem Name · Rank ·
   Certainty · Severity · S (a check box). The chart's current issues come
   first, by Problem Name; an ended issue (one with an End date) is listed
   after them in grey type. Select and Cancel, centred, under the grid.

   Rows come from the chart export's `health_issue` records — the same table
   Health Issues ▸ Conditions lists. What Select does with the pick is not
   captured; the viewer writes the problem name into the form field the
   cursor was last in (screens/MoisViewerWindow.tsx).

   Anchors: host.mois.dialog.health-issues; rows
   host.mois.row.health-issue-{n}; host.mois.command.{select, cancel}.
   Reported: host.dialog = health-issues, host.screen.healthIssueRows.
   ========================================================================= */

export type HealthIssuePick = {
  start: string; end: string; problem: string; rank: string
  certainty: string; severity: string; sensitive: boolean; ended: boolean
}

const d = (v?: string) => (v ?? '').replace(/\//g, '.').slice(0, 10)
const GREY = '#8c8c8c'

function Cmd({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => { host?.report('command', { command: pbSlug(label) }); onClick() }}
      style={{ minWidth: 86 }}
    >
      {label}
    </PBButton>
  )
}

function Cell({ label, children, w }: { label: string; children: ReactNode; w?: number }) {
  return (
    <div className="pb-banner-blue__cell" style={{ width: w, flex: w ? 'none' : '1 1 auto', minWidth: 0 }}>
      <span className="pb-banner-blue__label">{label}</span>
      <span className="pb-banner-blue__value">{children}</span>
    </div>
  )
}

export function HealthIssuesPicker({ onClose, onSelect }: { onClose: () => void; onSelect?: (issue: HealthIssuePick) => void }) {
  const p = usePatient()
  const records = useChartRecords('health_issue')
  const rows = useMemo<HealthIssuePick[]>(() => records
    .map((r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_resolve),
      problem: r.str_problem_name ?? '',
      rank: r.num_rank && r.num_rank !== '0' ? r.num_rank : '',
      /* `str_certainity` — the typo is the column name in MOIS */
      certainty: r.str_certainity ?? '',
      severity: r.str_severity ?? '',
      sensitive: r.str_sensitive === 'Y',
      ended: Boolean(r.dtm_resolve),
    }))
    .sort((a, b) => Number(a.ended) - Number(b.ended) || a.problem.localeCompare(b.problem)), [records])
  const [cur, setCur] = useState(0)
  useScreenReport({ dialog: 'health-issues', healthIssueRows: rows.length })

  const select = (i = cur) => {
    const picked = rows[i]
    if (picked && onSelect) onSelect(picked)
    else onClose()
  }
  const preferred = (p.preferredPhone ?? 'Home').replace(/\s*phone$/i, '')
  const phone = /^work/i.test(preferred) ? p.work : /^cell/i.test(preferred) ? p.cell : p.home
  const ink = (r: HealthIssuePick, text: ReactNode) => (r.ended ? <span style={{ color: GREY }}>{text}</span> : text)

  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
        <PBWindow
          child
          controls={false}
          title="Health Issues"
          onClose={onClose}
          tutorialId="host.mois.dialog.health-issues"
          style={{ width: 'min(1150px, calc(100% - 16px))', height: 'min(740px, calc(100% - 16px))' }}
        >
          <div className="pb-banner-blue">
            <div className="pb-banner-blue__top">
              <Cell label="CHART NO." w={98}>{p.chart}</Cell>
              <Cell label="PATIENT (F/M/L)" w={250}>{[p.first, p.middle, p.last].filter(Boolean).join(' ').toUpperCase()}</Cell>
              <Cell label="DATE OF BIRTH" w={264}>{p.dob}&nbsp;&nbsp;{p.age}</Cell>
              <Cell label="GENDER" w={72}>{p.sex}</Cell>
              <Cell label="PERSONAL HEALTH NO." w={162}>
                {[p.insuranceBy, p.bchn ?? p.insurance, p.dep].filter(Boolean).join('  ')}
              </Cell>
              <Cell label="PREFERRED PHONE NUMBER">
                {phone ?? ''}&nbsp;&nbsp;{phone && <span style={{ fontWeight: 400, fontSize: 11 }}>{preferred} Phone</span>}
              </Cell>
            </div>
          </div>

          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '2px 3px 0', background: 'var(--pb-face)' }}>
            <PBDataWindow
              columns={[
                { key: 'start', header: 'Start', width: 88, render: (r) => ink(r, r.start) },
                { key: 'end', header: 'End', width: 88, render: (r) => ink(r, r.end) },
                { key: 'problem', header: 'Problem Name', render: (r) => ink(r, r.problem) },
                { key: 'rank', header: 'Rank', width: 64, align: 'center', render: (r) => ink(r, r.rank) },
                { key: 'certainty', header: 'Certainty', width: 145, render: (r) => ink(r, r.certainty) },
                { key: 'severity', header: 'Severity', width: 165, render: (r) => ink(r, r.severity) },
                { key: 's', header: 'S', width: 40, align: 'center', render: (r) => <PBCheckbox checked={r.sensitive} /> },
              ]}
              rows={rows}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(_r, i) => { setCur(i); select(i) }}
              rowTutorialId={(_r, i) => `host.mois.row.health-issue-${i}`}
              empty="No health issues on file."
            />
          </div>

          <div className="pb-footer" style={{ justifyContent: 'center', gap: 14 }}>
            <Cmd label="Select" onClick={() => select()} disabled={!rows.length} />
            <Cmd label="Cancel" onClick={onClose} />
          </div>
        </PBWindow>
      </div>
    </DesktopLayer>
  )
}
