import { useEffect, useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBRadio, PBSelect, PBViewHeader,
} from '../../pb'
import { RESOURCES, weekdayOf } from '../../data/daybook'
import { SHIFT_WEEKDAYS, schedulableProviders, type ShiftDay, type ShiftRow } from '../../data/schedulerSetup'
import { dayRows, schedulerBridge, schedulerStore, stampOf, useSchedulerStore } from '../../data/schedulerStore'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { NAVY, SchedulerDialog, str } from './SchedulerDialog'

/* ============================================================================
   Scheduler ▸ Shift Manager ▸ Provider Shifts / Resource Shifts.

   Provider Shift Scheduler — art. 303813 `28a83b87…` and art. 303843
   `45031492…` (v02.17.20): New Row, Delete Row, Save, Refresh and Copy on the
   taskbar; << date >> and "Populate with: Shift Schedule + Daybook Header /
   Shift Schedule Only"; a grid headed WEEK OF: <Monday> with a column per
   weekday, one row per provider; each day holds two time frames (8:30 to
   12:00 AND 13:00 to 16:00, in 24-hour format), a small note box, and a "…"
   that opens that provider's Day Book for the day; `Enc: n` shows the day's
   bookings when the Day Book header is populated. The Resource Shift
   Scheduler is the same window over resources (`e85923c0…`).

   Shift Schedule - Add Provider(s) — `45031492…`: New Row (Ctrl+N) asks
   which providers first: Provider List with an Add check box per provider;
   Continue (F2), Cancel.

   Copy — art. 303844: Shift Manager: Copy Options `f746d92e…` (Copy Current
   Provider's weekly shifts to a different week(s) / … to a different
   Provider for the same week / Copy ALL Providers' weekly shifts to a
   different week(s); Continue (F2), Cancel) then Shift Manager: Copy Shifts —
   `918a504c…` for options 1 and 3 (Week or Weeks to Copy To: Start, "Select
   the MONDAY of the start week"; Repeat for n wk(s), "number of weeks to
   repeat for from the Start Date", and the stop day; Identifies Days to Copy:
   ALL Days) and `47bbfa9c…` for option 2, which adds Select Provider first;
   Copy (F2), Cancel.
   ========================================================================= */

/** Monday of the day book's opening week (2026.08.11 is a Tuesday) */
const mondayOf = (off: number) => off - ((weekdayOf(off) + 6) % 7)

export function ShiftSchedulerView({ resource }: { resource?: boolean }) {
  const s = useSchedulerStore()
  const openWindow = useOpenWindow()
  const [week, setWeek] = useState(() => mondayOf(s.current?.offset ?? 0))
  const [header, setHeader] = useState(true)
  const rows = resource ? s.resourceShifts : s.shifts
  const [cur, setCur] = useState(0)

  useEffect(() => { schedulerStore.setShiftSelection(rows[cur]?.provider ?? '', week, !!resource) }, [rows, cur, week, resource])

  const setDay = (r: number, d: number, patch: Partial<ShiftDay>) => {
    const next: ShiftRow[] = rows.map((row, i) => (i !== r ? row : {
      ...row, days: row.days.map((day, j) => (j === d ? { ...day, ...patch } : day)),
    }))
    schedulerStore.setShifts(next, !!resource)
  }

  const days = SHIFT_WEEKDAYS.map((name, i) => {
    const off = week + i
    return { name, off, label: `${name} ${stampOf(off).slice(8)}` }
  })

  const t = (r: number, d: number, key: keyof ShiftDay, value: string, current: boolean) => (
    <PBInput
      w={42}
      value={value}
      onChange={(e) => setDay(r, d, { [key]: e.target.value })}
      onFocus={() => setCur(r)}
      style={{ height: 17, background: current ? '#f2a58a' : '#fff' }}
    />
  )

  return (
    <>
      <PBViewHeader title={resource ? 'Resource Shift Scheduler' : 'Provider Shift Scheduler'} />
      <PBCommandRow
        commands={[
          { label: 'New Row', onClick: () => openWindow('shift-add-providers', { resource: !!resource }) },
          { label: 'Delete Row', disabled: !rows[cur], onClick: () => schedulerStore.setShifts(rows.filter((_, i) => i !== cur), !!resource) },
          { label: 'Save', onClick: () => schedulerStore.done('shifts-saved') },
          { label: 'Refresh' },
          { label: 'Copy', onClick: () => openWindow('shift-copy-options', { resource: !!resource }) },
        ]}
      />
      <div className="pb-row" style={{ gap: 4, padding: '3px 8px', borderBottom: '1px solid #c9c9c9', flex: 'none', background: 'var(--pb-face)' }}>
        <PBButton size="sm" style={{ width: 24 }} onClick={() => setWeek(week - 7)} data-tutorial-id="host.mois.command.shift-prev-week">&lt;&lt;</PBButton>
        <PBInput w={86} align="center" value={stampOf(week)} readOnly style={{ background: '#fff' }} />
        <PBButton size="sm" style={{ width: 24 }} onClick={() => setWeek(week + 7)} data-tutorial-id="host.mois.command.shift-next-week">&gt;&gt;</PBButton>
        <span style={{ marginLeft: 60 }}>Populate with:</span>
        <PBRadio name="shift-pop" label="Shift Schedule + Daybook Header" checked={header} onChange={() => setHeader(true)} />
        <PBRadio name="shift-pop" label="Shift Schedule Only" checked={!header} onChange={() => setHeader(false)} />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }} data-tutorial-id="host.mois.field.shift-grid">
        <div style={{ display: 'grid', gridTemplateColumns: `132px repeat(7, 132px)`, width: 'max-content' }}>
          <span style={{ padding: '3px 4px', borderBottom: '1px solid #bdbdbd' }}>WEEK OF: {stampOf(week)}</span>
          {days.map((d) => <span key={d.name} style={{ padding: '3px 4px', textAlign: 'center', borderLeft: '1px solid #bdbdbd', borderBottom: '1px solid #bdbdbd' }}>{d.label}</span>)}
          {rows.map((row, r) => {
            const current = r === cur
            return [
              <span
                key={`${row.provider}-n`}
                onClick={() => setCur(r)}
                data-tutorial-id={`host.mois.row.shift-${row.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`}
                style={{ padding: '4px', color: current ? '#000' : '#6d6d6d', background: current ? '#f2a58a' : undefined, borderBottom: '1px solid #bdbdbd', minHeight: 72 }}
              >
                {row.provider}
              </span>,
              ...days.map((d, i) => {
                const day = row.days[i]!
                const enc = resource ? 0 : dayRows(s, row.provider, d.off).length
                return (
                  <span key={`${row.provider}-${i}`} style={{ padding: '3px 4px', borderLeft: '1px solid #bdbdbd', borderBottom: '1px solid #bdbdbd', display: 'grid', gap: 2 }}>
                    <span className="pb-row" style={{ gap: 3 }}>{t(r, i, 'from1', day.from1, current)} to {t(r, i, 'to1', day.to1, current)}</span>
                    <span className="pb-row" style={{ gap: 3 }}>{t(r, i, 'from2', day.from2, current)} to {t(r, i, 'to2', day.to2, current)}</span>
                    <span className="pb-row" style={{ gap: 3, justifyContent: 'flex-end' }}>
                      {header && enc > 0 && <span>Enc: {enc}</span>}
                      <PBButton
                        size="sm"
                        style={{ minWidth: 18, height: 15, padding: 0 }}
                        onClick={() => {
                          if (resource) return
                          schedulerBridge().showDay?.(row.provider, d.off)
                          schedulerBridge().openNode?.('p-daybook')
                        }}
                      >
                        ...
                      </PBButton>
                    </span>
                    <PBInput w="100%" value={day.note} onChange={(e) => setDay(r, i, { note: e.target.value })} style={{ height: 17, background: current ? '#f2a58a' : '#fff' }} />
                  </span>
                )
              }),
            ]
          })}
        </div>
      </div>
    </>
  )
}

function AddProviders({ args, close }: AreaWindowProps) {
  const resource = args.resource === true
  const s = useSchedulerStore()
  const have = (resource ? s.resourceShifts : s.shifts).map((r) => r.provider)
  const list = (resource ? RESOURCES : schedulableProviders()).filter((p) => !have.includes(p))
  const [add, setAdd] = useState<string[]>([])
  const [cur, setCur] = useState(0)
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (Array.isArray(a.providers)) setAdd(a.providers.map(String))
  }, [typed])
  return (
    <SchedulerDialog
      id="shift-add-providers"
      title={resource ? 'Shift Schedule - Add Resource(s)' : 'Shift Schedule - Add Provider(s)'}
      width={346}
      height={420}
      band={resource ? 'Resource List' : 'Provider List'}
      onClose={close}
      buttons={[
        { label: 'Continue (F2)', id: 'continue', onClick: () => { schedulerStore.addShiftRows(add, resource); close() }, primary: true },
        { label: 'Cancel', id: 'cancel' },
      ]}
      bodyStyle={{ display: 'flex', background: '#fff' }}
    >
      <PBDataWindow
        rows={list.map((p) => ({ p }))}
        current={cur}
        onCurrentChange={setCur}
        columns={[
          { key: 'add', header: 'Add', width: 54, align: 'center', render: (r) => <PBCheckbox checked={add.includes(r.p)} onChange={(v) => setAdd(v ? [...add, r.p] : add.filter((x) => x !== r.p))} /> },
          { key: 'p', header: resource ? 'Resource' : 'Provider', width: 218 },
        ]}
        empty=""
      />
    </SchedulerDialog>
  )
}

const OPTIONS = [
  "Copy Current Provider's weekly shifts to a different week(s).",
  "Copy Current Provider's weekly shifts to a different Provider for the same week.",
  "Copy ALL Providers' weekly shifts to a different week(s).",
]

function CopyOptions({ args, close, open }: AreaWindowProps) {
  const [option, setOption] = useState(0)
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (typeof a.option === 'number') setOption(a.option - 1)
  }, [typed])
  return (
    <SchedulerDialog
      id="shift-copy-options"
      title="Shift Manager: Copy Options"
      width={470}
      band="Select Option"
      onClose={close}
      buttons={[
        { label: 'Continue (F2)', id: 'continue', onClick: () => open('shift-copy-shifts', { option: option + 1, resource: args.resource === true }), primary: true },
        { label: 'Cancel', id: 'cancel' },
      ]}
    >
      <div style={{ display: 'grid', gap: 12, padding: '14px 16px' }} data-tutorial-id="host.mois.field.copy-options">
        {OPTIONS.map((o, i) => <PBRadio key={o} name="shift-copy" label={o} checked={option === i} onChange={() => setOption(i)} />)}
      </div>
    </SchedulerDialog>
  )
}

function CopyShifts({ args, close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const option = Number(args.option) || 1
  const sel = s.shiftSelection
  const [provider, setProvider] = useState('')
  const [start, setStart] = useState(() => stampOf((sel?.week ?? mondayOf(0)) + (option === 2 ? 0 : 7)))
  const [repeat, setRepeat] = useState('1')
  const [allDays, setAllDays] = useState(true)
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (str(a.provider)) setProvider(str(a.provider))
    if (str(a.start)) setStart(str(a.start))
    if (str(a.repeat)) setRepeat(str(a.repeat))
  }, [typed])
  const [y, m, d] = start.split('.').map(Number) as [number, number, number]
  const stop = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + (Number(repeat) || 1) * 7 - 1))
  const stopDay = Number.isNaN(stop.getTime()) ? '' : `${stop.getUTCFullYear()}/${String(stop.getUTCMonth() + 1).padStart(2, '0')}/${String(stop.getUTCDate()).padStart(2, '0')}`
  const copy = () => {
    if (option === 2 && sel && provider) {
      const resource = !!sel.resource
      const rows = resource ? s.resourceShifts : s.shifts
      const from = rows.find((r) => r.provider === sel.owner)
      if (from) {
        const next = rows.some((r) => r.provider === provider)
          ? rows.map((r) => (r.provider === provider ? { ...r, days: from.days.map((x) => ({ ...x })) } : r))
          : [...rows, { provider, days: from.days.map((x) => ({ ...x })) }]
        schedulerStore.setShifts(next, resource)
      }
    }
    schedulerStore.shiftsCopied()
    close()
  }
  return (
    <SchedulerDialog
      id="shift-copy-shifts"
      title="Shift Manager: Copy Shifts"
      width={530}
      band="Copy Options"
      onClose={close}
      buttons={[
        { label: 'Copy (F2)', id: 'copy-shifts', onClick: copy, primary: true },
        { label: 'Cancel', id: 'cancel' },
      ]}
    >
      {option === 2 && (
        <div style={{ borderBottom: '1px solid #bdbdbd', padding: '4px 10px 8px' }}>
          <div style={{ ...NAVY, marginBottom: 6 }}>Select Provider</div>
          <div className="pb-row" style={{ gap: 20, paddingLeft: 10 }}>
            <span>Provider:</span>
            <PBSelect w={170} options={['', ...schedulableProviders().filter((p) => p !== sel?.owner)]} value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>
        </div>
      )}
      <div style={{ borderBottom: '1px solid #bdbdbd', padding: '4px 10px 8px' }} data-tutorial-id="host.mois.field.copy-weeks">
        <div style={{ ...NAVY, marginBottom: 6 }}>Week or Weeks to Copy To</div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px auto 1fr', gap: '4px 8px', alignItems: 'center', paddingLeft: 10 }}>
          <span>Start:</span><PBInput w={80} value={start} onChange={(e) => setStart(e.target.value)} /><span>(Select the MONDAY of the start week)</span>
          <span>Repeat for:</span><span className="pb-row" style={{ gap: 4 }}><PBInput w={40} value={repeat} onChange={(e) => setRepeat(e.target.value)} /> wk(s)</span><span>(number of weeks to repeat for from the Start Date)</span>
          <span /><span>{stopDay}</span><span>(stop day)</span>
        </div>
      </div>
      <div style={{ padding: '4px 10px 12px' }}>
        <div style={{ ...NAVY, marginBottom: 6 }}>Identifies Days to Copy</div>
        <div style={{ paddingLeft: 80 }}><PBCheckbox label="ALL Days" checked={allDays} onChange={setAllDays} /></div>
      </div>
    </SchedulerDialog>
  )
}

registerAreaWindow('shift-add-providers', AddProviders)
registerAreaWindow('shift-copy-options', CopyOptions)
registerAreaWindow('shift-copy-shifts', CopyShifts)
