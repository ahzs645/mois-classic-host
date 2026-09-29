import type { CSSProperties, ReactNode } from 'react'
import { PBButton } from './controls'
import { PBWindow } from './chrome'

/* --- message-box icons: the Win32 set, flat-drawn for the Win10 frame ----
   Exported so a window that draws its own message-box body (a checkbox
   under the text, a white face) uses the same four glyphs.               */
export const PB_MESSAGE_ICONS = {
  info: (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="#1f7fd0" />
      <circle cx="16" cy="9.5" r="2" fill="#fff" />
      <path d="M13.6 14h4.2v10h-4.2z" fill="#fff" />
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <path d="M16 2l14 26H2z" fill="#f2c200" stroke="#b08c00" />
      <path d="M14.4 11h3.2v9h-3.2z" fill="#3a2f00" />
      <circle cx="16" cy="23.5" r="1.9" fill="#3a2f00" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="#d33" />
      <path d="M9 9l14 14M23 9L9 23" stroke="#fff" strokeWidth="3.4" />
    </svg>
  ),
  question: (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="#1f7fd0" />
      <path
        d="M11.6 12.2c0-2.6 2-4.4 4.6-4.4 2.7 0 4.5 1.6 4.5 4 0 3.4-4 3.2-4 6.6h-3c0-4.4 4-4.2 4-6.4 0-1-.7-1.6-1.6-1.6-1 0-1.7.7-1.7 1.8z"
        fill="#fff"
      />
      <circle cx="16" cy="23.5" r="2" fill="#fff" />
    </svg>
  ),
}

const ICONS = PB_MESSAGE_ICONS
export type PBMessageIcon = keyof typeof PB_MESSAGE_ICONS

export type PBMessageButton = {
  label: string; value: string; default?: boolean
  /** opt-in tutorial anchor on the button (host.mois.command.*) */
  tutorialId?: string
  /** a command id: anchors `host.mois.command.{command}` and reports the press */
  command?: string
  style?: CSSProperties
}

/* --- PBMessageBox -------------------------------------------------------- */
export function PBMessageBox({
  title, icon = 'info', children, buttons, onClose, zIndex = 70, plain, tutorialId, closeValue = 'cancel', textStyle,
}: {
  title: string
  icon?: PBMessageIcon
  children: ReactNode
  buttons: PBMessageButton[]
  onClose: (value: string) => void
  /** stack over a window that raised the box (the kit layer sits at 70) */
  zIndex?: number
  /** a transparent layer rather than the dimming one */
  plain?: boolean
  /** the box's own anchor, `host.mois.dialog.{id}` */
  tutorialId?: string
  /** what the title-bar × answers */
  closeValue?: string
  textStyle?: CSSProperties
}) {
  return (
    <div className={plain ? 'pb-modal-layer pb-modal-layer--plain' : 'pb-modal-layer'} style={{ zIndex }}>
      <PBWindow child controls={false} title={title} onClose={() => onClose(closeValue)} className="pb-msgbox" tutorialId={tutorialId}>
        <div className="pb-msgbox__body">
          <span className="pb-msgbox__icon">{ICONS[icon]}</span>
          <span className="pb-msgbox__text" style={textStyle}>{children}</span>
        </div>
        <div className="pb-msgbox__footer">
          {buttons.map((b) => (
            <PBButton
              key={b.value}
              className={b.default ? 'pb-btn--default' : undefined}
              command={b.command}
              data-tutorial-id={b.tutorialId}
              style={b.style}
              onClick={() => onClose(b.value)}
            >
              {b.label}
            </PBButton>
          ))}
        </div>
      </PBWindow>
    </div>
  )
}

/* --- PBSection — a rule-separated block inside a form -------------------- */
export function PBSection({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="pb-section">
      {title && <div className="pb-section__title">{title}</div>}
      {children}
    </div>
  )
}
