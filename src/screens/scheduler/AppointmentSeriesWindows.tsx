import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  PBCheckbox, PBDataWindow, PBInput, PBPatientBand, PBRadio, PBSelect, pbSlug,
} from '../../pb'
import { RESOURCES, VISIT_CODE_FILL, visitCodeRows } from '../../data/daybook'
import { daybookProviders } from '../../data/mois'
import { usePatientRoster } from '../../data/patient-context'
import type { Patient } from '../../data/patients'
import { DESKTOP_PROVIDER_DEFAULT } from '../../data/session'
import { argStr as str } from '../../data/text'
import {
  currentRow, dayRows, offsetOfStamp, schedulerStore, stampOf, useSchedulerStore, type DayRow,
} from '../../data/schedulerStore'
import { groupKeyOf, schedulerExtras, useSchedulerExtras } from '../../data/schedulerExtras'
import { useScreenReport } from '../../host/screen-state'
import { AdvancedLookupDialog } from '../AdvancedLookupDialog'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import { RaisedMessageBox } from '../RaisedMessageBox'
import { CaptionGroup, FormLine, NAVY } from '../formKit'
import { useTickSet, SelectAllPair } from '../listKit'
import { DAYS, MONTHS } from './SchedulerDialog'

/* ============================================================================
   Appointment Series — the day book's (and the Group Visit List's) Appt
   Series button, and deleting an appointment that belongs to one.

   PROVENANCE: art. 3266635 "Appointment Series" (v02.30.11, Halliwell
   training clinic):
   - `0c7487ae…` / `ec3cd4da…` / `bff66065…` — Create Appointment Series:
     Series Type ◉ Patient Appointment Series ○ Group Visit Appointment
     Series across the top; on the left a yellow `Patient` box (Name / Chart,
     DoB / Gender, Insurance, and Select, which opens the Advanced Lookup
     Service's Patient Chart List) over `Provider(s)` (Add / Remove, Name |
     Associated User / Members); on the right `Appointment Detail` (Time of
     Day [hh][mm], # of Slots, Visit Code, Visit Mode, Visit Reason […],
     Service Location, Resource, Room — the required ones yellow),
     `Recurrence Pattern` (○ Daily ◉ Weekly ○ Monthly ○ Yearly; Weekly:
     Recur every [1] week(s) on: and the seven day boxes) and `Duration of
     Series` (Start, ◉ End By [date] ○ End after [10] occurences); Continue
     and Cancel under it.
   - `edd1e90c…` / `cd6c6518…` — the group variant: a `Provider` box (Name,
     Associated User / Members, Select) over `Patient(s)` (Add / Remove,
     Name | Chart | DoB | Insurance), and the Monthly pattern: ◉ Day [22] of
     every [1] month(s) / ○ The [first ▾][Tuesday ▾] of every [1] month(s).
   - `eaeeb40b…` — New Appointment Series Confirmation: the warning icon,
     "New appointment series summary:", Date of First / Last Appointment,
     Time of Day, Duration (minutes), Visit Code, Visit Reason, Total Number
     of Appointments with "Warning: You are creating more than 30
     appointments", "Appointments with:" and the provider, then
     `Continue, Create Series` / `Cancel, Try Again`.
   - `259086eb…` — series rows carry a circling glyph in the day book's
     gutter.
   - `e5a94a62…` — Delete Recurring Appointment: "This is one appointment in
     a series. What do you want to delete?" ◉ Just this one ○ Select from
     series; Ok / Cancel.
   - `d39b53d9…` — Appointment Series: the patient banner (CHART NO.,
     PATIENT (F/M/L), DATE OF BIRTH, GENDER, BC HEALTH NO., PREFERRED PHONE
     NUMBER), "Select Remaining Appointment(s) to Delete" with Select All /
     Clear Selections, a Select | Date | HR | MN | Code | # | Provider | Visit
     Reason | Service Location | AS list, every row ticked and painted
     green; Ok / Cancel, then "Delete Selected Appointments — Would you like
     to delete the selected appointments?" Yes / No.

   INFERRED (no capture): the Daily and Yearly patterns' own controls (built
   in the Weekly/Monthly idiom: Every [n] day(s) / Every weekday, and Every
   [month] [day]); the wording of the "fill in the highlighted fields"
   refusal; that the delete list starts at the selected appointment's date
   ("Remaining").

   Window ids: `appointment-series` (args `kind: 'patient' | 'group'`, and
   `hr / mn / slots / code / reason / chart / endAfter` to type into it);
   `delete-recurring-appointment`; `appointment-series-delete`. Inner stages
   report as `host.screen.window`: `advanced-lookup-service`,
   `new-appointment-series-confirmation`, `required-fields`,
   `delete-selected-appointments`.
   ========================================================================= */

const YELLOW = '#ffff99'

const ORDINALS = ['first', 'second', 'third', 'fourth', 'last']
const PATTERNS = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const
type Pattern = typeof PATTERNS[number]

/* the Service Location and Resource drop-downs: the clinics the day books
   name, and the resources Resource Schedules keeps */
/* the day book's own codes (its palette) and the clinic's visit-code list */
const VISIT_CODES = ['', ...new Set([...Object.keys(VISIT_CODE_FILL), ...visitCodeRows.map((v) => v.code)])]
const LOCATIONS = ['', ...new Set(['PRINCE GEORGE CLINIC', 'FAMILY PRACTICE', 'UHNBC', ...daybookProviders.map((p) => p.loc)])]

/* --- dates ------------------------------------------------------------------ */
const toDate = (stamp: string): Date | null => {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(stamp.trim())
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null
}
const toStamp = (d: Date) => `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
/** `Tuesday August 22, 2023`, as the confirmation prints it */
export const longStamp = (stamp: string) => {
  const d = toDate(stamp)
  return d ? `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : ''
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

export type Recurrence = {
  pattern: Pattern
  every: number
  weekdays: number[]
  dailyWeekdays: boolean
  monthMode: 'day' | 'the'
  monthDay: number
  ordinal: string
  ordinalDay: number
  yearMonth: number
  yearDay: number
  start: string
  endMode: 'by' | 'after'
  endBy: string
  endAfter: number
}

/** Every date the series lands on, capped where MOIS would not go. */
export function seriesDates(r: Recurrence): string[] {
  const start = toDate(r.start)
  if (!start) return []
  const end = r.endMode === 'by' ? toDate(r.endBy) : null
  if (r.endMode === 'by' && !end) return []
  const max = r.endMode === 'after' ? Math.max(0, r.endAfter) : 400
  const every = Math.max(1, r.every)
  const out: string[] = []
  const fits = (d: Date) => (!end || d.getTime() <= end.getTime())
  for (let d = start, guard = 0; out.length < max && fits(d) && guard < 3700; d = addDays(d, 1), guard += 1) {
    const days = Math.round((d.getTime() - start.getTime()) / 86_400_000)
    let hit = false
    if (r.pattern === 'Daily') {
      hit = r.dailyWeekdays ? d.getUTCDay() !== 0 && d.getUTCDay() !== 6 : days % every === 0
    } else if (r.pattern === 'Weekly') {
      const week = Math.floor((days + start.getUTCDay()) / 7)
      hit = week % every === 0 && r.weekdays.includes(d.getUTCDay())
    } else if (r.pattern === 'Monthly') {
      const months = (d.getUTCFullYear() - start.getUTCFullYear()) * 12 + d.getUTCMonth() - start.getUTCMonth()
      if (months % every === 0) {
        if (r.monthMode === 'day') hit = d.getUTCDate() === r.monthDay
        else if (d.getUTCDay() === r.ordinalDay) {
          const nth = Math.floor((d.getUTCDate() - 1) / 7)
          const last = addDays(d, 7).getUTCMonth() !== d.getUTCMonth()
          hit = r.ordinal === 'last' ? last : ORDINALS.indexOf(r.ordinal) === nth
        }
      }
    } else {
      hit = d.getUTCMonth() === r.yearMonth && d.getUTCDate() === r.yearDay
    }
    if (hit) out.push(toStamp(d))
  }
  return out
}

/* --- the kit's framed group box with a navy caption ------------------------- */
function Group({ title, children, style, id }: { title: ReactNode; children: ReactNode; style?: CSSProperties; id?: string }) {
  return (
    <CaptionGroup title={title} anchor={id} border="#c8c8c8" shadow="inset 1px 1px 0 #fff" padding="4px 8px 8px" shrink={false} style={style}
      caption={{ padding: '2px 0 4px', rule: '#d8d8d8', style: { marginBottom: 4 } }}>
      {children}
    </CaptionGroup>
  )
}

function Line({ label, children, w = 92 }: { label: ReactNode; children: ReactNode; w?: number }) {
  return <FormLine label={label} w={w} minHeight={22} labelClass={false}>{children}</FormLine>
}

/** the required fields paint yellow while they are empty */
const reqStyle = (v: string): CSSProperties | undefined => (v.trim() ? undefined : { backgroundColor: YELLOW })

type PickedPatient = { chart: string; name: string; first: string; last: string; dob: string; gender: string; insurance: string }
const pickedOf = (p: Patient): PickedPatient => ({
  chart: p.chart,
  name: `${p.first} ${p.last}`.toUpperCase(),
  first: p.first.toUpperCase(),
  last: p.last.toUpperCase(),
  dob: p.dob,
  gender: p.gender,
  insurance: [p.insurance, p.insuranceBy].filter(Boolean).join(' '),
})

/* ---------------------------------------------------------------------------
   Create Appointment Series
   ------------------------------------------------------------------------ */
function CreateAppointmentSeries({ args, close }: AreaWindowProps) {
  const sched = useSchedulerStore()
  const roster = usePatientRoster()
  const here = sched.current ?? { provider: DESKTOP_PROVIDER_DEFAULT, offset: 0, key: '' }
  const [kind, setKind] = useState<'patient' | 'group'>(args.kind === 'group' ? 'group' : 'patient')
  const [patient, setPatient] = useState<PickedPatient | null>(null)
  const [patients, setPatients] = useState<PickedPatient[]>([])
  const [groupCur, setGroupCur] = useState(0)
  const [providers, setProviders] = useState<string[]>([here.provider])
  const [provCur, setProvCur] = useState(0)
  const [hr, setHr] = useState('')
  const [mn, setMn] = useState('')
  const [slots, setSlots] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('DE')
  const [reason, setReason] = useState('')
  const [loc, setLoc] = useState('')
  const [resource, setResource] = useState('')
  const [room, setRoom] = useState('')
  const startStamp = stampOf(here.offset)
  const startDay = toDate(startStamp)
  const [rec, setRec] = useState<Recurrence>(() => ({
    pattern: 'Weekly', every: 1, weekdays: [startDay?.getUTCDay() ?? 2], dailyWeekdays: false,
    monthMode: 'day', monthDay: startDay?.getUTCDate() ?? 1, ordinal: 'first', ordinalDay: startDay?.getUTCDay() ?? 2,
    yearMonth: startDay?.getUTCMonth() ?? 0, yearDay: startDay?.getUTCDate() ?? 1,
    start: startStamp, endMode: 'by', endBy: '', endAfter: 10,
  }))
  const [stage, setStage] = useState<'' | 'lookup' | 'provider' | 'confirm' | 'required'>('')
  const [lookupFor, setLookupFor] = useState<'patient' | 'group'>('patient')
  const r = (patch: Partial<Recurrence>) => setRec((x) => ({ ...x, ...patch }))

  /* a lesson types by passing the values */
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (a.kind === 'group' || a.kind === 'patient') setKind(a.kind)
    if (str(a.hr)) setHr(str(a.hr))
    if (str(a.mn)) setMn(str(a.mn))
    if (str(a.slots)) setSlots(str(a.slots))
    if (str(a.code)) setCode(str(a.code))
    if (str(a.reason)) setReason(str(a.reason))
    if (str(a.endBy)) setRec((x) => ({ ...x, endMode: 'by', endBy: str(a.endBy) }))
    if (typeof a.endAfter === 'number') setRec((x) => ({ ...x, endMode: 'after', endAfter: a.endAfter as number }))
    if (str(a.chart)) {
      const p = roster.find((x) => x.chart === str(a.chart))
      if (p) setPatient(pickedOf(p))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed])

  const dates = useMemo(() => seriesDates(rec), [rec])
  const who = kind === 'patient' ? (patient ? [patient] : []) : patients
  const missing = !hr.trim() || !slots.trim() || !code.trim() || !who.length
    || (rec.endMode === 'by' ? !rec.endBy.trim() : !rec.endAfter)
    || (rec.pattern === 'Weekly' && !rec.weekdays.length)

  useScreenReport({
    window: stage === 'lookup' ? 'advanced-lookup-service'
      : stage === 'confirm' ? 'new-appointment-series-confirmation'
        : stage === 'required' ? 'required-fields' : '',
    seriesType: kind,
    pattern: pbSlug(rec.pattern),
    patients: who.length,
  })

  const proceed = () => {
    setStage(missing || !dates.length ? 'required' : 'confirm')
  }

  const create = () => {
    const provider = providers[0] ?? here.provider
    const items = dates.flatMap((stamp) => who.map((p) => ({
      provider,
      offset: offsetOfStamp(stamp),
      draft: { hr, mn, slots, chart: p.chart, reason, first: p.first, last: p.last, code },
      extra: { mode, ...(loc ? { loc } : {}), resource, room },
    })))
    const keys = schedulerStore.bookMany(items, kind === 'group' ? 'group-series-booked' : 'series-booked')
    const offsets = Object.fromEntries(keys.map((k, i) => [k, items[i]!.offset]))
    schedulerExtras.addSeries({
      kind, provider, keys, offsets, hr: hr.padStart(2, '0'), mn: (mn || '00').padStart(2, '0'),
      code, slots, reason, loc, charts: who.map((p) => p.chart),
    })
    /* a group series is a group visit on each date as well (art. 303808,
       "Did you know you can make a series of group Bookings") */
    if (kind === 'group') {
      for (const stamp of dates) {
        const v = { date: stamp, hr: hr.padStart(2, '0'), min: (mn || '00').padStart(2, '0'), n: slots, provider, topic: '', desc: reason.toUpperCase(), code, loc, series: true }
        schedulerExtras.addVisit(v, {
          patients: who.map((p) => ({ chart: p.chart, first: p.first, last: p.last, code, mode, reason, issue: '', services: '', as: '', ds: 'I', bs: 'I', t: '-' })),
        }, { patients: [], providers: [], resources: [], comment: '', room, resource, notes: [], nameTags: 'Not required', claimed: false })
      }
    }
    close()
  }

  const pickFromLookup = (chart: string) => {
    const p = roster.find((x) => x.chart === chart)
    if (p) {
      if (lookupFor === 'patient') setPatient(pickedOf(p))
      else setPatients((list) => (list.some((x) => x.chart === p.chart) ? list : [...list, pickedOf(p)]))
    }
    setStage('')
  }

  const duration = (Number(slots) || 0) * 5

  return (
    <>
      <WorkspaceDialogFrame id="appointment-series" title="Create Appointment Series" width={1000} height={560} onClose={close} controls={false} zIndex={85}>
        <div className="pb-row" style={{ gap: 18, padding: '8px 16px', background: '#fff', borderBottom: '1px solid #d0d0d0', flex: 'none' }}>
          <b style={{ color: NAVY.win }}>Series Type:</b>
          <PBRadio name="series-type" label="Patient Appointment Series" checked={kind === 'patient'} onChange={() => setKind('patient')} tutorialId="host.mois.field.series-type-patient" />
          <PBRadio name="series-type" label="Group Visit Appointment Series" checked={kind === 'group'} onChange={() => setKind('group')} tutorialId="host.mois.field.series-type-group" />
        </div>
        <div style={{ display: 'flex', gap: 10, padding: 10, flex: '1 1 auto', minHeight: 0 }}>
          {/* ---- left: who ---- */}
          <div style={{ width: 470, flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            {kind === 'patient' ? (
              <Group title="Patient" id="host.mois.group.series-patient" style={{ background: patient ? undefined : YELLOW }}>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 50px auto', rowGap: 3, alignItems: 'center' }}>
                  <span>Name:</span><b>{patient?.name ?? ''}</b>
                  <span>Chart:</span>
                  <span className="pb-row" style={{ gap: 8 }}>
                    <b>{patient?.chart ?? ''}</b>
                    <DialogButton id="series-select-patient" width={76} onClick={() => { setLookupFor('patient'); setStage('lookup') }}>Select</DialogButton>
                  </span>
                  <span>DoB:</span><b>{patient?.dob ?? ''}</b>
                  <span>Gender:</span><b>{patient?.gender ?? ''}</b>
                  <span>Insurance:</span><b style={{ gridColumn: 'span 3' }}>{patient?.insurance ?? ''}</b>
                </div>
              </Group>
            ) : (
              <Group title="Provider" id="host.mois.group.series-provider">
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', rowGap: 3, alignItems: 'center' }}>
                  <span style={{ color: '#606060' }}>Name:</span>
                  <b>{providers[0] ?? ''}</b>
                  <DialogButton id="series-select-provider" width={76} onClick={() => setStage('provider')}>Select</DialogButton>
                  <span style={{ color: '#606060', gridColumn: 'span 3' }}>Associated User / Members:</span>
                  <span />
                  <span style={{ gridColumn: 'span 2' }}>{providers[0] ?? ''}</span>
                </div>
              </Group>
            )}
            <Group title={kind === 'patient' ? 'Provider(s)' : 'Patient(s)'} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 0, background: '#e0dcd8', border: '1px solid #a0a0a0', flex: 'none' }}>
                <DialogButton
                  id={kind === 'patient' ? 'series-add-provider' : 'series-add-patient'}
                  width={76}
                  onClick={() => { if (kind === 'patient') setStage('provider'); else { setLookupFor('group'); setStage('lookup') } }}
                >
                  Add
                </DialogButton>
                <DialogButton
                  id={kind === 'patient' ? 'series-remove-provider' : 'series-remove-patient'}
                  width={76}
                  onClick={() => {
                    if (kind === 'patient') setProviders((l) => l.filter((_, i) => i !== provCur))
                    else setPatients((l) => l.filter((_, i) => i !== groupCur))
                  }}
                >
                  Remove
                </DialogButton>
              </div>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id={kind === 'patient' ? 'host.mois.field.series-providers' : 'host.mois.field.series-patients'}>
                {kind === 'patient' ? (
                  <PBDataWindow
                    flush gutter={false}
                    rows={providers.map((p) => ({ name: p, members: p }))}
                    current={provCur}
                    onCurrentChange={setProvCur}
                    columns={[{ key: 'name', header: 'Name', width: 250 }, { key: 'members', header: 'Associated User / Members' }]}
                    empty=""
                  />
                ) : (
                  <PBDataWindow
                    flush gutter={false}
                    rows={patients.map((p) => ({ ...p, dobg: `${p.dob}  ${p.gender}` }))}
                    current={groupCur}
                    onCurrentChange={setGroupCur}
                    rowTutorialId={(p) => `host.mois.row.series-patient-${p.chart}`}
                    columns={[
                      { key: 'name', header: 'Name', width: 200 },
                      { key: 'chart', header: 'Chart', width: 60 },
                      { key: 'dobg', header: 'DoB', width: 90 },
                      { key: 'insurance', header: 'Insurance' },
                    ]}
                    empty=""
                  />
                )}
              </div>
            </Group>
          </div>

          {/* ---- right: when ---- */}
          <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Group title="Appointment Detail" id="host.mois.group.series-appointment-detail">
              <Line label="Time of Day:">
                <PBInput w={30} align="center" value={hr} onChange={(e) => setHr(e.target.value)} style={reqStyle(hr)} data-tutorial-id="host.mois.field.series-hour" />
                <PBInput w={30} align="center" value={mn} onChange={(e) => setMn(e.target.value)} style={reqStyle(mn || hr)} data-tutorial-id="host.mois.field.series-minute" />
              </Line>
              <Line label="# of Slots:">
                <PBInput w={30} align="center" value={slots} onChange={(e) => setSlots(e.target.value)} style={reqStyle(slots)} data-tutorial-id="host.mois.field.series-slots" />
              </Line>
              <Line label="Visit Code:">
                <PBSelect w={60} options={VISIT_CODES} value={code} onChange={(e) => setCode(e.target.value)} style={reqStyle(code)} data-tutorial-id="host.mois.field.series-visit-code" />
                {code && <span style={{ width: 14, height: 12, background: VISIT_CODE_FILL[code] ?? visitCodeRows.find((v) => v.code === code)?.fill ?? '#ddd', border: '1px solid #666' }} />}
              </Line>
              <Line label="Visit Mode:">
                <PBSelect w={60} options={['DE', 'TL', 'VC', 'IN']} value={mode} onChange={(e) => setMode(e.target.value)} />
              </Line>
              <Line label="Visit Reason:">
                <PBInput w={236} value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.series-visit-reason" />
                <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button">…</button>
              </Line>
              <Line label="Service Location:">
                <PBSelect w={236} options={LOCATIONS} value={loc} onChange={(e) => setLoc(e.target.value)} />
              </Line>
              <Line label="Resource:">
                <PBSelect w={236} options={['', ...RESOURCES]} value={resource} onChange={(e) => setResource(e.target.value)} />
              </Line>
              <Line label="Room:"><PBInput w={74} value={room} onChange={(e) => setRoom(e.target.value)} /></Line>
            </Group>

            <Group title="Recurrence Pattern" id="host.mois.group.series-recurrence">
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 82, borderRight: '1px solid #d0d0d0', flex: 'none' }}>
                  {PATTERNS.map((p) => (
                    <PBRadio key={p} name="series-pattern" label={p} checked={rec.pattern === p} onChange={() => r({ pattern: p })} tutorialId={`host.mois.field.series-${pbSlug(p)}`} />
                  ))}
                </div>
                <div style={{ flex: '1 1 auto' }}>
                  {rec.pattern === 'Daily' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="pb-row" style={{ gap: 6 }}>
                        <PBRadio name="series-daily" label="Every" checked={!rec.dailyWeekdays} onChange={() => r({ dailyWeekdays: false })} />
                        <PBInput w={34} align="center" value={String(rec.every)} onChange={(e) => r({ every: Number(e.target.value) || 1 })} /> day(s)
                      </span>
                      <PBRadio name="series-daily" label="Every weekday" checked={rec.dailyWeekdays} onChange={() => r({ dailyWeekdays: true })} />
                    </div>
                  )}
                  {rec.pattern === 'Weekly' && (
                    <>
                      <span className="pb-row" style={{ gap: 6 }}>
                        Recur every <PBInput w={34} align="center" value={String(rec.every)} onChange={(e) => r({ every: Number(e.target.value) || 1 })} data-tutorial-id="host.mois.field.series-recur-every" /> week(s) on:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '4px 14px', marginTop: 6 }}>
                        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                          <PBCheckbox
                            key={d}
                            label={DAYS[d]}
                            checked={rec.weekdays.includes(d)}
                            tutorialId={`host.mois.check.series-${pbSlug(DAYS[d]!)}`}
                            onChange={(on) => r({ weekdays: on ? [...rec.weekdays, d].sort() : rec.weekdays.filter((x) => x !== d) })}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {rec.pattern === 'Monthly' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="pb-row" style={{ gap: 6 }}>
                        <PBRadio name="series-monthly" label="Day" checked={rec.monthMode === 'day'} onChange={() => r({ monthMode: 'day' })} />
                        <PBInput w={34} align="center" value={String(rec.monthDay)} onChange={(e) => r({ monthDay: Number(e.target.value) || 1 })} />
                        of every <PBInput w={34} align="center" value={String(rec.every)} onChange={(e) => r({ every: Number(e.target.value) || 1 })} /> month(s)
                      </span>
                      <span className="pb-row" style={{ gap: 6 }}>
                        <PBRadio name="series-monthly" label="The" checked={rec.monthMode === 'the'} onChange={() => r({ monthMode: 'the' })} />
                        <PBSelect w={80} options={ORDINALS} value={rec.ordinal} onChange={(e) => r({ ordinal: e.target.value })} disabled={rec.monthMode !== 'the'} />
                        <PBSelect w={96} options={DAYS} value={DAYS[rec.ordinalDay]} onChange={(e) => r({ ordinalDay: DAYS.indexOf(e.target.value) })} disabled={rec.monthMode !== 'the'} />
                        of every <PBInput w={34} align="center" value={String(rec.every)} onChange={(e) => r({ every: Number(e.target.value) || 1 })} /> month(s)
                      </span>
                    </div>
                  )}
                  {rec.pattern === 'Yearly' && (
                    <span className="pb-row" style={{ gap: 6 }}>
                      Every <PBSelect w={110} options={MONTHS} value={MONTHS[rec.yearMonth]} onChange={(e) => r({ yearMonth: MONTHS.indexOf(e.target.value) })} />
                      <PBInput w={34} align="center" value={String(rec.yearDay)} onChange={(e) => r({ yearDay: Number(e.target.value) || 1 })} />
                    </span>
                  )}
                </div>
              </div>
            </Group>

            <Group title="Duration of Series" id="host.mois.group.series-duration">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 96px auto auto auto', columnGap: 8, rowGap: 4, alignItems: 'center' }}>
                <span>Start:</span>
                <PBInput w={90} align="center" value={rec.start} onChange={(e) => r({ start: e.target.value })} />
                <PBRadio name="series-end" label="End By" checked={rec.endMode === 'by'} onChange={() => r({ endMode: 'by' })} tutorialId="host.mois.field.series-end-by-mode" />
                <PBInput w={86} align="center" value={rec.endBy} onChange={(e) => r({ endBy: e.target.value })} style={rec.endMode === 'by' ? reqStyle(rec.endBy) : undefined} disabled={rec.endMode !== 'by'} data-tutorial-id="host.mois.field.series-end-by" />
                <span />
                <span /><span />
                <PBRadio name="series-end" label="End after" checked={rec.endMode === 'after'} onChange={() => r({ endMode: 'after' })} tutorialId="host.mois.field.series-end-after-mode" />
                <PBInput w={40} align="center" value={String(rec.endAfter)} onChange={(e) => r({ endAfter: Number(e.target.value) || 0 })} disabled={rec.endMode !== 'after'} data-tutorial-id="host.mois.field.series-end-after" />
                <span>occurences</span>
              </div>
            </Group>
          </div>
        </div>
        <div className="pb-row" style={{ gap: 8, padding: '4px 0 10px', justifyContent: 'center', flex: 'none' }}>
          <DialogButton id="series-continue" onClick={proceed} isDefault>Continue</DialogButton>
          <DialogButton id="series-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>

      {stage === 'lookup' && (
        <AdvancedLookupDialog chart={patient?.chart ?? ''} roster={roster} onPick={pickFromLookup} onClose={() => setStage('')} zIndex={92} />
      )}

      {stage === 'provider' && (
        <ProviderPicker
          onPick={(p) => {
            if (kind === 'patient') setProviders((l) => (l.includes(p) ? l : [...l, p]))
            else setProviders([p])
            setStage('')
          }}
          onClose={() => setStage('')}
        />
      )}

      {stage === 'required' && (
        <RaisedMessageBox title="Create Appointment Series" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.msgbox-ok' }]} onClose={() => setStage('')}>
          <span data-tutorial-id="host.mois.dialog.series-required">
            {dates.length || missing ? 'Please fill in the highlighted fields before continuing.' : 'The recurrence pattern does not produce any appointments.'}
          </span>
        </RaisedMessageBox>
      )}

      {stage === 'confirm' && (
        <WorkspaceDialogFrame id="new-appointment-series-confirmation" title="New Appointment Series Confirmation" width={506} height={400} onClose={() => setStage('')} controls={false} zIndex={92}>
          <div style={{ display: 'flex', gap: 30, padding: '20px 20px 0', flex: '1 1 auto' }}>
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" style={{ flex: 'none' }}>
              <path d="M16 3 L30 28 H2 Z" fill="#f4c400" stroke="#8a6d00" />
              <rect x="14.6" y="11" width="2.8" height="10" fill="#000" />
              <rect x="14.6" y="23" width="2.8" height="2.8" fill="#000" />
            </svg>
            <div style={{ display: 'grid', gridTemplateColumns: '190px 190px', rowGap: 3, columnGap: 12, alignContent: 'start' }} data-tutorial-id="host.mois.field.series-summary">
              <span style={{ gridColumn: 'span 2', marginBottom: 8 }}>New appointment series summary:</span>
              <span>Date of First Appointment</span><span>Date of Last Appointment</span>
              <ConfirmBox>{longStamp(dates[0] ?? '')}</ConfirmBox><ConfirmBox>{longStamp(dates[dates.length - 1] ?? '')}</ConfirmBox>
              <span className="pb-row" style={{ gap: 30 }}><span>Time of Day</span></span><span style={{ marginLeft: -110 }}>Duration</span>
              <span className="pb-row" style={{ gap: 12 }}>
                <ConfirmBox w={70}>{`${hr.padStart(2, '0')}:${(mn || '00').padStart(2, '0')}`}</ConfirmBox>
                <ConfirmBox w={50}>{String(duration)}</ConfirmBox>
                <span>(minutes)</span>
              </span>
              <span />
              <span>Visit Code</span><span style={{ marginLeft: -110 }}>Visit Reason</span>
              <span className="pb-row" style={{ gap: 12, gridColumn: 'span 2' }}>
                <ConfirmBox w={70}>{code}</ConfirmBox>
                <ConfirmBox w={284}>{reason.toUpperCase()}</ConfirmBox>
              </span>
              <span style={{ gridColumn: 'span 2' }}>Total Number of Appointments</span>
              <span className="pb-row" style={{ gap: 10, gridColumn: 'span 2' }}>
                <ConfirmBox w={50}>{String(dates.length * (kind === 'group' ? 1 : who.length))}</ConfirmBox>
                {dates.length > 30 && <b data-tutorial-id="host.mois.field.series-warning">Warning: You are creating more than 30 appointments</b>}
              </span>
              <span style={{ gridColumn: 'span 2' }}>Appointments with:</span>
              <b style={{ gridColumn: 'span 2', paddingLeft: 2 }}>{(kind === 'patient' ? providers : providers.slice(0, 1)).join(', ')}</b>
            </div>
          </div>
          <div className="pb-row" style={{ gap: 12, padding: '10px 0 14px', justifyContent: 'center', flex: 'none' }}>
            <DialogButton id="series-create" width={130} onClick={create} isDefault>Continue, Create Series</DialogButton>
            <DialogButton id="series-try-again" width={130} onClick={() => setStage('')}>Cancel, Try Again</DialogButton>
          </div>
        </WorkspaceDialogFrame>
      )}
    </>
  )
}

function ConfirmBox({ children, w = 180 }: { children: ReactNode; w?: number }) {
  return (
    <span style={{ display: 'inline-block', width: w, height: 20, lineHeight: '20px', padding: '0 4px', background: '#e8e8e8', border: '1px solid #d0d0d0', fontWeight: 700, color: '#505050', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

/** Add (Provider(s)) / Select (Provider): the day books' providers. INFERRED —
    the capture never shows this list open; it is drawn as the MOIS - Search
    Window's plain list. */
function ProviderPicker({ onPick, onClose }: { onPick: (provider: string) => void; onClose: () => void }) {
  const [cur, setCur] = useState(0)
  const rows = daybookProviders.map((p) => ({ name: p.provider, type: p.type, loc: p.loc }))
  return (
    <WorkspaceDialogFrame id="series-provider-list" title="MOIS - Search Window" width={520} height={320} onClose={onClose} controls={false} zIndex={92}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: 8 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => onPick(r.name)}
          rowTutorialId={(r) => `host.mois.row.series-provider-${pbSlug(r.name.split(',')[0]!)}`}
          columns={[{ key: 'name', header: 'Name', width: 200 }, { key: 'type', header: 'Type', width: 130 }, { key: 'loc', header: 'Service Location' }]}
        />
      </div>
      <div className="pb-row" style={{ gap: 8, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="series-provider-ok" width={75} onClick={() => { const r = rows[cur]; if (r) onPick(r.name) }} isDefault>Ok</DialogButton>
        <DialogButton id="series-provider-cancel" width={75} onClick={onClose}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Delete Recurring Appointment
   ------------------------------------------------------------------------ */
/** The series the day book's current appointment belongs to, if any. */
export function currentSeriesId(): string | null {
  const row = currentRow()
  return row ? schedulerExtras.get().seriesOf[row.key] ?? null : null
}

export function DeleteRecurringAppointment({ close, open }: AreaWindowProps) {
  const [choice, setChoice] = useState<'one' | 'series'>('one')
  const row = currentRow()
  const ok = () => {
    if (choice === 'series') { if (!open('appointment-series-delete')) close(); return }
    if (row) {
      schedulerStore.deleteAppointment(row.key)
      schedulerExtras.removeFromSeries([row.key])
    }
    close()
  }
  return (
    <WorkspaceDialogFrame id="delete-recurring-appointment" title="Delete Recurring Appointment" width={330} height={206} onClose={close} controls={false} zIndex={90}>
      <div style={{ display: 'flex', gap: 22, padding: '20px 20px 0', flex: '1 1 auto', background: '#fff' }}>
        <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" style={{ flex: 'none' }}>
          <path d="M16 3 L30 28 H2 Z" fill="#f4c400" stroke="#8a6d00" />
          <rect x="14.6" y="11" width="2.8" height="10" fill="#000" />
          <rect x="14.6" y="23" width="2.8" height="2.8" fill="#000" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>This is one appointment in a series.</span>
          <span>What do you want to delete?</span>
          <PBRadio name="delete-recurring" label="Just this one" checked={choice === 'one'} onChange={() => setChoice('one')} tutorialId="host.mois.field.delete-just-this-one" />
          <PBRadio name="delete-recurring" label="Select from series" checked={choice === 'series'} onChange={() => setChoice('series')} tutorialId="host.mois.field.delete-select-from-series" />
        </div>
      </div>
      <div className="pb-row" style={{ gap: 10, padding: '12px 0', justifyContent: 'center', flex: 'none', background: '#fff' }}>
        <DialogButton id="delete-recurring-ok" width={75} onClick={ok} isDefault>Ok</DialogButton>
        <DialogButton id="delete-recurring-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ---------------------------------------------------------------------------
   Appointment Series ▸ Select Remaining Appointment(s) to Delete
   ------------------------------------------------------------------------ */
type SeriesRow = DayRow & { date: string; provider: string; offset: number }

function AppointmentSeriesDelete({ close }: AreaWindowProps) {
  const sched = useSchedulerStore()
  const extras = useSchedulerExtras()
  const roster = usePatientRoster()
  const row = currentRow(sched)
  const series = extras.series.find((s) => s.id === (row ? extras.seriesOf[row.key] : ''))
  const fromOffset = sched.current?.offset ?? 0
  const rows: SeriesRow[] = useMemo(() => {
    if (!series) return []
    return series.keys
      .map((k) => {
        const offset = series.offsets[k] ?? 0
        const r = dayRows(sched, series.provider, offset).find((x) => x.key === k)
        return r ? { ...r, date: stampOf(offset), provider: series.provider, offset } : null
      })
      /* "Remaining": from the selected appointment's date on; a group
         series lists the selected patient's own appointments */
      .filter((r): r is SeriesRow => !!r && r.offset >= fromOffset && (series.kind !== 'group' || !row || r.chart === row.chart))
      .sort((a, b) => a.offset - b.offset)
  }, [series, sched, fromOffset, row])
  const picked = useTickSet<string>(() => rows.map((r) => r.key))
  const [cur, setCur] = useState(0)
  const [asking, setAsking] = useState(false)
  useScreenReport({ window: asking ? 'delete-selected-appointments' : '', picked: picked.size })
  const p = roster.find((x) => x.chart === row?.chart)
  const age = p?.dob ? Math.max(0, 2026 - Number(p.dob.slice(0, 4))) : null

  const remove = () => {
    const keys = [...picked.ticked]
    schedulerStore.deleteAppointments(keys)
    schedulerExtras.removeFromSeries(keys)
    close()
  }
  return (
    <>
      <WorkspaceDialogFrame id="appointment-series-delete" title="Appointment Series" width={940} height={620} onClose={close} controls={false} zIndex={88}>
        <PBPatientBand
          layout="grid"
          labelStyle={{ color: '#fff', fontSize: 10 }}
          style={{ background: 'linear-gradient(var(--pb-banner-top-a, #2f6fb4), var(--pb-banner-top-b, #1c4f8c))', color: '#fff', padding: '4px 8px', flex: 'none', display: 'grid', gridTemplateColumns: '90px 210px 150px 70px 140px 1fr' }}
          cells={[
            { label: 'CHART NO.', value: row?.chart ?? '' },
            { label: 'PATIENT (F/M/L)', value: p ? `${p.first} ${p.middle} ${p.last}`.toUpperCase().replace(/\s+/g, ' ') : row ? `${row.first} ${row.last}` : '' },
            { label: 'DATE OF BIRTH', value: <>{p?.dob ?? ''}{age !== null ? `  ${age} YR OLD` : ''}</> },
            { label: 'GENDER', value: p?.gender ?? '' },
            { label: 'BC HEALTH NO.', value: p?.bchn ?? p?.insurance ?? '' },
            { label: 'PREFERRED PHONE NUMBER', value: <>{p?.home ?? ''}{p?.home ? '  Home Phone' : ''}</> },
          ]}
        />
        <div className="pb-row" style={{ padding: '4px 8px', background: '#fff', flex: 'none' }}>
          <b style={{ color: NAVY.win }}>Select Remaining Appointment(s) to Delete</b>
          <span className="pb-row__spacer" />
          <SelectAllPair
            ids={['series-select-all', 'series-clear-selections']}
            labels={['Select All', 'Clear Selections']}
            width={[84, 100]}
            onSelectAll={() => picked.selectAll(rows.map((r) => r.key))}
            onUnselectAll={picked.clear}
          />
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 6px' }}>
          <PBDataWindow
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            rowFill={(r) => (picked.has(r.key) ? '#00ff00' : undefined)}
            rowTutorialId={(r) => `host.mois.row.series-${r.date.replace(/\./g, '')}`}
            columns={[
              {
                key: 'select', header: 'Select', width: 56, align: 'center',
                render: (r) => (
                  <PBCheckbox checked={picked.has(r.key)} onChange={(on) => picked.set(r.key, on)} tutorialId={`host.mois.cell.series-${r.date.replace(/\./g, '')}`} />
                ),
              },
              { key: 'date', header: 'Date', width: 80 },
              { key: 'hr', header: 'HR', width: 28, align: 'center' },
              { key: 'mn', header: 'MN', width: 28, align: 'center' },
              { key: 'code', header: 'Code', width: 60, align: 'center' },
              { key: 'n', header: '#', width: 30, align: 'center' },
              { key: 'provider', header: 'Provider', width: 200 },
              { key: 'reason', header: 'Visit Reason', width: 190 },
              { key: 'loc', header: 'Service Location', width: 140 },
              { key: 'as', header: 'AS', width: 30, align: 'center' },
            ]}
            empty="No remaining appointments in this series."
          />
        </div>
        <div className="pb-row" style={{ gap: 10, padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
          <DialogButton id="series-delete-ok" width={75} disabled={!picked.size} onClick={() => setAsking(true)} isDefault>Ok</DialogButton>
          <DialogButton id="series-delete-cancel" width={75} onClick={close}>Cancel</DialogButton>
        </div>
      </WorkspaceDialogFrame>
      {asking && (
        <RaisedMessageBox
          title="Delete Selected Appointments"
          icon="question"
          buttons={[{ label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.msgbox-yes' }, { label: 'No', value: 'no', tutorialId: 'host.mois.command.msgbox-no' }]}
          onClose={(v) => { if (v === 'yes') remove(); else setAsking(false) }}
        >
          <span data-tutorial-id="host.mois.dialog.delete-selected-appointments">Would you like to delete the selected appointments?</span>
        </RaisedMessageBox>
      )}
    </>
  )
}

/** Group Visit List ▸ Appt Series opens the same window on the group type. */
export const openGroupSeries = (open: (id: string, args?: Record<string, unknown>) => boolean) => open('appointment-series', { kind: 'group' })

/** a series row's key → whether the day book should draw the glyph */
export const isSeriesRow = (key: string) => !!schedulerExtras.get().seriesOf[key]

/** used by the Group Visit List to key its lists */
export { groupKeyOf }

registerAreaWindow('appointment-series', CreateAppointmentSeries)
registerAreaWindow('delete-recurring-appointment', DeleteRecurringAppointment)
registerAreaWindow('appointment-series-delete', AppointmentSeriesDelete)
