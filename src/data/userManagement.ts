/* ============================================================================
   Administration ▸ User Management — Security Profiles, User Accounts, User
   Groups — plus Administration ▸ Configuration ▸ Password Policy.

   PROVENANCE. Every header, command row, filter strip and column table below
   is transcribed from a named help-site capture, cited per node in `source`.
   The figures are PIL measurements off those captures, normalised to 1:1; the
   two capture groups that were shot at 1.25x (the User Account tab set:
   `109df8904120`, `f9aba57883ac`, `10777195a523`) were divided by 1.25 before
   being written here, and the 1:1 group (`42be29fdd885`, `cd62a8ecb55f`,
   `c4c90b65d9f8`, `d9af05150d60`, all 974x714) was not.

   ONE SHELL, TWO COMMAND-ROW DIALECTS. The three User Management list nodes
   are the same window as the twelve Clinic Management ones — navy view
   header, a row of 81px buttons, an optional column-aligned filter strip, a
   DataWindow — and all three carry the identical four buttons. Password
   Policy is the odd one: it lives under **Configuration**, not User
   Management (`303193` says so in prose: "Open the Password Policy folder in
   the Configuration section"), it has no DataWindow at all, and its command
   row is only `Edit Policy` / `Close Window`.

   THE USER ACCOUNTS GRID IS THE CORPUS OUTLIER. Every other admin grid in
   this family runs a 19px detail band under a 16px single-line blue header.
   `28bcccbceb53` — the live 2023 capture, article Rev Date 2023-03-21 — runs
   **24px rows under a 34px two-row banded header**, draws **no vertical
   gridlines at all**, and puts an `Overrides` super-column across three
   sub-columns. Glyph cap-heights are 9px in both builds and the toolbar
   buttons are 81x22 in both, so this is a real DataWindow change and not a
   DPI artefact. The 2019 build (`a58fd3359aa3`) shows the same grid at
   19/29 — identical to the Security Profile's `User List` tab — and is
   recorded as a commented constant rather than merged into the live one.

   SHIPPED TYPOS, kept verbatim:
     - `Require at least on Number.`      (Password Policy, `3ce40b48cff3`)
     - `Require at least one Special Character`  — no trailing period, where
       the two checkboxes either side of it have one
     - `(note: all user have access to the Main Program)`  (Service Group tab)
     - `Reasign a User's incomplete Tasks and Messages.`   (DEACON, `893775c37c7a`)
     - `Workspace Mgt` as the sixth tab caption, where the prose of `302650`
       writes "Workspace Management (CTRL + 6)". The live 10-tab strip reads
       `Workspace Mgt`; the 6-tab 2019 window did spell it out.

   The records are synthetic training data. No capture in the corpus prints
   the *contents* of the Security Profile, User Account or User Group grids in
   a form worth transcribing as ground truth, so the rows below are the
   emulator's usual cast under the naming convention `303183` states —
   `User Name - ahalliwell - (first initial, last name)`,
   `Full Name - HALLIWELL, ALYSSA (Last name, First name)`. Only the two
   inactive User Group members, `MCPHILLIPS, MARIE*` and `SAMWAYS, KRYSTLE*`,
   are the capture's own.
   ========================================================================= */

import { MOIS_TODAY } from './patients'
import { rosterProvider } from './clinicRoster'

/* --- colours this family adds to the ordinary DataWindow palette ---------- */

/** Inactive record — greys every cell of the row. */
export const UM_INACTIVE = '#9c9c9c'
/** Non-zero override counts; the two BH-internal Special Functions rows. */
export const UM_RED = '#ff0000'
/** Focused / in-edit field inside a selected row. */
export const UM_FOCUS = '#ffc09c'
/** Checked row in the `User Security Profiles` picker. */
export const UM_PICKED = '#9cfb9c'

/* --- the command-row dialects --------------------------------------------- */

export type UserDialect = 'edit-record' | 'policy'

/** Every button in this family measures 81 x 22, butted edge to edge. */
export const USER_COMMANDS: Record<UserDialect, string[]> = {
  'edit-record': ['New Record', 'Delete Record', 'Edit Record', 'Close Window'],
  /* `3ce40b48cff3` / `4eaa5ed0bf3f`: two buttons, not four. */
  policy: ['Edit Policy', 'Close Window'],
}

/* --- a column ------------------------------------------------------------- */

export type UserColumn = {
  key: string
  /** the caption as shipped */
  header: string
  /** measured span between column separators, px at 1:1 */
  width?: number
  align?: 'left' | 'center' | 'right'
  /** caption alignment where it differs from the cells' */
  headAlign?: 'left' | 'center' | 'right'
  /** drawn as a 13px tick box rather than as text */
  check?: boolean
  /**
   * The User Accounts grid's top header row. `label` centres a caption over
   * this column; `rule` draws the 51px horizontal rule that flanks it.
   */
  band?: { kind: 'label'; text: string } | { kind: 'rule' }
  /** `-` for zero, the count in #FF0000 otherwise */
  override?: boolean
}

/* --- the filter strip ------------------------------------------------------ */

/** One white box per filterable column, aligned to that column's bounds. */
export type UserFilter = { col: number; w: number }[]

/* --- a list screen --------------------------------------------------------- */

export type UserListSpec = {
  node: string
  /** the tree label, for reference */
  label: string
  /** the view header, which for two of the three is NOT the tree label */
  header: string
  dialect: UserDialect
  filter?: UserFilter
  columns: UserColumn[]
  rows: UserRow[]
  /** measured detail-band pitch; 19 everywhere but User Accounts */
  pitch: number
  /** measured column-header band height; 16 unless the header is two rows */
  headH: number
  /** measured row-indicator gutter, painted through `--pb-dw-gutter-width` */
  gutter: number
  /** the zebra starts on the second row (grey) rather than the first
      (2026-10-02 TRAINING capture 14) */
  zebraFlipped?: boolean
  /** the header captions' ink where it is not black (capture 14: the soft
      #808080 caption grey, with no separators between them) */
  headInk?: string
  /** vertical gridlines; false only on User Accounts */
  rules: boolean
  /** which field flips a row to the #9C9C9C inactive ink, and on what value */
  inactive?: { key: string; value: string }
  /** `host.mois.row.<anchorPrefix>-<slug of row[anchorKey]>` */
  anchorPrefix: string
  anchorKey: string
  /**
   * Ring a CELL rather than the row. The User Accounts grid's nine columns
   * measure 804px against an ~803px work area, so the row is as wide as the
   * viewport or wider and a lesson must ring one cell of it — the same call
   * the Computer List makes in `clinicManagement.ts`. `303186`, `303188` and
   * `303351` all send the learner to the user's NAME, so that is the cell.
   */
  anchorCell?: string
  /** which editor window Edit Record / a double-click opens */
  editor?: 'security-profile' | 'user-account' | 'user-group'
  /** the New Record dialog, where one is captured */
  newDialog?: 'new-user' | 'user-group-detail' | 'new-security-profile'
  source: string
}

export type UserRow = Record<string, string | boolean | undefined>

/* ===========================================================================
   3.1  User Security Profiles          `5cef041ee5fd`
   ======================================================================== */
const SECURITY_PROFILES: UserListSpec = {
  node: 'ad-security-profiles',
  label: 'Security Profiles',
  header: 'User Security Profiles',
  dialect: 'edit-record',
  source: '303189 / 5cef041ee5fd (1:1, tree pitch 16px)',
  /* no filter row on this node */
  columns: [
    { key: 'profile', header: 'Security Profile', width: 150 },
    { key: 'desc', header: 'Description', width: 372 },
    /* data centred — probed left-pad 53 / right-pad 54 for the glyph "1" */
    { key: 'users', header: 'Number of Users', width: 111, align: 'center' },
  ],
  rows: [
    { profile: 'ADMIN', desc: 'Full administrative access', users: '2' },
    { profile: 'PHYSICIAN', desc: 'Physician - chart, orders, billing', users: '4' },
    { profile: 'NURSE', desc: 'Nursing - chart and MAR', users: '3' },
    { profile: 'MOA', desc: 'Medical office assistant - scheduler and billing', users: '5' },
    { profile: 'LOCUM', desc: 'Locum physician - no administration', users: '1' },
    { profile: 'RESIDENT', desc: 'Resident - chart under a preceptor', users: '2' },
    { profile: 'READ ONLY', desc: 'Read-only chart access', users: '1' },
    // Profile label supplied in the 2026-10-06 User Security Profiles captures.
    { profile: 'PRIMARY CARE ASSISTANT', desc: 'Primary care assistant', users: '0' },
    /* The rest of the names the 2026-10-06 User Security Profiles picker
       shows (a site's list, read off the visible rows; the descriptions are
       not captured, so none is invented), and the 2026-10-02 TRAINING
       capture's ALLIED HEALTH (TIER 1). `IMMUNIZATION REG AND SCHED` is
       as far as the picker's column shows it. */
    { profile: 'ALLIED HEALTH (TIER 1)', desc: '', users: '0' },
    { profile: 'ENHANCED ACCESS HIM', desc: '', users: '0' },
    { profile: 'ENHANCED ACCESS PCA', desc: '', users: '0' },
    { profile: 'ENHANCED ACCESS PSC', desc: '', users: '0' },
    { profile: 'IMMUNIZATION REG AND SCHED', desc: '', users: '0' },
    { profile: 'IMPRAVATA MAP', desc: '', users: '0' },
    { profile: 'PRIVACY', desc: '', users: '0' },
    { profile: 'PROVIDER (TIER 1)', desc: '', users: '0' },
    { profile: 'PROVIDER (TIER 2)', desc: '', users: '0' },
    { profile: 'REGIONAL ADMINISTRATOR', desc: '', users: '0' },
    { profile: 'REGIONAL BILLING', desc: '', users: '0' },
    { profile: 'REGIONAL TRAINER', desc: '', users: '0' },
  ],
  pitch: 19,
  headH: 16,
  /* 2026-10-02 TRAINING capture 02: 20 capture px */
  gutter: 17,
  rules: true,
  anchorPrefix: 'profile',
  anchorKey: 'profile',
  editor: 'security-profile',
  /* 2026-10-02 TRAINING capture 02 */
  newDialog: 'new-security-profile',
}

/* ===========================================================================
   3.2  User Accounts                   `28bcccbceb53` (live 2023)

   GEOMETRY, and exactly how much of it is measured.

   MEASURED off `28bcccbceb53`:
     - the filter strip sits at y 74-90 and carries four boxes, 183 / 117 /
       115 / 43 px, over Display Name / User Name / Role / Status. Nothing
       sits over Overrides, Effective or Expiry.
     - the header band runs y 96-129, i.e. **34px over two rows**.
     - the top row's single centred caption `Overrides` spans x 699-742,
       flanked by two 51px rules at x 641-691 and x 749-799 — so the
       **Overrides super-column is x 641-799, 159px**.
     - the bottom row's captions, by x-extent: Display Name 208-271,
       User Name 397-448, Role 520-540, Window 647-685, Functions 698-742,
       Reports 757-792, Effective 816-856, Expiry 892-918, Status 950-978.
     - the detail band is **24px** (Status glyph tops at 137, 161, 185, 209,
       233, ...).
     - there are no vertical gridlines anywhere in the grid.

   NOT MEASURED, and the spec says so outright: this DataWindow has neither
   vertical gridlines nor filter boxes over the right-hand columns, so **no
   column boundary can be read directly**. The widths below are *derived*
   from the figures above, as follows, and should not be quoted as
   measurements:
     - Overrides splits into three equal sub-columns, 159 / 3 = **53px** each
       (x 641 / 694 / 747). Fitting a centred caption into those three gives
       insets of 6 / 4 / 10 against ideal 7.5 / 4.5 / 9 — within 1.5px, which
       is what confirms the equal split.
     - Display Name, User Name and Role take their captions left-aligned at
       a common +5 inset, so each runs from its own caption-start minus 5 to
       the next one's: **189 / 123 / 121**, with Role landing exactly on the
       measured Overrides edge at x 641.
     - Effective, Expiry and Status take their captions *centred*: starting
       the run at the measured Overrides right edge (x 799), the widths
       **76 / 58 / 62** put all three captions at a +17 inset, which is the
       centred inset for each of them to within 1px. The grid then ends at
       x 995, which is the pane's right edge on a 1000px-wide window.
   The filter-box widths corroborate the first three (183 / 117 / 115 against
   189 / 123 / 121 — a box is inset inside its column), and give the only
   independent read on Status (43 against 62; the box does not fill it).
   ======================================================================== */

/**
 * The 2019 build of the same grid, `a58fd3359aa3`: **19px rows under a 29px
 * two-line header**, exactly like the Security Profile `User List` tab. Kept
 * as a constant rather than merged with the live figures, because the two are
 * different DataWindow builds and not two renderings of one.
 *
 * ```
 * const USER_ACCOUNTS_2019 = { pitch: 19, headH: 29 }
 * ```
 * Everything else about the 2019 grid — column set, the Overrides band, the
 * `-`/red override ink, the 81x22 buttons — is unchanged from the live one.
 */
const USER_ACCOUNTS: UserListSpec = {
  node: 'ad-users',
  label: 'User Accounts',
  header: 'User Accounts',
  dialect: 'edit-record',
  source: '303183 / 28bcccbceb53 (live 2023, art. Rev Date 2023-03-21, 1:1); '
    + '2019 build a58fd3359aa3 (19/29) recorded in the comment above',
  filter: [{ col: 0, w: 183 }, { col: 1, w: 117 }, { col: 2, w: 115 }, { col: 8, w: 43 }],
  columns: [
    { key: 'display', header: 'Display Name', width: 189, headAlign: 'left' },
    { key: 'user', header: 'User Name', width: 123, headAlign: 'left' },
    { key: 'role', header: 'Role', width: 121, headAlign: 'left' },
    { key: 'ovWindow', header: 'Window', width: 53, align: 'center', band: { kind: 'rule' }, override: true },
    { key: 'ovFunctions', header: 'Functions', width: 53, align: 'center', band: { kind: 'label', text: 'Overrides' }, override: true },
    { key: 'ovReports', header: 'Reports', width: 53, align: 'center', band: { kind: 'rule' }, override: true },
    { key: 'effective', header: 'Effective', width: 76, align: 'center' },
    { key: 'expiry', header: 'Expiry', width: 58, align: 'center' },
    { key: 'status', header: 'Status', width: 62, align: 'center' },
  ],
  rows: [
    { display: 'BEARDWOOD, WALTER', user: 'wbeardwood', role: 'PHYSICIAN', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2014.03.03', expiry: '', status: 'A' },
    { display: 'DHALIWAL, RUPINDER', user: 'rdhaliwal', role: 'NURSE', ovWindow: '0', ovFunctions: '1', ovReports: '0', effective: '2019.11.18', expiry: '', status: 'A' },
    { display: 'GRUBB, HELENA', user: 'hgrubb', role: 'NURSE', ovWindow: '2', ovFunctions: '0', ovReports: '0', effective: '2018.06.04', expiry: '', status: 'A' },
    { display: 'HALLIWELL, ALYSSA', user: 'ahalliwell', role: 'MOA', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2026.09.18', expiry: '', status: 'A' },
    { display: 'JALIL, AHMAD', user: 'ajalil', role: 'ADMIN', ovWindow: '1', ovFunctions: '3', ovReports: '1', effective: '2012.01.09', expiry: '', status: 'A' },
    { display: 'MCPHILLIPS, MARIE', user: 'mmcphillips', role: 'MOA', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2015.05.25', expiry: '2024.08.30', status: 'I' },
    { display: 'OKUDA, TIKA', user: 'tokuda', role: 'PHYSICIAN', ovWindow: '0', ovFunctions: '0', ovReports: '2', effective: '2016.09.12', expiry: '', status: 'A' },
    { display: 'ROSS, ADRIENNE', user: 'aross', role: 'NURSE', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2021.02.15', expiry: '', status: 'A' },
    { display: 'SAMWAYS, KRYSTLE', user: 'ksamways', role: 'MOA', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2017.07.10', expiry: '2025.12.31', status: 'I' },
    { display: 'SHEWCHUK, LEAH', user: 'lshewchuk', role: 'PHYSICIAN', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2013.10.21', expiry: '', status: 'A' },
    { display: 'SMITH, DALENE', user: 'dsmith', role: 'LOCUM', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2026.04.06', expiry: '2026.10.31', status: 'A' },
    // Fictional account for practising the supplied read-only → PCA scenario.
    { display: 'TRAINING, CASEY', user: 'ctraining', role: 'CLERICAL SUPPORT', profiles: 'READ ONLY', ovWindow: '0', ovFunctions: '0', ovReports: '0', effective: '2026.09.18', expiry: '', status: 'A' },
  ],
  pitch: 24,
  headH: 34,
  /* 2026-10-02 TRAINING capture 14: the names start 20 capture px in, so
     the gutter is 13 and the text its usual 4px past it */
  gutter: 13,
  rules: false,
  zebraFlipped: true,
  headInk: '#808080',
  inactive: { key: 'status', value: 'I' },
  anchorPrefix: 'user',
  anchorKey: 'user',
  anchorCell: 'display',
  editor: 'user-account',
  newDialog: 'new-user',
}

/* ===========================================================================
   3.3  User Group List                 `32e650d43334`, `db78e3c7a71f`
   ======================================================================== */
const USER_GROUPS: UserListSpec = {
  node: 'ad-user-groups',
  label: 'User Groups',
  header: 'User Group List',
  dialect: 'edit-record',
  source: '303203 / 32e650d43334, db78e3c7a71f (1:1)',
  /* two boxes only, under Name and Description; Notes and Active have none */
  filter: [{ col: 0, w: 204 }, { col: 1, w: 285 }],
  columns: [
    { key: 'name', header: 'Name', width: 208 },
    { key: 'desc', header: 'Description', width: 286 },
    { key: 'notes', header: 'Notes', width: 226 },
    { key: 'active', header: 'Active', width: 57, align: 'center', check: true },
  ],
  rows: [
    { name: "MOA'S", desc: 'Medical office assistants', notes: 'Front desk + billing', active: true },
    { name: 'PHYSICIANS', desc: 'All clinic physicians', notes: '', active: true },
    { name: 'NURSING', desc: 'RN / LPN', notes: 'Includes the NHVC nurse', active: true },
    { name: 'LAB DOWNLOAD', desc: 'Users configured for NHA lab downloads', notes: 'Alias code NHA', active: true },
    { name: 'RESIDENTS', desc: 'Residents A / B / C', notes: 'Reviewed each rotation', active: true },
    { name: 'FLU CLINIC 2024', desc: 'Seasonal immunization clinic', notes: 'Wound up 2024.12', active: false },
  ],
  pitch: 19,
  headH: 16,
  gutter: 15,
  rules: true,
  anchorPrefix: 'group',
  anchorKey: 'name',
  editor: 'user-group',
  newDialog: 'user-group-detail',
}

/* ===========================================================================
   3.4  Password Policy                 `3ce40b48cff3`, `4eaa5ed0bf3f`

   Not a grid: a form under a two-button command row, with two blue section
   captions. The node lives under **Configuration**, not User Management.
   ======================================================================== */

export type PolicyField =
  | { kind: 'num'; label: string; w: number; value: string }
  | { kind: 'check'; label: string; checked?: boolean }
  /** a label and its checkbox on one line — `Expires:` / `Force Passwords…` */
  | { kind: 'labelled-check'; label: string; check: string; checked?: boolean }
  | { kind: 'text'; label: string; w: number; value: string }

export type PolicySection = { caption: string; fields: PolicyField[] }

export const PASSWORD_POLICY: PolicySection[] = [
  {
    caption: 'Structure:',
    fields: [
      { kind: 'num', label: 'Minimum Length:', w: 34, value: '1' },
      { kind: 'check', label: 'Require at least one Capitalized Character.' },
      /* shipped typo: "at least on Number" */
      { kind: 'check', label: 'Require at least on Number.' },
      /* shipped inconsistency: this one has no trailing period */
      { kind: 'check', label: 'Require at least one Special Character' },
      /* read glyph-by-glyph off the bitmap */
      { kind: 'text', label: 'Special Character List:', w: 220, value: '!@#$%^&*()' },
    ],
  },
  {
    caption: 'Life Cycle:',
    fields: [
      { kind: 'num', label: 'Recycle Limit:', w: 34, value: '1' },
      { kind: 'labelled-check', label: 'Expires:', check: 'Force Passwords to Expire.' },
      { kind: 'num', label: 'Number Days before password expires:', w: 34, value: '90' },
    ],
  },
]

export const PASSWORD_POLICY_SPEC = {
  node: 'ad-password',
  label: 'Password Policy',
  header: 'Password Policy',
  dialect: 'policy' as const,
  source: '303193 / 3ce40b48cff3, 4eaa5ed0bf3f (1:1)',
}

/* ===========================================================================
   The `New User` dialog                `a58fd3359aa3`; re-measured off the
                                        2026-10-02 TRAINING capture

   2026-10-02 TRAINING capture (shot at 1.14x; every figure below is the
   capture's ÷ 1.14): a 611px window holding one sunken panel 578 wide, inset
   17 / 15 from the window's edge. The panel opens with a grey `New User`
   header band (bold black, ruled off — not a navy group caption) and is
   divided by full-width rules into four sections of 147 / 107 / 112 / 115:
   names and contact | Role .. Expiry | Security Profiles | Password ..
   `* Required Entry`. Labels start 16 in and every first control at 100, so
   the sections line up down the panel; the second and third controls of a
   line sit at their own measured x (`x` below, from the panel's left).
   `Create User` / `Cancel` (74 x 21) are centred on the face under it.

   No field is washed: the focused User Name edit is white in this capture,
   where the 2019 help-site capture drew MOIS's #FFC09C.
   ======================================================================== */

export type NewUserField =
  | { kind: 'text'; label: string; x: number; w: number; required?: boolean; value?: string; align?: 'center' }
  /**
   * A disabled grey edit with a `Synchronize with Name Fields` tick box
   * beside it — MOIS writes the field for you while the box is checked.
   */
  | { kind: 'sync'; label: string; x: number; w: number }
  /** an edit with a grey example to its right, aligned to the sync labels */
  | { kind: 'hint'; label: string; x: number; w: number; hint: string }
  | { kind: 'drop'; label: string; x: number; w: number; options: string[]; required?: boolean }
  /** the sunken list box + `Change` button */
  | { kind: 'profiles'; label: string; x: number; w: number; h: number; required?: boolean }
  /** pre-filled with masked text in the capture */
  | { kind: 'password'; label: string; x: number; w: number }
  | { kind: 'check'; label: string; x: number; check: string; checked?: boolean }
  | { kind: 'note'; x: number; text: string }

/** The controls sharing one line of the dialog, left to right. */
export type NewUserRow = NewUserField[]
/** A ruled-off section of the panel: its height and its lines' centres. */
export type NewUserSection = { h: number; rows: { y: number; fields: NewUserRow }[] }

export const NEW_USER_TITLE = 'New User'
export const NEW_USER_BAND = 'New User'
export const NEW_USER_BUTTONS = ['Create User', 'Cancel']
export const NEW_USER_SIZE = { w: 611, panelW: 578, band: 20, labelX: 16, controlX: 100 }
/** where the tick boxes and the `( ex: JCS )` example line up */
export const NEW_USER_SYNC_X = 286

/**
 * `Role` and `Expertise` are both Selection Lists (see the 62-row Selection
 * List Management table), so their drop lists are populated from the roster
 * the emulator already carries rather than from a capture — no capture of
 * either dropped list exists. Role opens blank in the 2026-10-02 capture.
 */
export const USER_ROLES = ['ADMIN', 'PHYSICIAN', 'NURSE', 'MOA', 'LOCUM', 'RESIDENT', 'READ ONLY', 'CLERICAL SUPPORT']
export const USER_EXPERTISE = ['', 'FAMILY PRACTICE', 'INTERNAL MEDICINE', 'MENTAL HEALTH', 'PAEDIATRICS', 'SURGERY']

export const NEW_USER_SECTIONS: NewUserSection[] = [
  { h: 147, rows: [
    { y: 20, fields: [
      { kind: 'text', label: 'User Name:', x: 100, w: 180, required: true },
      { kind: 'text', label: 'Prefix:', x: 373, w: 70 },
      { kind: 'text', label: 'Suffix:', x: 478, w: 71 },
    ] },
    { y: 40, fields: [
      { kind: 'text', label: 'First Name:', x: 100, w: 102, required: true },
      { kind: 'text', label: 'Middle Name:', x: 286, w: 102 },
      { kind: 'text', label: 'Last Name:', x: 449, w: 102, required: true },
    ] },
    { y: 61, fields: [{ kind: 'sync', label: 'Display Name:', x: 100, w: 180 }] },
    { y: 82, fields: [{ kind: 'sync', label: 'Signature:', x: 100, w: 180 }] },
    { y: 103, fields: [{ kind: 'hint', label: 'Initials:', x: 100, w: 86, hint: '( ex: JCS )' }] },
    { y: 124, fields: [
      { kind: 'text', label: 'Cell Phone:', x: 100, w: 102 },
      { kind: 'text', label: 'Email:', x: 298, w: 162 },
    ] },
  ] },
  { h: 107, rows: [
    { y: 20, fields: [{ kind: 'drop', label: 'Role:', x: 100, w: 313, options: ['', ...USER_ROLES], required: true }] },
    { y: 41, fields: [{ kind: 'drop', label: 'Expertise:', x: 100, w: 313, options: USER_EXPERTISE }] },
    /* MOIS fills today's date in for you (`303183`), centred in its edit */
    { y: 61, fields: [{ kind: 'text', label: 'Effective:', x: 100, w: 86, value: MOIS_TODAY, align: 'center' }] },
    { y: 82, fields: [{ kind: 'text', label: 'Expiry:', x: 100, w: 86 }] },
  ] },
  /* a 129 x 88 sunken list, its top 11 below the rule; Change 70 x 21 */
  { h: 112, rows: [
    { y: 21, fields: [{ kind: 'profiles', label: 'Security Profiles:', x: 100, w: 129, h: 88, required: true }] },
  ] },
  { h: 115, rows: [
    { y: 22, fields: [{ kind: 'password', label: 'Password:', x: 100, w: 125 }] },
    { y: 43, fields: [{ kind: 'password', label: 'Confirm:', x: 100, w: 125 }] },
    /* checked by default */
    { y: 64, fields: [{ kind: 'check', label: 'Reset Pswrd:', x: 100, check: 'User To Choose New Password On Next Login', checked: true }] },
    { y: 86, fields: [{ kind: 'note', x: 98, text: '* Required Entry' }] },
  ] },
]

/** What the masked Password / Confirm edits open holding. */
export const NEW_USER_MASK = '*********'

/* ===========================================================================
   The `User Account` window            974 x 714

   Ten tabs, exactly as `42be29fdd885` renders them. Above the strip, a fixed
   three-column header block and a `Change Name` button; below it, a
   `Apply Changes` / `Cancel` footer.
   ======================================================================== */

export const USER_ACCOUNT_TABS = [
  'User Account',
  'Module / Window Access',
  'Special Functions',
  'Report Access',
  'User Alias',
  /* shipped caption; `302650`'s prose writes "Workspace Management (CTRL + 6)" */
  'Workspace Mgt',
  'Memberships',
  'Service Group',
  'Subscription',
  'Other',
]

/* 974 x 714 in `42be29fdd885`; the 2026-10-02 TRAINING capture's window is
   1108 x 820 at 1.14x — 972 x 719. The width stays.

   THE HEIGHT is set from the 2026-10-06 captures, the first taken at 1x, so
   the client area is MOIS's own pixels: under the title bar a 62px header
   block, the 24px tab strip, a 557px tab page (its frame included) and a
   43px foot — Apply Changes / Cancel 89 x 24, 13 apart, 12 under the page's
   bottom edge. The title bar and frame are Windows' and follow the display
   (32px at 100%, the kit's 27.5 at 200%), so the window is that client area
   plus the kit's own chrome: 1 + 27.5 + 1 + 62 + 24 + 557 + 43 + 1 — the 1
   a row of face between the title bar and the header's rule (the captures'
   rule is 33 under the frame, the 100% bar 31 + 1). */
export const USER_ACCOUNT_SIZE = { w: 974, h: 716.5 }
export const USER_ACCOUNT_FOOT = { h: 43, button: 89, buttonH: 24, gap: 13, padTop: 12 }
export const USER_ACCOUNT_FOOTER = ['Apply Changes', 'Cancel']

/**
 * The fixed block above the tab strip (2026-10-02 TRAINING capture,
 * re-measured at 1x off the 2026-10-06 captures): three columns of three
 * label / value pairs, the values in **bold read-only text**, not edit boxes,
 * on the window face. The block is 62px and framed in two-tone rules, as a
 * Win32 static edge draws them: #7D7D7D over #D1D1D1 along the top, #7C7C7C
 * over #D5D5D5 along the bottom (USER_ACCOUNT_HEADER_FRAME). The first two
 * columns' labels are left-set (x 10 / 285) with values at 83 / 359; the
 * third column's labels are right-set against 612 with the values at 617.
 * Lines are centred 14 / 32 / 51 under the top rule (`rows`).
 * `Change Name` (78 x 22) sits at x 848, 7 under the top rule.
 */
export const USER_ACCOUNT_HEADER: { label: string; key: string }[][] = [
  [
    { label: 'User Name:', key: 'user' },
    { label: 'First Name:', key: 'first' },
    { label: 'Last Name:', key: 'last' },
  ],
  [
    { label: 'Prefix:', key: 'prefix' },
    { label: 'Middle Name:', key: 'middle' },
    { label: 'Suffix:', key: 'suffix' },
  ],
  [
    { label: 'Display Name:', key: 'display' },
    { label: 'Signature:', key: 'signature' },
    { label: 'Initials:', key: 'initials' },
  ],
]
export const USER_ACCOUNT_HEADER_GEOMETRY = {
  /* each line's centre under the top rule: 18 then 19 apart at 1x */
  h: 62, pitch: 18.5, rows: [14, 32, 51],
  columns: [{ label: 10, value: 83 }, { label: 285, value: 359 }, { labelRight: 612, value: 617 }],
  /* x is the button's box; the kit inks its frame 1px in */
  changeName: { x: 847, y: 7, w: 78, h: 22 },
}
export const USER_ACCOUNT_HEADER_FRAME = { top: ['#7d7d7d', '#d1d1d1'], bottom: ['#7c7c7c', '#d5d5d5'] }

/**
 * The ten tabs' painted widths, left to right. First taken off the
 * 2026-10-02 TRAINING capture at 1.14x (separators at x 22 / 121 / 300 / 428
 * / 535 / 617 / 730 / 826 / 932 / 1025 / 1074, ÷ 1.14); re-read at 1x off
 * the 2026-10-06 captures, separators at 91 / 248 / 361 / 456 / 525 / 626 /
 * 711 / 804 / 886 from the window's left frame. They are not one padding
 * round the caption — Other is 9px either side of its text, Module / Window
 * Access 17 — so each is carried as measured.
 */
export const USER_ACCOUNT_TAB_WIDTHS = [90, 157, 113, 95, 69, 101, 85, 93, 82, 43]

/**
 * Every tab page but Other holds one sunken panel (or two side by side)
 * opening with a grey band ruled off underneath. Re-measured at 1x off the
 * 2026-10-06 captures:
 *   - the PAGE is framed the way a Win32 tab control frames it: white down
 *     its left edge (3px), #DDDDDD along its right and bottom edges with a
 *     #F8F8F8 line inside them, and a white line inside that along the
 *     bottom (USER_ACCOUNT_PAGE_FRAME);
 *   - a panel stands 8 under the tab rule (5 on some pages, `tight`), 5 in
 *     from the white edge, 9 in from the right edge and 8 above the bottom
 *     edge (`pad`);
 *   - a panel is drawn #7B7B7B with a #DFDFDF line inside it — a light inner
 *     line, not the grid's own dark border (`border`, `inner`);
 *   - its band is 20px of #DCD7D2 over a #767676 rule (`band` carries the
 *     rule, as --pb-band-h does).
 */
export const USER_ACCOUNT_PANEL = {
  band: 21,
  /* not every page is laid out alike: User Alias and Workspace Mgt stand
     their panels only 5 under the tab rule with a 22px band, as does the
     Membership List's band; Service Group, Subscription and Memberships use
     the 8 and 20 above */
  tight: { top: 4, band: 23 },
  /* and the gap under the panel is each page's own (1x, 2026-10-06): 10 on
     User Account, 4 on User Alias, 6 on Workspace Mgt, 12 on Subscription —
     whose list also stands 2 further right, 11 to 964 — and the `pad` 8
     elsewhere */
  pageBottom: { 'User Account': 10, 'User Alias': 4, 'Workspace Mgt': 6, Subscription: 12 } as Record<string, number>,
  subscriptionX: { left: 7, right: 7 },
  pad: { top: 7, right: 9, bottom: 8, left: 5 },
  border: '#7b7b7b',
  inner: '#dfdfdf',
  bandRule: '#767676',
}
/* The access panes (Module / Window Access, Special Functions, Report
   Access) are shared with Security Profile Settings, which keeps its own
   inset. In this window the 1x Report Access capture stands the pane 8 under
   the tab rule, 5 in from the white edge, 9 from the right and 3 above the
   bottom edge, in the panels' #7B7B7B with a 20px band over #767676; the
   other two have no 1x capture and follow it. */
export const USER_ACCOUNT_ACCESS_PAD = '7px 9px 3px 5px'
export const USER_ACCOUNT_PAGE_FRAME = { left: '#ffffff', leftW: 3, edge: '#dddddd', highlight: '#f8f8f8' }

/* --- tab 1: `User Account` ------------------------------------------------
   `42be29fdd885`. Band caption `User Account`. The spec's prose says "four
   group boxes" and then names six; six are captured and six are rendered.

   2026-10-02 TRAINING capture: two columns of etched group boxes 465 wide,
   8 apart, with bold BLACK captions. Left: Account Settings (168 tall),
   Security Profiles (48), Notification Service Settings (250). Right:
   Password Settings (123), Other Settings (89), Workspace Settings (250),
   the last whose acknowledge list runs DOWN the box, one item per 22px line.
   The 303492 `Unmatched Results Inbox` row is not in this build's box.     */

export const NOTIFICATION_PRIORITIES = ['V. High:', 'High:', 'Medium:', 'Low:']
export const NOTIFICATION_METHODS = ['Popup', 'Flash', 'N/A']
/** Defaults in `42be29fdd885`: V. High = Popup, the other three = Flash. The
    2026-10-02 TRAINING account shows none chosen — that is one account's
    settings, so the help-site defaults stay. */
export const NOTIFICATION_DEFAULTS = ['Popup', 'Flash', 'Flash', 'Flash']
export const NOTIFICATION_BLOCKS = ['Messages', 'Tasks']

/** `Do not ask user to acknowledge manual entry of:` — all seven unchecked. */
export const WORKSPACE_ACK_ITEMS = [
  'Progress Notes', 'Measures', 'Consults', 'Imaging', 'Procedures',
  'Facility Admissions', 'Documents',
]

export const DEFAULT_AUTHOR_FOOTNOTE = '* Blank will default to User Account of Desktop Provider.'
/** The Memberships tab's copy of the same footnote is longer (2026-10-06
    capture, sic "defualt"); tab 1's stays the short one. */
export const MEMBERSHIP_AUTHOR_FOOTNOTE = '* Blank will default to User Account of Desktop Provider (if Org Role/ Organization, will defualt to current log in user).'

/** `Default Desktop Provider:` / `Default Author*:` — the emulator's roster. */
export const DESKTOP_PROVIDERS = [
  '', 'BEARDWOOD, WALTER', 'SHEWCHUK, LEAH', 'OKUDA, TIKA',
  'GRUBB, HELENA (LPN)', 'DHALIWAL, RUPINDER (RN)', 'ROSS, ADRIENNE (NHVC)',
]

/* --- tab 2: `Module / Window Access` --------------------------------------
   `1e9141017547` at user level, `a1bd18a6fdfa` at profile level; re-read off
   the 2026-10-02 TRAINING captures (Security Profile Settings 03–05, User
   Account 16). Two panes, 275 / 673px (313 / 767 capture px ÷ 1.14) inside
   the 976px window. The user-level panes carry an extra `Override` column
   that the profile-level ones do not.

   The right pane is the selected module's navigator tree, node for node and
   in the navigator's order (03 / 05 against `patientChartTree`: Patient
   Summary ▸ Demographic … Care Plan ▸ Preferences, Goals …), so the screen
   builds it from the trees in data/mois.tsx rather than from a copy here. */

export const MODULE_PANE_W = 275
export const WINDOW_PANE_W = 673

export const ACCESS_LEVELS = ['Administrator', 'Read/Write', 'Read Only']
export const ACCESS_FOOTNOTE =
  '* Administrator can delete record; Read/Write can add records but cannot delete records.'

export type ModuleAccessRow = { module: string; override?: boolean; access?: boolean }

/* The capture's ALLIED HEALTH (TIER 1) grants Administration and Data
   Exchange too; these are the seeded profiles' own, and `303191` (give a
   user Data Exchange by Override) needs a module the profile withholds. */
export const MODULE_ACCESS_ROWS: ModuleAccessRow[] = [
  { module: 'Patient Chart', access: true },
  { module: 'Workspace', access: true },
  { module: 'Scheduler', access: true },
  { module: 'Billing', access: false },
  { module: 'Administration', access: false },
  { module: 'Data Exchange', access: false },
  { module: 'Reports', access: true },
]

export type WindowAccessRow = {
  node: string
  /** indent level in the hierarchical Window / Tree Node column */
  depth: number
  override?: boolean
  access?: boolean
  level?: string
}

/** A node's Access Level where the capture shows one; every other node
    opens on Read/Write. Patient Chart, per 03 / 05 (ALLIED HEALTH (TIER 1)). */
export const WINDOW_ACCESS_LEVELS: Record<string, Record<string, string>> = {
  'Patient Chart': {
    'Patient Summary': 'Administrator', Demographic: 'Administrator',
    'Determinants of Health': 'Administrator', Encounters: 'Administrator', Measures: 'Administrator',
    Imaging: 'Read Only', Consults: 'Read Only', Procedures: 'Read Only', Interventions: 'Read Only',
    'Family History': 'Read Only', Prescriptions: 'Read Only', 'Print History': 'Read Only',
    'Social History': 'Read Only',
  },
}

/** Nodes a module's access tree lists that the navigator does not build:
    3799750 `2f2f9da1…png` / `ed3a6269…png` put Management and Break Glass
    Audit beside Private Notes under Chart Access Control. */
export const WINDOW_ACCESS_CHILDREN: Record<string, string[]> = {
  'Chart Access Control': ['Management', 'Break Glass Audit', 'Private Notes'],
}

/** 3799750: the private-note nodes are unticked until an administrator
    grants them. Every other node opens ticked, as 03–05 and 16 show. */
export const WINDOW_ACCESS_WITHHELD = ['Private Notes', 'My Private Notes']

/* --- tab 3: `Special Functions` -------------------------------------------
   `e361c4e01d11`, re-read off the 2026-10-02 TRAINING captures (06 / 07 at
   profile level, 17 at user level). Band caption `Function Access`; columns
   `Function` / `Description` / a checkbox plus the word `Execute`; the user
   level puts `☐ Override` before it. All 23 rows in the capture's order, in
   plain black: the two red "BH-internal" rows of the older help-site
   capture are not red in the live build.                                   */

export type SpecialFunctionRow = { fn: string; desc: string; execute?: boolean }

export const SPECIAL_FUNCTION_ROWS: SpecialFunctionRow[] = [
  { fn: 'Merge Chart', desc: 'Merge / Combine a Patient Chart' },
  { fn: 'Unmerge Chart', desc: 'Unmerge / Rollback a Patient Chart Merge' },
  { fn: 'Field Audit Registration', desc: 'Register Input Fields With the MOIS Data Audit Service' },
  { fn: 'Release Record Locks', desc: 'Release Orphaned Record Locks' },
  { fn: 'Teleplan Password', desc: 'Ability to View and Change the Teleplan Password' },
  { fn: 'Check For Updates', desc: 'Ability to Run the MOIS Updater Utility' },
  { fn: 'SQL Editor Window', desc: 'Custom SQL Editor Window' },
  { fn: 'Data Extraction, Access, & Control', desc: 'Data Extraction, Access, & Control Utility' },
  { fn: 'Report All Tasks and Messages', desc: 'Report All Tasks and Messages' },
  { fn: 'Share W/S on Behalf of MOIS User', desc: 'Ability to Share Workspace on Behalf of a MOIS User' },
  { fn: 'Web form administration', desc: 'Install and update web form definitions' },
  { fn: 'Override web form signature', desc: 'Allow overriding of web form signatures' },
  { fn: 'Static Recipients', desc: 'Ability to See and Select Static Recipients' },
  { fn: 'Change Associated Service Group', desc: "Ability to change a record's associated service group." },
  { fn: 'MAR Lock Override', desc: 'Ability to edit MAR records regardless of lock setting and MAR creator' },
  { fn: 'Access Control - Break Glass', desc: 'Ability to Break Glass when chart access is denied.' },
  { fn: 'Access Control - Manage Chart Access', desc: 'Ability to add / delete chart access control records (ie connections or named users).' },
  /* 3799750 `dd646cfd…png` (Security Profile Settings) and 303227
     `51c5bd38…png` (User Account): the two private-note functions sit here,
     the two prescribing ones after "Alert user of new version". Ticked as
     the User Account capture shows them, so the stage's desktop user starts
     able to use them (data/accessSettings.ts reads the ticks). */
  { fn: 'Access Control - Make Private Notes', desc: 'Ability to make a progress note private.', execute: true },
  { fn: 'Access Control - Break Glass Private Notes', desc: 'Ability to break glass to access a private progress note.', execute: true },
  { fn: 'Workspace - can create temporary memberships', desc: 'Ability to create temporary memberships from the workspace module.' },
  { fn: 'Alert user of new version', desc: 'When starting mois, alert the user that mois has been updated.' },
  { fn: 'Can create controlled prescriptions', desc: 'Ability to create controlled prescription records (Rx/LTM/Favourites).', execute: true },
  { fn: 'OAT Prescribing', desc: 'Ability to create OAT prescriptions', execute: true },
]

/* --- tab 4: `Report Access` -----------------------------------------------
   The folders and reports are the Report List's (data/reportCatalogue.ts);
   screens/ReportAccessPane.tsx draws them at both levels.                  */

/* --- tab 5: `User Alias` --------------------------------------------------
   `cd62a8ecb55f`, `a1e947ea321b`. Band `User Alias List` with New / Delete
   right-aligned. Header 16px, rows 19px.                                   */

export const USER_ALIAS_COLUMNS: UserColumn[] = [
  { key: 'start', header: 'Start Date', width: 73, align: 'center' },
  { key: 'end', header: 'End Date', width: 73, align: 'center' },
  { key: 'source', header: 'Source', width: 139 },
  { key: 'value', header: 'Value', width: 231 },
  { key: 'note', header: 'Note', width: 395 },
]
export const USER_ALIAS_GUTTER = 14

export const USER_ALIAS_ROWS: UserRow[] = [
  { start: '2019.11.18', end: '', source: 'NHA', value: '40881', note: 'NHA CIX Labs' },
  { start: '2021.04.02', end: '', source: 'LIFELABS', value: 'J40881', note: 'Outpatient lab results' },
]

/* --- tab 6: `Workspace Mgt` -----------------------------------------------
   `c4c90b65d9f8`, `7e01f802a938`. Three regions.                           */

export const INBOX_FORWARDING_BUTTONS = ['Acknowledge Backlog', 'Reassign Backlog', 'New', 'Delete']
export const INBOX_FORWARDING_COLUMNS: UserColumn[] = [
  { key: 'start', header: 'Start', width: 73, align: 'center' },
  { key: 'stop', header: 'Stop', width: 73, align: 'center' },
  { key: 'forward', header: 'Forward to User', width: 174 },
  { key: 'rule', header: 'Rule', width: 144, align: 'center' },
  { key: 'note', header: 'Note', width: 430 },
]
export const INBOX_FORWARDING_GUTTER = 13
/** The `Rule` cell holds an in-grid radio pair. */
export const FORWARDING_RULES = ['Reassign', 'Copy']

export const INBOX_FORWARDING_ROWS: UserRow[] = [
  { start: '2026.07.01', stop: '2026.07.21', forward: 'GRUBB, HELENA', rule: 'Reassign', note: 'Summer leave' },
]

export const SHARING_WORKSPACE_COLUMNS: UserColumn[] = [
  { key: 'start', header: 'Start', width: 73, align: 'center' },
  { key: 'stop', header: 'Stop', width: 73, align: 'center' },
  { key: 'user', header: 'User Account', width: 186 },
  { key: 'note', header: 'Note', width: 237 },
]
export const SHARING_WORKSPACE_GUTTER = 14

export const SHARING_WORKSPACE_ROWS: UserRow[] = [
  { start: '2024.01.08', stop: '', user: 'HALLIWELL, ALYSSA', note: 'MOA covers the inbox' },
  { start: '2025.09.02', stop: '', user: 'ROSS, ADRIENNE', note: '' },
]

/** Read-only panel, 368px wide, #C8DCFA caption bar; empty stops render `--`. */
export const SHARED_WITH_ME_W = 368
export const SHARED_WITH_ME_COLUMNS: UserColumn[] = [
  { key: 'start', header: 'Start', width: 73, align: 'center' },
  { key: 'stop', header: 'Stop', width: 73, align: 'center' },
  { key: 'user', header: 'User Account' },
]
export const SHARED_WITH_ME_ROWS: UserRow[] = [
  { start: '2025.03.17', stop: '--', user: 'SHEWCHUK, LEAH' },
]

/**
 * 2026-10-02 TRAINING capture: Inbox Forwarding runs the page's width, 269
 * tall; 4 under it, `Sharing Workspace With` (588 wide) and `Workspaces
 * Shared With Me` (357) sit 7 apart, both 270 tall. Each band's buttons are
 * butted edge to edge at its right and fill its height. The right panel is
 * read-only: a 31px #C8DCFA caption band, then bold black column captions
 * left-set at 9 / 83 / 158 over a black rule, on white.
 */
/* Re-measured at 1x (2026-10-06): this page's panels stand only 5 under the
   tab rule (`top`), not the other pages' 8; Inbox Forwarding is 271 tall,
   the lower pair 590 and 358 wide, 6 apart; the band buttons are butted
   117 / 117 / 52 / 52 (Inbox Forwarding) and 52 / 52 (Sharing Workspace
   With), each after the first drawn 1 wider to overlap its neighbour's
   edge. */
export const WORKSPACE_MGT_GEOMETRY = {
  top: 4, inboxH: 271, gap: 4, sharingW: 590, sharedW: 358, sideGap: 6, sharedBand: 31,
  inboxButtons: [117, 118, 53, 53], newDeleteButtons: [52, 53],
}
export const SHARED_WITH_ME_PANEL_COLUMNS: UserColumn[] = [
  { key: 'start', header: 'Start', width: 74, headAlign: 'left' },
  { key: 'stop', header: 'Stop', width: 75, headAlign: 'left' },
  { key: 'user', header: 'User Account', headAlign: 'left' },
]

/* --- tab 7: `Memberships` -------------------------------------------------
   `d9af05150d60`. A left Other Settings group, a right Associated Provider
   grid, and a Membership List band underneath with per-row Edit / Delete.
   The list has no gridlines and a 29px header.                             */

export const ASSOCIATED_PROVIDER_COLUMNS: UserColumn[] = [
  { key: 'provider', header: 'Associated Provider(s)', width: 269 },
  { key: 'pract', header: 'Practitioner No.', width: 97, align: 'center' },
  { key: 'payee', header: 'Payee No.', width: 86, align: 'center' },
]
export const ASSOCIATED_PROVIDER_ROWS: UserRow[] = [
  /* the numbers are data/clinicRoster's (the Provider List's) */
  { provider: 'BEARDWOOD, WALTER', pract: rosterProvider('BEARDWOOD, WALTER')!.pract, payee: rosterProvider('BEARDWOOD, WALTER')!.payee },
]

/* The column widths come from the 2026-10-06 capture (1:1), the list empty:
   GREY captions left-set at 268 / 360 / 435 / 531 / 597 / 661 / 719 / 762 in
   from the list's rule and `Add` at 815, so each column runs from 4 before
   its caption to the next. `Name` alone is set 10 in (MEMBERSHIP_NAME_INDENT).
   The header is 30px, and no rows are captured — where the values sit under
   the captions is still the earlier layout's guess. */
export const MEMBERSHIP_NAME_INDENT = 6
export const MEMBERSHIP_COLUMNS: UserColumn[] = [
  { key: 'name', header: 'Name', width: 264 },
  { key: 'type', header: 'Type', width: 92 },
  { key: 'status', header: 'Status', width: 75, align: 'center' },
  { key: 'member', header: 'Member Type', width: 96 },
  { key: 'started', header: 'Started', width: 66, align: 'center' },
  { key: 'stopped', header: 'Stopped', width: 64, align: 'center' },
  { key: 'basket', header: 'Basket', width: 58, align: 'center' },
  { key: 'task', header: 'Task', width: 43, align: 'center' },
  { key: 'message', header: 'Message', width: 53, align: 'center' },
]
export const MEMBERSHIP_ROWS: UserRow[] = [
  { name: 'FAKE MEDICAL CLINIC PRG', type: 'ORGANIZATION', status: 'A', member: 'Provider', started: '2018.06.04', stopped: '', basket: 'Y', task: 'Y', message: 'Y' },
  { name: 'ACUTE 1 PLN 1 PRG', type: 'ORGROLE', status: 'A', member: 'Member', started: '2021.02.15', stopped: '', basket: 'N', task: 'Y', message: 'Y' },
]

/* --- tab 8: `Service Group` -----------------------------------------------
   `109df8904120` (1.25x, normalised); re-measured off the 2026-10-06 capture
   (1:1): no gutter, the captions LEFT-set 6 / 220 / 591 in from the panel's
   rule, which is unusual for this family. Shipped typo in the footnote,
   which sits at the third column's left, inside the white.                 */

export const SERVICE_GROUP_BAND = 'Service Group(s) / Pathway(s)'
export const SERVICE_GROUP_COLUMNS: UserColumn[] = [
  { key: 'name', header: 'Name', width: 216, headAlign: 'left' },
  { key: 'desc', header: 'Description', width: 371, headAlign: 'left' },
  { key: 'launch', header: 'Alternate Launch Modes', headAlign: 'left' },
]
/* sic — "all user have access" */
export const SERVICE_GROUP_FOOTNOTE = '(note: all user have access to the Main Program)'
export const SERVICE_GROUP_FOOTNOTE_X = 588
export const SERVICE_GROUP_ROWS: UserRow[] = [
  { name: 'MAIN', desc: 'Main Program', launch: '' },
  { name: 'MENTAL HEALTH', desc: 'Mental health pathway', launch: 'Chart' },
]

/* --- tab 9: `Subscription` ------------------------------------------------
   `f9aba57883ac`. The header row doubles as the toolbar: `Add` sits in it and
   each row carries its own Edit / Delete. The Subject cell renders a
   secondary grey qualifier under the value.                                */

/* 2026-10-06 capture (1:1): captions left-set at 5 / 180 / 509 / 602 / 685 /
   761 in from the list's rule, `Add` at 815 — so each column runs from 4
   before its caption (the cells' 3px pad and the rule) to the next. */
export const SUBSCRIPTION_COLUMNS: UserColumn[] = [
  { key: 'event', header: 'Event', width: 176 },
  { key: 'subject', header: 'Subject', width: 329 },
  { key: 'method', header: 'Method', width: 93 },
  { key: 'priority', header: 'Priority', width: 83 },
  { key: 'start', header: 'Start', width: 76, align: 'center' },
  { key: 'end', header: 'End', width: 54, align: 'center' },
]
export const SUBSCRIPTION_ROWS: UserRow[] = [
  { event: 'Access Control - Break Glass', subject: 'MENTAL HEALTH', qualifier: 'orgrole', method: 'Task', priority: 'High', start: '2025.01.06', end: '' },
  { event: 'Temporary Membership', subject: 'MENTAL HEALTH', qualifier: 'orgrole', method: 'Message', priority: 'Medium', start: '2025.01.06', end: '' },
]

/** `Event / Subject Selection` — `810d5deb21a8`. */
export const EVENT_SUBJECT_DIALOG = {
  title: 'Event / Subject Selection',
  group: 'Select Event',
  columns: [
    { key: 'event', header: 'Event', width: 260 },
    { key: 'subject', header: 'Subject', width: 200 },
  ] as UserColumn[],
  rows: [
    { event: 'Access Control - Break Glass', subject: 'MENTAL HEALTH' },
    { event: 'Access Control - Break Glass', subject: 'ADULT PSYCH 1 PRG' },
    { event: 'Access Control - Break Glass', subject: 'EDS 1 PRG' },
    { event: 'Temporary Membership', subject: 'MENTAL HEALTH' },
    { event: 'Temporary Membership', subject: 'ADULT PSYCH 1 PRG' },
  ] as UserRow[],
  /* the read-only edit shows the literal `<select>` until a subject is picked;
     the `Select...` button is DISABLED in the capture (face #CCCCCC) */
  subjectCaption: 'Subject',
  subjectPlaceholder: '<select>',
  buttons: ['Continue', 'Cancel'],
}

/* --- tab 10: `Other` ------------------------------------------------------
   `10777195a523`, `1ec8d9776da0`, `ad1978a4e8be`; laid out to the
   2026-10-06 captures (1:1), one per setting. Master/detail: a left list
   242 wide headed `Setting` (grey caption, 24px rows, even rows #E8E8E8, no
   gutter), 7 from a bordered white detail pane. The pane opens with a 25px
   #C8DCFA band in plain (not bold) ink, a description line, and — on every
   setting but CPSBC Library — a #AEAEB1 rule 55 down; then the setting's
   controls. Every `y` below is a line's centre measured from the pane's top
   border, every `x` from its left border. mhk Settings captions its band
   `myhealthkey`. User Agreements paints no band (its own pane,
   screens/UserAgreementWindows.tsx).                                       */

export type OtherSetting = {
  name: string
  /** the band caption, where it is not the list's name */
  band?: string
  /** the description line under the band */
  desc?: string
  descY?: number
  /** the rule under the description; CPSBC Library has none */
  rule?: boolean
  /** where a line's label and control start */
  labelX: number
  controlX: number
  fields: OtherField[]
}

export type OtherRadio = { label: string; x: number; y: number }

export type OtherField =
  /** `labelEnd`: a label right-set against that x (Forms: / Letters: / Recent:) */
  | { kind: 'drop'; label: string; y: number; w: number; options: string[]; value?: string; labelEnd?: number; x?: number }
  | { kind: 'text'; label?: string; y: number; w: number; h?: number; value?: string; x?: number; lookup?: { x: number; w: number } }
  /** radio buttons where they are painted; `value` is the chosen one, if any */
  | { kind: 'radios'; label?: string; y?: number; name: string; options: OtherRadio[]; value?: string }
  | { kind: 'note'; text: string; y: number; x?: number; ink?: 'grey' | 'bold' }
  | { kind: 'button'; label: string; x: number; y: number; w: number; h: number }
  /** an etched box with a caption on its top rule, `top`/`bottom` its rules */
  | { kind: 'group'; caption: string; left: number; right: number; top: number; bottom: number; fields: OtherField[] }

export const OTHER_LIST_W = 242
export const OTHER_PANE_BAND = 25

export const OTHER_SETTINGS: OtherSetting[] = [
  {
    name: 'Attachment Wizard',
    desc: 'Attachment Wizard settings control the configuration of the Attachment Dialogue window.',
    descY: 41,
    rule: true,
    labelX: 12,
    controlX: 124,
    fields: [
      /* every list opens blank in the capture */
      { kind: 'drop', label: 'Starting Tab Page:', y: 69, w: 120, options: ['', 'Forms', 'Letters', 'Recent'] },
      { kind: 'note', text: 'Expand Sections on Startup:', y: 89 },
      { kind: 'drop', label: 'Forms:', labelEnd: 113, y: 109, w: 78, options: ['', 'Yes', 'No'] },
      { kind: 'drop', label: 'Letters:', labelEnd: 113, y: 129, w: 78, options: ['', 'Yes', 'No'] },
      { kind: 'drop', label: 'Recent:', labelEnd: 113, y: 149, w: 78, options: ['', 'Yes', 'No'] },
      { kind: 'text', label: 'Recent Record Limit:', y: 168, w: 50, value: '0' },
      { kind: 'drop', label: 'After Attaching Action:', y: 189, w: 120, options: ['---'], value: '---' },
    ],
  },
  {
    name: 'CPSBC Library',
    desc: 'The settings below will control how you access the CPSBC Library from within MOIS:',
    descY: 38,
    labelX: 11,
    controlX: 21,
    fields: [
      {
        kind: 'group', caption: 'Options', left: 11, right: 520, top: 62, bottom: 154,
        fields: [{
          kind: 'radios', name: 'cpsbc-options', value: 'Prompt for options when launching library',
          options: [
            { label: 'Use login token to automatically connect to library', x: 22, y: 87 },
            { label: 'Require CPSBC username and password to connect to library', x: 22, y: 110 },
            { label: 'Prompt for options when launching library', x: 22, y: 133 },
          ],
        }],
      },
      {
        kind: 'group', caption: 'Login Token', left: 11, right: 520, top: 172, bottom: 240,
        fields: [
          { kind: 'text', x: 21, y: 198, w: 490, h: 17 },
          { kind: 'button', label: 'Delete Token', x: 430, y: 223, w: 81, h: 22 },
        ],
      },
      { kind: 'note', ink: 'bold', text: 'More information about accessing the CPSBC Library from MOIS:', y: 260 },
      { kind: 'note', text: '- MOIS will not have access to and will not store your CPSBC username and password', y: 279 },
      { kind: 'note', text: '- Your CPSBC username and password are different than your MOIS user name and password', y: 300 },
      { kind: 'note', text: '- Deleting your login token will require you to create a new token the next time you launch the CPSBC Library from MOIS', y: 320 },
    ],
  },
  {
    name: 'Voice Service',
    desc: 'The MOIS Voice Service, when enabled, will launch the identify voice service software. '
      + 'This service is designed for cloud customers.',
    descY: 42,
    rule: true,
    labelX: 13,
    controlX: 104,
    fields: [
      /* neither radio is selected in the capture */
      { kind: 'radios', label: 'Enabled:', y: 68, name: 'voice-enabled', options: [{ label: 'Yes', x: 105, y: 68 }, { label: 'No', x: 163, y: 68 }] },
      { kind: 'drop', label: 'Software:', y: 89, w: 265, options: [''] },
    ],
  },
  {
    name: 'eFax Service',
    desc: 'The eFax account set below will be used by default for this user.',
    descY: 42,
    rule: true,
    labelX: 11,
    controlX: 122,
    fields: [
      { kind: 'drop', label: 'Default eFax Account:', y: 75, w: 190, options: [''] },
    ],
  },
  /* 3363428 `c4de1672…`: the user's responses to User Agreements; the pane
     is drawn by screens/UserAgreementWindows.tsx (UserAgreementResponses).
     The 2026-10-06 capture, of an account with none, shows the pane blank. */
  { name: 'User Agreements', labelX: 0, controlX: 0, fields: [] },
  {
    name: 'mhk Settings',
    band: 'myhealthkey',
    desc: 'The settings below will control how mois processes mhk two-way messaging',
    descY: 42,
    rule: true,
    labelX: 11,
    controlX: 17,
    fields: [
      {
        kind: 'group', caption: 'Default setting for the  No-Reply option when sending messages to patient',
        left: 11, right: 520, top: 72, bottom: 139,
        fields: [{
          /* neither is chosen in the capture */
          kind: 'radios', name: 'mhk-no-reply',
          options: [{ label: 'Always On', x: 22, y: 97 }, { label: 'Always Off', x: 22, y: 119 }],
        }],
      },
      {
        kind: 'group', caption: 'Default inbox for patient replies', left: 11, right: 520, top: 159, bottom: 235,
        fields: [
          { kind: 'text', x: 17, y: 185, w: 313, h: 16, value: '0', lookup: { x: 330, w: 21 } },
          { kind: 'note', ink: 'grey', x: 18, y: 206, text: '- when a patient replies to a message sent by this user, their reply will be forwarded to the above inbox' },
          /* sic: "will to the user's inbox" */
          { kind: 'note', ink: 'grey', x: 18, y: 222, text: "- if blank, all patient replies will to the user's inbox" },
        ],
      },
    ],
  },
]

/* ===========================================================================
   The `Security Profile Settings` window   976 x 682, 5 tabs   `a1bd18a6fdfa`

   2026-10-02 TRAINING captures 03–13: the window's frame is 1110 x 778
   capture px (÷ 1.14 = 974 x 682; 38–816 down, 18–1128 across). Above the strip, a bordered band: `Security
   Profile:` (136px, its text selected on open) and `Description:` (343px).
   Five fixed-width tabs, 171 capture px = 150px each, the fifth `Launch
   Mode` (11–13), which the older help-site window did not have.
   ======================================================================== */

export const SECURITY_PROFILE_TABS = [
  'Module / Window Access', 'Special Functions', 'Report Access', 'User List', 'Launch Mode',
]
export const SECURITY_PROFILE_TAB_W = 150
export const SECURITY_PROFILE_SIZE = { w: 976, h: 682 }
export const SECURITY_PROFILE_FOOTER = ['Apply Changes', 'Cancel']
export const SECURITY_PROFILE_TITLE = 'Security Profile Settings'
/** the header band's two edits, 155 / 391 capture px */
export const SECURITY_PROFILE_HEADER = { nameW: 136, descW: 343 }

/** `415516e9d83a`. HAS gridlines, unlike the User Accounts grid. Capture 10
    agrees: rules at 206 / 148 / 104 / 105 / 104 / 111 / 110 / 73 capture px
    (÷ 1.14 = the widths below), a 33px (29) two-line header, 19px rows. */
export const PROFILE_USER_LIST_BAND = 'Current User List'
export const PROFILE_USER_LIST_GUTTER = 16
export const PROFILE_USER_LIST_HEAD_H = 29
export const PROFILE_USER_LIST_COLUMNS: UserColumn[] = [
  { key: 'display', header: 'Display Name', width: 181 },
  { key: 'user', header: 'User Name', width: 130 },
  /* two text lines, no spanning rule — this header is NOT the User Accounts
     grid's banded one, it is three two-line captions */
  { key: 'ovWindow', header: 'Overrides\nWindow', width: 92, align: 'center', override: true },
  { key: 'ovFunctions', header: 'Overrides\nFunctions', width: 92, align: 'center', override: true },
  { key: 'ovReports', header: 'Overrides\nReports', width: 92, align: 'center', override: true },
  { key: 'effective', header: 'Effective', width: 97, align: 'center' },
  { key: 'expiry', header: 'Expiry', width: 97, align: 'center' },
  { key: 'status', header: 'Status', width: 64, align: 'center' },
]

/* --- tab 5: `Launch Mode` -------------------------------------------------
   Captures 11 (none yet), 12 (the `Select Launch Mode` list Add Launch Mode
   raises: Main Program, Encounter Lite, Ok / Cancel) and 13 (Main Program
   added: the right pane's caption becomes `Core MOIS` over the grey line
   `Not additional settings` — sic, kept). The choices are the launch
   chooser's (screens/LaunchModeWindows.tsx). */
export const LAUNCH_MODE_BUTTONS = ['Add Launch Mode', 'Remove Launch Mode']
export const LAUNCH_MODE_NOTE =
  'Note: If a Role does not have a launch mode, the Main Program will be the default launch mode.'
export const LAUNCH_MODE_LIST_HEAD = 'Launch Mode'
export const LAUNCH_MODE_SETTING_HEAD = 'Launch Mode Setting'
/** the left pane, 347 capture px */
export const LAUNCH_MODE_LIST_W = 305

/* ===========================================================================
   The `New Security Profile` dialog   capture 02 (2026-10-02 TRAINING)

   Raised by New Record on User Security Profiles: 535 x 227 capture px
   (469 x 199). A bordered panel headed by a grey `New Security Profile`
   band; `Security Profile:` (197 capture px → 173) over a two-line
   `Description:` (355 x 35 → 311 x 31); Continue / Cancel, 85 x 24 → 75 x 21.
   ======================================================================== */
export const NEW_SECURITY_PROFILE = {
  title: 'New Security Profile',
  band: 'New Security Profile',
  buttons: ['Continue', 'Cancel'],
  w: 469,
  /** the caption column: captions start 11px in, the edits 91px in */
  labelW: 74,
  nameW: 173,
  descW: 311,
}

/* ===========================================================================
   The `User Group Detail` dialog       (from `303203`)
   ======================================================================== */

export const USER_GROUP_DIALOG = {
  title: 'User Group Detail',
  /** the 25px navy band inside the window reads `User Group`, not the title */
  navy: 'User Group',
  group: 'User Group Information',
  membersBand: 'User Group Members',
  membersButtons: ['New', 'Delete'],
  membersColumns: [
    { key: 'user', header: 'User Name', width: 220 },
    { key: 'note', header: 'Note', width: 330 },
  ] as UserColumn[],
  footer: ['Save Changes (F2)', 'Cancel'],
}

/**
 * Members who are inactive users render in #FF0000 with a trailing `*`.
 * Both names are the capture's own.
 */
export const USER_GROUP_MEMBERS: UserRow[] = [
  { user: 'HALLIWELL, ALYSSA', note: 'Front desk' },
  { user: 'MCPHILLIPS, MARIE*', note: '', inactive: true },
  { user: 'ROSS, ADRIENNE', note: '' },
  { user: 'SAMWAYS, KRYSTLE*', note: 'Left 2025.12', inactive: true },
]

/* ===========================================================================
   The `User Security Profiles` picker  `e227667383d1`
   (User Account ▸ Security Profiles ▸ Change, and the New User dialog's
   `Change` button. Checked rows highlight #9CFB9C.)
   ======================================================================== */

export const PROFILE_PICKER = {
  title: 'User Security Profiles',
  group: 'Select Security Profiles',
  buttons: ['Change Privileges', 'Cancel'],
}

/* ===========================================================================
   The `Change Password` dialog         `537e2f2f5ca3`
   (User Account ▸ Password Settings ▸ Change.)
   ======================================================================== */

export const CHANGE_PASSWORD = {
  title: 'Change Password',
  buttons: ['Change', 'Cancel'],
  /* the checkbox is UNCHECKED here, where the New User dialog's is checked */
  reset: 'User To Choose New Password On Next Login',
}

/* ===========================================================================
   The `Change Name` dialog             2026-10-02 TRAINING capture
   (User Account ▸ header ▸ Change Name.)

   460 wide. Three ruled sections, 135 / 34 / 56 tall, then a 51px foot with
   Save / Cancel (75 x 21, 6 apart) centred. Labels at 17, edits at 96 and
   135 wide (the Display Name / Signature Line edits 177), lines 20 apart
   with the first centred 19 down. Each grey example follows its edit by 4;
   the tick boxes sit at 277. Display Name is disabled while its box is
   ticked; the Signature Line box is unticked, so that edit is live.
   ======================================================================== */

export const CHANGE_NAME = {
  title: 'Change Name',
  w: 460,
  sections: [135, 34, 56],
  labelX: 17,
  controlX: 96,
  editW: 135,
  wideW: 177,
  syncX: 277,
  pitch: 20,
  top: 19,
  footH: 51,
  rows: [
    { label: 'Prefix:', key: 'prefix', hint: 'E.g. DR., MR., MRS., MS.' },
    { label: 'First Name:', key: 'first', required: true },
    { label: 'Middle Name:', key: 'middle' },
    { label: 'Last Name:', key: 'last', required: true },
    { label: 'Suffix:', key: 'suffix', hint: 'E.g. MD' },
    { label: 'Initials:', key: 'initials' },
  ] as { label: string; key: string; hint?: string; required?: boolean }[],
  sync: 'Synchronize with Name Fields',
  buttons: ['Save', 'Cancel'],
}

/* ===========================================================================
   The table the screen is driven from.
   ======================================================================== */

export const userListSpecs: UserListSpec[] = [SECURITY_PROFILES, USER_ACCOUNTS, USER_GROUPS]

/** Every node this wave's screen answers for, including Password Policy. */
export const userManagementNodes: string[] = [
  ...userListSpecs.map((v) => v.node),
  PASSWORD_POLICY_SPEC.node,
]

const BY_NODE = new Map(userListSpecs.map((v) => [v.node, v]))

export function userListSpec(node: string): UserListSpec | undefined {
  return BY_NODE.get(node)
}
