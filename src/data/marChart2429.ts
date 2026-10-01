import { hasChartExport, type MoisRecord } from './charts'
import type { MarOrder } from './marOrders'

/* ============================================================================
   Chart 2429 (FLO AARONSON) — the MAR and the encounters the MAR's windows
   show, transcribed from the 2026-09-29 TRAINING captures c20–c28.

   Chart 2429 has no chart export, so the MAR folder would show only the
   stage's practice order. These are the rows TRAINING shows instead:

   · c20 (collapsed) / c21 (Expand All): three parent orders, each "for 1
     DOSE" with one ADMINISTERED child. The first order's medication is
     clipped by its column in c20 and ends "…" in c21's child row: only the
     visible text is known, so it is stored as c21 prints it. The 2025.04.14
     order has no medication and no dose on either row.
   · c24 (Encounter List): the chart's encounters, newest first, as the
     Select Encounter grid prints them. Two cells are clipped by their column
     (a provider "AKEHURST, WILLIAM (TELADOC", a service location "PRINCE
     GEORGE MATERNITY CLINIC"), kept as printed. Only one encounter's number
     is captured — 10061695, the 2026.05.28 14:00 visit c27 links to and c28
     details (Appt Length 6, Appt Status C, no diagnosis or service codes).
     INFERRED: every other row's id_encounter is a stage id (`2429-enc-n`),
     and c24's rows are the grid's first screen, not the whole list (its
     scroll bar is not in view).
   ========================================================================= */

const order = (id: string, orderDate: string, med: string, orderBy: string, detail: string, dose: string, units: string,
  event: { date: string; time: string; med: string; dose: string; units: string }): MarOrder => ({
  id, orderDate, orderTime: '', med, orderBy, detail,
  dosage: dose, dosageUnit: units, frequency: '', duration: '1', durationUnit: 'DOSE', route: '',
  signed: { action: '', note: '', on: '' }, created: '', modified: '',
  events: [{
    id: `${id}-1`, status: 'ADMINISTERED', date: event.date, time: event.time, med: event.med, generic: event.med,
    dose: event.dose, units: event.units, series: '', site: '', lot: '', by: '',
  }],
})

const ACONITUM = 'ACONITUM NAPELLUS 6 X, BARYTA MURIATICA 10 X, CARBO VEGETABILIS ...'

/** c20 / c21: the MAR as TRAINING lists it for chart 2429, newest first. */
export const MAR_2429: MarOrder[] = [
  order('2429-mar-1', '2025.05.06', ACONITUM, 'PCIPT 1 NURSE 6 PRG', '10,000 MG   for 1 DOSE', '10,000', 'MG',
    { date: '2025.05.06', time: '09:32', med: ACONITUM, dose: '10,000', units: 'MG' }),
  order('2429-mar-2', '2025.04.14', '', 'MEYER, DEVON', '    for 1 DOSE', '', '',
    { date: '2025.04.14', time: '11:03', med: '', dose: '', units: '' }),
  order('2429-mar-3', '2022.09.21', 'HPV', 'TECHNICAL SUPPORT', '0.5 ML   for 1 DOSE', '0.5', 'ML',
    { date: '2022.09.21', time: '14:35', med: 'HPV', dose: '0.5', units: 'ML' }),
]

/* c24's Select Encounter grid: Date · HR · MIN · Slots · Visit · Provider ·
   Service Location · Note */
const NURSE = 'PCIPT 1 NURSE 6 PRG'
const ENCOUNTER_ROWS: [string, string, string, string, string, string, string, string][] = [
  ['2026.09.10', '00', '00', '0', 'N', 'AKEHURST, WILLIAM (UPCC)', 'PRINCE GEORGE MATERNITY CLINIC', 'CARE PLANNING'],
  ['2026.06.08', '16', '30', '4', 'R', 'MAYER, OSCAR', 'TER HEALTH UNIT', 'PNC PRENATAL'],
  ['2026.06.04', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.06.01', '13', '00', '12', 'G', NURSE, '', 'COUNSELLING - HEALTH'],
  ['2026.05.28', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.05.26', '00', '00', '4', 'R', 'TECHNICAL SUPPORT', '', ''],
  ['2026.05.26', '00', '00', '4', 'R', 'TECHNICAL SUPPORT', '', ''],
  ['2026.05.21', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.05.14', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.05.07', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.04.30', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.04.27', '16', '00', '4', 'R', 'AMIN, MONA', '', 'ABDOMINAL PAIN'],
  ['2026.04.23', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.04.16', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.04.14', '14', '30', '4', 'R', 'MAYER, OSCAR', 'ATLIN HEALTH CENTRE', 'ABDOMINAL BLOATING'],
  ['2026.04.09', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.04.02', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.03.26', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.03.19', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.03.13', '00', '00', '0', 'N', 'AKEHURST, WILLIAM (TELADOC', 'PRINCE GEORGE MATERNITY CLINIC', 'CARE PLANNING'],
  ['2026.03.12', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.03.05', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.02.26', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.02.19', '14', '00', '6', 'LA', NURSE, 'UPCC PRG', 'INITIAL ASSESSMENT'],
  ['2026.02.17', '11', '00', '4', 'R', NURSE, 'CHT HEALTH UNIT', 'ABNORMAL BREATHING'],
]

/** c24 as encounter records (the chart export's field names), so the
    Encounter ID window (screens/PreferenceEncounterDialog.tsx) can read them. */
export const ENCOUNTERS_2429: MoisRecord[] = ENCOUNTER_ROWS.map(([date, hr, mn, slots, visit, provider, loc, note], i) => ({
  id_encounter: date === '2026.05.28' ? '10061695' : `2429-enc-${i + 1}`,
  dtm_appoint: date.replace(/\./g, '/'),
  num_appoint_hr: hr,
  num_appoint_min: mn,
  num_time_slots: slots,
  str_visit_code: visit,
  lkp_provider: provider,
  str_service_location: loc,
  str_appt_note: note,
  /* c28: the one encounter whose detail is captured */
  ...(date === '2026.05.28' ? { str_appt_status: 'C' } : {}),
}) as MoisRecord)

/** The MAR a chart shows in place of the stage's practice order, if its
    TRAINING capture is transcribed. */
export function capturedMar(chart: string): MarOrder[] | null {
  return chart === '2429' ? MAR_2429 : null
}

/** The encounters a chart without an export shows, if transcribed. Chart
    2429 now has one (charts/captured-2429.ts carries ENCOUNTERS_2429 as its
    `encounter` group), so its encounters come through the export and this
    lists nothing more for it — the pickers would otherwise show each twice. */
export function capturedEncounters(chart: string): MoisRecord[] {
  return chart === '2429' && !hasChartExport(chart) ? ENCOUNTERS_2429 : []
}
