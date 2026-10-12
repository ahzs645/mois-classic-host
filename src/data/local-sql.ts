import type { MoisChartExport, MoisRecord } from './charts/types'

export type LocalSqlTable = { columns: string[]; rows: MoisRecord[]; source: string; numericIds?: readonly string[] }
export type LocalSqlResult =
  | { ok: true; columns: string[]; rows: string[][]; source: string }
  | { ok: false; state: 'invalid' | 'restricted' | 'unavailable'; message: string }

/** Existing training examples, retained independently from imported chart records. */
const SAMPLE_TABLES: Record<string, LocalSqlTable> = {
  tdt_chart: {
    columns: ['chart_no', 'last_name', 'first_name', 'status'],
    rows: [['10018', 'DIABETES', 'BETTY', 'A'], ['10026', 'MORRISON', 'ASHLEE', 'A'], ['10046', 'WHO', 'LUCY', 'A'], ['10055', 'MOIS', 'SAM', 'A']]
      .map(([chart_no, last_name, first_name, status]) => ({ chart_no, last_name, first_name, status })),
    source: 'Built-in training example. These sample columns and rows do not describe the live database.',
  },
  tlp_visit_code: {
    columns: ['code', 'description'],
    rows: [['C', 'Consultation Visit'], ['F', 'Follow Up'], ['R', 'Routine'], ['TL', 'Telephone'], ['V', 'Virtual']]
      .map(([code, description]) => ({ code, description })),
    source: 'Built-in training example. This is not a live lookup query.',
  },
}

/**
 * Narrow integer-ID policy: the reference's form-header/encounter columns and
 * numeric ID predicates, plus database-map.md's Dynamic Form ID relationships
 * and bigint header/object types. This is not an inferred type for every id_*.
 */
const FORM_NUMERIC_IDS = {
  form_header: ['id_form_header', 'id_chart', 'id_encounter', 'id_form_group', 'id_form_type', 'id_author', 'id_creator'],
  form_encounter: ['id_form_encounter', 'id_form_header'],
  dform_header: ['id_dform_header', 'id_dform_window', 'id_object'],
  dform_data: ['id_dform_data', 'id_dform_header'],
} as const

/** Only documented table/group associations; no synthetic imported records. */
export function localSqlTables(chart: MoisChartExport | null): Record<string, LocalSqlTable> {
  const tables = { ...SAMPLE_TABLES }
  const groups = ['form_header', 'form_encounter', 'dform_header', 'dform_data'] as const
  for (const group of groups) {
    const rows = chart?.[group]
    if (!rows) continue
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
    // Empty groups carry no schema. Do not invent columns or report a live empty table.
    if (!columns.length) continue
    tables[`tdt_${group}`] = {
      columns, rows, numericIds: FORM_NUMERIC_IDS[group],
      source: 'Selected chart local records only (export and existing training/session data). Missing fields are not evidence that the database column is absent; this excludes other charts.',
    }
  }
  return tables
}

const identifier = '[a-z_][a-z0-9_]*'
const query = new RegExp(`^select\\s+(.*?)\\s+from\\s+(?:(${identifier})\\s*\\.\\s*)?(${identifier})(?:\\s+where\\s+(${identifier})\\s*=\\s*('(?:[^']|'')*'|-?\\d+(?:\\.\\d+)?))?(?:\\s+order\\s+by\\s+(${identifier})(?:\\s+(asc|desc))?)?(?:\\s+limit\\s+(\\d+))?\\s*$`, 'i')

/** A small SELECT grammar over local files. Never executes SQL or contacts MOIS. */
export function runLocalSelect(statement: string, tables: Record<string, LocalSqlTable>): LocalSqlResult {
  const text = statement.trim().replace(/;$/, '').trim()
  if (!/^select\s/i.test(text)) return {
    ok: false, state: 'invalid', message: 'Enter one SELECT statement. Multiple statements and changes are unavailable in this local editor.',
  }
  const parsed = query.exec(text)
  if (!parsed) return {
    ok: false, state: 'invalid', message: 'This local editor supports SELECT columns or *, FROM [mois.]table, optional equality WHERE, ORDER BY, and LIMIT. Joins, functions and other SQL require the full MOIS environment.',
  }
  const [, projection, schema, name, whereColumn, literal, orderColumn, direction, limit] = parsed
  const tableName = name!.toLowerCase()
  if ((schema && schema.toLowerCase() !== 'mois') || !/^(tdt_|tlp_)/.test(tableName)) return {
    ok: false, state: 'restricted', message: 'Only SELECT statements on mois data tables (tdt_) or lookup tables (tlp_) are permitted here.',
  }
  const table = tables[tableName]
  if (!table) return {
    ok: false, state: 'unavailable', message: `No local rows and column metadata are available for ${schema ? `${schema}.` : ''}${tableName}. This is not an empty-result check against the live database.`,
  }
  const columns = projection!.trim() === '*' ? table.columns : projection!.split(',').map((column) => column.trim().toLowerCase())
  const referenced = [...columns, ...(whereColumn ? [whereColumn.toLowerCase()] : []), ...(orderColumn ? [orderColumn.toLowerCase()] : [])]
  if (referenced.some((column) => !new RegExp(`^${identifier}$`, 'i').test(column))) return {
    ok: false, state: 'invalid', message: 'Select literal column names or *. Expressions and aliases are unavailable in this local editor.',
  }
  const missing = referenced.find((column) => !table.columns.includes(column))
  if (missing) return { ok: false, state: 'unavailable', message: `Column ${missing} is not available in this local dataset. Its absence here does not establish whether it exists in MOIS.` }
  const value = literal?.startsWith("'") ? literal.slice(1, -1).replace(/''/g, "'") : literal
  const whereKey = whereColumn?.toLowerCase()
  const orderKey = orderColumn?.toLowerCase()
  const integer = (text: string | undefined) => text !== undefined && /^-?\d+$/.test(text)
  const numericWhere = !!whereKey && !!table.numericIds?.includes(whereKey)
  const numericOrder = !!orderKey && !!table.numericIds?.includes(orderKey)
  if ((numericWhere && !integer(value)) || table.rows.some((row) =>
    [numericWhere ? whereKey : undefined, numericOrder ? orderKey : undefined]
      .some((key) => key && row[key] !== undefined && !integer(row[key])))) return {
    ok: false, state: 'unavailable', message: 'This local editor supports integer values for the documented numeric identifiers. Other numeric formats require the full MOIS environment.',
  }
  let rows = table.rows.filter((row) => !whereKey || (numericWhere
    ? row[whereKey] !== undefined && BigInt(row[whereKey]!) === BigInt(value!)
    : row[whereKey] === value))
  if (orderColumn) {
    const column = orderKey!
    rows = [...rows].sort((a, b) => {
      const first = a[column]; const second = b[column]
      const comparison = numericOrder
        ? first === undefined ? (second === undefined ? 0 : 1)
          : second === undefined ? -1
            : BigInt(first) < BigInt(second) ? -1 : BigInt(first) > BigInt(second) ? 1 : 0
        : String(first ?? '').localeCompare(String(second ?? ''))
      return comparison * (direction?.toLowerCase() === 'desc' ? -1 : 1)
    })
  }
  if (limit !== undefined) rows = rows.slice(0, Number(limit))
  return { ok: true, columns, rows: rows.map((row) => columns.map((column) => row[column] ?? '')), source: `${table.source} Documented form identifiers use integer comparison; other values use exported text.` }
}
