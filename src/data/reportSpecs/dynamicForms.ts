import { MOIS_TODAY, rsAge, rsDaysAgo, rsName, type ReportSpec, type RSContext, type RSField } from './types'

/* ============================================================================
   Report specs transcribed from manual article 304051 (Dynamic Forms).
   PROVENANCE: per spec below; the folder's rows and descriptions are
   304051 `a2d6ecd3`.

   Every window is the same shape: one navy date-range heading (Reported /
   Delivery Date Range (INCLUSIVE)) over a From line and a To line, each on
   its own row with the hint after To. Three of them keep the caption their
   DataWindow was cloned from, "Patient Procedure Report" (AEFI Duration
   Summary, Number of Births by Maternal Age, Number of Births by Month).

   The pages carry a conditional sub-title ("REPORT DATED RANGE NOT
   SPECIFIED" when a date is blank, "PERIOD <from> TO <to>" otherwise), so
   each builds its own page markup with `pages`. Sample rows are fictional,
   over the emulator's roster.
   ========================================================================= */

const isDate = (s: string) => /^\d{4}\.\d{2}\.\d{2}$/.test(s)

/** a From line and a To line under a navy heading */
const dateRange = (heading: string, hint: string, requiredFrom = false, fromValue = ''): RSField[] => [
  { kind: 'section', label: heading },
  { kind: 'text', id: 'from', label: 'From:', w: 80, value: fromValue, required: requiredFrom || undefined },
  { kind: 'text', id: 'to', label: 'To:', w: 80, hint },
]

/** both dates, or null when either is blank ("the date parameter will be ignored") */
function period(ctx: RSContext): { from: string; to: string } | null {
  const from = ctx.val('from')
  const to = ctx.val('to')
  return isDate(from) && isDate(to) ? { from, to } : null
}
const inPeriod = (ctx: RSContext, d: string) => { const p = period(ctx); return !p || (d >= p.from && d <= p.to) }

function page(title: string, sub: string, cols: string, th: string[], body: string[], footer: string[] = []): string[] {
  return [[
    '**MOIS TEST CLINIC**',
    `%TITLE%${title}`,
    '%RULE%',
    `%SUB%${sub}`,
    '%RULE%',
    ...th.map((h, i) => (i === th.length - 1 ? `${cols}\n%TH%${h}` : `${cols}\n%TR%${h}`)),
    ...body,
    ...footer,
  ].join('\n')]
}

const insOf = (p: { insurance?: string; insuranceBy?: string }) => (p.insurance ? `${p.insurance} (${p.insuranceBy || 'BC'})` : '')

/* --- AEFI (Adverse Events Following Immunization) samples ----------------- */
type Aefi = { chart: string; group: 'CHILDRENS' | 'ADULTS'; user: string; episode: string; reported: string; out: string[]; signed: boolean }
function aefiRows(ctx: RSContext): Aefi[] {
  const kids = ctx.patients.filter((p) => p.dob && Number(rsAge(p.dob)) < 18 && p.insurance).slice(0, 3)
  const adults = ctx.patients.filter((p) => p.dob && Number(rsAge(p.dob)) >= 18 && p.insurance).slice(6, 9)
  const outs = [['YES', 'UNRESOLVED', 'YES', 'UNRESOLVED'], ['YES', '', '', ''], ['', 'RESOLVED', '', 'YES'], ['YES', '', 'UNRESOLVED', '']]
  const users = ['ADMIN, MOIS', 'DUCHARME, AMARILYS']
  return [...kids.map((p) => ({ p, group: 'CHILDRENS' as const })), ...adults.map((p) => ({ p, group: 'ADULTS' as const }))]
    .map(({ p, group }, i) => ({
      chart: p.chart, group, user: users[i % 2]!, episode: i % 3 === 2 ? '2' : '1',
      reported: rsDaysAgo(9 + i * 23), out: outs[i % outs.length]!, signed: i % 2 === 1,
    }))
    .filter((a) => inPeriod(ctx, a.reported))
}

/** CHILDRENS / USER bands over the rows, as 304051 `944978f0` groups them */
function aefiBody(rows: Aefi[], cells: (a: Aefi) => string[], cols: string): string[] {
  const out: string[] = []
  for (const group of ['CHILDRENS', 'ADULTS'] as const) {
    const g = rows.filter((a) => a.group === group)
    if (!g.length) continue
    out.push(`%S%${group}`)
    for (const user of [...new Set(g.map((a) => a.user))]) {
      out.push(`%S%USER:   ${user}`, cols)
      for (const a of g.filter((x) => x.user === user)) out.push(`%TR%${cells(a).join('|')}`)
    }
  }
  return out
}

function aefiIdentity(ctx: RSContext, a: Aefi): string[] {
  const p = ctx.patients.find((x) => x.chart === a.chart)!
  return [rsName(p), p.dob, p.gender, insOf(p), p.chart, a.episode, a.reported]
}

const reportedSub = (ctx: RSContext) => {
  const p = period(ctx)
  return p ? `REPORTED DATE RANGE ${p.from} TO ${p.to}` : 'REPORT DATED RANGE NOT SPECIFIED'
}

/* --- births --------------------------------------------------------------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
type Birth = { facility: string; mother: string; delivered: string; motherAge: number }
function births(ctx: RSContext): Birth[] {
  const mothers = ctx.patients.filter((p) => p.gender === 'F' && p.dob && Number(rsAge(p.dob)) >= 18 && Number(rsAge(p.dob)) <= 44)
  const fac = ['HOSP', 'HOSP', 'EMPTY', 'HOSP', 'UHNBC']
  return mothers.slice(0, 9).map((m, i) => {
    const delivered = rsDaysAgo(14 + i * 37)
    return { facility: fac[i % fac.length]!, mother: m.chart, delivered, motherAge: Number(rsAge(m.dob)) - Math.floor((14 + i * 37) / 365) }
  }).filter((b) => inPeriod(ctx, b.delivered))
}
const periodSub = (ctx: RSContext) => { const p = period(ctx); return `PERIOD ${p?.from ?? ctx.val('from')} TO ${p?.to ?? ctx.val('to')}` }

export const specs: ReportSpec[] = [
  {
    folder: 'Dynamic Forms',
    name: 'AEFI Duration Summary',
    id: 'aefi-duration',
    title: 'Patient Procedure Report',
    width: 658,
    height: 530,
    labelW: 44,
    provenance: '304051 2e4ff9ba (window), 944978f0 (page)',
    inferred: 'The sub-title a filled date range prints ("REPORTED DATE RANGE <from> TO <to>") is inferred; the capture shows the blank-range wording. '
      + 'The ADULTS group band is inferred beside the captured CHILDRENS band.',
    fields: dateRange('Reported Date Range (INCLUSIVE)', '(if either date is blank, the date parameter will be ignored)'),
    pages: (ctx) => {
      const cols = '%COLS:18,8,6,13,6,8,8,9,9,8,7%'
      return page(
        `ADVERSE EVENT - AEFI SECTION 9 OUTCOME RESPONSE AS OF ${MOIS_TODAY}`,
        reportedSub(ctx),
        cols,
        ['|||||||||OUTCOME RESPONSE|',
          'PATIENT NAME|DOB|GENDER|INSURANCE|CHART|EPISODE NO.|REPORTED DATE|9 A LOCAL REACTION|9 B ALLERGIC|9 C NEUROLOGIC|9 D OTHER'],
        aefiBody(aefiRows(ctx), (a) => [...aefiIdentity(ctx, a), ...a.out], cols),
      )
    },
  },
  {
    folder: 'Dynamic Forms',
    name: 'AEFI Recommendation State',
    id: 'aefi-recommendation',
    width: 660,
    height: 529,
    labelW: 44,
    provenance: '304051 7fb43551 (window), a195c9aa (page)',
    inferred: 'The sub-title for a filled date range and for UNSIGNED / SIGNED ("… UNSIGNED RECORDS") is inferred from the captured "REPORT DATED RANGE NOT SPECIFIED ALL RECORDS".',
    fields: [
      ...dateRange('Reported Date Range (INCLUSIVE)', '(if either date is blank, the date parameter will be ignored)'),
      { kind: 'radio', id: 'signed', label: 'Signed State:', options: ['ALL', 'UNSIGNED', 'SIGNED'], value: 'ALL', column: true },
    ],
    pages: (ctx) => {
      const cols = '%COLS:20,9,7,15,7,10,11,21%'
      const state = ctx.val('signed') || 'ALL'
      const rows = aefiRows(ctx).filter((a) => state === 'ALL' || (state === 'SIGNED') === a.signed)
      return page(
        `ADVERSE EVENT - AEFI RECOMMENDATION STATE AS OF ${MOIS_TODAY}`,
        `${reportedSub(ctx)} ${state} RECORDS`,
        cols,
        ['PATIENT NAME|DOB|GENDER|INSURANCE|CHART|EPISODE NO.|REPORTED DATE|RECOMMENDATION STATE'],
        aefiBody(rows, (a) => [...aefiIdentity(ctx, a), a.signed ? 'SIGNED' : 'UNSIGNED'], cols),
      )
    },
  },
  {
    folder: 'Dynamic Forms',
    name: 'ASQ-Line List',
    id: 'asq-line-list',
    width: 662,
    height: 530,
    labelW: 44,
    provenance: '304051 8674395d (window), cc647362 (page)',
    inferred: 'The article\'s steps say to "Choose whether you want to report on unsigned, signed or all reports", but the captured window has no such option; none is drawn.',
    fields: dateRange('Delivery Date Range (INCLUSIVE)', '(dates are required)'),
    pages: (ctx) => {
      const kids = ctx.patients.filter((p) => p.dob && Number(rsAge(p.dob)) <= 5 && Number(rsAge(p.dob)) >= 1).slice(0, 6)
      const actions = ['Learning Activities Provider; Refer Primary Health Care Provider', 'Learning Activities Provider', 'Rescreen', 'Refer Early Intervention', 'No Action', 'Learning Activities Provider']
      const rows = kids.map((p, i) => {
        const date = rsDaysAgo(20 + i * 41)
        const age = Number(rsAge(p.dob))
        return { date, cells: [rsName(p), p.dob, p.gender, insOf(p), p.chart, date, `ASQ-${Math.max(2, age * 12)}`,
          String(35 + (i * 7) % 25), String(30 + (i * 11) % 30), String(40 + (i * 5) % 20), String(25 + (i * 13) % 35),
          String(45 + (i * 3) % 15), `ASQ SE-${Math.max(6, age * 12)}`, String(10 + (i * 17) % 60), actions[i]!] }
      }).filter((r) => inPeriod(ctx, r.date))
      return page(
        `ASQ LINE LIST AS OF ${MOIS_TODAY}`,
        periodSub(ctx),
        '%COLS:12,6,5,10,5,7,5,6,6,6,6,6,6,5,15%',
        ['PATIENT NAME|DOB|GENDER|INSURANCE|CHART|DATE|ASQ USED|COMMUN. SCORE|GROSS MOTOR|FINE MOTOR|PROBLEM SOLVING|PERSONAL SOCIAL|ASQ SE USED|ASQ SE SCORE|ACTION'],
        rows.map((r) => `%TR%${r.cells.join('|')}`),
        ['', `PATIENT RECORDS: ${rows.length}`, '%RULE%'],
      )
    },
  },
  {
    folder: 'Dynamic Forms',
    name: 'NOB Client List',
    id: 'nob-client-list',
    width: 658,
    height: 530,
    labelW: 44,
    provenance: '304051 411dd28a (window), none (page)',
    inferred: 'No Report Outcome capture exists: the page (title, PERIOD sub-title, mother / delivery / infant / facility columns) is inferred from the report name and its sister birth reports. '
      + 'From is salmon with a 0000.00.00 mask in the capture — the focused date field; kept as required, since "dates are required".',
    fields: dateRange('Delivery Date Range (INCLUSIVE)', '(dates are required)', true, '0000.00.00'),
    pages: (ctx) => {
      const rows = births(ctx).map((b, i) => {
        const m = ctx.patients.find((p) => p.chart === b.mother)!
        const baby = i % 2 ? 'FEMALE' : 'MALE'
        return `%TR%${rsName(m)}|${m.dob}|${insOf(m)}|${m.chart}|${b.delivered}|BABY ${baby}, ${m.last}|${b.facility}`
      })
      return page(
        `NOB CLIENT LIST AS OF ${MOIS_TODAY}`,
        periodSub(ctx),
        '%COLS:20,10,16,7,11,24,12%',
        ['MOTHER|DOB|INSURANCE|CHART|DELIVERY DATE|INFANT|FACILITY'],
        rows,
        ['', `CLIENT RECORDS: ${rows.length}`, '%RULE%'],
      )
    },
  },
  {
    folder: 'Dynamic Forms',
    name: 'Number of Births by Maternal Age',
    id: 'births-maternal-age',
    title: 'Patient Procedure Report',
    width: 662,
    height: 529,
    labelW: 44,
    provenance: '304051 1c46d76c (window), 16cd0c72 (page)',
    fields: dateRange('Delivery Date Range (INCLUSIVE)', '(dates are required)'),
    pages: (ctx) => {
      const cols = '%COLS:40,10,10,40%'
      const list = births(ctx)
      const body: string[] = []
      for (const fac of [...new Set(list.map((b) => b.facility))].sort()) {
        const ages = new Map<number, number>()
        for (const b of list.filter((x) => x.facility === fac)) ages.set(b.motherAge, (ages.get(b.motherAge) ?? 0) + 1)
        for (const [age, n] of [...ages].sort((a, b) => a[0] - b[0])) body.push(`%TR%${fac}|${age}|${n}|`)
        body.push(`%TR%|**${fac} Total:**|**${[...ages.values()].reduce((s, n) => s + n, 0)}**|`, cols)
      }
      return page(`MATERNAL BIRTH EVENTS AS OF ${MOIS_TODAY}`, periodSub(ctx), cols, ['FACILITY|AGE|COUNT|'], body, ['%RULE%'])
    },
  },
  {
    folder: 'Dynamic Forms',
    name: 'Number of Births by Month',
    id: 'births-by-month',
    title: 'Patient Procedure Report',
    width: 659,
    height: 529,
    labelW: 44,
    provenance: '304051 3c0bc2a2 (window), 3f5de9c1 (page)',
    fields: dateRange('Delivery Date Range (INCLUSIVE)', '(dates are required)'),
    pages: (ctx) => {
      const cols = '%COLS:38,10,30,10,12%'
      const list = births(ctx)
      const body: string[] = []
      for (const fac of [...new Set(list.map((b) => b.facility))].sort()) {
        const months = new Map<string, number>()
        for (const b of list.filter((x) => x.facility === fac)) months.set(b.delivered.slice(0, 7), (months.get(b.delivered.slice(0, 7)) ?? 0) + 1)
        for (const [ym, n] of [...months].sort()) body.push(`%TR%${fac}|${ym.slice(0, 4)}|${MONTHS[Number(ym.slice(5, 7)) - 1]}|${n}|`)
        body.push(`%TR%||**${fac} Total:**|**${[...months.values()].reduce((s, n) => s + n, 0)}**|`, cols)
      }
      return page(`BIRTH EVENTS BY MONTH AS OF ${MOIS_TODAY}`, periodSub(ctx), cols, ['FACILITY|YEAR|MONTH|COUNT|'], body, ['%RULE%'])
    },
  },
]
