import { useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import { SESSION_USER } from '../data/chartSession'
import {
  DETERMINANT_LISTS, DETERMINANT_PANELS, DETERMINANT_TABS, recordObservations, setHistory, useDeterminants,
  type DeterminantTab, type HistoryList,
} from '../data/determinants'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_USER, useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBDataWindow, PBInput, PBSelect, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, FormBand, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Determinants of Health — the windows its tabs open (DeterminantsView.tsx).

     determinant-panel   Update: the domain's status panel — "Use the Update
                         button to select options from a panel for
                         Employment Status and Hours" (art. 2593946), each
                         observation a drop-down over its value set, under
                         one Collected date. Save Changes (F2) records them:
                         they become the tab's Most Recent Value and, being
                         observations ("MOIS will create an observation
                         record"), rows in Measures as well.
     determinant-trend   Trend: every value recorded for the domain's
                         observations, newest first.
     determinant-lookup  the "…" of Occupation, Educational Institution,
                         Level of Education and Field of Study: a pick list
                         that writes into the current history row.

   PROVENANCE: art. 2593946 text; the panels are the EMPLOYMENT / EDUCATION /
   HOUSING STATUS PANELs of Measure Template / Panel Selection
   (data/measures.ts).
   INFERRED: all three layouts — the article shows none of them. The panel
   window follows the measure template grid's idiom (MeasureDialogs.tsx:
   one row per measure, Save Changes (F2) / Close w/o Save).
   ========================================================================= */

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const tabOf = (v: unknown): DeterminantTab => (DETERMINANT_TABS.includes(v as DeterminantTab) ? v as DeterminantTab : 'Employment')

/* --- Update --------------------------------------------------------------- */
function DeterminantPanel({ args, close }: AreaWindowProps) {
  const chart = usePatient().chart
  const tab = tabOf(args.tab)
  const cfg = DETERMINANT_PANELS[tab]
  const { update } = useEncounterSession()
  const [collected, setCollected] = useState(MOIS_TODAY)
  const [values, setValues] = useState<Record<string, string>>({})
  const chosen = cfg.observations.filter((o) => values[o.name])
  useScreenReport({ determinantPanel: pbSlug(cfg.panel), chosen: chosen.length })

  const save = () => {
    if (!chosen.length) { close(); return }
    recordObservations(chart, chosen.map((o) => ({ code: o.code, name: o.name, value: values[o.name]!, collected, by: SESSION_USER })))
    update((s) => ({
      ...s,
      measureRows: [...chosen.map((o) => ({
        collected, by: DESKTOP_USER, code: o.code, test: o.name, value: values[o.name]!,
        flag: '-', units: '', status: 'F', clip: '-', marker: '-',
      })), ...s.measureRows],
    }))
    close()
  }

  return (
    <WorkspaceDialogFrame id="determinant-panel" title={cfg.panel} width={640} height={130 + cfg.observations.length * 30} onClose={close} controls={false}>
      <div style={{ margin: '8px 10px 0', border: '1px solid #a0a0a0', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
        <FormBand right={
          <span className="pb-row" style={{ gap: 6, fontWeight: 400, paddingRight: 6 }}>
            Collected:
            <PBInput w={82} align="center" value={collected} data-tutorial-id="host.mois.field.determinant-collected" onChange={(e) => setCollected(e.target.value)} />
          </span>
        }>
          {cfg.band}
        </FormBand>
        {cfg.observations.map((o) => (
          <div key={o.name} className="pb-row" style={{ gap: 8, padding: '3px 8px', borderBottom: '1px solid #e6e6e6' }}>
            <span style={{ flex: '1 1 auto' }}>{o.name}</span>
            <PBSelect
              w={250}
              value={values[o.name] ?? ''}
              options={['', ...o.options]}
              data-tutorial-id={`host.mois.field.determinant-${pbSlug(o.name)}`}
              onChange={(e) => setValues((v) => ({ ...v, [o.name]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="pb-row" style={{ gap: 18, padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="determinant-panel-save" isDefault width={150} onClick={save}>Save Changes (F2)</DialogButton>
        <DialogButton id="determinant-panel-close" width={150} onClick={close}>Close w/o Save</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Trend ---------------------------------------------------------------- */
function DeterminantTrend({ args, close }: AreaWindowProps) {
  const chart = usePatient().chart
  const tab = tabOf(args.tab)
  const cfg = DETERMINANT_PANELS[tab]
  const det = useDeterminants(chart)
  const measures = useChartRecords('measure', 'dtm_collect_date')
  const names = new Set(cfg.observations.map((o) => o.name))
  const codes = new Set(cfg.observations.map((o) => o.code).filter(Boolean))
  const rows = [
    ...det.observations.filter((o) => names.has(o.name)).map((o) => ({ collected: o.collected, name: o.name, value: o.value, by: o.by })),
    ...measures
      .filter((m) => codes.has(m.str_code ?? '') || names.has(m.str_description ?? ''))
      .map((m) => ({ collected: (m.dtm_collect_date ?? '').split(' ')[0]!.replace(/\//g, '.'), name: m.str_description ?? '', value: m.str_value ?? '', by: m.str_collect_by ?? m.stp_user_create ?? '' })),
  ]
  return (
    <WorkspaceDialogFrame id="determinant-trend" title={`${cfg.band} - Trend`} width={720} height={340} onClose={close}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '8px 10px 0', border: '1px solid var(--pb-border)' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'collected', header: 'Collected', width: 90, align: 'center' },
            { key: 'name', header: 'Name', width: 300 },
            { key: 'value', header: 'Value', width: 160 },
            { key: 'by', header: 'Recorded By' },
          ]}
          rows={rows}
          empty="Nothing has been recorded for this panel."
        />
      </div>
      <div className="pb-row" style={{ padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="determinant-trend-close" onClick={close}>Close</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- the "…" pick lists ---------------------------------------------------- */
function DeterminantLookup({ args, close }: AreaWindowProps) {
  const chart = usePatient().chart
  const det = useDeterminants(chart)
  const list = DETERMINANT_LISTS[str(args.list)] ?? DETERMINANT_LISTS.occupation!
  const target = str(args.target) as HistoryList
  const key = str(args.key)
  const field = str(args.field)
  const [text, setText] = useState('')
  const rows = list.values.filter((v) => v.includes(text.trim().toUpperCase())).map((value) => ({ value }))
  const [cur, setCur] = useState(0)
  const pick = (value: string | undefined) => {
    const current = det.rows[target]
    if (value && current) setHistory(chart, target, current.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
    close()
  }
  return (
    <WorkspaceDialogFrame id="determinant-lookup" title={list.title} width={460} height={380} onClose={close} controls={false}>
      <div className="pb-row" style={{ gap: 6, padding: '8px 10px 4px', flex: 'none' }}>
        <span>Search For:</span>
        <PBInput w={300} value={text} data-tutorial-id="host.mois.field.determinant-lookup-search" onChange={(e) => { setText(e.target.value); setCur(0) }} onKeyDown={(e) => { if (e.key === 'Enter') pick(rows[cur]?.value) }} />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 10px', border: '1px solid var(--pb-border)' }}>
        <PBDataWindow
          flush
          columns={[{ key: 'value', header: list.title }]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => pick(r.value)}
          rowTutorialId={(r) => `host.mois.row.determinant-pick-${pbSlug(r.value)}`}
          empty="Nothing matches."
        />
      </div>
      <div className="pb-row" style={{ gap: 14, padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="determinant-lookup-select" isDefault disabled={!rows[cur]} onClick={() => pick(rows[cur]?.value)}>Select</DialogButton>
        <DialogButton id="determinant-lookup-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('determinant-panel', DeterminantPanel)
registerAreaWindow('determinant-trend', DeterminantTrend)
registerAreaWindow('determinant-lookup', DeterminantLookup)
