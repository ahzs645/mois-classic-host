import { useSyncExternalStore } from 'react'
import { MOIS_TODAY } from './patients'
import { SESSION_USER } from './chartSession'
import {
  INBOX_FORWARDING_ROWS, SHARED_WITH_ME_ROWS, SHARING_WORKSPACE_ROWS, userListSpec,
  type UserRow,
} from './userManagement'

/* ============================================================================
   Workspace ▸ My Settings — the signed-in user's own settings.

   Two tree nodes, two screens:

     - `ws-set-workspace`  Workspace Settings        303743 `a2a1a0e8`, 303747 `3e63da6d`
                           → Edit… opens the User Account window on its
                             Workspace Management tab   303747 `200c97ac`
     - `ws-set-meds`       Favourite Medication List  303772 `9e33924a`

   Both belong to the person logged in rather than to a chart, so neither
   carries a patient banner; the view header names the user at its right
   (`ADMIN, SYS` / `SAMWAYS, KRYSTLE` / `ADMINISTRATOR` in the captures).

   The sharing rules and the favourites are what those screens edit, and the
   Workspace Settings panels have to show a rule written in the User Account
   window the moment Apply Changes closes it. The work area remounts on every
   tree node, so the state lives here, in one small store the shell resets
   when it mounts (the same arrangement as `workspaceStore.ts`).

   The rows are synthetic training data. The signed-in user's own sharing
   and forwarding rules are the ones `userManagement.ts` already gives the
   User Account window's Workspace Mgt tab, so Administration ▸ User Accounts
   and My Settings describe the same account.
   ========================================================================= */

/** The signed-in user's display name, as the view headers print it. */
export const MY_SETTINGS_USER = SESSION_USER
/** The login the status bar shows (`makeStatusCells`: `User: JALA2`). */
export const MY_SETTINGS_LOGIN = 'JALA2'

/* --- Workspace Settings: the four read-only panels -------------------------
   `a2a1a0e8` (2023 build) and `3e63da6d` (2016 build) agree on the panels,
   their order and their columns. A pale-blue caption band, then a plain
   white header ruled underneath, then zebra rows. An empty stop date prints
   as `-`. Forwarding Rule prints in capitals (`REASSIGN`). */

export type SettingsColumn = { key: string; header: string; width: number }

export type SettingsPanel = {
  id: 'sharing' | 'shared-with-me' | 'forwarding' | 'forwarded-to-me'
  caption: string
  columns: SettingsColumn[]
}

export const WORKSPACE_SETTINGS_PANELS: SettingsPanel[] = [
  {
    id: 'sharing',
    caption: 'Active Workspace Sharing Rules',
    columns: [
      { key: 'start', header: 'Start', width: 74 },
      { key: 'stop', header: 'Stop', width: 75 },
      { key: 'user', header: 'User Account', width: 250 },
    ],
  },
  {
    id: 'shared-with-me',
    caption: 'Workspaces Shared With Me',
    columns: [
      { key: 'start', header: 'Start', width: 74 },
      { key: 'stop', header: 'Stop', width: 75 },
      { key: 'user', header: 'User Account', width: 250 },
    ],
  },
  {
    id: 'forwarding',
    caption: 'Active Inbox Forwarding Rules',
    columns: [
      { key: 'start', header: 'Start', width: 74 },
      { key: 'stop', header: 'Stop', width: 75 },
      { key: 'forward', header: 'Forward\nto User', width: 139 },
      { key: 'rule', header: 'Forwarding\nRule', width: 110 },
    ],
  },
  {
    id: 'forwarded-to-me',
    caption: 'Inboxes Forwarded To Me',
    columns: [
      { key: 'start', header: 'Start', width: 74 },
      { key: 'stop', header: 'Stop', width: 75 },
      { key: 'from', header: 'Forwarded\nFrom User', width: 139 },
      { key: 'rule', header: 'Forwarding\nRule', width: 110 },
    ],
  },
]

/** The command row: `Edit...` and `Refresh`, nothing else — the panels are read-only. */
export const WORKSPACE_SETTINGS_COMMANDS = ['Edit...', 'Refresh']

/* --- the User Account window reached from My Settings ----------------------
   `200c97ac`: three tabs, the second current; `User Name:` and `Full Name:`
   across the top; `Apply Changes` / `Cancel` centred in the footer. The
   Inbox Forwarding band carries only New / Delete here (the Administration
   route's window adds Acknowledge Backlog / Reassign Backlog). `bae79d4e`,
   the same window for an account that belongs to a group, adds a fourth
   `Members` tab; the plain account does not have one. */

export const MY_USER_ACCOUNT_TABS = ['User Settings', 'Workspace Management', 'Prompt Windows']
export const MY_USER_ACCOUNT_SIZE = { w: 972, h: 668 }

/** Everyone the rule can name: the User Accounts list, less yourself. */
export const SHARE_USER_OPTIONS: string[] = [
  '',
  ...(userListSpec('ad-users')?.rows ?? [])
    .map((r) => String(r.display ?? ''))
    .filter((name) => name && name !== SESSION_USER),
]

/* --- Favourite Medication List ---------------------------------------------
   `9e33924a`: the capture's own two rows, T3 and ALESSE, with ALESSE current
   and its detail in the pane below. Columns are Clinic Favourite Meds'
   (`clinicManagement.ts`, `303074`): the same DataWindow, owned by a user
   instead of the clinic. */

export type FavouriteMed = {
  id: string
  identifier: string
  cdic: string
  medication: string
  dose: string
  amount: string
  atc: string
  generic: string
  indication: string
  comment: string
  noSubstitute: boolean
  noAdapt: boolean
  prn: boolean
  /** the Dose Detail tree: the dispense line, then the dose line */
  doseDetail: [string, string] | null
  created: string
  modified: string
}

const STAMP = `2016.12.08  16:02  ${SESSION_USER}`

const SEED_FAVOURITES: FavouriteMed[] = [
  {
    id: 't3',
    identifier: 'T3',
    cdic: '02163926',
    medication: 'TYLENOL WITH CODEINE NO. 3 - TAB',
    dose: '1 TAB ORAL BID',
    amount: '30 DAY',
    atc: 'N02AJ06',
    generic: 'ACETAMINOPHEN 300MG CODEINE PHOSPHATE 30MG CAFFEINE 15MG TABLET',
    indication: '',
    comment: '',
    noSubstitute: false,
    noAdapt: false,
    prn: false,
    doseDetail: ['DISPENSE: 30.0 DAY', '1.0 TAB ORAL BID'],
    created: STAMP,
    modified: STAMP,
  },
  {
    id: 'alesse',
    identifier: 'ALESSE',
    cdic: '02236975',
    medication: 'ALESSE 28',
    dose: '1 TAB ORAL AM',
    amount: '30 DAY',
    atc: 'G03AA07',
    generic: 'LEVONORGESTREL 100uG ETHINYL ESTRADIOL 20uG TABLET',
    indication: '',
    comment: '',
    noSubstitute: false,
    noAdapt: false,
    prn: false,
    doseDetail: ['DISPENSE: 30.0 DAY', '1.0 TAB ORAL AM'],
    created: STAMP,
    modified: STAMP,
  },
]

/** The CDIC prompt's catalogue, so a typed code fills Medication and the
    detail pane the way the F4 pick does. Synthetic, drawn from the rows the
    two favourite lists already carry. */
export const CDIC_CATALOGUE: Record<string, { medication: string; atc: string; generic: string }> = {
  '02163926': { medication: 'TYLENOL WITH CODEINE NO. 3 - TAB', atc: 'N02AJ06', generic: 'ACETAMINOPHEN 300MG CODEINE PHOSPHATE 30MG CAFFEINE 15MG TABLET' },
  '02236975': { medication: 'ALESSE 28', atc: 'G03AA07', generic: 'LEVONORGESTREL 100uG ETHINYL ESTRADIOL 20uG TABLET' },
  '02248630': { medication: 'ATORVASTATIN CALCIUM 20 MG TABLET', atc: 'C10AA05', generic: 'ATORVASTATIN CALCIUM' },
  '02045463': { medication: 'METFORMIN HCL 500 MG TABLET', atc: 'A10BA02', generic: 'METFORMIN HYDROCHLORIDE' },
  '02240947': { medication: 'RAMIPRIL 5 MG CAPSULE', atc: 'C09AA05', generic: 'RAMIPRIL' },
  '00628115': { medication: 'AMOXICILLIN 500 MG CAPSULE', atc: 'J01CA04', generic: 'AMOXICILLIN TRIHYDRATE' },
  '02230489': { medication: 'LEVOTHYROXINE SODIUM 50 MCG TABLET', atc: 'H03AA01', generic: 'LEVOTHYROXINE SODIUM' },
}

export const blankFavourite = (id: string): FavouriteMed => ({
  id,
  identifier: '',
  cdic: '',
  medication: '',
  dose: '',
  amount: '',
  atc: '',
  generic: '',
  indication: '',
  comment: '',
  noSubstitute: false,
  noAdapt: false,
  prn: false,
  doseDetail: null,
  created: '',
  modified: '',
})

/** `yyyy.mm.dd  hh:mm  USER`, the Created / Last Modified line's format. */
export const settingsStamp = () => `${MOIS_TODAY}  09:00  ${SESSION_USER}`

/* --- the store ------------------------------------------------------------ */

export type WorkspaceSettingsState = {
  /** Sharing Workspace With — your workspace, shared with these accounts */
  sharing: UserRow[]
  /** Inbox Forwarding — every rule, active or not */
  forwarding: UserRow[]
  /** read-only: the rules other accounts wrote naming you */
  sharedWithMe: UserRow[]
  forwardedToMe: UserRow[]
  /** the saved Favourite Medication List */
  favourites: FavouriteMed[]
}

const initial = (): WorkspaceSettingsState => ({
  sharing: SHARING_WORKSPACE_ROWS.map((r) => ({ ...r })),
  forwarding: INBOX_FORWARDING_ROWS.map((r) => ({ ...r })),
  sharedWithMe: SHARED_WITH_ME_ROWS.map((r) => ({ ...r })),
  forwardedToMe: [],
  favourites: SEED_FAVOURITES.map((f) => ({ ...f })),
})

let state: WorkspaceSettingsState = initial()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function resetWorkspaceSettings() {
  state = initial()
  emit()
}

export function useWorkspaceSettings(): WorkspaceSettingsState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l) } },
    () => state,
    () => state,
  )
}

export const workspaceSettingsStore = {
  get: () => state,
  /** Apply Changes on the User Account window's Workspace Management tab. */
  applyWorkspaceManagement(sharing: UserRow[], forwarding: UserRow[]) {
    state = { ...state, sharing, forwarding }
    emit()
  },
  /** Save on the Favourite Medication List. */
  saveFavourites(favourites: FavouriteMed[]) {
    state = { ...state, favourites }
    emit()
  },
}

/* --- what the panels show --------------------------------------------------
   "Active" is the panel's own word: a rule that has started and has not
   stopped. MOIS prints an open stop date as `-`. */

const dash = (v: unknown) => (v === undefined || v === '' || v === '--' ? '-' : String(v))

export const isActiveRule = (r: UserRow, today = MOIS_TODAY) => {
  const start = String(r.start ?? '')
  const stop = String(r.stop ?? '')
  return (!start || start <= today) && (!stop || stop === '--' || stop >= today)
}

export function panelRows(panel: SettingsPanel['id'], s: WorkspaceSettingsState): Record<string, string>[] {
  switch (panel) {
    case 'sharing':
      return s.sharing.filter((r) => isActiveRule(r)).map((r) => ({
        start: dash(r.start), stop: dash(r.stop), user: dash(r.user),
      }))
    case 'shared-with-me':
      return s.sharedWithMe.map((r) => ({ start: dash(r.start), stop: dash(r.stop), user: dash(r.user) }))
    case 'forwarding':
      return s.forwarding.filter((r) => isActiveRule(r)).map((r) => ({
        start: dash(r.start), stop: dash(r.stop), forward: dash(r.forward), rule: String(r.rule ?? '').toUpperCase(),
      }))
    case 'forwarded-to-me':
      return s.forwardedToMe.map((r) => ({
        start: dash(r.start), stop: dash(r.stop), from: dash(r.from), rule: String(r.rule ?? '').toUpperCase(),
      }))
  }
}
