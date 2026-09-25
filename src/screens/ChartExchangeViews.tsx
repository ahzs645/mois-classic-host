import { useState, type ReactNode } from 'react'
import { CHART_IMPORT, EXPORT_CHARTS, EXPORT_LOGS, IMPORT_CHARTS, IMPORT_LOGS } from '../data/exchange'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBDataWindow, PBInput, PBTextArea, PBViewHeader, PBWindow, pbSlug,
} from '../pb'
import { Body, Heading, Lbl, PrintPreviewWindow, Prompt, Radio } from './ExchangeKit'

/* ============================================================================
   Data Exchange ▸ Chart Exchange — MOIS-to-MOIS chart transfer.

   303493 "Export Patients" (image 46924bab), 303494 "Export Patients to a
   Non-MOIS Clinic" (0d55320e, Chart PDF Export), 303590 "View Export Logs"
   (c7cb3ccf), 303497 "Import Patients Charts" (9f0ea9c0, and the Chart
   Import window 80dac923), 303496 "View Import Logs" (8d18b9db).

   None of the four screens has a taskbar: Export Chart(s) and Import
   Chart(s) carry their own button inside the form, and the two log folders
   are a bare list whose row opens in a Print Preview on a double-click.
   ========================================================================= */

/* --- Export Chart(s) ------------------------------------------------------ */
export function ExportChartsView() {
  const [by, setBy] = useState(EXPORT_CHARTS.selectBy[0]!)
  const [format, setFormat] = useState(EXPORT_CHARTS.formats[0]!)
  const [log, setLog] = useState<{ chart: string; patient: string; status: string }[]>([])
  const [stage, setStage] = useState<null | 'confirm' | 'complete' | 'log'>(null)
  useScreenReport({
    format: pbSlug(format),
    exported: log.length,
    ...(stage === 'confirm' ? { dialog: 'confirmation-export-chart-s' }
      : stage === 'complete' ? { dialog: 'export-complete' }
      : stage === 'log' ? { dialog: 'print-preview' } : {}),
  })
  const row = (label: string, body: ReactNode) => (
    <div className="pb-row" style={{ gap: 6, padding: '2px 12px', alignItems: 'flex-start' }}>
      <Lbl w={66}>{label}</Lbl>{body}
    </div>
  )
  return (
    <>
      <PBViewHeader title="Export Chart(s)" />
      <Body style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div data-tutorial-id="host.mois.group.chart-selection-options">
          <Heading>Chart Selection Options:</Heading>
          {row('Select By:', (
            <span className="pb-row" style={{ gap: 18 }}>
              {EXPORT_CHARTS.selectBy.map((o) => (
                <Radio key={o} name="export-by" label={o} checked={by === o} onChange={() => setBy(o)} anchor={`host.mois.field.select-by-${pbSlug(o)}`} />
              ))}
            </span>
          ))}
          {row('Chart(s):', <PBTextArea w={356} rows={3} defaultValue={EXPORT_CHARTS.charts} />)}
        </div>
        <div data-tutorial-id="host.mois.group.export-options">
          <Heading style={{ marginTop: 6 }}>Export Options:</Heading>
          {row('Output:', <span className="pb-row" style={{ gap: 4 }}><PBInput w={356} defaultValue={EXPORT_CHARTS.output} /><PBButton data-tutorial-id="host.mois.command.browse">Browse...</PBButton></span>)}
          {row('Format:', (
            <span className="pb-row" style={{ gap: 44 }}>
              {EXPORT_CHARTS.formats.map((o) => (
                <Radio key={o} name="export-format" label={o} checked={format === o} onChange={() => setFormat(o)} anchor={`host.mois.field.format-${pbSlug(o)}`} />
              ))}
            </span>
          ))}
          {row('Encrypt Key:', <PBInput w={150} defaultValue={format === 'Chart PDF Export' ? 'MM:SeptDD:25YY:2023' : EXPORT_CHARTS.key} data-tutorial-id="host.mois.field.encrypt-key" />)}
          <div style={{ padding: '0 0 4px 84px' }}>{EXPORT_CHARTS.keyNote}</div>
        </div>
        <div data-tutorial-id="host.mois.group.reason-for-export">
          <Heading style={{ marginTop: 4 }}>Reason for Export:</Heading>
          <div className="pb-row" style={{ gap: 6, padding: '0 12px 6px', alignItems: 'flex-start' }}>
            <Lbl w={66}>Note:</Lbl>
            <PBTextArea w={284} rows={2} defaultValue={EXPORT_CHARTS.note} />
            <span className="pb-row__spacer" />
            <PBButton
              data-tutorial-id="host.mois.command.export-chart-s"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => setStage('confirm')}
            >
              Export Chart(s)
            </PBButton>
          </div>
        </div>
        <div className="pb-groupbox" data-tutorial-id="host.mois.group.export-status-log" style={{ flex: '1 1 auto', minHeight: 90, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Export Status Log</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow flush rows={log} columns={EXPORT_CHARTS.logColumns} empty=" " />
          </div>
        </div>
        {stage === 'confirm' && (
          /* 303494 images 48c04f74 and 8b506552: a confirmation, then an
             Export Complete box naming the file and the key; OK opens the
             Chart Export Log (303493) */
          <Prompt
            title="Confirmation: Export Chart(s)"
            icon="info"
            buttons={['Yes', 'No']}
            onClose={(b) => {
              if (b !== 'Yes') { setStage(null); return }
              setLog([{ chart: EXPORT_CHARTS.charts, patient: 'EXPORTED', status: 'Complete' }])
              setStage('complete')
            }}
          >
            Would you like to export the identified charts?<br /><br />
            This process may take several minutes depending on the number of documents - please be patient.
          </Prompt>
        )}
        {stage === 'complete' && (
          <Prompt title="Export Complete" icon="info" buttons={['OK']} onClose={() => setStage('log')}>
            All the information for the selected chart(s) are included in the following file:<br /><br />
            {EXPORT_CHARTS.output}\MOIS_REF_10000008.7z<br /><br />
            Please remember to send the Encrypt Key ({format === 'Chart PDF Export' ? 'MM:SeptDD:25YY:2023' : EXPORT_CHARTS.key}) with the file.
          </Prompt>
        )}
        {stage === 'log' && <PrintPreviewWindow report={EXPORT_LOGS.report} onClose={() => setStage(null)} />}
      </Body>
    </>
  )
}

/* --- the two log folders: a list whose row opens a Print Preview ---------- */
function LogListView({ title, spec }: { title: string; spec: typeof EXPORT_LOGS | typeof IMPORT_LOGS }) {
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState(false)
  useScreenReport({ rows: spec.rows.length, ...(open ? { dialog: 'print-preview' } : {}) })
  return (
    <>
      <PBViewHeader title={title} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, position: 'relative' }}>
        <PBDataWindow
          rows={spec.rows as Record<string, string>[]}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => setOpen(true)}
          rowTutorialId={(r) => `host.mois.row.log-${pbSlug(r.reference ?? '')}`}
          columns={spec.columns.map((c) => ({ key: c.key, header: c.header, width: c.width, align: c.align }))}
        />
        {open && <PrintPreviewWindow report={spec.report} onClose={() => setOpen(false)} />}
      </div>
    </>
  )
}

export const ExportLogsView = () => <LogListView title="Chart Export Log Reports" spec={EXPORT_LOGS} />
export const ImportLogsView = () => <LogListView title="Chart Import Log Reports" spec={IMPORT_LOGS} />

/* --- Import Chart(s) — 303497 image 9f0ea9c0 ------------------------------ */
export function ImportChartsView() {
  const [stage, setStage] = useState<null | 'import' | 'log'>(null)
  useScreenReport(stage === 'import' ? { dialog: 'chart-import' } : stage === 'log' ? { dialog: 'print-preview' } : {})
  return (
    <>
      <PBViewHeader title="Import Chart(s)" />
      <Body style={{ position: 'relative' }}>
        <div data-tutorial-id="host.mois.group.import-options" style={{ borderBottom: '1px solid #b8b8b8', paddingBottom: 8 }}>
          <Heading>Import Options:</Heading>
          <div className="pb-row" style={{ gap: 6, padding: '2px 12px' }}>
            <Lbl w={66}>File (7z):</Lbl><PBInput w={356} defaultValue={IMPORT_CHARTS.file} />
            <PBButton data-tutorial-id="host.mois.command.browse">Browse...</PBButton>
          </div>
          <div className="pb-row" style={{ gap: 6, padding: '2px 12px' }}>
            <Lbl w={66}>Encrypt Key:</Lbl><PBInput w={150} defaultValue={IMPORT_CHARTS.key} data-tutorial-id="host.mois.field.encrypt-key" />
          </div>
          <div style={{ padding: '0 0 0 84px' }}>(supplied by the data provider)</div>
        </div>
        <div style={{ padding: '8px 84px' }}>
          <PBButton data-tutorial-id="host.mois.command.import-chart-s" onClick={() => setStage('import')}>Import Chart(s)</PBButton>
        </div>
        {stage === 'import' && <ChartImportWindow onContinue={() => setStage('log')} onCancel={() => setStage(null)} />}
        {stage === 'log' && <PrintPreviewWindow report={IMPORT_LOGS.report} onClose={() => setStage(null)} />}
      </Body>
    </>
  )
}

/* --- Chart Import — 303497 image 80dac923 ---------------------------------
   Data Provider / Software Provider across the top; Provider Mapping (the
   sending clinic's providers, each with a Map To New Provider cell) beside
   Included Patient Records; Continue Import / Cancel Import. */
function ChartImportWindow({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  const [mapped, setMapped] = useState<Record<string, string>>({})
  const [cur, setCur] = useState(0)
  const pairs = (list: string[][]) => list.map(([k, v]) => (
    <div key={k} className="pb-row" style={{ gap: 6 }}><Lbl w={70}>{k}</Lbl><b>{v}</b></div>
  ))
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60 }}>
      <PBWindow child controls={false} title="Chart Import" onClose={onCancel}
        tutorialId="host.mois.dialog.chart-import" style={{ width: 'calc(100% - 8px)', height: 'calc(100% - 8px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: 4, padding: 4 }}>
          <div className="pb-row" style={{ gap: 30, alignItems: 'flex-start', border: '1px solid #888', padding: '2px 8px 6px', flex: 'none' }}>
            <div><div style={{ color: '#000080', fontWeight: 700 }}>Data Provider:</div>{pairs(CHART_IMPORT.provider)}</div>
            <div><div style={{ color: '#000080', fontWeight: 700 }}>Software Provider:</div>{pairs(CHART_IMPORT.software)}</div>
            <div style={{ paddingTop: 34 }}>{pairs(CHART_IMPORT.build)}</div>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 4 }}>
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.provider-mapping" style={{ width: 372, flex: 'none', display: 'flex', flexDirection: 'column' }}>
              <PBBand>Provider Mapping</PBBand>
              <div style={{ padding: '2px 6px', whiteSpace: 'normal' }}>{CHART_IMPORT.mappingText}</div>
              <div className="pb-row" style={{ justifyContent: 'space-around', padding: 2 }}>
                <button type="button" className="pb-link">Show ALL</button><button type="button" className="pb-link">Show MAPPED</button>
              </div>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  rows={CHART_IMPORT.providers.map((p) => ({ provider: p, map: mapped[p] ?? '' }))}
                  current={cur}
                  onCurrentChange={setCur}
                  rowTutorialId={(r) => `host.mois.row.provider-${pbSlug(r.provider)}`}
                  columns={[
                    { key: 'provider', header: 'Provider Name / ID', width: 176 },
                    {
                      key: 'map', header: 'Map To New Provider',
                      render: (r) => (
                        <input
                          className="pb-field"
                          style={{ width: '100%', border: 0 }}
                          value={r.map}
                          onChange={(e) => setMapped((m) => ({ ...m, [r.provider]: e.target.value }))}
                        />
                      ),
                    },
                  ]}
                />
              </div>
              <div style={{ padding: '2px 6px', borderTop: '1px solid #888' }}>* Inactive at the data provider&apos;s clinic.</div>
            </div>
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.included-patient-records" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <PBBand>Included Patient Records</PBBand>
              <div style={{ padding: '2px 6px', whiteSpace: 'normal' }}>{CHART_IMPORT.recordsText}</div>
              <div style={{ padding: '2px 6px', fontWeight: 700 }}>MOIS DOES NOT AUTOMATICALLY MERGE CHARTS.</div>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  rows={CHART_IMPORT.records}
                  columns={[
                    { key: 'n', header: '', width: 30, align: 'center' }, { key: 'last', header: 'Last Name', width: 130 },
                    { key: 'first', header: 'First Name', width: 100 }, { key: 'middle', header: 'Middle Name', width: 84 },
                    { key: 'sex', header: 'Sex', width: 30, align: 'center' }, { key: 'dob', header: 'DoB', width: 84, align: 'center' },
                    { key: 'ins', header: 'Ins By', width: 50 }, { key: 'number', header: 'Insurance Number' },
                  ]}
                />
              </div>
              <div style={{ padding: '2px 18px' }}>{CHART_IMPORT.records.length}&nbsp;&nbsp;&nbsp;Total Charts</div>
            </div>
          </div>
          <div className="pb-row" style={{ justifyContent: 'center', gap: 6, flex: 'none' }}>
            <PBButton data-tutorial-id="host.mois.command.continue-import" onClick={onContinue}>Continue Import</PBButton>
            <PBButton data-tutorial-id="host.mois.command.cancel-import" onClick={onCancel}>Cancel Import</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
