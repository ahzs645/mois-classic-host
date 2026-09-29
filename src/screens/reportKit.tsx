import type { CSSProperties, ReactNode } from 'react'
import { PBBand, PBButton, PBCheckbox, PBSelect, PBWindow, usePBInstrumentation } from '../pb'
import { CmdButton } from './CmdButton'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The report "Selection Parameter" pieces: the frame a Reports / Print-menu
   parameter window is drawn in (the grey `Selection Parameter` band over a
   bordered face, Ok / Cancel bottom-centre), its navy section headings, the
   label-column line, the grey hint, and the controls a lesson presses —
   anchored `host.mois.command.<id>` (ticks and radios) or
   `host.mois.lookup.<id>` ("…" buttons) and reported when clicked, the way a
   command-row button is.

   This wave builds the kit; the windows still carry their own copies. Each
   export lists the copies it replaces and the props that reproduce each
   one's markup exactly.

   Unification note: ParamLine's default form is the label-column line
   formKit's general `FormLine` is being built for, and ParamSection's
   `ruled` heading its `SectionCaption`; once both land, compare them and
   fold whichever is identical into formKit.
   ========================================================================= */

const NAVY = '#000080'

/* --- ParamSection ----------------------------------------------------------- */

/**
 * The navy section heading. The copies differ only in padding and rules:
 * - `ruled` (default) — ruled above and below, `marginTop: 4`:
 *   ReportParameterWindows 74, ReportSpecWindow 171, PatientsByProcedureWindow 32
 * - `under` — ruled below, `marginTop: 2`: reports/AuditReportWindows 73
 * - `flat` — ruled below, `padding: 4px 8px 3px`, no margin: reports/AccessReportWindows 166
 * - `open` — ruled below, `padding: 10px 10px 4px`: AmcareScorecardView 104
 * (ReportBuilderWindow's `Heading` — padding `6px 0 3px`, a #c0c0c0 rule,
 * `marginBottom: 4` — is the editor's own and stays.)
 */
export type ParamSectionKind = 'ruled' | 'under' | 'flat' | 'open'

const SECTION: Record<ParamSectionKind, CSSProperties> = {
  ruled: { color: NAVY, fontWeight: 700, padding: '5px 8px 3px', borderBottom: '1px solid #a0a0a0', borderTop: '1px solid #a0a0a0', marginTop: 4 },
  under: { color: NAVY, fontWeight: 700, padding: '5px 8px 3px', borderBottom: '1px solid #a0a0a0', marginTop: 2 },
  flat: { color: NAVY, fontWeight: 700, padding: '4px 8px 3px', borderBottom: '1px solid #a0a0a0' },
  open: { color: NAVY, fontWeight: 700, padding: '10px 10px 4px', borderBottom: '1px solid #a0a0a0' },
}

export function ParamSection({ kind = 'ruled', children }: { kind?: ParamSectionKind; children: ReactNode }) {
  return <div style={SECTION[kind]}>{children}</div>
}

/** The thin grey rule between a section's groups (reports/AuditReportWindows 76 `Rule`). */
export const ParamRule = () => <div style={{ borderTop: '1px solid #c8c8c8', margin: '5px 0' }} />

/* --- ParamLine -------------------------------------------------------------- */

/**
 * Label + control(s) on one line, the label in its own fixed column.
 * - default: ReportParameterWindows 81 (`w`, `style` as there),
 *   reports/AuditReportWindows 77 (no props: `w` 90), PatientsByProcedure-
 *   Window 37 (`w={80}`)
 * - `stacked`: reports/AccessReportWindows 169 — top-aligned, the label
 *   nudged 3px down and optionally right-aligned (`align`), the controls
 *   stacked in a column 4px apart
 */
export function ParamLine({ label, w = 90, stacked, align, style, children }: {
  label?: ReactNode
  /** the label column's width */
  w?: number
  stacked?: boolean
  /** `stacked` only: the label's text-align */
  align?: 'right'
  style?: CSSProperties
  children: ReactNode
}) {
  if (stacked) {
    return (
      <div className="pb-row" style={{ gap: 8, padding: '1px 0', minHeight: 22, alignItems: 'flex-start', ...style }}>
        <span className="pb-form__label" style={{ width: w, flex: 'none', paddingTop: 3, textAlign: align }}>{label}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</span>
      </div>
    )
  }
  return (
    <div className="pb-row" style={{ gap: 6, padding: '2px 10px', minHeight: 21, ...style }}>
      <span className="pb-form__label" style={{ width: w, flex: 'none' }}>{label}</span>
      {children}
    </div>
  )
}

/**
 * The unwrapped hint after a control, "(years since last)". Nothing when
 * empty (ReportSpecWindow 179's form; the other copies — ReportParameter-
 * Windows 88, AuditReportWindows 83, AccessReportWindows 175 — always pass
 * text, so they draw the same).
 */
export const Hint = ({ children }: { children?: ReactNode }) => (children ? <span style={{ whiteSpace: 'nowrap' }}>{children}</span> : null)

/* --- the anchored controls ------------------------------------------------- */

/**
 * A checkbox a lesson presses: anchored and reported as `host.mois.command.<id>`.
 * Copies: ReportParameterWindows 91 `CmdCheck`, ReportBuilderTools 116
 * `Check`, ReportBuilderWindow 484 `Check`, AmcareScorecardView 131 `check`
 * (the same `label.pb-check` markup, label always given), AuditReport-
 * Windows' inline `PBCheckbox … tutorialId={cmd(id)}` with `said(id)` (pass
 * `id={\`${P}-${id}\`}`). All draw the same with the same props.
 */
export function CmdCheck({ id, label, checked, onChange, disabled }: {
  id: string; label?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  const host = usePBInstrumentation()
  return (
    <PBCheckbox
      label={label}
      checked={checked}
      disabled={disabled}
      tutorialId={host?.anchor('command', id)}
      onChange={(v) => { host?.report('command', { command: id }); onChange(v) }}
    />
  )
}

/**
 * A radio a lesson presses, anchored on its input and reported as a command.
 * Its label span is drawn even when empty — unlike PBRadio's — which is why
 * it is not a PBRadio. Copies: ReportParameterWindows 108 `CmdRadio`,
 * ReportBuilderTools 120 `Radio`, ReportBuilderWindow 496 `Radio`,
 * AmcareScorecardView 108 `Radio`, AuditReportWindows 111 `radio(id, …)`
 * (`id={\`${P}-${id}\`} name={\`${P}-provider\`}`). Identical markup.
 */
export function CmdRadio({ id, name, label, checked, onChange }: {
  id: string; name: string; label?: ReactNode; checked: boolean; onChange: () => void
}) {
  const host = usePBInstrumentation()
  return (
    <label className="pb-check pb-check--radio">
      <input
        type="radio"
        name={name}
        checked={checked}
        data-tutorial-id={host?.anchor('command', id)}
        onChange={() => { host?.report('command', { command: id }); onChange() }}
      />
      <span className="pb-check__box"><span className="pb-check__dot" /></span>
      <span className="pb-check__label">{label}</span>
    </label>
  )
}

/**
 * The "…" button at the end of an input group: anchored and reported as
 * `host.mois.lookup.<id>` (unanchored and silent without an `id`).
 * - ReportBuilderTools 110 `Dots`: `id`, `onClick`
 * - ReportBuilderWindow 470 `Dots`: `h={19}`
 * - ReportSpecWindow 330 `dots(key, pick, disabled)`:
 *   `id={\`${sid}-${key}\`} disabled={disabled}` (drawn only when `pick`)
 */
export function DotsButton({ id, onClick, h, disabled }: { id?: string; onClick?: () => void; h?: number; disabled?: boolean }) {
  const host = usePBInstrumentation()
  return (
    <button
      type="button"
      className="pb-inputgroup__btn pb-inputgroup__btn--dots"
      style={h ? { height: h } : undefined}
      disabled={disabled}
      data-tutorial-id={id ? host?.anchor('lookup', id) : undefined}
      onClick={() => { if (id) host?.report('lookup', { field: id }); onClick?.() }}
    >
      …
    </button>
  )
}

/**
 * A plain edit box anchored `host.mois.field.<id>`.
 * Copies: ReportBuilderTools 97 `Input` (`style` merged after the width),
 * ReportBuilderWindow 448 `Field` (`disabled`). Identical markup.
 */
export function FieldInput({ id, value, onChange, w, align, disabled, style }: {
  id?: string; value: string; onChange: (v: string) => void; w: number | string
  align?: 'center' | 'right'; disabled?: boolean; style?: CSSProperties
}) {
  return (
    <input
      className={`pb-field${align === 'center' ? ' pb-field--center' : align === 'right' ? ' pb-field--right' : ''}`}
      style={{ width: w, ...style }}
      value={value}
      disabled={disabled}
      data-tutorial-id={id ? `host.mois.field.${id}` : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/**
 * A drop-down anchored `host.mois.field.<id>`.
 * Copies: ReportBuilderTools 107 `Sel`, ReportBuilderWindow 462 `Select`. Identical.
 */
export function FieldSelect({ id, value, options, onChange, w }: {
  id?: string; value: string; options: readonly string[]; onChange: (v: string) => void; w: number
}) {
  return <PBSelect w={w} value={value} options={options} data-tutorial-id={id ? `host.mois.field.${id}` : undefined} onChange={(e) => onChange(e.target.value)} />
}

/* --- ParamFrame ------------------------------------------------------------- */

/**
 * The window a parameter set is drawn in. Two builds:
 *
 * `variant="report"` (default) — the Reports module's: a WorkspaceDialogFrame
 * ringed `host.mois.dialog.<id>`, no min/max boxes, the bordered face on
 * `var(--pb-face)`, a scrolling body, and Ok / Cancel as DialogButtons
 * `<prefix>-ok` / `<prefix>-cancel`, `buttonWidth` wide (75), 19px apart.
 *   - ReportParameterWindows 127 `ParamFrame({ report, title, width, height, prefix, onOk, close })`:
 *     `id={\`report-params-${report}\`} prefix={prefix} w={width} h={height} onCancel={close}`
 *   - ReportSpecWindow 494-512: `id={\`report-params-${sid}\`} prefix={sid}
 *     title={spec.title ?? …} w={spec.width ?? 640} h={spec.height ?? 505}
 *     band={spec.band !== false} okLabel={spec.okLabel ?? 'Ok'} onOk={ok}
 *     onCancel={close} after={picking && <ReportPicker … />}`
 *   - reports/AuditReportWindows 114 (Scorecard): `id={\`report-params-${P}\`}
 *     w={661} h={497} footer={its three-button row, as is} after={previous && <PreviousScorecard … />}`
 *
 * `variant="print"` — the chart Print menu's SelectionParameterDialog
 * (PrintFlow 118-165): a plain modal layer (z 80) over a child PBWindow ringed
 * `host.mois.dialog.<id>`, height capped at `calc(100vh - 80px)`, the face on
 * `var(--pb-window)`, a column body, and CmdButtons: Ok default with
 * `minWidth: buttonWidth`, Cancel `width: buttonWidth` (69), plus an optional
 * `left` button pinned bottom-left (MAR's Select Records…).
 *   - PrintFlow: `variant="print" id="print-params" prefix="print"
 *     title={report.title} w={size.width} h={size.height} band={band}
 *     okLabel={report.okLabel ?? 'Ok'} buttonWidth={69} onOk={ok} onCancel={onClose}
 *     left={report.leftButton && { label: report.leftButton.label, anchor: report.leftButton.window,
 *     onClick: () => setPickRecords(true) }} after={pickRecords && <SelectMarRecordsWindow … />}`,
 *     children = the fields and the note
 *
 * Not a fit: PatientsByProcedureWindow 94 (padding 12 on the face, a
 * `var(--pb-border)` border, no scroll body, 88-wide buttons 10px below — a
 * different build; its Section/Line do migrate: `ParamSection`,
 * `ParamLine w={80}`), reports/AccessReportWindows 237 (its own Report
 * Parameters + Search Results layout).
 */
export function ParamFrame({
  variant = 'report', id, prefix = id, title, w, h, band = true, okLabel = 'Ok', buttonWidth,
  onOk, onCancel, left, footer, after, children,
}: {
  variant?: 'report' | 'print'
  /** the window's anchor slug: `host.mois.dialog.<id>` */
  id: string
  /** the Ok / Cancel command ids' prefix: `<prefix>-ok`, `<prefix>-cancel` (default `id`) */
  prefix?: string
  title: ReactNode
  w: number
  h: number
  /** the grey `Selection Parameter` band */
  band?: boolean
  okLabel?: ReactNode
  /** Ok / Cancel width — 75 (report) or 69 (print) by default */
  buttonWidth?: number
  onOk: () => void
  onCancel: () => void
  /** print only: a button pinned bottom-left, anchored `host.mois.command.<anchor>` (not reported) */
  left?: { label: ReactNode; anchor: string; onClick: () => void } | null | false
  /** report only: replaces the Ok / Cancel row entirely */
  footer?: ReactNode
  /** drawn after the window body — a picker or message over it */
  after?: ReactNode
  children: ReactNode
}) {
  if (variant === 'print') {
    const bw = buttonWidth ?? 69
    return (
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
        <PBWindow
          child
          controls={false}
          tutorialId={`host.mois.dialog.${id}`}
          title={title}
          onClose={onCancel}
          style={{ width: w, height: `min(${h}px, calc(100vh - 80px))` }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 12, gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: 'var(--pb-window)' }}>
              {band && <PBBand>Selection Parameter</PBBand>}
              <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 0 4px', display: 'flex', flexDirection: 'column' }}>
                {children}
              </div>
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 19, padding: '14px 0 4px', flex: 'none' }}>
              {left && (
                <PBButton
                  style={{ position: 'absolute', left: 0, top: 14 }}
                  data-tutorial-id={`host.mois.command.${left.anchor}`}
                  onClick={left.onClick}
                >
                  {left.label}
                </PBButton>
              )}
              <CmdButton className="pb-btn--default" style={{ minWidth: bw }} command={`${prefix}-ok`} onClick={onOk}>{okLabel}</CmdButton>
              <CmdButton style={{ width: bw }} command={`${prefix}-cancel`} onClick={onCancel}>Cancel</CmdButton>
            </div>
          </div>
        </PBWindow>
        {after}
      </div>
    )
  }
  const bw = buttonWidth ?? 75
  return (
    <WorkspaceDialogFrame id={id} title={title} width={w} height={h} controls={false} onClose={onCancel}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '10px 12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: 'var(--pb-face)' }}>
          {band && <PBBand>Selection Parameter</PBBand>}
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', paddingBottom: 6 }}>{children}</div>
        </div>
        {footer ?? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '12px 0 10px', flex: 'none' }}>
            <DialogButton id={`${prefix}-ok`} width={bw} isDefault onClick={onOk}>{okLabel}</DialogButton>
            <DialogButton id={`${prefix}-cancel`} width={bw} onClick={onCancel}>Cancel</DialogButton>
          </div>
        )}
      </div>
      {after}
    </WorkspaceDialogFrame>
  )
}
