import type { CSSProperties, ReactNode } from 'react'
import { useCallback } from 'react'
import { useUnsentClaims } from '../data/billingStore'
import type { UnsentClaim } from '../data/claims'
import { useReportDialog } from '../host/screen-windows'
import { PBButton, PBGroup, PBInput, PBMessageBox, PBRadio, pbSlug, usePBInstrumentation } from '../pb'
import { DesktopLayer } from './dialogKit'
import { WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Small shared pieces for the PBF / LFP / PAS windows (screens/Lfp*.tsx,
   screens/Pbf*.tsx, screens/PasViews.tsx). Nothing here is a MOIS window of
   its own; each piece is the idiom the neighbouring Billing screens already
   use, given the anchors a lesson needs:

   - `FilterGroup` — the captioned navy-legend group box of every Billing
     selection-parameter strip (BillingAdminView's PBGroup);
   - `RadioSet` — a row of radios, each anchored
     `host.mois.field.<group>-<option>`;
   - `Field` — caption + edit box, anchored `host.mois.field.<id>`;
   - `ScreenDialog` — a folder-owned (screen) window: portalled onto the
     desktop like StageWindow, reported as `host.dialog`, ringed
     `host.mois.dialog.<id>`, and kept one layer under the area windows so a
     window it opens by id (Sent Claim Detail, the Update LFP Enrollment
     dialog) paints over it;
   - `Ask` — a PBMessageBox whose buttons are anchored
     `host.mois.command.<id>-<value>`;
   - `useUnsentSink` — adds claims to Billing ▸ Unsent Claims, through the
     live unsent list (data/billingStore.ts `useUnsentClaims().add`).
   ========================================================================= */

export function FilterGroup({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  const host = usePBInstrumentation()
  return (
    <div data-tutorial-id={host?.anchor('group', pbSlug(title))} style={{ display: 'flex', ...style }}>
      <PBGroup title={title} style={{ flex: '1 1 auto' }}>{children}</PBGroup>
    </div>
  )
}

export function RadioSet<T extends string>({ group, options, value, onChange, columns, labels, disabled }: {
  group: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  /** lay the radios out in this many columns (the two-by-two blocks) */
  columns?: number
  labels?: Partial<Record<T, string>>
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns ?? options.length}, auto)`, columnGap: 18, rowGap: 4, padding: '2px 0', justifyContent: 'start' }}>
      {options.map((o) => (
        <PBRadio
          key={o}
          name={`${group}-radio`}
          label={labels?.[o] ?? o}
          checked={value === o}
          disabled={disabled}
          onChange={() => onChange(o)}
          tutorialId={`host.mois.field.${group}-${pbSlug(labels?.[o] ?? o)}`}
        />
      ))}
    </div>
  )
}

export function Field({ id, label, value, onChange, w = 150, labelW, readOnly, align, placeholder, style }: {
  id: string
  label?: ReactNode
  value: string
  onChange?: (v: string) => void
  w?: number | string
  labelW?: number
  readOnly?: boolean
  align?: 'center' | 'right'
  placeholder?: string
  style?: CSSProperties
}) {
  return (
    <div className="pb-row" style={{ gap: 6, padding: '2px 0', alignItems: 'center', ...style }}>
      {label !== undefined && <span className="pb-form__label" style={labelW ? { width: labelW, flex: 'none' } : undefined}>{label}</span>}
      <PBInput
        w={w}
        value={value}
        readOnly={readOnly || !onChange}
        align={align}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        data-tutorial-id={`host.mois.field.${id}`}
        style={readOnly ? { background: '#e8e8e8' } : undefined}
      />
    </div>
  )
}

export function ScreenDialog({ id, title, width, height, onClose, children, controls = false }: {
  id: string
  title: ReactNode
  width: number
  height?: number
  onClose: () => void
  children: ReactNode
  controls?: boolean
}) {
  useReportDialog(id)
  return (
    <DesktopLayer>
      <WorkspaceDialogFrame id={id} title={title} width={width} height={height} onClose={onClose} controls={controls} zIndex={76}>
        {children}
      </WorkspaceDialogFrame>
    </DesktopLayer>
  )
}

export type AskButton = { label: string; value: string; default?: boolean }

export function Ask({ id, title, icon = 'question', buttons, onAnswer, children }: {
  id: string
  title: string
  icon?: 'info' | 'warn' | 'error' | 'question'
  buttons: AskButton[]
  onAnswer: (value: string) => void
  children: ReactNode
}) {
  const host = usePBInstrumentation()
  return (
    <PBMessageBox
      title={title}
      icon={icon}
      buttons={buttons.map((b) => ({ ...b, tutorialId: `host.mois.command.${id}-${pbSlug(b.value)}` }))}
      onClose={(v) => { host?.report('command', { command: `${id}-${pbSlug(v)}` }); onAnswer(v) }}
    >
      {children}
    </PBMessageBox>
  )
}

/** A blue underlined link-button in a grid cell (MSP CR Review's Detail /
    Delete / Replay), anchored `host.mois.command.<id>`. */
export function CellLink({ id, children, onClick, disabled }: { id: string; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  const host = usePBInstrumentation()
  return (
    <button
      type="button"
      className="pb-link"
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={(e) => { e.stopPropagation(); host?.report('command', { command: id }); onClick() }}
      style={{ border: 0, background: 'none', padding: 0, color: disabled ? '#888' : '#0000ee', textDecoration: 'underline', cursor: disabled ? 'default' : 'pointer', font: 'inherit' }}
    >
      {children}
    </button>
  )
}

/** A small face button inside a grid row (the Enrollment CR ✓ / ⃠ / undo
    icons, the Detail button). */
export function CellButton({ id, children, onClick, title, width = 26, disabled }: { id: string; children: ReactNode; onClick: () => void; title?: string; width?: number; disabled?: boolean }) {
  return (
    <PBButton
      title={title}
      disabled={disabled}
      style={{ width, minWidth: 0, height: 18, padding: 0, lineHeight: '14px' }}
      command={id}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {children}
    </PBButton>
  )
}

/** Append claims to Billing ▸ Unsent Claims for this session. */
export function useUnsentSink(): (claims: UnsentClaim[]) => void {
  const { add } = useUnsentClaims()
  return useCallback((claims: UnsentClaim[]) => {
    if (claims.length) add(claims.map((c) => ({ ...c, origin: c.origin ?? 'bulk' })))
  }, [add])
}

/** The grey-band title strip of a claim or benefit panel. */
export const PanelBand = ({ children }: { children: ReactNode }) => (
  <div style={{ background: '#dcd7d2', fontWeight: 700, padding: '4px 8px', borderBottom: '1px solid #a0a0a0', flex: 'none' }}>{children}</div>
)

/** A light-blue header block (Time Logger, Update LFP Enrollment, Time Entry). */
export const BlueHead = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ background: '#c9dcf6', padding: '6px 10px', flex: 'none', ...style }}>{children}</div>
)

export const Dim = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <span style={{ color: '#6d6d6d', ...style }}>{children}</span>
)
