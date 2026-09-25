import { useEffect, useState } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBRadio, PBSelect, PBTextArea, PBViewHeader, PBWindow, PBButton,
} from '../../pb'
import { RESOURCES } from '../../data/daybook'
import { BLOCK_CODES, schedulableProviders, type ReservationBlock } from '../../data/schedulerSetup'
import { offsetOfStamp, schedulerStore, stampOf, useSchedulerStore } from '../../data/schedulerStore'
import { weekdayOf } from '../../data/daybook'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { NAVY, str } from './SchedulerDialog'

/* ============================================================================
   Scheduler ▸ Reservation Blocks ▸ Provider / Resource.

   Provider Reservation List — art. 303812 `f1afb41f…` and art. 303839
   `1e24eab9…` (v02.17.20): New Record, Delete Record, Save, Undo, Refresh and
   Reservation Wizard on the taskbar (the article's text calls the last one
   "Create Wizard"; the button reads Reservation Wizard); Required
   Parameters: Provider; Optional Parameters / Filters: From, To and Block
   Code; the list's columns Date / HR / MIN / # / Code / Note, newest first.
   # is in five-minute slots (3 = fifteen minutes). The Resource list is the
   same window over a resource (`20be010b…`). No patient: it is not a chart
   window.

   Reservation Block Wizard — art. 303812 `e04c271e…`: Select Items (Include
   / Provider List) on the left; Parameters on the right — Reservation Detail
   (Start Time HR MN, All Day, # of Slots, Code, Note), Recurrence (Pattern
   Weekly / Monthly; Recur every n week(s) on the seven days), Range of
   Recurrence (Start on; End By, or End after n occurrences); Ok, Cancel.

   Delete Reservation Block — art. 303839 `99ca2e11…`: Delete Occurrence /
   Delete Series (except past records), Ok and Cancel.
   ========================================================================= */

let serial = 100
const nextId = () => `nb${++serial}`

export function ReservationListView({ resource }: { resource?: boolean }) {
  const s = useSchedulerStore()
  const openWindow = useOpenWindow()
  const owners = resource ? RESOURCES : schedulableProviders()
  const [owner, setOwner] = useState(resource ? 'TREATMENT ROOM' : 'BEARDWOOD, WALTER')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [code, setCode] = useState('')
  const [cur, setCur] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const all = (resource ? s.resourceBlocks : s.blocks)[owner] ?? []
  const rows = all.filter((b) => (!from || b.date >= from) && (!to || b.date <= to) && (!code || b.code === code))
  const current = rows[Math.min(cur, rows.length - 1)]

  useEffect(() => { schedulerStore.setBlockOwner(owner, !!resource) }, [owner, resource])

  const newRecord = () => {
    const id = nextId()
    schedulerStore.addBlock(owner, !!resource, { id, date: stampOf(0), hr: '', min: '', n: '', code: '', note: '' })
    setCur(0)
    setEditing(id)
  }
  const edit = (patch: Partial<ReservationBlock>) => {
    if (current) schedulerStore.updateBlock(owner, !!resource, current.id, patch)
  }
  const cell = (key: keyof ReservationBlock, w: number) => (row: ReservationBlock) => (
    row.id === editing
      ? <PBInput w={w} value={row[key] ?? ''} onChange={(e) => edit({ [key]: e.target.value })} align="center" />
      : String(row[key] ?? '')
  )

  return (
    <>
      <PBViewHeader title={resource ? 'Resource Reservation List' : 'Provider Reservation List'} />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: newRecord },
          { label: 'Delete Record', disabled: !current, onClick: () => current && openWindow('delete-reservation-block', { owner, resource: !!resource, id: current.id }) },
          { label: 'Save', onClick: () => { setEditing(null); schedulerStore.done('block-saved') } },
          { label: 'Undo' },
          { label: 'Refresh' },
          { label: 'Reservation Wizard', onClick: () => openWindow('reservation-block-wizard', { resource: !!resource }) },
        ]}
      />
      <div style={{ display: 'flex', gap: 40, padding: '3px 12px 6px', borderBottom: '1px solid #c9c9c9', flex: 'none', background: 'var(--pb-face)' }}>
        <div>
          <div style={NAVY}>Required Parameters:</div>
          <div className="pb-row" style={{ gap: 6, marginTop: 4, paddingLeft: 20 }} data-tutorial-id="host.mois.field.reservation-owner">
            <span>{resource ? 'Resource:' : 'Provider:'}</span>
            <PBSelect w={180} options={owners} value={owner} onChange={(e) => { setOwner(e.target.value); setCur(0) }} />
          </div>
        </div>
        <div data-tutorial-id="host.mois.field.reservation-filters">
          <div style={NAVY}>Optional Parameters / Filters:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: '3px 8px', alignItems: 'center', marginTop: 4, paddingLeft: 20 }}>
            <span style={{ textAlign: 'right' }}>From:</span><PBInput w={88} value={from} onChange={(e) => setFrom(e.target.value)} />
            <span style={{ textAlign: 'right', marginLeft: 30 }}>Block Code:</span><PBSelect w={140} options={['', ...BLOCK_CODES]} value={code} onChange={(e) => setCode(e.target.value)} />
            <span style={{ textAlign: 'right' }}>To:</span><PBInput w={88} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }} data-tutorial-id="host.mois.field.reservation-list">
        <PBDataWindow
          rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.block-${r.id}`}
          columns={[
            { key: 'date', header: 'Date', width: 96, align: 'center', render: cell('date', 86) },
            { key: 'hr', header: 'HR', width: 30, align: 'center', render: cell('hr', 26) },
            { key: 'min', header: 'MIN', width: 30, align: 'center', render: cell('min', 26) },
            { key: 'n', header: '#', width: 30, align: 'center', render: cell('n', 26) },
            {
              key: 'code', header: 'Code', width: 140, align: 'left',
              render: (r) => (r.id === editing
                ? <PBSelect w={134} options={['', ...BLOCK_CODES]} value={r.code} onChange={(e) => edit({ code: e.target.value })} />
                : r.code),
            },
            { key: 'note', header: 'Note', render: (r) => (r.id === editing ? <PBInput w="100%" value={r.note} onChange={(e) => edit({ note: e.target.value })} /> : r.note) },
          ]}
          empty=""
        />
      </div>
    </>
  )
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function ReservationWizard({ args, close }: AreaWindowProps) {
  const resource = args.resource === true
  const s = useSchedulerStore()
  const owners = resource ? RESOURCES : schedulableProviders()
  const [picked, setPicked] = useState<string[]>(() => [s.blockOwner?.owner ?? owners[0]!])
  const [hr, setHr] = useState('')
  const [mn, setMn] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [slots, setSlots] = useState('')
  const [code, setCode] = useState('OUT-OF-OFFICE')
  const [note, setNote] = useState('')
  const [weekly, setWeekly] = useState(true)
  const [every, setEvery] = useState('1')
  const [days, setDays] = useState<number[]>([])
  const [start, setStart] = useState('')
  const [endBy, setEndBy] = useState(true)
  const [end, setEnd] = useState('')
  const [count, setCount] = useState('10')
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (str(a.hr)) { setHr(str(a.hr)); setAllDay(false) }
    if (str(a.mn)) setMn(str(a.mn))
    if (str(a.slots)) setSlots(str(a.slots))
    if (str(a.code)) setCode(str(a.code))
    if (str(a.note)) setNote(str(a.note))
    if (str(a.start)) setStart(str(a.start))
    if (Array.isArray(a.days)) setDays(a.days.map(Number))
    if (str(a.count)) { setEndBy(false); setCount(str(a.count)) }
  }, [typed])

  const ok = () => {
    const first = offsetOfStamp(start || stampOf(1))
    const last = endBy && end ? offsetOfStamp(end) : Infinity
    const max = endBy ? 520 : Number(count) || 10
    const step = Number(every) || 1
    const series = `wiz${++serial}`
    const make = (): ReservationBlock[] => {
      const out: ReservationBlock[] = []
      for (let off = first; off <= Math.min(last, first + 730) && out.length < max; off += 1) {
        if (Math.floor((off - first) / 7) % step !== 0) continue
        if (weekly ? !(days.length ? days : [weekdayOf(first)]).includes(weekdayOf(off)) : stampOf(off).slice(8) !== stampOf(first).slice(8)) continue
        out.push({
          id: nextId(), date: stampOf(off), hr: allDay ? '0' : String(Number(hr) || 0), min: allDay ? '0' : String(Number(mn) || 0),
          n: allDay ? '288' : slots || '12', code, note, series,
        })
      }
      return out.reverse()
    }
    schedulerStore.addBlocks(picked, resource, make)
    close()
  }

  const Band = ({ children }: { children: string }) => <div className="pb-band">{children}</div>
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title="Reservation Block Wizard"
        tutorialId="host.mois.dialog.reservation-block-wizard"
        onClose={close}
        style={{ width: 900, height: 552, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ display: 'flex', gap: 12, flex: '1 1 auto', minHeight: 0, padding: 12, background: 'var(--pb-face)' }}>
          <div style={{ width: 292, border: '1px solid #646464', display: 'flex', flexDirection: 'column', background: '#fff' }} data-tutorial-id="host.mois.field.wizard-select-items">
            <Band>Select Items</Band>
            <PBDataWindow
              gutter={false}
              rows={owners.map((o) => ({ o }))}
              rowFill={(r) => (picked.includes(r.o) ? '#ccffcc' : undefined)}
              columns={[
                { key: 'inc', header: 'Include', width: 48, align: 'center', render: (r) => <PBCheckbox checked={picked.includes(r.o)} onChange={(v) => setPicked(v ? [...picked, r.o] : picked.filter((x) => x !== r.o))} /> },
                { key: 'o', header: resource ? 'Resource List' : 'Provider List' },
              ]}
            />
          </div>
          <div style={{ flex: '1 1 auto', border: '1px solid #646464', display: 'flex', flexDirection: 'column' }}>
            <Band>Parameters</Band>
            <div style={{ padding: '6px 14px', display: 'grid', gap: 8 }}>
              <fieldset className="pb-fieldset" data-tutorial-id="host.mois.field.wizard-detail">
                <legend className="pb-fieldset__legend" style={NAVY}>Reservation Detail</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', rowGap: 4, alignItems: 'center' }}>
                  <span>Start Time:</span>
                  <span className="pb-row" style={{ gap: 3 }}><PBInput w={26} value={hr} disabled={allDay} onChange={(e) => setHr(e.target.value)} /><PBInput w={26} value={mn} disabled={allDay} onChange={(e) => setMn(e.target.value)} /><PBCheckbox label="All Day" checked={allDay} onChange={setAllDay} /></span>
                  <span># of Slots:</span><PBInput w={52} value={slots} disabled={allDay} onChange={(e) => setSlots(e.target.value)} />
                  <span>Code:</span><PBSelect w={140} options={BLOCK_CODES} value={code} onChange={(e) => setCode(e.target.value)} />
                  <span style={{ alignSelf: 'start' }}>Note:</span><PBTextArea rows={2} w="100%" value={note} onChange={(e) => setNote(e.target.value)} style={{ background: '#ffc8a8' }} />
                </div>
              </fieldset>
              <fieldset className="pb-fieldset" data-tutorial-id="host.mois.field.wizard-recurrence">
                <legend className="pb-fieldset__legend" style={NAVY}>Recurrence</legend>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 90, display: 'grid', gap: 18, alignContent: 'start', borderRight: '1px solid #bdbdbd', paddingTop: 16 }}>
                    <PBRadio name="rbw-pattern" label="Weekly" checked={weekly} onChange={() => setWeekly(true)} />
                    <PBRadio name="rbw-pattern" label="Monthly" checked={!weekly} onChange={() => setWeekly(false)} />
                  </div>
                  <div style={{ paddingLeft: 10 }}>
                    <div className="pb-row" style={{ gap: 6 }}>Recur every <PBInput w={40} value={every} onChange={(e) => setEvery(e.target.value)} /> week(s) on</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 90px)', gap: 3, marginTop: 4 }}>
                      {DAYS.map((d, i) => <PBCheckbox key={d} label={d} checked={days.includes(i)} onChange={(v) => setDays(v ? [...days, i] : days.filter((x) => x !== i))} />)}
                    </div>
                  </div>
                </div>
              </fieldset>
              <fieldset className="pb-fieldset" data-tutorial-id="host.mois.field.wizard-range">
                <legend className="pb-fieldset__legend" style={NAVY}>Range of Recurrence</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 110px auto', rowGap: 4, alignItems: 'center' }}>
                  <span>Start on:</span><PBInput w={90} value={start} onChange={(e) => setStart(e.target.value)} />
                  <span className="pb-row" style={{ gap: 6 }}><PBRadio name="rbw-end" label="End By:" checked={endBy} onChange={() => setEndBy(true)} /><PBInput w={90} value={end} onChange={(e) => setEnd(e.target.value)} /></span>
                  <span /><span />
                  <span className="pb-row" style={{ gap: 6 }}><PBRadio name="rbw-end" label="End after:" checked={!endBy} onChange={() => setEndBy(false)} /><PBInput w={40} value={count} onChange={(e) => setCount(e.target.value)} /> occurrences</span>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '6px 0 10px', flex: 'none', background: 'var(--pb-face)' }}>
          <PBButton style={{ minWidth: 76 }} data-tutorial-id="host.mois.command.wizard-ok" onClick={ok}>Ok</PBButton>
          <PBButton style={{ minWidth: 76 }} onClick={close}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

function DeleteReservationBlock({ args, close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const resource = args.resource === true
  const owner = str(args.owner)
  const id = str(args.id)
  const block = ((resource ? s.resourceBlocks : s.blocks)[owner] ?? []).find((b) => b.id === id)
  const [series, setSeries] = useState(!!block?.series)
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 86 }}>
      <PBWindow
        child
        controls={false}
        title="Delete Reservation Block"
        tutorialId="host.mois.dialog.delete-reservation-block"
        onClose={close}
        style={{ width: 250, height: 134 }}
      >
        <div style={{ flex: '1 1 auto', padding: 8, background: 'var(--pb-face)' }}>
          <div style={{ border: '1px solid #9a9a9a', padding: '6px 10px', display: 'grid', gap: 6 }}>
            <PBRadio name="drb" label="Delete Occurrence" checked={!series} onChange={() => setSeries(false)} />
            <PBRadio name="drb" label="Delete Series (except past records)" checked={series} disabled={!block?.series} onChange={() => setSeries(true)} />
          </div>
          <div className="pb-row" style={{ justifyContent: 'center', gap: 8, paddingTop: 8 }}>
            <PBButton style={{ minWidth: 70 }} data-tutorial-id="host.mois.command.delete-ok" onClick={() => { schedulerStore.deleteBlock(owner, resource, id, series); close() }}>Ok</PBButton>
            <PBButton style={{ minWidth: 70 }} onClick={close}>Cancel</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('reservation-block-wizard', ReservationWizard)
registerAreaWindow('delete-reservation-block', DeleteReservationBlock)
