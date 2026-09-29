import { usePatientRoster } from '../../data/patient-context'
import type { DayRow } from '../../data/schedulerStore'
import { schedulerExtras, useSchedulerExtras } from '../../data/schedulerExtras'
import { PBButton, PBInput, PBRadio } from '../../pb'
import { useOpenWindow } from '../areaWindowRegistry'

/* ============================================================================
   The day book's Patient Detail Slide (added in v2.26).

   PROVENANCE: art. 303795 "Patient Detail Slide":
   - `62604fcd…` — collapsed: a light-blue band at the foot of the day book
     reading `Patient - ALLERGY/INTOLERANCES` with Change View, Summary/Detail
     and Hide links at the right.
   - `9c616765…` / `3c48e3af…` / `21e7e068…` — expanded on the Daybook
     Summary: Chart No., Name (F/M/L) in three boxes, Alias (F/L), Birth
     Date (age), Gender […]; Status [A] since …, Insurance [BC ▾][number]
     Dep: [00], Service Provider [▾], Home / Work / Cell radios with their
     numbers and Ext.; BCHN, Address ×2, City […], Province, Postal Code,
     Country; READ ONLY at the right.
   - `377de417…` — Change View opens Select Summary (screens/scheduler/
     SchedulerMenuWindows.tsx, `daybook-select-summary`).
   - The text: "Press the Summary/Detail hyperlink … to expand or collapse
     the summary slide"; "Choosing to 'Hide' the Patient Detail Slide will
     collapse the slide to the bottom of the Scheduler, displaying what type
     of summary is currently selected." Action ▸ Patient Summary / Detail
     (Ctrl+Q) and Hide Patient Summary (Ctrl+Shift+Q) do the same.

   Only the open training chart has chart folders behind it, so the other
   summaries print their heading over an empty list for any other patient
   (the day book's synthetic patients carry no chart export). The Daybook
   Summary fills from the roster when the row's chart is on it, else from
   the row itself.
   ========================================================================= */

export function PatientDetailSlide({ row }: { row: DayRow | undefined }) {
  const extras = useSchedulerExtras()
  const roster = usePatientRoster()
  const openWindow = useOpenWindow()
  const { summary, mode } = extras.slide
  const p = row?.chart ? roster.find((x) => x.chart === row.chart) : undefined
  const expanded = mode === 'detail'

  const link = (id: string, label: string, onClick: () => void) => (
    <PBButton bare className="pb-link" command={id} onClick={() => onClick()}>
      {label}
    </PBButton>
  )
  const box = (w: number, v = '') => <PBInput w={w} readOnly value={v} style={{ background: '#e4e8ee' }} />
  const age = p?.dob ? String(2026 - Number(p.dob.slice(0, 4))) : ''

  return (
    <div style={{ flex: 'none', display: 'flex', flexDirection: 'column' }} data-tutorial-id="host.mois.field.patient-detail-slide">
      {expanded && (
        <div style={{ background: 'linear-gradient(#e9eef5, #d7e0ec)', borderTop: '1px solid #9aa9bd', padding: '4px 8px' }} data-tutorial-id="host.mois.field.patient-detail-expanded">
          {summary === 'DAYBOOK SUMMARY' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '84px 290px 90px 250px 84px 1fr', rowGap: 3, columnGap: 6, alignItems: 'center' }}>
              <span>Chart No.:</span><b>{row?.chart ?? ''}</b>
              <span style={{ textAlign: 'right' }}>Status:</span><span className="pb-row" style={{ gap: 6 }}>{box(40, p?.status ?? (row?.chart ? 'A' : ''))}{p ? `since ${p.registered ?? ''}` : ''}</span>
              <span /><b style={{ textAlign: 'right' }}>READ ONLY</b>
              <span>Name (F/M/L):</span>
              <span className="pb-row" style={{ gap: 3 }}>{box(92, p?.first.toUpperCase() ?? row?.first ?? '')}{box(92, p?.middle.toUpperCase() ?? '')}{box(92, p?.last.toUpperCase() ?? row?.last ?? '')}</span>
              <span style={{ textAlign: 'right' }}>Insurance:</span>
              <span className="pb-row" style={{ gap: 3 }}>{box(36, p?.insuranceBy ?? '')}{box(110, p?.insurance ?? '')}<span>Dep:</span>{box(30, p?.dep ?? '')}</span>
              <span>BCHN:</span>{box(110, p?.bchn ?? '')}
              <span>Alias (F/L):</span>
              <span className="pb-row" style={{ gap: 3 }}>{box(140, p?.alias ?? '')}{box(140, p?.aliasLast ?? '')}</span>
              <span style={{ textAlign: 'right' }}>Service Provider:</span>{box(240, p?.provider ?? '')}
              <span>Address:</span>{box(240, p?.address ?? '')}
              <span>Birth Date:</span>
              <span className="pb-row" style={{ gap: 6 }}>{box(92, p?.dob ?? '')}<span>({age})</span><span>Gender:</span>{box(50, p?.gender ?? '')}</span>
              <span style={{ textAlign: 'right' }}><u>Home:</u></span>
              <span className="pb-row" style={{ gap: 6 }}><PBRadio name="slide-phone" checked /> {box(100, p?.home ?? '')}</span>
              <span>City:</span>{box(160, p?.city ?? '')}
              <span>eMail (Home):</span>{box(280, p?.emailHome ?? '')}
              <span style={{ textAlign: 'right' }}>Work:</span>
              <span className="pb-row" style={{ gap: 6 }}><PBRadio name="slide-phone" /> {box(100, p?.work ?? '')}<span>Ext.:</span>{box(40, p?.workExt ?? '')}</span>
              <span>Postal Code:</span>{box(90, p?.postal ?? '')}
              <span>eMail (Work):</span>{box(280, p?.emailWork ?? '')}
              <span style={{ textAlign: 'right' }}>Cell:</span>
              <span className="pb-row" style={{ gap: 6 }}><PBRadio name="slide-phone" /> {box(100, p?.cell ?? '')}</span>
              <span>Country:</span>{box(90, p?.country ?? '')}
            </div>
          ) : (
            <div style={{ minHeight: 110 }}>
              <b>{summary}</b>
              <div style={{ color: '#505050', paddingTop: 6 }}>
                {row ? `Nothing on file for ${row.first} ${row.last} in this summary.` : 'Select an appointment to see its summary.'}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="pb-summaryband">
        <span>Patient - {summary}</span>
        <span className="pb-summaryband__spacer" />
        {link('change-view', 'Change View', () => { openWindow('daybook-select-summary') })}
        {link('summary-detail', 'Summary/Detail', () => schedulerExtras.setSlide({ mode: expanded ? 'summary' : 'detail' }))}
        {link('hide-slide', 'Hide', () => schedulerExtras.setSlide({ mode: 'hidden' }))}
      </div>
    </div>
  )
}
