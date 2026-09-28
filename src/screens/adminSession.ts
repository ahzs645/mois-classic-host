import { useCallback } from 'react'
import { useSessionState } from '../host/screen-windows'
import {
  CODE_MAPPINGS_KEY, CODE_MAPPING_ROWS, CODE_RECORDS, CODE_RECORDS_KEY, VALUE_SETS, VALUE_SETS_KEY,
  type CodeMapping, type CodeRecord, type ValueSet,
} from '../data/codesets'

/* ============================================================================
   Session-backed lists for the Administration windows built for the
   admin/reference stream (Codeset Management, Address Book, Org Roles …).

   The same pattern as ClinicEditorWindows' `useClinicRows`: the frame keeps a
   screen mounted across tree nodes and `useSessionState` pins its initial
   value at first render, so the store holds `null` until the first edit and
   the shipped rows stand in until then. Edits last as long as the frame —
   a new stage starts on the shipped data.
   ========================================================================= */

export type ListUpdate<T> = (fn: (prev: T[]) => T[]) => void

export function useStoredList<T>(key: string, base: T[]): [T[], ListUpdate<T>] {
  const [stored, setStored] = useSessionState<T[] | null>(key, null)
  const update = useCallback<ListUpdate<T>>((fn) => setStored((prev) => fn(prev ?? base)), [setStored, base])
  return [stored ?? base, update]
}

export const useValueSets = () => useStoredList<ValueSet>(VALUE_SETS_KEY, VALUE_SETS)
export const useCodeRecords = () => useStoredList<CodeRecord>(CODE_RECORDS_KEY, CODE_RECORDS)
export const useCodeMappings = () => useStoredList<CodeMapping>(CODE_MAPPINGS_KEY, CODE_MAPPING_ROWS)

/** yyyy.mm.dd  hh:mm — the created / modified stamp the admin windows print. */
export function nowStamp(today: string): string {
  const now = new Date()
  return `${today}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
