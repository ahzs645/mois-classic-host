import type { CSSProperties, ReactNode } from 'react'
import { PBBand, PBButton, PBWindow } from '../../pb'

/* ============================================================================
   The shape every Scheduler utility window shares in the captures: a grey
   face, one framed box with a grey band caption (`Copy / Move Settings`,
   `Current Day Book`, `Recall Information`…), navy bold sub-headings with a
   rule under the group, and the buttons centred underneath.
   ========================================================================= */

export const NAVY: CSSProperties = { color: '#000080', fontWeight: 700 }

export function SchedulerDialog({
  id, title, width, height, band, buttons, onClose, children, bodyStyle,
}: {
  /** `host.mois.dialog.{id}` */
  id: string
  title: string
  width: number
  height?: number
  /** the grey caption band of the framed box; omitted, no box is drawn */
  band?: ReactNode
  buttons: { label: string; id?: string; onClick?: () => void; disabled?: boolean; primary?: boolean }[]
  onClose: () => void
  children: ReactNode
  bodyStyle?: CSSProperties
}) {
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title={title}
        tutorialId={`host.mois.dialog.${id}`}
        onClose={onClose}
        style={{ width, ...(height ? { height } : {}), maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 10, background: 'var(--pb-face)' }}>
          {band !== undefined ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464', background: 'var(--pb-face)' }}>
              <PBBand>{band}</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', ...bodyStyle }}>{children}</div>
            </div>
          ) : (
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', ...bodyStyle }}>{children}</div>
          )}
          <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '12px 0 2px', flex: 'none' }}>
            {buttons.map((b) => (
              <PBButton
                key={b.label}
                className={b.primary ? 'pb-btn--default' : undefined}
                style={{ minWidth: 90 }}
                disabled={b.disabled}
                data-tutorial-id={b.id ? `host.mois.command.${b.id}` : undefined}
                onClick={b.onClick ?? onClose}
              >
                {b.label}
              </PBButton>
            ))}
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

/** A navy heading and the rows under it, ruled off from the next group. */
export function DialogGroup({ title, children, last }: { title: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: '6px 10px 8px', borderBottom: last ? undefined : '1px solid #bdbdbd' }}>
      <div style={{ ...NAVY, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  )
}

/** One label / value line, the label right-aligned in a fixed column. */
export function DialogRow({ label, width = 96, children }: { label: ReactNode; width?: number; children: ReactNode }) {
  return (
    <div className="pb-row" style={{ gap: 8, padding: '2px 0' }}>
      <span style={{ width, textAlign: 'right', flex: 'none' }}>{label}</span>
      {children}
    </div>
  )
}

export const str = (v: unknown) => (typeof v === 'string' ? v : '')
