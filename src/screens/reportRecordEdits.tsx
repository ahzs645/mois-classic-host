import { useMemo, useState } from 'react'
import type { MoisRecord } from '../data/charts'
import { useScreenReport } from '../host/screen-state'
import { usePBInstrumentation, type PBCommand } from '../pb'
import { RecordHistoryDialog, useRecordSignature } from './ChartBasicsWindows'

/* ============================================================================
   New Record / Delete Record, and the signature link, for the clinical report
   folders ClinicalReportView draws (Imaging, Consults, Procedures, Paper
   Forms and the rest).

   art. 304655 (the Task Bar): New Record "creates an empty record in the
   folder you are in", Delete Record "deletes the selected record". So New
   puts a blank row at the top of the list and makes it current, and Delete
   takes the current row out of the list — in this session only; the export
   behind the list is never written. Measures and Preferences keep their own
   New / Save handling and pass straight through.
   ========================================================================= */

type Listed = { row: Record<string, string>; record: MoisRecord | undefined; src: number }

export function useReportRecordEdits(
  node: string,
  rows: Record<string, string>[],
  records: MoisRecord[],
  cur: number,
  setCur: (i: number) => void,
) {
  const enabled = node !== 'measures' && node !== 'prefs'
  const [added, setAdded] = useState(0)
  const [deleted, setDeleted] = useState<Set<number>>(() => new Set())
  const listed = useMemo((): Listed[] => {
    const source = rows.map((row, i) => ({ row, record: records[i], src: i }))
    if (!enabled) return source
    const blank = Array.from({ length: added }, (): Listed => ({ row: {}, record: undefined, src: -1 }))
    return [...blank, ...source.filter((x) => !deleted.has(x.src))]
  }, [added, deleted, enabled, records, rows])

  useScreenReport(enabled ? { rows: listed.length, draft: added > 0 } : {})

  const commands = (cmds: PBCommand[]): PBCommand[] => (!enabled ? cmds : cmds.map((c) => {
    if (!c) return c
    if (c.label === 'New Record') return { ...c, onClick: () => { setAdded((n) => n + 1); setCur(0) } }
    if (c.label === 'Delete Record') {
      return {
        ...c,
        onClick: () => {
          const at = Math.min(cur, listed.length - 1)
          const target = listed[at]
          if (!target) return
          if (target.src < 0) setAdded((n) => Math.max(0, n - 1))
          else setDeleted((prev) => new Set(prev).add(target.src))
          setCur(Math.max(0, at - 1))
        },
      }
    }
    return c
  }))

  return { rows: listed.map((x) => x.row), records: listed.map((x) => x.record), commands }
}

/** A record's identity for its Record History: its own `id_*` key. */
export function recordKeyOf(chart: string, node: string, record: MoisRecord | undefined): string {
  const id = record ? Object.entries(record).find(([k, v]) => k.startsWith('id_') && k !== 'id_chart' && k !== 'id_encounter' && v)?.[1] : undefined
  return `${chart}:${node}:${id ?? 'new'}`
}

/**
 * The blue SIGNED / UNSIGNED link at the bottom right of a clinical window,
 * and the Record History window it opens (art. 304732 `a2e5c9af…png`,
 * `d600f569…png`). A record that arrived over an interface starts signed;
 * one entered in MOIS starts unsigned; signing or unsigning in Record History
 * changes the link.
 */
export function SignatureLink({ recordKey, source, hidden }: { recordKey: string; source?: string; hidden?: boolean }) {
  const signed = useRecordSignature(recordKey, source)
  const [open, setOpen] = useState(false)
  const host = usePBInstrumentation()
  if (hidden) return null
  return (
    <>
      <button
        type="button"
        className="pb-link"
        data-tutorial-id={host?.anchor('command', 'signature')}
        onClick={() => { host?.report('command', { command: 'signature' }); setOpen(true) }}
      >
        {signed ? 'SIGNED' : 'UNSIGNED'}
      </button>
      {open && <RecordHistoryDialog recordKey={recordKey} signed={signed} onClose={() => setOpen(false)} />}
    </>
  )
}
