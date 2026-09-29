import { useEffect, useMemo, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import {
  appointmentsFor, billingPrograms, claimLines, entriesFor, hhmm, hours, isDuplicateClaim, LFP_TIME_PATIENT, LFP_TODAY,
  lfpRegisteredProviders, longDate, minutesOf, minutesOfEntry, overlapsFfs, round15, shiftStamp, TIME_CODES,
  useBillingPrograms, type ClaimLine, type TimeCode, type TimeEntry,
} from '../data/billingPrograms'
import type { UnsentClaim } from '../data/claims'
import { pad2 } from '../data/clock'
import { schedulerStore, stampOf } from '../data/schedulerStore'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { PBCheckbox, PBInput, PBRadio, PBSelect, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { Btn as ExchangeBtn } from './AdminExchangeKit'
import { Ask, BlueHead, Dim, useUnsentSink } from './billingProgramsKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   LFP time windows — Time Logger, Time Management, Time Entry and Time
   Claims (with the Time Claim Wizard and the duplicate-claim prompt).

   Reached from the Scheduler's day book (3166420: "Open the Schedule
   Module. Open the appropriate provider Daybook. From the Utilities menu,
   choose: Time Logger (Ctrl + Shift + L) / Time Entry (Ctrl + Shift + T)"),
   from Administration ▸ Utilities (3295289 `00c2fa04…` lists both there),
   and from Billing ▸ LFP Management ▸ Provider Time Summary (New Entry, and
   a double-click on a row).

   WINDOW IDS (area windows; `openWindowById`, menu `go.open(id)`,
   `host.mois.openUtility {window}`):
     time-logger       Time Logger                args { provider?, date? }
     time-entry        Time Management            args { provider?, date?, pick? }
     time-entry-edit   Time Entry (Edit Entries)  args { provider, date }
     lfp-time-claims   Time Claims                args { provider, date }
   With no provider the windows take the day book's (the Scheduler's current
   provider and day); with none of those, the first LFP-registered provider
   on the clinic's opening day.

   PROVENANCE (art. 3166420 unless noted):
   - Time Logger        `6ca56d5a…` (353 × 403): blue Provider / Date band,
     "Current Time Code" radios Direct Care / Indirect Care / Clinical Admin,
     Start (00:00) and Duration (hrs) "-", Note, Start Timer / Review Day.
   - Time Management    `b41eda10…` (528 × 865): "Time Management: Tuesday
     March 07, 2023"; Provider Profile drop-down; Date with < > and Today;
     Punch-In (start) Direct / Indirect / Clinical in green, Punch-Out
     (stop/save) Stop / Cancel; Time Code, Start Time, Stop Time, Duration
     (hr); (optional:note); Round to the nearest 15min; Edit Entries; the
     half-hour grid 7:00 → 17:00 with Time Entries (Direct / Indirect /
     Clinical, each captioned with its day total) and Schedule / Daybook
     Summary (Appt, ICBC, Work Safe, Out of Prov.); Totals: 2 Wk Rolling,
     Total (YTD), Clinical (YTD); View Big / Small; Create Claims.
   - Time Entry         `d565da6d…` (711 × 727): Provider Profile / Date
     band, Time Code / Start / Duration / Stop / Note, three icon buttons per
     row, a salmon new-entry row with a Time Code drop-down, Save / Cancel.
   - Time Claims + Time Claim Wizard   `6989e576…` (955 × 739, v02.31.11):
     the wizard's three groups and wording are transcribed; the Time Claims
     window behind it shows Provider, Date, the "Time Claim Review" band
     (Start, Stop, No. Services, Time Code, …ation of …S Appts, MSP Note)
     and the "Time Summary (minutes)" block, Create Claims / Cancel.
   - Duplicate claims: 3166420 "Duplicate LFP Time Claims" and 3852837
     "LFP FAQ" — the check matches patient, provider, date, fee code and
     units, never start / stop; Yes adds submission code D.

   INFERRED
   - The Time Claims columns the wizard hides: `Patient` (the patient the
     "first patient of the day" setting picks — the claim itself goes to the
     LFP Time Patient, TIME, LFP, PHN 9646191917, 3166420's 2026 table) and
     `Duration of FFS Appts`.
   - The duplicate prompt's wording and its Yes / No buttons ("select Yes
     to mark the claim as a duplicate").
   - Timer semantics: Start Timer stamps the typed Start (or the clock);
     Stop Timer the clock, and never less than one 15-minute unit after the
     start, so a practice run of a few seconds still records a block.
   - The Time Entry row icons (insert a row / continue from this row / clear
     the row): the capture shows three icons with no captions.
   - Grid colours for Clinical time and for a conflict (a red rule on an
     entry that overlaps a Fee For Service appointment, 3166420 "LFP and FFS
     billing together").

   REPORTED (`host.screen.*`): timer (running|stopped), timeCode,
   timeEntries (the day's count), timeClaims, duplicatePrompt, subCode.
   ========================================================================= */

const GREEN = '#1f8a2c'
const FILL: Record<TimeCode, string> = { direct: '#b9dfc0', indirect: '#aebbd6', clinical: '#e7d49a' }

/** The provider and day a time window opens on. */
function useTimeTarget(args: Record<string, unknown>) {
  const s = useBillingPrograms()
  const sched = schedulerStore.get().current
  const registered = lfpRegisteredProviders(s)
  const provider = String(args.provider ?? '')
    || (sched && registered.includes(sched.provider) ? sched.provider : '')
    || registered[0] || ''
  const date = String(args.date ?? '') || (sched ? stampOf(sched.offset) : LFP_TODAY)
  return { provider, date, registered }
}

const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }

/** AdminExchangeKit's Btn, 74 wide unless given. */
const Btn = ({ width = 74, ...rest }: ComponentProps<typeof ExchangeBtn>) => <ExchangeBtn width={width} {...rest} />

/* --- Time Logger --------------------------------------------------------------- */

type Timer = { provider: string; date: string; code: TimeCode; start: number } | null
const TIMER_KEY = 'lfp:timer'

export function TimeLoggerWindow({ args, close, open }: AreaWindowProps) {
  const { provider, date } = useTimeTarget(args)
  const [timer, setTimer] = useSessionState<Timer>(TIMER_KEY, null)
  const [code, setCode] = useState<TimeCode>(timer?.code ?? 'direct')
  const [start, setStart] = useState(timer ? hhmm(timer.start) : '00:00')
  const [note, setNote] = useState('')
  const [last, setLast] = useState<TimeEntry | null>(null)
  const running = !!timer && timer.provider === provider && timer.date === date
  /* the Duration (hrs) box counts while the timer runs */
  const [, tick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => tick((n) => n + 1), 15_000)
    return () => window.clearInterval(id)
  }, [running])
  useScreenReport({ timer: running ? 'running' : 'stopped', timeCode: code, logged: !!last })

  const toggle = () => {
    if (!running) {
      const typed = minutesOf(start)
      const at = !Number.isNaN(typed) && start !== '00:00' ? typed : nowMinutes()
      setStart(hhmm(at))
      setTimer({ provider, date, code, start: at })
      return
    }
    const t = timer!
    const stop = Math.max(nowMinutes(), t.start + 15)
    const e = billingPrograms.addTimeEntry({ provider, date, code: t.code, start: hhmm(t.start), stop: hhmm(Math.min(stop, 23 * 60 + 59)), note })
    setLast(e)
    setTimer(null)
    setNote('')
  }

  return (
    <WorkspaceDialogFrame id="time-logger" title="Time Logger" width={353} height={403} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', background: '#fff' }}>
        <BlueHead style={{ padding: '8px 14px' }}>
          <div className="pb-row"><Dim>Provider</Dim><span className="pb-row__spacer" /><Dim style={{ width: 86 }}>Date</Dim></div>
          <div className="pb-row" style={{ paddingTop: 2 }}><span>{provider || '-'}</span><span className="pb-row__spacer" /><span style={{ width: 86 }}>{date}</span></div>
        </BlueHead>
        <div style={{ padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Dim>Current Time Code</Dim>
          {TIME_CODES.map((c) => (
            <PBRadio
              key={c.id}
              name="time-logger-code"
              label={c.logger}
              checked={code === c.id}
              disabled={running}
              onChange={() => setCode(c.id)}
              tutorialId={`host.mois.field.time-logger-${pbSlug(c.logger)}`}
            />
          ))}
          <div className="pb-row" style={{ paddingTop: 6 }}><Dim>Start</Dim><span className="pb-row__spacer" /><Dim style={{ width: 100 }}>Duration (hrs)</Dim></div>
          <div className="pb-row">
            <PBInput w={68} align="center" value={start} readOnly={running} onChange={(e) => setStart(e.target.value)} data-tutorial-id="host.mois.field.time-logger-start" />
            <span className="pb-row__spacer" />
            <span style={{ width: 100 }}>{running ? hours(Math.max(0, nowMinutes() - timer!.start)) : last ? hours(minutesOfEntry(last)) : '-'}</span>
          </div>
          <Dim style={{ paddingTop: 4 }}>Note</Dim>
          <PBInput w="100%" value={note} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.time-logger-note" />
        </div>
        <div className="pb-row" style={{ padding: '14px 14px', marginTop: 'auto' }}>
          <Btn id="time-logger-timer" width={96} onClick={toggle} disabled={!provider}>{running ? 'Stop Timer' : 'Start Timer'}</Btn>
          <span className="pb-row__spacer" />
          <Btn id="time-logger-review-day" width={96} onClick={() => open('time-entry', { provider, date })}>Review Day</Btn>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Time Management ------------------------------------------------------------ */

type Punch = { code: TimeCode } | null

export function TimeManagementWindow({ args, close, open }: AreaWindowProps) {
  const s = useBillingPrograms()
  const target = useTimeTarget(args)
  const [provider, setProvider] = useState(target.provider)
  const [date, setDate] = useState(target.date)
  const [punch, setPunch] = useState<Punch>(null)
  const [startTime, setStartTime] = useState('')
  const [stopTime, setStopTime] = useState('00:00')
  const [note, setNote] = useState('')
  const [round, setRound] = useState(true)
  const [big, setBig] = useState(false)
  const [problem, setProblem] = useState('')

  const entries = entriesFor(s, provider, date)
  const appts = useMemo(() => appointmentsFor(s, provider, date), [s, provider, date])
  const providers = target.registered.includes(provider) || !provider ? target.registered : [provider, ...target.registered]
  useScreenReport({ punchedIn: punch ? punch.code : null, timeEntries: entries.length, provider: pbSlug(provider), date, view: big ? 'big' : 'small', prompt: problem ? 'time-entry-problem' : null })

  const clock = (typed: string) => {
    const t = minutesOf(typed)
    const at = Number.isNaN(t) || typed === '00:00' ? nowMinutes() : t
    return round ? round15(at) : at
  }
  const punchIn = (code: TimeCode) => {
    setPunch({ code })
    setStartTime(hhmm(clock(startTime)))
  }
  const punchOut = () => {
    if (!punch) return
    const a = minutesOf(startTime)
    const b = clock(stopTime)
    if (Number.isNaN(a) || b <= a) { setProblem('The Stop Time must be after the Start Time.'); return }
    /* "MOIS is designed to prevent overlapping time entries" (3166420 Tips) */
    if (entries.some((e) => minutesOf(e.start) < b && minutesOf(e.stop) > a)) { setProblem('This time overlaps an existing time entry.'); return }
    billingPrograms.addTimeEntry({ provider, date, code: punch.code, start: hhmm(a), stop: hhmm(b), note })
    setPunch(null); setStartTime(''); setStopTime('00:00'); setNote('')
  }

  /* totals: the day, the two weeks to date, the year to date */
  const mins = (list: TimeEntry[], code?: TimeCode) => list.filter((e) => !code || e.code === code).reduce((n, e) => n + minutesOfEntry(e), 0)
  const mine = s.entries.filter((e) => e.provider === provider)
  const rolling = mine.filter((e) => e.date > shiftStamp(date, -14) && e.date <= date)
  const ytd = mine.filter((e) => e.date.slice(0, 4) === date.slice(0, 4) && e.date <= date)

  const step = big ? 15 : 30
  const slots = Array.from({ length: ((17 * 60 + 30) - 7 * 60) / step + 1 }, (_, i) => 7 * 60 + i * step)
  const covers = (e: { start: number; stop: number }, t: number) => e.start < t + step && e.stop > t
  const entrySpans = entries.map((e) => ({ e, start: minutesOf(e.start), stop: minutesOf(e.stop), ffs: overlapsFfs(e, appts) }))

  const cellStyle: CSSProperties = { borderRight: '1px solid #c8c8c8', height: big ? 14 : 21, position: 'relative' }
  const timeCol = (t: number) => (t % 60 === 0 ? `${Math.floor(t / 60)}:00` : `:${pad2(t % 60)}`)

  return (
    <WorkspaceDialogFrame id="time-entry" title={`Time Management: ${longDate(date)}`} width={528} height={865} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, margin: 6, border: '1px solid #a0a0a0', background: '#fff' }}>
        {/* provider + date */}
        <div className="pb-row" style={{ gap: 10, padding: '6px 8px', alignItems: 'flex-end', flex: 'none' }}>
          <div>
            <Dim>Provider Profile</Dim>
            <div data-tutorial-id="host.mois.field.time-provider-profile">
              <PBSelect w={236} options={providers.length ? providers : ['']} value={provider} onChange={(e) => { setProvider(e.target.value); setPunch(null) }} />
            </div>
          </div>
          <div>
            <Dim>Date</Dim>
            <div className="pb-row" style={{ gap: 2 }}>
              <Btn id="time-date-previous" width={20} onClick={() => setDate((d) => shiftStamp(d, -1))}>&lt;</Btn>
              <PBInput w={76} align="center" value={date} onChange={(e) => setDate(e.target.value)} data-tutorial-id="host.mois.field.time-date" />
              <Btn id="time-date-next" width={20} onClick={() => setDate((d) => shiftStamp(d, 1))}>&gt;</Btn>
              <Btn id="time-date-today" width={90} onClick={() => setDate(LFP_TODAY)}>Today</Btn>
            </div>
          </div>
        </div>

        {/* punch in / out */}
        <div style={{ background: '#dfe9f8', borderTop: '1px solid #a0a0a0', borderBottom: '1px solid #a0a0a0', padding: '4px 8px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 6 }}>
            <b>Punch-In</b><Dim>(start)</Dim><span style={{ width: 110 }} />
            <b>Punch-Out</b><Dim>(stop/save)</Dim>
          </div>
          <div className="pb-row" style={{ gap: 6, paddingTop: 2 }}>
            {TIME_CODES.map((c) => (
              <Btn key={c.id} id={`time-punch-${c.id}`} onClick={() => punchIn(c.id)} disabled={!!punch || !provider} style={{ color: GREEN }}>{c.label}</Btn>
            ))}
            <span style={{ width: 4 }} />
            <Btn id="time-punch-stop" onClick={punchOut} disabled={!punch}>Stop</Btn>
            <Btn id="time-punch-cancel" onClick={() => { setPunch(null); setStartTime('') }} disabled={!punch}>Cancel</Btn>
          </div>
          <div className="pb-row" style={{ gap: 6, paddingTop: 4 }}>
            {['Time Code', 'Start Time', 'Stop Time', 'Duration (hr)'].map((h) => <Dim key={h} style={{ width: 76 }}>{h}</Dim>)}
          </div>
          <div className="pb-row" style={{ gap: 6 }}>
            <PBInput w={76} readOnly value={punch ? TIME_CODES.find((c) => c.id === punch.code)!.label : ''} data-tutorial-id="host.mois.field.time-code" />
            <PBInput w={76} value={startTime} onChange={(e) => setStartTime(e.target.value)} data-tutorial-id="host.mois.field.time-start" />
            <PBInput w={76} value={stopTime} onChange={(e) => setStopTime(e.target.value)} data-tutorial-id="host.mois.field.time-stop" />
            <PBInput w={76} readOnly value={punch && !Number.isNaN(minutesOf(startTime)) && !Number.isNaN(minutesOf(stopTime)) && minutesOf(stopTime) > minutesOf(startTime) ? hours(minutesOf(stopTime) - minutesOf(startTime)) : ''} />
          </div>
          <div style={{ paddingTop: 3 }}>
            <PBInput w={316} value={note} placeholder="(optional:note)" onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.time-note" />
          </div>
          <div className="pb-row" style={{ paddingTop: 4 }}>
            <PBCheckbox label="Round to the nearest 15min" checked={round} onChange={setRound} tutorialId="host.mois.field.time-round" />
            <span className="pb-row__spacer" />
            <Btn id="time-edit-entries" width={110} onClick={() => open('time-entry-edit', { provider, date })}>Edit Entries</Btn>
          </div>
        </div>

        {/* the day */}
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }} data-tutorial-id="host.mois.field.time-grid">
          <div style={{ display: 'grid', gridTemplateColumns: '58px repeat(3, 1fr) repeat(4, 1fr)', background: '#c9dcf6', textAlign: 'center', flex: 'none', paddingRight: 14 }}>
            <span />
            <b style={{ gridColumn: 'span 3' }}>Time Entries</b>
            <b style={{ gridColumn: 'span 4' }}>Schedule / Daybook Summary</b>
            <Dim style={{ textAlign: 'left', paddingLeft: 4 }}>Time</Dim>
            {TIME_CODES.map((c) => <Dim key={c.id}>{c.label}<br />{mins(entries, c.id) ? hours(mins(entries, c.id)) : '-'}</Dim>)}
            <Dim>Appt</Dim><Dim>ICBC</Dim><Dim>Work<br />Safe</Dim><Dim>Out<br />of Prov.</Dim>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'scroll' }}>
            {slots.map((t) => (
              <div key={t} style={{ display: 'grid', gridTemplateColumns: '58px repeat(3, 1fr) repeat(4, 1fr)', borderBottom: t % 60 === 30 || big ? '1px solid #e0e0e0' : '1px solid #f2f2f2' }}>
                <span style={{ ...cellStyle, textAlign: 'right', paddingRight: 8, color: '#555' }}>{timeCol(t)}</span>
                {TIME_CODES.map((c) => {
                  const hit = entrySpans.find((x) => x.e.code === c.id && covers(x, t))
                  return (
                    <span key={c.id} style={{ ...cellStyle, background: hit ? FILL[c.id] : undefined, boxShadow: hit?.ffs ? 'inset 0 0 0 2px #e00000' : undefined }}
                      title={hit ? `${hit.e.start}-${hit.e.stop}${hit.e.claimed ? ' (billed)' : ''}` : undefined} />
                  )
                })}
                {(['appt', 'icbc', 'wcb', 'oop'] as const).map((col) => {
                  const a = appts.find((x) => x.column === col && covers(x, t))
                  return <span key={col} style={{ ...cellStyle, background: a ? (col === 'appt' ? '#000' : '#7d7d7d') : '#e6e6e6' }} title={a ? a.name : undefined} />
                })}
              </div>
            ))}
          </div>
        </div>

        {/* totals */}
        <div style={{ borderTop: '1px solid #a0a0a0', padding: '4px 10px 6px', flex: 'none' }}>
          <div className="pb-row"><Dim>Totals:</Dim><span className="pb-row__spacer" />
            <Dim>View:</Dim>
            <span style={{ width: 8 }} />
            <PBRadio name="time-view" label="Big" checked={big} onChange={() => setBig(true)} tutorialId="host.mois.field.time-view-big" />
            <span style={{ width: 8 }} />
            <PBRadio name="time-view" label="Small" checked={!big} onChange={() => setBig(false)} tutorialId="host.mois.field.time-view-small" />
          </div>
          <div className="pb-row" style={{ alignItems: 'flex-end' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 90px', rowGap: 2 }}>
              <Dim>2 Wk Rolling</Dim><Dim>Total (YTD)</Dim><Dim>Clinical (YTD)</Dim>
              <span>{hours(mins(rolling))}</span><span>{hours(mins(ytd))}</span><span>{mins(ytd, 'clinical') ? hours(mins(ytd, 'clinical')) : '-'}</span>
            </div>
            <span className="pb-row__spacer" />
            <Btn id="time-create-claims" width={110} onClick={() => open('lfp-time-claims', { provider, date })} disabled={!provider}>Create Claims</Btn>
          </div>
        </div>
      </div>
      {problem && (
        <Ask id="time-entry-problem" title="Time Management" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => setProblem('')}>
          {problem}
        </Ask>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- Time Entry (Edit Entries) ------------------------------------------------- */

type EditRow = { id: string; code: TimeCode | ''; start: string; stop: string; note: string; claimed?: string }

export function TimeEntryEditWindow({ args, close, open }: AreaWindowProps) {
  const s = useBillingPrograms()
  const provider = String(args.provider ?? '')
  const date = String(args.date ?? LFP_TODAY)
  const [rows, setRows] = useState<EditRow[]>(() => [
    ...entriesFor(s, provider, date).map((e) => ({ id: e.id, code: e.code, start: e.start, stop: e.stop, note: e.note, claimed: e.claimed })),
    { id: '', code: '', start: '', stop: '', note: '' },
  ])
  const [cur, setCur] = useState(rows.length - 1)
  const [problem, setProblem] = useState('')
  const back = () => { close(); open('time-entry', { provider, date }) }
  useScreenReport({ timeEntries: rows.filter((r) => r.code).length, row: `time-entry-${cur}`, prompt: problem ? 'time-entry-edit-problem' : null })

  const patch = (i: number, p: Partial<EditRow>) => setRows((list) => {
    const next = list.map((r, j) => (j === i ? { ...r, ...p } : r))
    /* continuous entry: filling the blank row opens another under it */
    if (next[next.length - 1]!.code) next.push({ id: '', code: '', start: next[next.length - 1]!.stop, stop: '', note: '' })
    return next
  })
  const insert = (i: number) => setRows((list) => [...list.slice(0, i), { id: '', code: '', start: '', stop: list[i]?.start ?? '', note: '' }, ...list.slice(i)])
  const cont = (i: number) => setRows((list) => [...list.slice(0, i + 1), { id: '', code: list[i]?.code ?? '', start: list[i]?.stop ?? '', stop: '', note: '' }, ...list.slice(i + 1)])
  const clear = (i: number) => setRows((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [{ id: '', code: '', start: '', stop: '', note: '' }]))

  const save = () => {
    const filled = rows.filter((r) => r.code)
    for (const r of filled) {
      const a = minutesOf(r.start); const b = minutesOf(r.stop)
      if (Number.isNaN(a) || Number.isNaN(b) || b <= a) { setProblem(`Check the Start and Stop of the ${r.code} entry at ${r.start || '(blank)'}.`); return }
    }
    const sorted = [...filled].sort((x, y) => minutesOf(x.start) - minutesOf(y.start))
    for (let i = 1; i < sorted.length; i++) {
      if (minutesOf(sorted[i]!.start) < minutesOf(sorted[i - 1]!.stop)) { setProblem('Time entries may not overlap.'); return }
    }
    billingPrograms.replaceDay(provider, date, filled.map((r) => ({ id: r.id, provider, date, code: r.code as TimeCode, start: r.start, stop: r.stop, note: r.note, claimed: r.claimed })))
    back()
  }

  const cell: CSSProperties = { borderRight: '1px solid #d8d8d8', padding: '2px 4px', display: 'flex', alignItems: 'center' }
  const icon = (id: string, glyph: string, title: string, onClick: () => void, disabled?: boolean) => (
    <Btn id={id} width={26} onClick={onClick} disabled={disabled} style={{ height: 22, padding: 0 }}><span title={title}>{glyph}</span></Btn>
  )

  return (
    <WorkspaceDialogFrame id="time-entry-edit" title={`Time Entry: ${longDate(date)}`} width={711} height={727} controls={false} onClose={back}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '10px 12px 0', border: '1px solid #a0a0a0', background: '#fff' }}>
        <BlueHead style={{ padding: '6px 10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <Dim>Provider Profile</Dim><Dim>Date</Dim>
            <b>{provider}</b><b>{longDate(date)}</b>
          </div>
        </BlueHead>
        <div style={{ display: 'grid', gridTemplateColumns: '98px 64px 66px 64px 1fr 92px', background: '#c9dcf6', color: '#6d6d6d', padding: '2px 0', flex: 'none', textAlign: 'center' }}>
          <span>Time Code</span><span>Start</span><span>Duration</span><span>Stop</span><span>Note</span><span />
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }} data-tutorial-id="host.mois.field.time-entries">
          {rows.map((r, i) => {
            const locked = !!r.claimed
            const dur = !Number.isNaN(minutesOf(r.start)) && !Number.isNaN(minutesOf(r.stop)) && minutesOf(r.stop) > minutesOf(r.start) ? hours(minutesOf(r.stop) - minutesOf(r.start)) : ''
            const bg = i === cur ? '#f4c6bd' : i % 2 ? '#ececec' : '#fff'
            return (
              <div key={i} onMouseDown={() => setCur(i)} data-tutorial-id={`host.mois.row.time-entry-${i}`}
                style={{ display: 'grid', gridTemplateColumns: '98px 64px 66px 64px 1fr 92px', background: bg, minHeight: 28, borderBottom: '1px solid #e0e0e0' }}>
                <span style={cell}>
                  {locked
                    ? <span title="Billed — delete the unsent claim to edit">{TIME_CODES.find((c) => c.id === r.code)?.label} 🔒</span>
                    : (
                      <span data-tutorial-id={`host.mois.field.time-entry-code-${i}`}>
                        <PBSelect w={86} options={[{ value: '', label: '' }, ...TIME_CODES.map((c) => ({ value: c.id, label: c.label }))]} value={r.code} onChange={(e) => patch(i, { code: e.target.value as TimeCode })} />
                      </span>
                    )}
                </span>
                <span style={cell}><PBInput w={54} align="center" readOnly={locked} value={r.start} onChange={(e) => patch(i, { start: e.target.value })} data-tutorial-id={`host.mois.field.time-entry-start-${i}`} /></span>
                <span style={{ ...cell, justifyContent: 'center', color: '#8a8a8a' }}>{dur}</span>
                <span style={cell}><PBInput w={54} align="center" readOnly={locked} value={r.stop} onChange={(e) => patch(i, { stop: e.target.value })} data-tutorial-id={`host.mois.field.time-entry-stop-${i}`} /></span>
                <span style={cell}><PBInput w="100%" readOnly={locked} value={r.note} onChange={(e) => patch(i, { note: e.target.value })} data-tutorial-id={`host.mois.field.time-entry-note-${i}`} /></span>
                <span style={{ ...cell, gap: 3, borderRight: 0 }}>
                  {icon(`time-entry-insert-${i}`, '⤒', 'Insert an entry above', () => insert(i), locked)}
                  {icon(`time-entry-continue-${i}`, '⤓', 'Add an entry continuing from this one', () => cont(i), !r.code)}
                  {icon(`time-entry-clear-${i}`, '⌫', 'Remove this entry', () => clear(i), locked)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 20, padding: '10px 0', flex: 'none' }}>
        <DialogButton id="time-entry-save" isDefault width={90} onClick={save}>Save</DialogButton>
        <DialogButton id="time-entry-cancel" width={90} onClick={back}>Cancel</DialogButton>
      </div>
      {problem && (
        <Ask id="time-entry-edit-problem" title="Time Entry" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true }]} onAnswer={() => setProblem('')}>
          {problem}
        </Ask>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- Time Claims + Time Claim Wizard ----------------------------------------- */

type WizardOptions = { optimize: boolean; subtract: boolean; firstPatient: boolean; alertDuplicate: boolean }
const WIZARD_KEY = 'lfp:wizard-options'
const DEFAULT_WIZARD: WizardOptions = { optimize: false, subtract: true, firstPatient: false, alertDuplicate: false }

export function TimeClaimsWindow({ args, close, open }: AreaWindowProps) {
  const s = useBillingPrograms()
  const provider = String(args.provider ?? '')
  const date = String(args.date ?? LFP_TODAY)
  const [savedOptions, setSavedOptions] = useSessionState<WizardOptions | null>(WIZARD_KEY, null)
  const [opts, setOpts] = useState<WizardOptions>(savedOptions ?? DEFAULT_WIZARD)
  const [saveSelections, setSaveSelections] = useState(!!savedOptions)
  const [wizard, setWizard] = useState(s.lfpSetup.wizard)
  const [lines, setLines] = useState<ClaimLine[]>(() => (s.lfpSetup.wizard ? [] : claimLines(s, provider, date, savedOptions ?? DEFAULT_WIZARD)))
  const [cur, setCur] = useState(0)
  /* the Create Claims run: which line is being asked about, and the answers */
  const [asking, setAsking] = useState<number | null>(null)
  const [subs, setSubs] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const sink = useUnsentSink()
  const back = () => { close(); open('time-entry', { provider, date }) }

  const appts = appointmentsFor(s, provider, date)
  const entered = entriesFor(s, provider, date).filter((e) => !e.claimed).reduce((n, e) => n + minutesOfEntry(e), 0)
  const ffsLen = lines.reduce((n, l) => n + l.ffsMinutes, 0)
  const billed = lines.reduce((n, l) => n + l.units * 15, 0)

  useScreenReport({
    wizard, timeClaimLines: lines.length,
    alertDuplicate: opts.alertDuplicate, firstPatient: opts.firstPatient,
    duplicatePrompt: asking !== null,
    subCode: subs.includes('D') ? 'd' : null,
    prompt: asking !== null ? 'lfp-duplicate-claim' : message ? 'lfp-time-claims-message' : null,
  })

  const cont = () => {
    if (saveSelections) setSavedOptions(opts)
    setLines(claimLines(billingPrograms.get(), provider, date, opts))
    setWizard(false)
  }

  /* walk the lines, asking about each duplicate in turn */
  const run = (from: number, answers: string[]) => {
    const existing = billingPrograms.get().timeClaims.map((c) => ({ provider: c.provider, date: c.date, fee: c.fee, units: c.units }))
    for (let i = from; i < lines.length; i++) {
      const l = lines[i]!
      const earlier = lines.slice(0, i).map((x) => ({ provider, date, fee: x.fee, units: x.units }))
      if (opts.alertDuplicate && isDuplicateClaim([...existing, ...earlier], { provider, date, fee: l.fee, units: l.units })) {
        setSubs(answers); setAsking(i); return
      }
      answers = [...answers, 'R']
    }
    finish(answers)
  }
  const finish = (answers: string[]) => {
    const made = billingPrograms.createTimeClaims(provider, date, lines.map((l, i) => ({ ...l, sub: answers[i] ?? 'R' })))
    sink(made.map((c): UnsentClaim => ({
      chart: LFP_TIME_PATIENT.chart, last: LFP_TIME_PATIENT.last, first: LFP_TIME_PATIENT.first,
      service: date, doctor: provider, fee: c.fee, dob: LFP_TIME_PATIENT.dob, insrBy: 'BC', insrNbr: LFP_TIME_PATIENT.phn,
      billed: '0.00', compl: true, hold: false, sub: c.sub, location: 'L', origin: 'saved',
    })))
    setSubs(answers)
    setAsking(null)
    setMessage(`${made.length} time claim${made.length === 1 ? '' : 's'} created in Unsent Claims.`)
  }
  const create = () => {
    if (!s.lfpSetup.active) { setMessage('The Longitudinal Family Physician model is not activated (Billing ▸ LFP Management ▸ LFP Setup).'); return }
    if (!lines.length) { setMessage('There is no unbilled time for this day.'); return }
    run(0, [])
  }

  const opt = (k: keyof WizardOptions, label: string, help: ReactNode) => (
    <div style={{ padding: '4px 0 6px' }}>
      <PBCheckbox label={label} checked={opts[k]} onChange={(v) => setOpts((o) => ({ ...o, [k]: v }))} tutorialId={`host.mois.field.wizard-${pbSlug(label)}`} />
      <div style={{ color: '#555', paddingLeft: 18, paddingTop: 2 }}>{help}</div>
    </div>
  )
  const group = (title: string, children: ReactNode) => (
    <fieldset style={{ border: '1px solid #c8c8c8', margin: '6px 0', padding: '0 10px 4px' }}>
      <legend style={{ fontWeight: 700, padding: '0 3px' }}>{title}</legend>
      {children}
    </fieldset>
  )

  return (
    <WorkspaceDialogFrame id="lfp-time-claims" title={`Time Claims ${longDate(date)} for ${provider}`} width={955} height={739} controls={false} onClose={back}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', position: 'relative' }}>
        <div style={{ padding: '8px 10px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 8 }}><Dim style={{ width: 50 }}>Provider:</Dim><PBInput w="calc(100% - 60px)" readOnly value={provider} style={{ background: '#e8e8e8' }} /></div>
          <div className="pb-row" style={{ gap: 8, paddingTop: 3 }}><Dim style={{ width: 50 }}>Date:</Dim><PBInput w="calc(100% - 60px)" readOnly value={longDate(date)} style={{ background: '#e8e8e8' }} /></div>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 10px', border: '1px solid #a0a0a0' }}>
          <div style={{ background: '#c9dcf6', flex: 'none', padding: '4px 8px 2px' }}>
            <b>Time Claim Review</b>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 60px 80px 80px 1fr 110px 1fr', color: '#555', paddingTop: 2 }}>
              <span>Start</span><span>Stop</span><span>No.<br />Services</span><span>Time<br />Code</span><span>Patient</span><span>Duration of<br />FFS Appts</span><span>MSP Note</span>
            </div>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }} data-tutorial-id="host.mois.field.time-claim-review">
            {lines.map((l, i) => (
              <div key={l.entry.id} onMouseDown={() => setCur(i)} data-tutorial-id={`host.mois.row.time-claim-${i}`}
                style={{ display: 'grid', gridTemplateColumns: '60px 60px 80px 80px 1fr 110px 1fr', padding: '3px 8px', background: i === cur ? '#f4c6bd' : i % 2 ? '#ececec' : '#fff' }}>
                <span>{l.start}</span><span>{l.stop}</span><span>{l.units}</span><span>{l.fee}</span>
                <span>{l.patient || ''}</span><span>{l.ffsMinutes ? `${l.ffsMinutes} min` : '-'}</span>
                <span>{subs[i] === 'D' ? 'D - duplicate' : l.note}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '3px double #a0a0a0', padding: '6px 10px', flex: 'none' }} data-tutorial-id="host.mois.field.time-summary">
            <b>Time Summary (minutes):</b>
            <div className="pb-row" style={{ alignItems: 'flex-start', gap: 60, paddingTop: 3 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 40px', rowGap: 3 }}>
                <span>Time Entered:</span><span style={{ textAlign: 'right' }}>{entered}</span>
                <span style={{ borderBottom: '1px solid #000' }}>Length of FFS Appts:</span><span style={{ textAlign: 'right', borderBottom: '1px solid #000' }}>{ffsLen || '-'}</span>
                <span>Net Time:</span><span style={{ textAlign: 'right' }}>{Math.max(0, entered - ffsLen)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 40px', rowGap: 3, paddingTop: 20 }}>
                <span>Total Minutes Billed:</span><span style={{ textAlign: 'right' }}>{billed}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 40px', rowGap: 3, paddingTop: 20 }}>
                <span style={{ borderTop: '1px solid #000' }}>FFS Appointments:</span><span style={{ textAlign: 'right', borderTop: '1px solid #000' }}>{appts.filter((a) => a.ffs).length || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '8px 0', flex: 'none' }}>
          <DialogButton id="time-claims-create" isDefault width={78} onClick={create} disabled={wizard || asking !== null}>Create Claims</DialogButton>
          <DialogButton id="time-claims-cancel" width={74} onClick={back}>Cancel</DialogButton>
        </div>

        {wizard && (
          <div className="pb-modal-layer" style={{ zIndex: 5 }}>
            <WorkspaceDialogFrame id="time-claim-wizard" title="Time Claim Wizard" width={452} height={590} controls={false} onClose={back} zIndex={5}>
              <div style={{ background: '#fff', flex: '1 1 auto', padding: '4px 14px', overflowY: 'auto' }}>
                {group('Optimize Time Segments', opt('optimize', 'Optimize Time Segments', <>
                  Unbilled time will be combined to create additional msp time claims.&nbsp; Unbilled time happens when a time entry is not a multiple of 15 minutes.
                  <div style={{ paddingTop: 6 }}>For example:</div>
                  A 20 minute time entry by the provider will result in one 15 minute segment billed to msp and one 5 minute segment unbilled.
                </>))}
                {group('Adjusting Time Segments', opt('subtract', 'Subtract Fee for Service Appointment Times', <>
                  All FFS appointment times will be substracted from the overlapping time entry
                  <div>What is a Fee for Service Appointment:</div>
                  <div style={{ paddingLeft: 12 }}>- out of province insurer; or<br />- non LFP payor code (ie ICBC, WCB, PATIENT, ...); or<br />- non LFP service code (msp fee code)</div>
                  <div style={{ paddingTop: 4 }}>Note: Appointment length is calculated by:</div>
                  <div>- difference between seen and discharge time; or<br />- appointment time plus the number of slots</div>
                </>))}
                {group('Other Options', <>
                  {opt('firstPatient', 'Use the first patient of the day for all time claims', "When unchecked, mois will use the block of time's first patient for claim")}
                  {opt('alertDuplicate', 'Alert me when there is a duplicate claim', 'Duplicate claim is when you have the same patient, doctor, date, fee code and number of services (time segments)')}
                </>)}
                <div className="pb-row" style={{ gap: 18, padding: '8px 0' }}>
                  <PBCheckbox label="Save Selections" checked={saveSelections} onChange={setSaveSelections} tutorialId="host.mois.field.wizard-save-selections" />
                  <DialogButton id="time-claim-wizard-continue" isDefault width={74} onClick={cont}>Continue</DialogButton>
                  <DialogButton id="time-claim-wizard-cancel" width={74} onClick={back}>Cancel</DialogButton>
                </div>
              </div>
            </WorkspaceDialogFrame>
          </div>
        )}
      </div>

      {asking !== null && lines[asking] && (
        <Ask
          id="lfp-duplicate-claim"
          title="Duplicate Claim"
          buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
          onAnswer={(v) => { const answers = [...subs, v === 'yes' ? 'D' : 'R']; setAsking(null); run(asking + 1, answers) }}
        >
          A claim with the same patient, provider, date of service, fee code ({lines[asking]!.fee}) and number of services ({lines[asking]!.units}) already exists.
          <br /><br />Mark this claim ({lines[asking]!.start}–{lines[asking]!.stop}) as a Duplicate?
        </Ask>
      )}
      {message && (
        <Ask id="lfp-time-claims-message" title="Time Claims" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true }]}
          onAnswer={() => { const done = message.includes('created'); setMessage(''); if (done) back() }}>
          {message}
        </Ask>
      )}
    </WorkspaceDialogFrame>
  )
}

/** Registered at module load and again from BillingAdminView (see there). */
export function registerLfpTimeWindows() {
  registerAreaWindow('time-logger', TimeLoggerWindow)
  registerAreaWindow('time-entry', TimeManagementWindow)
  registerAreaWindow('time-entry-edit', TimeEntryEditWindow)
  registerAreaWindow('lfp-time-claims', TimeClaimsWindow)
}
registerLfpTimeWindows()
