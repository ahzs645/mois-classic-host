import { useMemo, useState, type ReactNode } from 'react'
import type { MoisRecord } from '../data/charts'
import {
  addFolderRecord, createdStamp, deleteFolderRecord, FOLDER_ID, mergedFolderRecords, newSessionId,
  saveFolderRecord, useCarePlanRecords, type CarePlanFolder,
} from '../data/carePlanRecords'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { yn } from '../data/text'
import { useScreenReport } from '../host/screen-state'
import { PBCheckbox, type PBColumn, type PBCommand } from '../pb'
import { useDraftRecords } from './listKit'

/* ============================================================================
   New Record / Delete Record / Save / Undo / Refresh and Search For on the
   Care Plan and Health Issue folders a learner enters records into: Planned
   Actions, Risks for Conditions and Needs for Care (CarePlanView) and
   Barriers to Care and Patient Resources (CarePlanNoteFolder).

   The PowerBuilder DataWindow contract these folders share with the report
   folders (screens/reportRecords.tsx, art. 304655 "New Record creates an
   empty record in the folder you are in"):

   - New Record puts a blank row at the top of the grid, its Start on today,
     and makes it current. The grid cells of the current row and the Detail
     tab below are editable.
   - Delete Record takes the current row out of the list.
   - Every change is pending (`host.screen.draft`) until Save; Undo throws it
     away; Refresh re-reads the folder.
   - Save files the records in data/carePlanRecords.ts, per chart, so they
     outlive the folder and every other window (a Goal's Linked Action(s),
     the Care Plan summary) sees them.

   PROVENANCE: articles 303511, 303512, 303513, 303447 (text; the risk and
   need captures `1df53843…png`, `bcfa0a6a…png`).
   INFERRED: in-grid editing of the current row — no capture shows a new
   Care Plan row being typed, but every DataWindow MOIS grid of this family
   is edited in place, and the field tables list the grid columns as the
   record's fields.
   ========================================================================= */

export const slash = (v: string) => v.replace(/\./g, '/')
export const dot = (v?: string) => (v ?? '').split(' ')[0]!.replace(/\//g, '.')

export function useCarePlanFolder(folder: CarePlanFolder, exported: MoisRecord[], {
  blank,
}: {
  /** the fields a new row starts with (besides its id and Start) */
  blank?: () => MoisRecord
} = {}) {
  const { chart } = usePatient()
  const store = useCarePlanRecords(chart)
  const idKey = FOLDER_ID[folder]
  const [cur, setCur] = useState(0)
  const base = useMemo(() => mergedFolderRecords(store, folder, exported), [store, folder, exported])

  const d = useDraftRecords<MoisRecord>({
    base,
    keyOf: (r) => r[idKey] ?? '',
    cur,
    setCur,
    blank: () => ({
      ...blank?.(),
      [idKey]: newSessionId(folder.replace(/s$/, '')),
      dtm_start: slash(MOIS_TODAY),
      str_sensitive: 'N',
      num_attachments: '0',
      ...createdStamp(),
    }),
    commit: ({ drafts, edits, removed }) => {
      for (const draft of drafts) addFolderRecord(chart, folder, draft)
      for (const r of Object.values(edits)) if (!removed.includes(r[idKey] ?? '')) saveFolderRecord(chart, folder, r)
      for (const id of removed) deleteFolderRecord(chart, folder, id)
    },
  })
  useScreenReport({ draft: d.dirty, record: d.status, rows: d.list.length })

  /** change one field of the current record */
  const edit = (field: string, value: string, more: MoisRecord = {}) => d.edit({ [field]: value, ...more })

  return {
    list: d.list, cur: d.at, setCur, record: d.record, edit, commands: (cmds: PBCommand[]) => d.commands(cmds), dirty: d.dirty,
    isNew: d.isNew,
  }
}

/* --- editable cells of the current row ------------------------------------ */
export type CellEdit =
  | { kind: 'text'; field: string }
  | { kind: 'date'; field: string }
  | { kind: 'check'; field: string; onToggle?: (on: boolean) => MoisRecord }

/**
 * Give the columns named in `cells` an editor on the current row; every other
 * row, and every other column, draws as before. Check columns draw a tick box
 * on every row and toggle on the current one.
 */
export function editableColumns<T extends Record<string, unknown>>(
  folder: string,
  columns: PBColumn<T>[],
  cells: Record<string, CellEdit>,
  { cur, record, edit }: { cur: number; record: MoisRecord | undefined; edit: (field: string, value: string, more?: MoisRecord) => void },
): PBColumn<T>[] {
  return columns.map((c) => {
    const cell = cells[c.key]
    if (!cell) return c
    const anchor = `host.mois.cell.${folder}-${c.key}`
    return {
      ...c,
      render: (row: T, i: number): ReactNode => {
        const on = i === cur && !!record
        if (cell.kind === 'check') {
          const checked = on ? record![cell.field] === 'Y' : row[c.key] === '✓' || row[c.key] === 'Y'
          return (
            <PBCheckbox
              checked={checked}
              tutorialId={on ? anchor : undefined}
              /* only the current row's box edits; a click elsewhere just
                 makes that row current (the row's mousedown) */
              onChange={(v) => { if (on) edit(cell.field, yn(v), cell.onToggle?.(v)) }}
            />
          )
        }
        if (!on) return String(row[c.key] ?? '')
        const value = cell.kind === 'date' ? dot(record![cell.field]) : record![cell.field] ?? ''
        return (
          <input
            className="pb-dw__edit"
            /* the DataWindow's edit columns are borderless: the current row
               reads salmon edge to edge with no boxes in it, a new row too
               (need-for-care-new-record.png, risk-linked-goals-populated.png,
               action-linked-goals-populated.png, DEV v02.31.23) */
            style={{ border: 0, background: 'transparent', color: 'inherit', padding: '0 1px' }}
            data-tutorial-id={anchor}
            aria-label={typeof c.header === 'string' ? c.header : c.key}
            value={value}
            onChange={(e) => edit(cell.field, cell.kind === 'date' ? slash(e.target.value) : e.target.value.toUpperCase())}
          />
        )
      },
    }
  })
}

/**
 * Search For narrows the grid without renumbering the folder's own list, the
 * way ClinicalReportView does it (SearchForBand.tsx): `cur` keeps addressing
 * the list, the grid sees only the matching rows.
 */
export function searchView<T>(rows: T[], test: (row: T) => boolean, cur: number, setCur: (i: number) => void) {
  const shown = rows.map((row, index) => ({ row, index })).filter((x) => test(x.row))
  const at = shown.findIndex((x) => x.index === cur)
  return {
    rows: shown.map((x) => x.row),
    current: Math.max(0, at),
    /** the grid row being edited: none when the current record is filtered out */
    editRow: at,
    onCurrentChange: (i: number) => setCur(shown[i]?.index ?? 0),
  }
}
