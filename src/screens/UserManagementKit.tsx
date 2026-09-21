import type { ReactNode } from 'react'
import { PBButton, PBCheckbox, pbSlug, usePBInstrumentation } from '../pb'
import type { PBColumn } from '../pb'
import { UM_INACTIVE, UM_PICKED, UM_RED, type UserColumn, type UserRow } from '../data/userManagement'

/* ============================================================================
   The pieces the four User Management screens and their four editor windows
   all use. Kept in its own module so the windows form a straight line —
   kit ← access tabs ← Security Profile Settings ← User Account — rather than
   a cycle.
   ========================================================================= */

/* --------------------------------------------------------------------------
   Measured details the `pb` kit has no prop for. This wave may not add props
   to `src/pb`, so they are applied as scoped rules instead; all four are
   listed in the wave report as candidates for real kit props.

     1. the 2019-theme dialog chrome's RED close box, where the kit paints the
        Win10 grey one (`a58fd3359aa3`, `32e650d43334`);
     2. a 29px header band over 19px rows — the kit ties a header's height to
        the detail-band pitch (`415516e9d83a`, the Membership List);
     3. the #9C9C9C inactive-record ink, which greys EVERY cell of a row
        (`415516e9d83a`, `31431ac8415b`, `28bcccbceb53`);
     4. the #9CFB9C checked row in the security-profile picker
        (`e227667383d1`).
   ------------------------------------------------------------------------ */
export const UM_CSS = `
.pb-um-dialog .pb-titlebar__btn--close { color: ${UM_RED}; }
.pb-um-dialog .pb-titlebar__btn--close:hover { color: #ffffff; }
.pb-um-head29 .pb-dw__table > thead > tr:not(.pb-dw__filters) > th { height: 29px; }
.pb-um-inactive .pb-dw__table > tbody > tr.is-inactive > td { color: ${UM_INACTIVE}; }
.pb-um-picker .pb-dw__table > tbody > tr.is-picked,
.pb-um-picker .pb-dw__table > tbody > tr.is-picked:nth-child(odd) { background: ${UM_PICKED}; }
`

/** A caption MOIS breaks itself; a `\n` in the data is that break. */
export function umCaption(header: string): ReactNode {
  if (!header.includes('\n')) return header
  return header.split('\n').map((line, i) => (i === 0 ? line : <span key={i}><br />{line}</span>))
}

/** A data-file column table as the kit's columns. */
export function umColumns(columns: UserColumn[]): PBColumn<UserRow>[] {
  return columns.map((c) => ({
    key: c.key,
    header: umCaption(c.header),
    width: c.width,
    align: c.align,
    /* the header band is centred caption text whatever the cells under it do,
       so a caption only leaves centre where the node's table says so */
    headAlign: c.headAlign ?? 'center',
    render: c.check
      ? (r: UserRow) => <PBCheckbox checked={Boolean(r[c.key])} />
      : c.override
        ? (r: UserRow) => overrideCell(r[c.key])
        : undefined,
  }))
}

/**
 * An override count: a literal `-` at zero, the number in #FF0000 otherwise.
 * `28bcccbceb53` (the User Accounts grid) and `415516e9d83a` (the profile's
 * User List tab) both paint it this way.
 */
export function overrideCell(value: unknown): ReactNode {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n === 0) return '-'
  return <span style={{ color: UM_RED }}>{n}</span>
}

/** A band's right-anchored button strip, each button anchored for a lesson. */
export function BandButtons({ scope, labels, onPress }: {
  scope: string
  labels: readonly string[]
  onPress?: (label: string) => void
}) {
  const host = usePBInstrumentation()
  return (
    <>
      {labels.map((b) => (
        <PBButton
          key={b}
          size="sm"
          data-tutorial-id={host?.anchor('command', `${scope}-${pbSlug(b)}`)}
          onClick={() => {
            host?.report('command', { command: `${scope}-${pbSlug(b)}` })
            onPress?.(b)
          }}
        >
          {b}
        </PBButton>
      ))}
    </>
  )
}

/** The label-and-control line these windows lay their forms out on. */
export function UMField({ label, w, children }: { label: string; w?: number; children: ReactNode }) {
  return (
    <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
      <span className="pb-form__label" style={{ minWidth: w ?? 118 }}>{label}</span>
      {children}
    </div>
  )
}

export const umField = (label: string) => `host.mois.field.${pbSlug(label)}`
