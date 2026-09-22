import { chartRowsFor, useChartExport } from '../data/chart-records'
import { usePatient } from '../data/patient-context'
import type { PrintReport } from '../data/printReports'
import { PBBand, PBButton, PBCheckbox, PBInput, PBSelect, PBWindow } from '../pb'

/* ============================================================================
   The two windows every MOIS print goes through.

   `SelectionParameterDialog` is the grey-banded parameter window a Print-menu
   item opens; `RichtextReportWindow` is the editable RTF preview Ok produces.
   Both are shells — what differs per report is only the field list and the
   page, which live in `data/printReports.ts` with their provenance.

   Transcribed from `PrintInterventionsList_SelectedParams_image2.png` (the
   dialog: band `Selection Parameter`, navy section headings, Ok / Cancel
   69×22 bottom-centre with a 19px gap) and `print_1.png` /
   `PrintInterventionsList_SelectedParams_image3.png` (the preview: a command
   row of Print / Print and Attach / Fax / Cancel, a `Print Pages:` field and
   a `Printer:` drop-down, then an RTF ribbon, then the page).
   ========================================================================= */

export function SelectionParameterDialog({
  report, onOk, onClose,
}: {
  report: PrintReport
  onOk?: () => void
  onClose?: () => void
}) {
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.print-params"
        title={report.title}
        onClose={onClose}
        style={{ width: 650, height: 'min(530px, calc(100vh - 80px))' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 12, gap: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: 'var(--pb-window)' }}>
            <PBBand>Selection Parameter</PBBand>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '4px 10px' }}>
              {report.fields.map((f, i) => {
                if (f.kind === 'section') {
                  return (
                    <div key={i} style={{ color: '#000080', fontWeight: 700, margin: '8px 0 4px' }}>{f.label}</div>
                  )
                }
                if (f.kind === 'check') {
                  return (
                    <div key={i} className="pb-row" style={{ padding: '2px 0 2px 12px' }}>
                      <PBCheckbox label={f.label} checked={f.checked} />
                    </div>
                  )
                }
                return (
                  <div key={i} className="pb-row" style={{ gap: 6, padding: '2px 0 2px 12px' }}>
                    <span className="pb-form__label" style={{ width: 72 }}>{f.label}</span>
                    <PBInput w={f.width ?? 120} defaultValue="" />
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '14px 0 4px', flex: 'none' }}>
            <PBButton
              className="pb-btn--default"
              style={{ width: 69 }}
              data-tutorial-id="host.mois.command.print-ok"
              onClick={onOk}
            >
              Ok
            </PBButton>
            <PBButton style={{ width: 69 }} onClick={onClose}>Cancel</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

/* the RTF ribbon under the command row — decorative, as in the capture */
function Ribbon() {
  return (
    <div className="pb-row" style={{ gap: 4, padding: '2px 4px', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
      <PBSelect w={92} options={['[Normal]']} />
      <PBSelect w={120} options={['Lucida Console']} />
      <PBSelect w={48} options={['11', '10']} />
      <PBButton size="sm" style={{ fontWeight: 700, minWidth: 22 }}>B</PBButton>
      <PBButton size="sm" style={{ fontStyle: 'italic', minWidth: 22 }}>I</PBButton>
      <PBButton size="sm" style={{ textDecoration: 'underline', minWidth: 22 }}>U</PBButton>
      {['\u2261', '\u2261', '\u2261', '\u2261'].map((g, i) => (
        <PBButton key={i} size="sm" style={{ minWidth: 22 }}>{g}</PBButton>
      ))}
      <PBSelect w={64} options={['100%', '75%', '50%']} />
      <PBButton size="sm" style={{ minWidth: 22 }}>&bull;</PBButton>
      <PBButton size="sm" style={{ minWidth: 22 }}>1.</PBButton>
      <PBButton size="sm" style={{ minWidth: 22 }}>&rarr;</PBButton>
      <PBButton size="sm" style={{ minWidth: 22 }}>&para;</PBButton>
    </div>
  )
}

export function RichtextReportWindow({
  report, onClose,
}: {
  report: PrintReport
  onClose?: () => void
}) {
  const patient = usePatient()
  useChartExport()
  const nodes: Record<string, string> = {
    'Interventions for Patient': 'interventions', 'Medications for Patient': 'ltm',
    'Problem List for Patient': 'conditions', 'Family History (Hx) for Patient': 'famhx',
    'Social History for Patient': 'socialhx', 'Radiology Reports for Patient': 'imaging',
    'Consultations for Patient': 'consults', 'Procedure List for Patient': 'procedures',
    'Facility Admission for Patient': 'admissions', 'MAR History': 'mar',
  }
  const rows = chartRowsFor(patient.chart, nodes[report.menu] ?? '')
  const lines = [report.reportTitle, `Patient: ${patient.full}    Chart: ${patient.chart}`, `DoB: ${patient.dob}`, '',
    ...rows.map(row => Object.entries(row).filter(([key, value]) => value && !['m', 's', 'clip', 'd', 'd1', 'd2', 'd3'].includes(key)).map(([key, value]) => `${key}: ${value}`).join('   ')),
    ...(rows.length ? [] : ['No records available.'])]
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.print-report"
        title={`Richtext Report: ${report.reportTitle}`}
        onClose={onClose}
        style={{ width: 'min(870px, calc(100vw - 60px))', height: 'min(720px, calc(100vh - 60px))' }}
      >
        <div className="pb-row" style={{ gap: 4, padding: '3px 4px', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
          <PBButton data-tutorial-id="host.mois.command.print">Print</PBButton>
          <PBButton data-tutorial-id="host.mois.command.print-and-attach">Print and Attach</PBButton>
          <PBButton>Fax</PBButton>
          <PBButton onClick={onClose}>Cancel</PBButton>
          <span className="pb-form__label" style={{ marginLeft: 12 }}>Print Pages:</span>
          <PBInput w={80} />
          <span className="pb-form__label" style={{ marginLeft: 8 }}>Printer:</span>
          <PBSelect w={190} options={['\\\\print01\\Office', 'CutePDFWriter']} />
        </div>
        <Ribbon />
        <div
          data-tutorial-id="host.mois.field.report-page"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'auto',
            background: '#fff',
            padding: '10px 14px',
            fontFamily: '"Lucida Console", "DejaVu Sans Mono", Menlo, monospace',
            fontSize: 12,
            lineHeight: 1.35,
            whiteSpace: 'pre',
          }}
        >
          {lines.map((line, i) => (
            line === '%RULE%'
              /* MOIS rules these reports with a drawn paragraph border that
                 spans the full 93-column measure, not a row of dashes */
              ? <div key={i} style={{ borderTop: '1px solid #000', margin: '2px 0', width: '93ch' }} />
              : <div key={i} style={{ minHeight: '1.35em' }}>{line || '\u00a0'}</div>
          ))}
        </div>
        <div className="pb-row" style={{ padding: '2px 6px', borderTop: '1px solid #9a9a9a', flex: 'none', color: '#404040' }}>

        </div>
      </PBWindow>
    </div>
  )
}
