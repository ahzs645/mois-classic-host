import { useMemo, useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBGroup, PBInput,
  PBTextArea, PBViewHeader, PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'
import { MOIS_TODAY } from '../data/patients'
import {
  PASSWORD_POLICY, PASSWORD_POLICY_SPEC, UM_FOCUS, UM_RED,
  USER_COMMANDS, USER_GROUP_DIALOG, USER_GROUP_MEMBERS,
  userListSpec,
  type PolicyField, type UserColumn, type UserListSpec, type UserRow,
} from '../data/userManagement'
import { BandButtons, UM_CSS, umColumns } from './UserManagementKit'
import { NewUserDialog, UserAccountWindow, newUserDisplayName, type NewUserDraft } from './UserAccountWindow'
import { SecurityProfileWindow } from './SecurityProfileWindow'
import { useScreenReport } from '../host/screen-state'

/* ============================================================================
   Administration ▸ User Management — the three list nodes — plus
   Administration ▸ Configuration ▸ Password Policy.

   Three of the four are the same window as the twelve Clinic Management ones
   (`ClinicListView`): navy view header, a row of 81px buttons, an optional
   column-aligned filter strip, a DataWindow. All three carry the SAME four
   buttons — `New Record` · `Delete Record` · `Edit Record` · `Close Window` —
   so there is only one list dialect here, not four.

   Password Policy is the fourth and is not a grid at all: two blue section
   captions over a short form, under a two-button command row. It also lives
   under **Configuration**, not User Management (`303193`: "Open the Password
   Policy folder in the Configuration section").

   THE OUTLIER. `ad-users` runs 24px rows under a 34px TWO-ROW banded header
   with an `Overrides` super-column across three sub-columns, and draws no
   vertical gridlines. Every other admin grid is 19/16 with rules. The banded
   header is decomposed per column below — see `BandedHead` — because the
   super-column's own measurements decompose exactly that way: a 51px rule in
   the Window column, the centred word `Overrides` in the Functions column, a
   51px rule in the Reports column.

   WHAT THIS SCREEN DOES NOT DO, because no capture exists:
     - `New Record` on Security Profiles raises nothing. No "New Security
       Profile" dialog is captured anywhere in the corpus.
     - `New Record` on User Groups opens `User Group Detail` directly.
       `303203`'s prose puts an intermediate name-and-`Create Record` prompt
       in front of it; that prompt is never captured, so it is not invented.
     - No admin toolbar button is drawn disabled. The spec probed all four
       User Accounts buttons glyph by glyph and found every label in solid
       #000000, so none of them is disabled in any capture — and the
       #FFFFFF/#F0F0F0 face variation is inconsistent across captures of the
       same screen, so it is not a state signal either.

   MEASURED vs KIT, stated rather than presented as measured:
     - the filter strip paints at the kit's 22px, not the measured 17px
       (y 74-90 on `28bcccbceb53`);
     - the gutter paints at the kit's fixed 13px, not the measured 15-16px —
       `spec.gutter` records the real figure;
     - the rules flanking `Overrides` take the caption ink (`currentColor`).
       Their colour was never sampled; only their 51px length and their x
       positions were.
   ========================================================================= */

export function UserManagementView({ node, onClose }: { node: string; onClose?: () => void }) {
  if (node === PASSWORD_POLICY_SPEC.node) return <PasswordPolicyView onClose={onClose} />
  const spec = userListSpec(node)
  if (!spec) return null
  return <UserListView key={spec.node} spec={spec} onClose={onClose} />
}

/* --------------------------------------------------------------------------
   The banded header
   ------------------------------------------------------------------------ */

/**
 * One column's caption inside the User Accounts grid's 34px two-row band.
 * The band is rendered per column rather than as a spanning `<th colSpan>`
 * because that is how the measurements decompose: the top row is a 51px rule,
 * the word `Overrides`, and a second 51px rule, each sitting inside one of the
 * three 53px sub-columns.
 */
function BandedHead({ column }: { column: UserColumn }) {
  const align = column.headAlign === 'left'
    ? 'flex-start'
    : column.headAlign === 'right' ? 'flex-end' : 'center'
  return (
    <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 32, width: '100%' }}>
      <span style={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {column.band?.kind === 'label' ? column.band.text : null}
        {column.band?.kind === 'rule' && (
          /* 51px, measured; the ink was not sampled, so it is the caption's */
          <span style={{ display: 'block', width: 51, height: 1, background: 'currentColor' }} />
        )}
      </span>
      <span
        style={{
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: align,
          paddingLeft: align === 'flex-start' ? 2 : 0,
        }}
      >
        {column.header}
      </span>
    </span>
  )
}

/* --------------------------------------------------------------------------
   The list screen
   ------------------------------------------------------------------------ */

function UserListView({ spec, onClose }: { spec: UserListSpec; onClose?: () => void }) {
  const [cur, setCur] = useState(0)
  const [filter, setFilter] = useState<Record<string, string>>({})
  const [newOpen, setNewOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [added, setAdded] = useState<UserRow[]>([])

  const all = useMemo(() => [...spec.rows, ...added], [spec.rows, added])
  const rows = all.filter((r) => spec.columns.every((c) => {
    const term = filter[c.key]?.trim().toLowerCase()
    if (!term) return true
    return String(r[c.key] ?? '').toLowerCase().includes(term)
  }))

  const columns = umColumns(spec.columns)
  /* the banded two-row header is the User Accounts grid's alone */
  if (spec.headH > 16) {
    for (let i = 0; i < columns.length; i += 1) {
      const src = spec.columns[i]!
      columns[i]!.header = <BandedHead column={src} />
    }
  }

  /* the User Accounts row is as wide as the work area, so a lesson rings its
     Display Name cell rather than the row */
  if (spec.anchorCell) {
    const key = spec.anchorCell
    const col = columns[spec.columns.findIndex((c) => c.key === key)]
    if (col) {
      col.render = (r: UserRow) => {
        const value = String(r[key] ?? '')
        /* `{row}` compiles to `[A-Za-z0-9_-]+`, so a blank value would build
           an anchor that matches no template — an unnamed row carries none */
        const slug = pbSlug(value)
        return (
          <span data-tutorial-id={slug ? `host.mois.cell.${pbSlug(key)}-${slug}` : undefined}>
            {value}
          </span>
        )
      }
    }
  }

  const filters = spec.filter
    ? spec.columns.map((c, i) => {
      const box = spec.filter!.find((b) => b.col === i)
      return box
        ? (
          <PBInput
            key={c.key}
            w={box.w}
            value={filter[c.key] ?? ''}
            onChange={(e) => { setFilter({ ...filter, [c.key]: e.target.value }); setCur(0) }}
            data-tutorial-id={`host.mois.field.filter-${pbSlug(c.key)}`}
          />
        )
        : null
    })
    : undefined

  const openEditor = (row: UserRow) => setEditing(row)
  const current = cur < rows.length ? cur : 0

  return (
    <>
      <style>{UM_CSS}{headCss(spec)}</style>

      <PBViewHeader title={spec.header} />

      <PBCommandRow
        commands={USER_COMMANDS[spec.dialect].map((label) => ({
          label,
          onClick:
            label === 'New Record'
              /* Security Profiles has no captured New Record dialog, so its
                 button raises nothing rather than an invented one */
              ? (spec.newDialog ? () => setNewOpen(true) : undefined)
              : label === 'Edit Record'
                ? () => { const r = rows[current]; if (r) openEditor(r) }
                : label === 'Close Window' ? () => onClose?.()
                  : undefined,
        }))}
      />

      <div
        className={`pb-um-grid-${spec.node} pb-um-inactive`}
        style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}
      >
        <PBDataWindow<UserRow>
          rows={rows}
          current={current}
          onCurrentChange={setCur}
          onActivate={openEditor}
          columns={columns}
          filters={filters}
          /* `28bcccbceb53` draws no vertical gridlines at all */
          rules={spec.rules}
          rowClassName={(r) => (
            spec.inactive && r[spec.inactive.key] === spec.inactive.value ? 'is-inactive' : undefined
          )}
          rowTutorialId={spec.anchorCell
            ? undefined
            : (r) => `host.mois.row.${spec.anchorPrefix}-${pbSlug(String(r[spec.anchorKey] ?? ''))}`}
          style={{
            ['--pb-dw-row-h' as string]: `${spec.pitch}px`,
            /* the filter strip's boxes sit on white in every capture, not on
               the dialog face the kit's lookup grids use */
            ['--pb-band' as string]: '#ffffff',
          }}
          empty="No records."
        />
      </div>

      {newOpen && spec.newDialog === 'new-user' && (
        <NewUserDialog
          onClose={() => setNewOpen(false)}
          /* `303183`: Create User closes the dialog, puts the row in the grid
             and opens the ten-tab User Account window on tab 1. The row's
             post-save shape is the spec's: Effective = today, Status = A,
             all three Overrides at `-`. */
          onCreate={(draft) => {
            const row = newUserRow(draft)
            setAdded((a) => [...a, row])
            setNewOpen(false)
            setCur(all.length)
            setEditing(row)
          }}
        />
      )}
      {newOpen && spec.newDialog === 'user-group-detail' && (
        <UserGroupDetailDialog row={{}} onClose={() => setNewOpen(false)} />
      )}

      {editing && spec.editor === 'user-account' && (
        <UserAccountWindow row={editing} onClose={() => setEditing(null)} />
      )}
      {editing && spec.editor === 'security-profile' && (
        <SecurityProfileWindow row={editing} onClose={() => setEditing(null)} />
      )}
      {editing && spec.editor === 'user-group' && (
        <UserGroupDetailDialog row={editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

/** The row `Create User` puts in the grid (spec §6, `a58fd3359aa3` → `c2517d839cff`). */
function newUserRow(draft: NewUserDraft): UserRow {
  return {
    display: newUserDisplayName(draft),
    user: draft.user,
    role: '',
    ovWindow: '0',
    ovFunctions: '0',
    ovReports: '0',
    effective: MOIS_TODAY,
    expiry: '',
    status: 'A',
  }
}

/**
 * The header band's height, scoped to one grid. The kit ties a header's
 * height to `--pb-dw-row-h`, which on User Accounts has to be the 24px detail
 * band rather than the 34px header band, so the two are separated here.
 * (The inactive-row ink rides `pb-um-inactive` from `UM_CSS`.)
 */
function headCss(spec: UserListSpec): string {
  return `.pb-um-grid-${spec.node} .pb-dw__table > thead > tr:not(.pb-dw__filters) > th`
    + ` { height: ${spec.headH}px; padding-top: 0; padding-bottom: 0; }`
}

/* ===========================================================================
   `User Group Detail`                  (from `303203`)

   Navy title bar with a red X; a 25px navy band reading `User Group`; the
   `User Group Information` group; then a grey `User Group Members` band with
   New / Delete right-aligned over a `User Name` / `Note` grid. Footer:
   `Save Changes (F2)` / `Cancel`.
   ======================================================================== */

function UserGroupDetailDialog({ row, onClose }: { row: UserRow; onClose: () => void }) {
  const host = usePBInstrumentation()
  const [cur, setCur] = useState(0)
  /* an existing group opens on its members; a new one opens empty */
  const isNew = !row.name
  const [members, setMembers] = useState<UserRow[]>(isNew ? [] : USER_GROUP_MEMBERS)
  const d = USER_GROUP_DIALOG
  useScreenReport({ dialog: pbSlug(d.title), rows: members.length })

  const memberColumns = umColumns(d.membersColumns)
  const nameCol = memberColumns.find((c) => c.key === 'user')
  if (nameCol) {
    /* a member who is an inactive user renders in #FF0000, with the trailing
       `*` already part of the name as the capture prints it */
    nameCol.render = (r: UserRow) => (
      <span style={r.inactive ? { color: UM_RED } : undefined}>{String(r.user ?? '')}</span>
    )
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 70 }}>
      <style>{UM_CSS}</style>
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(d.title))}>
        <PBWindow
          child
          controls={false}
          className="pb-um-dialog"
          title={d.title}
          onClose={onClose}
          style={{ width: 640, maxWidth: '100%', maxHeight: '100%' }}
        >
          {/* the 25px navy band inside the window reads `User Group` */}
          <div className="pb-viewhead"><span className="pb-viewhead__title">{d.navy}</span></div>

          <div style={{ flex: 'none', background: 'var(--pb-face)', padding: '6px 8px' }}>
            <PBGroup title={d.group}>
              <div className="pb-row" style={{ gap: 10, padding: '1px 0' }}>
                <span className="pb-form__label">Name:</span>
                {/* `db78e3c7…`: an existing group's Name is a grey read-only
                    field in bold. A new group has no captured name prompt in
                    front of it here, so its Name is typed in place. */}
                <PBInput
                  w={260}
                  defaultValue={String(row.name ?? '')}
                  readOnly={!isNew}
                  style={isNew ? { background: UM_FOCUS } : { background: '#e8e8e8', fontWeight: 700 }}
                  data-tutorial-id="host.mois.field.name"
                />
                <span className="pb-form__label">Status:</span>
                <PBCheckbox label="Active" checked tutorialId="host.mois.field.active" />
              </div>
              <div className="pb-row" style={{ gap: 10, padding: '1px 0' }}>
                <span className="pb-form__label">Description:</span>
                {/* focused in the capture — the #FFC09C wash */}
                <PBInput
                  w={380}
                  defaultValue={String(row.desc ?? '')}
                  style={isNew ? undefined : { background: UM_FOCUS }}
                  data-tutorial-id="host.mois.field.description"
                />
              </div>
              <div className="pb-row" style={{ gap: 10, padding: '1px 0', alignItems: 'flex-start' }}>
                <span className="pb-form__label" style={{ lineHeight: '19px' }}>Note:</span>
                <PBTextArea rows={3} w={380} defaultValue={String(row.notes ?? '')} data-tutorial-id="host.mois.field.note" />
              </div>
            </PBGroup>
          </div>

          <PBBand
            right={(
              <BandButtons
                scope="user-group-members"
                labels={d.membersButtons}
                onPress={(b) => {
                  if (b === 'New') { setMembers((m) => [...m, { user: '', note: '' }]); setCur(members.length) }
                  if (b === 'Delete') { setMembers((m) => m.filter((_, i) => i !== cur)); setCur(0) }
                }}
              />
            )}
          >
            {d.membersBand}
          </PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, height: 140 }}>
            <PBDataWindow<UserRow>
              rows={members}
              current={cur}
              onCurrentChange={setCur}
              columns={memberColumns}
              rowTutorialId={(r) => `host.mois.row.member-${pbSlug(String(r.user ?? ''))}`}
              empty=" "
            />
          </div>

          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {d.footer.map((b) => (
              <PBButton
                key={b}
                wide
                data-tutorial-id={host?.anchor('command', pbSlug(b))}
                onClick={() => {
                  host?.report('command', { command: pbSlug(b) })
                  onClose()
                }}
              >
                {b}
              </PBButton>
            ))}
            <span className="pb-footer__spacer" />
          </div>
        </PBWindow>
      </div>
    </div>
  )
}

/* ===========================================================================
   Password Policy                      `3ce40b48cff3`, `4eaa5ed0bf3f`
   ======================================================================== */

function PasswordPolicyView({ onClose }: { onClose?: () => void }) {
  const [editing, setEditing] = useState(false)
  return (
    <>
      <PBViewHeader title={PASSWORD_POLICY_SPEC.header} />
      <PBCommandRow
        commands={USER_COMMANDS.policy.map((label) => ({
          label,
          onClick: label === 'Edit Policy' ? () => setEditing(true) : label === 'Close Window' ? () => onClose?.() : undefined,
        }))}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '6px 10px' }}>
        {PASSWORD_POLICY.map((section) => (
          <div key={section.caption} style={{ paddingBottom: 10 }}>
            <div className="pb-caption" style={{ paddingBottom: 3 }}>{section.caption}</div>
            {section.fields.map((f, i) => <PolicyControl key={i} field={f} />)}
          </div>
        ))}
      </div>
      {editing && <PasswordPolicyDialog onClose={() => setEditing(false)} />}
    </>
  )
}

/* `Password Policy` — the edit dialog Edit Policy raises (`4eaa5ed0bf3f`,
   the right-hand window). Its labels differ from the read-only form's:
   "Require at least one number" (spelt right here), "Allow a password to be
   reused every: N times", "Force passwords to expire", "Days before password
   expires"; footer Apply Changes / Cancel. */
function PasswordPolicyDialog({ onClose }: { onClose: () => void }) {
  const host = usePBInstrumentation()
  useScreenReport({ dialog: 'password-policy' })
  const head = (text: string) => <div style={{ color: '#000080', fontWeight: 700, padding: '6px 6px 4px', borderBottom: '1px solid #b0b0b0' }}>{text}</div>
  const tick = (label: string) => <div style={{ padding: '2px 0 2px 118px' }}><PBCheckbox label={label} /></div>
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 70 }}>
      <PBWindow child controls={false} className="pb-um-dialog" title="Password Policy" onClose={onClose} tutorialId="host.mois.dialog.password-policy" style={{ width: 450 }}>
        <div style={{ background: 'var(--pb-face)', padding: 6 }}>
          <div style={{ border: '1px solid #a0a0a0' }}>
            {head('Structure:')}
            <div style={{ padding: '4px 10px' }}>
              <div className="pb-row" style={{ gap: 10 }}><span style={{ width: 108, textAlign: 'right' }}>Minimum Length:</span><PBInput w={40} align="center" defaultValue="1" /></div>
              {tick('Require at least one capitalized character')}
              {tick('Require at least one number')}
              {tick('Require at least one special character')}
              <div style={{ padding: '2px 0 0 124px' }}>Special Character List:</div>
              <div style={{ paddingLeft: 124 }}><PBInput w={204} defaultValue="!@#$%^&*()" /></div>
            </div>
            {head('Life Cycle:')}
            <div style={{ padding: '4px 10px 10px' }}>
              <div style={{ paddingLeft: 108 }}>Allow a password to be reused every:</div>
              <div className="pb-row" style={{ gap: 6, paddingLeft: 124 }}><PBInput w={40} align="center" defaultValue="1" data-tutorial-id="host.mois.field.reused-every" />times</div>
              <div className="pb-row" style={{ gap: 10, paddingTop: 4 }}><span style={{ width: 108, textAlign: 'right' }}>Expires:</span><PBCheckbox label="Force passwords to expire" tutorialId="host.mois.field.force-passwords-to-expire" /></div>
              <div style={{ paddingLeft: 124 }}>Days before password expires:</div>
              <div style={{ paddingLeft: 124 }}><PBInput w={40} align="center" defaultValue="90" data-tutorial-id="host.mois.field.days-before-password-expires" /></div>
            </div>
          </div>
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          {['Apply Changes', 'Cancel'].map((b) => (
            <PBButton key={b} wide data-tutorial-id={host?.anchor('command', pbSlug(b))} onClick={() => { host?.report('command', { command: pbSlug(b) }); onClose() }}>{b}</PBButton>
          ))}
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
    </div>
  )
}

function PolicyControl({ field }: { field: PolicyField }) {
  if (field.kind === 'check') {
    return (
      <div style={{ padding: '1px 0 1px 14px' }}>
        <PBCheckbox label={field.label} checked={field.checked} tutorialId={`host.mois.field.${pbSlug(field.label)}`} />
      </div>
    )
  }
  if (field.kind === 'labelled-check') {
    return (
      <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
        <span className="pb-form__label" style={{ minWidth: 220 }}>{field.label}</span>
        <PBCheckbox label={field.check} checked={field.checked} tutorialId={`host.mois.field.${pbSlug(field.label)}`} />
      </div>
    )
  }
  return (
    <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
      <span className="pb-form__label" style={{ minWidth: 220 }}>{field.label}</span>
      {/* no capture reads the alignment inside these edits, so they keep the
          kit's default rather than being asserted centred or right */}
      <PBInput
        w={field.w}
        defaultValue={field.value}
        data-tutorial-id={`host.mois.field.${pbSlug(field.label)}`}
      />
    </div>
  )
}
