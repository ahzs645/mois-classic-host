import { Fragment, useState } from 'react'
import { PBBand, PBButton, PBWindow } from '../../pb'
import { VISIT_CODE_FILL, weekdayOf } from '../../data/daybook'
import { daybookProviders } from '../../data/mois'
import { dayRows, schedulerBridge, stampOf, useSchedulerStore } from '../../data/schedulerStore'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'

/* ============================================================================
   Provider Schedule Summary — Action ▸ Daybook Bar - Multi (Alt+F2), and
   Daybook Bar - Single (Alt+F3) for the day book's own provider.

   Transcribed from art. 303820 `3bc6e4e3…` (v02.17.20): a `Provider
   Schedule Summary` band, then one line per provider-day — DATE, PROVIDER,
   the weekday — against an 8:00 to 16:00 bar in quarter-hour cells. A
   booking paints its quarters in its visit code's colour; a quarter holding
   two bookings carries the numeral `2`; the solid line along the top of a
   quarter says a booking is present. The current day book's line is bold on
   the blue current-row fill. PgUp / Select / Cancel / PgDwn across the foot.
   ========================================================================= */

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16]
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ProviderScheduleSummary({ args, close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const here = s.current ?? { provider: 'TECHNICAL SUPPORT', offset: 0, key: '' }
  const multi = args.multi !== false
  const [page, setPage] = useState(0)
  const providers = multi ? daybookProviders.map((p) => p.provider) : [here.provider]
  const lines: { provider: string; offset: number }[] = []
  for (let off = here.offset - 7 + page * 14; off <= here.offset + 7 + page * 14; off += 1) {
    for (const provider of providers) {
      if (dayRows(s, provider, off).length) lines.push({ provider, offset: off })
    }
  }
  const [pick, setPick] = useState(() => Math.max(0, lines.findIndex((l) => l.provider === here.provider && l.offset === here.offset)))

  const select = () => {
    const line = lines[pick]
    if (line) schedulerBridge().showDay?.(line.provider, line.offset)
    close()
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title="Provider Schedule Summary"
        tutorialId="host.mois.dialog.provider-schedule-summary"
        onClose={close}
        style={{ width: 1000, height: 620, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 6, background: 'var(--pb-face)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: '#fff' }}>
            <PBBand>Provider Schedule Summary</PBBand>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `86px 172px 34px repeat(${HOURS.length * 4}, 1fr)`, fontSize: 11 }}>
                <span style={head}>DATE</span>
                <span style={{ ...head, textAlign: 'left' }}>PROVIDER</span>
                <span style={head} />
                {HOURS.map((h) => <span key={h} style={{ ...head, gridColumn: 'span 4', textAlign: 'left' }}>{h}:00</span>)}
                {lines.map((l, n) => {
                  const rows = dayRows(s, l.provider, l.offset)
                  const current = l.provider === here.provider && l.offset === here.offset
                  const fill = n === pick ? '#c7d9f3' : n % 2 ? '#fbfaf5' : '#f4f1e6'
                  const cell = { background: fill, fontWeight: current ? 700 : 400, borderBottom: '1px dashed #d7d2c0', padding: '3px 4px', cursor: 'default' } as const
                  return (
                    <Fragment key={`${l.provider}${l.offset}`}>
                      <span style={cell} onClick={() => setPick(n)}>{stampOf(l.offset)}</span>
                      <span style={cell} onClick={() => setPick(n)}>{l.provider}</span>
                      <span style={{ ...cell, textAlign: 'right' }} onClick={() => setPick(n)}>{WD[weekdayOf(l.offset)]}</span>
                      {HOURS.flatMap((h) => [0, 15, 30, 45].map((q) => {
                        const t = h * 60 + q
                        const inQ = rows.filter((r) => {
                          const start = Number(r.hr) * 60 + Number(r.mn)
                          return t >= start && t < start + (Number(r.n) || 3) * 5
                        })
                        const top = inQ[0]
                        return (
                          <span
                            key={`${h}${q}`}
                            onClick={() => setPick(n)}
                            style={{
                              ...cell, padding: 0, fontSize: 10, textAlign: 'center',
                              borderLeft: q === 0 ? '1px solid #bdb8a6' : undefined,
                              background: top ? VISIT_CODE_FILL[top.code] ?? '#9fc' : fill,
                              boxShadow: top ? 'inset 0 1px 0 #000' : undefined,
                            }}
                          >
                            {inQ.length > 1 ? String(inQ.length) : ''}
                          </span>
                        )
                      }))}
                    </Fragment>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="pb-row" style={{ padding: '8px 0 2px', flex: 'none' }}>
            <PBButton style={{ width: 76 }} onClick={() => setPage((p) => p - 1)}>PgUp</PBButton>
            <span className="pb-row__spacer" />
            <PBButton style={{ width: 76 }} onClick={select} data-tutorial-id="host.mois.command.select-day">Select</PBButton>
            <PBButton style={{ width: 76 }} onClick={close}>Cancel</PBButton>
            <span className="pb-row__spacer" />
            <PBButton style={{ width: 76 }} onClick={() => setPage((p) => p + 1)}>PgDwn</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

const head = { background: 'var(--pb-dw-header)', padding: '3px 4px', fontWeight: 700, textAlign: 'center' as const, position: 'sticky' as const, top: 0 }

registerAreaWindow('provider-schedule-summary', ProviderScheduleSummary)
