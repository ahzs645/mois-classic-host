import { useState } from 'react'
import { useChartExport } from '../data/chart-records'
import { carePlanRows, carePlanSnapshotText, CARE_PLAN_SECTIONS } from '../data/carePlanRows'
import { SESSION_USER, addCarePlanSnapshot, useChartSession } from '../data/chartSession'
import { DESKTOP_PROVIDER, beginLetter, setLetterFlow } from '../data/letterFlow'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { PBCheckbox, PBGroup, PBInput, PBRadio, PBSelect, PBTextArea } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The Care Plan's three small windows.

     report-letterhead     1673065 `41a2130b…` (also 2070139 `460af88b…`,
                           303518 `e7eaa45e…`): Choose Source radios — Clinic,
                           Primary Care Provider, Desktop Provider, None — a
                           Letterhead box that previews the lines, Save as
                           default source, Continue (F2) / Cancel.
     care-plan-snapshot    1673065 `d0b4a972…`: Date, Created By, Note,
                           Save (F2) / Cancel.
     care-plan-print-preview  303518 `8fec3b9c…`: the paginated Print
                           Preview — Zoom To radios, Percent, Copies, Apply,
                           Change Header, Sort, Print All, Print Range, Cancel,
                           Save As, Printer Type — around a CARE PLAN SUMMARY
                           AS OF … FOR: page.

   Who opens them, and what follows, is the `purpose` argument:
     snapshot    Create Snapshot: letterhead → snapshot note → a row on the
                 Care Plan Snapshot tab.
     distribute  Distribute...: letterhead → snapshot note → the Letter Writer
                 as a SHARED CARE PLAN (2070139 steps 3–6).
     print       the blue Print link: letterhead → Print Preview (303518).
   ========================================================================= */

type Purpose = 'snapshot' | 'distribute' | 'print'
const purposeOf = (args: Record<string, unknown>): Purpose =>
  args.purpose === 'distribute' || args.purpose === 'print' ? args.purpose : 'snapshot'

const SOURCES = ['Clinic', 'Primary Care Provider', 'Desktop Provider', 'None'] as const
type Source = typeof SOURCES[number]
const CLINIC_LINES = ['HALLIWELL MEDICAL CLINIC', '1100 - 6TH AVE', 'PRINCE GEORGE, BC', 'Phone Number: 250-564-2644', 'Fax Number: 250-564-2655']

function letterheadLines(source: Source, primary: string): string[] {
  if (source === 'None') return ['', '', '', '', '']
  if (source === 'Clinic') return CLINIC_LINES
  const who = source === 'Desktop Provider' ? DESKTOP_PROVIDER : primary
  return [who, ...CLINIC_LINES.slice(1)]
}

/* --- Report Letterhead ------------------------------------------------- */
function ReportLetterheadDialog({ args, close, open }: AreaWindowProps) {
  const p = usePatient()
  const purpose = purposeOf(args)
  const [source, setSource] = useState<Source>('Clinic')
  const primary = (p as { serviceProvider?: string }).serviceProvider ?? DESKTOP_PROVIDER
  const lines = letterheadLines(source, primary)
  return (
    <WorkspaceDialogFrame id="report-letterhead" title="Report Letterhead" width={648} height={310} onClose={close} controls={false}>
      <div style={{ margin: '10px 20px 0', border: '1px solid #9a9a9a', padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto' }}>
        <div className="pb-row" style={{ gap: 14, alignItems: 'stretch' }}>
          <div style={{ width: 150 }} data-tutorial-id="host.mois.group.choose-source">
            <PBGroup title="Choose Source">
              {SOURCES.map((s) => (
                <div key={s} style={{ padding: '4px 0' }}>
                  <PBRadio name="letterhead-source" label={s} checked={source === s} onChange={() => setSource(s)} />
                </div>
              ))}
            </PBGroup>
          </div>
          <div style={{ flex: '1 1 auto' }} data-tutorial-id="host.mois.group.letterhead">
            <PBGroup title="Letterhead">
              {lines.map((l, i) => <div key={i} style={{ padding: '1px 0' }}><PBInput w="100%" value={l} readOnly /></div>)}
            </PBGroup>
          </div>
        </div>
        <PBCheckbox label="Save as default source" checked={false} />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '12px 0', flex: 'none' }}>
        <DialogButton
          id="letterhead-continue"
          width={75}
          isDefault
          onClick={() => {
            close()
            open(purpose === 'print' ? 'care-plan-print-preview' : 'care-plan-snapshot', { purpose, letterhead: lines.join('\n') })
          }}
        >
          Continue (F2)
        </DialogButton>
        <DialogButton id="letterhead-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Care Plan Snapshot ------------------------------------------------ */
function CarePlanSnapshotDialog({ args, close, open }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  const session = useChartSession(p.chart)
  const purpose = purposeOf(args)
  const [note, setNote] = useState(purpose === 'distribute' ? 'Sent to Care Team' : '')
  const letterhead = typeof args.letterhead === 'string' ? args.letterhead.split('\n').filter(Boolean) : CLINIC_LINES
  const save = () => {
    const text = carePlanSnapshotText(carePlanRows(data, session.tags), p, MOIS_TODAY, letterhead)
    addCarePlanSnapshot(p.chart, { date: MOIS_TODAY, createdBy: SESSION_USER, note, text, letterhead: letterhead.join('\n') })
    close()
    if (purpose === 'distribute') {
      /* 2070139 step 6: "You will now be redirected to the MOIS Letter
         Writer" — no template list, no Letter Setup */
      beginLetter('care-plan')
      setLetterFlow({ note })
      open('letter-writer', { doc: 'care-plan' })
    }
  }
  return (
    <WorkspaceDialogFrame id="care-plan-snapshot" title="Care Plan Snapshot" width={433} height={182} onClose={close} controls={false}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px 110px 90px 1fr', rowGap: 6, columnGap: 6, padding: '10px 14px 0', alignItems: 'center' }}>
        <span className="pb-form__label">Date:</span><PBInput w={82} value={MOIS_TODAY} readOnly align="center" />
        <span className="pb-form__label" style={{ textAlign: 'right' }}>Created By:</span><PBInput w="100%" value={SESSION_USER} readOnly />
        <span className="pb-form__label" style={{ alignSelf: 'start' }}>Note:</span>
        <PBTextArea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          data-tutorial-id="host.mois.field.snapshot-note"
          style={{ gridColumn: 'span 3', height: 64 }}
        />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '10px 0', flex: 'none' }}>
        <DialogButton id="snapshot-save" width={75} isDefault onClick={save}>Save (F2)</DialogButton>
        <DialogButton id="snapshot-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Print Preview ----------------------------------------------------- */
function CarePlanPrintPreview({ args, close }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  const session = useChartSession(p.chart)
  const rows = carePlanRows(data, session.tags)
  const letterhead = typeof args.letterhead === 'string' ? args.letterhead.split('\n').filter(Boolean) : CLINIC_LINES
  const sections = CARE_PLAN_SECTIONS.filter((s) => rows.some((r) => r.section === s))
  const [zoom, setZoom] = useState('100%')
  const sex = p.sex
  return (
    <WorkspaceDialogFrame id="care-plan-print-preview" title="Print Preview" width={1100} height={700} onClose={close}>
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: 6 }}>
        <div style={{ width: 100, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <PBGroup title="Zoom To">
            {['200%', '100%', '75%', '50%', '25%'].map((z) => (
              <div key={z}><PBRadio name="pp-zoom" label={z} checked={zoom === z} onChange={() => setZoom(z)} /></div>
            ))}
            <div style={{ marginTop: 6 }}>Percent:</div><PBInput w={40} value="125" readOnly />
            <div>Copies:</div><PBInput w={40} defaultValue="1" />
            <div style={{ marginTop: 6 }}><DialogButton id="pp-apply" width={84}>Apply</DialogButton></div>
            <div style={{ marginTop: 6 }}><DialogButton id="pp-change-header" width={84} disabled>Change Header</DialogButton></div>
            <div style={{ marginTop: 3 }}><DialogButton id="pp-sort" width={84}>Sort</DialogButton></div>
            <div style={{ marginTop: 14 }}><DialogButton id="print-all" width={84} isDefault onClick={close}>Print All</DialogButton></div>
            <div style={{ marginTop: 3 }}><DialogButton id="print-range" width={84}>Print Range</DialogButton></div>
            <PBInput w={88} defaultValue="All Pages" />
            <div style={{ fontSize: 11 }}>Ex. 1,2,5-10,39</div>
            <div style={{ marginTop: 6 }}><DialogButton id="pp-cancel" width={84} onClick={close}>Cancel</DialogButton></div>
            <div style={{ marginTop: 3 }}><DialogButton id="pp-save-as" width={84}>Save As</DialogButton></div>
            <div style={{ marginTop: 6 }}>Printer Type</div>
            <PBSelect w={88} options={['Report Printer']} />
          </PBGroup>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBGroup title="Preview" fill style={{ height: '100%' }}>
            <div data-tutorial-id="host.mois.field.care-plan-preview" style={{ flex: '1 1 auto', overflow: 'auto', background: '#fff', border: '1px solid #9a9a9a', padding: '26px 36px', fontFamily: 'Arial, sans-serif', height: '100%' }}>
              <div className="pb-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 auto' }}>
                  <div style={{ fontSize: 17 }}>CARE PLAN SUMMARY AS OF {MOIS_TODAY.replace(/\./g, '-')} FOR:</div>
                  <div style={{ fontSize: 19, fontWeight: 700, margin: '4px 0' }}>{`${p.first}  ${p.last}`.toUpperCase()}</div>
                  <div>{p.age.toUpperCase()}   {sex}</div>
                  <div>Insurance: {p.insuranceBy} - {p.insurance}</div>
                </div>
                <div style={{ textAlign: 'right', lineHeight: 1.55 }}>{letterhead.map((l, i) => <div key={i}>{l}</div>)}</div>
              </div>
              <div style={{ borderTop: '2px solid #000', margin: '6px 0 8px' }} />
              {sections.map((s) => (
                <div key={s}>
                  <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '1px solid #000', padding: '6px 0 4px' }}>{s}</div>
                  {rows.filter((r) => r.section === s).map((r, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 1fr', padding: '6px 0', borderBottom: '1px solid #c8c8c8' }}>
                      <span>{r.date}</span>
                      <span>
                        {r.description}
                        {r.comment && (
                          <div style={{ fontFamily: '"Lucida Console", monospace', fontSize: 11 }}>
                            {s === 'PREFERENCES' ? 'Instruction Comment:' : 'Comments:'}<br />{r.comment}
                          </div>
                        )}
                      </span>
                      <span>{r.detail}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </PBGroup>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 20, padding: '4px 120px', borderTop: '1px solid #9a9a9a', flex: 'none' }}>
        <span>Printer:&nbsp;&nbsp;CutePDFWriter</span>
        <span className="pb-link" style={{ color: '#0000ff', textDecoration: 'underline' }}>Change...</span>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('report-letterhead', ReportLetterheadDialog)
registerAreaWindow('care-plan-snapshot', CarePlanSnapshotDialog)
registerAreaWindow('care-plan-print-preview', CarePlanPrintPreview)
