import { MOIS_TODAY, RS_USERS, rsDaysAgo, type ReportSpec, type RSContext } from './types'
import { addDays } from '../clock'

/* ============================================================================
   Report specs transcribed from manual article 304056 (Security/Access Audit).
   PROVENANCE: per spec below.

   All three print a page that is not one plain table (a patient or user
   block over the log, detail lines under each user), so each builds its
   own page markup with `pages`, laid out like the generic renderer's
   (clinic line, big title, one sub-title line).  The access log is
   fictional training data: the objects and notes are the ones the
   captures show (Chart Summary, w_encounter_01 … RETRIEVE DATA; Report List
   OPEN WINDOW, REPORT WINDOW, nvo_report_* "where id report medical2 = …").
   ========================================================================= */

const isDate = (s: string) => /^\d{4}\.\d{2}\.\d{2}$/.test(s)

/** the date range a "Date: … to …" line asks for; blanks mean the last three days */
function range(ctx: RSContext): { from: string; to: string; days: string[] } {
  const to = isDate(ctx.val('dateTo')) ? ctx.val('dateTo') : MOIS_TODAY
  const from = isDate(ctx.val('dateFrom')) ? ctx.val('dateFrom') : rsDaysAgo(2)
  const days: string[] = []
  /* the three latest days of the range carry activity */
  for (let d = to; d >= from && days.length < 3; d = addDays(d, -1)) days.unshift(d)
  return { from, to, days }
}

/** the heading every page opens on, as the generic renderer draws it */
const heading = (title: string, sub?: string) => [
  '**MOIS TEST CLINIC**',
  `%TITLE%${title}`,
  ...(sub ? [`%SUB%${sub}`] : []),
  '%RULE%',
]

/** 30 body lines to a page, the heading and column captions repeated */
function paged(head: string[], cols: string, th: string, body: string[], footer: string[] = []): string[] {
  const pages: string[] = []
  for (let i = 0; i < Math.max(1, body.length); i += 30) {
    const slice = body.slice(i, i + 30)
    pages.push([...head, cols, th, ...slice, ...(i + 30 >= body.length ? footer : [])].join('\n'))
  }
  return pages
}

/* --- Chart Access ---------------------------------------------------------- */
const CHART_OBJECTS: [string, string][] = [
  ['08:32:40', 'Chart Summary'], ['09:04:50', 'Chart Summary'], ['11:56:14', 'Encounter'],
  ['11:57:48', 'w_encounter_01'], ['11:58:11', 'Allergy'], ['14:53:06', 'Demographics'],
  ['15:01:57', 'Prescription'], ['15:02:03', 'Long Term Medication'], ['15:02:40', 'Measure'],
]

function chartAccessPages(ctx: RSContext): string[] {
  const chart = ctx.val('chart').split(' ')[0] ?? ''
  const p = ctx.patients.find((x) => x.chart === chart)
  const { from, to, days } = range(ctx)
  const users = ['ADMIN, MOIS', 'SHEWCHUK, LEAH', 'FRONT DESK, MOA']
  const body = p
    ? days.flatMap((d, di) => CHART_OBJECTS.slice(di % 2, di % 2 + 6 + di).map(([time, obj], i) =>
      `%TR%${d}|${time}|${obj}|${users[(i + di) % users.length]}|RETRIEVE DATA`))
    : []
  const ins = p ? [p.insuranceBy ?? '', p.insurance ?? '', p.dep || '00'].filter(Boolean).join('    ') : ''
  const head = [
    ...heading(`MEDICAL RECORD ACCESS AS OF ${MOIS_TODAY}`, `ACCESS FROM ${from} TO ${to}`),
    `%LINE:12,50,26,12%PATIENT:|**${p ? `${p.first}  ${p.last}` : ''}**|DOB: **${p?.dob ?? ''}**|SEX: **${p?.gender ?? ''}**`,
    `%LINE:12,50,38%INSURANCE:|**${ins}**|CHART NO.: ${p?.chart ?? chart}`,
    '%RULE%',
  ]
  return paged(head, '%COLS:12,10,24,22,32%', '%TH%DATE|TIME|OBJECT VIEWED|USER|NOTE', body)
}

/* --- User Access ------------------------------------------------------------ */
/** m/d/yyyy, the way this report prints its dates (304056 `00742e05`) */
const usDate = (d: string) => { const [y, m, dd] = d.split('.').map(Number); return `${m}/${dd}/${y}` }

function userAccessPages(ctx: RSContext): string[] {
  const user = ctx.val('user') || 'ADMIN, MOIS'
  const { from, to, days } = range(ctx)
  const who = ctx.patients.filter((p) => p.dob && p.status === 'A').slice(4, 10)
  const body = days.flatMap((d, di) => {
    const run = 10000006 + di
    const pt = who[di % who.length]
    const name = pt ? `${pt.last}, ${pt.first}` : ''
    return [
      ['08:23:46', 'Report List', '', 'OPEN WINDOW'],
      ['08:34:13', 'REPORT WINDOW', '', 'Report: Recalls / Reminders - Recall List'],
      ['08:39:41', 'REPORT WINDOW', '', 'Report: Recalls / Reminders - Reminder List'],
      ['09:02:17', 'nvo_report_image', '', `where id report medical2 = ${run}`],
      ['09:02:17', 'nvo_report_intervention', '', `where id report medical2 = ${run}`],
      ['09:02:17', 'nvo_report_patient', '', `where id report medical2 = ${run}`],
      ['09:02:17', 'nvo_report_measure', '', `where id report medical2 = ${run}`],
      ['10:15:02', 'Chart Summary', name, 'RETRIEVE DATA'],
      ['10:15:40', 'Demographics', name, 'RETRIEVE DATA'],
    ].map((r) => `%TR%${usDate(d)}|${r.join('|')}`)
  })
  const head = [
    ...heading(`USER ACTIVITY LOG AS OF ${MOIS_TODAY}`, `ACCESS FROM ${from} TO ${to}`),
    `%LINE:22,78%USER IDENTIFICATION:|**${user}**`,
    '%RULE%',
  ]
  return paged(head, '%COLS:10,9,21,20,40%', '%TH%DATE|TIME|OBJECT VIEWED|PATIENT|NOTE', body)
}

/* --- User Profile Report ------------------------------------------------------ */
type ProfileUser = {
  name: string; user: string; expiry: string; status: 'A' | 'I'; role: string
  ow: number; of: number; or: number; expertise: string; profiles: string[]; aliases: [string, string][]
}
/** fictional accounts, over the users the emulator's drop-downs already offer */
const PROFILE_USERS: ProfileUser[] = [
  { name: 'ADMIN, MOIS', user: 'admin', expiry: '', status: 'A', role: 'ADMIN', ow: 1, of: 6, or: 0, expertise: '', profiles: ['SYS ADMIN'], aliases: [['NHA', '1234']] },
  { name: 'ALICE, DR', user: 'dralice', expiry: '', status: 'A', role: 'PHYSICIAN', ow: 0, of: 0, or: 0, expertise: 'FAMILY PRACTICE', profiles: ['PHYSICIAN'], aliases: [] },
  { name: 'BEARDWOOD, WALTER', user: 'wbeardwood', expiry: '', status: 'A', role: 'PHYSICIAN', ow: 0, of: 1, or: 0, expertise: 'FAMILY PRACTICE', profiles: ['PHYSICIAN', 'SUPERUSER'], aliases: [['NHA', '40881'], ['MSP', '12345']] },
  { name: 'DUCHARME, AMARILYS', user: 'aducharme', expiry: '', status: 'A', role: 'NURSE', ow: 2, of: 0, or: 0, expertise: 'MENTAL HEALTH', profiles: ['NURSE'], aliases: [] },
  { name: 'FRONT DESK, MOA', user: 'frontdesk', expiry: '', status: 'A', role: 'MOA', ow: 0, of: 0, or: 0, expertise: '', profiles: ['MOA'], aliases: [] },
  { name: 'HOWSER, DOOGIE', user: 'dhowser', expiry: '2026.12.31', status: 'A', role: 'RESIDENT', ow: 0, of: 0, or: 1, expertise: 'PAEDIATRICS', profiles: ['RESIDENT'], aliases: [] },
  { name: 'MCPHILLIPS, MARIE', user: 'mmcphillips', expiry: '2024.08.30', status: 'I', role: 'MOA', ow: 0, of: 0, or: 0, expertise: '', profiles: ['MOA'], aliases: [] },
  { name: 'SHEWCHUK, LEAH', user: 'lshewchuk', expiry: '', status: 'A', role: 'PHYSICIAN', ow: 0, of: 0, or: 2, expertise: 'INTERNAL MEDICINE', profiles: ['PHYSICIAN'], aliases: [['LIFELABS', 'J40881']] },
]

function userProfilePages(ctx: RSContext): string[] {
  const status = ctx.val('status').charAt(0)
  const byRole = ctx.val('grouping') === 'By Role'
  const list = PROFILE_USERS.filter((u) => !status || u.status === status)
    .sort((a, b) => (byRole ? a.role.localeCompare(b.role) : 0) || a.name.localeCompare(b.name))
  const cols = '%COLS:24,14,11,6,19,9,9,8%'
  const body: string[] = []
  let role = ''
  for (const u of list) {
    if (byRole && u.role !== role) { role = u.role; body.push(`%S%ROLE: ${role}`, cols) }
    body.push(`%TR%${u.name}|${u.user}|${u.expiry}|${u.status}|${u.role}|${u.ow}|${u.of}|${u.or}`)
    body.push(`%LINE:14,13,73%|EXPERTISE:|${u.expertise}`)
    if (ctx.on('profiles')) {
      body.push('%LINE:14,86%|SECURITY PROFILES:')
      for (const pr of u.profiles) body.push(`%LINE:27,73%|${pr}`)
    }
    if (ctx.on('aliases') && u.aliases.length) {
      body.push('%LINE:14,86%|ALIASES:')
      for (const [src, v] of u.aliases) body.push(`%LINE:27,12,61%|${src}|${v}`)
    }
    body.push('%HR%', cols)
  }
  return paged(
    heading(`USER ACCOUNT REPORT AS OF ${MOIS_TODAY}`),
    cols,
    '%TH%FULL NAME|USERNAME|ACCOUNT EXPIRY|STATUS|ROLE|OVERRIDE WINDOW|OVERRIDE FUNCTION|OVERRIDE REPORT',
    body,
  )
}

export const specs: ReportSpec[] = [
  {
    folder: 'Security / Access Audit',
    name: 'Chart Access',
    id: 'chart-access',
    width: 670,
    height: 540,
    labelW: 60,
    provenance: '304056 e01936e6 (window), ac462a1e (page)',
    inferred: 'Chart No. is painted salmon in the capture with the caret in it — it may be the focus colour rather than a required mark. '
      + 'A blank Date range prints the last three days (the capture shows a filled range).',
    fields: [
      { kind: 'section', label: 'Patient' },
      { kind: 'text', id: 'chart', label: 'Chart No.:', w: 98, required: true, dots: { title: 'Patient Search', options: 'charts' } },
      { kind: 'section', label: 'Medical Record Access' },
      { kind: 'range', id: 'date', label: 'Date:', w: 84 },
    ],
    pages: chartAccessPages,
  },
  {
    folder: 'Security / Access Audit',
    name: 'User Access',
    id: 'user-access',
    width: 670,
    height: 540,
    labelW: 60,
    provenance: '304056 2199ded3 (window), 00742e05 (page)',
    inferred: 'A blank User Name prints the desktop user (ADMIN, MOIS); a blank Date range prints the last three days.',
    fields: [
      { kind: 'section', label: 'User' },
      { kind: 'select', id: 'user', label: 'User Name:', options: RS_USERS, w: 178 },
      { kind: 'section', label: 'Medical Record Access' },
      { kind: 'range', id: 'date', label: 'Date:', w: 84 },
    ],
    pages: userAccessPages,
  },
  {
    folder: 'Security / Access Audit',
    name: 'User Profile Report',
    id: 'user-profile',
    width: 670,
    height: 540,
    labelW: 50,
    provenance: '304056 b7ece08d (window), 788cc14b (page)',
    inferred: "The Status drop-down's entries (ACTIVE / INACTIVE) are from the article text (\"select either active or inactive\"); "
      + 'the capture shows it closed and blank. The By Role grouping band (ROLE: …) is not captured.',
    fields: [
      { kind: 'section', label: 'Selection Options' },
      { kind: 'select', id: 'status', label: 'Status:', options: ['', 'ACTIVE', 'INACTIVE'], w: 80, hint: '(Leave Blank For All)' },
      { kind: 'check', id: 'aliases', text: 'Show User Aliases', checked: true },
      { kind: 'check', id: 'profiles', text: 'Show Security Profiles', checked: true },
      { kind: 'radio', id: 'grouping', label: 'Grouping:', options: ['No Grouping', 'By Role'], value: 'No Grouping', column: true },
    ],
    pages: userProfilePages,
  },
]
