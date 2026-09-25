import { useEffect, useState } from 'react'
import { PBCheckbox, PBInput, PBRadio, PBSelect } from '../../pb'
import { daybookProviders } from '../../data/mois'
import {
  currentRow, offsetOfStamp, schedulerStore, stampOf, useSchedulerStore,
} from '../../data/schedulerStore'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogGroup, DialogRow, NAVY, SchedulerDialog, str } from './SchedulerDialog'

/* ============================================================================
   The two Copy / Move utilities on the Scheduler's Action menu.

   Copy / Move Appointment Utility — art. 303834 `a62ac8da…` (v02.30.22):
   Copy / Move Settings; Current Appointment (Chart, Patient, Provider,
   Appointment, Appt. Note — read-only, bold); New Appointment Settings (New
   Date opening on 0000.00.00, New Time defaulting to the current time, New
   Provider "Yes, change provider"); Action (Move current appointment / Copy
   current appointment, Copy selected); Continue (F2) and Cancel.

   Copy / Move Day Book Utility — art. 303835 `53a8819d…` (v02.17.20): the
   Current Day Book Settings (Provider and Date) are greyed — the source is
   the day book on screen — and the New Day Book Settings' Provider and Date
   are the destination; Action Copy Day Book / Move Day Book; Continue and
   Cancel. Copy brings the patients and notes but not the appointment status;
   Move takes everything (the article's two notes).

   A lesson fills the fields by passing them: `host.mois.openUtility
   { window, date, hr, mn, provider, action }`.
   ========================================================================= */

const providers = () => daybookProviders.map((p) => p.provider)
const validDate = (v: string) => /^\d{4}\.\d{2}\.\d{2}$/.test(v) && v !== '0000.00.00'

function CopyMoveAppointment({ args, close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const [row] = useState(() => currentRow(s))
  const from = s.current
  const [date, setDate] = useState('0000.00.00')
  const [hr, setHr] = useState(row?.hr ?? '')
  const [mn, setMn] = useState(row?.mn ?? '')
  const [change, setChange] = useState(false)
  const [provider, setProvider] = useState(from?.provider ?? '')
  const [move, setMove] = useState(false)
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (str(a.date)) setDate(str(a.date))
    if (str(a.hr)) setHr(str(a.hr))
    if (str(a.mn)) setMn(str(a.mn))
    if (str(a.provider)) { setChange(true); setProvider(str(a.provider)) }
    if (a.action === 'move') setMove(true)
    if (a.action === 'copy') setMove(false)
  }, [typed])

  const go = () => {
    if (!row || !from || !validDate(date)) return
    schedulerStore.copyMoveAppointment(row.key, {
      provider: change ? provider : from.provider, offset: offsetOfStamp(date), hr, mn,
    }, move)
    close()
  }

  return (
    <SchedulerDialog
      id="copy-move-appointment"
      title="Copy / Move Appointment Utility"
      width={410}
      band="Copy / Move Settings"
      onClose={close}
      buttons={[
        { label: 'Continue (F2)', id: 'continue', onClick: go, primary: true },
        { label: 'Cancel', id: 'cancel' },
      ]}
    >
      <DialogGroup title="Current Appointment:">
        <DialogRow label="Chart:" width={92}><b style={{ textAlign: 'left' }}>{row?.chart}</b></DialogRow>
        <DialogRow label="Patient:" width={92}><b>{row ? `${row.first} ${row.last}` : ''}</b></DialogRow>
        <DialogRow label="Provider:" width={92}><b>{from?.provider}</b></DialogRow>
        <DialogRow label="Appointment:" width={92}><b>{from ? `${stampOf(from.offset)}   ${row?.hr} : ${row?.mn}` : ''}</b></DialogRow>
        <DialogRow label="Appt. Note:" width={92}><span /></DialogRow>
      </DialogGroup>
      <DialogGroup title="New Appointment Settings:">
        <DialogRow label="New Date:" width={92}>
          <PBInput w={100} value={date} onChange={(e) => setDate(e.target.value)} data-tutorial-id="host.mois.field.copy-new-date" />
        </DialogRow>
        <DialogRow label="New Time:" width={92}>
          <PBInput w={30} align="center" value={hr} onChange={(e) => setHr(e.target.value)} />
          <span>:</span>
          <PBInput w={30} align="center" value={mn} onChange={(e) => setMn(e.target.value)} />
        </DialogRow>
        <DialogRow label="New Provider:" width={92}>
          <PBCheckbox label="Yes, change provider" checked={change} onChange={setChange} />
        </DialogRow>
        {change && (
          <DialogRow label="" width={92}>
            <PBSelect w={200} options={providers()} value={provider} onChange={(e) => setProvider(e.target.value)} />
          </DialogRow>
        )}
      </DialogGroup>
      <DialogGroup title="Action:" last>
        <div style={{ paddingLeft: 110, display: 'grid', gap: 8 }} data-tutorial-id="host.mois.field.copy-action">
          <PBRadio name="cm-appt" label="Move current appointment" checked={move} onChange={() => setMove(true)} />
          <PBRadio name="cm-appt" label="Copy current appointment" checked={!move} onChange={() => setMove(false)} />
        </div>
      </DialogGroup>
    </SchedulerDialog>
  )
}

function CopyMoveDayBook({ args, close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const [from] = useState(() => s.current ?? { provider: 'TECHNICAL SUPPORT', offset: 0, key: '' })
  const [provider, setProvider] = useState(from.provider)
  const [date, setDate] = useState(stampOf(from.offset))
  const [move, setMove] = useState(true)
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (str(a.date)) setDate(str(a.date))
    if (str(a.provider)) setProvider(str(a.provider))
    if (a.action === 'move') setMove(true)
    if (a.action === 'copy') setMove(false)
  }, [typed])

  const go = () => {
    if (!validDate(date)) return
    schedulerStore.copyMoveDay(from.provider, from.offset, { provider, offset: offsetOfStamp(date) }, move)
    close()
  }
  const grey = { background: 'var(--pb-field-ro)' }

  return (
    <SchedulerDialog
      id="copy-move-daybook"
      title="Copy / Move Day Book Utility"
      width={330}
      band="Copy / Move Settings"
      onClose={close}
      buttons={[
        { label: 'Continue', id: 'continue', onClick: go, primary: true },
        { label: 'Cancel', id: 'cancel' },
      ]}
    >
      <div style={{ padding: '6px 10px' }}>
        <div style={{ color: '#000080', marginBottom: 4 }}>Current Day Book Settings:</div>
        <DialogRow label="Provider:" width={62}><PBInput w={170} value={from.provider} readOnly style={grey} /></DialogRow>
        <DialogRow label="Date:" width={62}><PBInput w={84} value={stampOf(from.offset)} readOnly style={grey} /></DialogRow>
      </div>
      <div style={{ padding: '6px 10px' }} data-tutorial-id="host.mois.field.copy-destination">
        <div style={{ color: '#000080', marginBottom: 4 }}>New Day Book Settings:</div>
        <DialogRow label="Provider:" width={62}>
          <PBSelect w={170} options={providers()} value={provider} onChange={(e) => setProvider(e.target.value)} />
        </DialogRow>
        <DialogRow label="Date:" width={62}>
          <PBInput w={84} value={date} onChange={(e) => setDate(e.target.value)} data-tutorial-id="host.mois.field.copy-new-date" />
        </DialogRow>
      </div>
      <div style={{ padding: '6px 10px 10px', display: 'flex', gap: 30 }}>
        <span style={{ ...NAVY, fontWeight: 400 }}>Action:</span>
        <div style={{ display: 'grid', gap: 8 }} data-tutorial-id="host.mois.field.copy-action">
          <PBRadio name="cm-day" label="Copy Day Book" checked={!move} onChange={() => setMove(false)} />
          <PBRadio name="cm-day" label="Move Day Book" checked={move} onChange={() => setMove(true)} />
        </div>
      </div>
    </SchedulerDialog>
  )
}

registerAreaWindow('copy-move-appointment', CopyMoveAppointment)
registerAreaWindow('copy-move-daybook', CopyMoveDayBook)
