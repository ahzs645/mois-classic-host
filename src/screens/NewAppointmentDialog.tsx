import { useEffect, useMemo, useState } from 'react'
import {
  PBButton, PBGroup, PBInput, PBLookup, PBSelect, PBWindow,
} from '../pb'
import { useChartRecords } from '../data/chart-records'
import { daybookProviders } from '../data/mois'
import { knownPatient, VISIT_CODE_FILL } from '../data/daybook'
import { usePatient } from '../data/patient-context'
import {
  currentRow, dayRows, offsetOfStamp, schedulerStore, stampOf, useSchedulerStore,
} from '../data/schedulerStore'
import { DESKTOP_PROVIDER } from '../data/schedulerPrintReports'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'

/* ============================================================================
   New Appointment — what New Appt (Ctrl+N), Action ▸ Create an Appointment
   and the status bar's "Create Appointment…" hyperlink open.

   Transcribed from `image(78).png`, the newest capture of the window (it is
   the one with Service Group), with `new appointment.png` and
   `2026_03_24_20_51_213.png` for the older two-field Provider / Location box
   and the empty form; art. 3074458 `2d3d6d32…` (v2.29) for the Availability
   panel's quarter-hour axis and the blocks painted on it. Two side-by-side
   panels — Appointment on the left, Availability on the right — and the two
   buttons underneath are `Save Appointment` and `Cancel Appointment`, not
   OK / Cancel.

   The manual's own steps (art. ID303814) are time, length in five-minute
   slots, who it is for, the reason, then anything else; F4 in Chart No.
   opens the chart lookup and F2 saves. Art. 303855: a new patient is booked
   by typing the first and last name and saving with no chart number.

   Opened from the status-bar link it arrives filled with the highlighted
   patient and defaulted to the Desktop Provider (art. 3074458).

   A registered window (screens/areaWindowRegistry): `host.mois.openUtility
   { window: 'new-appointment', hr, mn, slots, chart, first, last, reason }`
   fills the fields the way typing would, so a lesson can book one.
   ========================================================================= */

const QUARTERS = ['00', '15', '30', '45']
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
const ROW_H = 18

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function NewAppointmentDialog({ args, close }: AreaWindowProps) {
  const sched = useSchedulerStore()
  const patient = usePatient()
  const encounters = useChartRecords('encounter', 'dtm_appoint')
  const fromLink = args.from === 'link'
  /* the link fills the highlighted record's patient: the day book's current
     row when the Scheduler has one, the open chart otherwise */
  const [prefill] = useState(() => {
    if (!fromLink) return null
    if (sched.prefill) return sched.prefill
    const row = currentRow(sched)
    if (row) return { chart: row.chart, first: row.first, last: row.last }
    return { chart: patient.chart, first: patient.first.toUpperCase(), last: patient.last.toUpperCase() }
  })
  const [provider, setProvider] = useState(() => (fromLink ? DESKTOP_PROVIDER : sched.current?.provider ?? DESKTOP_PROVIDER))
  /* from the context link the date defaults to the next day (art. 3797338:
     "defaulting the appointment date to the next day") */
  const [date, setDate] = useState(() => stampOf(fromLink ? 1 : sched.current?.offset ?? 0))
  const [hr, setHr] = useState('')
  const [mn, setMn] = useState('')
  const [slots, setSlots] = useState('3')
  const [code, setCode] = useState('R')
  const [chart, setChart] = useState(prefill?.chart ?? '')
  const [first, setFirst] = useState(prefill?.first ?? '')
  const [last, setLast] = useState(prefill?.last ?? '')
  const [reason, setReason] = useState('')

  /* a lesson "types" by passing the values; apply every time they change */
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (str(a.hr)) setHr(str(a.hr))
    if (str(a.mn)) setMn(str(a.mn))
    if (str(a.slots)) setSlots(str(a.slots))
    if (str(a.code)) setCode(str(a.code))
    if (str(a.reason)) setReason(str(a.reason))
    if (str(a.first)) setFirst(str(a.first).toUpperCase())
    if (str(a.last)) setLast(str(a.last).toUpperCase())
    if (str(a.chart)) pickChart(str(a.chart))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed])

  /** a chart number fills the name, the way leaving Chart No. does */
  function pickChart(next: string) {
    setChart(next)
    const who = next === patient.chart ? { first: patient.first, last: patient.last } : knownPatient(next)
    if (who) { setFirst(who.first.toUpperCase()); setLast(who.last.toUpperCase()) }
  }

  /* History: the patient's own encounters — only the open chart has any on
     file here, so any other chart lists none */
  const history = chart && chart === patient.chart
    ? encounters.slice(0, 12).map((e) => ({
      date: `${String(e.dtm_appoint ?? '').replace(/\//g, '.')} ${String(e.num_appoint_hr ?? '0').padStart(2, '0')}:${String(e.num_appoint_min ?? '0').padStart(2, '0')}`,
      who: String(e.str_attending ?? e.stp_user_create ?? ''),
      reason: String(e.str_appt_note ?? ''),
      code: String(e.str_visit_code ?? ''),
    }))
    : []

  const offset = offsetOfStamp(date)
  const booked = useMemo(() => dayRows(sched, provider, Number.isFinite(offset) ? offset : 0), [sched, provider, offset])

  const save = () => {
    schedulerStore.book(provider, Number.isFinite(offset) ? offset : 0, { hr, mn, slots, chart, reason, first, last, code })
    close()
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        tutorialId="host.mois.dialog.new-appointment"
        child
        controls={false}
        title="New Appointment"
        onClose={close}
        style={{ width: 980, height: 620, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: 6 }}>
          {/* ---- left: Appointment ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', width: 430, flex: 'none', minHeight: 0 }}>
            <div className="pb-band">Appointment</div>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <PBGroup title="Patient">
                <div className="pb-row" style={{ gap: 6 }}>
                  <span className="pb-form__label" style={{ width: 72 }}>Chart No.</span>
                  <PBLookup
                    w={120}
                    name="chart"
                    value={chart}
                    onChange={setChart}
                    onEnter={pickChart}
                    /* the lookup picks the chart that is open */
                    onDots={() => pickChart(patient.chart)}
                  />
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 72 }}>First Name</span>
                  <PBInput w={120} value={first} onChange={(e) => setFirst(e.target.value.toUpperCase())} data-tutorial-id="host.mois.field.appt-first" />
                  <span className="pb-form__label" style={{ width: 66 }}>Last Name</span>
                  <PBInput w={120} value={last} onChange={(e) => setLast(e.target.value.toUpperCase())} data-tutorial-id="host.mois.field.appt-last" />
                </div>
              </PBGroup>

              <PBGroup title="Provider / Location / Resource">
                <div className="pb-row" style={{ gap: 6 }}>
                  <span className="pb-form__label" style={{ width: 96 }}>Provider</span>
                  <PBSelect w={220} options={daybookProviders.map((p) => p.provider)} value={provider} onChange={(e) => setProvider(e.target.value)} />
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 96 }}>Service Location</span>
                  <PBSelect w={220} options={['', 'PRINCE GEORGE CLINIC']} />
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 96 }}>Resource</span>
                  <PBSelect w={220} options={['', 'TREATMENT ROOM 1', 'TREATMENT ROOM 2']} />
                </div>
              </PBGroup>

              <PBGroup title="Detail">
                <div className="pb-row" style={{ gap: 6 }}>
                  <span className="pb-form__label" style={{ width: 62 }}>Date</span>
                  <PBInput w={100} value={date} onChange={(e) => setDate(e.target.value)} />
                  <span className="pb-form__label" style={{ width: 40 }}>Time</span>
                  <span className="pb-row" style={{ gap: 3 }}>
                    <PBInput w={34} align="center" value={hr} onChange={(e) => setHr(e.target.value)} data-tutorial-id="host.mois.field.appt-hr" />
                    <span>:</span>
                    <PBInput w={34} align="center" value={mn} onChange={(e) => setMn(e.target.value)} data-tutorial-id="host.mois.field.appt-mn" />
                  </span>
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 62 }}>Visit Code</span>
                  <PBSelect w={70} options={Object.keys(VISIT_CODE_FILL)} value={code} onChange={(e) => setCode(e.target.value)} />
                  <span className="pb-form__label" style={{ width: 66 }}>Visit Mode</span>
                  <PBSelect w={70} options={['DE', 'TE', 'VI']} />
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 62 }}>Time Slots</span>
                  <PBInput w={34} align="center" value={slots} onChange={(e) => setSlots(e.target.value)} data-tutorial-id="host.mois.field.appt-slots" />
                  <span style={{ color: '#606060' }}>× 5 minutes</span>
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 62 }}>Visit Reason</span>
                  <PBLookup w={260} name="visit-reason" value={reason} onChange={setReason} />
                </div>
              </PBGroup>

              {/* the History list: two lines per encounter, as the capture shows */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }} data-tutorial-id="host.mois.field.appt-history">
                <div className="pb-dw" style={{ height: 150 }}>
                  <div className="pb-dw__scroll">
                    <table className="pb-dw__table">
                      <thead>
                        <tr>
                          <th style={{ width: 150 }}>History</th>
                          <th>Provider / Reason</th>
                          <th style={{ width: 40 }}>Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((h, i) => (
                          <tr key={i}>
                            <td>{h.date}</td>
                            <td>{h.who}<br /><span style={{ paddingLeft: 12, color: '#404040' }}>{h.reason}</span></td>
                            <td>{h.code}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{ padding: '2px 3px', color: '#404040' }}>Total Records: {history.length}</div>
              </div>

              <div className="pb-row" style={{ gap: 6 }}>
                <span className="pb-form__label">Service Group:</span>
                <PBSelect w={200} options={['', 'PRIMARY CARE', 'MATERNITY']} />
              </div>
            </div>
          </div>

          {/* ---- right: Availability ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }} data-tutorial-id="host.mois.field.appt-availability">
            <div className="pb-band">Availability</div>
            <div className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none' }}>
              <span className="pb-form__label">Select:</span>
              <PBSelect w={190} options={daybookProviders.map((p) => p.provider)} value={provider} onChange={(e) => setProvider(e.target.value)} />
              <PBButton size="sm" onClick={() => setDate(stampOf(offset - 7))}>&lt;&lt;</PBButton>
              <PBButton size="sm" onClick={() => setDate(stampOf(offset - 1))}>&lt;</PBButton>
              <PBInput w={90} align="center" value={date} onChange={(e) => setDate(e.target.value)} />
              <PBButton size="sm" onClick={() => setDate(stampOf(offset + 1))}>&gt;</PBButton>
              <PBButton size="sm" onClick={() => setDate(stampOf(offset + 7))}>&gt;&gt;</PBButton>
              <PBButton size="sm" onClick={() => setDate(stampOf(0))}>Today</PBButton>
              <PBButton size="sm">Refresh</PBButton>
            </div>
            <div className="pb-band" style={{ justifyContent: 'center' }}>{longDate(date)}</div>
            {/* the day on a quarter-hour axis; double-clicking an empty
                quarter writes its time into Detail */}
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', border: '1px solid #9a9a9a' }}>
              <div style={{ position: 'relative' }}>
                {HOURS.flatMap((h) => QUARTERS.map((q) => (
                  <div
                    key={`${h}${q}`}
                    onDoubleClick={() => { setHr(String(h).padStart(2, '0')); setMn(q) }}
                    style={{
                      display: 'flex', height: ROW_H,
                      borderBottom: q === '45' ? '1px solid #9a9a9a' : '1px dashed #dcdcdc',
                    }}
                  >
                    <div style={{ width: 44, flex: 'none', textAlign: 'right', padding: '0 4px', fontWeight: q === '00' ? 700 : 400, color: q === '00' ? '#000' : '#606060' }}>
                      {q === '00' ? `${h}:00` : `:${q}`}
                    </div>
                  </div>
                )))}
                {booked.map((r) => {
                  const top = ((Number(r.hr) - HOURS[0]!) * 4 + Number(r.mn) / 15) * ROW_H
                  const height = Math.max(ROW_H, (Number(r.n) || 3) / 3 * ROW_H) - 1
                  if (top < 0) return null
                  return (
                    <div
                      key={r.key}
                      style={{
                        position: 'absolute', left: 48, width: 200, top, height,
                        border: '1px solid #404040', borderLeft: `4px solid ${VISIT_CODE_FILL[r.code] ?? '#808080'}`,
                        background: '#fff', padding: '0 3px', overflow: 'hidden', lineHeight: '13px', fontSize: 11,
                      }}
                    >
                      {r.last ? `${r.last}, ${r.first}` : <i>Empty</i>}<br />{r.reason.toUpperCase()}<br />{r.code}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '4px 0 8px', flex: 'none' }}>
          <PBButton data-tutorial-id="host.mois.command.save-appointment" onClick={save}>
            Save Appointment
          </PBButton>
          <PBButton data-tutorial-id="host.mois.command.cancel-appointment" onClick={close}>
            Cancel Appointment
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

function longDate(stamp: string): string {
  const [y, m, d] = stamp.split('.').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  if (Number.isNaN(date.getTime())) return stamp
  return new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(date).replace(', ', ' ')
}

registerAreaWindow('new-appointment', NewAppointmentDialog)
