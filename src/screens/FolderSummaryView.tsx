import { useMemo, useState, type ReactNode } from 'react'
import { useAllergySession, setNoKnown, storedItems } from '../data/allergySession'
import { recordsForNode, useChartExport } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { SESSION_USER } from '../data/chartSession'
import { toDots } from '../data/clock'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { SUMMARY_DEFAULT_ACCENT, SUMMARY_SELECTED_ROW } from '../data/summary'
import { useScreenReport } from '../host/screen-state'
import { PBCommandRow, PBDataWindow, PBPatientBand, PBViewHeader, type PBColumn, type PBCommand } from '../pb'
import { LAYER, ModalWindow } from './dialogKit'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'
import { ChartIdentityStrip } from './patientKit'
import { applyQuickEntry, type QuickEntryApplied } from './quickEntryApply'

/* ============================================================================
   The folder summaries: what a parent tree node opens.

   PROVENANCE: 2026-09-29 TRAINING captures c03, c32 and c33 (v02.31.23,
   chart 2429, 2x — every number below is the capture's pixels halved).
   - c03, `Allergy / Intolerances`: Refresh · Tear Off · Quick Entry · No
     Known · Review at the kit's 80.5px; the identity strip with no Search
     For; an `Expand All` / `Collapse All` link row (20px, the links 5.5px
     and 76px in); the summary DataWindow's grey bold captions Date ·
     Description · Detail · Hyperlink (column pitches 71 · 347 · 289, text
     8px into each) over a 20px pale-blue gradient band `REACTION RISKS  [2]`
     and one 20px row per risk — date, agent, reactions, and the MOIS
     hyperlink glyph (its right edge on the caption's). Rows run oldest
     first (2026.02.02 AVOCADOS, then 2026.04.27 ASPARAGUS).
   - c32, `Health Issues`: the same window with Refresh · Tear Off only and
     the band `HEALTH ISSUES  [1]`; Detail reads `Certainty: Confirmed -
     Severity: Mild`.
   - c33, Tear Off: a top-level `Summary` window (827.5 × 695 with its frame)
     with the blue patient band — CHART NO. · PATIENT (F/M/L) · DATE OF BIRTH
     (with the age) · GENDER · BC HEALTH NO. — over the same link row and
     grouped list.

   Rows are the open chart's records (the allergy / health_issue export
   groups, plus reaction risks filed this session); a chart with no export
   paints the band and `[0]`, the way MOIS paints an empty section.

   INFERRED: what No Known does with risks on file (nothing here), the order
   of health issues (oldest first, as c03 orders risks), the Detail of a
   health issue with no certainty or severity (blank), Tear Off's window
   position (centred on the frame, where c33 puts it within 3px).
   ========================================================================= */

type SummaryRow = { date: string; description: string; detail: string; group: string; sortKey: string }

type FolderSpec = {
  title: string
  band: string
  /** the tree node the hyperlink glyph opens */
  target: string
  commands: string[]
  rows: (records: MoisRecord[]) => SummaryRow[]
}

const SPECS: Record<string, FolderSpec> = {
  allergy: {
    title: 'Allergy / Intolerances',
    band: 'REACTION RISKS',
    target: 'reaction',
    commands: ['Refresh', 'Tear Off', 'Quick Entry', 'No Known', 'Review'],
    rows: (records) => records.map((r) => ({
      date: toDots(r.dtm_start), sortKey: r.dtm_start ?? '',
      description: r.str_substance ?? '',
      detail: r.str_reactions ?? r.str_reaction ?? '',
      group: 'REACTION RISKS',
    })),
  },
  issues: {
    title: 'Health Issues',
    band: 'HEALTH ISSUES',
    target: 'conditions',
    commands: ['Refresh', 'Tear Off'],
    rows: (records) => records.map((r) => ({
      date: toDots(r.dtm_start), sortKey: r.dtm_start ?? '',
      description: r.str_problem_name ?? '',
      /* `str_certainity` — the typo is the MOIS column name */
      detail: [r.str_certainity && `Certainty: ${r.str_certainity}`, r.str_severity && `Severity: ${r.str_severity}`].filter(Boolean).join(' - '),
      group: 'HEALTH ISSUES',
    })),
  },
}

function useSummaryRows(node: string, spec: FolderSpec): SummaryRow[] {
  const data = useChartExport()
  const { chart } = usePatient()
  const allergy = useAllergySession(chart)
  return useMemo(() => {
    const exported = recordsForNode(data, node)
    /* reaction risks filed this session sit beside the export's */
    const stored = node === 'allergy' ? storedItems('allergy', allergy).map((x) => x.record) : []
    return spec.rows([...stored, ...exported]).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [data, node, spec, allergy])
}

function SummaryGrid({ spec, rows, collapsed, setCollapsed, onLink }: {
  spec: FolderSpec
  rows: SummaryRow[]
  collapsed: Set<string>
  setCollapsed: (next: Set<string>) => void
  onLink: () => void
}) {
  const columns: PBColumn<SummaryRow>[] = [
    { key: 'date', header: 'Date', width: 71, align: 'left' },
    { key: 'description', header: 'Description', width: 347 },
    { key: 'detail', header: 'Detail', width: 289, align: 'left' },
    {
      key: 'link', header: 'Hyperlink', width: 85, align: 'center', headAlign: 'left',
      render: () => (
        <button type="button" className="pb-link pb-link--mois" title={`Open ${spec.title} in MOIS`}
          aria-label={`Open ${spec.title} in MOIS`} onClick={onLink} />
      ),
    },
    { key: '_pad', header: '' },
  ]
  return (
    <>
      <div className="pb-row" style={{ height: 20, padding: '0 0 0 5.5px', gap: 0, flex: 'none', borderBottom: '1px solid #a0a0a0' }}>
        <span style={{ width: 70.5, flex: 'none' }}>
          <button className="pb-link" data-tutorial-id="host.mois.command.expand-all" onClick={() => setCollapsed(new Set())}>Expand All</button>
        </span>
        <button className="pb-link" data-tutorial-id="host.mois.command.collapse-all" onClick={() => setCollapsed(new Set([spec.band]))}>Collapse All</button>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush wrap head="grey" gutter={false} rules={false}
          style={{ ['--pb-dw-pad-x' as string]: '8px', ['--pb-dw-select' as string]: SUMMARY_SELECTED_ROW }}
          columns={columns}
          rows={rows}
          groups={[spec.band]}
          groupBy={(r) => r.group}
          /* c03: the count sits 11.5px after the caption */
          groupLabel={(g, inGroup) => <>{g}<span style={{ marginLeft: 11.5 }}>[{inGroup.length}]</span></>}
          groupAccent={() => SUMMARY_DEFAULT_ACCENT}
          groupTutorialId={(g) => `host.mois.group.summary-${g.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          empty={false}
        />
      </div>
    </>
  )
}

export function FolderSummaryView({ node, openNode, open }: FolderViewProps) {
  const spec = SPECS[node]!
  const patient = usePatient()
  const rows = useSummaryRows(node, spec)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [torn, setTorn] = useState(false)
  const [tornCollapsed, setTornCollapsed] = useState<Set<string>>(() => new Set())
  useScreenReport({ rows: rows.length })

  const commands: PBCommand[] = spec.commands.map((label) => ({
    label,
    onClick: label === 'Refresh' ? () => setCollapsed(new Set())
      : label === 'Tear Off' ? () => setTorn(true)
      /* art. 3071982: the Quick Entry - Reaction Risks window files a risk */
      : label === 'Quick Entry' ? () => { open('quick-entry-chart', { group: 'Reaction Risk', onApply: (a: QuickEntryApplied) => applyQuickEntry(a) }) }
      : label === 'No Known' ? () => { if (!rows.length) setNoKnown(patient.chart, 'reaction', SESSION_USER) }
      /* Review: the frame opens the Reviewing window on this command */
      : undefined,
  }))

  return (
    <>
      <PBViewHeader title={spec.title} right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={commands} />
      <ChartIdentityStrip />
      <SummaryGrid spec={spec} rows={rows} collapsed={collapsed} setCollapsed={setCollapsed} onLink={() => openNode(spec.target)} />
      {torn && (
        <ModalWindow id="summary-tear-off" title="Summary" onClose={() => setTorn(false)} controls child={false}
          portal="inline" report zIndex={LAYER.stage}
          windowStyle={{ width: 'min(827.5px, calc(100% - 8px))', height: 'min(695px, calc(100% - 8px))' }}>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <TearOffBand />
            <SummaryGrid spec={spec} rows={rows} collapsed={tornCollapsed} setCollapsed={setTornCollapsed}
              onLink={() => { setTorn(false); openNode(spec.target) }} />
          </div>
        </ModalWindow>
      )}
    </>
  )
}

/* c33's band: 38px, #005598 → #52b7e9, captions at 2 · 87 · 332.5 · 560.5 ·
   622 from the client edge, GENDER's value centred under its caption */
function TearOffBand() {
  const p = usePatient()
  const gap = (children: ReactNode) => <span style={{ marginLeft: 10 }}>{children}</span>
  return (
    <PBPatientBand layout="stack" className="pb-row" anchor="host.mois.field.summary-patient-band"
      style={{ background: 'linear-gradient(#005598, #52b7e9)', color: '#fff', height: 38, padding: '3px 2px 0', gap: 0, flex: 'none', alignItems: 'flex-start' }}
      cells={[
        { label: 'CHART NO.', value: p.chart, w: 85 },
        { label: 'PATIENT (F/M/L)', value: <>{p.first.toUpperCase()}<span style={{ marginLeft: 8 }}>{p.last.toUpperCase()}</span></>, w: 245.5 },
        { label: 'DATE OF BIRTH', value: <>{p.dob}{gap(p.age.toUpperCase())}</>, w: 228 },
        { label: 'GENDER', value: <span style={{ display: 'inline-block', width: 40, textAlign: 'center' }}>{p.sex}</span>, w: 61.5 },
        { label: 'BC HEALTH NO.', value: p.bchn ?? '' },
      ]} />
  )
}

registerFolderView(Object.keys(SPECS), FolderSummaryView)
