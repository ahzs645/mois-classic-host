import { useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBGroup, PBInput, PBRadio, PBSelect,
  PBTabs, PBTextArea, PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'
import {
  ASSOCIATED_PROVIDER_COLUMNS, ASSOCIATED_PROVIDER_ROWS, CHANGE_PASSWORD,
  DEFAULT_AUTHOR_FOOTNOTE, DESKTOP_PROVIDERS, EVENT_SUBJECT_DIALOG,
  FORWARDING_RULES, INBOX_FORWARDING_BUTTONS, INBOX_FORWARDING_COLUMNS,
  INBOX_FORWARDING_ROWS, MEMBERSHIP_COLUMNS, MEMBERSHIP_ROWS,
  NEW_USER_BAND, NEW_USER_BUTTONS, NEW_USER_ROWS, NEW_USER_TITLE,
  NOTIFICATION_BLOCKS, NOTIFICATION_DEFAULTS, NOTIFICATION_METHODS, NOTIFICATION_PRIORITIES,
  OTHER_SETTINGS, SERVICE_GROUP_BAND, SERVICE_GROUP_COLUMNS, SERVICE_GROUP_FOOTNOTE,
  SERVICE_GROUP_ROWS, SHARED_WITH_ME_COLUMNS, SHARED_WITH_ME_ROWS, SHARED_WITH_ME_W,
  SHARING_WORKSPACE_COLUMNS, SHARING_WORKSPACE_ROWS,
  SUBSCRIPTION_COLUMNS, SUBSCRIPTION_ROWS,
  UM_FOCUS, USER_ACCOUNT_FOOTER, USER_ACCOUNT_HEADER, USER_ACCOUNT_SIZE, USER_ACCOUNT_TABS,
  USER_ALIAS_COLUMNS, USER_ALIAS_ROWS, USER_EXPERTISE, USER_ROLES,
  WORKSPACE_ACK_ITEMS,
  userListSpec,
  type NewUserField, type OtherField, type OtherSetting, type UserRow,
} from '../data/userManagement'
import type { PBColumn } from '../pb'
import { BandButtons, UMField as Field, UM_CSS, umColumns, umField as anchorField } from './UserManagementKit'
import { ModuleWindowAccessTab } from './UserAccessTabs'
import { SecurityProfilePickerDialog } from './SecurityProfileWindow'
import { useScreenReport } from '../host/screen-state'
import { MOIS_TODAY as MOIS_TODAY_STAMP } from '../data/patients'

/* ============================================================================
   Administration ▸ User Management ▸ User Accounts — the two editors.

     - `New User`     `a58fd3359aa3`, raised by `New Record`
     - `User Account` `42be29fdd885` and the six tab captures around it,
                      974 x 714, raised by `Edit Record` or a double-click

   `303183` is the step list both belong to. It walks New User top to bottom,
   presses `Create User`, and lands in the ten-tab window on tab 1 — which is
   what `onCreate` does here.

   THE TAB STRIP IS THE CAPTURE'S, NOT THE PROSE'S. `42be29fdd885` renders ten
   tabs and spells the sixth `Workspace Mgt`. `302650` writes it out as
   "Workspace Management (CTRL + 6)", and the 2019 six-tab window
   (`537e2f2f5ca3`, `7e01f802a938`) did spell it out — but the ten-tab strip is
   the live one, so the short caption is what is drawn.

   WHAT IS DELIBERATELY NOT BUILT, because no capture exists (spec §8):
     - the user-level `Special Functions` and `Report Access` tabs. `302650`
       punts on them; only the Security Profile versions were captured. Both
       tabs stay in the strip and their pages are left empty.
     - the Add / Edit Membership dialog, the Service Group `Change` dialog,
       the `Change Name` dialog, the `Change History` link target and the
       second step of Add Subscription (method / priority). All five are named
       in `302650`; none is captured, so their buttons raise nothing.
     - the appearance of a freshly-added `Inbox Forwarding` row.
       `7e01f802a938` shows a populated row only.
     - the Reassign-Backlog "are you sure…" confirmation (`303358`).
     - `Acknowledge Backlog` and `Select Users`, which ARE captured
       (`eb5ed396f17d`, `d1654b0c032c`) but belong to the Workspace family
       rather than to this wave's four nodes.
   ========================================================================= */

/* --------------------------------------------------------------------------
   Shared window furniture
   ------------------------------------------------------------------------ */

/**
 * A grid inside a tab page. The measured row-indicator gutters (14px on User
 * Alias, 13px on Inbox Forwarding, 14px on Sharing Workspace) are recorded in
 * `data/userManagement.ts`; the kit paints its own fixed 13px and has no prop
 * for them, so they are not applied here.
 */
function TabGrid({ columns, rows, pitch = 19 }: {
  columns: PBColumn<UserRow>[]
  rows: UserRow[]
  pitch?: number
}) {
  const [cur, setCur] = useState(0)
  return (
    <PBDataWindow<UserRow>
      rows={rows}
      current={cur}
      onCurrentChange={setCur}
      columns={columns}
      style={{ ['--pb-dw-row-h' as string]: `${pitch}px` }}
      empty=" "
    />
  )
}

/* ===========================================================================
   The `New User` dialog                `a58fd3359aa3`

   Fifteen rows in the capture's order. Navy title bar with a red X close box
   at the right; inner group caption `New User`; `Create User` / `Cancel`.
   ======================================================================== */

/**
 * What `Create User` hands back. Only the three name fields are tracked: they
 * are what the new `User Accounts` row is made of, and — while the two
 * `Synchronize with Name Fields` boxes are ticked, which is their default —
 * what MOIS writes `Display Name` and `Signature` from.
 */
export type NewUserDraft = { user: string; first: string; last: string }

const NAME_FIELDS: Record<string, keyof NewUserDraft> = {
  'User Name:': 'user',
  'First Name:': 'first',
  'Last Name:': 'last',
}

/** `303183`: `Full Name - HALLIWELL, ALYSSA (Last name, First name)`. */
export function newUserDisplayName(draft: NewUserDraft): string {
  const name = [draft.last, draft.first].filter(Boolean).join(', ')
  return name.toUpperCase()
}

export function NewUserDialog({ onCreate, onClose }: {
  onCreate: (draft: NewUserDraft) => void
  onClose: () => void
}) {
  const host = usePBInstrumentation()
  const [picker, setPicker] = useState(false)
  const [profiles, setProfiles] = useState<string[]>([])
  const [draft, setDraft] = useState<NewUserDraft>({ user: '', first: '', last: '' })
  useScreenReport({ dialog: pbSlug(NEW_USER_TITLE) })

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <style>{UM_CSS}</style>
      {/* PBWindow does not forward attributes, so the window's anchor rides a
          wrapper that shrink-wraps the frame rather than the whole layer */}
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(NEW_USER_TITLE))}>
        <PBWindow
          child
          controls={false}
          className="pb-um-dialog"
          title={NEW_USER_TITLE}
          onClose={onClose}
          style={{ width: 620, maxWidth: '100%', maxHeight: '100%' }}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)', padding: '6px 8px' }}>
            <PBGroup title={NEW_USER_BAND}>
              {NEW_USER_ROWS.map((row, i) => (
                <div key={i} className="pb-row" style={{ gap: 10, padding: '2px 0', flexWrap: 'wrap' }}>
                  {row.map((f, j) => (
                    <NewUserControl
                      key={j}
                      field={f}
                      draft={draft}
                      onDraft={setDraft}
                      profiles={profiles}
                      onChangeProfiles={() => setPicker(true)}
                    />
                  ))}
                </div>
              ))}
            </PBGroup>
          </div>

          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {NEW_USER_BUTTONS.map((b) => (
              <PBButton
                key={b}
                wide
                data-tutorial-id={host?.anchor('command', pbSlug(b))}
                onClick={() => {
                  host?.report('command', { command: pbSlug(b) })
                  if (b === 'Create User') onCreate(draft)
                  else onClose()
                }}
              >
                {b}
              </PBButton>
            ))}
            <span className="pb-footer__spacer" />
          </div>
        </PBWindow>
      </div>

      {picker && (
        <SecurityProfilePickerDialog
          selected={profiles}
          onApply={(next) => { setProfiles(next); setPicker(false) }}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  )
}

/** The required-entry marker the `* Required Entry` footnote explains. */
const Star = () => <span style={{ paddingLeft: 2 }}>*</span>

function NewUserControl({ field, draft, onDraft, profiles, onChangeProfiles }: {
  field: NewUserField
  draft: NewUserDraft
  onDraft: (next: NewUserDraft) => void
  profiles: string[]
  onChangeProfiles: () => void
}) {
  const host = usePBInstrumentation()

  if (field.kind === 'note') {
    return <span style={{ paddingTop: 2 }}>{field.text}</span>
  }

  if (field.kind === 'sync') {
    /* the edit is disabled and grey while the tick box is on: MOIS writes it
       from the name fields. The anchor rides the INPUT, never a wrapper —
       `clickAnchor` calls .click() on whatever carries it, and a click on a
       wrapping span never reaches the box inside. */
    return (
      <span className="pb-row" style={{ gap: 6 }}>
        <span className="pb-form__label">{field.label}</span>
        <PBInput w={field.w} disabled value={newUserDisplayName(draft)} readOnly />
        <PBCheckbox
          label="Synchronize with Name Fields"
          checked
          tutorialId={`host.mois.field.sync-${pbSlug(field.label)}`}
        />
      </span>
    )
  }

  if (field.kind === 'check') {
    return (
      <span className="pb-row" style={{ gap: 6 }}>
        <span className="pb-form__label">{field.label}</span>
        <PBCheckbox
          label={field.check}
          checked={field.checked}
          tutorialId={anchorField(field.label)}
        />
      </span>
    )
  }

  if (field.kind === 'profiles') {
    return (
      <span className="pb-row" style={{ gap: 6, alignItems: 'flex-start' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>{field.label}</span>
        <PBTextArea
          rows={3}
          w={field.w}
          readOnly
          value={profiles.join('\n')}
          data-tutorial-id={anchorField(field.label)}
        />
        {field.required && <Star />}
        <PBButton
          data-tutorial-id={host?.anchor('command', 'security-profiles-change')}
          onClick={onChangeProfiles}
        >
          Change
        </PBButton>
      </span>
    )
  }

  if (field.kind === 'drop') {
    return (
      <span className="pb-row" style={{ gap: 6 }}>
        <span className="pb-form__label">{field.label}</span>
        <PBSelect w={field.w} options={field.options} data-tutorial-id={anchorField(field.label)} />
        {field.required && <Star />}
      </span>
    )
  }

  if (field.kind === 'password') {
    return (
      <span className="pb-row" style={{ gap: 6 }}>
        <span className="pb-form__label">{field.label}</span>
        <PBInput type="password" w={field.w} data-tutorial-id={anchorField(field.label)} />
      </span>
    )
  }

  if (field.kind === 'hint') {
    return (
      <span className="pb-row" style={{ gap: 6 }}>
        <span className="pb-form__label">{field.label}</span>
        <PBInput w={field.w} data-tutorial-id={anchorField(field.label)} />
        <span>{field.hint}</span>
      </span>
    )
  }

  const bound = NAME_FIELDS[field.label]
  return (
    <span className="pb-row" style={{ gap: 6 }}>
      <span className="pb-form__label">{field.label}</span>
      <PBInput
        w={field.w}
        {...(bound
          ? { value: draft[bound], onChange: (e) => onDraft({ ...draft, [bound]: e.target.value }) }
          : { defaultValue: field.value })}
        data-tutorial-id={anchorField(field.label)}
        /* the focused edit takes MOIS's #FFC09C wash */
        style={field.focus ? { background: UM_FOCUS } : undefined}
      />
      {field.required && <Star />}
    </span>
  )
}

/* ===========================================================================
   The `User Account` window            974 x 714
   ======================================================================== */

export function UserAccountWindow({ row, onClose }: { row: UserRow; onClose: () => void }) {
  const host = usePBInstrumentation()
  const [tab, setTab] = useState(USER_ACCOUNT_TABS[0]!)
  useScreenReport({ dialog: 'user-account' })

  const display = String(row.display ?? '')
  const [last = '', first = ''] = display.split(',').map((s) => s.trim())
  const seed: Record<string, string> = {
    user: String(row.user ?? ''),
    first,
    last,
    prefix: '',
    middle: '',
    suffix: '',
    display,
    signature: display,
    initials: `${first.slice(0, 1)}${last.slice(0, 1)}`,
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60 }}>
      <style>{UM_CSS}</style>
      <div data-tutorial-id={host?.anchor('dialog', 'user-account')}>
        <PBWindow
          child
          controls={false}
          className="pb-um-dialog"
          title="User Account"
          onClose={onClose}
          style={{
            width: USER_ACCOUNT_SIZE.w,
            height: USER_ACCOUNT_SIZE.h,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {/* the fixed block above the strip: three columns, then Change Name */}
          <div
            className="pb-row"
            style={{ alignItems: 'flex-start', gap: 14, padding: '5px 8px', background: 'var(--pb-face)', flex: 'none' }}
          >
            {USER_ACCOUNT_HEADER.map((col, i) => (
              <div key={i}>
                {col.map((f) => (
                  <Field key={f.key} label={f.label} w={f.label.length > 10 ? 86 : 74}>
                    <PBInput w={f.w} defaultValue={seed[f.key]} data-tutorial-id={anchorField(f.label)} />
                  </Field>
                ))}
              </div>
            ))}
            <span className="pb-row__spacer" />
            {/* `302650` names the dialog behind this; it is never captured */}
            <PBButton data-tutorial-id={host?.anchor('command', 'change-name')}>Change Name</PBButton>
          </div>

          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PBTabs tabs={USER_ACCOUNT_TABS} active={tab} onChange={setTab} compact>
              <UserAccountPage key={tab} tab={tab} row={row} />
            </PBTabs>
          </div>

          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {USER_ACCOUNT_FOOTER.map((b) => (
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

function UserAccountPage({ tab, row }: { tab: string; row: UserRow }) {
  switch (tab) {
    case 'User Account': return <UserAccountTab row={row} />
    case 'Module / Window Access': return <ModuleWindowAccessTab override />
    /* Tabs 3 and 4 are real — they are in the capture's strip — but only the
       SECURITY PROFILE versions of them were ever captured (`e361c4e01d11`,
       `9e179125c6d6`), and `302650` explicitly refuses to describe the user
       level ("Refer to the corresponding title in the Security Profile
       section above"). The user-level panes must carry an Override column by
       analogy with `1e9141017547`, but no capture proves it — so nothing is
       drawn here rather than something invented. */
    case 'Special Functions': return <UncapturedPage />
    case 'Report Access': return <UncapturedPage />
    case 'User Alias': return <UserAliasTab />
    case 'Workspace Mgt': return <WorkspaceMgtTab row={row} />
    case 'Memberships': return <MembershipsTab />
    case 'Service Group': return <ServiceGroupTab />
    case 'Subscription': return <SubscriptionTab />
    case 'Other': return <OtherTab />
    default: return <UncapturedPage />
  }
}

const UncapturedPage = () => <div style={{ flex: '1 1 auto' }} />

/* --- tab 1: `User Account` ------------------------------------------------
   `42be29fdd885`. The spec's prose says "four group boxes" and then names
   six; six are captured and six are drawn.                                 */

function UserAccountTab({ row }: { row: UserRow }) {
  const host = usePBInstrumentation()
  const [changePw, setChangePw] = useState(false)
  const [picker, setPicker] = useState(false)
  /* the account's own profile (its Role on the grid), and its own status:
     an inactive (I) account opens with Active unticked (303186) */
  const [profiles, setProfiles] = useState<string[]>([String(row.role || 'MOA')])
  const [active, setActive] = useState(row.status !== 'I')
  const [toggledActive, setToggledActive] = useState(false)
  useScreenReport(toggledActive ? { cell: 'active', checked: active } : {})

  return (
    <>
      <PBBand>User Account</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '4px 6px' }}>
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <PBGroup title="Account Settings">
              <div className="pb-row" style={{ gap: 6 }}>
                <span className="pb-form__label" style={{ minWidth: 118 }}>User Name:</span>
                {/* greyed and filled in `42be29fdd885`: changed only through Change */}
                <PBInput w={150} value={String(row.user ?? '')} readOnly style={{ background: '#e8e8e8' }} data-tutorial-id={anchorField('User Name')} />
                <PBButton size="sm" data-tutorial-id={host?.anchor('command', 'user-name-change')}>Change</PBButton>
                {/* `302650` names this link; its target is never captured */}
                <button type="button" className="pb-link">Change History</button>
              </div>
              <Field label="Mobile Phone:"><PBInput w={130} data-tutorial-id={anchorField('Mobile Phone')} /></Field>
              <Field label="Email:"><PBInput w={220} data-tutorial-id={anchorField('Email')} /></Field>
              <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
                <span className="pb-form__label" style={{ minWidth: 118 }}>Effective Date:</span>
                <PBInput w={92} align="center" defaultValue={String(row.effective ?? '')} data-tutorial-id={anchorField('Effective Date')} />
                <span className="pb-form__label">Expiry Date:</span>
                <PBInput w={92} align="center" defaultValue={String(row.expiry ?? '')} data-tutorial-id={anchorField('Expiry Date')} />
                {/* `303186`: unticking this is what deactivates the account */}
                <span className="pb-form__label">Active:</span>
                <PBCheckbox checked={active} onChange={(v) => { setActive(v); setToggledActive(true) }} tutorialId={anchorField('Active')} />
              </div>
              <Field label="Role:"><PBSelect w={180} options={USER_ROLES} data-tutorial-id={anchorField('Role')} /></Field>
              <Field label="Expertise:"><PBSelect w={180} options={USER_EXPERTISE} data-tutorial-id={anchorField('Expertise')} /></Field>
            </PBGroup>

            <PBGroup title="Password Settings" style={{ marginTop: 6 }}>
              <Field label="Effective Date:"><PBInput w={92} align="center" /></Field>
              <Field label="Expiry Date:"><PBInput w={92} align="center" /></Field>
              <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
                <span className="pb-form__label" style={{ minWidth: 118 }}>Password:</span>
                <PBInput type="password" w={150} defaultValue="********" />
                <PBButton
                  size="sm"
                  data-tutorial-id={host?.anchor('command', 'password-change')}
                  onClick={() => setChangePw(true)}
                >
                  Change
                </PBButton>
              </div>
            </PBGroup>

            <PBGroup title="Security Profiles" style={{ marginTop: 6 }}>
              <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start' }}>
                <PBTextArea
                  rows={3}
                  w={260}
                  readOnly
                  value={profiles.join('\n')}
                  data-tutorial-id={anchorField('Security Profiles')}
                />
                <PBButton
                  data-tutorial-id={host?.anchor('command', 'security-profiles-change')}
                  onClick={() => setPicker(true)}
                >
                  Change
                </PBButton>
              </div>
            </PBGroup>

            <PBGroup title="Other Settings" style={{ marginTop: 6 }}>
              <Field label="Default Desktop Provider:" w={150}>
                <PBSelect w={200} options={DESKTOP_PROVIDERS} data-tutorial-id={anchorField('Default Desktop Provider')} />
              </Field>
              <Field label="Default Author*:" w={150}>
                <PBSelect w={200} options={DESKTOP_PROVIDERS} data-tutorial-id={anchorField('Default Author')} />
              </Field>
              <div style={{ paddingTop: 2 }}>{DEFAULT_AUTHOR_FOOTNOTE}</div>
            </PBGroup>
          </div>

          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <PBGroup title="Notification Service Settings">
              {NOTIFICATION_BLOCKS.map((block) => (
                <div key={block} style={{ paddingBottom: 4 }}>
                  <div className="pb-caption">{block}</div>
                  <PBCheckbox label="Notification on Shutdown" />
                  {NOTIFICATION_PRIORITIES.map((p, i) => (
                    <div key={p} className="pb-row" style={{ gap: 10, padding: '1px 0' }}>
                      <span className="pb-form__label" style={{ minWidth: 60 }}>{p}</span>
                      {NOTIFICATION_METHODS.map((m) => (
                        <PBRadio
                          key={m}
                          name={`notify-${pbSlug(block)}-${i}`}
                          label={m}
                          checked={m === NOTIFICATION_DEFAULTS[i]}
                          onChange={() => {}}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </PBGroup>

            <PBGroup title="Workspace Settings" style={{ marginTop: 6 }}>
              <div className="pb-caption">Do not ask user to acknowledge manual entry of:</div>
              {WORKSPACE_ACK_ITEMS.map((item) => (
                <PBCheckbox key={item} label={item} tutorialId={`host.mois.field.ack-${pbSlug(item)}`} />
              ))}
            </PBGroup>
          </div>
        </div>
      </div>

      {changePw && <ChangePasswordDialog onClose={() => setChangePw(false)} />}
      {picker && (
        <SecurityProfilePickerDialog
          selected={profiles}
          onApply={(next) => { setProfiles(next); setPicker(false) }}
          onClose={() => setPicker(false)}
        />
      )}
    </>
  )
}

/* --- tab 5: `User Alias` ------------------------------------------------- */

function UserAliasTab() {
  /* New adds a row dated today for the learner to fill in (303351: Code NHA,
     Value the MSP number, Note NHA CIX Labs); Delete removes the last one */
  const [rows, setRows] = useState<UserRow[]>(USER_ALIAS_ROWS)
  useScreenReport({ rows: rows.length })
  return (
    <>
      <PBBand
        right={(
          <BandButtons
            scope="user-alias"
            labels={['New', 'Delete']}
            onPress={(b) => setRows((r) => (b === 'New'
              ? [...r, { start: MOIS_TODAY_STAMP, end: '', source: '', value: '', note: '' }]
              : r.slice(0, -1)))}
          />
        )}
      >
        User Alias List
      </PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <TabGrid columns={umColumns(USER_ALIAS_COLUMNS)} rows={rows} />
      </div>
    </>
  )
}

/* --- tab 6: `Workspace Mgt` ----------------------------------------------
   `c4c90b65d9f8`, `7e01f802a938`: a tall Inbox Forwarding pane across the
   top, and under it `Sharing Workspace With` (left) beside the read-only
   `Workspaces Shared With Me` panel (right).
   Acknowledge Backlog raises `Acknowledge Backlog` (`eb5ed396f17d`, 303356);
   Reassign Backlog raises `Select Users` (`d1654b0c032c`, 303358).        */

function WorkspaceMgtTab({ row }: { row: UserRow }) {
  const [backlog, setBacklog] = useState<null | 'acknowledge' | 'reassign'>(null)
  const forwarding = umColumns(INBOX_FORWARDING_COLUMNS)
  const ruleCol = forwarding.find((c) => c.key === 'rule')
  if (ruleCol) {
    /* the Rule cell holds an in-grid radio pair, not text */
    ruleCol.render = (r: UserRow, i: number) => (
      <span className="pb-row" style={{ gap: 8, justifyContent: 'center' }}>
        {FORWARDING_RULES.map((v) => (
          <PBRadio key={v} name={`fwd-${i}`} label={v} checked={r.rule === v} onChange={() => {}} />
        ))}
      </span>
    )
  }

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PBBand
        right={(
          <BandButtons
            scope="inbox-forwarding"
            labels={INBOX_FORWARDING_BUTTONS}
            onPress={(b) => {
              if (b === 'Acknowledge Backlog') setBacklog('acknowledge')
              if (b === 'Reassign Backlog') setBacklog('reassign')
            }}
          />
        )}
      >
        Inbox Forwarding
      </PBBand>
      <div style={{ flex: '1 1 55%', minHeight: 60, display: 'flex', padding: 3 }}>
        <TabGrid columns={forwarding} rows={INBOX_FORWARDING_ROWS} />
      </div>

      <div className="pb-row" style={{ flex: '1 1 45%', minHeight: 0, alignItems: 'stretch', gap: 8, padding: 3 }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand right={<BandButtons scope="sharing-workspace" labels={['New', 'Delete']} />}>
            Sharing Workspace With
          </PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <TabGrid columns={umColumns(SHARING_WORKSPACE_COLUMNS)} rows={SHARING_WORKSPACE_ROWS} />
          </div>
        </div>
        {/* read-only panel, 368px wide, with a #C8DCFA caption bar of its
            own; an empty stop date renders as `--` */}
        <div style={{ width: SHARED_WITH_ME_W, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <div className="pb-band" style={{ background: '#c8dcfa' }}>Workspaces Shared With Me</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <TabGrid columns={umColumns(SHARED_WITH_ME_COLUMNS)} rows={SHARED_WITH_ME_ROWS} />
          </div>
        </div>
      </div>

      {backlog === 'acknowledge' && <AcknowledgeBacklogDialog who={String(row.display ?? '')} onClose={() => setBacklog(null)} />}
      {backlog === 'reassign' && <SelectUsersDialog onClose={() => setBacklog(null)} />}
    </div>
  )
}

/* `Acknowledge Backlog`, `eb5ed396f17d` (303356): a Date Range from
   0000.00.00 (the focused, washed edit) to today "(inclusive)", a Reason
   memo, then a `Basket Summary <user>` band over Include / Item / To
   Acknowledge with every basket ticked, the total under them, and Ok /
   Cancel. The counts are the capture's. */
const BACKLOG_ITEMS: [string, number][] = [
  ['Measures', 20], ['Imaging', 10], ['Consults', 10], ['Procedures', 10],
  ['Documents', 10], ['Facility Admissions', 6], ['Progress Notes', 10], ['Orders', 10],
]

function AcknowledgeBacklogDialog({ who, onClose }: { who: string; onClose: () => void }) {
  const host = usePBInstrumentation()
  const [include, setInclude] = useState(() => BACKLOG_ITEMS.map(() => true))
  useScreenReport({ dialog: 'acknowledge-backlog' })
  const total = BACKLOG_ITEMS.reduce((sum, [, n], i) => sum + (include[i] ? n : 0), 0)
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
      <PBWindow child controls={false} className="pb-um-dialog" title="Acknowledge Backlog" onClose={onClose} tutorialId="host.mois.dialog.acknowledge-backlog" style={{ width: 690 }}>
        <div style={{ background: 'var(--pb-face)', padding: '8px 18px' }}>
          <div style={{ border: '1px solid #a0a0a0', background: '#fff' }}>
            <div style={{ padding: '8px 10px' }}>
              <div className="pb-row" style={{ gap: 8 }}>
                <span style={{ width: 80 }}>Date Range:</span>
                <PBInput w={90} defaultValue="0000.00.00" style={{ background: UM_FOCUS }} />
                <span>to</span>
                <PBInput w={90} defaultValue={MOIS_TODAY_STAMP} />
                <span>(inclusive)</span>
              </div>
              <div className="pb-row" style={{ gap: 8, paddingTop: 4, alignItems: 'flex-start' }}>
                <span style={{ width: 80 }}>Reason:</span>
                <PBTextArea rows={3} w={540} data-tutorial-id="host.mois.field.reason" />
              </div>
            </div>
            <div style={{ background: '#c8dcfa', fontWeight: 700, padding: '8px 12px' }}>Basket Summary {who}</div>
            <div className="pb-row" style={{ gap: 0, padding: '6px 6px 2px', alignItems: 'flex-end', fontWeight: 700 }}>
              <span style={{ width: 70 }}>Include</span><span style={{ width: 240 }}>Item</span>
              <span style={{ width: 96, textAlign: 'right' }}>To<br />Acknowledge</span>
            </div>
            {BACKLOG_ITEMS.map(([item, n], i) => (
              <div key={item} className="pb-row" style={{ gap: 0, padding: '3px 6px', background: i % 2 ? '#fff' : '#f0f0f0' }}>
                <span style={{ width: 70, paddingLeft: 24 }}>
                  <PBCheckbox checked={include[i]} onChange={(v) => setInclude((c) => c.map((x, j) => (j === i ? v : x)))} />
                </span>
                <span style={{ width: 240 }}>{item}</span>
                <span style={{ width: 96, textAlign: 'right' }}>{n}</span>
              </div>
            ))}
            <div className="pb-row" style={{ gap: 0, padding: '6px 6px', borderTop: '1px solid #404040', fontWeight: 700 }}>
              <span style={{ width: 310 }} /><span style={{ width: 96, textAlign: 'right' }}>{total}</span>
            </div>
          </div>
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          {['Ok', 'Cancel'].map((b) => (
            <PBButton key={b} wide data-tutorial-id={host?.anchor('command', `backlog-${pbSlug(b)}`)} onClick={() => { host?.report('command', { command: `backlog-${pbSlug(b)}` }); onClose() }}>{b}</PBButton>
          ))}
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
    </div>
  )
}

/* `Select Users`, `d1654b0c032c` (303358): a `User Accounts` band over
   Select / Full Name / User Name, and Ok / Cancel. 303358: tick the user the
   backlog goes to, press Ok, and confirm — the confirmation is not captured,
   so Ok closes the window. */
function SelectUsersDialog({ onClose }: { onClose: () => void }) {
  const host = usePBInstrumentation()
  const users = userListSpec('ad-users')?.rows.filter((r) => r.status !== 'I') ?? []
  const [picked, setPicked] = useState<Set<string>>(new Set())
  useScreenReport({ dialog: 'select-users', rows: picked.size })
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
      <PBWindow child controls={false} className="pb-um-dialog" title="Select Users" onClose={onClose} tutorialId="host.mois.dialog.select-users" style={{ width: 430 }}>
        <div style={{ background: 'var(--pb-face)', padding: '8px 20px' }}>
          <div className="pb-band" style={{ background: '#dcd7d2', fontWeight: 700 }}>User Accounts</div>
          <div style={{ height: 300, display: 'flex', background: '#fff' }}>
            <PBDataWindow<UserRow>
              rows={users}
              gutter={false}
              rowTutorialId={(r) => `host.mois.row.select-user-${pbSlug(String(r.user ?? ''))}`}
              columns={[
                {
                  key: 'select', header: 'Select', width: 52, align: 'center',
                  render: (r) => (
                    <PBCheckbox
                      checked={picked.has(String(r.user))}
                      onChange={(v) => setPicked((p) => { const n = new Set(p); v ? n.add(String(r.user)) : n.delete(String(r.user)); return n })}
                      tutorialId={`host.mois.cell.select-${pbSlug(String(r.user ?? ''))}`}
                    />
                  ),
                },
                { key: 'display', header: 'Full Name', width: 190 },
                { key: 'user', header: 'User Name', width: 110 },
              ]}
            />
          </div>
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          {['Ok', 'Cancel'].map((b) => (
            <PBButton key={b} wide data-tutorial-id={host?.anchor('command', `select-users-${pbSlug(b)}`)} onClick={() => { host?.report('command', { command: `select-users-${pbSlug(b)}` }); onClose() }}>{b}</PBButton>
          ))}
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
    </div>
  )
}

/* --- tab 7: `Memberships` ------------------------------------------------ */

function MembershipsTab() {
  const host = usePBInstrumentation()

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 10, padding: '4px 6px', flex: 'none' }}>
        <PBGroup title="Other Settings">
          <Field label="Default Desktop Provider:" w={150}><PBSelect w={200} options={DESKTOP_PROVIDERS} /></Field>
          <Field label="Default Author*:" w={150}><PBSelect w={200} options={DESKTOP_PROVIDERS} /></Field>
          <div style={{ paddingTop: 2 }}>{DEFAULT_AUTHOR_FOOTNOTE}</div>
        </PBGroup>
        <div style={{ flex: '1 1 0', minWidth: 0, height: 96, display: 'flex' }}>
          <TabGrid columns={umColumns(ASSOCIATED_PROVIDER_COLUMNS)} rows={ASSOCIATED_PROVIDER_ROWS} />
        </div>
      </div>

      <PBBand right={<BandButtons scope="membership" labels={['Add']} />}>Membership List</PBBand>
      {/* no gridlines, and a 29px header band — see `UM_CSS` */}
      <div className="pb-um-head29" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow<UserRow>
          rows={MEMBERSHIP_ROWS}
          rules={false}
          columns={[
            ...umColumns(MEMBERSHIP_COLUMNS),
            {
              key: 'actions',
              header: '',
              width: 110,
              render: (r: UserRow) => (
                <span className="pb-row" style={{ gap: 4 }}>
                  <PBButton
                    size="sm"
                    data-tutorial-id={host?.anchor('command', `membership-edit-${pbSlug(String(r.name ?? ''))}`)}
                  >
                    Edit
                  </PBButton>
                  <PBButton size="sm">Delete</PBButton>
                </span>
              ),
            },
          ]}
          rowTutorialId={(r) => `host.mois.row.membership-${pbSlug(String(r.name ?? ''))}`}
          empty=" "
        />
      </div>
    </div>
  )
}

/* --- tab 8: `Service Group` ---------------------------------------------- */

function ServiceGroupTab() {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PBBand right={<BandButtons scope="service-group" labels={['Change']} />}>{SERVICE_GROUP_BAND}</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <TabGrid columns={umColumns(SERVICE_GROUP_COLUMNS)} rows={SERVICE_GROUP_ROWS} />
      </div>
      {/* sic: "all user have access" */}
      <div style={{ flex: 'none', padding: '2px 8px 4px', textAlign: 'right' }}>{SERVICE_GROUP_FOOTNOTE}</div>
    </div>
  )
}

/* --- tab 9: `Subscription` -----------------------------------------------
   The header row doubles as the toolbar — `Add` sits IN it — and every row
   carries its own Edit / Delete. The Subject cell renders a secondary grey
   qualifier beside the value.                                              */

function SubscriptionTab() {
  const host = usePBInstrumentation()
  const [cur, setCur] = useState(0)
  const [pick, setPick] = useState(false)

  const columns = umColumns(SUBSCRIPTION_COLUMNS)
  const subject = columns.find((c) => c.key === 'subject')
  if (subject) {
    subject.render = (r: UserRow) => (
      <>
        {String(r.subject ?? '')}
        {r.qualifier ? <span style={{ color: '#808080' }}>{`  ${r.qualifier}`}</span> : null}
      </>
    )
  }

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
      <PBDataWindow<UserRow>
        rows={SUBSCRIPTION_ROWS}
        current={cur}
        onCurrentChange={setCur}
        rowTutorialId={(r) => `host.mois.row.subscription-${pbSlug(String(r.event ?? ''))}`}
        columns={[
          ...columns,
          {
            key: 'actions',
            /* `Add` really does live in the header row on this tab */
            header: (
              <PBButton
                size="sm"
                data-tutorial-id={host?.anchor('command', 'subscription-add')}
                onClick={() => setPick(true)}
              >
                Add
              </PBButton>
            ),
            width: 116,
            render: (r: UserRow) => (
              <span className="pb-row" style={{ gap: 4 }}>
                <PBButton
                  size="sm"
                  data-tutorial-id={host?.anchor('command', `subscription-edit-${pbSlug(String(r.event ?? ''))}`)}
                >
                  Edit
                </PBButton>
                <PBButton size="sm">Delete</PBButton>
              </span>
            ),
          },
        ]}
        empty=" "
      />

      {pick && <EventSubjectSelectionDialog onClose={() => setPick(false)} />}
    </div>
  )
}

/** `810d5deb21a8`. The `Select...` button is disabled in the capture. */
function EventSubjectSelectionDialog({ onClose }: { onClose: () => void }) {
  const host = usePBInstrumentation()
  const [cur, setCur] = useState(0)
  const d = EVENT_SUBJECT_DIALOG
  useScreenReport({ dialog: pbSlug(d.title) })

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(d.title))}>
        <PBWindow child controls={false} className="pb-um-dialog" title={d.title} onClose={onClose} style={{ width: 520 }}>
          <div style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)', padding: '6px 8px' }}>
            <PBGroup title={d.group}>
              <div style={{ height: 130, display: 'flex' }}>
                <PBDataWindow<UserRow>
                  rows={d.rows}
                  current={cur}
                  onCurrentChange={setCur}
                  columns={umColumns(d.columns)}
                  rowTutorialId={(r) => `host.mois.row.event-${pbSlug(String(r.event ?? ''))}`}
                />
              </div>
            </PBGroup>
            <PBGroup title={d.subjectCaption} style={{ marginTop: 6 }}>
              <div className="pb-row" style={{ gap: 6 }}>
                {/* the read-only edit shows the literal `<select>` */}
                <PBInput w={260} value={d.subjectPlaceholder} readOnly />
                {/* disabled in the capture, face #CCCCCC */}
                <PBButton disabled>Select...</PBButton>
              </div>
            </PBGroup>
          </div>
          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {d.buttons.map((b) => (
              <PBButton key={b} wide data-tutorial-id={host?.anchor('command', pbSlug(b))} onClick={onClose}>
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

/* --- tab 10: `Other` ----------------------------------------------------- */

function OtherTab() {
  const [cur, setCur] = useState(0)
  const setting: OtherSetting = OTHER_SETTINGS[cur] ?? OTHER_SETTINGS[0]!

  return (
    <div className="pb-row" style={{ alignItems: 'stretch', gap: 3, flex: '1 1 auto', minHeight: 0, padding: 3 }}>
      <div style={{ width: 200, flex: 'none', display: 'flex' }}>
        <PBDataWindow<{ name: string }>
          rows={OTHER_SETTINGS.map((s) => ({ name: s.name }))}
          current={cur}
          onCurrentChange={setCur}
          columns={[{ key: 'name', header: 'Setting', headAlign: 'left' }]}
          rowTutorialId={(r) => `host.mois.row.setting-${pbSlug(r.name)}`}
        />
      </div>
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-window)' }}>
        <div className="pb-band" style={{ background: '#c8dcfa' }}>{setting.name}</div>
        {setting.desc && (
          <div style={{ padding: '4px 8px', whiteSpace: 'normal' }}>{setting.desc}</div>
        )}
        <div style={{ padding: '2px 8px' }}>
          {setting.fields.map((f, i) => <OtherControl key={i} field={f} />)}
        </div>
      </div>
    </div>
  )
}

function OtherControl({ field }: { field: OtherField }) {
  if (field.kind === 'sub') {
    return (
      <div style={{ padding: '2px 0' }}>
        <div className="pb-form__label">{field.label}</div>
        <div style={{ paddingLeft: 14 }}>
          {field.fields.map((f, i) => <OtherControl key={i} field={f} />)}
        </div>
      </div>
    )
  }
  if (field.kind === 'radios') {
    return (
      <div className="pb-row" style={{ gap: 12, padding: '1px 0' }}>
        <span className="pb-form__label" style={{ minWidth: 140 }}>{field.label}</span>
        {/* neither option is selected in the Voice Service capture */}
        {field.options.map((o) => (
          <PBRadio key={o} name={`other-${pbSlug(field.label)}`} label={o} checked={o === field.value} onChange={() => {}} />
        ))}
      </div>
    )
  }
  if (field.kind === 'drop') {
    return (
      <Field label={field.label} w={150}>
        <PBSelect w={field.w} options={field.options} defaultValue={field.value} disabled={field.disabled} />
      </Field>
    )
  }
  return (
    <Field label={field.label} w={150}>
      <PBInput w={field.w} defaultValue={field.value} />
    </Field>
  )
}

/* ===========================================================================
   `Change Password`                    `537e2f2f5ca3`
   (User Account ▸ Password Settings ▸ Change; `303188` is its step list.)
   ======================================================================== */

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const host = usePBInstrumentation()
  useScreenReport({ dialog: pbSlug(CHANGE_PASSWORD.title) })
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(CHANGE_PASSWORD.title))}>
        <PBWindow
          child
          controls={false}
          className="pb-um-dialog"
          title={CHANGE_PASSWORD.title}
          onClose={onClose}
          style={{ width: 420 }}
        >
          <div style={{ flex: '1 1 auto', background: 'var(--pb-face)', padding: '8px 10px' }}>
            <Field label="Current User:"><PBInput w={180} readOnly /></Field>
            <Field label="New Password:">
              {/* focused in the capture — the #FFC09C wash */}
              <PBInput type="password" w={180} style={{ background: UM_FOCUS }} data-tutorial-id={anchorField('New Password')} />
            </Field>
            <Field label="Confirm Password:">
              <PBInput type="password" w={180} data-tutorial-id={anchorField('Confirm Password')} />
            </Field>
            <div style={{ paddingTop: 4 }}>
              {/* unchecked here, where the New User dialog's is checked */}
              <PBCheckbox label={CHANGE_PASSWORD.reset} tutorialId="host.mois.field.reset-pswrd" />
            </div>
          </div>
          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {CHANGE_PASSWORD.buttons.map((b) => (
              <PBButton key={b} wide data-tutorial-id={host?.anchor('command', pbSlug(b))} onClick={onClose}>
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
