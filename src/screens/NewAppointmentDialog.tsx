import { useState } from 'react'
import {
  PBButton, PBGroup, PBInput, PBLookup, PBSelect, PBWindow,
} from '../pb'
import { daybookProviders } from '../data/mois'
import { daybookAppointments, VISIT_CODE_FILL } from '../data/daybook'

/* ============================================================================
   New Appointment — what New Appt (Ctrl+N) and the status bar's
   "Create Appointment…" hyperlink open.

   Transcribed from `image(78).png`, the newest capture of the window (it is
   the one with Service Group), with `new appointment.png` and
   `2026_03_24_20_51_213.png` for the older two-field Provider / Location box
   and the empty form. Two side-by-side panels — Appointment on the left,
   Availability on the right — and the two buttons underneath are
   `Save Appointment` and `Cancel Appointment`, not OK / Cancel.

   The manual's own steps (art. ID303814) are time, length in five-minute
   slots, who it is for, the reason, then anything else; F4 in Chart No.
   opens the chart lookup and F2 saves.
   ========================================================================= */

const HOURS = ['8', '9', '10', '11', '12', '13', '14', '15', '16']

/** The History list under the form: two lines per encounter, as captured. */
const HISTORY = [
  { date: '2026.03.04 09:30', who: 'BEARDWOOD, WALTER', reason: 'Follow-up — blood pressure', code: 'R' },
  { date: '2026.01.22 14:00', who: 'BEARDWOOD, WALTER', reason: 'Office visit', code: 'O' },
  { date: '2025.11.08 10:30', who: 'ADMIN, SYS', reason: 'Full physical', code: 'FP' },
  { date: '2025.09.17 08:30', who: 'BEARDWOOD, WALTER', reason: 'Treatment room — dressing', code: 'TR' },
]

export function NewAppointmentDialog({
  provider, day, onSave, onClose,
}: {
  provider: string
  day: string
  onSave?: (draft: { hr: string; mn: string; slots: string; chart: string; reason: string }) => void
  onClose?: () => void
}) {
  const [hr, setHr] = useState('')
  const [mn, setMn] = useState('')
  const [slots, setSlots] = useState('3')
  const [chart, setChart] = useState('')
  const [reason, setReason] = useState('')

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        tutorialId="host.mois.dialog.new-appointment"
        child
        controls={false}
        title="New Appointment"
        onClose={onClose}
        style={{ width: 980, height: 620 }}
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
                  />
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 72 }}>First Name</span>
                  <PBInput w={120} readOnly />
                  <span className="pb-form__label" style={{ width: 66 }}>Last Name</span>
                  <PBInput w={120} readOnly />
                </div>
              </PBGroup>

              <PBGroup title="Provider / Location / Resource">
                <div className="pb-row" style={{ gap: 6 }}>
                  <span className="pb-form__label" style={{ width: 96 }}>Provider</span>
                  <PBSelect w={220} options={daybookProviders.map((p) => p.provider)} defaultValue={provider} />
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
                  <PBInput w={100} defaultValue={day} />
                  <span className="pb-form__label" style={{ width: 40 }}>Time</span>
                  <span className="pb-row" style={{ gap: 3 }}>
                    <PBInput w={34} align="center" value={hr} onChange={(e) => setHr(e.target.value)} data-tutorial-id="host.mois.field.appt-hr" />
                    <span>:</span>
                    <PBInput w={34} align="center" value={mn} onChange={(e) => setMn(e.target.value)} data-tutorial-id="host.mois.field.appt-mn" />
                  </span>
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 62 }}>Visit Code</span>
                  <PBSelect w={70} options={Object.keys(VISIT_CODE_FILL)} />
                  <span className="pb-form__label" style={{ width: 66 }}>Visit Mode</span>
                  <PBSelect w={70} options={['DE', 'TE', 'VI']} />
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 62 }}>Time Slots</span>
                  <PBInput w={34} align="center" value={slots} onChange={(e) => setSlots(e.target.value)} />
                  <span style={{ color: '#606060' }}>× 5 minutes</span>
                </div>
                <div className="pb-row" style={{ gap: 6, paddingTop: 3 }}>
                  <span className="pb-form__label" style={{ width: 62 }}>Visit Reason</span>
                  <PBLookup w={260} name="visit-reason" value={reason} onChange={setReason} />
                </div>
              </PBGroup>

              {/* the History list: two lines per encounter, as the capture shows */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                        {HISTORY.map((h) => (
                          <tr key={h.date}>
                            <td>{h.date}</td>
                            <td>{h.who}<br /><span style={{ paddingLeft: 12, color: '#404040' }}>{h.reason}</span></td>
                            <td>{h.code}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{ padding: '2px 3px', color: '#404040' }}>Total Records: {HISTORY.length}</div>
              </div>

              <div className="pb-row" style={{ gap: 6 }}>
                <span className="pb-form__label">Service Group:</span>
                <PBSelect w={200} options={['', 'PRIMARY CARE', 'MATERNITY']} />
              </div>
            </div>
          </div>

          {/* ---- right: Availability ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }}>
            <div className="pb-band">Availability</div>
            <div className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none' }}>
              <span className="pb-form__label">Select:</span>
              <PBSelect w={190} options={daybookProviders.map((p) => p.provider)} defaultValue={provider} />
              <PBButton size="sm">&laquo;</PBButton>
              <PBButton size="sm">&lsaquo;</PBButton>
              <PBInput w={90} align="center" defaultValue={day} />
              <PBButton size="sm">&rsaquo;</PBButton>
              <PBButton size="sm">&raquo;</PBButton>
              <PBButton size="sm">Today</PBButton>
              <PBButton size="sm">Refresh</PBButton>
            </div>
            <div className="pb-band">{day}</div>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', border: '1px solid #9a9a9a' }}>
              {HOURS.map((h) => {
                const booked = daybookAppointments.filter((r) => String(Number(r.hr)) === h)
                return (
                  <div key={h} style={{ display: 'flex', minHeight: 44, borderBottom: '1px solid #9a9a9a' }}>
                    <div style={{ width: 44, flex: 'none', borderRight: '1px solid #c9c9c9', padding: '1px 3px', textAlign: 'right' }}>{h}:00</div>
                    <div style={{ flex: '1 1 auto', padding: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {booked.map((r) => (
                        <div
                          key={r.hr + r.mn}
                          style={{
                            borderLeft: `4px solid ${VISIT_CODE_FILL[r.code] ?? '#808080'}`,
                            border: '1px solid #9a9a9a',
                            borderLeftWidth: 4,
                            borderLeftColor: VISIT_CODE_FILL[r.code] ?? '#808080',
                            padding: '0 3px',
                            background: '#fff',
                          }}
                        >
                          {r.last}, {r.first}<br />{r.code}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '4px 0 8px', flex: 'none' }}>
          <PBButton
            data-tutorial-id="host.mois.command.save-appointment"
            onClick={() => onSave?.({ hr, mn, slots, chart, reason })}
          >
            Save Appointment
          </PBButton>
          <PBButton data-tutorial-id="host.mois.command.cancel-appointment" onClick={onClose}>
            Cancel Appointment
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
