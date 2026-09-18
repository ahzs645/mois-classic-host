import { useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBInput, PBRadio, PBSelect, PBViewHeader,
} from '../pb'

/* ============================================================================
   Day and week grids — the "Day View - N Providers" and "Week View" nodes.

   A time axis down the left, one column per provider/resource (or per
   weekday), and appointment blocks painted into the slots. PowerBuilder
   draws this as a graphical DataWindow rather than a row grid, so the
   construction is a CSS grid rather than a <table>.

   NOT TRANSCRIBED: no screenshot in the reference set shows these
   populated, so the slot rendering follows the day-book visual language
   rather than an observed layout.
   ========================================================================= */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)  // 08:00 .. 19:00
const SLOTS_PER_HOUR = 4                                    // 15-minute slots

const PROVIDERS = [
  'FAKERRY, FAKER', 'MURPHY, JOAN', 'GRAHAM, CHELSEA', 'SMITH, DALENE',
  'GRUBB, HELENA', 'DHALIWAL, RUPINDER', 'ESIEVOADJE, EVONEME', 'GHATAVI, KAYHAN',
]
const WEEKDAYS = ['Mon Aug 10', 'Tue Aug 11', 'Wed Aug 12', 'Thu Aug 13', 'Fri Aug 14']

type Booking = { col: number; slot: number; span: number; label: string; tone: 'normal' | 'alert' | 'ok' }

const SAMPLE: Booking[] = [
  { col: 0, slot: 4, span: 2, label: 'LTTCM MEETING', tone: 'normal' },
  { col: 0, slot: 12, span: 4, label: 'AADAMS, PATCH — TEST 3', tone: 'ok' },
  { col: 1, slot: 8, span: 2, label: 'MULTIPLE PREGNANCY', tone: 'normal' },
  { col: 1, slot: 20, span: 2, label: 'NO-SHOW', tone: 'alert' },
  { col: 2, slot: 2, span: 4, label: 'CONGESTIVE HEART FAILURE', tone: 'normal' },
  { col: 3, slot: 16, span: 2, label: 'TEST FOR CLONING APTS', tone: 'ok' },
]

export function DayGridView({
  columns, mode = 'day', title,
}: {
  /** how many provider/resource columns to draw */
  columns: number
  mode?: 'day' | 'week'
  title: string
}) {
  const [view, setView] = useState('Scheduler')
  const heads = mode === 'week' ? WEEKDAYS : PROVIDERS.slice(0, columns)
  const rows = HOURS.length * SLOTS_PER_HOUR

  return (
    <>
      <PBViewHeader title={title} meta="Tuesday Aug 11, 2026" />
      <PBCommandRow
        commands={[
          { label: 'New Appt' }, { label: 'Appt Series' }, { label: 'Save', disabled: true },
          { label: 'Delete Appt', disabled: true }, { label: 'Undo', disabled: true },
          { label: 'Refresh' }, null, { label: 'Print List' },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #c9c9c9', flex: 'none' }}>
        <div style={{ padding: '5px 8px', flex: 'none', width: 196 }}>
          <div className="pb-row"><span style={{ width: 40 }}>Date:</span><PBInput w={112} align="center" defaultValue="2026.08.11" /></div>
          <div className="pb-row" style={{ marginTop: 6, gap: 3 }}>
            <PBButton size="sm" style={{ width: 24 }}>&laquo;</PBButton>
            <PBButton size="sm" style={{ width: 24 }}>&lsaquo;</PBButton>
            <PBButton style={{ flex: '1 1 auto', minWidth: 0 }}>Today</PBButton>
            <PBButton size="sm" style={{ width: 24 }}>&rsaquo;</PBButton>
            <PBButton size="sm" style={{ width: 24 }}>&raquo;</PBButton>
          </div>
        </div>
        <span className="pb-vrule" style={{ margin: 0 }} />
        <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>
            {mode === 'week' ? 'Provider:' : 'Service Location:'}
          </span>
          <PBSelect options={['', 'ACROPOLIS MANOR', 'DAW HEALTH UNIT', 'CLOUD CITY']} w={240} />
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>View Type:</span>
          <div className="pb-row pb-row--gap-lg">
            {['Scheduler', 'Provider', 'Biller'].map((v) => (
              <PBRadio key={v} name="dgview" label={v} checked={view === v} onChange={() => setView(v)} />
            ))}
          </div>
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Hide Status:</span>
          <div className="pb-row pb-row--gap-lg">
            <PBCheckbox label="No-Show" checked /><PBCheckbox label="Rebooked" checked /><PBCheckbox label="Cancelled" checked />
          </div>
        </div>
      </div>

      {/* --- the grid ---------------------------------------------------- */}
      <div className="pb-daygrid">
        <div className="pb-daygrid__head">
          <span className="pb-daygrid__corner" />
          {heads.map((h) => <span className="pb-daygrid__col-head" key={h}>{h}</span>)}
        </div>

        <div className="pb-daygrid__body">
          <div className="pb-daygrid__axis">
            {HOURS.map((h) => (
              <span className="pb-daygrid__hour" key={h}>{String(h).padStart(2, '0')}:00</span>
            ))}
          </div>

          <div
            className="pb-daygrid__slots"
            style={{ gridTemplateColumns: `repeat(${heads.length}, minmax(0, 1fr))` }}
          >
            {heads.map((h, ci) => (
              <div className="pb-daygrid__col" key={h}>
                {Array.from({ length: rows }, (_, ri) => (
                  <span
                    className={`pb-daygrid__slot${ri % SLOTS_PER_HOUR === 0 ? ' is-hour' : ''}`}
                    key={ri}
                  />
                ))}
                {SAMPLE.filter((b) => b.col === ci).map((b, i) => (
                  <span
                    key={i}
                    className={`pb-daygrid__appt pb-daygrid__appt--${b.tone}`}
                    style={{ top: b.slot * 13, height: b.span * 13 - 1 }}
                    title={b.label}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
