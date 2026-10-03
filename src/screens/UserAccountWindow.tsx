import { useUserAccounts, useProviderRoster, accountSettingsKey, initialAccountSettings, accountOutcomes, type AccountSettings } from '../data/user-account-session'
import { useSessionState } from '../host/screen-windows'
import { CellSelect, CellText } from './adminKit'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { UserAgreementResponses } from './UserAgreementWindows'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBGroup, PBGroupBox, PBInput, PBMessageBox, PBRadio, PBSelect,
  PBTabs, PBTextArea, pbSlug, usePBInstrumentation,
} from '../pb'
import {
  ASSOCIATED_PROVIDER_COLUMNS, ASSOCIATED_PROVIDER_ROWS, CHANGE_NAME, CHANGE_PASSWORD,
  DEFAULT_AUTHOR_FOOTNOTE, DESKTOP_PROVIDERS, EVENT_SUBJECT_DIALOG,
  FORWARDING_RULES, INBOX_FORWARDING_BUTTONS, INBOX_FORWARDING_COLUMNS,
  INBOX_FORWARDING_ROWS, MEMBERSHIP_COLUMNS, MEMBERSHIP_ROWS,
  NEW_USER_BAND, NEW_USER_BUTTONS, NEW_USER_MASK, NEW_USER_SECTIONS, NEW_USER_SIZE, NEW_USER_SYNC_X, NEW_USER_TITLE,
  NOTIFICATION_BLOCKS, NOTIFICATION_DEFAULTS, NOTIFICATION_METHODS, NOTIFICATION_PRIORITIES,
  OTHER_SETTINGS, SERVICE_GROUP_BAND, SERVICE_GROUP_COLUMNS, SERVICE_GROUP_FOOTNOTE,
  SERVICE_GROUP_ROWS, SHARED_WITH_ME_PANEL_COLUMNS, SHARED_WITH_ME_ROWS,
  SHARING_WORKSPACE_COLUMNS,
  SUBSCRIPTION_COLUMNS, SUBSCRIPTION_ROWS,
  UM_FOCUS, USER_ACCOUNT_FOOTER, USER_ACCOUNT_HEADER, USER_ACCOUNT_HEADER_GEOMETRY, USER_ACCOUNT_PANEL,
  USER_ACCOUNT_FOOT, USER_ACCOUNT_SIZE, USER_ACCOUNT_TAB_WIDTHS, USER_ACCOUNT_TABS,
  USER_ALIAS_COLUMNS, USER_EXPERTISE, USER_ROLES,
  WORKSPACE_ACK_ITEMS, WORKSPACE_MGT_GEOMETRY,
  userListSpec,
  type NewUserField, type OtherField, type OtherSetting, type UserRow,
} from '../data/userManagement'
import type { PBColumn } from '../pb'
import { BandButtons, UMField as Field, UM_CSS, umColumns, umField as anchorField } from './UserManagementKit'
import { ModuleWindowAccessTab, SpecialFunctionsTab } from './UserAccessTabs'
import { ReportAccessPane } from './ReportAccessPane'
import { SecurityProfilePickerDialog } from './SecurityProfileWindow'
import { useScreenReport } from '../host/screen-state'
import { LAYER, ModalWindow } from './dialogKit'
import { CaptionGroup, DialogFooter, NAVY_BOLD, footerButtons } from './formKit'
import { useTickSet } from './listKit'
import { aliasKey } from './ProviderTabGrids'
import { MOIS_TODAY as MOIS_TODAY_STAMP } from '../data/patients'
import { ALIAS_SOURCES } from '../data/clinicManagement'

/* ============================================================================
   Administration ▸ User Management ▸ User Accounts — the two editors.

     - `New User`     `a58fd3359aa3`, raised by `New Record`
     - `User Account` `42be29fdd885` and the six tab captures around it,
                      974 x 714, raised by `Edit Record` or a double-click

   `303183` is the step list both belong to. It walks New User top to bottom,
   presses `Create User`, and lands in the ten-tab window on tab 1 — which is
   what `onCreate` does here.

   THE 2026-10-02 TRAINING CAPTURE re-measured New User, the User Account
   header and its User Account / User Alias / Workspace Mgt / Memberships
   tabs, and captured three windows the help site never showed: `Change
   Name`, the user-level Special Functions pane, and the `Backlog is Empty`
   box Acknowledge Backlog raises for a user with nothing in the inbox. It
   was shot at 1.14x; every figure taken from it is the capture's ÷ 1.14.

   THE TAB STRIP IS THE CAPTURE'S, NOT THE PROSE'S. `42be29fdd885` renders ten
   tabs and spells the sixth `Workspace Mgt`. `302650` writes it out as
   "Workspace Management (CTRL + 6)", and the 2019 six-tab window
   (`537e2f2f5ca3`, `7e01f802a938`) did spell it out — but the ten-tab strip is
   the live one, so the short caption is what is drawn.

   WHAT IS DELIBERATELY NOT BUILT, because no capture exists (spec §8):
     - the Add / Edit Membership dialog, the Service Group `Change` dialog,
       the `Change History` link target and the second step of Add
       Subscription (method / priority). All four are named in `302650`;
       none is captured, so their buttons raise nothing.
     - the appearance of a freshly-added `Inbox Forwarding` row.
       `7e01f802a938` shows a populated row only.
     - the Reassign-Backlog "are you sure…" confirmation (`303358`).
   ========================================================================= */

/* --------------------------------------------------------------------------
   Shared window furniture
   ------------------------------------------------------------------------ */

/**
 * Measured details these windows draw that the kit has no prop for, applied
 * as scoped rules the way `UM_CSS` applies its own (2026-10-02 TRAINING
 * capture; candidates for kit props, listed in the wave report):
 *   1. the sunken panel every tab page is cut from — PBGroupBox at a 20/22px
 *      band, a #878787 frame and band rule (the kit's is #b6b6b6), its body a
 *      flex column on the face;
 *   2. a band's buttons butted edge to edge and filling its height, the
 *      command-row rectangle rather than the kit's 15px small button;
 *   3. the ten tab widths, which are not one padding round the caption;
 *   4. `Workspaces Shared With Me`: bold black captions on white over a black
 *      rule, in a 35px header; the Membership List's 34px blue header.
 */
const UA_CSS = `
.pb-ua-panel { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.pb-ua-panel > .pb-groupbox { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; border-color: #878787; background: var(--pb-face); }
.pb-ua-panel > .pb-groupbox > .pb-band { border-bottom-color: #878787; padding-right: 0; }
.pb-ua-panel > .pb-groupbox > div:last-child { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; position: relative; }
.pb-ua-bandbtns { display: flex; align-self: stretch; }
.pb-ua-bandbtns > .pb-cmdrow__btn { height: auto; margin-left: -1px; }
.pb-ua-tabs .pb-tabs__strip { padding-left: 1px; }
${USER_ACCOUNT_TAB_WIDTHS.map((w, i) => `.pb-ua-tabs .pb-tabs__strip--fixed > .pb-tabs__tab:nth-child(${i + 1}) { min-width: ${w}px; }
.pb-ua-tabs .pb-tabs__strip--fixed > .pb-tabs__tab.is-active:nth-child(${i + 1}) { min-width: ${w + 4}px; }`).join('\n')}
.pb-ua-head34 .pb-dw__table > thead > tr > th { height: 34px; }
.pb-ua-shared .pb-dw__table > thead > tr > th { height: 35px; vertical-align: bottom; background: #fff; }
.pb-ua-shared .pb-dw__table > thead > tr > th:hover { background: #fff; }
`

/** The grey of a disabled edit in these captures: the face, not the kit's near-white. */
const DISABLED_FACE: CSSProperties = { background: 'var(--pb-face)', color: '#000' }
/** The etched group-box rule and its bold black caption (2026-10-02 TRAINING capture). */
const GROUP_RULE = '#dcdcdc'
const BLACK_CAPTION: CSSProperties = { color: '#000', fontWeight: 700, margin: '0 0 0 4px', padding: '0 3px' }
/** The grey of a footnote under a control (`* Blank will default …`). */
const NOTE_INK = '#a7a7aa'

/**
 * One line of a window laid out at measured x positions, centred `y` down
 * its (relative) box. adminKit's ProfileRow does this for the New … Profile
 * dialogs but pins the label at 15px and hands the rest of the line to one
 * flex run; these windows put a second and third control at their own
 * measured x, so each piece is placed with `At`.
 */
function Line({ y, h = 20, children }: { y: number; h?: number; children: ReactNode }) {
  return <div style={{ position: 'absolute', left: 0, right: 0, top: y - h / 2, height: h }}>{children}</div>
}

/** A piece of a `Line`: left edge at `x`, or right edge at `end` (a right-set label). */
function At({ x, end, top, children, style }: { x?: number; end?: number; top?: boolean; children: ReactNode; style?: CSSProperties }) {
  const s: CSSProperties = {
    position: 'absolute', top: 0, bottom: top ? undefined : 0, display: 'flex', alignItems: top ? 'flex-start' : 'center',
    gap: 4, whiteSpace: 'nowrap', ...style,
  }
  if (end !== undefined) s.right = `calc(100% - ${end}px)`
  else s.left = x
  return <span style={s}>{children}</span>
}

/**
 * The sunken panel a page is cut from: a grey band (bold black, ruled off)
 * over the face — PBGroupBox at the measured band height, see `UA_CSS`.
 */
function Panel({ title, right, band = USER_ACCOUNT_PANEL.band, style, children }: {
  title: ReactNode
  right?: ReactNode
  band?: number
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <div className="pb-ua-panel" style={style}>
      <PBGroupBox title={title} right={right} pad={false} style={{ ['--pb-band-h' as string]: `${band}px` }}>
        {children}
      </PBGroupBox>
    </div>
  )
}

/** A band's buttons as the capture draws them: hard rectangles, butted, full height. */
function PanelButtons({ scope, buttons, onPress }: {
  scope: string
  buttons: readonly (readonly [label: string, width: number])[]
  onPress?: (label: string) => void
}) {
  return (
    <span className="pb-ua-bandbtns">
      {buttons.map(([b, w]) => (
        <PBButton key={b} bare className="pb-cmdrow__btn" style={{ width: w }} command={`${scope}-${pbSlug(b)}`} onClick={() => onPress?.(b)}>
          {b}
        </PBButton>
      ))}
    </span>
  )
}

/**
 * An etched group box with a bold black caption, `h` tall from its top rule
 * to its bottom one (the measured figure; the box itself starts 8 higher,
 * at the caption's top). Children are placed with `Line`, `y` from the top
 * rule.
 */
function Group({ title, h, style, children }: { title: ReactNode; h: number; style?: CSSProperties; children?: ReactNode }) {
  return (
    <CaptionGroup
      frame="fieldset"
      title={title}
      legendStyle={BLACK_CAPTION}
      style={{ height: h + 8, flex: 'none', boxSizing: 'border-box', borderColor: GROUP_RULE, padding: 0, margin: 0, position: 'relative', ...style }}
      bodyStyle={{ position: 'absolute', left: 0, right: 0, top: -7, bottom: 0 }}
    >
      {children}
    </CaptionGroup>
  )
}

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
   The `New User` dialog                `a58fd3359aa3`, laid out to the
                                        2026-10-02 TRAINING capture

   A 611px window: one sunken panel with a grey `New User` band and four
   ruled sections (data/userManagement.ts NEW_USER_SECTIONS), then
   `Create User` / `Cancel` centred on the face under it.
   ======================================================================== */

/**
 * What `Create User` hands back. The name fields and selected security profiles
 * seed the local account. While the two
 * `Synchronize with Name Fields` boxes are ticked, which is their default —
 * what MOIS writes `Display Name` and `Signature` from.
 */
export type NewUserDraft = { user: string; first: string; last: string; profiles?: string[] }

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

/** The required-entry marker the `* Required Entry` footnote explains. */
const Star = () => <span style={{ paddingLeft: 3 }}>*</span>

/** The two dialog buttons a window's foot centres, at the measured size. */
const sized = (buttons: ReturnType<typeof footerButtons>, width: number, height = 21) =>
  buttons.map((b) => ({ ...b, width, style: { height } }))

export function NewUserDialog({ onCreate, onClose }: {
  onCreate: (draft: NewUserDraft) => void
  onClose: () => void
}) {
  const host = usePBInstrumentation()
  const [picker, setPicker] = useState(false)
  const [profiles, setProfiles] = useState<string[]>([])
  const [draft, setDraft] = useState<NewUserDraft>({ user: '', first: '', last: '' })
  useScreenReport({ dialog: pbSlug(NEW_USER_TITLE), newUserReady: Boolean(draft.user.trim() && draft.first.trim() && draft.last.trim()) })

  return (
    <ModalWindow
      title={NEW_USER_TITLE}
      onClose={onClose}
      zIndex={LAYER.workspace}
      windowClassName="pb-um-dialog"
      windowStyle={{ width: NEW_USER_SIZE.w, maxWidth: '100%', maxHeight: '100%' }}
      /* the window's anchor rides a wrapper that shrink-wraps the frame */
      wrap={{ tutorialId: host?.anchor('dialog', pbSlug(NEW_USER_TITLE)) }}
      after={(
        <>
          <style>{UM_CSS + UA_CSS}</style>
          {picker && (
            <SecurityProfilePickerDialog
              selected={profiles}
              onApply={(next) => { setProfiles(next); setPicker(false) }}
              onClose={() => setPicker(false)}
            />
          )}
        </>
      )}
    >
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)', padding: '15px 0 0 17px' }}>
            <Panel title={NEW_USER_BAND} band={NEW_USER_SIZE.band} style={{ width: NEW_USER_SIZE.panelW }}>
              {NEW_USER_SECTIONS.map((section, i) => (
                /* each section is ruled off from the one above, full width */
                <div key={i} style={{ position: 'relative', height: section.h, flex: 'none', borderTop: i ? '1px solid #b4b4b4' : undefined }}>
                  {section.rows.map((row, j) => (
                    <Line key={j} y={row.y}>
                      {row.fields.map((f, k) => (
                        <NewUserControl
                          key={k}
                          field={f}
                          draft={draft}
                          onDraft={setDraft}
                          profiles={profiles}
                          onChangeProfiles={() => setPicker(true)}
                        />
                      ))}
                    </Line>
                  ))}
                </div>
              ))}
            </Panel>
          </div>

          <DialogFooter gap={10} padding="14px 0 13px" background="var(--pb-face)" buttons={sized(footerButtons(NEW_USER_BUTTONS, {
            wide: true, onPress: (b) => (b === 'Create User' ? onCreate({ ...draft, profiles }) : onClose()),
          }), 74)} />
    </ModalWindow>
  )
}

function NewUserControl({ field, draft, onDraft, profiles, onChangeProfiles }: {
  field: NewUserField
  draft: NewUserDraft
  onDraft: (next: NewUserDraft) => void
  profiles: string[]
  onChangeProfiles: () => void
}) {
  /* a line's first label is left-set at 16; a second or third control's
     label is right-set against its edit (`Prefix:`, `Middle Name:`, `Email:`) */
  const label = 'label' in field
    ? (field.x === NEW_USER_SIZE.controlX
      ? <At x={NEW_USER_SIZE.labelX}>{field.label}</At>
      : <At end={field.x - 4}>{field.label}</At>)
    : null

  if (field.kind === 'note') {
    return <At x={field.x}>{field.text}</At>
  }

  if (field.kind === 'sync') {
    /* the edit is disabled and grey while the tick box is on: MOIS writes it
       from the name fields. The anchor rides the INPUT, never a wrapper —
       `clickAnchor` calls .click() on whatever carries it, and a click on a
       wrapping span never reaches the box inside. */
    return (
      <>
        {label}
        <At x={field.x}><PBInput w={field.w} disabled value={newUserDisplayName(draft)} readOnly style={DISABLED_FACE} /></At>
        <At x={NEW_USER_SYNC_X}>
          <PBCheckbox
            label="Synchronize with Name Fields"
            checked
            tutorialId={`host.mois.field.sync-${pbSlug(field.label)}`}
          />
        </At>
      </>
    )
  }

  if (field.kind === 'check') {
    return (
      <>
        {label}
        <At x={field.x}>
          <PBCheckbox label={field.check} checked={field.checked} tutorialId={anchorField(field.label)} />
        </At>
      </>
    )
  }

  if (field.kind === 'profiles') {
    /* a sunken list on the face, `*` at its top right, Change beside it */
    return (
      <>
        <At x={NEW_USER_SIZE.labelX}>{field.label}</At>
        <At x={field.x} top style={{ top: 0, alignItems: 'flex-start' }}>
          <PBTextArea
            w={field.w}
            readOnly
            value={profiles.join('\n')}
            style={{ height: field.h, background: 'var(--pb-face)', boxShadow: 'inset 1px 1px #a0a0a0' }}
            data-tutorial-id={anchorField(field.label)}
          />
          {field.required && <span style={{ marginLeft: -1 }}>*</span>}
          <PBButton command="security-profiles-change" onClick={onChangeProfiles} style={{ width: 70, minWidth: 0, height: 21, marginLeft: 16, marginTop: 2 }}>
            Change
          </PBButton>
        </At>
      </>
    )
  }

  if (field.kind === 'drop') {
    return (
      <>
        {label}
        <At x={field.x}>
          <PBSelect w={field.w} options={field.options} data-tutorial-id={anchorField(field.label)} />
          {field.required && <Star />}
        </At>
      </>
    )
  }

  if (field.kind === 'password') {
    return (
      <>
        {label}
        <At x={field.x}><PBInput type="password" w={field.w} defaultValue={NEW_USER_MASK} data-tutorial-id={anchorField(field.label)} /></At>
      </>
    )
  }

  if (field.kind === 'hint') {
    return (
      <>
        {label}
        <At x={field.x}><PBInput w={field.w} data-tutorial-id={anchorField(field.label)} /></At>
        {/* the example lines up with the Synchronize labels above it */}
        <At x={NEW_USER_SYNC_X + 22}>{field.hint}</At>
      </>
    )
  }

  const bound = NAME_FIELDS[field.label]
  return (
    <>
      {label}
      <At x={field.x}>
        <PBInput
          w={field.w}
          align={field.align}
          {...(bound
            ? { value: draft[bound], onChange: (e) => onDraft({ ...draft, [bound]: e.target.value }) }
            : { defaultValue: field.value })}
          data-tutorial-id={anchorField(field.label)}
        />
        {field.required && <Star />}
      </At>
    </>
  )
}

/* ===========================================================================
   The `User Account` window            974 x 714
   ======================================================================== */

type AccountName = Record<'user' | 'first' | 'last' | 'prefix' | 'middle' | 'suffix' | 'display' | 'signature' | 'initials', string>

export function UserAccountWindow({ row, onClose }: { row: UserRow; onClose: () => void }) {
  const host = usePBInstrumentation()
  const [tab, setTab] = useState(USER_ACCOUNT_TABS[0]!)
  const [saved, saveSettings] = useSessionState<AccountSettings>(accountSettingsKey(row), initialAccountSettings(row))
  const [savedAliases, saveAliases] = useSessionState<UserRow[] | null>(aliasKey('', String(row.display ?? '')), null)
  const [draft, setDraft] = useState({ ...saved, aliases: savedAliases ?? saved.aliases })
  const set = (patch: Partial<AccountSettings>) => setDraft(d => ({ ...d, ...patch }))
  const [changeName, setChangeName] = useState(false)
  useScreenReport({ dialog: 'user-account', ...accountOutcomes(draft, row) })

  const display = String(row.display ?? '')
  const [last = '', first = ''] = display.split(',').map((s) => s.trim())
  const [name, setName] = useState<AccountName>({
    user: String(row.user ?? ''),
    first,
    last,
    prefix: '',
    middle: '',
    suffix: '',
    display,
    signature: display,
    initials: `${first.slice(0, 1)}${last.slice(0, 1)}`,
  })
  const g = USER_ACCOUNT_HEADER_GEOMETRY

  return (
    <ModalWindow
      title="User Account"
      onClose={onClose}
      zIndex={LAYER.workspace}
      windowClassName="pb-um-dialog"
      windowStyle={{
        width: USER_ACCOUNT_SIZE.w,
        height: USER_ACCOUNT_SIZE.h,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
      wrap={{ tutorialId: host?.anchor('dialog', 'user-account') }}
      after={(
        <>
          <style>{UM_CSS + UA_CSS}</style>
          {changeName && (
            <ChangeNameDialog
              name={name}
              onSave={(next) => { setName(next); setChangeName(false) }}
              onClose={() => setChangeName(false)}
            />
          )}
        </>
      )}
    >
          {/* the fixed block above the strip (2026-10-02 TRAINING capture):
              three columns of labels with BOLD read-only values, ruled off
              underneath, and Change Name at the top right */}
          <div style={{ position: 'relative', height: g.h, flex: 'none', background: 'var(--pb-face)', borderBottom: '1px solid #6d6d6d' }}>
            {USER_ACCOUNT_HEADER.map((col, i) => {
              const at = g.columns[i]!
              return col.map((f, j) => (
                <Line key={f.key} y={g.top + j * g.pitch} h={g.pitch}>
                  {'labelRight' in at ? <At end={at.labelRight}>{f.label}</At> : <At x={at.label}>{f.label}</At>}
                  <At x={at.value} style={{ fontWeight: 700 }}>
                    <span data-tutorial-id={anchorField(f.label)}>{name[f.key as keyof AccountName]}</span>
                  </At>
                </Line>
              ))
            })}
            <PBButton
              command="change-name"
              onClick={() => setChangeName(true)}
              style={{ position: 'absolute', left: g.changeName.x, top: g.changeName.y, width: g.changeName.w, height: g.changeName.h, minWidth: 0, padding: 0 }}
            >
              Change Name
            </PBButton>
          </div>

          <div className="pb-ua-tabs" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PBTabs tabs={USER_ACCOUNT_TABS} active={tab} onChange={setTab} tabWidth={Math.min(...USER_ACCOUNT_TAB_WIDTHS)} face>
              <UserAccountPage key={tab} tab={tab} row={row} draft={draft} set={set} />
            </PBTabs>
          </div>

          <DialogFooter frame="pb" height={USER_ACCOUNT_FOOT.h} gap={USER_ACCOUNT_FOOT.gap} buttons={sized(footerButtons(USER_ACCOUNT_FOOTER, { wide: true, onPress: b => { if (b === 'Apply Changes') { saveSettings({ ...draft, saves: saved.saves + 1 }); saveAliases(draft.aliases) }; onClose() } }), USER_ACCOUNT_FOOT.button, USER_ACCOUNT_FOOT.buttonH)} />
    </ModalWindow>
  )
}

type AccountDraftProps = { row: UserRow; draft: AccountSettings; set: (patch: Partial<AccountSettings>) => void }
function UserAccountPage({ tab, row, draft, set }: AccountDraftProps & { tab: string }) {
  switch (tab) {
    case 'User Account': return <UserAccountTab row={row} draft={draft} set={set} />
    case 'Module / Window Access': return <ModuleWindowAccessTab override />
    /* Tabs 3 and 4 were captured at SECURITY PROFILE level only on the help
       site (`e361c4e01d11`, `9e179125c6d6`), and `302650` refuses to describe
       the user level. Both user-level panes are captured now: Special
       Functions in the 2026-10-02 TRAINING capture (the Override column
       beside Execute), Report Access in 304021 `9ca90685`. */
    case 'Special Functions': return <SpecialFunctionsTab override />
    /* the user-level Report Access IS captured, in 304021 `9ca90685`
       (Override + Access / Print per report): screens/ReportAccessPane.tsx */
    case 'Report Access': return <ReportAccessPane override />
    case 'User Alias': return <UserAliasTab row={row} draft={draft} set={set} />
    case 'Workspace Mgt': return <WorkspaceMgtTab row={row} draft={draft} set={set} />
    case 'Memberships': return <MembershipsTab />
    case 'Service Group': return <ServiceGroupTab />
    case 'Subscription': return <SubscriptionTab />
    case 'Other': return <OtherTab />
    default: return <UncapturedPage />
  }
}

const UncapturedPage = () => <div style={{ flex: '1 1 auto' }} />

/** A tab page holding panels inset from the page edge. */
function Inset({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const d = USER_ACCOUNT_PANEL.inset
  return <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: `${d}px ${d}px 10px`, ...style }}>{children}</div>
}

/* --- tab 1: `User Account` ------------------------------------------------
   `42be29fdd885`; laid out to the 2026-10-02 TRAINING capture: a grey
   `User Account` band, then two columns of etched group boxes with bold
   black captions. Left: Account Settings, Security Profiles, Notification
   Service Settings. Right: Password Settings, Other Settings, Workspace
   Settings (data/userManagement.ts tab 1). Lines are placed at the
   capture's x and y, the y measured from each box's top rule.             */

/** label column 10 in from a box's rule, controls at 96 */
const UA_LABEL = 10
const UA_CTRL = 96

function UserAccountTab({ row, draft, set }: AccountDraftProps) {
  const [changePw, setChangePw] = useState(false)
  const [picker, setPicker] = useState(false)
  /* the account's own profile (its Role on the grid), and its own status:
     an inactive (I) account opens with Active unticked (303186) */
  const profiles = draft.profiles
  const setProfiles = (profiles: string[]) => set({ profiles })
  const [accounts] = useUserAccounts()
  const providers = useProviderRoster()
  const [active, setActive] = useState(row.status !== 'I')
  const [toggledActive, setToggledActive] = useState(false)
  useScreenReport(toggledActive ? { cell: 'active', checked: active } : {})
  const sm: CSSProperties = { width: 69, minWidth: 0, height: 20, padding: 0 }

  return (
    <Inset>
      <Panel title="User Account">
        {/* the rules' gaps, measured: 10.5 / 17.5 down the left, 14 / 18.5
            down the right — less the 8 each caption stands above its rule */}
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 8, padding: '5px 8px 0' }}>
          <div style={{ width: 465, flex: 'none', display: 'flex', flexDirection: 'column' }}>
            <Group title="Account Settings" h={168}>
              <Line y={26}>
                <At x={UA_LABEL}>User Name:</At>
                <At x={UA_CTRL}>
                  {/* greyed and filled in: changed only through Change */}
                  <PBInput w={126} value={String(row.user ?? '')} readOnly style={DISABLED_FACE} data-tutorial-id={anchorField('User Name')} />
                  <PBButton command="user-name-change" style={sm}>Change</PBButton>
                  {/* `302650` names this link; its target is never captured */}
                  <button type="button" className="pb-link" style={{ marginLeft: 3 }}>Change History</button>
                </At>
              </Line>
              <Line y={46}>
                <At x={UA_LABEL}>Mobile Phone:</At>
                <At x={UA_CTRL}><PBInput w={82} data-tutorial-id={anchorField('Mobile Phone')} /></At>
                <At end={249}>Email:</At>
                <At x={253}><PBInput w={200} data-tutorial-id={anchorField('Email')} /></At>
              </Line>
              <Line y={66}>
                <At x={UA_LABEL}>Effective Date:</At>
                <At x={UA_CTRL}><PBInput w={100} align="center" defaultValue={String(row.effective ?? '')} data-tutorial-id={anchorField('Effective Date')} /></At>
                <At end={281}>Expiry Date:</At>
                <At x={285}><PBInput w={100} align="center" defaultValue={String(row.expiry ?? '')} data-tutorial-id={anchorField('Expiry Date')} /></At>
                {/* `303186`: unticking this is what deactivates the account */}
                <At end={435}>Active:</At>
                <At x={439}><PBCheckbox checked={active} onChange={(v) => { setActive(v); setToggledActive(true) }} tutorialId={anchorField('Active')} /></At>
              </Line>
              <Line y={86}>
                <At x={UA_LABEL}>Role:</At>
                <At x={UA_CTRL}><PBSelect w={356} options={USER_ROLES} defaultValue={String(row.role ?? '')} data-tutorial-id={anchorField('Role')} /></At>
              </Line>
              <Line y={106}>
                <At x={UA_LABEL}>Expertise:</At>
                <At x={UA_CTRL}><PBSelect w={356} options={USER_EXPERTISE} data-tutorial-id={anchorField('Expertise')} /></At>
              </Line>
              <Line y={126}>
                <At x={UA_LABEL}>Comment:</At>
                <At x={UA_CTRL} top style={{ top: 0 }}><PBTextArea w={356} style={{ height: 46 }} data-tutorial-id={anchorField('Comment')} /></At>
              </Line>
            </Group>

            <Group title="Security Profiles" h={48} style={{ marginTop: 2.5 }}>
              <Line y={26} h={31}>
                <At x={10}>
                  <PBTextArea
                    w={270}
                    readOnly
                    value={profiles.join('\n')}
                    style={{ height: 31, background: 'var(--pb-face)', boxShadow: 'inset 1px 1px #a0a0a0' }}
                    data-tutorial-id={anchorField('Security Profiles')}
                  />
                </At>
                <At x={288} style={{ top: 9 }}>
                  <PBButton command="security-profiles-change" onClick={() => setPicker(true)} style={sm}>
                    Change
                  </PBButton>
                </At>
              </Line>
            </Group>

            <Group title="Notification Service Settings" h={250} style={{ marginTop: 9.5 }}>
              {NOTIFICATION_BLOCKS.map((block, b) => {
                const top = b ? 142 : 21
                return (
                  <div key={block}>
                    <Line y={top}>
                      <At x={17} style={NAVY_BOLD}>{block}</At>
                      <At x={UA_CTRL} style={{ fontWeight: 700 }}><PBCheckbox label="Notification on Shutdown" /></At>
                    </Line>
                    {NOTIFICATION_PRIORITIES.map((p, i) => (
                      <Line key={p} y={top + 22 + i * 22.5}>
                        <At end={86}>{p}</At>
                        {NOTIFICATION_METHODS.map((m, k) => (
                          <At key={m} x={UA_CTRL + k * 54}>
                            <PBRadio
                              name={`notify-${pbSlug(block)}-${i}`}
                              label={m}
                              checked={m === NOTIFICATION_DEFAULTS[i]}
                              onChange={() => {}}
                            />
                          </At>
                        ))}
                      </Line>
                    ))}
                  </div>
                )
              })}
            </Group>
          </div>

          <div style={{ width: 465, flex: 'none', display: 'flex', flexDirection: 'column' }}>
            <Group title="Password Settings" h={123}>
              <Line y={26}>
                <At x={11}>Effective Date:</At>
                <At x={100}><PBInput w={100} align="center" defaultValue={String(row.effective ?? '')} /></At>
              </Line>
              <Line y={46}>
                <At x={11}>Expiry Date:</At>
                <At x={100}><PBInput w={100} align="center" /></At>
              </Line>
              <Line y={66}>
                <At x={11}>Password:</At>
                <At x={100}>
                  <PBInput type="password" w={127} disabled defaultValue={NEW_USER_MASK} style={DISABLED_FACE} />
                  <PBButton command="password-change" onClick={() => setChangePw(true)} style={{ ...sm, marginLeft: 2 }}>
                    Change
                  </PBButton>
                </At>
              </Line>
            </Group>

            <Group title="Other Settings" h={89} style={{ marginTop: 6 }}>
              <Line y={18}>
                <At x={8}>Default Desktop Provider:</At>
                <At x={155}>
                  <PBSelect w={215} options={[...new Set(['', ...DESKTOP_PROVIDERS, ...providers.map(p => p.provider)])]} value={draft.desktopProvider} onChange={e => set({ desktopProvider: e.target.value })} data-tutorial-id={anchorField('Default Desktop Provider')} />
                </At>
              </Line>
              <Line y={37}>
                <At x={8}>Default Author*:</At>
                <At x={155}>
                  <PBSelect w={215} options={[...new Set(['', ...accounts.map(r => String(r.display ?? ''))])]} value={draft.author} onChange={e => set({ author: e.target.value })} data-tutorial-id={anchorField('Default Author')} />
                </At>
              </Line>
              <Line y={58}>
                <At x={156} style={{ color: NOTE_INK }}>{DEFAULT_AUTHOR_FOOTNOTE}</At>
              </Line>
            </Group>

            <Group title="Workspace Settings" h={250} style={{ marginTop: 10.5 }}>
              <Line y={19}>
                <At x={9} style={NAVY_BOLD}>Do not ask user to acknowledge manual entry of:</At>
              </Line>
              {/* one item per line, down the box */}
              {WORKSPACE_ACK_ITEMS.map((item, i) => (
                <Line key={item} y={41 + i * 22}>
                  <At x={9}>
                    <PBCheckbox label={item} {...(item === 'Progress Notes' ? { checked: draft.ackProgressNotes, onChange: (v: boolean) => set({ ackProgressNotes: v }) } : {})} tutorialId={`host.mois.field.ack-${pbSlug(item)}`} />
                  </At>
                </Line>
              ))}
            </Group>
          </div>
        </div>
      </Panel>

      {changePw && <ChangePasswordDialog onClose={() => setChangePw(false)} />}
      {picker && (
        <SecurityProfilePickerDialog
          selected={profiles}
          onApply={(next) => { setProfiles(next); setPicker(false) }}
          onClose={() => setPicker(false)}
        />
      )}
    </Inset>
  )
}

/* --- tab 5: `User Alias` --------------------------------------------------
   2026-10-02 TRAINING capture: a `User Alias List` band with New / Delete
   butted at its right; the Source cell drops a Code / Description list of
   the seven alias sources (data/clinicManagement ALIAS_SOURCES, the
   Provider window's list), 366 wide.                                       */

const ALIAS_SOURCE_COLUMNS = [
  { key: 'code', header: 'Code', width: 118 },
  { key: 'desc', header: 'Description', width: 230 },
]

function UserAliasTab({ draft, set }: AccountDraftProps) {
  const [cur, setCur] = useState(0)
  const rows = draft.aliases
  const edit = (i: number, key: string, value: string) => set({ aliases: rows.map((r, j) => j === i ? { ...r, [key]: value } : r) })
  const columns = umColumns(USER_ALIAS_COLUMNS).map(col => ({ ...col,
    render: (r: UserRow, i: number) => col.key === 'source'
      ? (
        <PBDropDownDataWindow
          w="100%"
          listW={366}
          rows={ALIAS_SOURCES}
          columns={ALIAS_SOURCE_COLUMNS}
          value={String(r.source ?? '')}
          display="code"
          onSelect={(s) => edit(i, 'source', s.code)}
          tutorialId={`host.mois.field.user-alias-source-${i + 1}`}
        />
      )
      : <CellText value={r[col.key]} onChange={v => edit(i, col.key, v)} anchor={`user-alias-${col.key}-${i + 1}`} />,
  }))
  useScreenReport({ rows: rows.length })
  return (
    <Inset>
      <Panel
        title="User Alias List"
        right={<PanelButtons scope="user-alias" buttons={[['New', 51], ['Delete', 51]]} onPress={b => {
          set({ aliases: b === 'New' ? [...rows, { start: MOIS_TODAY_STAMP, end: '', source: '', value: '', note: '' }] : rows.filter((_, i) => i !== cur) })
          setCur(b === 'New' ? rows.length : 0)
        }} />}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)' }}>
          <PBDataWindow rows={rows} columns={columns} current={cur} onCurrentChange={setCur} empty=" " />
        </div>
      </Panel>
    </Inset>
  )
}

/* --- tab 6: `Workspace Mgt` ----------------------------------------------
   `c4c90b65d9f8`, `7e01f802a938`; laid out to the 2026-10-02 TRAINING
   capture (data/userManagement.ts WORKSPACE_MGT_GEOMETRY): a tall Inbox
   Forwarding panel across the top, and under it `Sharing Workspace With`
   (left) beside the read-only `Workspaces Shared With Me` panel (right).
   Acknowledge Backlog raises `Acknowledge Backlog` (`eb5ed396f17d`, 303356)
   — or, for a user with nothing in the inbox, the `Backlog is Empty` box
   (2026-10-02 TRAINING capture). Reassign Backlog raises `Select Users`
   (`d1654b0c032c`, 303358).                                               */

/** Band button widths, measured: Acknowledge / Reassign Backlog, New, Delete. */
const INBOX_BUTTON_W = [116, 118, 52, 51]

/**
 * Whose inbox holds a backlog. The emulator's inbox baskets belong to the
 * clinic's providers — the accounts the Desktop Provider list carries — so
 * those open the Acknowledge Backlog parameters; any other account has
 * nothing to acknowledge, and MOIS says so.
 */
const hasBacklog = (row: UserRow) => DESKTOP_PROVIDERS.some((p) => p && p.startsWith(String(row.display ?? '-')))

function WorkspaceMgtTab({ row, draft, set }: AccountDraftProps) {
  const [accounts] = useUserAccounts()
  const [shareCur, setShareCur] = useState(0)
  const g = WORKSPACE_MGT_GEOMETRY
  const shareColumns = umColumns(SHARING_WORKSPACE_COLUMNS).map(col => ({ ...col, render: (r: UserRow, i: number) => {
    const edit = (v: string) => set({ sharing: draft.sharing.map((r, j) => j === i ? { ...r, [col.key]: v } : r) })
    return col.key === 'user' ? <CellSelect value={r.user} options={[...new Set(['', ...accounts.map(r => String(r.display ?? '')).filter(Boolean)])]} onChange={edit} anchor={`sharing-user-${i + 1}`} />
      : <CellText value={r[col.key]} onChange={edit} anchor={`sharing-${col.key}-${i + 1}`} />
  } }))
  const [backlog, setBacklog] = useState<null | 'acknowledge' | 'empty' | 'reassign'>(null)
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
    <Inset style={{ gap: g.gap }}>
      <Panel
        style={{ height: g.inboxH, flex: 'none' }}
        title="Inbox Forwarding"
        right={(
          <PanelButtons
            scope="inbox-forwarding"
            buttons={INBOX_FORWARDING_BUTTONS.map((b, i) => [b, INBOX_BUTTON_W[i]!] as const)}
            onPress={(b) => {
              if (b === 'Acknowledge Backlog') setBacklog(hasBacklog(row) ? 'acknowledge' : 'empty')
              if (b === 'Reassign Backlog') setBacklog('reassign')
            }}
          />
        )}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)' }}>
          <TabGrid columns={forwarding} rows={INBOX_FORWARDING_ROWS} />
        </div>
      </Panel>

      <div className="pb-row" style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'stretch', gap: g.sideGap }}>
        <Panel
          style={{ width: g.sharingW, flex: 'none' }}
          title="Sharing Workspace With"
          right={<PanelButtons scope="sharing-workspace" buttons={[['New', 51], ['Delete', 51]]} onPress={b => { set({ sharing: b === 'New' ? [...draft.sharing, { start: MOIS_TODAY_STAMP, stop: '', user: '', note: '' }] : draft.sharing.filter((_, i) => i !== shareCur) }); setShareCur(b === 'New' ? draft.sharing.length : 0) }} />}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)' }}>
            <PBDataWindow columns={shareColumns} rows={draft.sharing} current={shareCur} onCurrentChange={setShareCur} empty=" " />
          </div>
        </Panel>
        {/* read-only: a 31px #C8DCFA caption band of its own, then bold
            captions on white; an empty stop date renders as `--` */}
        <div className="pb-ua-shared" style={{ width: g.sharedW, flex: 'none', display: 'flex', flexDirection: 'column', border: '1px solid #878787', background: 'var(--pb-window)' }}>
          <div className="pb-band" style={{ background: '#c8dcfa', minHeight: g.sharedBand, padding: '0 9px', borderBottom: '1px solid #fff' }}>Workspaces Shared With Me</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', paddingLeft: 3 }}>
            <PBDataWindow<UserRow> columns={umColumns(SHARED_WITH_ME_PANEL_COLUMNS)} rows={SHARED_WITH_ME_ROWS} head="grey" gutter={false} rules={false} empty=" " />
          </div>
        </div>
      </div>

      {backlog === 'acknowledge' && <AcknowledgeBacklogDialog who={String(row.display ?? '')} onClose={() => setBacklog(null)} />}
      {backlog === 'empty' && <BacklogEmptyBox onClose={() => setBacklog(null)} />}
      {backlog === 'reassign' && <SelectUsersDialog onClose={() => setBacklog(null)} />}
    </Inset>
  )
}

/* `Backlog is Empty` — 2026-10-02 TRAINING capture: what Acknowledge
   Backlog raises when the user's inbox holds nothing; the information icon,
   the one line, OK. */
function BacklogEmptyBox({ onClose }: { onClose: () => void }) {
  useScreenReport({ dialog: 'backlog-is-empty' })
  return (
    <PBMessageBox
      title="Backlog is Empty"
      icon="info"
      plain
      zIndex={90}
      tutorialId="host.mois.dialog.backlog-is-empty"
      buttons={[{ label: 'OK', value: 'ok', default: true, command: 'backlog-empty-ok', style: { width: 72, minWidth: 0 } }]}
      onClose={onClose}
    >
      There is currently no backlog of inbox records for this user.
    </PBMessageBox>
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
  const [include, setInclude] = useState(() => BACKLOG_ITEMS.map(() => true))
  useScreenReport({ dialog: 'acknowledge-backlog' })
  const total = BACKLOG_ITEMS.reduce((sum, [, n], i) => sum + (include[i] ? n : 0), 0)
  return (
    <ModalWindow id="acknowledge-backlog" title="Acknowledge Backlog" onClose={onClose} zIndex={90} windowClassName="pb-um-dialog" windowStyle={{ width: 690 }}>
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
        <DialogFooter frame="pb" buttons={footerButtons(['Ok', 'Cancel'], { prefix: 'backlog-', wide: true, onPress: onClose })} />
    </ModalWindow>
  )
}

/* `Select Users`, `d1654b0c032c` (303358): a `User Accounts` band over
   Select / Full Name / User Name, and Ok / Cancel. 303358: tick the user the
   backlog goes to, press Ok, and confirm — the confirmation is not captured,
   so Ok closes the window. */
function SelectUsersDialog({ onClose }: { onClose: () => void }) {
  const users = userListSpec('ad-users')?.rows.filter((r) => r.status !== 'I') ?? []
  const picked = useTickSet<string>()
  useScreenReport({ dialog: 'select-users', rows: picked.size })
  return (
    <ModalWindow id="select-users" title="Select Users" onClose={onClose} zIndex={90} windowClassName="pb-um-dialog" windowStyle={{ width: 430 }}>
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
                      onChange={(v) => picked.set(String(r.user), v)}
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
        <DialogFooter frame="pb" buttons={footerButtons(['Ok', 'Cancel'], { prefix: 'select-users-', wide: true, onPress: onClose })} />
    </ModalWindow>
  )
}

/* --- tab 7: `Memberships` ------------------------------------------------
   `d9af05150d60`; laid out to the 2026-10-02 TRAINING capture: one panel,
   inset like the others, holding the Other Settings group (left) beside the
   Associated Provider(s) grid (right, 474 wide) across a 113px top strip;
   then the `Membership List` band, and under it the list, whose 34px blue
   header row carries `Add` over the per-row Edit / Delete (each 57 wide). */

function MembershipsTab() {
  const btn: CSSProperties = { width: 57, minWidth: 0, height: 19, padding: 0 }
  return (
    <Inset>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #878787', background: 'var(--pb-face)' }}>
        <div className="pb-row" style={{ alignItems: 'stretch', gap: 0, height: 113, flex: 'none' }}>
          <div style={{ flex: '1 1 auto', minWidth: 0, padding: '6px 9px 0' }}>
            <Group title="Other Settings" h={88}>
              <Line y={23}>
                <At x={9}>Default Desktop Provider:</At>
                <At x={156}><PBSelect w={215} options={DESKTOP_PROVIDERS} /></At>
              </Line>
              <Line y={43}>
                <At x={9}>Default Author*:</At>
                <At x={156}><PBSelect w={215} options={DESKTOP_PROVIDERS} /></At>
              </Line>
              <Line y={63}>
                <At x={157} style={{ color: NOTE_INK }}>{DEFAULT_AUTHOR_FOOTNOTE}</At>
              </Line>
            </Group>
          </div>
          <div style={{ width: 474, flex: 'none', display: 'flex', borderLeft: '1px solid #878787' }}>
            <TabGrid columns={umColumns(ASSOCIATED_PROVIDER_COLUMNS)} rows={ASSOCIATED_PROVIDER_ROWS} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #878787', borderBottom: '1px solid #878787', ['--pb-band-h' as string]: `${USER_ACCOUNT_PANEL.band}px` }}>
          <PBBand>Membership List</PBBand>
        </div>
        {/* no gridlines, and a 34px header band — see `UA_CSS` */}
        <div className="pb-ua-head34" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)' }}>
          <PBDataWindow<UserRow>
            rows={MEMBERSHIP_ROWS}
            rules={false}
            gutter={false}
            columns={[
              ...umColumns(MEMBERSHIP_COLUMNS).map((c) => (c.key === 'name' ? { ...c, headAlign: 'left' as const } : c)),
              {
                key: 'actions',
                /* `Add` lives IN the header row, over the rows' Edit / Delete */
                header: <PBButton command="membership-add" style={btn}>Add</PBButton>,
                width: 132,
                render: (r: UserRow) => (
                  <span className="pb-row" style={{ gap: 3 }}>
                    <PBButton command={`membership-edit-${pbSlug(String(r.name ?? ''))}`} style={btn}>
                      Edit
                    </PBButton>
                    <PBButton style={btn}>Delete</PBButton>
                  </span>
                ),
              },
            ]}
            rowTutorialId={(r) => `host.mois.row.membership-${pbSlug(String(r.name ?? ''))}`}
            empty=" "
          />
        </div>
      </div>
    </Inset>
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
              <PBButton size="sm" command="subscription-add" onClick={() => setPick(true)}>
                Add
              </PBButton>
            ),
            width: 116,
            render: (r: UserRow) => (
              <span className="pb-row" style={{ gap: 4 }}>
                <PBButton size="sm" command={`subscription-edit-${pbSlug(String(r.event ?? ''))}`}>
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
    <ModalWindow title={d.title} onClose={onClose} zIndex={90} wrap={{ tutorialId: host?.anchor('dialog', pbSlug(d.title)) }}
      windowClassName="pb-um-dialog" windowStyle={{ width: 520 }}>
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
          <DialogFooter frame="pb" buttons={footerButtons(d.buttons, { wide: true, onPress: onClose })} />
    </ModalWindow>
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
        {setting.name === 'User Agreements' ? <UserAgreementResponses /> : <>
        <div className="pb-band" style={{ background: '#c8dcfa' }}>{setting.name}</div>
        {setting.desc && (
          <div style={{ padding: '4px 8px', whiteSpace: 'normal' }}>{setting.desc}</div>
        )}
        <div style={{ padding: '2px 8px' }}>
          {setting.fields.map((f, i) => <OtherControl key={i} field={f} />)}
        </div>
        </>}
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
   `Change Name`                        2026-10-02 TRAINING capture
   (User Account ▸ header ▸ Change Name.)

   The six name edits, Display Name (disabled while its Synchronize box is
   ticked) and Signature Line (box unticked, edit live) in three ruled
   sections, `* Required Entry`, then Save / Cancel
   (data/userManagement.ts CHANGE_NAME). Save hands the names back to the
   window's header; nothing else is written.
   ======================================================================== */

function ChangeNameDialog({ name, onSave, onClose }: {
  name: AccountName
  onSave: (next: AccountName) => void
  onClose: () => void
}) {
  const d = CHANGE_NAME
  const [draft, setDraft] = useState(name)
  const [syncDisplay, setSyncDisplay] = useState(true)
  const [syncSignature, setSyncSignature] = useState(false)
  const synced = [draft.last, draft.first].filter(Boolean).join(', ').toUpperCase()
  const value = (key: keyof AccountName) => (key === 'display' && syncDisplay) || (key === 'signature' && syncSignature) ? synced : draft[key]
  const field = (key: keyof AccountName) => ({
    value: value(key),
    onChange: (e: { target: { value: string } }) => setDraft((n) => ({ ...n, [key]: e.target.value })),
  })
  useScreenReport({ dialog: 'change-name' })

  return (
    <ModalWindow id="change-name" title={d.title} onClose={onClose} zIndex={90} windowClassName="pb-um-dialog" windowStyle={{ width: d.w }}>
      <div style={{ background: 'var(--pb-face)', borderBottom: '1px solid #6d6d6d' }}>
        <div style={{ position: 'relative', height: d.sections[0] }}>
          {d.rows.map((r, i) => (
            <Line key={r.key} y={d.top + i * d.pitch}>
              <At x={d.labelX}>{r.label}</At>
              <At x={d.controlX}>
                <PBInput w={d.editW} {...field(r.key as keyof AccountName)} data-tutorial-id={`host.mois.field.change-name-${r.key}`} />
                {r.required && <span>*</span>}
                {r.hint && <span>{r.hint}</span>}
              </At>
            </Line>
          ))}
        </div>
        <div style={{ position: 'relative', height: d.sections[1], borderTop: '1px solid #b4b4b4' }}>
          <Line y={17}>
            <At x={d.labelX}>Display Name:</At>
            <At x={d.controlX}><PBInput w={d.wideW} disabled={syncDisplay} style={syncDisplay ? DISABLED_FACE : undefined} {...field('display')} data-tutorial-id="host.mois.field.change-name-display" /></At>
            <At x={d.syncX}><PBCheckbox label={d.sync} checked={syncDisplay} onChange={setSyncDisplay} tutorialId="host.mois.field.change-name-sync-display" /></At>
          </Line>
        </div>
        <div style={{ position: 'relative', height: d.sections[2], borderTop: '1px solid #b4b4b4' }}>
          <Line y={18}>
            <At x={d.labelX}>Signature Line:</At>
            <At x={d.controlX}><PBInput w={d.wideW} disabled={syncSignature} style={syncSignature ? DISABLED_FACE : undefined} {...field('signature')} data-tutorial-id="host.mois.field.change-name-signature" /></At>
            <At x={d.syncX}><PBCheckbox label={d.sync} checked={syncSignature} onChange={setSyncSignature} tutorialId="host.mois.field.change-name-sync-signature" /></At>
          </Line>
          <Line y={41}>
            <At x={d.labelX}>* Required Entry</At>
          </Line>
        </div>
      </div>
      <DialogFooter gap={6} height={d.footH} background="var(--pb-face)" buttons={sized(footerButtons(d.buttons, {
        prefix: 'change-name-',
        onPress: (b) => (b === 'Save' ? onSave({ ...draft, display: value('display'), signature: value('signature') }) : onClose()),
      }), 75)} />
    </ModalWindow>
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
    <ModalWindow
      title={CHANGE_PASSWORD.title}
      onClose={onClose}
      zIndex={90}
      wrap={{ tutorialId: host?.anchor('dialog', pbSlug(CHANGE_PASSWORD.title)) }}
      windowClassName="pb-um-dialog"
      windowStyle={{ width: 420 }}
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
          <DialogFooter frame="pb" buttons={footerButtons(CHANGE_PASSWORD.buttons, { wide: true, onPress: onClose })} />
    </ModalWindow>
  )
}
