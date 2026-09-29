import { useState, type CSSProperties, type ReactNode } from 'react'
import { PBCheckbox, pbSlug, PBMessageBox } from '../pb'
import { ModalWindow } from './dialogKit'
import { FormLabel, NAVY, SectionCaption } from './formKit'
import { PrintPreviewFrame } from './printKit'

/* ============================================================================
   Pieces the Data Exchange screens share: the navy section caption over a
   rule ("Claim Information", "Download Options:"), the green filter band,
   a radio that carries a tutorial anchor, MOIS's question prompt, the white
   DataWindow report page, and the Print Preview window the log folders open.
   ========================================================================= */

/** A navy bold caption ruled off underneath (81237c69, fcf7937c, 46924bab). */
export function Heading({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <SectionCaption inner="span" padding="6px 10px 3px" rule="#b8b8b8" style={{ margin: '0 0 6px', ...style }}>
      {children}
    </SectionCaption>
  )
}

/** The grey face a form-only screen is drawn on. */
export function Body({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)', ...style }}>
      {children}
    </div>
  )
}

export const Lbl = ({ children, w }: { children: ReactNode; w?: number }) => <FormLabel w={w}>{children}</FormLabel>

/** The pale green filter band over a list (#c0ffc0 in f6fddf3f, dd8676f0). */
export function GreenBand({ children, anchor, style }: { children: ReactNode; anchor?: string; style?: CSSProperties }) {
  return (
    <div
      className="pb-row pb-row--wrap"
      data-tutorial-id={anchor}
      style={{ background: '#c0ffc0', padding: '4px 8px', gap: '4px 8px', flex: 'none', alignItems: 'center', ...style }}
    >
      {children}
    </div>
  )
}

/**
 * A radio button whose `input` carries the anchor, so `clickAnchor` really
 * selects it (the kit's PBRadio has no anchor of its own). Same markup.
 */
export function Radio({ label, name, checked, onChange, anchor }: {
  label: ReactNode; name: string; checked: boolean; onChange: () => void; anchor?: string
}) {
  return (
    <label className="pb-check pb-check--radio">
      <input type="radio" name={name} checked={checked} data-tutorial-id={anchor} onChange={onChange} />
      <span className="pb-check__box"><span className="pb-check__dot" /></span>
      <span className="pb-check__label">{label}</span>
    </label>
  )
}

/** The Status list Prepare Bills and Reconcile Remittance count down (81237c69). */
export function StatusList({ steps, at }: { steps: string[]; at: number }) {
  return (
    <div data-tutorial-id="host.mois.group.status" style={{ padding: '4px 12px' }}>
      <div style={{ color: NAVY.win, fontWeight: 700, marginBottom: 4 }}>Status:</div>
      {steps.map((s, i) => (
        <div key={s} style={{ lineHeight: '19px', color: i <= at ? '#000' : '#a0a0a0' }}>{s}</div>
      ))}
    </div>
  )
}

/**
 * MOIS's Yes / No question box (3073580c: "Download Successful"): the kit's
 * PBMessageBox with each button anchored `host.mois.command.{label}`.
 */
export function Prompt({ title, children, buttons, onClose, icon = 'question' }: {
  title: string
  children: ReactNode
  buttons: string[]
  onClose: (button: string) => void
  icon?: 'question' | 'info'
}) {
  return (
    <PBMessageBox plain title={title} icon={icon} closeValue="close" onClose={onClose}
      tutorialId={`host.mois.dialog.${pbSlug(title)}`}
      buttons={buttons.map((b, i) => ({ label: b, value: b, default: i === 0, command: pbSlug(b) }))}>
      {children}
    </PBMessageBox>
  )
}

/** The white DataWindow report MOIS draws under a filter band (f6fddf3f, 8489439b). */
export function ReportPage({ heading, columns, footer, anchor }: {
  heading: string
  columns: string[]
  footer: string[]
  anchor?: string
}) {
  return (
    <div data-tutorial-id={anchor} style={{ flex: '1 1 auto', minHeight: 0, background: '#fff', borderTop: '1px solid #888', display: 'flex', flexDirection: 'column', padding: '4px 0 2px' }}>
      <div style={{ display: 'flex', padding: '0 60px 0 2px', fontWeight: 700, fontSize: 10 }}>
        <span>&lt;CLINIC&gt;</span><span style={{ flex: '1 1 auto' }} /><span>Page 1</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 15, padding: '2px 60px 6px 0', borderBottom: '2px solid #000', marginRight: 60 }}>{heading}</div>
      <div style={{ height: 18, borderBottom: '1px solid #000', marginRight: 60 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '6px 60px 2px 4px', borderBottom: '1px solid #000', marginRight: 60 }}>
        {columns.map((c) => <span key={c}>{c}</span>)}
      </div>
      <div style={{ flex: '1 1 auto' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, borderTop: '1px solid #000', padding: '2px 60px 0 0' }}>
        {footer.map((f) => <span key={f}>{f}</span>)}
      </div>
    </div>
  )
}

export type LogReport = {
  heading: string
  lines: string[][]
  file: string
  section: string
  columns: string[]
  rows: string[][]
}

/**
 * MOIS's Print Preview window: Zoom To, Percent, Copies, Apply, Change
 * Header, Sort, Print All / Print Range, Cancel, Save As, Printer Type down
 * the left and the page on the right (303590 image c7cb3ccf, 303496 image
 * 8d18b9db — the Chart Export and Chart Import logs).
 */
export function PrintPreviewWindow({ report, onClose }: { report: LogReport; onClose: () => void }) {
  const [zoom, setZoom] = useState('100%')
  return (
    <ModalWindow
      id="print-preview"
      title="Print Preview"
      onClose={onClose}
      controls
      zIndex={60}
      layerStyle={{ placeItems: 'start end', paddingTop: 40 }}
      windowStyle={{ width: 'min(900px, calc(100% - 20px))', height: 'min(560px, calc(100% - 50px))' }}
    >
        <PrintPreviewFrame
          skin="split"
          zoomName="zoom"
          zoom={zoom}
          onZoom={setZoom}
          percent={{ defaultValue: '125' }}
          copies={{ defaultValue: '1' }}
          range={{ defaultValue: 'All Pages' }}
          onCancel={onClose}
        >
          <fieldset className="pb-fieldset pb-fieldset--fill" style={{ flex: '1 1 auto', minWidth: 0 }}>
            <legend className="pb-fieldset__legend">Preview</legend>
            <div className="pb-fieldset__body" style={{ background: '#808080', padding: 8, overflow: 'auto', flex: '1 1 auto' }}>
              <div data-tutorial-id="host.mois.field.log-report" style={{ background: '#fff', padding: '18px 22px', minHeight: '100%', fontSize: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>MOIS DEVELOPMENT - NOT FOR PRODUCTION USE</div>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, borderBottom: '1px solid #000', paddingBottom: 3 }}>{report.heading}</div>
                <table style={{ width: '100%', margin: '6px 0', borderCollapse: 'collapse' }}>
                  <tbody>
                    {report.lines.map((line, i) => (
                      <tr key={i}>
                        <td style={{ width: 110 }}>{line[0]}</td><td style={{ fontWeight: 700 }}>{line[1]}</td>
                        <td style={{ width: 130 }}>{line[2]}</td><td style={{ fontWeight: 700 }}>{line[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ margin: '4px 0 8px' }}>{report.file}</div>
                {report.section && <div style={{ fontWeight: 700, fontSize: 15, borderBottom: '1px solid #000' }}>{report.section}</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                  <thead>
                    <tr>{report.columns.map((c) => <th key={c} style={{ textAlign: 'left', fontWeight: 400, borderBottom: '1px solid #000' }}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r, i) => (
                      <tr key={i}>{r.map((v, j) => <td key={j} style={{ borderBottom: '1px solid #000', padding: '3px 0' }}>{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </fieldset>
        </PrintPreviewFrame>
    </ModalWindow>
  )
}

/** A checkbox row inside a DataWindow cell (Setup / Registration's Active). */
export const CellCheck = ({ checked, onChange }: { checked: boolean; onChange?: (v: boolean) => void }) => (
  <span style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
    <PBCheckbox checked={checked} onChange={onChange} />
  </span>
)
