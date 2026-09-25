import { useMemo, useState } from 'react'
import type { MoisRecord } from '../data/charts'
import { useFolderReviews } from '../data/folder-reviews'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useScreenWindow, useSessionState } from '../host/screen-windows'
import type { PBCommand } from '../pb'
import { practiceRecords } from '../data/practiceRecords'

/* ============================================================================
   New Record / Delete Record / Save / Undo on the ClinicalReportView folders.

   The PowerBuilder DataWindow contract every one of these folders shares
   (303455 Conditions, 303144 Interventions, 303210 Reaction Risks — "Ctrl+N
   starts the record … Save with F2"):

   - New Record inserts a blank row at the top of the list, the date column
     already on today, and makes it the current row. The record is dirty
     (`host.screen.draft`) until Save or Undo is pressed — both buttons are
     enabled throughout, as every capture paints them.
   - Delete Record takes the current row out of the list, also pending until
     Save (Undo puts it back).
   - Save commits; Undo throws the pending change away.

   Reaction Risks is the exception: New Record there opens the modal New
   Reaction Risk window (303210 `b9130e47…png`), whose own Save (F2) files the
   record — so the row arrives already saved.

   Committed rows live in the frame's session store, so a record saved here is
   still listed after the learner moves to another folder and back.

   Measures and Preferences have their own handlers and are left alone.
   ========================================================================= */

/** the folders this hook owns; the rest keep reportRecordEdits' handler */
export const RECORD_FOLDERS = new Set(['allergy', 'reaction', 'events', 'conditions', 'interventions'])

type Row = Record<string, string>
type Session = { added: Row[]; removed: string[] }

/** a row's identity across renders: the export id when it has one */
const rowKey = (r: Row, i: number) => r.__key ?? `export-${i}`

/** The screen's date column: the first one whose header names a date. */
const DATE_HEADERS = /^(date|start|onset|collected|performed|refer|order)/i
const NONE: never[] = []

export function useReportRecords({
  node, rows, records, columns, cur, setCur, newWindow,
}: {
  node: string
  rows: Row[]
  /** the export records behind `rows`, index for index */
  records: MoisRecord[]
  columns: { key: string; header: string }[]
  cur: number
  setCur: (i: number) => void
  /** a window New Record opens instead of inserting a row */
  newWindow?: string
}) {
  const active = node !== 'prefs' && node !== 'measures' && node !== ''
  const { chart } = usePatient()
  const win = useScreenWindow()
  const [reviews] = useFolderReviews(node)
  const [session, setSession] = useSessionState<Session>(`report:${chart}:${node}`, { added: [], removed: [] })
  const [draft, setDraft] = useState<Row | null>(null)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [record, setRecord] = useState('')

  /* the export's rows, then any practice record this folder carries (see
     data/practiceRecords.ts), keyed so a removal survives re-ordering */
  const seeded = (active && practiceRecords[node]) || NONE
  const base = useMemo(() => [
    ...seeded.map((s, i) => ({ row: { ...s.row, __key: `practice-${i}` }, record: s.record })),
    ...rows.map((r, i) => ({ row: { ...r, __key: rowKey(r, i) }, record: records[i] })),
  ], [rows, records, seeded])

  const list = useMemo(() => {
    if (!active) return base
    const kept = [...session.added.map((r) => ({ row: r, record: undefined as MoisRecord | undefined })), ...base]
      .filter((x) => !session.removed.includes(x.row.__key!) && x.row.__key !== pendingRemove)
    return draft ? [{ row: draft, record: undefined as MoisRecord | undefined }, ...kept] : kept
  }, [active, base, session, draft, pendingRemove])

  const dirty = !!draft || !!pendingRemove
  useScreenReport(active ? { draft: dirty, record, rows: list.length } : {})

  const blank = (): Row => {
    const dateKey = columns.find((c) => DATE_HEADERS.test(c.header))?.key
    return { __key: `new-${Date.now()}`, ...(dateKey ? { [dateKey]: MOIS_TODAY } : {}), m: '', clip: '-' }
  }

  const act = {
    newRecord: () => {
      if (newWindow) { win.open(newWindow); return }
      setDraft(blank()); setCur(0); setRecord('')
    },
    deleteRecord: () => {
      const current = list[cur]
      if (!current) return
      if (current.row === draft) { setDraft(null); return }
      setPendingRemove(current.row.__key!)
      setRecord('')
    },
    save: () => {
      if (draft) setSession((s) => ({ ...s, added: [draft, ...s.added] }))
      if (pendingRemove) setSession((s) => ({ ...s, removed: [...s.removed, pendingRemove] }))
      setRecord(pendingRemove && !draft ? 'deleted' : 'saved')
      setDraft(null); setPendingRemove(null)
    },
    undo: () => { setDraft(null); setPendingRemove(null); setRecord('') },
    /** a record another window filed (New Reaction Risk's Save) */
    file: (row: Row) => {
      setSession((s) => ({ ...s, added: [{ __key: `new-${Date.now()}`, ...row }, ...s.added] }))
      setCur(0)
      setRecord('saved')
    },
  }

  const commands = (cmds: PBCommand[]): PBCommand[] => (!active ? cmds : cmds.map((c) => {
    if (!c) return c
    switch (c.label) {
      case 'New Record': return { ...c, onClick: act.newRecord }
      case 'Delete Record': return { ...c, disabled: !list[cur], onClick: act.deleteRecord }
      /* never greyed: every capture paints Save and Undo enabled with nothing
         edited (see DIS in data/reportScreens.tsx) */
      case 'Save': return { ...c, onClick: act.save }
      case 'Undo': return { ...c, onClick: act.undo }
      default: return c
    }
  }))

  return {
    active,
    rows: list.map((x) => x.row as Row),
    /** the export (or practice) record behind the current row; none for a new one */
    recordAt: (i: number) => list[i]?.record,
    commands,
    file: act.file,
    reviewed: reviews[0],
  }
}
