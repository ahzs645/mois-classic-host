import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useScreenReport } from '../../host/screen-state'
import { MOIS_TODAY } from '../../data/patients'
import { RS_PROVIDERS } from '../../data/reportSpecs/types'
import { daybookFor, RESOURCES, resourceDayFor, visitCodeRows, type Appointment } from '../../data/daybook'
import { PBBand, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, pbSlug, usePBInstrumentation } from '../../pb'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'

/* ============================================================================
   Hand-built Reports-module windows that do not fit the generic Selection
   Parameter form (screens/ReportSpecWindow.tsx). Each registers itself with
   registerAreaWindow and is named by its spec's `window`.

   Practice Management - Access ▸ Advance Appointment Search — the
   "Appointment Search" window, `report-params-advance-appt-search`.

   WHAT IT IS. Not a Selection Parameter form: one 798x671 window with a
   "Report Parameters" pane above (navy "Search Parameters:" — Search For
   (•) Provider ( ) Resource; Provider [BILL, DR ▼]; Start Date [2012.07.25];
   Day of Week ☑ All Days; on the right Visit Code [ ▼]; Appt. Length [3]
   (no. of slots: 1 slot = 5 minutes); Time of Day (•) Any Time of Day
   ( ) AM (before 12:00) ( ) PM (after 12:00) ( ) Desired Window — then navy
   "Result Parameters:" — # of Results [8] (stop searching when this number
   of available booking days are found); Search for # wks [26] (stop
   searching this many weeks after the start date); two dash notes), a
   "Search Results" pane below (Resource | Date | Day | Month | Start Time |
   End Time | Minutes Available), and Search (F2) / Cancel bottom-centre.
   The results list each free window in the provider's shifts: "the
   provider, date available, day of the week it is, the month, start time,
   end time and minutes available" (2012.07.25 | Wednesday | July 25 |
   08:00 | 12:00 | 240).

   PROVENANCE: 304054 `b27d8294` (the empty window) and `06170e81` (its
   results after Search).

   BEHAVIOUR. Search (or F2) walks the days from Start Date, keeps those the
   Day of Week setting allows, takes the provider's (resource's) shifts for
   that weekday, removes the booked appointments (the emulator's day book,
   data/daybook.ts, read-only: `daybookFor` / `resourceDayFor`, each slot 5
   minutes), clips to the Time of Day, and lists every free window at least
   Appt. Length slots long. It stops after `# of Results` days with a window
   ("available booking days", so 8 days can be 16 rows, as the capture's
   scrolling list shows) or `Search for # wks` weeks, whichever comes first;
   a blank one is disabled, as the note says.

   INFERRED (not captured or not described):
   · the shift templates below — fictional; the article only says the
     providers "must have scheduled shifts in the Scheduler Module";
   · the first grid column is captioned Resource before any search (the
     empty capture) and Provider / Resource after, by what was searched (the
     results capture says Provider);
   · Provider: relabels to Resource: and lists the resources when Resource
     is chosen;
   · unticking All Days shows a tick box per weekday (Mon–Fri ticked);
   · Desired Window shows From / To time fields beside it;
   · choosing a Visit Code copies its default slot count into Appt. Length;
   · with both result parameters blank the search stops at 52 weeks.

   ANCHORS (prefix `advance-appt-search`)
     window        host.mois.dialog.report-params-advance-appt-search
     radios        host.mois.command.advance-appt-search-search-for-provider / -resource
                   host.mois.command.advance-appt-search-time-any / -time-am / -time-pm / -time-window
     tick boxes    host.mois.command.advance-appt-search-all-days, -day-mon … -day-sun
     fields        host.mois.field.advance-appt-search-{provider|resource, start-date, visit-code,
                   appt-length, window-from, window-to, results, weeks}
     grid rows     host.mois.row.advance-appt-search-<n> (1-based)
     buttons       host.mois.command.advance-appt-search-search / -cancel
   `host.screen` carries report, searchFor, who (the chosen provider or
   resource, a list choice), timeOfDay, allDays, searched and results (the
   row count) — never typed values.
   ========================================================================= */

const NAVY = '#000080'
const P = 'advance-appt-search'

/* --- the fictional shift templates ----------------------------------------- */
type Shift = { days: number[]; blocks: [number, number][] }
const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h! * 60 + m! }
const MF = [1, 2, 3, 4, 5]
const SPLIT: [number, number][] = [[hm('08:00'), hm('12:00')], [hm('13:00'), hm('16:00')]]
const SHIFTS: Record<string, Shift> = {
  'BEARDWOOD, WALTER': { days: MF, blocks: SPLIT },
  'DUCHARME, AMARILYS': { days: [1, 2, 4], blocks: [[hm('09:00'), hm('12:00')], [hm('13:00'), hm('17:00')]] },
  'FAIRCHILD, NESRIN L': { days: [2, 3, 4, 5], blocks: [[hm('08:30'), hm('12:00')], [hm('13:00'), hm('16:30')]] },
  'HOWSER, DOOGIE': { days: [1, 2, 3, 4], blocks: SPLIT },
  'SHEWCHUK, LEAH': { days: [1, 3, 5], blocks: SPLIT },
  '1': { days: MF, blocks: [[hm('08:00'), hm('16:30')]] },
  '2': { days: MF, blocks: [[hm('08:00'), hm('16:30')]] },
  'TREATMENT ROOM': { days: MF, blocks: [[hm('09:00'), hm('12:00')], [hm('13:00'), hm('16:00')]] },
  'GROUP ROOM': { days: [2, 4], blocks: [[hm('13:00'), hm('16:00')]] },
}
const PROVIDERS = RS_PROVIDERS.filter(Boolean)

/* --- dates ------------------------------------------------------------------ */
const DAY = 86400000
/** the day book's day 0 (data/daybook.ts) */
const BOOK_ZERO = Date.UTC(2026, 7, 11)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_TICKS: [number, string][] = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']]
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function parseDate(s: string): number | null {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(s.trim())
  if (!m || m[1] === '0000') return null
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(t) ? null : t
}
const two = (n: number) => String(n).padStart(2, '0')
const clock = (min: number) => `${two(Math.floor(min / 60))}:${two(min % 60)}`
const parseClock = (s: string): number | null => {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(s.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

type Hit = { who: string; date: string; day: string; month: string; start: string; end: string; minutes: string }
type Criteria = {
  resource: boolean; who: string; start: string; allDays: boolean; days: Set<number>
  slots: number; time: 'any' | 'am' | 'pm' | 'window'; from: string; to: string; results: string; weeks: string
}

/** free windows = shift blocks minus booked appointments, clipped to the time of day */
function freeWindows(c: Criteria, t: number): [number, number][] {
  const d = new Date(t)
  const shift = SHIFTS[c.who]
  if (!shift || !shift.days.includes(d.getUTCDay())) return []
  const offset = Math.round((t - BOOK_ZERO) / DAY)
  const booked: Appointment[] = c.resource ? resourceDayFor(c.who, offset) : daybookFor(c.who, offset)
  const busy = booked.map((a) => { const s = Number(a.hr) * 60 + Number(a.mn); return [s, s + Math.max(1, Number(a.n) || 1) * 5] as [number, number] })
  let free: [number, number][] = shift.blocks.map((b) => [...b] as [number, number])
  for (const [bs, be] of busy) {
    free = free.flatMap(([fs, fe]): [number, number][] => (be <= fs || bs >= fe ? [[fs, fe]] : [[fs, bs], [be, fe]]))
      .filter(([fs, fe]) => fe > fs)
  }
  const clip: [number, number] = c.time === 'am' ? [0, 720] : c.time === 'pm' ? [720, 1440]
    : c.time === 'window' ? [parseClock(c.from) ?? 0, parseClock(c.to) ?? 1440] : [0, 1440]
  return free.map(([fs, fe]): [number, number] => [Math.max(fs, clip[0]), Math.min(fe, clip[1])])
    .filter(([fs, fe]) => fe - fs >= c.slots * 5)
}

function search(c: Criteria): Hit[] {
  const start = parseDate(c.start)
  if (start == null) return []
  const wantDays = c.results.trim() ? Math.max(0, Math.floor(Number(c.results) || 0)) : Infinity
  const weeks = c.weeks.trim() ? Math.max(0, Math.floor(Number(c.weeks) || 0)) : wantDays === Infinity ? 52 : 260
  const hits: Hit[] = []
  let found = 0
  for (let i = 0; i < weeks * 7 && found < wantDays; i++) {
    const t = start + i * DAY
    const d = new Date(t)
    if (!c.allDays && !c.days.has(d.getUTCDay())) continue
    const wins = freeWindows(c, t)
    if (!wins.length) continue
    found++
    const date = `${d.getUTCFullYear()}.${two(d.getUTCMonth() + 1)}.${two(d.getUTCDate())}`
    for (const [s, e] of wins) {
      hits.push({
        who: c.who, date, day: DAY_NAMES[d.getUTCDay()]!, month: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
        start: clock(s), end: clock(e), minutes: String(e - s),
      })
    }
  }
  return hits
}

/* --- the window ------------------------------------------------------------- */
const Section = ({ children }: { children: ReactNode }) => (
  <div style={{ color: NAVY, fontWeight: 700, padding: '4px 8px 3px', borderBottom: '1px solid #a0a0a0' }}>{children}</div>
)
const Line = ({ label, w = 90, align, children }: { label?: ReactNode; w?: number; align?: 'right'; children: ReactNode }) => (
  <div className="pb-row" style={{ gap: 8, padding: '1px 0', minHeight: 22, alignItems: 'flex-start' }}>
    <span className="pb-form__label" style={{ width: w, flex: 'none', paddingTop: 3, textAlign: align }}>{label}</span>
    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</span>
  </div>
)
const Hint = ({ children }: { children: ReactNode }) => <span style={{ whiteSpace: 'nowrap' }}>{children}</span>

function AdvanceAppointmentSearch({ close }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const [resource, setResource] = useState(false)
  const [provider, setProvider] = useState(PROVIDERS[0]!)
  const [room, setRoom] = useState(RESOURCES[0]!)
  const [start, setStart] = useState(MOIS_TODAY)
  const [allDays, setAllDays] = useState(true)
  const [days, setDays] = useState<Set<number>>(() => new Set(MF))
  const [visit, setVisit] = useState('')
  const [slots, setSlots] = useState('3')
  const [time, setTime] = useState<Criteria['time']>('any')
  const [from, setFrom] = useState('08:00')
  const [to, setTo] = useState('17:00')
  const [results, setResults] = useState('8')
  const [weeks, setWeeks] = useState('26')
  const [hits, setHits] = useState<Hit[]>([])
  const [searched, setSearched] = useState<null | 'provider' | 'resource'>(null)
  const [current, setCurrent] = useState(0)
  const who = resource ? room : provider

  useScreenReport({
    report: P, searchFor: resource ? 'resource' : 'provider', who: pbSlug(who), timeOfDay: time,
    allDays, searched: searched != null, results: hits.length,
  })

  const cmd = (id: string) => host?.anchor('command', `${P}-${id}`)
  const said = (id: string) => host?.report('command', { command: `${P}-${id}` })
  const field = (id: string) => `host.mois.field.${P}-${id}`

  const run = () => {
    setHits(search({
      resource, who, start, allDays, days, slots: Math.max(1, Math.floor(Number(slots) || 1)), time, from, to, results, weeks,
    }))
    setSearched(resource ? 'resource' : 'provider')
    setCurrent(0)
  }
  /* F2 runs the search wherever focus is in the window */
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2') return
      e.preventDefault()
      said('search')
      runRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const radio = (group: string, id: string, label: string, checked: boolean, pick: () => void) => (
    <PBRadio name={`${P}-${group}`} label={label} checked={checked} tutorialId={cmd(id)} onChange={() => { said(id); pick() }} />
  )
  const pickVisit = (code: string) => {
    setVisit(code)
    const row = visitCodeRows.find((v) => v.code === code)
    if (row && Number(row.slots) > 0) setSlots(row.slots)
  }

  return (
    <WorkspaceDialogFrame id={`report-params-${P}`} title="Appointment Search" width={798} height={671} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '12px 26px 0' }}>
        <div style={{ border: '1px solid #646464', background: 'var(--pb-face)', flex: 'none' }}>
          <PBBand>Report Parameters</PBBand>
          <Section>Search Parameters:</Section>
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', padding: '4px 12px 6px' }}>
            <div>
              <Line label="Search For:">
                <span className="pb-row" style={{ gap: 32 }}>
                  {radio('for', 'search-for-provider', 'Provider', !resource, () => setResource(false))}
                  {radio('for', 'search-for-resource', 'Resource', resource, () => setResource(true))}
                </span>
              </Line>
              <Line label={resource ? 'Resource:' : 'Provider:'}>
                {resource
                  ? <PBSelect w={178} options={RESOURCES} value={room} data-tutorial-id={field('resource')} onChange={(e) => setRoom(e.target.value)} />
                  : <PBSelect w={178} options={PROVIDERS} value={provider} data-tutorial-id={field('provider')} onChange={(e) => setProvider(e.target.value)} />}
              </Line>
              <Line label="Start Date:">
                <PBInput w={84} align="center" value={start} data-tutorial-id={field('start-date')} onChange={(e) => setStart(e.target.value)} />
              </Line>
              <Line label="Day of Week:">
                <PBCheckbox label="All Days" checked={allDays} tutorialId={cmd('all-days')} onChange={(v) => { said('all-days'); setAllDays(v) }} />
                {!allDays && (
                  <span className="pb-row" style={{ gap: 10, flexWrap: 'wrap', maxWidth: 270 }}>
                    {DAY_TICKS.map(([n, label]) => (
                      <PBCheckbox
                        key={n}
                        label={label}
                        checked={days.has(n)}
                        tutorialId={cmd(`day-${label.toLowerCase()}`)}
                        onChange={(v) => {
                          said(`day-${label.toLowerCase()}`)
                          setDays((s) => { const next = new Set(s); v ? next.add(n) : next.delete(n); return next })
                        }}
                      />
                    ))}
                  </span>
                )}
              </Line>
            </div>
            <div>
              <Line label="Visit Code:" w={82} align="right">
                <PBSelect w={70} options={['', ...visitCodeRows.map((v) => v.code)]} value={visit} data-tutorial-id={field('visit-code')} onChange={(e) => pickVisit(e.target.value)} />
              </Line>
              <Line label="Appt. Length:" w={82} align="right">
                <span className="pb-row" style={{ gap: 8 }}>
                  <PBInput w={50} align="center" value={slots} data-tutorial-id={field('appt-length')} onChange={(e) => setSlots(e.target.value)} />
                  <Hint>(no. of slots: 1 slot = 5 minutes)</Hint>
                </span>
              </Line>
              <Line label="Time of Day:" w={82} align="right">
                <span style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {radio('time', 'time-any', 'Any Time of Day', time === 'any', () => setTime('any'))}
                  {radio('time', 'time-am', 'AM (before 12:00)', time === 'am', () => setTime('am'))}
                  {radio('time', 'time-pm', 'PM (after 12:00)', time === 'pm', () => setTime('pm'))}
                  <span className="pb-row" style={{ gap: 8 }}>
                    {radio('time', 'time-window', 'Desired Window', time === 'window', () => setTime('window'))}
                    {time === 'window' && (
                      <>
                        <PBInput w={48} align="center" value={from} data-tutorial-id={field('window-from')} onChange={(e) => setFrom(e.target.value)} />
                        <span>to</span>
                        <PBInput w={48} align="center" value={to} data-tutorial-id={field('window-to')} onChange={(e) => setTo(e.target.value)} />
                      </>
                    )}
                  </span>
                </span>
              </Line>
            </div>
          </div>
          <Section>Result Parameters:</Section>
          <div style={{ padding: '6px 12px 6px 18px' }}>
            <Line label="# of Results:" w={110}>
              <span className="pb-row" style={{ gap: 8 }}>
                <PBInput w={50} align="center" value={results} data-tutorial-id={field('results')} onChange={(e) => setResults(e.target.value)} />
                <Hint>(stop searching when this number of available booking days are found)</Hint>
              </span>
            </Line>
            <Line label="Search for # wks:" w={110}>
              <span className="pb-row" style={{ gap: 8 }}>
                <PBInput w={50} align="center" value={weeks} data-tutorial-id={field('weeks')} onChange={(e) => setWeeks(e.target.value)} />
                <Hint>(stop searching this many weeks after the start date)</Hint>
              </span>
            </Line>
            <div style={{ paddingLeft: 136, lineHeight: '16px', marginTop: 2 }}>
              <div>- the search will continue until one of the two result parameters are met.</div>
              <div>- to disable a result parameter, simply delete the value in the field.</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, marginTop: 6, border: '1px solid #646464', background: '#fff' }}>
          <PBBand>Search Results</PBBand>
          <PBDataWindow
            rows={hits}
            current={current}
            onCurrentChange={setCurrent}
            empty=""
            zebra={false}
            rowTutorialId={(_, i) => `host.mois.row.${P}-${i + 1}`}
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[
              { key: 'who', header: searched === 'provider' ? 'Provider' : 'Resource', width: 126, headAlign: 'center' },
              { key: 'date', header: 'Date', width: 88, align: 'center' },
              { key: 'day', header: 'Day', width: 88, headAlign: 'center' },
              { key: 'month', header: 'Month', width: 115, headAlign: 'center' },
              { key: 'start', header: 'Start Time', width: 75, align: 'center' },
              { key: 'end', header: 'End Time', width: 72, align: 'center' },
              { key: 'minutes', header: <>Minutes<br />Available</>, width: 65, align: 'center' },
            ]}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0 10px', flex: 'none' }}>
          <DialogButton id={`${P}-search`} width={75} isDefault onClick={run}>Search (F2)</DialogButton>
          <DialogButton id={`${P}-cancel`} width={75} onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow(`report-params-${P}`, AdvanceAppointmentSearch)
