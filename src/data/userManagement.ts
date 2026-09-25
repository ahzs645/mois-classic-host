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
  /** measured row-indicator gutter — the kit paints its own fixed 13px */
  gutter: number
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
  newDialog?: 'new-user' | 'user-group-detail'
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
  ],
  pitch: 19,
  headH: 16,
  gutter: 16,
  rules: true,
  anchorPrefix: 'profile',
  anchorKey: 'profile',
  editor: 'security-profile',
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
  ],
  pitch: 24,
  headH: 34,
  /* the gutter is 15-17px across this family; no capture of THIS grid gives a
     boundary for it, so the family's 16 is carried and the kit paints 13 */
  gutter: 16,
  rules: false,
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
   The `New User` dialog                `a58fd3359aa3`

   Fifteen rows, in the capture's order. Navy title bar with a red X close
   box at the right; inner group caption `New User`; `Create User` / `Cancel`.
   ======================================================================== */

export type NewUserField =
  | { kind: 'text'; label: string; w: number; required?: boolean; value?: string; focus?: boolean }
  /**
   * A disabled grey edit with a `Synchronize with Name Fields` tick box
   * beside it — MOIS writes the field for you while the box is checked.
   */
  | { kind: 'sync'; label: string; w: number }
  | { kind: 'hint'; label: string; w: number; hint: string }
  | { kind: 'drop'; label: string; w: number; options: string[]; required?: boolean }
  /** the multi-line list box + `Change` button */
  | { kind: 'profiles'; label: string; w: number; required?: boolean }
  | { kind: 'password'; label: string; w: number }
  | { kind: 'check'; label: string; check: string; checked?: boolean }
  | { kind: 'note'; text: string }

/** Two or three controls sharing one row of the dialog. */
export type NewUserRow = NewUserField[]

export const NEW_USER_TITLE = 'New User'
export const NEW_USER_BAND = 'New User'
export const NEW_USER_BUTTONS = ['Create User', 'Cancel']

/**
 * `Role` and `Expertise` are both Selection Lists (see the 62-row Selection
 * List Management table), so their drop lists are populated from the roster
 * the emulator already carries rather than from a capture — no capture of
 * either dropped list exists.
 */
export const USER_ROLES = ['ADMIN', 'PHYSICIAN', 'NURSE', 'MOA', 'LOCUM', 'RESIDENT', 'READ ONLY']
export const USER_EXPERTISE = ['', 'FAMILY PRACTICE', 'INTERNAL MEDICINE', 'MENTAL HEALTH', 'PAEDIATRICS', 'SURGERY']

export const NEW_USER_ROWS: NewUserRow[] = [
  /* 1 */[
    { kind: 'text', label: 'User Name:', w: 150, required: true, focus: true },
    { kind: 'text', label: 'Prefix:', w: 70 },
    { kind: 'text', label: 'Suffix:', w: 70 },
  ],
  /* 2 */[
    { kind: 'text', label: 'First Name:', w: 150, required: true },
    { kind: 'text', label: 'Middle Name:', w: 110 },
    { kind: 'text', label: 'Last Name:', w: 150, required: true },
  ],
  /* 3 */[{ kind: 'sync', label: 'Display Name:', w: 220 }],
  /* 4 */[{ kind: 'sync', label: 'Signature:', w: 220 }],
  /* 5 */[{ kind: 'hint', label: 'Initials:', w: 60, hint: '( ex: JCS )' }],
  /* 6 */[
    { kind: 'text', label: 'Cell Phone:', w: 130 },
    { kind: 'text', label: 'Email:', w: 220 },
  ],
  /* 7 */[{ kind: 'drop', label: 'Role:', w: 180, options: USER_ROLES, required: true }],
  /* 8 */[{ kind: 'drop', label: 'Expertise:', w: 180, options: USER_EXPERTISE }],
  /* 9  — MOIS fills today's date in for you (`303183`) */
  [{ kind: 'text', label: 'Effective:', w: 92, value: MOIS_TODAY }],
  /* 10 */[{ kind: 'text', label: 'Expiry:', w: 92 }],
  /* 11 */[{ kind: 'profiles', label: 'Security Profiles:', w: 300, required: true }],
  /* 12 */[{ kind: 'password', label: 'Password:', w: 150 }],
  /* 13 */[{ kind: 'password', label: 'Confirm:', w: 150 }],
  /* 14 — checked by default */
  [{ kind: 'check', label: 'Reset Pswrd:', check: 'User To Choose New Password On Next Login', checked: true }],
  /* 15 */[{ kind: 'note', text: '* Required Entry' }],
]

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

export const USER_ACCOUNT_SIZE = { w: 974, h: 714 }
export const USER_ACCOUNT_FOOTER = ['Apply Changes', 'Cancel']

/** The fixed block above the tab strip: three columns of three fields. */
export const USER_ACCOUNT_HEADER: { label: string; w: number; key: string }[][] = [
  [
    { label: 'User Name:', w: 130, key: 'user' },
    { label: 'First Name:', w: 130, key: 'first' },
    { label: 'Last Name:', w: 130, key: 'last' },
  ],
  [
    { label: 'Prefix:', w: 90, key: 'prefix' },
    { label: 'Middle Name:', w: 90, key: 'middle' },
    { label: 'Suffix:', w: 90, key: 'suffix' },
  ],
  [
    { label: 'Display Name:', w: 160, key: 'display' },
    { label: 'Signature:', w: 160, key: 'signature' },
    { label: 'Initials:', w: 160, key: 'initials' },
  ],
]

/* --- tab 1: `User Account` ------------------------------------------------
   `42be29fdd885`. Band caption `User Account`. The spec's prose says "four
   group boxes" and then names six; six are captured and six are rendered.  */

export const NOTIFICATION_PRIORITIES = ['V. High:', 'High:', 'Medium:', 'Low:']
export const NOTIFICATION_METHODS = ['Popup', 'Flash', 'N/A']
/** Defaults in the capture: V. High = Popup, the other three = Flash. */
export const NOTIFICATION_DEFAULTS = ['Popup', 'Flash', 'Flash', 'Flash']
export const NOTIFICATION_BLOCKS = ['Messages', 'Tasks']

/** `Do not ask user to acknowledge manual entry of:` — all seven unchecked. */
export const WORKSPACE_ACK_ITEMS = [
  'Progress Notes', 'Measures', 'Consults', 'Imaging', 'Procedures',
  'Facility Admissions', 'Documents',
]

export const DEFAULT_AUTHOR_FOOTNOTE = '* Blank will default to User Account of Desktop Provider.'

/** `Default Desktop Provider:` / `Default Author*:` — the emulator's roster. */
export const DESKTOP_PROVIDERS = [
  '', 'BEARDWOOD, WALTER', 'SHEWCHUK, LEAH', 'OKUDA, TIKA',
  'GRUBB, HELENA (LPN)', 'DHALIWAL, RUPINDER (RN)', 'ROSS, ADRIENNE (NHVC)',
]

/* --- tab 2: `Module / Window Access` --------------------------------------
   `1e9141017547` at user level, `a1bd18a6fdfa` at profile level. Two panes,
   measured 277px and 659px. The user-level panes carry an extra `Override`
   column that the profile-level ones do not.                               */

export const MODULE_PANE_W = 277
export const WINDOW_PANE_W = 659

export const ACCESS_LEVELS = ['Administrator', 'Read/Write', 'Read Only']
export const ACCESS_FOOTNOTE =
  '* Administrator can delete record; Read/Write can add records but cannot delete records.'

export type ModuleAccessRow = { module: string; override?: boolean; access?: boolean }

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

export const WINDOW_ACCESS_ROWS: WindowAccessRow[] = [
  { node: 'Patient Chart', depth: 0, access: true, level: 'Read/Write' },
  { node: 'Patient Summary', depth: 1, access: true, level: 'Read Only' },
  { node: 'Demographics', depth: 1, access: true, level: 'Read/Write' },
  { node: 'Orders', depth: 1, access: true, level: 'Read/Write' },
  { node: 'Encounters', depth: 1, access: true, level: 'Read/Write' },
  { node: 'Administration', depth: 0, access: false, level: 'Read Only' },
  { node: 'User Management', depth: 1, access: false, level: 'Read Only' },
  { node: 'Clinic Management', depth: 1, access: false, level: 'Read Only' },
]

/* --- tab 3: `Special Functions` -------------------------------------------
   `e361c4e01d11` (profile level). Band caption `Function Access`; columns
   `Function` / `Description` / a checkbox plus the word `Execute`.

   The two BH-internal rows render **entirely** in #FF0000 — function,
   description and the word "Execute".                                      */

export type SpecialFunctionRow = { fn: string; desc: string; execute?: boolean; bh?: boolean }

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
  /* BH-internal — whole row in #FF0000 */
  { fn: 'Web form administration', desc: 'Install and update web form definitions', bh: true },
  { fn: 'Override web form signature', desc: 'Allow overriding of web form signatures', bh: true },
  { fn: 'Static Recipients', desc: 'Ability to See and Select Static Recipients' },
  { fn: 'Change Associated Service Group', desc: "Ability to change a record's associated service group." },
  { fn: 'MAR Lock Override', desc: 'Ability to edit MAR records regardless of lock setting and MAR creator' },
  { fn: 'Access Control - Break Glass', desc: 'Ability to Break Glass when chart access is denied.' },
  { fn: 'Access Control - Manage Chart Access', desc: 'Ability to add / delete chart access control records (ie connections or named users).' },
  { fn: 'Workspace - can create temporary memberships', desc: 'Ability to create temporary memberships from the workspace module.' },
  { fn: 'Alert user of new version', desc: 'When starting mois, alert the user that mois has been updated.' },
]

/* The names, the descriptions and the two red rows are all `e361c4e01d11`'s
   (the DATA ENTRY profile), word for word. */

/* --- tab 4: `Report Access` -----------------------------------------------
   `9e179125c6d6`. A single-column expander tree on a full-pane #C8DCFA
   background with `+` boxes and bold labels. The capture scrolls, so this is
   the visible run and not the whole list.                                  */

export const REPORT_ACCESS_FOLDERS = [
  'Accounts - General',
  'Accounts - MSP',
  'Accounts - Private (Inv)',
  'Accounts - Private (Trans)',
  'Bills - by Diagnosis',
  'Bills - Fee Code',
  'Clinical - Audits',
  'Clinical - Main',
  'Clinical - Pro/Obs',
  'Dynamic Forms',
  'MSP Billing',
  'Practice Management',
  'Practice Management - Access',
  'Recalls / Reminders',
  'Report Builders',
  'Security / Access Audit',
]

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
  { provider: 'BEARDWOOD, WALTER', pract: 'J40881', payee: '40881' },
]

export const MEMBERSHIP_COLUMNS: UserColumn[] = [
  { key: 'name', header: 'Name', width: 210 },
  { key: 'type', header: 'Type', width: 96 },
  { key: 'status', header: 'Status', width: 62, align: 'center' },
  { key: 'member', header: 'Member Type', width: 104 },
  { key: 'started', header: 'Started', width: 80, align: 'center' },
  { key: 'stopped', header: 'Stopped', width: 80, align: 'center' },
  { key: 'basket', header: 'Basket', width: 54, align: 'center' },
  { key: 'task', header: 'Task', width: 48, align: 'center' },
  { key: 'message', header: 'Message', width: 62, align: 'center' },
]
/* NOTE: the Membership List's column *widths* were not measured — the capture
   gives the nine captions and the no-gridlines / 29px-header shape only. The
   figures above are laid out to the captions and are not measurements. */
export const MEMBERSHIP_ROWS: UserRow[] = [
  { name: 'FAKE MEDICAL CLINIC PRG', type: 'ORGANIZATION', status: 'A', member: 'Provider', started: '2018.06.04', stopped: '', basket: 'Y', task: 'Y', message: 'Y' },
  { name: 'ACUTE 1 PLN 1 PRG', type: 'ORGROLE', status: 'A', member: 'Member', started: '2021.02.15', stopped: '', basket: 'N', task: 'Y', message: 'Y' },
]

/* --- tab 8: `Service Group` -----------------------------------------------
   `109df8904120` (1.25x, normalised). Headers are LEFT-aligned here, which is
   unusual for this family. Shipped typo in the footnote.                   */

export const SERVICE_GROUP_BAND = 'Service Group(s) / Pathway(s)'
export const SERVICE_GROUP_COLUMNS: UserColumn[] = [
  { key: 'name', header: 'Name', width: 210, headAlign: 'left' },
  { key: 'desc', header: 'Description', width: 360, headAlign: 'left' },
  { key: 'launch', header: 'Alternate Launch Modes', width: 220, headAlign: 'left' },
]
/* sic — "all user have access" */
export const SERVICE_GROUP_FOOTNOTE = '(note: all user have access to the Main Program)'
export const SERVICE_GROUP_ROWS: UserRow[] = [
  { name: 'MAIN', desc: 'Main Program', launch: '' },
  { name: 'MENTAL HEALTH', desc: 'Mental health pathway', launch: 'Chart' },
]

/* --- tab 9: `Subscription` ------------------------------------------------
   `f9aba57883ac`. The header row doubles as the toolbar: `Add` sits in it and
   each row carries its own Edit / Delete. The Subject cell renders a
   secondary grey qualifier under the value.                                */

export const SUBSCRIPTION_COLUMNS: UserColumn[] = [
  { key: 'event', header: 'Event', width: 220 },
  { key: 'subject', header: 'Subject', width: 190 },
  { key: 'method', header: 'Method', width: 100 },
  { key: 'priority', header: 'Priority', width: 90 },
  { key: 'start', header: 'Start', width: 84, align: 'center' },
  { key: 'end', header: 'End', width: 84, align: 'center' },
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
   `10777195a523`, `1ec8d9776da0`, `ad1978a4e8be`. Master/detail: a left list
   headed `Setting`, a right detail pane with a #C8DCFA caption bar.        */

export type OtherSetting = {
  name: string
  /** the description line under the caption bar, where the capture prints one */
  desc?: string
  fields: OtherField[]
}

export type OtherField =
  | { kind: 'drop'; label: string; w: number; options: string[]; value?: string; disabled?: boolean }
  | { kind: 'text'; label: string; w: number; value?: string }
  | { kind: 'radios'; label: string; options: string[]; value?: string }
  /** the `Expand Sections on Startup:` caption over three disabled drops */
  | { kind: 'sub'; label: string; fields: OtherField[] }

export const OTHER_SETTINGS: OtherSetting[] = [
  {
    name: 'Attachment Wizard',
    fields: [
      { kind: 'drop', label: 'Starting Tab Page:', w: 160, options: ['Forms', 'Letters', 'Recent'] },
      {
        kind: 'sub',
        label: 'Expand Sections on Startup:',
        fields: [
          { kind: 'drop', label: 'Forms:', w: 120, options: ['Yes', 'No'], disabled: true },
          { kind: 'drop', label: 'Letters:', w: 120, options: ['Yes', 'No'], disabled: true },
          { kind: 'drop', label: 'Recent:', w: 120, options: ['Yes', 'No'], disabled: true },
        ],
      },
      { kind: 'text', label: 'Recent Record Limit:', w: 44, value: '0' },
      { kind: 'drop', label: 'After Attaching Action:', w: 160, options: ['---'], value: '---' },
    ],
  },
  {
    name: 'Voice Service',
    desc: 'The MOIS Voice Service, when enabled, will launch the identify voice service software. '
      + 'This service is designed for cloud customers.',
    fields: [
      /* neither radio is selected in the capture */
      { kind: 'radios', label: 'Enabled:', options: ['Yes', 'No'] },
      { kind: 'drop', label: 'Software:', w: 200, options: [''], disabled: true },
    ],
  },
  {
    name: 'eFax Service',
    desc: 'The eFax account set below will be used by default for this user.',
    fields: [
      { kind: 'drop', label: 'Default eFax Account:', w: 220, options: [''], disabled: true },
    ],
  },
]

/* ===========================================================================
   The `Security Profile Settings` window   976 x 666, 4 tabs   `a1bd18a6fdfa`
   ======================================================================== */

export const SECURITY_PROFILE_TABS = [
  'Module / Window Access', 'Special Functions', 'Report Access', 'User List',
]
export const SECURITY_PROFILE_SIZE = { w: 976, h: 666 }
export const SECURITY_PROFILE_FOOTER = ['Apply Changes', 'Cancel']
export const SECURITY_PROFILE_TITLE = 'Security Profile Settings'

/** `415516e9d83a`. HAS gridlines, unlike the User Accounts grid. */
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
