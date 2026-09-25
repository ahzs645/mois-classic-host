import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBWindow } from '../../pb'
import { VISIT_CODE_FILL, visitCodeRows, weekdayOf } from '../../data/daybook'
import { dayRows, schedulerStore, stampOf, useSchedulerStore } from '../../data/schedulerStore'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { NAVY, str } from './SchedulerDialog'

/* ============================================================================
   Pre-Slot Wizard (MOIS 2.25+, myhealthkey clinics) — the day book's
   Pre-Slot Wizard button.

   Transcribed from art. 2477059: the wizard `82bf67f0…` — "Create Slots for
   <provider>", then 1. Booking Mode (Online Schedule ☑ Create slots for online
   booking with myhealthkey; Service Location), 2. Slot Detail (Starting at /
   Stopping at on the 24-hour clock, Visit Code, Duration (blocks) and the
   "15 minute slots - 1 block = 5 minutes" reminder), 3. For these days of
   the week (a ticked day turns green), 4. How often (Every week / Every
   other week / Other, with "Every n weeks" `f8448795…`), 5. Timeframe
   (Starting On defaults to tomorrow, with the day written beside it; Repeat
   until: Stop date of, or For the next n weeks `cca66509…`); Preview… and
   Cancel.

   The Preview `bd63e7f1…` / `fec4d6e4…` / `6ef35d43…`: Days (Day / Existing
   / New / Conflicts) with Remove All Conflicts; Encounters for <day> with
   Select All and Remove Selected, a row per slot typed EXISTING, NEW or
   CONFLICT; Create Slots (F2) and Cancel `7fe0c440…`. Create Slots publishes
   what is left, conflicts included.
   ========================================================================= */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const spelled = (off: number) => {
  const [, m, d] = stampOf(off).split('.').map(Number) as [number, number, number]
  return `${DAYS[weekdayOf(off)]} ${MON[m - 1]} ${d}, ${stampOf(off).slice(0, 4)}`
}
const minutes = (v: string) => { const [h, m] = v.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const hhmm = (t: number) => [String(Math.floor(t / 60)).padStart(2, '0'), String(t % 60).padStart(2, '0')] as const

export type PreSlotPlan = {
  provider: string; from: string; to: string; code: string; blocks: number
  days: number[]; every: number; start: number; weeks: number | null; stop: number
}

type Slot = { offset: number; hr: string; mn: string; code: string; n: string }

/** every slot the plan would publish, date by date */
function planSlots(p: PreSlotPlan): Slot[] {
  const out: Slot[] = []
  const last = p.weeks ? p.start + p.weeks * 7 - 1 : p.stop
  for (let off = p.start; off <= last; off += 1) {
    const week = Math.floor((off - p.start) / 7)
    if (week % p.every !== 0 || !p.days.includes(weekdayOf(off))) continue
    for (let t = minutes(p.from); t + p.blocks * 5 <= minutes(p.to); t += p.blocks * 5) {
      const [hr, mn] = hhmm(t)
      out.push({ offset: off, hr, mn, code: p.code, n: String(p.blocks) })
    }
  }
  return out
}

const Section = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <fieldset className="pb-fieldset" style={{ margin: '0 0 6px' }}>
    <legend className="pb-fieldset__legend" style={NAVY}><span style={{ color: '#c00000', marginRight: 4 }}>{n}.</span>{title}</legend>
    <div style={{ padding: '2px 6px' }}>{children}</div>
  </fieldset>
)

function PreSlotWizard({ args, close, open }: AreaWindowProps) {
  const s = useSchedulerStore()
  const here = s.current ?? { provider: 'TECHNICAL SUPPORT', offset: 0, key: '' }
  const tomorrow = here.offset + 1
  const [from, setFrom] = useState('08:00')
  const [to, setTo] = useState('16:00')
  const [code, setCode] = useState('')
  const [blocks, setBlocks] = useState(3)
  const [days, setDays] = useState<number[]>([weekdayOf(tomorrow)])
  const [how, setHow] = useState<'1' | '2' | 'other'>('1')
  const [other, setOther] = useState(3)
  const [until, setUntil] = useState<'stop' | 'weeks'>('stop')
  const [stop, setStop] = useState(tomorrow + 6)
  const [weeks, setWeeks] = useState(4)
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (str(a.from)) setFrom(str(a.from))
    if (str(a.to)) setTo(str(a.to))
    if (str(a.code)) {
      setCode(str(a.code))
      const d = Number(visitCodeRows.find((v) => v.code === str(a.code))?.slots)
      if (d) setBlocks(d)
    }
  }, [typed])

  const pickCode = (next: string) => {
    setCode(next)
    /* the duration defaults from the visit code's own default length */
    const d = Number(visitCodeRows.find((v) => v.code === next)?.slots)
    if (d) setBlocks(d)
  }

  const preview = () => {
    const plan: PreSlotPlan = {
      provider: here.provider, from, to, code, blocks,
      days, every: how === '1' ? 1 : how === '2' ? 2 : other,
      start: tomorrow, weeks: until === 'weeks' ? weeks : null, stop,
    }
    open('pre-slot-preview', { plan: JSON.stringify(plan) })
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title="Pre-Slot Wizard"
        tutorialId="host.mois.dialog.pre-slot-wizard"
        onClose={close}
        style={{ width: 420, height: 600, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 8, background: 'var(--pb-face)' }}>
          <div style={{ border: '1px solid #646464', background: 'var(--pb-face)', padding: '0 0 4px' }}>
            <div className="pb-band">Create Slots for {here.provider}</div>
            <div style={{ padding: '4px 6px' }}>
              <div data-tutorial-id="host.mois.field.preslot-booking-mode">
                <Section n={1} title="Booking Mode">
                  <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 96 }}>Online Schedule:</span><PBCheckbox label="Create slots for online booking with myhealthkey" checked /></div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 3 }}><span style={{ width: 96 }}>Service Location:</span><PBSelect w={150} options={['MAIN OFFICE (DEFAULT)']} /></div>
                </Section>
              </div>
              <div data-tutorial-id="host.mois.field.preslot-slot-detail">
                <Section n={2} title="Slot Detail">
                  <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 96 }}>Starting at:</span><PBInput w={60} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 3 }}><span style={{ width: 96 }}>Stopping at:</span><PBInput w={60} value={to} onChange={(e) => setTo(e.target.value)} /></div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 3 }}><span style={{ width: 96 }}>Visit Code:</span><PBSelect w={60} options={['', ...Object.keys(VISIT_CODE_FILL)]} value={code} onChange={(e) => pickCode(e.target.value)} /></div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 3 }}>
                    <span style={{ width: 96 }}>Duration (blocks):</span>
                    <PBInput w={60} value={String(blocks)} onChange={(e) => setBlocks(Math.max(1, Number(e.target.value) || 1))} />
                    <span>{blocks * 5} minute slots - 1 block = 5 minutes</span>
                  </div>
                </Section>
              </div>
              <div data-tutorial-id="host.mois.field.preslot-days">
                <Section n={3} title="For these days of the week">
                  <div className="pb-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                    {DAYS.map((d, i) => (
                      <span key={d} style={{ background: days.includes(i) ? '#7fe27f' : undefined, padding: '0 2px' }}>
                        <PBCheckbox label={d} checked={days.includes(i)} onChange={(v) => setDays(v ? [...days, i] : days.filter((x) => x !== i))} />
                      </span>
                    ))}
                  </div>
                </Section>
                <Section n={4} title="How often">
                  <div style={{ display: 'grid', gap: 4 }}>
                    <PBRadio name="ps-how" label="Every week" checked={how === '1'} onChange={() => setHow('1')} />
                    <PBRadio name="ps-how" label="Every other week" checked={how === '2'} onChange={() => setHow('2')} />
                    <span className="pb-row" style={{ gap: 30 }}>
                      <PBRadio name="ps-how" label="Other" checked={how === 'other'} onChange={() => setHow('other')} />
                      {how === 'other' && <span className="pb-row" style={{ gap: 6 }}>Every <PBInput w={40} value={String(other)} onChange={(e) => setOther(Math.max(1, Number(e.target.value) || 1))} /> weeks</span>}
                    </span>
                  </div>
                </Section>
              </div>
              <div data-tutorial-id="host.mois.field.preslot-timeframe">
                <Section n={5} title="Timeframe">
                  <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 80 }}>Starting On:</span><PBInput w={80} value={stampOf(tomorrow)} readOnly /><span style={{ color: '#606060' }}>{spelled(tomorrow)}</span></div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 3 }}>
                    <span style={{ width: 80 }}>Repeat until:</span>
                    <PBRadio name="ps-until" label="Stop date of" checked={until === 'stop'} onChange={() => setUntil('stop')} />
                    {until === 'stop' && <><PBInput w={80} value={stampOf(stop)} onChange={() => setStop(stop)} /><span style={{ color: '#606060' }}>{spelled(stop)}</span></>}
                  </div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 3, paddingLeft: 86 }}>
                    <PBRadio name="ps-until" label="For the next" checked={until === 'weeks'} onChange={() => setUntil('weeks')} />
                    {until === 'weeks' && <><PBInput w={40} value={String(weeks)} onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))} /><span>weeks</span><span style={{ color: '#606060' }}>{spelled(tomorrow + weeks * 7 - 2)}</span></>}
                  </div>
                </Section>
              </div>
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '6px 0 8px', flex: 'none', background: 'var(--pb-face)' }}>
          <PBButton style={{ minWidth: 90 }} data-tutorial-id="host.mois.command.preview" onClick={preview}>Preview...</PBButton>
          <PBButton style={{ minWidth: 90 }} onClick={close}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

type PreviewRow = { key: string; type: 'EXISTING' | 'NEW' | 'CONFLICT'; hr: string; mn: string; code: string; slots: string; chart: string; first: string; last: string; reason: string; loc: string; as: string }

function PreSlotPreview({ args, close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const plan = useMemo(() => JSON.parse(str(args.plan) || 'null') as PreSlotPlan | null, [args.plan])
  const [dropped, setDropped] = useState<Set<string>>(() => new Set())
  const [ticked, setTicked] = useState<Set<string>>(() => new Set())
  const slots = useMemo(() => (plan ? planSlots(plan) : []), [plan])
  const dates = [...new Set(slots.map((x) => x.offset))]
  const [dayIdx, setDayIdx] = useState(0)

  const rowsFor = (off: number): PreviewRow[] => {
    if (!plan) return []
    const existing = dayRows(s, plan.provider, off)
    const span = (hr: string, mn: string, n: string) => {
      const a = Number(hr) * 60 + Number(mn)
      return [a, a + (Number(n) || 3) * 5] as const
    }
    const ex: PreviewRow[] = existing.map((r) => ({ key: r.key, type: 'EXISTING', hr: r.hr, mn: r.mn, code: r.code, slots: r.n, chart: r.chart, first: r.first, last: r.last, reason: r.reason, loc: r.loc, as: r.as }))
    const nw: PreviewRow[] = slots.filter((x) => x.offset === off).map((x): PreviewRow => {
      const [a, b] = span(x.hr, x.mn, x.n)
      const clash = existing.some((r) => { const [c, d] = span(r.hr, r.mn, r.n); return a < d && c < b })
      return { key: `${off}|${x.hr}${x.mn}`, type: clash ? 'CONFLICT' : 'NEW', hr: x.hr, mn: x.mn, code: x.code, slots: x.n, chart: '', first: '', last: '', reason: '', loc: '', as: '' }
    }).filter((r) => !dropped.has(r.key))
    return [...ex, ...nw].sort((x, y) => (x.hr + x.mn).localeCompare(y.hr + y.mn) || (x.type === 'EXISTING' ? -1 : 1))
  }
  const counts = dates.map((off) => {
    const rows = rowsFor(off)
    return { off, existing: rows.filter((r) => r.type === 'EXISTING').length, created: rows.filter((r) => r.type !== 'EXISTING').length, conflicts: rows.filter((r) => r.type === 'CONFLICT').length }
  })
  const day = dates[dayIdx]
  const rows = day === undefined ? [] : rowsFor(day)

  const createSlots = () => {
    if (!plan) return
    for (const off of dates) {
      const keep = rowsFor(off).filter((r) => r.type !== 'EXISTING')
      schedulerStore.createSlots(plan.provider, off, keep.map((r) => ({ hr: r.hr, mn: r.mn, code: r.code, n: r.slots })))
    }
    close()
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 86 }}>
      <PBWindow
        child
        controls={false}
        title="Pre-Slot Wizard: Preview"
        tutorialId="host.mois.dialog.pre-slot-preview"
        onClose={close}
        style={{ width: 980, height: 520, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ display: 'flex', gap: 6, flex: '1 1 auto', minHeight: 0, padding: 6, background: 'var(--pb-face)' }}>
          <div style={{ width: 236, display: 'flex', flexDirection: 'column', border: '1px solid #646464', background: '#fff' }} data-tutorial-id="host.mois.field.preslot-days-list">
            <div className="pb-band" style={{ display: 'flex' }}>
              <span>Days</span><span style={{ flex: 1 }} />
              <PBButton size="sm" data-tutorial-id="host.mois.command.remove-all-conflicts" onClick={() => {
                const all = new Set(dropped)
                for (const off of dates) rowsFor(off).filter((r) => r.type === 'CONFLICT').forEach((r) => all.add(r.key))
                setDropped(all)
              }}>Remove All Conflicts</PBButton>
            </div>
            <PBDataWindow
              rows={counts.map((c) => ({ day: stampOf(c.off), existing: String(c.existing), created: String(c.created), conflicts: String(c.conflicts) }))}
              current={dayIdx}
              onCurrentChange={setDayIdx}
              columns={[
                { key: 'day', header: 'Day', width: 76 },
                { key: 'existing', header: 'Existing', width: 50, align: 'center' },
                { key: 'created', header: 'New', width: 40, align: 'center' },
                { key: 'conflicts', header: 'Conflicts', width: 54, align: 'center' },
              ]}
              empty=""
            />
          </div>
          <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #646464', background: '#fff' }}>
            <div className="pb-band" style={{ display: 'flex' }}>
              <span>Encounters for {day === undefined ? '' : spelled(day)}</span><span style={{ flex: 1 }} />
              <PBButton size="sm" onClick={() => setTicked(new Set(rows.filter((r) => r.type === 'CONFLICT').map((r) => r.key)))}>Select All</PBButton>
              <PBButton size="sm" onClick={() => { setDropped(new Set([...dropped, ...ticked])); setTicked(new Set()) }}>Remove Selected</PBButton>
            </div>
            <PBDataWindow
              rows={rows}
              rowFill={(r) => (r.type === 'CONFLICT' ? '#ffff9e' : undefined)}
              columns={[
                { key: 'sel', header: 'Select', width: 44, align: 'center', render: (r) => (r.type === 'CONFLICT' ? <PBCheckbox checked={ticked.has(r.key)} onChange={(v) => { const t = new Set(ticked); v ? t.add(r.key) : t.delete(r.key); setTicked(t) }} /> : null) },
                { key: 'type', header: 'Type', width: 74 },
                { key: 'hr', header: 'HR', width: 28, align: 'center' },
                { key: 'mn', header: 'MN', width: 28, align: 'center' },
                { key: 'code', header: 'Code', width: 40 },
                { key: 'slots', header: 'Slots', width: 38, align: 'center' },
                { key: 'chart', header: 'Chart', width: 56 },
                { key: 'first', header: 'First Name', width: 90 },
                { key: 'last', header: 'Last Name', width: 90 },
                { key: 'reason', header: 'Visit Reason', width: 150 },
                { key: 'loc', header: 'Service Location', width: 120 },
                { key: 'as', header: 'AS', width: 28 },
              ]}
              empty=""
            />
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '6px 0 8px', flex: 'none', background: 'var(--pb-face)' }}>
          <PBButton style={{ minWidth: 100 }} data-tutorial-id="host.mois.command.create-slots" onClick={createSlots}>Create Slots (F2)</PBButton>
          <PBButton style={{ minWidth: 90 }} onClick={close}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('pre-slot-wizard', PreSlotWizard)
registerAreaWindow('pre-slot-preview', PreSlotPreview)
