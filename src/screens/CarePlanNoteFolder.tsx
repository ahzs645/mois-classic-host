import { useState } from 'react'
import { useNodeRecords } from '../data/chart-records'
import { stamp } from '../data/charts/detail'
import { ChartHeaderIdentity } from '../data/patient-context'
import type { ReportScreen } from '../data/reportScreens'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBTabs, PBTextArea, PBViewHeader,
  type PBColumn,
} from '../pb'
import { dot, editableColumns, searchView, useCarePlanFolder } from './carePlanFolder'
import { ChartIdentityStrip } from './patientKit'
import { SearchForBand, useFolderSearch, type SearchField } from './SearchForBand'

/* ============================================================================
   Care Plan ▸ Barriers to Care and Care Plan ▸ Patient Resources.

   Both nodes route to the clinical report window (data/reportScreens.tsx
   `barriers` / `resources`, host/MoisClassicShell.tsx `routeNode` checks
   reportScreens first), which draws them through this component so a record
   can be entered: New Record puts a row at the top with Start on today; the
   current row's Start, End, Barrier to Care / Resource and S cells are
   edited in place; the Detail tab holds the record's Note; Save, Undo,
   Delete Record and Refresh behave as on every chart folder
   (screens/carePlanFolder.tsx). Saved records live in
   data/carePlanRecords.ts, so they are still listed after the learner
   leaves the folder. M is ticked when the Note holds text ("indicates there
   is additional information to be seen in the Detail window down below").
   Search For (the shared SearchForBand) narrows to the Barrier / Resource
   column — "the only field available" (303512, 303513).

   PROVENANCE: art. 303512 (Start, End, Barrier to Care, S, M, Note) and
   303513 (Start, End, Patient Resource, S, M, Note), both text only; the
   field audit's tdt_chart_barrier / tdt_chart_resource rows (Start · End ·
   Barrier to Care · S · M · Paper clip · Note). Grid geometry is
   reportScreens' existing `barriers` / `resources` entries.
   INFERRED: in-grid entry of the grid's fields.

   DEV v02.31.23 captures (100%), evidence/MATRIX-R0991-start, R0998-note,
   R1000-start, R1007-note: the Detail tab holds only Note (captioned at
   x 11, the box at x 93, 699 × 130); the grid is 315 px tall, so the tab
   strip sits low in the window; an empty grid paints nothing; the strip
   under the tab reads `Created:` · date · HH:MM · user, `Last Modified:`
   at x 359, `ENC# EMPTY` at the right.

   Anchors: host.mois.cell.{barriers|resources}-{start|end|barrier|resource|s}
   (the current row), host.mois.field.{barrier|resource}-note,
   host.mois.field.search-for, host.mois.row.{barriers|resources}-current;
   the command row's host.mois.command.{new-record|delete-record|save|undo|refresh}.
   ========================================================================= */

type Row = Record<string, string>

/* "the default field that MOIS searches for (and the only field available)" */
const SEARCH: Record<'barriers' | 'resources', SearchField[]> = {
  barriers: [{ key: 'barrier', label: 'Barrier', isDefault: true }],
  resources: [{ key: 'resource', label: 'Resource', isDefault: true }],
}

export function CarePlanNoteFolder({ screen, node }: { screen: ReportScreen; node: 'barriers' | 'resources' }) {
  /* only barriers have an export group (`chart_barrier`); resources start empty */
  const exported = useNodeRecords(node)
  const textField = node === 'barriers' ? 'str_barrier' : 'str_resource'
  const descKey = node === 'barriers' ? 'barrier' : 'resource'
  const folder = useCarePlanFolder(node, exported)
  const { list, cur, setCur, record, edit } = folder
  const [tab, setTab] = useState('Detail')

  const rows: Row[] = list.map((r) => ({
    start: dot(r.dtm_start),
    end: dot(r.dtm_end),
    [descKey]: r[textField] ?? '',
    s: r.str_sensitive === 'Y' ? '✓' : '',
    m: r.str_note ? '⇩' : '',
    clip: r.num_attachments && r.num_attachments !== '0' ? r.num_attachments : '-',
  }))

  const base: PBColumn<Row>[] = screen.columns.map((c) => ({
    key: c.key,
    auditId: c.auditId,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
    render: c.check ? (r) => <PBCheckbox checked={r[c.key] === '✓'} />
      : c.key === 'm' ? (r) => <span style={{ color: '#8b1a9b' }}>{r.m}</span> : undefined,
  }))
  const search = useFolderSearch(screen.title, SEARCH[node])
  const view = searchView(rows, search.test, cur, setCur)
  const columns = editableColumns(node, base, {
    start: { kind: 'date', field: 'dtm_start' },
    end: { kind: 'date', field: 'dtm_end' },
    [descKey]: { kind: 'text', field: textField },
    s: { kind: 'check', field: 'str_sensitive' },
  }, { cur: view.editRow, record, edit })

  return (
    <>
      <PBViewHeader title={screen.title} right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={folder.commands(screen.commands.map((c) => (c === null ? null : { label: c })))} />

      <ChartIdentityStrip />

      <SearchForBand context={screen.title} fields={SEARCH[node]} value={search.text} onChange={search.setText} />

      <div style={{ padding: '0 3px', height: 315, flex: 'none', display: 'flex' }}>
        <PBDataWindow
          columns={columns}
          rows={view.rows}
          current={view.current}
          onCurrentChange={view.onCurrentChange}
          rowTutorialId={(_r, i) => (i === view.editRow ? `host.mois.row.${node}-current` : undefined)}
          empty={false}
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 3px 0' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBTabs tabs={screen.tabs ?? ['Detail']} active={tab} onChange={setTab} compact>
            <div style={{ display: 'grid', gridTemplateColumns: '74px 699px', gap: '6px 8px', padding: '8px 11px', alignItems: 'start' }}>
              <span className="pb-form__label" style={{ lineHeight: '19px' }}>Note:</span>
              <PBTextArea
                w="100%" style={{ height: 130 }}
                value={record?.str_note ?? ''}
                readOnly={!record}
                data-tutorial-id={`host.mois.field.${node === 'barriers' ? 'barrier' : 'resource'}-note`}
                onChange={(e) => edit('str_note', e.target.value)}
              />
            </div>
          </PBTabs>
        </div>
        <div className="pb-row" style={{ padding: '0 5px 4px', gap: 0, flex: 'none', whiteSpace: 'pre' }}>
          <span style={{ width: 76, flex: 'none' }}>Created:</span>
          <span style={{ width: 272, flex: 'none' }}>{stamp(record)}</span>
          <span>Last Modified:  {stamp(record, 'modify')}</span>
          <span className="pb-row__spacer" />
          {record && <button type="button" className="pb-link">ENC# {record.id_encounter && record.id_encounter !== '-1' ? record.id_encounter : 'EMPTY'}</button>}
        </div>
      </div>
    </>
  )
}
