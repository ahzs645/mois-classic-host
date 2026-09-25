import { useEffect, useState } from 'react'
import { PBButton, PBCheckbox, PBInput, PBRadio, PBSelect, PBSpinner, PBWindow } from '../../pb'
import { daybookProviders } from '../../data/mois'
import type { PrintReport } from '../../data/printReports'
import { daybookPrintPage } from '../../data/schedulerPrintReports'
import { currentRow, schedulerStore, stampOf, useSchedulerStore } from '../../data/schedulerStore'
import { RichtextReportWindow } from '../PrintFlow'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { SchedulerDialog, str } from './SchedulerDialog'

/* ============================================================================
   Printing from the day book.

   Print Current Day Book — art. 303823 `92609ac3…` (v02.17.20), what Print
   List and Print ▸ Print Daybook open: a `Current Day Book` box with Print
   For (Current Provider / All Providers), Provider and Date filled from the
   day book behind it; `Print Options` — All Day / AM Only / PM Only down the
   left and Include '00' Items., Include Cancelled / Re-Booked / No-Show
   Appointments down the right, all ticked; Line Spacing (1) and As Slate;
   Save as Default Settings and Clear My Default Settings; Print and Cancel.
   Print generates the preview ("This will show all appointments for the date
   and provider(s) selected"). The page itself is not captured and is
   modelled in data/schedulerPrintReports.ts.

   Print Appointment Card — art. 303825: "Preview appears" and "Print All"
   commits it; the text a clinic adds to the card is set in Administration.
   The card's layout is not captured: it is modelled as the appointment
   itself — who, when, with whom and where.
   ========================================================================= */

function PrintCurrentDayBook({ args, close, open }: AreaWindowProps) {
  const s = useSchedulerStore()
  const [from] = useState(() => s.current ?? { provider: 'TECHNICAL SUPPORT', offset: 0, key: '' })
  const [all, setAll] = useState(false)
  const [provider, setProvider] = useState(from.provider)
  const [date, setDate] = useState(stampOf(from.offset))
  const [part, setPart] = useState<'all' | 'am' | 'pm'>('all')
  const [inc, setInc] = useState({ zeros: true, cancelled: true, rebooked: true, noShow: true })
  const [spacing, setSpacing] = useState(1)
  const [slate, setSlate] = useState(false)
  const typed = JSON.stringify(args)
  useEffect(() => {
    const a = JSON.parse(typed) as Record<string, unknown>
    if (typeof a.spacing === 'number') setSpacing(a.spacing)
    if (a.part === 'am' || a.part === 'pm' || a.part === 'all') setPart(a.part)
    if (a.all === true) setAll(true)
  }, [typed])

  const print = () => {
    const page = daybookPrintPage({ provider, stamp: date, all, part, ...inc, spacing, slateOnly: slate })
    open('daybook-print-preview', { page })
  }

  return (
    <SchedulerDialog
      id="print-current-daybook"
      title="Print Current Day Book"
      width={548}
      band="Current Day Book"
      onClose={close}
      buttons={[
        { label: 'Print', id: 'print-daybook', onClick: print, primary: true },
        { label: 'Cancel', id: 'cancel' },
      ]}
    >
      <div style={{ padding: '8px 12px 6px' }}>
        <div className="pb-row" style={{ gap: 8 }}>
          <span style={{ width: 62 }}>Print For:</span>
          <PBRadio name="pcd-for" label="Current Provider" checked={!all} onChange={() => setAll(false)} />
          <span style={{ width: 120 }} />
          <PBRadio name="pcd-for" label="All Providers" checked={all} onChange={() => setAll(true)} />
        </div>
        <div className="pb-row" style={{ gap: 8, marginTop: 6 }}>
          <span style={{ width: 62 }}>Provider:</span>
          <PBSelect w={146} options={daybookProviders.map((p) => p.provider)} value={provider} onChange={(e) => setProvider(e.target.value)} disabled={all} />
          <span style={{ marginLeft: 60 }}>Date:</span>
          <PBInput w={84} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid #bdbdbd', padding: '4px 12px', color: '#1f4fbf' }}>Print Options</div>
      <div style={{ borderTop: '1px solid #bdbdbd', padding: '8px 12px', display: 'flex', gap: 60 }} data-tutorial-id="host.mois.field.print-options">
        <div style={{ display: 'grid', gap: 8, alignContent: 'start', width: 180 }}>
          <PBRadio name="pcd-part" label="All Day" checked={part === 'all'} onChange={() => setPart('all')} />
          <PBRadio name="pcd-part" label="AM Only" checked={part === 'am'} onChange={() => setPart('am')} />
          <PBRadio name="pcd-part" label="PM Only" checked={part === 'pm'} onChange={() => setPart('pm')} />
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          <PBCheckbox label="Include '00' Items." checked={inc.zeros} onChange={(v) => setInc({ ...inc, zeros: v })} />
          <PBCheckbox label="Include Cancelled Appointments" checked={inc.cancelled} onChange={(v) => setInc({ ...inc, cancelled: v })} />
          <PBCheckbox label="Include Re-Booked Appointments" checked={inc.rebooked} onChange={(v) => setInc({ ...inc, rebooked: v })} />
          <PBCheckbox label="Include No-Show Appointments" checked={inc.noShow} onChange={(v) => setInc({ ...inc, noShow: v })} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid #bdbdbd', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span data-tutorial-id="host.mois.field.line-spacing" className="pb-row" style={{ gap: 8 }}>
          <span>Line Spacing:</span>
          <PBSpinner value={spacing} min={1} max={5} onChange={setSpacing} w={42} />
        </span>
        <span style={{ marginLeft: 150 }}>
          <PBCheckbox label="As Slate" checked={slate} onChange={setSlate} tutorialId="host.mois.check.as-slate" />
        </span>
      </div>
      <div style={{ borderTop: '1px solid #bdbdbd', padding: '6px 12px 8px', display: 'grid', justifyContent: 'end', gap: 2 }}>
        <PBButton style={{ width: 136 }}>Save as Default Settings</PBButton>
        <PBButton style={{ width: 136 }}>Clear My Default Settings</PBButton>
      </div>
    </SchedulerDialog>
  )
}

function DaybookPrintPreview({ args, close }: AreaWindowProps) {
  const report: PrintReport = {
    menu: 'Print Daybook', title: 'Print Current Day Book', fields: [],
    reportTitle: 'Day Book', captured: false, page: str(args.page),
  }
  return <RichtextReportWindow report={report} onClose={close} />
}

function AppointmentCard({ close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const row = currentRow(s)
  const when = s.current ? stampOf(s.current.offset) : ''
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title="Appointment Card"
        tutorialId="host.mois.dialog.appointment-card"
        onClose={close}
        style={{ width: 560, height: 420, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div className="pb-row" style={{ gap: 4, padding: '3px 4px', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
          <PBButton data-tutorial-id="host.mois.command.print-all" onClick={() => { schedulerStore.done('card-printed'); close() }}>Print All</PBButton>
          <PBButton onClick={close}>Cancel</PBButton>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, background: '#808080', padding: 18, overflow: 'auto' }}>
          <div style={{ background: '#fff', width: 380, margin: '0 auto', padding: '14px 18px', fontFamily: 'Arial, sans-serif', fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>HALLIWELL MEDICAL CLINIC</div>
            <div style={{ margin: '8px 0 2px' }}>APPOINTMENT REMINDER</div>
            {row ? (
              <>
                <div><b>{row.first} {row.last}</b>{row.chart ? ` — Chart ${row.chart}` : ''}</div>
                <div>{when} at {row.hr}:{row.mn}</div>
                <div>With: {s.current?.provider}</div>
                <div>{row.loc}</div>
              </>
            ) : <div>No appointment is selected.</div>}
            <div style={{ marginTop: 10, color: '#606060', borderTop: '1px dashed #bbb', paddingTop: 6 }}>
              (Clinic text entered in the Administration module prints here.)
            </div>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('print-current-daybook', PrintCurrentDayBook)
registerAreaWindow('daybook-print-preview', DaybookPrintPreview)
registerAreaWindow('appointment-card', AppointmentCard)
