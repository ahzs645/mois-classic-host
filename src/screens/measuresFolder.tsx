import { useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react'
import { useChartRecords, useNodeRecords } from '../data/chart-records'
import {
  FORM_WINDOW, MEASURE_FORMS, clearDraft, longDate, nextEntryId, patchDraft, resolveLabCode, saveRowForm,
  setDraftCode, startDraft, useMeasureEntry,
} from '../data/measureEntry'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_USER, useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBInput, type PBColumn, type PBCommand } from '../pb'

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

   New Record (302837 "Dynamic Measures Calculators", `46bf7ec5…`): the blank
   row is editable — Code takes a code or quick code (Tab or Enter resolves
   it; F4 or the "…" right of it opens Lab Code Selection), Value takes the
   reading (F4, or the "…" in the unnamed column, opens the measure's form
   when it has one; a "-" there means it has none), and Save (F2) files it.
   A saved form turns the marker into `.*.` (`2f044971…`), which reopens it.
   The unsaved row lives in data/measureEntry.ts so the windows it opens can
   write to it.

   Patient Questionnaires (302837, v02.31.27): a PHQ-9 row sent to the
   patient through Create Message ▸ Send msg to patient shows the
   myhealthkey icon in the unnamed column and a highlighted `O` status
   (`9e6a95fb…`), and its Comments read "Sent to patient to complete on …"
   (`dd25de05…`).
   ========================================================================= */

const FLAGGED_CELLS = new Set(['test', 'value', 'flag', 'units'])
const flagged = (r: Record<string, string>) => !!r.flag && r.flag !== '-'

/** the myhealthkey mark: an orange heart with a key through it (`9e6a95fb…`) */
function MyHealthKeyIcon() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" aria-label="myhealthkey" role="img" style={{ verticalAlign: 'middle' }}>
      <path d="M7 12 1.6 6.6A3.1 3.1 0 0 1 7 2.4a3.1 3.1 0 0 1 5.4 4.2Z" fill="none" stroke="#f08030" strokeWidth="1.4" />
      <path d="M3 11 8.6 5.4" stroke="#707070" strokeWidth="1.4" />
      <circle cx="9.4" cy="4.6" r="1.4" fill="none" stroke="#707070" strokeWidth="1.1" />
    </svg>
  )
}

const dotsButton = (command: string, onClick: () => void, label = '…') => (
  <PBButton bare className="pb-link" command={command} onClick={(e) => { e.stopPropagation(); onClick() }}>{label}</PBButton>
)

export function useMeasuresFolder(node: string, rows: Record<string, string>[], cur: number) {
  const active = node === 'measures'
  const { session, update, open } = useEncounterSession()
  const chart = usePatient().chart
  const entry = useMeasureEntry(chart)
  const records = useNodeRecords(active ? 'measures' : '')
  const panels = useChartRecords('panel')
  /* the measures a saved dynamic form hangs from (dform_header.id_object) */
  const formHeaders = useChartRecords('dform_header')
  const formFor = useMemo(() => new Map(formHeaders.filter((h) => h.str_object === 'tdt_measure').map((h) => [h.id_object ?? '', h.id_dform_window ?? ''])), [formHeaders])
  /* a `.*.` reopens only when its saved window is one this stage draws:
     a session row's own form, or the export's window 100 / 104 instance */
  const reopens = (r: Record<string, string>) => {
    const kind = MEASURE_FORMS[r.code ?? '']
    if (!kind) return false
    const window = formFor.get(r.id ?? '')
    return window === undefined || window === FORM_WINDOW[kind]
  }
  const draftRow = entry.draft
  const draft = !!draftRow

  const all = useMemo((): Record<string, string>[] => {
    if (!active) return rows
    const withLinks = rows.map((r, i): Record<string, string> => {
      const id = records[i]?.id_measure ?? r.id ?? ''
      return {
        ...r,
        id,
        panel: records[i]?.id_panel ?? '',
        marker: formFor.has(id) ? '.*.' : MEASURE_FORMS[r.code ?? ''] || /CALCULATOR/.test(records[i]?.str_interface ?? '') ? '…' : '-',
        /* linked to an order this session: the Report tab's Order # */
        orderNumber: session.orderLinks[id] ?? r.orderNumber ?? '',
        encounter: session.measureLinks[id] ?? r.encounter ?? '',
      }
    })
    const filed = session.measureRows.map((r) => ({ marker: '-', ...r }))
    const blank: Record<string, string>[] = draftRow ? [{
      collected: MOIS_TODAY, by: DESKTOP_USER, code: draftRow.code, test: draftRow.test, value: draftRow.value,
      flag: draftRow.flag, units: draftRow.units, status: '', clip: '-', id: 'new', marker: draftRow.marker,
      report: draftRow.report, lower: draftRow.lower, upper: draftRow.upper, category: draftRow.category,
    }] : []
    /* a questionnaire sent to the patient: status O, highlighted, and the
       comment MOIS writes (302837 `9e6a95fb…`, `dd25de05…`) */
    const sent = (r: Record<string, string>): Record<string, string> => {
      const s = entry.sent[r.id ?? '']
      return s ? { ...r, status: 'O', sent: 'Y', comments: `Sent to patient to complete on ${longDate(s.date)}` } : r
    }
    const list = [...blank, ...filed, ...withLinks].map(sent)
    return session.measureFilter ? list.filter((r) => r.code === session.measureFilter) : list
  }, [active, rows, records, session.orderLinks, session.measureLinks, session.measureRows, session.measureFilter, draftRow, entry.sent, formFor])

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
    draftCode: draftRow?.code ?? '',
    draftForm: draftRow?.marker === '.*.',
    questionnairesSent: Object.keys(entry.sent).length,
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

  /* Save (F2): the New Record row becomes a record of the folder */
  const fileDraft = () => {
    const d = draftRow
    if (!d) return
    if (d.code && d.test) {
      const id = nextEntryId(chart)
      update((s) => ({
        ...s,
        measureRows: [{
          id, collected: MOIS_TODAY, by: DESKTOP_USER, code: d.code, test: d.test, value: d.value,
          flag: d.flag || '-', units: d.units, status: 'F', clip: '-', marker: d.marker, report: d.report,
          lower: d.lower, upper: d.upper, category: d.category,
        }, ...s.measureRows],
      }))
      if (d.marker === '.*.') saveRowForm(chart, id, { phq9: d.phq9, modified: d.formModified })
    }
    clearDraft(chart)
  }

  const commands = (base: PBCommand[]): PBCommand[] => {
    if (!active) return base
    return base.map((c) => {
      if (!c) return c
      switch (c.label) {
        case 'New Record': return { ...c, onClick: () => { if (!draftRow) startDraft(chart) } }
        case 'Delete Record': return current?.id === 'new' ? { ...c, onClick: () => clearDraft(chart) } : c
        case 'Save': return { ...c, disabled: !draft, onClick: fileDraft }
        case 'Undo': return { ...c, disabled: !draft, onClick: () => clearDraft(chart) }
        case 'Graph': return { ...c, onClick: () => { if (current?.code) open('measurement-graph', { code: current.code }) } }
        case 'Attachment': return { ...c, onClick: () => { open('add-attachment') } }
        default: return c
      }
    })
  }

  /* the New Record row's cells: Code resolves a code or quick code on Tab /
     Enter / leaving it, F4 in Code or Value opens its prompt */
  const resolveCode = (typed: string) => setDraftCode(chart, resolveLabCode(typed), typed)
  const openForm = () => { if (draftRow && MEASURE_FORMS[draftRow.code]) open('measure-dynamic-form', {}) }
  const draftCell = (key: string): ReactNode => {
    if (!draftRow) return null
    switch (key) {
      case 'code': return (
        <PBInput
          w="100%"
          value={draftRow.code}
          data-tutorial-id="host.mois.field.measure-new-code"
          onChange={(e) => patchDraft(chart, { code: e.target.value })}
          onBlur={(e) => resolveCode(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' || e.key === 'Tab') resolveCode(e.currentTarget.value)
            if (e.key === 'F4') { e.preventDefault(); open('lab-code-selection', {}) }
          }}
        />
      )
      case 'd': return dotsButton('measure-code-lookup', () => open('lab-code-selection', {}))
      case 'value': return (
        <PBInput
          w="100%"
          align="center"
          value={draftRow.value}
          data-tutorial-id="host.mois.field.measure-new-value"
          onChange={(e) => patchDraft(chart, { value: e.target.value })}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'F4') { e.preventDefault(); openForm() } }}
        />
      )
      case 'marker': return draftRow.marker === '-' ? '-' : dotsButton('measure-value-form', openForm, draftRow.marker)
      default: return undefined
    }
  }

  const flagCell = (r: Record<string, string>, key: string): ReactNode => (flagged(r)
    ? <span className="pb-dw__flagcell" style={{ display: 'block', margin: '0 -3px', padding: '0 3px', background: 'var(--pb-dw-flag, #ffff66)' }}>{r[key]}</span>
    : r[key])

  const cellFor = (key: string) => (r: Record<string, string>): ReactNode => {
    if (r.id === 'new') {
      const own = draftCell(key)
      if (own !== undefined) return own
    }
    if (key === 'd') return '…'
    if (key === 'marker') {
      if (r.sent === 'Y') return <MyHealthKeyIcon />
      /* `.*.` reopens the saved form; `…` on a saved row offers nothing new */
      if (r.marker === '.*.' && reopens(r)) {
        return dotsButton(`measure-form-${r.id || r.code}`, () => open('measure-dynamic-form', { rowId: r.id ?? '', code: r.code }), '.*.')
      }
      return r.marker
    }
    if (key === 'status' && r.sent === 'Y') {
      return <span data-tutorial-id={`host.mois.field.measure-status-${r.id}`} style={{ display: 'block', margin: '0 -3px', padding: '0 3px', background: '#ccf5ff' }}>{r.status}</span>
    }
    if (FLAGGED_CELLS.has(key)) return flagCell(r, key)
    return r[key]
  }

  const OWN_CELLS = new Set([...FLAGGED_CELLS, 'code', 'd', 'marker', 'status'])
  const columns = (base: PBColumn<Record<string, string>>[]): PBColumn<Record<string, string>>[] => {
    if (!active) return base
    return base.map((col) => (OWN_CELLS.has(col.key) ? { ...col, render: cellFor(col.key) } : col))
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
