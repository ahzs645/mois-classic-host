import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useChartRecords, useNodeRecords } from '../data/chart-records'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_USER, useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import type { PBColumn, PBCommand } from '../pb'

/* ============================================================================
   The Patient Chart ▸ Measures folder's own behaviour, layered over the
   shared ClinicalReportView (which draws Imaging, Consults, Procedures and
   Paper Forms from the same window).

   Transcribed from art. 302837 (Patient Chart ▸ Measures):
   - "Flagged Items" (`c366c16b…`): a flagged result is highlighted yellow in
     four cells — Test Name, Value, Flag and Units — for any flag (H, HH, L,
     LL, A …), not the whole row and not only H.
   - the Taskbar: New Record opens a blank row at the top with Save / Undo
     lit; Graph plots every value of the selected code; Attachment adds a
     file to the selected result.
   - Action ▸ Filter Measures (Ctrl+F) cuts the list to the selected code.
   - the Report tab's Order # fills in once the result is linked to its order
     (Taskbar ▸ Link to Order, art. 303792).
   Rows filed this session (here, from a template, or from an encounter's
   Measurements tab) come from the frame's session copy (host/encounterArea).
   ========================================================================= */

const FLAGGED_CELLS = new Set(['test', 'value', 'flag', 'units'])
const flagged = (r: Record<string, string>) => !!r.flag && r.flag !== '-'

export function useMeasuresFolder(node: string, rows: Record<string, string>[], cur: number) {
  const active = node === 'measures'
  const { session, update, open } = useEncounterSession()
  const records = useNodeRecords(active ? 'measures' : '')
  const panels = useChartRecords('panel')
  const [draft, setDraft] = useState(false)

  const all = useMemo((): Record<string, string>[] => {
    if (!active) return rows
    const withLinks = rows.map((r, i): Record<string, string> => {
      const id = records[i]?.id_measure ?? r.id ?? ''
      return {
        ...r,
        id,
        panel: records[i]?.id_panel ?? '',
        marker: /CALCULATOR/.test(records[i]?.str_interface ?? '') ? '…' : records[i]?.id_dform_header ? '.*.' : '-',
        /* linked to an order this session: the Report tab's Order # */
        orderNumber: session.orderLinks[id] ?? r.orderNumber ?? '',
        encounter: session.measureLinks[id] ?? r.encounter ?? '',
      }
    })
    const filed = session.measureRows
    const blank: Record<string, string>[] = draft ? [{ collected: MOIS_TODAY, by: DESKTOP_USER, code: '', test: '', value: '', flag: '', units: '', status: '', clip: '-', id: 'new' }] : []
    const list = [...blank, ...filed, ...withLinks]
    return session.measureFilter ? list.filter((r) => r.code === session.measureFilter) : list
  }, [active, rows, records, session.orderLinks, session.measureLinks, session.measureRows, session.measureFilter, draft])

  const current = active ? all[cur] : undefined
  /* the folder's current row, for Graph Measures / Filter Measures and the
     Order Linking Service / Add Attachment it opens */
  const currentKey = current ? `${current.id}|${current.code}` : ''
  useEffect(() => {
    if (!active) return
    update((s) => ({
      ...s,
      measureSelected: current ?? null,
      attachTarget: current?.id && current.id !== 'new' ? `measure:${current.id}` : s.attachTarget,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, currentKey])

  useScreenReport(active ? {
    draft,
    linked: Object.keys(session.measureLinks).length,
    orderLinked: Object.keys(session.orderLinks).length,
    measureFilter: session.measureFilter !== null,
    rows: all.length,
  } : {})

  /* the Panel tab: every result that came in the selected one's panel, and
     their count in the caption — `Panel (5)` over five rows (302837
     `91cd8d02…`), so a result that stands alone reads Panel (0) */
  const panelRows = current?.panel ? all.filter((r) => r.panel === current.panel) : []
  const panelRecord = current?.panel ? panels.find((p) => p.id_panel === current.panel) : undefined

  const commands = (base: PBCommand[]): PBCommand[] => {
    if (!active) return base
    return base.map((c) => {
      if (!c) return c
      switch (c.label) {
        case 'New Record': return { ...c, onClick: () => setDraft(true) }
        case 'Save': return { ...c, disabled: !draft, onClick: () => setDraft(false) }
        case 'Undo': return { ...c, disabled: !draft, onClick: () => setDraft(false) }
        case 'Graph': return { ...c, onClick: () => { if (current?.code) open('measurement-graph', { code: current.code }) } }
        case 'Attachment': return { ...c, onClick: () => { open('add-attachment') } }
        default: return c
      }
    })
  }

  const columns = (base: PBColumn<Record<string, string>>[]): PBColumn<Record<string, string>>[] => {
    if (!active) return base
    return base.map((col) => (FLAGGED_CELLS.has(col.key)
      ? {
        ...col,
        render: (r: Record<string, string>): ReactNode => (flagged(r)
          ? <span className="pb-dw__flagcell" style={{ display: 'block', margin: '0 -3px', padding: '0 3px', background: 'var(--pb-dw-flag, #ffff66)' }}>{r[col.key]}</span>
          : r[col.key]),
      }
      : col))
  }

  return {
    active,
    rows: all,
    commands,
    columns,
    rowTutorialId: active ? (r: Record<string, string>) => `host.mois.row.measure-${r.id || r.code}` : undefined,
    panel: {
      caption: `Panel (${panelRows.length})`,
      name: panelRecord?.str_panel_name ?? '',
      orderedBy: panelRecord?.str_ordering_provider ?? '',
      rows: panelRows,
    },
  }
}
