import { useMemo, useState, type ReactNode } from 'react'
import type { MoisRecord } from '../data/charts'
import {
  addFolderRecord, createdStamp, deleteFolderRecord, FOLDER_ID, mergedFolderRecords, newSessionId,
  saveFolderRecord, useCarePlanRecords, type CarePlanFolder,
} from '../data/carePlanRecords'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { PBCheckbox, type PBColumn, type PBCommand } from '../pb'

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
  const [draft, setDraft] = useState<MoisRecord | null>(null)
  const [pending, setPending] = useState<Record<string, MoisRecord>>({})
  const [removed, setRemoved] = useState<string[]>([])
  const [status, setStatus] = useState('')

  const list = useMemo(() => {
    const kept = mergedFolderRecords(store, folder, exported)
      .filter((r) => !removed.includes(r[idKey] ?? ''))
      .map((r) => pending[r[idKey] ?? ''] ?? r)
    return draft ? [draft, ...kept] : kept
  }, [store, folder, exported, removed, pending, idKey, draft])

  const at = Math.min(cur, Math.max(0, list.length - 1))
  const record = list[at]
  const dirty = !!draft || removed.length > 0 || Object.keys(pending).length > 0
  useScreenReport({ draft: dirty, record: status, rows: list.length })

  /** change one field of the current record */
  const edit = (field: string, value: string, more: MoisRecord = {}) => {
    if (!record) return
    const next = { ...record, [field]: value, ...more }
    if (draft && record === draft) setDraft(next)
    else setPending((p) => ({ ...p, [record[idKey] ?? '']: next }))
    setStatus('')
  }

  const act = {
    newRecord: () => {
      setDraft({
        ...blank?.(),
        [idKey]: newSessionId(folder.replace(/s$/, '')),
        dtm_start: slash(MOIS_TODAY),
        str_sensitive: 'N',
        num_attachments: '0',
        ...createdStamp(),
      })
      setCur(0); setStatus('')
    },
    deleteRecord: () => {
      if (!record) return
      if (draft && record === draft) setDraft(null)
      else setRemoved((r) => [...r, record[idKey] ?? ''])
      setCur(Math.max(0, at - 1)); setStatus('')
    },
    save: () => {
      if (draft) addFolderRecord(chart, folder, draft)
      for (const r of Object.values(pending)) if (!removed.includes(r[idKey] ?? '')) saveFolderRecord(chart, folder, r)
      for (const id of removed) deleteFolderRecord(chart, folder, id)
      setStatus(removed.length && !draft && !Object.keys(pending).length ? 'deleted' : dirty ? 'saved' : '')
      setDraft(null); setPending({}); setRemoved([])
    },
    undo: () => { setDraft(null); setPending({}); setRemoved([]); setStatus('') },
    refresh: () => { setDraft(null); setPending({}); setRemoved([]); setStatus('') },
  }

  const commands = (cmds: PBCommand[]): PBCommand[] => cmds.map((c) => {
    if (!c) return c
    switch (c.label) {
      case 'New Record': return { ...c, onClick: act.newRecord }
      case 'Delete Record': return { ...c, disabled: !record, onClick: act.deleteRecord }
      case 'Save': return { ...c, onClick: act.save }
      case 'Undo': return { ...c, onClick: act.undo }
      case 'Refresh': return { ...c, onClick: act.refresh }
      default: return c
    }
  })

  return {
    list, cur: at, setCur, record, edit, commands, dirty,
    isNew: !!draft && record === draft,
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
              onChange={(v) => { if (on) edit(cell.field, v ? 'Y' : 'N', cell.onToggle?.(v)) }}
            />
          )
        }
        if (!on) return String(row[c.key] ?? '')
        const value = cell.kind === 'date' ? dot(record![cell.field]) : record![cell.field] ?? ''
        return (
          <input
            className="pb-dw__edit"
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
