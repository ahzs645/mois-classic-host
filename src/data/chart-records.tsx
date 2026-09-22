import { useMemo } from 'react'
import { chartExportFor, useLoadedChart, type MoisChartExport, type MoisChartGroup, type MoisRecord } from './charts'
import { ROW_MAPS, rowsFromExport } from './charts/to-rows'
import { usePatient } from './patient-context'

export function useChartExport(): MoisChartExport | null {
  return useLoadedChart(usePatient().chart)
}

export function useChartRecords(group: MoisChartGroup, sort?: string): MoisRecord[] {
  const data = useChartExport()
  return useMemo(() => sortedRecords(data?.[group] ?? [], sort), [data, group, sort])
}

function sortedRecords(records: MoisRecord[], sort?: string): MoisRecord[] {
  return sort ? [...records].sort((a, b) => String(b[sort] ?? '').localeCompare(String(a[sort] ?? ''))) : records
}

export function recordsForNode(data: MoisChartExport | null, node: string): MoisRecord[] {
  const map = ROW_MAPS[node]
  if (!data || !map) return []
  const records = sortedRecords(data[map.group] ?? [], map.sort)
  return map.where ? records.filter(map.where) : records
}

/** Missing, loading and unmapped chart records all produce an empty list. */
export function chartRowsFor(chart: string, node: string): Record<string, string>[] {
  return rowsFromExport(node, recordsForNode(chartExportFor(chart), node))
}

export function useChartRows(node: string): Record<string, string>[] {
  const data = useChartExport()
  return useMemo(() => rowsFromExport(node, recordsForNode(data, node)), [data, node])
}

export function useNodeRecords(node: string): MoisRecord[] {
  const data = useChartExport()
  return useMemo(() => recordsForNode(data, node), [data, node])
}
