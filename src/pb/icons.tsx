/* Small Win32-flavoured icons, drawn inline so the kit has no asset
   dependency. Deliberately blocky: 16px, hard edges, no anti-aliased curves. */
import type { CSSProperties } from 'react'

type IconProps = { size?: number; style?: CSSProperties }

const box = (size = 16) => ({ width: size, height: size, display: 'block' as const })

export const IconFolder = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <path d="M1 4h5l1.4 1.6H15V13H1z" fill="#ffd77a" stroke="#a37b17" strokeWidth="1" />
    <path d="M1 6.6h14V13H1z" fill="#ffe9a8" stroke="#a37b17" strokeWidth="1" />
  </svg>
)

export const IconFolderOpen = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <path d="M1 4h5l1.4 1.6H13V12H1z" fill="#ffd77a" stroke="#a37b17" strokeWidth="1" />
    <path d="M3 7h13l-2.4 5.5H1z" fill="#ffeeb8" stroke="#a37b17" strokeWidth="1" />
  </svg>
)

export const IconCalendarGrid = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#5a7fa8" />
    <rect x="1.5" y="2.5" width="13" height="3" fill="#8fb4d6" stroke="#5a7fa8" />
    {[7, 9.5, 12].map((y) => <line key={y} x1="2" y1={y} x2="14" y2={y} stroke="#9fb8cf" />)}
    {[5, 8, 11].map((x) => <line key={x} x1={x} y1="6" x2={x} y2="13" stroke="#9fb8cf" />)}
  </svg>
)

export const IconPeople = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <circle cx="10.5" cy="5" r="2.6" fill="#f0b98a" stroke="#9a6a3c" />
    <path d="M6 14c0-2.6 2-4.2 4.5-4.2S15 11.4 15 14z" fill="#5a86b8" stroke="#2f5a8c" />
    <circle cx="4.5" cy="6" r="2.3" fill="#f0b98a" stroke="#9a6a3c" />
    <path d="M1 14c0-2.4 1.6-3.8 3.5-3.8S8 11.6 8 14z" fill="#7fa7d4" stroke="#2f5a8c" />
  </svg>
)

export const IconClock = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <circle cx="7.5" cy="8" r="6" fill="#eef4fa" stroke="#4a6b8a" />
    <path d="M7.5 4.5V8l2.5 1.6" stroke="#2b3f52" fill="none" strokeWidth="1.2" />
    <rect x="10" y="9.5" width="5" height="5" fill="#e23a2e" stroke="#8c1d15" />
  </svg>
)

export const IconBook = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <path d="M1.5 3.5h5.5c1 0 1.5.6 1.5 1.4V13H3c-1 0-1.5-.5-1.5-1.3z" fill="#7fb3dd" stroke="#3d6d94" />
    <path d="M14.5 3.5H9c-1 0-1.5.6-1.5 1.4V13H13c1 0 1.5-.5 1.5-1.3z" fill="#a9d1ec" stroke="#3d6d94" />
  </svg>
)

/* --- Workspace tree glyphs, traced off `workspace_summary.PNG` ------------
   Basket is the blue in-tray, Task List the red check on a page, and Message
   Board an envelope — the three icons that tell the Workspace's branches
   apart at a glance. */
export const IconBasket = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <path d="M2 6.5h12l-1.4 6.2c-.1.5-.5.8-1 .8H4.4c-.5 0-.9-.3-1-.8z" fill="#2baaff" stroke="#1b6fb0" />
    <path d="M5.5 6.3 8 2.6l2.5 3.7" fill="none" stroke="#1b6fb0" />
    <path d="M2 5.6h12v1.6H2z" fill="#c9e1f7" stroke="#1b6fb0" />
  </svg>
)

export const IconTaskCheck = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <rect x="2.5" y="1.5" width="9" height="12" fill="#fff" stroke="#6b6b6b" />
    <g stroke="#9a9a9a">{[4.5, 6.5, 8.5].map((y) => <line key={y} x1="4" y1={y} x2="10" y2={y} />)}</g>
    <path d="M6 9.5 9 13l5-8" fill="none" stroke="#ff674f" strokeWidth="2" />
  </svg>
)

export const IconEnvelope = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <rect x="1.5" y="3.5" width="13" height="9" fill="#ebf6ff" stroke="#656daf" />
    <path d="M1.5 3.5 8 9l6.5-5.5" fill="none" stroke="#656daf" />
  </svg>
)

export const IconChart = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#6b6b6b" />
    <rect x="3" y="8" width="2.5" height="5" fill="#4a7fbd" />
    <rect x="6.6" y="5" width="2.5" height="8" fill="#63a34a" />
    <rect x="10.2" y="3" width="2.5" height="10" fill="#c0543d" />
  </svg>
)

export const IconIdCard = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <rect x="1.5" y="3.5" width="13" height="9" fill="#f4f4f4" stroke="#6b6b6b" />
    <rect x="3" y="5" width="4" height="4.5" fill="#8fb4d6" stroke="#4a6b8a" />
    <g stroke="#5a5a5a">{[6, 8, 10].map((y) => <line key={y} x1="8.2" y1={y} x2="13" y2={y} />)}</g>
  </svg>
)

export const IconPlusDoc = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <path d="M2.5 1.5h7l3.5 3.5v9.5h-10.5z" fill="#fff" stroke="#6b6b6b" />
    <path d="M9.5 1.5V5H13" fill="none" stroke="#6b6b6b" />
    <path d="M7.5 7v5M5 9.5h5" stroke="#c0392b" strokeWidth="1.6" />
  </svg>
)

export const IconBilling = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <rect x="1.5" y="3.5" width="13" height="9" fill="#dff0fb" stroke="#3d6d94" />
    <rect x="1.5" y="3.5" width="13" height="2.4" fill="#4a7fbd" stroke="#3d6d94" />
    <g stroke="#3d6d94">{[8.5, 10.5].map((y) => <line key={y} x1="3" y1={y} x2="12.6" y2={y} />)}</g>
  </svg>
)

export const IconGear = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <circle cx="8" cy="8" r="5.2" fill="none" stroke="#7a7a7a" strokeWidth="2.4" strokeDasharray="2.2 1.8" />
    <circle cx="8" cy="8" r="2.4" fill="#fff" stroke="#7a7a7a" />
  </svg>
)

export const IconAdmin = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <path d="M4 2.5h8v11H4z" fill="#f0f0f0" stroke="#6b6b6b" />
    <path d="M6 2.5h6v6H6z" fill="#c0392b" stroke="#8c2a1e" />
  </svg>
)

export const IconReport = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <rect x="2.5" y="1.5" width="11" height="13" fill="#fff" stroke="#6b6b6b" />
    <rect x="4.5" y="9" width="2" height="4" fill="#4a7fbd" />
    <rect x="7.5" y="6.5" width="2" height="6.5" fill="#63a34a" />
    <rect x="10.5" y="4" width="2" height="9" fill="#c0543d" />
  </svg>
)

export const IconMoisApp = ({ size = 16, style }: IconProps) => (
  <svg viewBox="0 0 16 16" style={{ ...box(size), ...style }}>
    <ellipse cx="8" cy="8" rx="7" ry="4.6" fill="#cfe4f5" stroke="#3d78b0" />
    <ellipse cx="8" cy="8" rx="3.4" ry="2.1" fill="#fff" stroke="#3d78b0" />
  </svg>
)

/* --- title-bar glyphs: Win10 draws these as 1px strokes ------------------ */
export const GlyphMinimize = () => (
  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" /></svg>
)
export const GlyphMaximize = () => (
  <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" /></svg>
)
export const GlyphRestore = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" />
    <path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" />
  </svg>
)
export const GlyphClose = () => (
  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" /></svg>
)
export const GlyphCheck = () => (
  <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 4.6l2.4 2.6L8 1.4" fill="none" stroke="#3a3a3a" strokeWidth="1.5" /></svg>
)
