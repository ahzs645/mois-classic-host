import { useMemo } from 'react'
import type { MoisRecord } from '../data/charts'
import { useFolderReviews } from '../data/folder-reviews'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useScreenWindow, useSessionState } from '../host/screen-windows'
import type { PBCommand } from '../pb'
import { practiceRecords } from '../data/practiceRecords'
import { setNoKnown, storedItems, useAllergySession } from '../data/allergySession'
import { SESSION_USER } from '../data/chartSession'
import { ADVERSE_WINDOWS } from './AdverseEventWindows'
import { useOpenWindow } from './areaWindowRegistry'
import { applyQuickEntry, type QuickEntryApplied } from './quickEntryApply'
import { useDraftRecords } from './listKit'

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
   still listed after the learner moves to another folder and back. Reaction
   Risks and Adverse Events filed through a window (New Reaction Risk, New
   Adverse Event, Elevate To Risk, Quick Entry) live in data/allergySession.ts
   instead, which every window that files or links one shares; they are listed
   above the export's rows.

   Two Allergy / Intolerances commands are also wired here (art. 303131):
   Reaction Risks' `No Known` files the `** NO KNOWN **` assertion when the
   list is empty (and says why not when it is not — INFERRED, the article only
   gives the empty case), and Adverse Events' `Elevate To Risk` opens the
   Elevate Event To a Reaction Risk window for the current event.

   Measures and Preferences have their own handlers and are left alone.
   ========================================================================= */

/** the folders this hook owns; the rest keep reportRecordEdits' handler */
export const RECORD_FOLDERS = new Set(['allergy', 'reaction', 'events', 'conditions', 'interventions'])

type Row = Record<string, string>
type Session = { added: Row[]; removed: string[] }
type Listed = { row: Row; record: MoisRecord | undefined }

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
  const openWindow = useOpenWindow()
  const [reviews] = useFolderReviews(node)
  const [session, setSession] = useSessionState<Session>(`report:${chart}:${node}`, { added: [], removed: [] })
  const allergy = useAllergySession(chart)

  /* the export's rows, then any practice record this folder carries (see
     data/practiceRecords.ts), keyed so a removal survives re-ordering */
  const seeded = (active && practiceRecords[node]) || NONE
  const stored = useMemo(() => (active ? storedItems(node, allergy) : []), [active, node, allergy])
  const base = useMemo(() => [
    ...stored,
    ...seeded.map((s, i) => ({ row: { ...s.row, __key: `practice-${i}` }, record: s.record })),
    ...rows.map((r, i) => ({ row: { ...r, __key: rowKey(r, i) }, record: records[i] })),
  ], [rows, records, seeded, stored])
  /* what is filed: the rows saved here on top, less the rows deleted */
  const filed = useMemo(() => (!active ? base : [...session.added.map((r) => ({ row: r, record: undefined as MoisRecord | undefined })), ...base]
    .filter((x) => !session.removed.includes(x.row.__key!))), [active, base, session])

  const blank = (): Row => {
    const dateKey = columns.find((c) => DATE_HEADERS.test(c.header))?.key
    return { __key: `new-${Date.now()}`, ...(dateKey ? { [dateKey]: MOIS_TODAY } : {}), m: '', clip: '-' }
  }

  const d = useDraftRecords<Listed>({
    base: filed,
    keyOf: (x) => x.row.__key!,
    cur,
    setCur,
    active,
    blank: () => ({ row: blank(), record: undefined }),
    singleRemove: true,
    clamp: false,
    deleteMoves: 'none',
    /* Save and Undo are never greyed: every capture paints them enabled with
       nothing edited (see DIS in data/reportScreens.tsx) */
    wire: ['New Record', 'Delete Record', 'Save', 'Undo'],
    commit: ({ drafts, removed }) => {
      const draft = drafts[0]
      const pendingRemove = removed[0]
      if (draft) setSession((s) => ({ ...s, added: [draft.row, ...s.added] }))
      if (pendingRemove) setSession((s) => ({ ...s, removed: [...s.removed, pendingRemove] }))
      return pendingRemove && !draft ? 'deleted' : 'saved'
    },
  })
  const { list, status: record, setStatus: setRecord } = d

  useScreenReport(active ? { draft: d.dirty, record, rows: list.length } : {})

  const act = {
    /** a window filed or linked a record: report it, onto the new top row */
    mark: (what: string, top = false) => { if (top) setCur(0); setRecord(what) },
    /* 303131 No Known: only with no Reaction Risks on the list */
    noKnown: () => {
      if (list.length) { win.open(ADVERSE_WINDOWS.noKnownBlocked); return }
      setNoKnown(chart, 'reaction', SESSION_USER)
      setRecord('no-known')
    },
    /** a record another window filed (New Reaction Risk's Save) */
    file: (row: Row) => {
      setSession((s) => ({ ...s, added: [{ __key: `new-${Date.now()}`, ...row }, ...s.added] }))
      setCur(0)
      setRecord('saved')
    },
  }

  const allergyCommand = node === 'reaction' || node === 'allergy'
  const commands = (cmds: PBCommand[]): PBCommand[] => d.commands(cmds, {
    ...(newWindow ? { 'New Record': (c: NonNullable<PBCommand>) => ({ ...c, onClick: () => win.open(newWindow) }) } : {}),
    /* dropping the blank row leaves the reported record as it was */
    'Delete Record': (c) => ({ ...c, disabled: !d.record, onClick: () => { const kept = d.isNew ? record : null; d.deleteRecord(); if (kept !== null) setRecord(kept) } }),
    'No Known': (c) => (allergyCommand ? { ...c, onClick: act.noKnown } : c),
    /* art. 3071982 "Using Quick Entry in Reaction Risks": the Quick Entry -
       Reaction Risks window (screens/QuickEntryWindows.tsx); Continue files
       the templated risk and reports it as saved on the new top row */
    'Quick Entry': (c) => (allergyCommand ? {
      ...c,
      onClick: () => openWindow('quick-entry-chart', {
        group: 'Reaction Risk',
        onApply: (applied: QuickEntryApplied) => { applyQuickEntry(applied); act.mark('saved', true) },
      }),
    } : c),
    'Elevate To Risk': (c) => (node !== 'events' ? c : {
      ...c, disabled: !list[cur],
      onClick: () => { const r = list[cur]; if (r) win.open(ADVERSE_WINDOWS.elevate, { event: r.record?.id_adverse_event ?? r.row.__key ?? '' }) },
    }),
  })

  return {
    active,
    rows: list.map((x) => x.row as Row),
    /** the export (or practice) record behind the current row; none for a new one */
    recordAt: (i: number) => list[i]?.record,
    commands,
    file: act.file,
    mark: act.mark,
    reviewed: reviews[0],
  }
}
