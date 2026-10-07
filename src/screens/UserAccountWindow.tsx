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
  DEFAULT_AUTHOR_FOOTNOTE, DESKTOP_PROVIDERS, EVENT_SUBJECT_DIALOG, MEMBERSHIP_AUTHOR_FOOTNOTE,
  FORWARDING_RULES, INBOX_FORWARDING_BUTTONS, INBOX_FORWARDING_COLUMNS,
  INBOX_FORWARDING_ROWS, MEMBERSHIP_COLUMNS, MEMBERSHIP_NAME_INDENT, MEMBERSHIP_ROWS,
  NEW_USER_BAND, NEW_USER_BUTTONS, NEW_USER_MASK, NEW_USER_SECTIONS, NEW_USER_SIZE, NEW_USER_SYNC_X, NEW_USER_TITLE,
  NOTIFICATION_BLOCKS, NOTIFICATION_DEFAULTS, NOTIFICATION_METHODS, NOTIFICATION_PRIORITIES,
  OTHER_LIST_W, OTHER_PANE_BAND, OTHER_SETTINGS, SERVICE_GROUP_BAND, SERVICE_GROUP_COLUMNS, SERVICE_GROUP_FOOTNOTE, SERVICE_GROUP_FOOTNOTE_X,
  SERVICE_GROUP_ROWS, SHARED_WITH_ME_PANEL_COLUMNS, SHARED_WITH_ME_ROWS,
  SHARING_WORKSPACE_COLUMNS,
  SUBSCRIPTION_COLUMNS, SUBSCRIPTION_ROWS,
  UM_FOCUS, USER_ACCOUNT_ACCESS_PAD, USER_ACCOUNT_FOOTER, USER_ACCOUNT_HEADER, USER_ACCOUNT_HEADER_FRAME, USER_ACCOUNT_HEADER_GEOMETRY, USER_ACCOUNT_PAGE_FRAME, USER_ACCOUNT_PANEL,
  USER_ACCOUNT_FOOT, USER_ACCOUNT_SIZE, USER_ACCOUNT_TAB_WIDTHS, USER_ACCOUNT_TABS,
  USER_ALIAS_COLUMNS, USER_EXPERTISE, USER_ROLES,
  WORKSPACE_ACK_ITEMS, WORKSPACE_MGT_GEOMETRY,
  userListSpec,
  type NewUserField, type OtherField, type OtherSetting, type UserColumn, type UserRow,
} from '../data/userManagement'
import type { PBColumn } from '../pb'
import { UMField as Field, UM_CSS, umColumns, umField as anchorField } from './UserManagementKit'
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
 *   1. the sunken panel every tab page is cut from — PBGroupBox at a 21px
 *      band, a #7B7B7B frame with a #DFDFDF line inside it and a #767676
 *      band rule (2026-10-06, 1x; the kit's is #b6b6b6), its body a flex
 *      column on the face; a grid inside draws no border of its own. A box
 *      that is not a PBGroupBox (Memberships, Subscription, Other) takes
 *      the same two lines from `pb-ua-box`;
 *   2. a band's buttons butted edge to edge and filling its height, the
 *      command-row rectangle rather than the kit's 15px small button;
 *   3. the ten tab widths, which are not one padding round the caption;
 *   4. `Workspaces Shared With Me`: bold black captions on white over a black
 *      rule, in a 35px header;
 *   5. a panel fills what its page leaves (the 2026-10-06 captures paint User
 *      Alias and Service Group white to the foot), unless it is given a size;
 *   6. the Associated Provider(s) grid's empty face, a #FBFBFB → #DCDCDC
 *      left-to-right wash (2026-10-06);
 *   7. the tab page's Win32 frame — white down the left, #DDDDDD right and
 *      bottom with #F8F8F8 inside, white inside that along the bottom, and
 *      #F8F8F8 under the tab rule (2026-10-06). The kit's page has none.
 */
const PANEL = USER_ACCOUNT_PANEL
const FRAME = USER_ACCOUNT_PAGE_FRAME
const UA_CSS = `
.pb-ua-panel { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0; }
.pb-ua-assoc .pb-dw { background: linear-gradient(to right, #fbfbfb, #dcdcdc); }
.pb-ua-panel > .pb-groupbox { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; border-color: ${PANEL.border}; background: var(--pb-face); }
.pb-ua-panel > .pb-groupbox > .pb-band { border-bottom-color: ${PANEL.bandRule}; padding-right: 0; }
.pb-ua-panel > .pb-groupbox > div:last-child { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; position: relative; border: 1px solid ${PANEL.inner}; }
.pb-ua-box { border: 1px solid ${PANEL.border}; padding: 1px; box-shadow: inset 0 0 0 1px ${PANEL.inner}; }
.pb-ua-panel .pb-dw, .pb-ua-box .pb-dw { border: 0; }
.pb-ua-tabs .pb-um-pane { border-color: ${PANEL.border}; }
.pb-ua-tabs .pb-um-pane > .pb-band { min-height: 21px; border-bottom-color: ${PANEL.bandRule}; }
.pb-ua-tabs .pb-tabs__page {
  border-left: ${FRAME.leftW}px solid ${FRAME.left}; border-right: 1px solid ${FRAME.edge}; border-bottom: 1px solid ${FRAME.edge};
  box-shadow: inset 0 1px ${FRAME.highlight}, inset -1px 0 ${FRAME.highlight}, inset 0 -1px ${FRAME.highlight}, inset 0 -2px ${FRAME.left};
}
.pb-ua-bandbtns { display: flex; align-self: stretch; }
.pb-ua-bandbtns > .pb-cmdrow__btn { height: auto; margin-left: -1px; }
.pb-ua-tabs .pb-tabs__strip { padding-left: 1px; }
${USER_ACCOUNT_TAB_WIDTHS.map((w, i) => `.pb-ua-tabs .pb-tabs__strip--fixed > .pb-tabs__tab:nth-child(${i + 1}) { min-width: ${w}px; }
.pb-ua-tabs .pb-tabs__strip--fixed > .pb-tabs__tab.is-active:nth-child(${i + 1}) { min-width: ${w + 4}px; }`).join('\n')}
.pb-ua-shared .pb-dw__table > thead > tr > th { height: 35px; vertical-align: bottom; padding-bottom: 3px; background: #fff; }
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
  const HF = USER_ACCOUNT_HEADER_FRAME

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
          {/* the fixed block above the strip (2026-10-02 TRAINING capture,
              1x 2026-10-06): three columns of labels with BOLD read-only
              values in a two-tone frame, Change Name at the top right */}
          <div style={{
            position: 'relative', height: g.h, flex: 'none', boxSizing: 'border-box', background: 'var(--pb-face)', marginTop: 1,
            borderTop: `1px solid ${HF.top[0]}`, borderBottom: `1px solid ${HF.bottom[1]}`,
            boxShadow: `inset 0 1px ${HF.top[1]}, inset 0 -1px ${HF.bottom[0]}`,
          }}>
            {USER_ACCOUNT_HEADER.map((col, i) => {
              const at = g.columns[i]!
              return col.map((f, j) => (
                <Line key={f.key} y={g.rows[j]!} h={g.pitch}>
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

          <DialogFooter frame="pb" height={USER_ACCOUNT_FOOT.h} padding={`${USER_ACCOUNT_FOOT.padTop}px 9px 0`} style={{ alignItems: 'flex-start', boxSizing: 'border-box' }} gap={USER_ACCOUNT_FOOT.gap} buttons={sized(footerButtons(USER_ACCOUNT_FOOTER, { wide: true, onPress: b => { if (b === 'Apply Changes') { saveSettings({ ...draft, saves: saved.saves + 1 }); saveAliases(draft.aliases) }; onClose() } }), USER_ACCOUNT_FOOT.button, USER_ACCOUNT_FOOT.buttonH)} />
    </ModalWindow>
  )
}

type AccountDraftProps = { row: UserRow; draft: AccountSettings; set: (patch: Partial<AccountSettings>) => void }
function UserAccountPage({ tab, row, draft, set }: AccountDraftProps & { tab: string }) {
  switch (tab) {
    case 'User Account': return <UserAccountTab row={row} draft={draft} set={set} />
    case 'Module / Window Access': return <ModuleWindowAccessTab override pad={USER_ACCOUNT_ACCESS_PAD} />
    /* Tabs 3 and 4 were captured at SECURITY PROFILE level only on the help
       site (`e361c4e01d11`, `9e179125c6d6`), and `302650` refuses to describe
       the user level. Both user-level panes are captured now: Special
       Functions in the 2026-10-02 TRAINING capture (the Override column
       beside Execute), Report Access in 304021 `9ca90685`. */
    case 'Special Functions': return <SpecialFunctionsTab override pad={USER_ACCOUNT_ACCESS_PAD} />
    /* the user-level Report Access IS captured, in 304021 `9ca90685`
       (Override + Access / Print per report): screens/ReportAccessPane.tsx */
    case 'Report Access': return <ReportAccessPane override pad={USER_ACCOUNT_ACCESS_PAD} />
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
  const p = USER_ACCOUNT_PANEL.pad
  return <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`, ...style }}>{children}</div>
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
    <Inset style={{ paddingBottom: PANEL.pageBottom['User Account'] }}>
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
   Provider window's list), 366 wide.

   2026-10-06 capture (1:1), New pressed: the new row is current, its Start
   Date holds the caret on the edit mask's empty value `0000.00.00`, and the
   Source cell is a plain salmon cell — a DataWindow paints a column's drop
   button only while that column has focus (`ALIAS_CSS`).                  */

/** what a date edit mask shows with no date in it */
const EMPTY_DATE_MASK = '0000.00.00'
const ALIAS_CSS = `
.pb-ua-alias td .pb-dddw:not(:focus-within) > .pb-field { border-color: transparent; background: transparent; box-shadow: none; }
.pb-ua-alias td .pb-dddw:not(:focus-within) > .pb-inputgroup__btn--drop { visibility: hidden; }
`

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
    <Inset style={{ paddingTop: PANEL.tight.top, paddingBottom: PANEL.pageBottom['User Alias'] }}>
      <Panel
        band={PANEL.tight.band}
        title="User Alias List"
        right={<PanelButtons scope="user-alias" buttons={[['New', 53], ['Delete', 53]]} onPress={b => {
          set({ aliases: b === 'New' ? [...rows, { start: EMPTY_DATE_MASK, end: '', source: '', value: '', note: '' }] : rows.filter((_, i) => i !== cur) })
          setCur(b === 'New' ? rows.length : 0)
        }} />}
      >
        <style>{ALIAS_CSS}</style>
        <div className="pb-ua-alias" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)' }}>
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
    <Inset style={{ gap: g.gap, paddingTop: g.top, paddingBottom: PANEL.pageBottom['Workspace Mgt'] }}>
      <Panel
        style={{ height: g.inboxH, flex: 'none' }}
        band={PANEL.tight.band}
        title="Inbox Forwarding"
        right={(
          <PanelButtons
            scope="inbox-forwarding"
            buttons={INBOX_FORWARDING_BUTTONS.map((b, i) => [b, g.inboxButtons[i]!] as const)}
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
          band={PANEL.tight.band}
          title="Sharing Workspace With"
          right={<PanelButtons scope="sharing-workspace" buttons={[['New', g.newDeleteButtons[0]!], ['Delete', g.newDeleteButtons[1]!]]} onPress={b => { set({ sharing: b === 'New' ? [...draft.sharing, { start: MOIS_TODAY_STAMP, stop: '', user: '', note: '' }] : draft.sharing.filter((_, i) => i !== shareCur) }); setShareCur(b === 'New' ? draft.sharing.length : 0) }} />}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)' }}>
            <PBDataWindow columns={shareColumns} rows={draft.sharing} current={shareCur} onCurrentChange={setShareCur} empty=" " />
          </div>
        </Panel>
        {/* read-only: a 31px #C8DCFA caption band of its own, then bold
            captions on white; an empty stop date renders as `--` */}
        <div className="pb-ua-shared pb-ua-box" style={{ width: g.sharedW, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--pb-window)' }}>
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
  return (
    <Inset>
      <div className="pb-ua-box" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
        {/* 1x 2026-10-06: a 112px strip; the group 7 in, 9 down, 453 wide and
            89 tall, its two 17px drops at 164 (217 wide) */}
        <div className="pb-row" style={{ alignItems: 'stretch', gap: 0, height: 112, flex: 'none' }}>
          <div style={{ flex: '1 1 auto', minWidth: 0, padding: '3px 16px 0 7px' }}>
            <Group title="Other Settings" h={89}>
              <Line y={24}>
                {/* the captions sit 1 above the drops' centre (1x) */}
                <At x={9} style={{ top: -1, bottom: 1 }}>Default Desktop Provider:</At>
                <At x={163}><PBSelect w={217} style={{ height: 17 }} options={DESKTOP_PROVIDERS} /></At>
              </Line>
              <Line y={43}>
                <At x={9} style={{ top: -1, bottom: 1 }}>Default Author*:</At>
                <At x={163}><PBSelect w={217} style={{ height: 17 }} options={DESKTOP_PROVIDERS} /></At>
              </Line>
              {/* this tab's footnote is the longer one, wrapped (2026-10-06) */}
              <div style={{ position: 'absolute', left: 164, top: 55, width: 285, color: NOTE_INK, lineHeight: '13px', whiteSpace: 'normal' }}>{MEMBERSHIP_AUTHOR_FOOTNOTE}</div>
            </Group>
          </div>
          <div className="pb-ua-assoc" style={{ width: 475, flex: 'none', display: 'flex', borderLeft: `1px solid ${PANEL.border}` }}>
            <TabGrid columns={umColumns(ASSOCIATED_PROVIDER_COLUMNS)} rows={ASSOCIATED_PROVIDER_ROWS} />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${PANEL.border}`, borderBottom: `1px solid ${PANEL.bandRule}`, ['--pb-band-h' as string]: `${PANEL.tight.band - 1}px` }}>
          <PBBand>Membership List</PBBand>
        </div>
        {/* no gridlines; the 30px header row is the toolbar (2026-10-06) */}
        <HeaderToolbarList columns={MEMBERSHIP_COLUMNS} rows={MEMBERSHIP_ROWS} scope="membership" rowKey="name" headIndent={MEMBERSHIP_NAME_INDENT} />
      </div>
    </Inset>
  )
}

/* --- tab 8: `Service Group` ----------------------------------------------
   `109df8904120`; laid out to the 2026-10-06 capture (1:1): the inset
   sunken panel the other tabs use, its grey `Service Group(s) / Pathway(s)`
   band carrying a 76px `Change` butted at its right; under it the grid, no
   gutter, its LEFT-set captions at 6 / 220 / 591 in from the panel's rule.
   The footnote sits inside the white, 10 above the panel's foot, set at the
   Alternate Launch Modes column's left.                                    */

function ServiceGroupTab() {
  return (
    <Inset>
      <Panel title={SERVICE_GROUP_BAND} right={<PanelButtons scope="service-group" buttons={[['Change', 76]]} />}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)', position: 'relative' }}>
          <PBDataWindow<UserRow> columns={umColumns(SERVICE_GROUP_COLUMNS)} rows={SERVICE_GROUP_ROWS} gutter={false} empty=" " style={{ ['--pb-dw-row-h' as string]: '19px' }} />
          {/* sic: "all user have access" */}
          <span style={{ position: 'absolute', left: SERVICE_GROUP_FOOTNOTE_X, bottom: 4 }}>{SERVICE_GROUP_FOOTNOTE}</span>
        </div>
      </Panel>
    </Inset>
  )
}

/* --- tab 9: `Subscription` -----------------------------------------------
   `f9aba57883ac`; laid out to the 2026-10-06 capture (1:1). No band: one
   bordered list inset like the other tabs' panels, whose 30px header row
   doubles as the toolbar — GREY captions left-set over columns that carry
   no rules, and `Add` (57 x 20) IN the row — and every row carries its own
   Edit / Delete. The Subject cell renders a secondary grey qualifier beside
   the value. Memberships' list is drawn the same way (`HeaderToolbarList`). */

const LIST_HEAD_INK = '#818181'
const HEAD_TOOLBAR_CSS = `
.pb-ua-headbar .pb-dw__table > thead > tr > th { height: 30px; color: ${LIST_HEAD_INK}; border-right-color: transparent; }
.pb-ua-headbar .pb-dw__table > thead > tr > th:hover { background: var(--pb-dw-header); }
`

/**
 * A list whose header row is its toolbar: the captions left-set and grey,
 * `Add` in the trailing column's caption and an Edit / Delete pair on every
 * row (Subscription, Memberships). The trailing column takes what is left of
 * the width, so the blue header runs the full list as the captures show.
 */
function HeaderToolbarList({ columns, rows, scope, rowKey, current, onCurrentChange, onAdd, cells, headIndent = 0 }: {
  columns: UserColumn[]
  /** a column's own cell painter, keyed by column */
  cells?: Record<string, (r: UserRow) => ReactNode>
  rows: UserRow[]
  scope: string
  rowKey: string
  current?: number
  onCurrentChange?: (i: number) => void
  onAdd?: () => void
  /** a first caption set in further than the cells' padding (Membership's `Name`) */
  headIndent?: number
}) {
  const btn: CSSProperties = { width: 57, minWidth: 0, height: 20, padding: 0 }
  const kit = umColumns(columns.map((c) => ({ ...c, headAlign: 'left' as const })))
    .map((c) => (cells?.[c.key] ? { ...c, render: cells[c.key] } : c))
  if (headIndent && kit[0]) kit[0] = { ...kit[0], header: <span style={{ paddingLeft: headIndent }}>{kit[0].header}</span> }
  return (
    <div className="pb-ua-headbar" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: 'var(--pb-window)' }}>
      <style>{HEAD_TOOLBAR_CSS}</style>
      <PBDataWindow<UserRow>
        rows={rows}
        current={current}
        onCurrentChange={onCurrentChange}
        rules={false}
        gutter={false}
        rowTutorialId={(r) => `host.mois.row.${scope}-${pbSlug(String(r[rowKey] ?? ''))}`}
        columns={[
          ...kit,
          {
            key: 'actions',
            headAlign: 'left',
            header: <PBButton command={`${scope}-add`} onClick={onAdd} style={btn}>Add</PBButton>,
            render: (r: UserRow) => (
              <span className="pb-row" style={{ gap: 3 }}>
                <PBButton command={`${scope}-edit-${pbSlug(String(r[rowKey] ?? ''))}`} style={{ ...btn, height: 19 }}>Edit</PBButton>
                <PBButton style={{ ...btn, height: 19 }}>Delete</PBButton>
              </span>
            ),
          },
        ]}
        empty=" "
      />
    </div>
  )
}

function SubscriptionTab() {
  const [cur, setCur] = useState(0)
  const [pick, setPick] = useState(false)
  /* the Subject cell's grey qualifier beside the value */
  const subject = (r: UserRow) => (
    <>
      {String(r.subject ?? '')}
      {r.qualifier ? <span style={{ color: '#808080' }}>{`  ${r.qualifier}`}</span> : null}
    </>
  )

  return (
    <Inset style={{ paddingLeft: PANEL.subscriptionX.left, paddingRight: PANEL.subscriptionX.right, paddingBottom: PANEL.pageBottom.Subscription }}>
      <div className="pb-ua-box" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <HeaderToolbarList
          columns={SUBSCRIPTION_COLUMNS}
          rows={SUBSCRIPTION_ROWS}
          cells={{ subject }}
          scope="subscription"
          rowKey="event"
          current={cur}
          onCurrentChange={setCur}
          onAdd={() => setPick(true)}
        />
      </div>
      {pick && <EventSubjectSelectionDialog onClose={() => setPick(false)} />}
    </Inset>
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

/* --- tab 10: `Other` -----------------------------------------------------
   Laid out to the 2026-10-06 captures (data/userManagement.ts tab 10): the
   `Setting` list beside a bordered white pane whose controls sit at the
   measured x / y of each setting.                                          */

const OTHER_CSS = `
.pb-ua-other { --pb-dw-row-h: 24px; }
.pb-ua-other .pb-dw__table > thead > tr > th { color: ${LIST_HEAD_INK}; }
.pb-ua-other .pb-dw__table > tbody > tr:nth-child(even):not(.is-current) { background: #e8e8e8; }
`
/** the pane's etched group rule and its rule under the description */
const OTHER_GROUP_RULE = '#e1e1e1'
const OTHER_RULE = '#aeaeb1'

function OtherTab() {
  const [cur, setCur] = useState(0)
  const setting: OtherSetting = OTHER_SETTINGS[cur] ?? OTHER_SETTINGS[0]!

  return (
    <div className="pb-row" style={{ alignItems: 'stretch', gap: 7, flex: '1 1 auto', minHeight: 0, padding: '4px 5px 11px 6px' }}>
      <style>{OTHER_CSS}</style>
      <div className="pb-ua-other pb-ua-box" style={{ width: OTHER_LIST_W, flex: 'none', display: 'flex' }}>
        <PBDataWindow<{ name: string }>
          rows={OTHER_SETTINGS.map((s) => ({ name: s.name }))}
          current={cur}
          onCurrentChange={setCur}
          gutter={false}
          zebra={false}
          rules={false}
          columns={[{ key: 'name', header: 'Setting', headAlign: 'left' }]}
          rowTutorialId={(r) => `host.mois.row.setting-${pbSlug(r.name)}`}
        />
      </div>
      <div className="pb-ua-box" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--pb-window)' }}>
        {setting.name === 'User Agreements' ? <UserAgreementResponses /> : (
          <>
            <div style={{ height: OTHER_PANE_BAND, flex: 'none', display: 'flex', alignItems: 'center', paddingLeft: 10, background: 'var(--pb-dw-header)' }}>
              {setting.band ?? setting.name}
            </div>
            {/* every figure is from the pane's outer border: shift the layer
                back over the 1px rule so a measured y lands where it should */}
            <div key={setting.name} style={{ position: 'absolute', left: -1, right: -1, top: -1, bottom: -1, pointerEvents: 'none' }}>
              {setting.desc && <Line y={setting.descY ?? 41}><At x={setting.labelX}>{setting.desc}</At></Line>}
              {setting.rule && <div style={{ position: 'absolute', left: 1, right: 1, top: 55, borderTop: `1px solid ${OTHER_RULE}` }} />}
              <div style={{ pointerEvents: 'auto' }}>
                {setting.fields.map((f, i) => <OtherControl key={i} field={f} setting={setting} />)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OtherControl({ field, setting }: { field: OtherField; setting: OtherSetting }) {
  const [choice, setChoice] = useState(field.kind === 'radios' ? field.value : undefined)

  if (field.kind === 'group') {
    return (
      <>
        <div style={{ position: 'absolute', left: field.left, top: field.top, width: field.right - field.left + 1, height: field.bottom - field.top + 1, border: `1px solid ${OTHER_GROUP_RULE}`, boxSizing: 'border-box' }}>
          <span style={{ position: 'absolute', left: 10, top: -8, padding: '0 1px', background: 'var(--pb-window)', whiteSpace: 'pre' }}>{field.caption}</span>
        </div>
        {field.fields.map((f, i) => <OtherControl key={i} field={f} setting={setting} />)}
      </>
    )
  }
  if (field.kind === 'note') {
    const ink: CSSProperties | undefined = field.ink === 'bold' ? { fontWeight: 700 } : field.ink === 'grey' ? { color: '#828282' } : undefined
    return <Line y={field.y}><At x={field.x ?? setting.labelX} style={ink}>{field.text}</At></Line>
  }
  if (field.kind === 'button') {
    return (
      <PBButton command={pbSlug(field.label)} style={{ position: 'absolute', left: field.x, top: field.y - field.h / 2, width: field.w, height: field.h, minWidth: 0, padding: 0 }}>
        {field.label}
      </PBButton>
    )
  }
  if (field.kind === 'radios') {
    return (
      <>
        {field.label && <Line y={field.y ?? field.options[0]!.y}><At x={setting.labelX}>{field.label}</At></Line>}
        {field.options.map((o) => (
          <Line key={o.label} y={o.y}>
            <At x={o.x}>
              <PBRadio name={`other-${field.name}`} label={o.label} checked={choice === o.label} onChange={() => setChoice(o.label)} />
            </At>
          </Line>
        ))}
      </>
    )
  }
  const label = field.label
    ? (field.kind === 'drop' && field.labelEnd !== undefined ? <At end={field.labelEnd}>{field.label}</At> : <At x={setting.labelX}>{field.label}</At>)
    : null
  const x = field.x ?? setting.controlX
  if (field.kind === 'drop') {
    return (
      <Line y={field.y}>
        {label}
        <At x={x}><PBSelect w={field.w} options={field.options} defaultValue={field.value ?? ''} data-tutorial-id={anchorField(field.label)} /></At>
      </Line>
    )
  }
  return (
    <Line y={field.y}>
      {label}
      <At x={x}>
        <PBInput w={field.w} defaultValue={field.value} style={field.h ? { height: field.h } : undefined} {...(field.label ? { 'data-tutorial-id': anchorField(field.label) } : {})} />
      </At>
      {field.lookup && (
        <At x={field.lookup.x}>
          <PBButton style={{ width: field.lookup.w, height: field.h ?? 18, minWidth: 0, padding: 0 }}>...</PBButton>
        </At>
      )}
    </Line>
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
