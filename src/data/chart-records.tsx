/* ============================================================================
   The open chart's exported records, for screens that can show real data.

   A screen asks for the group it renders and gets either the exported records
   or null. Null means this patient has no export behind them and the screen
   should draw its transcribed fixture — which is what every tutorial anchors
   to, so the fallback is load-bearing rather than a nicety.
   ========================================================================= */
import { useMemo } from 'react'
import { usePatient } from './patient-context'
import { chartExportFor, type MoisChartExport, type MoisChartGroup, type MoisRecord } from './charts'
import { ROW_MAPS, rowsFromExport } from './charts/to-rows'

/** The whole export for the open chart, or null when it is a fixture patient. */
export function useChartExport(): MoisChartExport | null {
  const patient = usePatient()
  return useMemo(() => chartExportFor(patient.chart), [patient.chart])
}

/**
 * One record group for the open chart, or null to fall back.
 *
 * `sort` is the field to order by, descending — MOIS lists clinical records
 * newest first almost everywhere, and an export arrives in insertion order.
 */
export function useChartRecords(group: MoisChartGroup, sort?: string): MoisRecord[] | null {
  const data = useChartExport()
  return useMemo(() => {
    if (!data) return null
    const rows = data[group]
    if (!rows?.length) return null
    if (!sort) return rows
    return [...rows].sort((a, b) => String(b[sort] ?? '').localeCompare(String(a[sort] ?? '')))
  }, [data, group, sort])
}

/**
 * The rows a screen should draw for one chart, or null to keep its fixture.
 *
 * A plain function rather than a hook: the frame resolves this outside its own
 * `PatientProvider`, where `usePatient()` would answer with the default chart
 * instead of the open one.
 */
export function chartRowsFor(chart: string, node: string): Record<string, string>[] | null {
  const data = chartExportFor(chart)
  /* no export behind this chart: the screen keeps its transcribed fixture */
  if (!data) return null
  const map = ROW_MAPS[node]
  /* An exported chart shows only its own records. A folder this chart has
     nothing in — no interventions, no admissions — is empty, the way MOIS
     draws it, rather than borrowing another patient's fixture rows. Showing
     someone else's data under this banner is the exact inconsistency having a
     real chart is meant to remove. */
  if (!map) return []
  const records = data[map.group]
  if (!records?.length) return []
  const sorted = map.sort
    ? [...records].sort((a, b) => String(b[map.sort!] ?? '').localeCompare(String(a[map.sort!] ?? '')))
    : records
  return rowsFromExport(node, sorted)
}

/** `chartRowsFor` for a component inside the PatientProvider. */
export function useChartRows(node: string): Record<string, string>[] | null {
  const patient = usePatient()
  return useMemo(() => chartRowsFor(patient.chart, node), [patient.chart, node])
}
