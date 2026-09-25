import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useLoadedChart } from '../data/charts'
import { usePatient } from '../data/patient-context'
import type { PrintParams } from '../data/printPages'
import type { PrintField, PrintReport } from '../data/printReports'
import { CmdButton } from './CmdButton'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBSelect, PBWindow } from '../pb'

/* ============================================================================
   The two windows every MOIS print goes through.

   `SelectionParameterDialog` is the parameter window a Print-menu item opens;
   `RichtextReportWindow` is the editable RTF preview its default button
   produces. Both are shells — what differs per report is the field list, the
   button caption and the page builder, which live in `data/printReports.ts`
   and `data/printPages.ts` with their provenance.

   Transcribed from `PrintInterventionsList_SelectedParams_image2.png` /
   303146 `de09b682…` (the dialog: grey `Selection Parameter` band, navy
   section headings ruled underneath, Ok / Cancel 69×22 bottom-centre with a
   19px gap), 303134 `81cf425c…` (no band, From/To on one row, View Report),
   319686 `98c198a6…` (grey note line, `Select Records to Print...`
   bottom-left) and 303082 `4e709015…` (the Include Section grid); and
   303146 `8e214ced…` for the preview (Print / Print and Attach / Fax /
   Cancel, `Print Pages:`, `Printer:`, the RTF ribbon, the page, and the
   `FILE:` line under it).
   ========================================================================= */

/** what each report's window held when its default button was pressed */
const lastParams = new Map<string, PrintParams>()

/** the values a window opens with — also what the preview uses when a lesson
    opens the report directly, with no window in between */
export function defaultPrintParams(report: PrintReport): PrintParams {
  const out: PrintParams = {}
  for (const f of report.fields) {
    if (f.kind === 'text' && f.key) out[f.key] = f.value ?? ''
    if (f.kind === 'range') { out.from = f.from ?? ''; out.to = f.to ?? '' }
    if (f.kind === 'check' && f.key) out[f.key] = !!f.checked
    if (f.kind === 'segments') {
      for (const r of f.rows) { out[`include:${r.label}`] = !!r.include; out[`detail:${r.label}`] = !!r.detail }
    }
  }
  return out
}

const heading = (label: string, key: number) => (
  <div key={key} style={{ color: '#000080', fontWeight: 700, padding: '4px 10px 2px', borderBottom: '1px solid #bdbdbd', margin: '0 0 4px' }}>
    {label}
  </div>
)

export function SelectionParameterDialog({
  report, onOk, onClose,
}: {
  report: PrintReport
  onOk?: () => void
  onClose?: () => void
}) {
  const [values, setValues] = useState<PrintParams>(() => ({ ...defaultPrintParams(report), ...lastParams.get(report.menu) }))
  const [pickRecords, setPickRecords] = useState(false)
  const set = (key: string, value: string | boolean) => setValues((v) => ({ ...v, [key]: value }))
  const band = report.band !== false
  const ok = () => { lastParams.set(report.menu, values); onOk?.() }

  const field = (f: PrintField, i: number): ReactNode => {
    if (f.kind === 'section') return heading(f.label, i)
    if (f.kind === 'check') {
      return (
        <div key={i} className="pb-row" style={{ padding: '2px 0 2px 12px', gap: 0 }}>
          {f.caption
            ? <span className="pb-form__label" style={{ width: 118 }}>{f.caption}</span>
            : <span style={{ width: 60, flex: 'none' }} />}
          <PBCheckbox
            label={f.label}
            checked={f.key ? !!values[f.key] : f.checked}
            onChange={(c) => f.key && set(f.key, c)}
            tutorialId={f.key ? `host.mois.check.print-${f.key}` : undefined}
          />
        </div>
      )
    }
    if (f.kind === 'range') {
      return (
        <div key={i} className="pb-row" style={{ gap: 6, padding: '2px 0 2px 12px' }}>
          <span className="pb-form__label" style={{ width: 48 }}>From:</span>
          <PBInput w={80} value={String(values.from ?? '')} onChange={(e) => set('from', e.target.value)} data-tutorial-id="host.mois.field.print-from" />
          <span className="pb-form__label" style={{ marginLeft: 12 }}>To:</span>
          <PBInput w={80} value={String(values.to ?? '')} onChange={(e) => set('to', e.target.value)} data-tutorial-id="host.mois.field.print-to" />
        </div>
      )
    }
    if (f.kind === 'segments') return <SegmentGrid key={i} rows={f.rows} values={values} set={set} />
    return (
      <div key={i} className="pb-row" style={{ gap: 6, padding: '2px 0 2px 12px' }}>
        <span className="pb-form__label" style={{ width: 54 }}>{f.label}</span>
        {f.dots
          ? <PBLookup w={f.width ?? 120} value={String(values[f.key ?? ''] ?? '')} onChange={(v) => f.key && set(f.key, v)} name={`print-${f.key}`} />
          : (
            <PBInput
              w={f.width ?? 120}
              value={String(f.key ? values[f.key] ?? '' : f.value ?? '')}
              onChange={(e) => f.key && set(f.key, e.target.value)}
              data-tutorial-id={f.key ? `host.mois.field.print-${f.key}` : undefined}
            />
          )}
      </div>
    )
  }

  const size = report.size ?? { width: 650, height: 530 }
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.print-params"
        title={report.title}
        onClose={onClose}
        style={{ width: size.width, height: `min(${size.height}px, calc(100vh - 80px))` }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 12, gap: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: 'var(--pb-window)' }}>
            {band && <PBBand>Selection Parameter</PBBand>}
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 0 4px', display: 'flex', flexDirection: 'column' }}>
              {report.fields.map(field)}
              {report.note && (
                <div style={{ marginTop: 'auto', padding: '8px 10px', color: '#8a8a8a' }}>{report.note}</div>
              )}
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 19, padding: '14px 0 4px', flex: 'none' }}>
            {report.leftButton && (
              <PBButton
                style={{ position: 'absolute', left: 0, top: 14 }}
                data-tutorial-id={`host.mois.command.${report.leftButton.window}`}
                onClick={() => setPickRecords(true)}
              >
                {report.leftButton.label}
              </PBButton>
            )}
            <CmdButton
              className="pb-btn--default"
              style={{ minWidth: 69 }}
              command="print-ok"
              onClick={ok}
            >
              {report.okLabel ?? 'Ok'}
            </CmdButton>
            <CmdButton style={{ width: 69 }} command="print-cancel" onClick={onClose}>Cancel</CmdButton>
          </div>
        </div>
      </PBWindow>
      {pickRecords && (
        <SelectMarRecordsWindow
          onPrint={(ids) => { set('picked', ids.join(',')); lastParams.set(report.menu, { ...values, picked: ids.join(',') }); setPickRecords(false); onOk?.() }}
          onClose={() => setPickRecords(false)}
        />
      )}
    </div>
  )
}

/* 303082 `4e709015…`: the Include Section grid. The header's boxes select or
   clear a whole column; a row's With Detail and Custom Date boxes appear
   once the row is included. */
function SegmentGrid({ rows, values, set }: {
  rows: { label: string }[]
  values: PrintParams
  set: (key: string, value: string | boolean) => void
}) {
  const allIncluded = rows.every((r) => values[`include:${r.label}`] === true)
  const allDetail = rows.every((r) => values[`detail:${r.label}`] === true)
  const cols = '26px 170px 26px 100px 90px 70px 1fr'
  return (
    <div style={{ margin: '6px 0 0', borderTop: '1px solid #9a9a9a', flex: '1 1 auto', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', background: 'var(--pb-dw-head, #bcd6f5)', fontWeight: 700, height: 20 }}>
        <PBCheckbox checked={allIncluded} onChange={(c) => rows.forEach((r) => set(`include:${r.label}`, c))} tutorialId="host.mois.check.include-section-all" />
        <span>Include Section</span>
        <PBCheckbox checked={allDetail} onChange={(c) => rows.forEach((r) => set(`detail:${r.label}`, c))} tutorialId="host.mois.check.with-detail-all" />
        <span>With Detail</span><span>Custom Date</span><span>From</span><span>To</span>
      </div>
      {rows.map((r, i) => {
        const inc = values[`include:${r.label}`] === true
        return (
          <div key={r.label} data-tutorial-id={`host.mois.row.segment-${r.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', height: 20, background: i % 2 ? '#fff' : '#ecebf0' }}>
            <PBCheckbox checked={inc} onChange={(c) => set(`include:${r.label}`, c)}
              tutorialId={`host.mois.check.include-${r.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} />
            <span>{r.label}</span>
            {inc ? <PBCheckbox checked={values[`detail:${r.label}`] === true} onChange={(c) => set(`detail:${r.label}`, c)} /> : <span />}
            <span />
            {inc ? <PBCheckbox checked={values[`date:${r.label}`] === true} onChange={(c) => set(`date:${r.label}`, c)} /> : <span />}
            <span /><span />
          </div>
        )
      })}
    </div>
  )
}

/* 319686 `06e789f8…`: Select MAR Record(s) to Print — the patient across the
   top, then one tickable row per administration, Print / Cancel. */
export function SelectMarRecordsWindow({ onPrint, onClose }: { onPrint: (ids: string[]) => void; onClose: () => void }) {
  const patient = usePatient()
  const data = useLoadedChart(patient.chart)
  const rows = useMemo(() => [...(data?.mar ?? [])]
    .sort((a, b) => String(b.dtm_admin_date ?? '').localeCompare(String(a.dtm_admin_date ?? '')))
    .map((r) => ({
      id: r.id_mar ?? '',
      date: (r.dtm_admin_date ?? '').replace(/\//g, '.'),
      med: r.str_generic_name ?? r.str_medication ?? '',
      series: r.str_series ?? '',
      site: r.str_site ?? '',
      lot: r.str_lot_number ?? '',
    })), [data])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const ins = [patient.insuranceBy, patient.insurance, patient.dep || '00'].filter(Boolean).join(' ')
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 81 }}>
      <PBWindow child controls={false} tutorialId="host.mois.dialog.select-mar-records" title="Select MAR Record(s) to Print" onClose={onClose} style={{ width: 845, height: 'min(575px, calc(100vh - 60px))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 150px 55px 40px', rowGap: 2, padding: '6px 8px', background: 'linear-gradient(#ffffff, #cfe6f7)', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
          <span style={{ color: '#6d6d6d' }}>Patient:</span><span>{[patient.last, patient.first].filter(Boolean).join(', ').toUpperCase()}</span>
          <span style={{ color: '#6d6d6d', textAlign: 'right' }}>DoB:&nbsp;</span><span>{patient.dob}</span>
          <span style={{ color: '#6d6d6d' }}>Gender:</span><span>{patient.sex}</span>
          <span style={{ color: '#6d6d6d' }}>Chart:</span><span>{patient.chart}</span>
          <span style={{ color: '#6d6d6d', textAlign: 'right' }}>Insurance:&nbsp;</span><span style={{ gridColumn: 'span 3' }}>{ins}</span>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0 }}>
          <PBDataWindow
            gutter={false}
            columns={[
              {
                key: 'print', header: 'Print', width: 44, align: 'center',
                render: (r) => <PBCheckbox checked={picked.has(r.id)} onChange={(c) => setPicked((s) => { const n = new Set(s); c ? n.add(r.id) : n.delete(r.id); return n })} />,
              },
              { key: 'date', header: 'Date', width: 78 },
              { key: 'med', header: 'Medication / Agent', width: 300 },
              { key: 'series', header: 'Series', width: 58 },
              { key: 'site', header: 'Site', width: 170 },
              { key: 'lot', header: 'Lot Number' },
            ]}
            rows={rows}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '10px 0', flex: 'none' }}>
          <PBButton style={{ width: 78 }} data-tutorial-id="host.mois.command.print-selected-mar" onClick={() => onPrint([...picked])}>Print</PBButton>
          <PBButton style={{ width: 78 }} onClick={onClose}>Cancel</PBButton>
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
      <PBSelect w={48} options={['10', '11']} />
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

/** `**bold**` runs inside a page line */
function inline(text: string): ReactNode {
  const parts = text.split(/\*\*/)
  return parts.map((p, i) => (i % 2 ? <b key={i} style={{ fontSize: '1.08em' }}>{p}</b> : <Fragment key={i}>{p}</Fragment>))
}

/** Renders the page markup `data/printPages.ts` documents. */
export function ReportPage({ page, font = 'mono' }: { page: string; font?: 'mono' | 'sans' }) {
  const out: ReactNode[] = []
  let cols: number[] | null = null
  page.split('\n').forEach((line, i) => {
    const colMatch = /^%COLS:([\d,]+)%$/.exec(line)
    if (colMatch) { cols = colMatch[1]!.split(',').map(Number); return }
    if (line.startsWith('%TR%') || line.startsWith('%TH%')) {
      const head = line.startsWith('%TH%')
      const cells = line.slice(4).split('|')
      out.push(
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: (cols ?? cells.map(() => 10)).map((c) => `${c}%`).join(' '),
          padding: '3px 0', borderBottom: head ? '2px solid #000' : '1px solid #b8b8b8',
        }}>
          {cells.map((c, j) => <span key={j}>{inline(c)}</span>)}
        </div>,
      )
      return
    }
    cols = null
    if (line === '%RULE%') {
      out.push(<div key={i} style={{ borderTop: font === 'sans' ? '2px solid #000' : '1px solid #000', margin: '2px 0', width: font === 'sans' ? '100%' : '93ch' }} />)
    } else if (line.startsWith('%G%')) {
      out.push(<div key={i} style={{ color: '#6d6d6d', minHeight: '1.35em' }}>{inline(line.slice(3))}</div>)
    } else if (line.startsWith('%S%')) {
      out.push(<div key={i} style={{ fontWeight: 700, fontSize: '1.12em', marginTop: 8 }}>{line.slice(3)}</div>)
    } else if (line.startsWith('%U%')) {
      out.push(<div key={i} style={{ borderBottom: '1px solid #000', width: '93ch' }}>{line.slice(3)}</div>)
    } else if (line.startsWith('%TITLE%')) {
      out.push(<div key={i} style={{ fontWeight: 700, fontSize: '1.45em', textAlign: 'center' }}>{line.slice(7)}</div>)
    } else if (line.startsWith('%SUB%')) {
      out.push(<div key={i} style={{ fontWeight: 700, textAlign: 'center', padding: '2px 0 6px' }}>{line.slice(5)}</div>)
    } else {
      out.push(<div key={i} style={{ minHeight: '1.35em' }}>{inline(line) || '\u00a0'}</div>)
    }
  })
  return <>{out}</>
}

export function RichtextReportWindow({
  report, onClose,
}: {
  report: PrintReport
  onClose?: () => void
}) {
  /* The page is the report as MOIS lays it out, filled from the chart that
     is open: the identity block is this patient's and the rows are this
     chart's records, never a sample patient's. */
  const patient = usePatient()
  const data = useLoadedChart(patient.chart)
  const page = useMemo(() => {
    if (!report.build) return report.page ?? ''
    const params = { ...defaultPrintParams(report), ...lastParams.get(report.menu) }
    return report.build({ patient, data, params })
  }, [data, patient, report])
  const sans = report.font === 'sans'
  const file = `C:\\Users\\${'MOIS'}\\AppData\\Local\\Temp\\MOIS09\\${patient.chart}.rtf`
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
            fontFamily: sans ? 'Arial, "Helvetica Neue", sans-serif' : '"Lucida Console", "DejaVu Sans Mono", Menlo, monospace',
            fontSize: 12,
            lineHeight: 1.35,
            whiteSpace: sans ? 'normal' : 'pre',
            /* the kit's text mode widens word gaps (pb/text.css); a fixed-pitch
               page lines its columns up with spaces, so it keeps them exact */
            wordSpacing: 'normal',
            letterSpacing: 'normal',
          }}
        >
          <ReportPage page={page} font={report.font} />
        </div>
        <div className="pb-row" style={{ padding: '2px 6px', borderTop: '1px solid #9a9a9a', flex: 'none', color: '#404040' }}>
          FILE: {file}
        </div>
      </PBWindow>
    </div>
  )
}
