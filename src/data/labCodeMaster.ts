import { LAB_CODES, type LabCode } from './measureEntry'
import { LAB_CODE_MASTER_ROWS } from './labCodeMaster.generated'

/* ============================================================================
   Advanced Lookup Service ▸ Master Lab Code List — the list a Measures row's
   Code "…" opens.

   PROVENANCE: the 2026-09-29 TRAINING capture (chart 3924, Measures): Test ID
   | Category | Lab Code | Test Name | Units | System | Property | Time Aspect
   | LOINC, in lab-code order. The rows are the tlp_lab_code export's
   lab-coded codes (labCodeMaster.generated.ts, 2,283 of them), whose Test ID,
   Lab Code, Test Name, Units and LOINC agree with every captured row.

   The export has no Category, System, Property or Time Aspect. They are not
   LOINC's axes either: the capture leaves WAIST CIRCUMFERENCE (8280-0,
   ^Patient / Len / Pt in LOINC) blank in all three. So they are filled only
   where the capture shows them (CAPTURED below), and Category also from the
   Class the emulator's own LAB_CODES already knew; every other code leaves
   them empty rather than guessing.
   ========================================================================= */

export type MasterLabCode = {
  id: string
  category: string
  labCode: string
  test: string
  units: string
  system: string
  property: string
  time: string
  loinc: string
}

type Axes = Partial<Pick<MasterLabCode, 'category' | 'system' | 'property' | 'time'>>

/** The capture's page, WBCONLY … YMWP1, as it prints these four columns. */
const CAPTURED: Record<string, Axes> = {
  39421: { category: 'HEM/BC' },
  1984: { category: 'PHYSI' },
  1040: { category: 'MICRO' },
  84702: { category: 'MHSU' },
  54164: { category: 'PHYSI' },
  1982: { category: 'MICRO', system: 'SER', property: 'ACNC', time: 'PT' },
  39833: { category: 'MICRO' },
  39834: { category: 'MICRO' },
  39835: { category: 'MICRO' },
  22732: { category: 'BDYWGT.ATOM', system: '^PATIENT', property: 'MASS', time: 'PT' },
  458: { category: 'BDYWGT.MOLEC', system: '^PATIENT', property: 'MASS', time: 'PT' },
  34152: { category: 'BDYWGT.MOLEC', system: '^PATIENT', property: 'MASS', time: 'PT' },
  40036: { category: 'MICRO' },
  1044: { category: 'MICRO' },
  39836: { category: 'MICRO' },
  39837: { category: 'MICRO' },
  84680: {},
  1766: { category: 'MICRO' },
  1767: { category: 'MICRO' },
  83620: { category: 'PANEL' },
  1049: { category: 'MICRO', system: 'XXX', property: 'ACNC', time: 'PT' },
}

const known = new Map(LAB_CODES.map((c) => [c.code, c]))

const fromExport: MasterLabCode[] = LAB_CODE_MASTER_ROWS.map(([id, labCode, test, units, loinc]) => ({
  id, labCode, test, units, loinc,
  category: known.get(id)?.klass ?? '', system: '', property: '', time: '',
  ...CAPTURED[id],
}))

/* the stage's own measure codes the export carries without a lab code
   (OXYGEN SATURATION, HEART RATE, …) still have to be pickable; they sort
   ahead of the lettered codes, the way a blank sorts first in MOIS */
const listed = new Set(fromExport.map((c) => c.id))
const stageOnly: MasterLabCode[] = LAB_CODES.filter((c) => !listed.has(c.code)).map((c) => ({
  id: c.code, labCode: c.quick, test: c.test, units: c.units ?? '', loinc: '',
  category: c.klass, system: '', property: '', time: '',
}))

export const LAB_CODE_MASTER: MasterLabCode[] = [...stageOnly, ...fromExport].sort((a, b) =>
  (a.labCode < b.labCode ? -1 : a.labCode > b.labCode ? 1 : Number(a.id) - Number(b.id)))

/** the New Record row's code, as setDraftCode wants it */
export function toLabCode(row: MasterLabCode): LabCode {
  return known.get(row.id) ?? { code: row.id, klass: row.category, quick: row.labCode, test: row.test, units: row.units || undefined }
}

/** The master list with the open chart's own measure codes added — a code
    the export files without a lab code (INR BLD 363) or that only this
    chart uses (HBA1C) — so any Measures row's "…" lands on its code. A
    numeric code is a Test ID, anything else a lab code. */
export function withChartCodes(records: Record<string, string | undefined>[]): MasterLabCode[] {
  const have = new Set(LAB_CODE_MASTER.flatMap((c) => [c.id, c.labCode]))
  const added = new Map<string, MasterLabCode>()
  for (const r of records) {
    const code = (r.str_code ?? '').trim()
    if (!code || have.has(code) || added.has(code)) continue
    const numeric = /^\d+$/.test(code)
    added.set(code, {
      id: numeric ? code : '', labCode: numeric ? '' : code, test: r.str_description ?? '', units: r.str_units ?? '',
      loinc: r.str_loinic_num ?? '', category: r.str_class ?? '', system: '', property: '', time: '',
    })
  }
  if (!added.size) return LAB_CODE_MASTER
  return [...added.values(), ...LAB_CODE_MASTER].sort((a, b) =>
    (a.labCode < b.labCode ? -1 : a.labCode > b.labCode ? 1 : Number(a.id) - Number(b.id)))
}
