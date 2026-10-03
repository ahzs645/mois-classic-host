import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MOIS_TODAY } from '../data/clock'
import { PBMessageBox } from '../pb'
import { LAYER, ModalWindow } from './dialogKit'
import { PrintPreviewFrame } from './printKit'

/* ============================================================================
   What MOIS shows on Ctrl+Shift+A (host/field-audit.ts asks which).

   PROVENANCE: the 2026-08 field audit's own captures, MOIS DEV v02.31.23
   b250508 (~/github/Mois/outputs/019ff32b…/evidence):
     MATRIX-R0008-chart-no/audit-dialog.png, MATRIX-R0526-performed/…,
     MATRIX-R0605-performed/… — "Audit Information Not Available": the
       warning icon; "The MOIS Audit Service has not been activated for the
       following data field:", a dashed rule, `Table Name:` / `Field Name:`
       indented in two columns, "Please contact the system administrator for
       instructions on how to register this table/field.", OK. About 400 x
       250 at the frame's scale.
     MATRIX-R0269-include-on-care-plan-summary/audit-dialog.png — "Register
       Table - Field": the information icon, "Would you like to register this
       field with the MOIS Data Audit Service?", Yes (the default) and No.
       references/field-audit.md: it follows the first box's OK.
     MATRIX-R0484-value/audit-dialog.png, MATRIX-R0263-service-end/… — a
       registered field opens the Print Preview window on a "CHANGE AUDIT
       REPORT AS OF <date>" page: MOIS DEV / Page 1 over the title; TABLE
       NAME / FIELD NAME / RECORD ID left, WHEN MOIS STARTED AUDITING DATA
       CHANGES: Started By / Started Date right; DATE TIME USER DATA rows,
       each with a `copy` link. With no change recorded yet the page is the
       same with every value blank (the audit's "Blank Change Audit Report",
       42 fields) — the stage records no change history, so that is the page
       it shows.

   All three are raised over whatever window holds the field, and carry
   `data-field-audit` so the frame's Ctrl+Shift+A leaves them alone.
   ========================================================================= */

/** Autofocus the default button the way a Win32 message box does, hand the
    cursor back to the field afterwards, and close on Esc. */
function AuditBox({ onEscape, children }: { onEscape: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('.pb-btn--default')?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  return (
    <div
      ref={ref}
      data-field-audit=""
      style={{ display: 'contents' }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onEscape() } }}
    >
      {children}
    </div>
  )
}

const ROW = { display: 'grid', gridTemplateColumns: '96px 1fr', margin: '0 0 0 48px' } as const

export function AuditNotAvailableBox({ table, column, onOk }: { table: string; column: string; onOk: () => void }) {
  return (
    <AuditBox onEscape={onOk}>
      <PBMessageBox
        title="Audit Information Not Available"
        icon="warn"
        zIndex={LAYER.topmost + 1}
        tutorialId="host.mois.dialog.audit-information-not-available"
        closeValue="ok"
        textStyle={{ width: 306 }}
        buttons={[{ label: 'OK', value: 'ok', default: true, command: 'audit-ok', style: { width: 70 } }]}
        onClose={onOk}
      >
        The MOIS Audit Service has not been activated for the following data field:
        <span style={{ display: 'block', borderTop: '1px dashed #000', margin: '6px 0 12px' }} />
        <span style={ROW}><span>Table Name:</span><span data-tutorial-id="host.mois.field.audit-table-name">{table}</span></span>
        <span style={{ ...ROW, marginTop: 10 }}><span>Field Name:</span><span data-tutorial-id="host.mois.field.audit-field-name">{column}</span></span>
        <span style={{ display: 'block', marginTop: 16 }}>
          Please contact the system administrator for instructions on how to register this table/field.
        </span>
      </PBMessageBox>
    </AuditBox>
  )
}

export function RegisterTableFieldBox({ onAnswer }: { onAnswer: (register: boolean) => void }) {
  return (
    <AuditBox onEscape={() => onAnswer(false)}>
      <PBMessageBox
        title="Register Table - Field"
        icon="info"
        zIndex={LAYER.topmost + 1}
        tutorialId="host.mois.dialog.register-table-field"
        closeValue="no"
        textStyle={{ width: 320 }}
        buttons={[
          { label: 'Yes', value: 'yes', default: true, command: 'audit-register-yes', style: { width: 72 } },
          { label: 'No', value: 'no', command: 'audit-register-no', style: { width: 72 } },
        ]}
        onClose={(value) => onAnswer(value === 'yes')}
      >
        Would you like to register this field with the MOIS Data Audit Service?
      </PBMessageBox>
    </AuditBox>
  )
}

const ZOOMS = ['200', '100', '75', '50', '25']
const HEAD = { fontWeight: 700, fontSize: 13 } as const

export function ChangeAuditReportWindow({ onClose }: { onClose: () => void }) {
  const [zoom, setZoom] = useState('100')
  const [percent, setPercent] = useState('150')
  const [scale, setScale] = useState(100)
  const pickZoom = (z: string) => { setZoom(z); setPercent(z); setScale(Number(z)) }
  return (
    <AuditBox onEscape={onClose}>
      <ModalWindow
        id="change-audit-report"
        title="Print Preview"
        onClose={onClose}
        zIndex={LAYER.topmost + 1}
        windowStyle={{ width: 1000, height: 700, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}>
          <PrintPreviewFrame
            skin="report"
            zooms={ZOOMS}
            zoomLabel={(z) => `${z}%`}
            zoomName="audit-zoom"
            zoom={zoom}
            onZoom={pickZoom}
            fax
            ids={{ cancel: 'audit-report-cancel' }}
            percent={{ value: percent, onChange: (e) => setPercent(e.target.value) }}
            copies={{ defaultValue: '1' }}
            range={{ defaultValue: 'All Pages' }}
            onApply={() => { const n = Number(percent); if (n > 0) setScale(n) }}
            onCancel={onClose}
            printerTypes={['Report Printer', 'Form Printer']}
          >
            <fieldset className="pb-fieldset pb-fieldset--fill" style={{ margin: 0, flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <legend className="pb-fieldset__legend" style={{ color: '#000' }}>Preview</legend>
              <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', borderRight: '1px solid #a0a0a0' }}>
                <div
                  data-tutorial-id="host.mois.field.change-audit-report"
                  style={{ width: 1020, padding: '30px 30px', zoom: scale / 100, fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontSize: 12 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...HEAD }}><span>MOIS DEV</span><span>Page 1</span></div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, margin: '4px 0 6px' }}>
                    CHANGE AUDIT REPORT AS OF {MOIS_TODAY}
                  </div>
                  <div style={{ borderTop: '3px solid #000', display: 'flex', padding: '8px 0 6px', gap: 40 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '170px 200px', rowGap: 8, marginLeft: 18, ...HEAD }}>
                      <span>TABLE NAME:</span><span />
                      <span>FIELD NAME:</span><span />
                      <span>RECORD ID:</span><span />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 8, marginLeft: 'auto', marginRight: 60 }}>
                      <span style={{ ...HEAD, gridColumn: '1 / 3' }}>WHEN MOIS STARTED AUDITING DATA CHANGES:</span>
                      <span>Started By:</span><span />
                      <span>Started Date:</span><span />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '96px 82px 148px 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '5px 2px', ...HEAD }}>
                    <span>DATE</span><span>TIME</span><span>USER</span><span>DATA</span>
                  </div>
                </div>
              </div>
              <div className="pb-row" style={{ gap: 8, padding: '4px 6px', borderTop: '1px solid #a0a0a0', flex: 'none' }}>
                <span className="pb-form__label">Printer:</span>
                <span>Default ()</span>
                <button type="button" className="pb-link" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Change...</button>
              </div>
            </fieldset>
          </PrintPreviewFrame>
        </div>
      </ModalWindow>
    </AuditBox>
  )
}

/** Which of the three is up. */
export type FieldAuditStep =
  | { step: 'not-available'; table: string; column: string; entry?: string }
  | { step: 'register'; entry?: string }
  | { step: 'report'; entry?: string }

/** The frame's slot for them: OK on the first box raises the register
    prompt; Yes registers the field for the rest of the session. */
export function FieldAuditLayer({ open, onChange, onRegister }: {
  open: FieldAuditStep | null
  onChange: (next: FieldAuditStep | null) => void
  onRegister: (entry: string) => void
}) {
  if (!open) return null
  if (open.step === 'not-available') {
    return <AuditNotAvailableBox table={open.table} column={open.column} onOk={() => onChange({ step: 'register', entry: open.entry })} />
  }
  if (open.step === 'register') {
    return (
      <RegisterTableFieldBox
        onAnswer={(yes) => {
          if (yes && open.entry) onRegister(open.entry)
          onChange(null)
        }}
      />
    )
  }
  return <ChangeAuditReportWindow onClose={() => onChange(null)} />
}
