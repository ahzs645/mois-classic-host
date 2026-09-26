import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBGroupBox, PBInput, PBLookup, PBRadio, PBSelect,
  PBTabs, PBTextArea, pbSlug, usePBInstrumentation,
} from '../pb'
import type { PBColumn } from '../pb'
import {
  ALIAS_SOURCES, FACILITY_LOCATIONS, FACILITY_LOCATIONS_KEY, MSP_LOCATIONS, MSP_LOCATION_TEXT, PAYMENT_MODES,
  VISIT_MODES, clinicListSpec, clinicRowsKey, type ClinicRow,
} from '../data/clinicManagement'
import { INBOX_FORWARDING_COLUMNS, SHARING_WORKSPACE_COLUMNS, userListSpec, type UserColumn } from '../data/userManagement'
import { visitCodeRows } from '../data/daybook'
import { MOIS_TODAY } from '../data/patients'
import { registerScreenWindows, useSessionState, type ScreenWindow } from '../host/screen-windows'
import { SESSION_USER } from '../data/chartSession'
import { CmdButton } from './CmdButton'
import { DemographicModal } from './DemographicDialogs'
import {
  BillingServiceCodeLookup, ChangeAssociatedUserDialog, ServiceConceptSearchWindow, type AssociationChange,
} from './AdminPickerWindows'

/* ============================================================================
   Administration ▸ Clinic Management / External Service Providers — the
   windows the list screens (screens/ClinicListView.tsx) raise.

     new-provider-profile  Provider List ▸ New Record         303184 `b5972e0473c9…`
     provider              Continue, Edit Record, double-click user capture 2026-09-25
                           #61–#68, #73 (all eight tabs); 303184 `31cddff3bf56…`;
                           303054 `f6859591c31d…`
     (Change Provider Name, raised inside `provider`)          303054 `7c657a8764ed…`
     new-provider          Providers ▸ New Record             303335 `841a38580aae…`
     master-provider       Create Provider, Edit Record, dbl   303335 `1b2fbc9896a4…`,
                                                               303119 `9f8b3110d3a4…`
     new-resource          Resource List ▸ New Record         303204 `436e6bd7f93d…`
     resource-detail       Edit Record, double-click           303204 `8a6d8780e14b…`
     new-facility          Facility List ▸ New Record         303209 `8a23610389d4…`
     facility-detail       Edit Record, double-click           303209 `d84a442ab9f6…`
     new-service-center    Service Centers ▸ New Record       303211 `90a14afa8b17…`,
                                                               user capture 2026-09-25 #55
     service-center-detail Create Record, Edit Record, dbl     user capture 2026-09-25 #56, #57
     find-replace-service-center  Find / Replace               user capture 2026-09-25 #58–#60

   They sit in the frame's screen-window slot (host/screen-windows.tsx), so the
   frame's Close Dialog and a move to another tree node put them away, and each
   reports itself as `host.dialog` through DemographicModal's `dialog`.

   Edits are this stage session's only: Create Record / Continue / Create
   Provider add a row to the list, Save / Save Changes (F2) / Apply Changes
   write the window's fields back to it, Cancel drops them.

   The user's captures of the current build (2026-09-25, v02.31.23) outrank
   the help-site ones and fill what they left out: Service Center Detail, the
   Find and Replace: Service Center window, the Provider window's eighth tab
   (Online Booking), its header's Friendly Name and chart-access tick, and
   the pickers behind Change..., the Service cell's "…" and the Billing
   tab's Service Code "…" (screens/AdminPickerWindows.tsx).

   NOT BUILT, because no capture shows it: the window behind the Scheduling
   tab's Edit Display Settings. The button is drawn and raises nothing.
   ========================================================================= */

export const CLINIC_WINDOWS = [
  'new-provider-profile', 'provider', 'new-provider', 'master-provider',
  'new-resource', 'resource-detail', 'new-facility', 'facility-detail', 'new-service-center',
  'service-center-detail', 'find-replace-service-center',
] as const
registerScreenWindows([...CLINIC_WINDOWS])

/** the window New Record raises on each list that has one */
export const NEW_RECORD_WINDOW: Record<string, string> = {
  'ad-provider-list': 'new-provider-profile',
  'ad-providers': 'new-provider',
  'ad-resource-list': 'new-resource',
  'ad-facility-list': 'new-facility',
  'ad-service-centers': 'new-service-center',
}

/** the window Edit Record and a double-click raise, where it is captured */
export const EDIT_RECORD_WINDOW: Record<string, string> = {
  'ad-provider-list': 'provider',
  'ad-providers': 'master-provider',
  'ad-resource-list': 'resource-detail',
  'ad-facility-list': 'facility-detail',
  /* user capture 2026-09-25 #56 */
  'ad-service-centers': 'service-center-detail',
}

/** the window a list's Find / Replace raises, where it is captured (#58) */
export const FIND_REPLACE_WINDOW: Record<string, string> = {
  'ad-service-centers': 'find-replace-service-center',
}

/* --------------------------------------------------------------------------
   Session rows
   ------------------------------------------------------------------------ */

type Update = (fn: (prev: ClinicRow[]) => ClinicRow[]) => void

/**
 * A list's rows this session. `useSessionState` pins its initial value at
 * first render, and the list screen stays mounted across tree nodes, so the
 * store holds `null` until the first edit and the node's own rows stand in.
 */
export function useClinicRows(node: string): [ClinicRow[], Update] {
  const base = clinicListSpec(node)?.rows ?? EMPTY
  const [stored, setStored] = useSessionState<ClinicRow[] | null>(clinicRowsKey(node), null)
  const update = useCallback<Update>((fn) => setStored((prev) => fn(prev ?? base)), [setStored, base])
  return [stored ?? base, update]
}
const EMPTY: ClinicRow[] = []

const keyOf = (node: string) => clinicListSpec(node)?.anchorKey ?? 'name'
const S = (v: unknown) => (v == null ? '' : String(v))
const fieldId = (label: string) => `host.mois.field.${pbSlug(label)}`

function patchRow(update: Update, node: string, key: string, patch: ClinicRow) {
  const k = keyOf(node)
  update((rows) => rows.map((r) => (S(r[k]) === key ? { ...r, ...patch } : r)))
}

/* --------------------------------------------------------------------------
   Furniture
   ------------------------------------------------------------------------ */

const HINT: CSSProperties = { color: '#808080' }
/* a read-only identity field: grey face, bold ink (Resource / Facility Code) */
const LOCKED: CSSProperties = { background: '#e8e8e8', fontWeight: 700 }
/* a field MOIS fills itself while Synchronize is ticked */
const SYNCED: CSSProperties = { background: '#c8c8c8' }

/** label, then the control(s), on one line */
function Line({ label, w = 92, right, children, style }: {
  label?: ReactNode; w?: number; right?: boolean; children?: ReactNode; style?: CSSProperties
}) {
  return (
    <div className="pb-row" style={{ gap: 6, padding: '1px 0', alignItems: 'center', minHeight: 22, ...style }}>
      <span className="pb-form__label" style={{ width: w, flex: 'none', textAlign: right ? 'right' : undefined }}>{label}</span>
      {children}
    </div>
  )
}

/** a navy caption over a grey rule — "Provider Identification", "Service Information" */
function Head({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ color: '#000080', fontWeight: 700, padding: '6px 8px 3px', borderBottom: '1px solid #a0a0a0', flex: 'none', ...style }}>
      {children}
    </div>
  )
}

/** the navy band a detail window opens with ("Resource", "Facility") */
const NavyBand = ({ children }: { children: ReactNode }) => (
  <div className="pb-viewhead"><span className="pb-viewhead__title">{children}</span></div>
)

/** the centred button pair, with an optional button parked at the left */
function Footer({ left, children }: { left?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 9px', flex: 'none', borderTop: '1px solid #c9c9c9' }}>
      <span>{left}</span>
      <span className="pb-row" style={{ gap: 8 }}>{children}</span>
      <span />
    </div>
  )
}

const Btn = ({ command, w = 88, onClick, children }: { command: string; w?: number; onClick?: () => void; children: ReactNode }) => (
  <CmdButton command={command} style={{ width: w }} onClick={onClick}>{children}</CmdButton>
)

/** a grid a tab or a detail window carries, New adding a blank row and Delete removing the current one */
function EditGrid<T extends Record<string, any>>({ caption, scope, columns, initial, right, blank, height }: {
  caption: string; scope: string; columns: PBColumn<T>[]; initial?: T[]; right?: ReactNode; blank: T; height?: number
}) {
  const host = usePBInstrumentation()
  const [rows, setRows] = useState<T[]>(initial ?? [])
  const [cur, setCur] = useState(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: height ?? 0, border: '1px solid #8a8a8a' }}>
      <PBBand
        right={(
          <>
            {right}
            {['New', 'Delete'].map((b) => (
              <PBButton
                key={b}
                size="sm"
                data-tutorial-id={host?.anchor('command', `${scope}-${pbSlug(b)}`)}
                onClick={() => {
                  host?.report('command', { command: `${scope}-${pbSlug(b)}` })
                  if (b === 'New') { setRows((r) => [...r, { ...blank }]); setCur(rows.length) }
                  else { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0) }
                }}
              >
                {b}
              </PBButton>
            ))}
          </>
        )}
      >
        {caption}
      </PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#ffffff' }}>
        <PBDataWindow<T> columns={columns} rows={rows} current={cur} onCurrentChange={setCur} empty=" " />
      </div>
    </div>
  )
}

const umCols = (cols: UserColumn[]): PBColumn<ClinicRow>[] =>
  cols.map((c) => ({ key: c.key, header: c.header, width: c.width, align: c.align, headAlign: 'center' }))

/* ===========================================================================
   The layer the list screen renders: whichever of these the slot names.
   ======================================================================== */

export function ClinicEditorLayer({ window: win, close, open, onAdded }: {
  window: ScreenWindow | null
  close: () => void
  open: (id: string, args?: Record<string, unknown>) => void
  /** a creation dialog put a row at the end of its list */
  onAdded?: () => void
}) {
  if (!win) return null
  const key = S(win.args?.key)
  switch (win.id) {
    case 'new-provider-profile': return <NewProviderProfileDialog close={close} open={open} onAdded={onAdded} />
    case 'provider': return <ProviderWindow key={key} rowKey={key} close={close} />
    case 'new-provider': return <NewMasterProviderDialog close={close} open={open} onAdded={onAdded} />
    case 'master-provider': return <MasterProviderWindow key={key} rowKey={key} close={close} />
    case 'new-resource': return <NewResourceDialog close={close} onAdded={onAdded} />
    case 'resource-detail': return <ResourceDetailWindow key={key} rowKey={key} close={close} />
    case 'new-facility': return <NewFacilityDialog close={close} onAdded={onAdded} />
    case 'facility-detail': return <FacilityDetailWindow key={key} rowKey={key} close={close} />
    case 'new-service-center': return <NewServiceCenterDialog close={close} open={open} onAdded={onAdded} />
    case 'service-center-detail': return <ServiceCenterDetailWindow key={key} rowKey={key} close={close} />
    case 'find-replace-service-center': return <FindReplaceServiceCenterDialog close={close} />
    default: return null
  }
}

/** Code is "(required - unique)" on every New … dialog here */
function codeFree(rows: ClinicRow[], code: string): boolean {
  const c = code.trim().toUpperCase()
  return Boolean(c) && !rows.some((r) => S(r.code).toUpperCase() === c)
}

/* ===========================================================================
   New Provider Profile                 303184 `b5972e0473c9…` (125%)

   First / Middle / Last Name; a rule; Display Name (grey while synchronized)
   with ☑ Synchronize with Name Fields; a rule; Signature Line, the same; a
   rule; User Profile drop-down and its two-line note; Continue / Cancel.
   Display Name is `LAST, FIRST` and Signature Line `FIRST LAST` — the middle
   name is in neither (`7c657a8764ed…`: SAMANTHA LAURA WIGGINS →
   `WIGGINS, SAMANTHA` / `SAMANTHA WIGGINS`).
   ======================================================================== */

const displayOf = (first: string, last: string) => [last, first].filter(Boolean).join(', ').toUpperCase()
const signatureOf = (first: string, last: string) => [first, last].filter(Boolean).join(' ').toUpperCase()

/** the User Accounts roster, as New Provider Profile's User Profile drops it */
const userProfiles = () => ['', ...(userListSpec('ad-users')?.rows ?? []).map((r) => S(r.display))]

function NameBlock({ names, onNames, prefix = '' }: {
  names: { first: string; middle: string; last: string; display: string; signature: string; syncDisplay: boolean; syncSignature: boolean }
  onNames: (next: typeof names) => void
  /** Change Provider Name sits over the Provider window, whose own fields
      carry the plain anchors */
  prefix?: string
}) {
  const set = (patch: Partial<typeof names>) => onNames({ ...names, ...patch })
  const display = names.syncDisplay ? displayOf(names.first, names.last) : names.display
  const signature = names.syncSignature ? signatureOf(names.first, names.last) : names.signature
  const rule = <div style={{ height: 1, background: '#a0a0a0', margin: '8px 0' }} />
  const text = (label: string, key: 'first' | 'middle' | 'last') => (
    <Line label={label} w={96}>
      <PBInput w={176} value={names[key]} onChange={(e) => set({ [key]: e.target.value })} data-tutorial-id={fieldId(prefix + label)} />
    </Line>
  )
  return (
    <>
      {text('First Name:', 'first')}
      {text('Middle Name:', 'middle')}
      {text('Last Name:', 'last')}
      {rule}
      <Line label="Display Name:" w={96}>
        <PBInput
          w={264}
          value={display}
          readOnly={names.syncDisplay}
          style={names.syncDisplay ? SYNCED : undefined}
          onChange={(e) => set({ display: e.target.value })}
          data-tutorial-id={fieldId(`${prefix}Display Name`)}
        />
        <PBCheckbox
          label="Synchronize with Name Fields"
          checked={names.syncDisplay}
          onChange={(v) => set({ syncDisplay: v, display })}
          tutorialId={fieldId(`${prefix}sync-display-name`)}
        />
      </Line>
      {rule}
      <Line label="Signature Line:" w={96}>
        <PBInput
          w={264}
          value={signature}
          readOnly={names.syncSignature}
          style={names.syncSignature ? SYNCED : undefined}
          onChange={(e) => set({ signature: e.target.value })}
          data-tutorial-id={fieldId(`${prefix}Signature Line`)}
        />
        <PBCheckbox
          label="Synchronize with Name Fields"
          checked={names.syncSignature}
          onChange={(v) => set({ syncSignature: v, signature })}
          tutorialId={fieldId(`${prefix}sync-signature-line`)}
        />
      </Line>
    </>
  )
}

const blankNames = { first: '', middle: '', last: '', display: '', signature: '', syncDisplay: true, syncSignature: true }
const resolved = (n: typeof blankNames) => ({
  ...n,
  display: n.syncDisplay ? displayOf(n.first, n.last) : n.display,
  signature: n.syncSignature ? signatureOf(n.first, n.last) : n.signature,
})

function NewProviderProfileDialog({ close, open, onAdded }: {
  close: () => void; open: (id: string, args?: Record<string, unknown>) => void; onAdded?: () => void
}) {
  const [rows, update] = useClinicRows('ad-provider-list')
  const [names, setNames] = useState(blankNames)
  const [profile, setProfile] = useState('')
  const proceed = () => {
    const n = resolved(names)
    /* a profile needs a name, and the list is keyed on it */
    if (!n.display || rows.some((r) => S(r.name) === n.display)) return
    update((prev) => [...prev, {
      name: n.display, pract: '', payee: '', payment: '', ptype: '', active: 'Y', serviceEnd: '',
      first: n.first, middle: n.middle, last: n.last, display: n.display, signature: n.signature,
      userProfile: profile, userAssigned: profile ? MOIS_TODAY : '',
    }])
    onAdded?.()
    /* 303184 step 9: Continue opens the Provider window on the new profile */
    open('provider', { key: n.display })
  }
  return (
    <DemographicModal title="New Provider Profile" width={552} onClose={close} dialog="new-provider-profile">
      <div style={{ padding: '10px 14px 6px', background: 'var(--pb-face)' }}>
        <NameBlock names={names} onNames={setNames} />
        <div style={{ height: 1, background: '#a0a0a0', margin: '8px 0' }} />
        <Line label="User Profile:" w={96} style={{ alignItems: 'flex-start' }}>
          <div>
            <PBSelect w={176} options={userProfiles()} value={profile} onChange={(e) => setProfile(e.target.value)} data-tutorial-id={fieldId('User Profile')} />
            <div style={{ paddingTop: 3 }}>
              Providers requiring electronic downloads or workspace functionality<br />
              MUST be associated to a User Profile.
            </div>
          </div>
        </Line>
      </div>
      <Footer>
        <Btn command="continue" w={100} onClick={proceed}>Continue</Btn>
        <Btn command="cancel" w={88} onClick={close}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* ===========================================================================
   Provider                             user capture 2026-09-25 #61–#68, #73
                                        (v02.31.23; ~1120 x 830, 975 x 722
                                        at 1:1), over 303184 `31cddff3bf56…`
                                        and 303054 `f6859591c31d…`

   A top-level window (it hangs off the desktop in every capture) with a
   close box only. The light-blue identity strip: First / Middle / Last Name
   on the left and Display Name / Signature Line in the middle, all grey and
   read-only with bold ink; Friendly Name under them, white and editable;
   Change Name... at the top right and ☐ Can be used to control chart access
   under it. Then EIGHT tabs — General · Scheduling · Billing · Alias ID ·
   Workspace · Service · Online Booking · Telehealth — whose selected caption
   is bold and outlined, and Save at the left / Save / Close + Cancel
   centred. Save keeps the window open ("Click 'Save' at any point and
   continue editing"), Save / Close commits and closes.

   Each tab's blocks are bold navy captions inside lightly outlined boxes
   (`Group` below) rather than captions set into a Win32 group-box border.
   ======================================================================== */

const PROVIDER_TABS = ['General', 'Scheduling', 'Billing', 'Alias ID', 'Workspace', 'Service', 'Online Booking', 'Telehealth']

type Draft = Record<string, string | boolean | undefined>

/** a clinic provider's name split the way the list prints it: `LAST, FIRST (DESIGNATION)` */
function providerSeed(row: ClinicRow): Draft {
  const name = S(row.name)
  const [lastRaw = '', firstRaw = ''] = name.includes(',') ? name.split(',').map((s) => s.trim()) : [name, '']
  const first = row.first !== undefined ? S(row.first) : firstRaw.replace(/\s*\(.*\)$/, '')
  const last = row.last !== undefined ? S(row.last) : lastRaw
  /* the User Accounts roster already names these people; the provider's
     associated user is the account of the same name */
  const plain = name.replace(/\s*\(.*\)$/, '')
  const user = (userListSpec('ad-users')?.rows ?? []).find((r) => S(r.display) === plain)
  return {
    first, middle: '', last, display: name, signature: signatureOf(first, last), friendly: '',
    activeYes: row.active !== 'N', serviceEnd: S(row.serviceEnd), agreement: '',
    pract: S(row.pract), payee: S(row.payee), ptype: S(row.ptype),
    paymentMode: PAYMENT_MODES.includes(S(row.payment)) ? S(row.payment) : '',
    userProfile: user ? S(user.display) : '', userAssigned: user ? S(user.effective) : '',
    scheduleAppts: true, access: 'public',
    features: true,
    ...row,
  }
}

/** the per-provider history Change Associated User files (#69) */
const associationKey = (provider: string) => `admin:provider:${provider}:associated-user-history`

function ProviderWindow({ rowKey, close }: { rowKey: string; close: () => void }) {
  const [rows, update] = useClinicRows('ad-provider-list')
  const [key, setKey] = useState(rowKey)
  const row = rows.find((r) => S(r.name) === key) ?? { name: key }
  const [draft, setDraft] = useState<Draft>(() => providerSeed(row))
  const [tab, setTab] = useState(PROVIDER_TABS[0]!)
  const [renaming, setRenaming] = useState(false)
  const [changingUser, setChangingUser] = useState(false)
  const [history, setHistory] = useSessionState<AssociationChange[] | null>(associationKey(rowKey), null)
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }))
  /* a provider already associated has the association's own first row */
  const changes = history ?? (draft.userProfile
    ? [{ start: S(draft.userAssigned), user: S(draft.userProfile), by: SESSION_USER, note: 'New Record' }]
    : [])

  const save = () => {
    const name = S(draft.display) || key
    patchRow(update, 'ad-provider-list', key, {
      ...draft,
      name,
      active: draft.activeYes ? 'Y' : 'N',
      serviceEnd: S(draft.serviceEnd),
      pract: S(draft.pract),
      payee: S(draft.payee),
      ptype: S(draft.ptype),
      payment: S(draft.paymentMode) || S(row.payment),
    })
    setKey(name)
  }

  /* grey, read-only, bold (#61) */
  const ident = (label: string, value: string, w: number, right?: boolean) => (
    <Line label={label} w={right ? 100 : 80} right={right} style={{ minHeight: 21 }}>
      <PBInput w={w} value={value} readOnly style={IDENT} data-tutorial-id={fieldId(label)} />
    </Line>
  )

  return (
    <DemographicModal title="Provider" width={975} height={722} onClose={close} dialog="provider">
      <div className="pb-row" style={{
        alignItems: 'flex-start', gap: 0, padding: '5px 10px 4px', flex: 'none',
        background: 'linear-gradient(#f3f9fd, #cfe7f7)', borderBottom: '1px solid #9ab',
      }}>
        <div>
          {ident('First Name:', S(draft.first), 190)}
          {ident('Middle Name:', S(draft.middle), 190)}
          {ident('Last Name:', S(draft.last), 190)}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {ident('Display Name:', S(draft.display), 212, true)}
          {ident('Signature Line:', S(draft.signature), 212, true)}
          <Line label="Friendly Name:" w={100} right style={{ minHeight: 21 }}>
            <PBInput w={212} value={S(draft.friendly)} onChange={(e) => set({ friendly: e.target.value })} data-tutorial-id={fieldId('Friendly Name')} />
          </Line>
        </div>
        <div style={{ marginLeft: 36, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 26 }}>
          <Btn command="change-name" w={92} onClick={() => setRenaming(true)}>Change Name...</Btn>
          <PBCheckbox
            label="Can be used to control chart access"
            checked={Boolean(draft.chartAccess)}
            onChange={(v) => set({ chartAccess: v })}
            tutorialId={fieldId('Can be used to control chart access')}
          />
        </div>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBTabs tabs={PROVIDER_TABS} active={tab} onChange={setTab} compact face>
          <div key={tab} style={{ flex: '1 1 auto', minHeight: 0, minWidth: 0, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ProviderTab tab={tab} draft={draft} set={set} onChangeUser={() => setChangingUser(true)} />
          </div>
        </PBTabs>
      </div>

      <Footer left={<Btn command="save" w={88} onClick={save}>Save</Btn>}>
        <Btn command="save-close" w={88} onClick={() => { save(); close() }}>Save / Close</Btn>
        <Btn command="cancel" w={88} onClick={close}>Cancel</Btn>
      </Footer>

      {renaming && (
        <ChangeProviderNameDialog
          draft={draft}
          onClose={() => setRenaming(false)}
          onSave={(n) => { set({ first: n.first, middle: n.middle, last: n.last, display: n.display, signature: n.signature }); setRenaming(false) }}
        />
      )}

      {changingUser && (
        <ChangeAssociatedUserDialog
          current={S(draft.userProfile)}
          history={changes}
          onClose={() => setChangingUser(false)}
          onContinue={(user, note) => {
            set({ userProfile: user, userAssigned: MOIS_TODAY })
            setHistory([{ start: MOIS_TODAY, user, by: SESSION_USER, note }, ...changes])
            setChangingUser(false)
          }}
        />
      )}
    </DemographicModal>
  )
}

/* the grey read-only face of the identity strip's fields (#61) */
const IDENT: CSSProperties = { background: '#e4e4e4', fontWeight: 700 }

/** A block of a Provider tab: bold navy caption inside a light outline (#61–#68). */
function Group({ title, fill, style, children }: { title: ReactNode; fill?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <div style={{
      border: '1px solid #d4d4d4', padding: '4px 10px 8px', minWidth: 0,
      ...(fill ? { display: 'flex', flexDirection: 'column', minHeight: 0 } : null),
      ...style,
    }}>
      <div style={{ color: '#000080', fontWeight: 700, padding: '0 0 6px' }}>{title}</div>
      {children}
    </div>
  )
}

function ProviderTab({ tab, draft, set, onChangeUser }: {
  tab: string; draft: Draft; set: (patch: Draft) => void; onChangeUser: () => void
}) {
  const [lookup, setLookup] = useState<string | null>(null)
  const text = (label: string, key: string, w: number, extra?: Partial<Parameters<typeof PBInput>[0]>) => (
    <PBInput w={w} value={S(draft[key])} onChange={(e) => set({ [key]: e.target.value })} data-tutorial-id={fieldId(label)} {...extra} />
  )
  const tick = (label: string, key: string, caption: ReactNode) => (
    <PBCheckbox label={caption} checked={Boolean(draft[key])} onChange={(v) => set({ [key]: v })} tutorialId={fieldId(label)} />
  )

  switch (tab) {
    /* #61: Status, then Correspondence Information — the five letterhead
       lines MOIS prints on prescriptions, letter templates and fillable
       forms, the "other values" that are not printed, and Primary Location */
    case 'General': return (
      <>
        <Group title="Status">
          <Line label="Active:">{tick('Active', 'activeYes', 'Yes')}</Line>
          <Line label="Service End:">{text('Service End', 'serviceEnd', 74)}</Line>
          <Line label="Agreement:">{text('Agreement', 'agreement', 74)}<span style={HINT}>(service agreement accepted date)</span></Line>
        </Group>
        <Group title="Correspondence Information">
          <div style={{ ...HINT, padding: '0 0 4px' }}>
            The following information is used throughout MOIS to personalize report output, Rx printouts, Letter Templates, Fillable PDF forms and so on.
          </div>
          {[1, 2, 3, 4, 5].map((n) => (
            <Line key={n} label={n === 1 ? 'Letterhead:' : ''}>
              {text(`Letterhead ${n}`, `letterhead${n}`, 264)}
              <span style={HINT}>(letterhead {n})</span>
            </Line>
          ))}
          <div style={{ ...HINT, padding: '4px 0' }}>
            Other values (this information is not automatically included in the letterhead sections of report - for this information to appear in the letterhead, it must be duplicated in the above designated fields)
          </div>
          <Line label="Postal Code:">{text('Postal Code', 'postal', 96, { align: 'center' })}</Line>
          <Line label="Phone 1:">{text('Phone 1', 'phone1', 96, { align: 'center' })}</Line>
          <Line label="Phone 2:">{text('Phone 2', 'phone2', 96, { align: 'center' })}</Line>
          <Line label="Fax 1:">{text('Fax 1', 'fax1', 96, { align: 'center' })}</Line>
          <div style={{ ...HINT, padding: '4px 0' }}>
            Primary Location is used to inform Labs or other testing facilities of this provider&apos;s primary location when it is different from the current clinic.
          </div>
          <Line label="Primary Location:">{text('Primary Location', 'primaryLocation', 264)}</Line>
        </Group>
      </>
    )

    /* #62: Scheduler / Encounter Settings beside Mandatory Documentation
       Settings, then Schedule Access. The window behind Edit Display
       Settings is not captured; the button raises nothing. */
    case 'Scheduling': return (
      <>
        <div className="pb-row" style={{ gap: 8, alignItems: 'stretch' }}>
          <Group title="Scheduler / Encounter Settings" style={{ flex: '1 1 0' }}>
            <Line label="Schedule Appts:" w={88}>{tick('Schedule Appts', 'scheduleAppts', 'Must be able to schedule appointments')}</Line>
            <Line label="Time Slots:" w={88}>{text('Time Slots', 'timeSlots', 36, { align: 'center' })}<span style={HINT}>(slots per appointment - 1 slot = 5 mins)</span></Line>
            <Line label="Visit Code" w={88}>
              <PBSelect w={78} options={['', ...visitCodeRows.map((v) => v.code)]} value={S(draft.visitCode)} onChange={(e) => set({ visitCode: e.target.value })} data-tutorial-id={fieldId('Visit Code')} />
            </Line>
            <Line label="Visit Mode:" w={88}>
              <PBSelect w={282} options={['', ...VISIT_MODES]} value={S(draft.visitMode)} onChange={(e) => set({ visitMode: e.target.value })} data-tutorial-id={fieldId('Visit Mode')} />
            </Line>
            <Line label="Attending:" w={88}>{tick('Attending', 'attendingMandatory', 'Make attending mandatory for encounters with notes')}</Line>
            <div className="pb-row" style={{ justifyContent: 'flex-end', paddingTop: 2 }}>
              <Btn command="edit-display-settings" w={110}>Edit Display Settings</Btn>
            </div>
          </Group>
          <Group title="Mandatory Documentation Settings" style={{ flex: '1 1 0' }}>
            <div className="pb-row" style={{ alignItems: 'flex-start', gap: 6 }}>
              <div>
                <Line label="Service Events:" w={88}>{tick('Service Events', 'mandServiceEvent', 'Require at Least One Service Event')}</Line>
                <Line label="Mandatory Start:" w={88}>{tick('Mandatory Start', 'mandStart', 'Require a Start Time (seen)')}</Line>
                <Line label="Mandatory Stop:" w={88}>{tick('Mandatory Stop', 'mandStop', 'Require a Stop Time (discharge)')}</Line>
              </div>
              <div style={{ ...HINT, paddingTop: 20, fontSize: 11, whiteSpace: 'normal', minWidth: 0 }}>
                Note:<br />If both mandatory start and stop are checked, then the duration of care field is required
              </div>
            </div>
            <div style={{ color: '#000080', fontWeight: 700, padding: '2px 0', whiteSpace: 'normal' }}>
              Exclude from mandatory documentation encounters that have either of the following:
            </div>
            <Line label="Visit Code:" w={88}><PBLookup w={212} name="exclude-visit-code" value={S(draft.excludeVisitCode)} onChange={(v) => set({ excludeVisitCode: v })} /></Line>
            <Line label="Appt. Status:" w={88}><PBLookup w={212} name="exclude-appt-status" value={S(draft.excludeApptStatus)} onChange={(v) => set({ excludeApptStatus: v })} /></Line>
          </Group>
        </div>
        <Group title="Schedule Access" fill style={{ flex: '1 1 auto' }}>
          <div className="pb-row" style={{ gap: 24, padding: '2px 0' }}>
            <PBRadio name="schedule-access" label="Public Access" checked={draft.access !== 'private'} onChange={() => set({ access: 'public' })} tutorialId={fieldId('Public Access')} />
            <PBRadio name="schedule-access" label="Private Access" checked={draft.access === 'private'} onChange={() => set({ access: 'private' })} tutorialId={fieldId('Private Access')} />
          </div>
          <div style={{ color: '#000080', fontWeight: 700, padding: '4px 0 2px' }}>Who has access to this schedule</div>
          {/* only the public case is captured */}
          {draft.access !== 'private' && <div>All users with access to the scheduling module</div>}
        </Group>
      </>
    )

    /* #63: two groups both captioned "Payment Mode:" as shipped, then
       Service Code, whose four "…" open the Master Service Code List (#74) */
    case 'Billing': return (
      <>
        <Group title="Payment Mode:">
          <div className="pb-row" style={{ alignItems: 'flex-start', gap: 20 }}>
            <div style={{ width: 420 }}>
              <Line label="Practitioner No.:">{text('Practitioner No.', 'pract', 104)}<span style={HINT}>(MSP Practitioner Number)</span></Line>
              <Line label="Payee No.:">{text('Payee No.', 'payee', 104)}<span style={HINT}>(MSP Payee Number)</span></Line>
            </div>
            <div>
              <Line label="Practitioner Type:" w={90}>{text('Practitioner Type', 'ptype', 104)}</Line>
              <Line label="Prof. ID:" w={90}>{text('Prof. ID', 'profId', 104)}</Line>
            </div>
          </div>
        </Group>
        <Group title="Payment Mode:">
          <div className="pb-row" style={{ alignItems: 'flex-start', gap: 20 }}>
            <div style={{ width: 420 }}>
              <Line label="Payment Mode:">
                <PBSelect w={148} options={PAYMENT_MODES} value={S(draft.paymentMode)} onChange={(e) => set({ paymentMode: e.target.value })} data-tutorial-id={fieldId('Payment Mode')} />
              </Line>
              <Line label="Rural Retention:">{text('Rural Retention', 'rural', 74)}{tick('No Rural Retention Code', 'noRural', 'No Rural Retention Code')}</Line>
              <Line label="MSP Location:">
                <PBSelect w={74} options={MSP_LOCATIONS} value={S(draft.mspLocation)} onChange={(e) => set({ mspLocation: e.target.value })} data-tutorial-id={fieldId('MSP Location')} />
                <span style={HINT}>{MSP_LOCATION_TEXT[S(draft.mspLocation)] ?? ''}</span>
              </Line>
              <Line label="Facility:">{text('Facility', 'facility', 74)}</Line>
              <Line label="Sub-Facility">{text('Sub-Facility', 'subFacility', 74)}</Line>
            </div>
            <div>
              <Line label="ICBC Vendor No.:" w={90}>{text('ICBC Vendor No.', 'icbc', 104)}</Line>
            </div>
          </div>
        </Group>
        <Group title="Service Code">
          {[['Default Code:', 'defaultCode'], ['F11 Code:', 'f11'], ['F12 Code:', 'f12'], ['PBF Code:', 'pbf']].map(([label, key]) => (
            <Line key={key} label={label}>
              <PBLookup w={92} name={label!.replace(':', '')} value={S(draft[key!])} onChange={(v) => set({ [key!]: v })} onDots={() => setLookup(key!)} fieldId={fieldId(label!.replace(':', ''))} />
            </Line>
          ))}
          <div style={{ ...HINT, paddingLeft: 98 }}>
            (Population Based Funding Compensation default service code for patients enrolled in the PBF Model)
          </div>
        </Group>
        {lookup && (
          <BillingServiceCodeLookup
            onClose={() => setLookup(null)}
            onPick={(r) => { set({ [lookup]: r.code }); setLookup(null) }}
          />
        )}
      </>
    )

    /* #64: the associated user, then the List of interface IDs */
    case 'Alias ID': return (
      <>
        <AssociatedUser title="Alias ID's for" draft={draft} set={set} onChange={onChangeUser} />
        <EditGrid<ClinicRow>
          caption="List"
          scope="alias"
          blank={{ start: '', end: '', source: '', value: '', note: '' }}
          columns={[
            { key: 'start', header: 'Start Date', width: 72, align: 'center' },
            { key: 'end', header: 'End Date', width: 72, align: 'center' },
            {
              key: 'source', header: 'Source', width: 138,
              render: (r) => <PBSelect w="100%" options={['', ...ALIAS_SOURCES.map((s) => ({ value: s.code, label: s.code }))]} defaultValue={S(r.source)} />,
            },
            { key: 'value', header: 'Value', width: 230 },
            { key: 'note', header: 'Note', width: 393 },
          ]}
        />
      </>
    )

    /* #65: the associated user, Available Features, then the Inbox
       Forwarding / Sharing Workspace With sub-tabs */
    case 'Workspace': return <WorkspaceTab draft={draft} set={set} onChangeUser={onChangeUser} />

    /* #66, #73: Service List over Service Detail */
    case 'Service': return <ServiceTab />

    /* #67: Online Appointments, then the clinic's service locations, each
       with its own Turned On tick. The list is the Service Location List's
       own rows; with online booking off its text is greyed. */
    case 'Online Booking': return <OnlineBookingTab draft={draft} set={set} />

    /* #68: with telehealth off in System Settings, the tab is its labels,
       the bold instruction, Launch and the explanation — no fields */
    case 'Telehealth': return (
      <div style={{ padding: '18px 22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '114px 1fr', rowGap: 6 }}>
          <span>Meeting Provider:</span>
          <b data-tutorial-id={fieldId('Meeting Provider')}>Turn on Telehealth features in Administration &gt; System Settings</b>
          <span>Meeting Room Url:</span><span />
          <span>Personal Room:</span><span />
          <span>Instant Rooms:</span><span />
          <span>Dashboard Url:</span><span />
        </div>
        <div style={{ paddingLeft: 114, width: 450 }}>
          <div className="pb-row" style={{ justifyContent: 'center', width: 336, padding: '14px 0 10px' }}>
            <Btn command="launch" w={72}>Launch</Btn>
          </div>
          <div style={{ ...HINT, width: 336 }}>
            MOIS supports two types of video conferencing solutions: ...those that offer a &quot;waiting room&quot; functionality to a personal meeting room, like Zoom, Doxy.me, Webex and others ...or those that allow MOIS to create an instant meeting room for each encounter
          </div>
        </div>
      </div>
    )
    default: return null
  }
}

/** "Alias ID's for" / "Workspace for": the provider's associated User Account (#64, #65) */
function AssociatedUser({ title, draft, set, onChange }: {
  title: string; draft: Draft; set: (patch: Draft) => void; onChange: () => void
}) {
  return (
    <Group title={title}>
      <div className="pb-row" style={{ gap: 8, alignItems: 'center' }}>
        <span className="pb-form__label">Associated User</span>
        <PBInput w={260} readOnly value={S(draft.userProfile)} style={{ background: '#e8e8e8' }} data-tutorial-id={fieldId('Associated User')} />
        {/* raises Change Associated User (#69) */}
        <Btn command="associated-user-change" w={62} onClick={onChange}>Change...</Btn>
        <span style={{ width: 50 }} />
        <span className="pb-form__label">Date Assigned:</span>
        <PBInput w={74} readOnly align="center" value={S(draft.userAssigned)} style={{ background: '#e8e8e8' }} />
        <span className="pb-row__spacer" />
        <Btn command="remove-association" w={120} onClick={() => set({ userProfile: '', userAssigned: '' })}>Remove Association</Btn>
      </div>
    </Group>
  )
}

function WorkspaceTab({ draft, set, onChangeUser }: { draft: Draft; set: (patch: Draft) => void; onChangeUser: () => void }) {
  const [sub, setSub] = useState('Inbox Forwarding')
  const tick = (label: string, key: string, note: string) => (
    <Line label={`${label}:`} w={84}>
      <PBCheckbox label={note} checked={draft[key] !== false} onChange={(v) => set({ [key]: v })} tutorialId={fieldId(label)} />
    </Line>
  )
  return (
    <>
      <AssociatedUser title="Workspace for" draft={draft} set={set} onChange={onChangeUser} />
      <Group title="Available Features">
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 40 }}>
          <div>
            {tick('Basket', 'basket', '(for acknowledging clinical documents)')}
            {tick('Task List', 'taskList', '(for receiving / managing internal tasks)')}
            {tick('Message Board', 'messageBoard', '(for receiving / managing internal message)')}
          </div>
          <div>
            <Line label="Abbreviated Reference:" w={120}>
              <PBInput w={72} value={S(draft.abbrev)} onChange={(e) => set({ abbrev: e.target.value })} data-tutorial-id={fieldId('Abbreviated Reference')} />
            </Line>
            <div style={{ ...HINT, paddingLeft: 126 }}>(for the blended workspace initials column)</div>
          </div>
        </div>
      </Group>
      <div style={{ flex: '1 1 auto', minHeight: 200, display: 'flex', flexDirection: 'column' }}>
        <PBTabs tabs={['Inbox Forwarding', 'Sharing Workspace With']} active={sub} onChange={setSub} compact face>
          {sub === 'Inbox Forwarding'
            ? (
              <EditGrid<ClinicRow>
                key="forward"
                caption="Inbox Forwarding"
                scope="inbox-forwarding"
                blank={{ start: MOIS_TODAY, stop: '', forward: '', rule: 'Reassign', note: '' }}
                columns={umCols(INBOX_FORWARDING_COLUMNS).map((c) => (c.key === 'rule'
                  ? { ...c, render: (r: ClinicRow) => <span className="pb-row" style={{ gap: 6 }}>{['Reassign', 'Copy'].map((rule) => <PBRadio key={rule} name={`rule-${S(r.start)}`} label={rule} checked={S(r.rule) === rule} />)}</span> }
                  : c))}
              />
            )
            : (
              <EditGrid<ClinicRow>
                key="share"
                caption="Sharing Workspace With"
                scope="sharing-workspace"
                blank={{ start: MOIS_TODAY, stop: '', user: '', note: '' }}
                columns={umCols(SHARING_WORKSPACE_COLUMNS)}
              />
            )}
        </PBTabs>
      </div>
    </>
  )
}

/* #66 (empty), #73 (a new row): the Service List band carries ☐ Hide
   Stopped Services and New / Delete at its right. A new row is current
   (salmon) with a "…" in its Service cell — the MOIS - Universal Search
   Window over SNOMED-CT (#72) — a Default tick, blank Start / End, and a
   "…" for the Stopped Reason. Service Detail under it is empty until a row
   exists, then carries General Comment, Stopped Reason and Stopped Note,
   and the row's Record Created / Last Modified stamp. */
type ServiceRow = {
  service: string; code: string; default: boolean; start: string; end: string; stopped: string
  comment: string; stoppedNote: string; created: string
}

function ServiceTab() {
  const host = usePBInstrumentation()
  const [hide, setHide] = useState(false)
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [cur, setCur] = useState(0)
  const [searching, setSearching] = useState<number | null>(null)
  const shown = hide ? rows.filter((r) => !r.stopped) : rows
  const current = shown[Math.min(cur, Math.max(0, shown.length - 1))]
  const edit = (row: ServiceRow | undefined, patch: Partial<ServiceRow>) => {
    if (!row) return
    setRows((all) => all.map((r) => (r === row ? { ...r, ...patch } : r)))
  }
  const dots = (label: string, onPress?: () => void) => (
    <button
      type="button"
      className="pb-dw__dots"
      data-tutorial-id={host?.anchor('lookup', label)}
      onClick={(e) => { e.stopPropagation(); host?.report('lookup', { field: label }); onPress?.() }}
    >
      …
    </button>
  )
  const now = new Date()
  const stamp = () => `${MOIS_TODAY}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}  ${SESSION_USER}`
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 220, border: '1px solid #8a8a8a' }}>
        <PBBand
          right={(
            <>
              <span style={{ paddingRight: 30, fontWeight: 400 }}>
                <PBCheckbox label="Hide Stopped Services" checked={hide} onChange={setHide} tutorialId={fieldId('Hide Stopped Services')} />
              </span>
              {['New', 'Delete'].map((b) => (
                <PBButton
                  key={b}
                  size="sm"
                  data-tutorial-id={host?.anchor('command', `service-${pbSlug(b)}`)}
                  onClick={() => {
                    host?.report('command', { command: `service-${pbSlug(b)}` })
                    if (b === 'New') {
                      setRows((r) => [...r, { service: '', code: '', default: false, start: '', end: '', stopped: '', comment: '', stoppedNote: '', created: stamp() }])
                      setCur(shown.length)
                    } else if (current) {
                      setRows((r) => r.filter((x) => x !== current))
                      setCur(0)
                    }
                  }}
                >
                  {b}
                </PBButton>
              ))}
            </>
          )}
        >
          Service List
        </PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#ffffff' }}>
          <PBDataWindow<ServiceRow>
            rows={shown}
            current={Math.min(cur, Math.max(0, shown.length - 1))}
            onCurrentChange={setCur}
            empty=" "
            columns={[
              { key: 'service', header: 'Service', width: 426, headAlign: 'left' },
              { key: 'serviceDots', header: '', width: 16, dots: true, render: (_r, i) => dots('service', () => setSearching(i)) },
              { key: 'default', header: 'Default', width: 45, align: 'center', render: (r) => <PBCheckbox checked={r.default} onChange={(v) => edit(r, { default: v })} /> },
              { key: 'start', header: 'Start', width: 80, align: 'center' },
              { key: 'end', header: 'End', width: 78, align: 'center' },
              { key: 'stopped', header: 'Stopped Reason', width: 246, headAlign: 'left' },
              { key: 'stoppedDots', header: '', width: 16, dots: true, render: () => dots('stopped-reason') },
            ]}
          />
        </div>
      </div>
      <div style={{ border: '1px solid #8a8a8a', flex: 'none', minHeight: 196, display: 'flex', flexDirection: 'column' }}>
        <PBBand>Service Detail</PBBand>
        {current && (
          <>
            <div className="pb-row" style={{ alignItems: 'flex-start', gap: 16, padding: '6px 10px' }}>
              <div style={{ flex: '1 1 0' }}>
                <div>General Comment</div>
                <PBTextArea rows={5} w="100%" value={current.comment} onChange={(e) => edit(current, { comment: e.target.value })} data-tutorial-id={fieldId('General Comment')} />
              </div>
              <div style={{ flex: '1 1 0' }}>
                <div>Stopped Reason</div>
                <PBLookup w="100%" name="stopped-reason-detail" value={current.stopped} onChange={(v) => edit(current, { stopped: v })} />
                <div style={{ paddingTop: 6 }}>Stopped Note</div>
                <PBTextArea rows={3} w="100%" value={current.stoppedNote} onChange={(e) => edit(current, { stoppedNote: e.target.value })} data-tutorial-id={fieldId('Stopped Note')} />
              </div>
            </div>
            <div className="pb-row" style={{ gap: 0, padding: '3px 10px', borderTop: '1px solid #c9c9c9' }}>
              <span style={{ width: '50%' }}>Record Created:&nbsp;&nbsp;{current.created}</span>
              <span>Last Modified:</span>
            </div>
          </>
        )}
      </div>
      {searching !== null && (
        <ServiceConceptSearchWindow
          onClose={() => setSearching(null)}
          onPick={(r) => { edit(shown[searching], { service: r.term, code: r.code }); setSearching(null) }}
        />
      )}
    </>
  )
}

/* #67 — Online Appointments ▸ Online Booking ☐ Turned On, then the
   Online Booking Locations band over Turned On · Service Location. The
   locations are the Service Location List's rows, sorted; while booking is
   off every row reads grey and its tick cannot be set. */
function OnlineBookingTab({ draft, set }: { draft: Draft; set: (patch: Draft) => void }) {
  const [locations] = useClinicRows('ad-locations')
  const [cur, setCur] = useState(0)
  const on = Boolean(draft.onlineBooking)
  const picked = (draft.onlineLocations ? S(draft.onlineLocations).split('|') : []).filter(Boolean)
  const rows = [...locations].map((l) => ({ location: S(l.location) })).sort((a, b) => a.location.localeCompare(b.location))
  const toggle = (location: string, v: boolean) => set({
    onlineLocations: (v ? [...picked, location] : picked.filter((p) => p !== location)).join('|'),
  })
  return (
    <>
      <Group title="Online Appointments">
        <Line label="Online Booking:" w={84}>
          <PBCheckbox label="Turned On" checked={on} onChange={(v) => set({ onlineBooking: v })} tutorialId={fieldId('Online Booking')} />
        </Line>
      </Group>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 200, border: '1px solid #8a8a8a' }}>
        <PBBand>Online Booking Locations</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#ffffff' }}>
          <PBDataWindow<{ location: string }>
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            empty=" "
            rowTutorialId={(r) => `host.mois.row.online-location-${pbSlug(r.location)}`}
            columns={[
              /* the boxes draw normally but are protected while booking is off */
              { key: 'on', header: 'Turned On', width: 65, align: 'center', render: (r) => <PBCheckbox checked={picked.includes(r.location)} onChange={(v) => { if (on) toggle(r.location, v) }} /> },
              { key: 'location', header: 'Service Location', width: 465, render: (r) => <span style={on ? undefined : { color: '#a0a0a0' }}>{r.location}</span> },
            ]}
          />
        </div>
      </div>
    </>
  )
}

/* ===========================================================================
   Change Provider Name                 303054 `7c657a8764ed…` (552x339, 1:1)
   ======================================================================== */

function ChangeProviderNameDialog({ draft, onSave, onClose }: {
  draft: Draft
  onSave: (names: typeof blankNames) => void
  onClose: () => void
}) {
  const [names, setNames] = useState({
    ...blankNames,
    first: S(draft.first), middle: S(draft.middle), last: S(draft.last),
    display: S(draft.display), signature: S(draft.signature),
    /* an existing provider's display name need not be `LAST, FIRST` (a
       designation, a clinic name), so the boxes start ticked only when it is */
    syncDisplay: S(draft.display) === displayOf(S(draft.first), S(draft.last)),
    syncSignature: S(draft.signature) === signatureOf(S(draft.first), S(draft.last)),
  })
  return (
    <DemographicModal title="Change Provider Name" width={552} onClose={onClose} dialog="change-provider-name">
      <div style={{ padding: '10px 14px 6px', background: '#ffffff', borderBottom: '1px solid #8a8a8a' }}>
        <NameBlock names={names} onNames={setNames} prefix="new-" />
      </div>
      <Footer>
        <Btn command="change-name-save" w={78} onClick={() => onSave(resolved(names))}>Save</Btn>
        <Btn command="change-name-cancel" w={78} onClick={onClose}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* ===========================================================================
   New Provider (Master Provider List) 303335 `841a38580aae…` (1:1, v02.21)

   Given Names / Last Name / Provider Name / ID (grey while synchronized) with
   ☑ Synchronize with Given / Last Names; Create Provider / Cancel. The name
   is `LAST, Given` — the supplied list prints the last name in capitals and
   the given names as typed (`ABBEY, Mark Douglas`).
   ======================================================================== */

const masterName = (given: string, last: string) => [last.toUpperCase(), given].filter(Boolean).join(', ')

function NewMasterProviderDialog({ close, open, onAdded }: {
  close: () => void; open: (id: string, args?: Record<string, unknown>) => void; onAdded?: () => void
}) {
  const [rows, update] = useClinicRows('ad-providers')
  const [given, setGiven] = useState('')
  const [last, setLast] = useState('')
  const [sync, setSync] = useState(true)
  const [own, setOwn] = useState('')
  const name = sync ? masterName(given, last) : own
  const create = () => {
    if (!name.trim() || rows.some((r) => S(r.name) === name)) return
    update((prev) => [...prev, { name, given, last, sync, pract: '', spec: '', city: '', primary: '', secondary: '', fax: '' }])
    onAdded?.()
    /* 303335: Create Provider, then "Enter all the doctor's information" */
    open('master-provider', { key: name })
  }
  return (
    <DemographicModal title="New Provider" width={606} onClose={close} dialog="new-provider">
      <div style={{ padding: '14px 22px 4px' }}>
        <PBGroupBox title="New Provider">
          <div style={{ padding: '6px 0 4px 18px' }}>
            <Line label="Given Names:" w={118}><PBInput w={174} value={given} onChange={(e) => setGiven(e.target.value)} data-tutorial-id={fieldId('Given Names')} /></Line>
            <Line label="Last Name:" w={118}><PBInput w={174} value={last} onChange={(e) => setLast(e.target.value)} data-tutorial-id={fieldId('Last Name')} /></Line>
            <Line label="Provider Name / ID:" w={118}>
              <PBInput w={174} value={name} readOnly={sync} style={sync ? SYNCED : undefined} onChange={(e) => setOwn(e.target.value)} data-tutorial-id={fieldId('Provider Name / ID')} />
              <PBCheckbox label="Synchronize with Given / Last Names" checked={sync} onChange={(v) => { setOwn(name); setSync(v) }} tutorialId={fieldId('Synchronize with Given / Last Names')} />
            </Line>
          </div>
        </PBGroupBox>
      </div>
      <Footer>
        <Btn command="create-provider" w={88} onClick={create}>Create Provider</Btn>
        <Btn command="cancel" w={88} onClick={close}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* ===========================================================================
   Master Provider                      303119 `9f8b3110d3a4…` (live),
                                        303335 `1b2fbc9896a4…` (903x679, 1:1)

   Provider Identification, then Contact Information: address block on the
   left, numbers on the right. The live build's number captions — Primary,
   Secondary, loc., Cell, Pager/Other, Fax Number, eMail (H), eMail (W) — are
   the ones drawn, since they match the list's Primary / Secondary / Fax
   columns (the older build said Home / Work). Footer Apply Changes / Cancel.
   ======================================================================== */

function MasterProviderWindow({ rowKey, close }: { rowKey: string; close: () => void }) {
  const [rows, update] = useClinicRows('ad-providers')
  const row = rows.find((r) => S(r.name) === rowKey) ?? { name: rowKey }
  const [draft, setDraft] = useState<Draft>(() => {
    const name = S(row.name)
    const [last = '', given = ''] = name.includes(',') ? name.split(',').map((s) => s.trim()) : [name, '']
    return {
      given, last, sync: false, spec1: S(row.spec), country: 'Canada', province: 'BC',
      ...row,
    }
  })
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }))
  const name = draft.sync ? masterName(S(draft.given), S(draft.last)) : S(draft.name)
  const text = (label: string, key: string, w: number) => (
    <PBInput w={w} value={S(draft[key])} onChange={(e) => set({ [key]: e.target.value })} data-tutorial-id={fieldId(label)} />
  )
  const apply = () => {
    patchRow(update, 'ad-providers', rowKey, { ...draft, name, spec: S(draft.spec1) })
    close()
  }
  const L = 78
  return (
    <DemographicModal title="Master Provider" width={904} height={680} onClose={close} dialog="master-provider">
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)', border: '1px solid #8a8a8a', margin: 3 }}>
        <Head>Provider Identification</Head>
        <div style={{ padding: '4px 8px' }}>
          <Line label="Given Names:" w={L}>{text('Given Names', 'given', 210)}</Line>
          <Line label="Last Name:" w={L}>{text('Last Name', 'last', 210)}</Line>
          <Line label="Name / ID:" w={L}>
            <PBInput w={210} value={name} readOnly={Boolean(draft.sync)} style={draft.sync ? SYNCED : undefined} onChange={(e) => set({ name: e.target.value })} data-tutorial-id={fieldId('Name / ID')} />
            <PBCheckbox label="Synchronize With Given / Last Names" checked={Boolean(draft.sync)} onChange={(v) => set({ sync: v, name })} tutorialId={fieldId('Synchronize With Given / Last Names')} />
          </Line>
          <Line label="Pract. No.:" w={L}>{text('Pract. No.', 'pract', 90)}</Line>
          <Line label="College ID.:" w={L}>{text('College ID.', 'college', 90)}</Line>
          <Line label="Spec. Code(s):" w={L}>{text('Spec. Code 1', 'spec1', 210)}</Line>
          <Line w={L}>{text('Spec. Code 2', 'spec2', 210)}</Line>
          <Line w={L}>{text('Spec. Code 3', 'spec3', 210)}</Line>
        </div>
        <Head>Contact Information</Head>
        <div className="pb-row" style={{ alignItems: 'flex-start', padding: '4px 8px', gap: 0 }}>
          <div style={{ flex: '1 1 0' }}>
            <Line label="Address:" w={L}>{text('Address 1', 'address1', 210)}</Line>
            <Line w={L}>{text('Address 2', 'address2', 210)}</Line>
            <Line w={L}>{text('Address 3', 'address3', 210)}</Line>
            <Line label="City:" w={L}>{text('City', 'city', 210)}</Line>
            <Line label="Province:" w={L}>{text('Province', 'province', 142)}</Line>
            <Line label="Country:" w={L}>{text('Country', 'country', 142)}</Line>
            <Line label="Postal Code:" w={L}>{text('Postal Code', 'postal', 77)}</Line>
          </div>
          <div style={{ flex: '1 1 0' }}>
            <Line label="Primary:" w={120} right>{text('Primary', 'primary', 102)}</Line>
            <Line label="Secondary:" w={120} right>{text('Secondary', 'secondary', 102)}<span style={{ width: 16 }} />loc.{text('loc.', 'loc', 64)}</Line>
            <Line label="Cell:" w={120} right>{text('Cell', 'cell', 102)}</Line>
            <Line label="Pager/Other:" w={120} right>{text('Pager/Other', 'pager', 102)}</Line>
            <Line label="Fax Number:" w={120} right>{text('Fax Number', 'fax', 102)}</Line>
            <Line label="eMail (H):" w={120} right>{text('eMail (H)', 'emailH', 208)}</Line>
            <Line label="eMail (W):" w={120} right>{text('eMail (W)', 'emailW', 208)}</Line>
          </div>
        </div>
      </div>
      <Footer>
        <Btn command="apply-changes" w={88} onClick={apply}>Apply Changes</Btn>
        <Btn command="cancel" w={88} onClick={close}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* ===========================================================================
   The three small New … dialogs: a grey band captioned with the title over
   the fields, Create Record / Cancel. Measured 1:1 off v02.19.04 captures.
   ======================================================================== */

function NewRecordDialog({ title, dialog, width = 420, onCreate, onClose, children }: {
  title: string; dialog: string; width?: number; onCreate: () => void; onClose: () => void; children: ReactNode
}) {
  return (
    <DemographicModal title={title} width={width} onClose={onClose} dialog={dialog}>
      <div style={{ padding: '14px 24px 4px' }}>
        <PBGroupBox title={title}>
          <div style={{ padding: '4px 0 18px 6px' }}>{children}</div>
        </PBGroupBox>
      </div>
      <Footer>
        <Btn command="create-record" w={88} onClick={onCreate}>Create Record</Btn>
        <Btn command="cancel" w={88} onClick={onClose}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* grey, as #55 draws it */
const Required = () => <span style={HINT}>(required - unique)</span>

/** the facility codes this session's Facility List holds, and each one's locations */
function useFacilities() {
  const [facilities] = useClinicRows('ad-facility-list')
  const [locations] = useSessionState<Record<string, ClinicRow[]> | null>(FACILITY_LOCATIONS_KEY, null)
  const all = locations ?? FACILITY_LOCATIONS
  return {
    codes: ['', ...facilities.map((f) => S(f.code))],
    locationsOf: (facility: string) => ['', ...(all[facility] ?? []).map((l) => S(l.code))],
  }
}

/* New Resource — 303204 `436e6bd7f93d…`: Code, Description, Detail, then
   Facility Code and Location Code drop-downs */
function NewResourceDialog({ close, onAdded }: { close: () => void; onAdded?: () => void }) {
  const [rows, update] = useClinicRows('ad-resource-list')
  const { codes, locationsOf } = useFacilities()
  const [d, setD] = useState({ code: '', desc: '', detail: '', facility: '', location: '' })
  const create = () => {
    if (!codeFree(rows, d.code)) return
    /* the new row reads Active Y, as `436e6bd7…`'s MRI row does */
    update((prev) => [...prev, { code: d.code.trim(), desc: d.desc, detail: d.detail, facility: d.facility, location: d.location, active: 'Y' }])
    onAdded?.()
    close()
  }
  return (
    <NewRecordDialog title="New Resource" dialog="new-resource" onCreate={create} onClose={close}>
      <Line label="Code:" w={80}><PBInput w={118} value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} data-tutorial-id={fieldId('Code')} /><Required /></Line>
      <Line label="Description:" w={80}><PBInput w={272} value={d.desc} onChange={(e) => setD({ ...d, desc: e.target.value })} data-tutorial-id={fieldId('Description')} /></Line>
      <Line label="Detail:" w={80}><PBInput w={272} value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} data-tutorial-id={fieldId('Detail')} /></Line>
      <Line label="Facility Code:" w={80}>
        <PBSelect w={118} options={codes} value={d.facility} onChange={(e) => setD({ ...d, facility: e.target.value, location: '' })} data-tutorial-id={fieldId('Facility Code')} />
      </Line>
      <Line label="Location Code:" w={80}>
        <PBSelect w={118} options={locationsOf(d.facility)} value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} data-tutorial-id={fieldId('Location Code')} />
      </Line>
    </NewRecordDialog>
  )
}

/* New Facility — 303209 `8a23610389d4…`: Code, Description, and Default ☐
   Mark as Default Facility */
function NewFacilityDialog({ close, onAdded }: { close: () => void; onAdded?: () => void }) {
  const [rows, update] = useClinicRows('ad-facility-list')
  const [d, setD] = useState({ code: '', desc: '', isDefault: false })
  const create = () => {
    if (!codeFree(rows, d.code)) return
    update((prev) => [...prev, { code: d.code.trim(), desc: d.desc, active: true, default: d.isDefault }])
    onAdded?.()
    close()
  }
  return (
    <NewRecordDialog title="New Facility" dialog="new-facility" onCreate={create} onClose={close}>
      <Line label="Code:" w={76}>
        {/* the capture opens with focus here: the #FFC09C wash */}
        <PBInput w={119} value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} style={{ background: '#ffc09c' }} data-tutorial-id={fieldId('Code')} autoFocus />
        <Required />
      </Line>
      <Line label="Description:" w={76}><PBInput w={274} value={d.desc} onChange={(e) => setD({ ...d, desc: e.target.value })} data-tutorial-id={fieldId('Description')} /></Line>
      <Line label="Default:" w={76}>
        <PBCheckbox label="Mark as Default Facility" checked={d.isDefault} onChange={(v) => setD({ ...d, isDefault: v })} tutorialId={fieldId('Mark as Default Facility')} />
      </Line>
    </NewRecordDialog>
  )
}

/* New Service Center — 303211 `90a14afa8b17…`, user capture 2026-09-25 #55
   (v02.31.23): Code with its grey "(required - unique)", and a wider
   Description. About 460 x 275 in the capture (400 wide at 1:1; the kit's
   group-box padding needs the family's 420). Create
   Record puts the row in the list, Active ticked, and opens Service Center
   Detail on it (303211's step list; #56 shows the detail over the list with
   the new code in it). */
function NewServiceCenterDialog({ close, open, onAdded }: {
  close: () => void; open: (id: string, args?: Record<string, unknown>) => void; onAdded?: () => void
}) {
  const [rows, update] = useClinicRows('ad-service-centers')
  const [d, setD] = useState({ code: '', desc: '' })
  const create = () => {
    if (!codeFree(rows, d.code)) return
    const code = d.code.trim()
    update((prev) => [...prev, { code, desc: d.desc, active: true }])
    onAdded?.()
    open('service-center-detail', { key: code })
  }
  return (
    <NewRecordDialog title="New Service Center" dialog="new-service-center" onCreate={create} onClose={close}>
      <Line label="Code:" w={80}><PBInput w={152} value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} data-tutorial-id={fieldId('Code')} /><Required /></Line>
      <Line label="Description:" w={80}><PBInput w={274} value={d.desc} onChange={(e) => setD({ ...d, desc: e.target.value })} data-tutorial-id={fieldId('Description')} /></Line>
    </NewRecordDialog>
  )
}

/* ===========================================================================
   Service Center Detail                user capture 2026-09-25 #56, #57
                                        (v02.31.23; ~600 x 360, 522 at 1:1)

   A navy "Service Center" title band, then a sub-band "Service Center" in
   bold navy, over an outlined box: Code, Description, Status ☑ Active, Start
   Date and End Date on one line, and a Note memo; Save Changes (F2) / Cancel
   centred. Create Record lands here with the code just typed selected. The
   dates take MOIS's yyyy.mm.dd edit mask — focus an empty one and it reads
   `0000.00.00` (#57) — which is why a service centre is dated rather than
   deleted: End Date and the Active tick retire it.
   ======================================================================== */

/**
 * A PowerBuilder `####.##.##` date edit. Focused and empty it shows the mask
 * as `0000.00.00`, the way #57 captures it; each digit typed overwrites the
 * next position, and a blank one reads blank again when focus leaves.
 */
export function DateMaskInput({ value, onChange, w = 89, tutorialId }: {
  value: string; onChange: (v: string) => void; w?: number; tutorialId?: string
}) {
  const [focused, setFocused] = useState(false)
  /* the value keeps only what was typed (`2026.0`); the edit pads it out */
  const digits = value.replace(/\D/g, '').slice(0, 8)
  const typed = (d: string) => [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join('.')
  const padded = (d: string) => {
    const full = d.padEnd(8, '0')
    return `${full.slice(0, 4)}.${full.slice(4, 6)}.${full.slice(6, 8)}`
  }
  const shown = digits || focused ? padded(digits) : ''
  return (
    <PBInput
      w={w}
      value={shown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      /* a whole value set at once — a paste, or a lesson's fill */
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').slice(0, 8)
        onChange(/^0*$/.test(d) ? '' : typed(d))
      }}
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) {
          e.preventDefault()
          if (digits.length < 8) onChange(typed(digits + e.key))
        } else if (e.key === 'Backspace') {
          e.preventDefault()
          onChange(typed(digits.slice(0, -1)))
        }
      }}
      data-tutorial-id={tutorialId}
    />
  )
}

function ServiceCenterDetailWindow({ rowKey, close }: { rowKey: string; close: () => void }) {
  const [rows, update] = useClinicRows('ad-service-centers')
  const row = rows.find((r) => S(r.code) === rowKey) ?? { code: rowKey, active: true }
  const [draft, setDraft] = useState<Draft>(() => ({ ...row, active: row.active !== false && row.active !== 'N' }))
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }))
  const save = () => {
    patchRow(update, 'ad-service-centers', rowKey, { ...draft, code: S(draft.code).trim() || rowKey })
    close()
  }
  const L = 78
  return (
    <DemographicModal title="Service Center Detail" width={522} onClose={close} dialog="service-center-detail">
      <NavyBand>Service Center</NavyBand>
      <div style={{ margin: 1, border: '1px solid #8a8a8a', background: 'var(--pb-face)' }}>
        <Head style={{ background: '#f4f4f4', borderBottom: '1px solid #c9c9c9', padding: '4px 8px' }}>Service Center</Head>
        <div style={{ padding: '6px 8px 8px' }}>
          <Line label="Code:" w={L}>
            <PBInput w={198} value={S(draft.code)} onChange={(e) => set({ code: e.target.value })} data-tutorial-id={fieldId('Code')} autoFocus onFocus={(e) => e.currentTarget.select()} />
          </Line>
          <Line label="Description:" w={L}>
            <PBInput w={414} value={S(draft.desc)} onChange={(e) => set({ desc: e.target.value })} data-tutorial-id={fieldId('Description')} />
          </Line>
          <Line label="Status:" w={L}>
            <PBCheckbox label="Active" checked={Boolean(draft.active)} onChange={(v) => set({ active: v })} tutorialId={fieldId('Active')} />
          </Line>
          <Line label="Start Date:" w={L}>
            <DateMaskInput value={S(draft.start)} onChange={(v) => set({ start: v })} tutorialId={fieldId('Start Date')} />
            <span className="pb-form__label" style={{ paddingLeft: 14 }}>End Date:</span>
            <DateMaskInput value={S(draft.end)} onChange={(v) => set({ end: v })} tutorialId={fieldId('End Date')} />
          </Line>
          <Line label="Note:" w={L} style={{ alignItems: 'flex-start' }}>
            <PBTextArea rows={5} w={414} value={S(draft.note)} onChange={(e) => set({ note: e.target.value })} data-tutorial-id={fieldId('Note')} />
          </Line>
        </div>
      </div>
      <Footer>
        <Btn command="save-changes-f2" w={107} onClick={save}>Save Changes (F2)</Btn>
        <Btn command="cancel" w={107} onClick={close}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* ===========================================================================
   Find and Replace: Service Center     user capture 2026-09-25 #58–#60
                                        (v02.31.23; ~510 x 325, 444 at 1:1)

   An outlined group box holding Find: and Replace with:, each a drop-down
   DataWindow whose ivory list is Service Center · Description; the current
   row is the selection blue, and an inactive code is drawn in red (#59:
   METHADONE, NURSING, PSYCHSOC). The list puts active codes first. Ok /
   Cancel centred. Ok swaps every reference to the Find code for the Replace
   code; this stage keeps no records that reference a service centre, so Ok
   checks the pair and closes.
   ======================================================================== */

function FindReplaceServiceCenterDialog({ close }: { close: () => void }) {
  const [rows] = useClinicRows('ad-service-centers')
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const inactive = (r: ClinicRow) => r.active === false || r.active === 'N'
  const list = [...rows.filter((r) => !inactive(r)), ...rows.filter(inactive)]
  const columns = [
    { key: 'code', header: 'Service Center', width: 122, render: (r: ClinicRow) => <span style={inactive(r) ? { color: '#c00000' } : undefined}>{S(r.code)}</span> },
    { key: 'desc', header: 'Description', width: 261, render: (r: ClinicRow) => <span style={inactive(r) ? { color: '#c00000' } : undefined}>{S(r.desc)}</span> },
  ]
  return (
    <DemographicModal title="Find and Replace: Service Center" width={444} onClose={close} dialog="find-and-replace-service-center">
      <div style={{ padding: '14px 12px 6px', background: 'var(--pb-face)' }}>
        <div style={{ border: '1px solid #a0a0a0', padding: '20px 14px 70px' }}>
          <Line label="Find:" w={74}>
            <PBDropDownDataWindow<ClinicRow> w={140} listW={407} columns={columns} rows={list} value={find} display="code" onSelect={(r) => setFind(S(r.code))} tutorialId={fieldId('Find')} />
          </Line>
          <Line label="Replace with:" w={74}>
            <PBDropDownDataWindow<ClinicRow> w={140} listW={407} columns={columns} rows={list} value={replace} display="code" onSelect={(r) => setReplace(S(r.code))} tutorialId={fieldId('Replace with')} />
          </Line>
        </div>
      </div>
      <Footer>
        <Btn command="find-replace-ok" w={75} onClick={close}>Ok</Btn>
        <Btn command="find-replace-cancel" w={75} onClick={close}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* ===========================================================================
   Resource Detail                      303204 `8a6d8780e14b…` (863x570, 1:1)
   ======================================================================== */

function ResourceDetailWindow({ rowKey, close }: { rowKey: string; close: () => void }) {
  const [rows, update] = useClinicRows('ad-resource-list')
  const { codes, locationsOf } = useFacilities()
  const row = rows.find((r) => S(r.code) === rowKey) ?? { code: rowKey }
  const [draft, setDraft] = useState<Draft>(() => ({ ...row, activeYes: row.active !== 'N' }))
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }))
  const text = (label: string, key: string, w: number) => (
    <PBInput w={w} value={S(draft[key])} onChange={(e) => set({ [key]: e.target.value })} data-tutorial-id={fieldId(label)} />
  )
  const block = (label: string, key: string, note: string) => (
    <Line label={`${label}:`} w={86}>{text(label, key, 48)}<span>{note}</span></Line>
  )
  const save = () => {
    patchRow(update, 'ad-resource-list', rowKey, { ...draft, active: draft.activeYes ? 'Y' : 'N' })
    close()
  }
  return (
    <DemographicModal title="Resource Detail" width={864} onClose={close} dialog="resource-detail">
      <NavyBand>Resource</NavyBand>
      <div style={{ background: 'var(--pb-face)', flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
        <Head>Resource Identification</Head>
        <div className="pb-row" style={{ alignItems: 'flex-start', padding: '4px 8px', gap: 0 }}>
          <div style={{ flex: '1 1 0' }}>
            <Line label="Code:" w={76}><PBInput w={136} value={S(draft.code)} readOnly style={LOCKED} data-tutorial-id={fieldId('Code')} /></Line>
            <Line label="Description:" w={76}>{text('Description', 'desc', 314)}</Line>
            <Line label="Detail:" w={76} style={{ alignItems: 'flex-start' }}>
              <PBTextArea rows={3} w={314} value={S(draft.detail)} onChange={(e) => set({ detail: e.target.value })} data-tutorial-id={fieldId('Detail')} />
            </Line>
          </div>
          <div style={{ flex: '0 0 330px' }}>
            <Line label="Status:" w={96} right>
              <PBCheckbox label="Active" checked={Boolean(draft.activeYes)} onChange={(v) => set({ activeYes: v })} tutorialId={fieldId('Active')} />
            </Line>
            <Line label="Facility Code:" w={96} right>
              <PBSelect w={116} options={codes} value={S(draft.facility)} onChange={(e) => set({ facility: e.target.value, location: '' })} data-tutorial-id={fieldId('Facility Code')} />
            </Line>
            <Line label="Location Code:" w={96} right>
              <PBSelect w={116} options={locationsOf(S(draft.facility))} value={S(draft.location)} onChange={(e) => set({ location: e.target.value })} data-tutorial-id={fieldId('Location Code')} />
            </Line>
          </div>
        </div>
        <div className="pb-row" style={{ alignItems: 'stretch', gap: 0 }}>
          <div style={{ flex: '1 1 0' }}>
            <Head>Service Information</Head>
            <div style={{ padding: '4px 8px' }}>
              <Line label="In-Service:" w={76}>{text('In-Service', 'inService', 88)}</Line>
              <Line label="Out-Service:" w={76}>{text('Out-Service', 'outService', 88)}</Line>
              <Line label="Service Note:" w={76}>{text('Service Note', 'serviceNote', 314)}</Line>
            </div>
          </div>
          <div style={{ flex: '1 1 0' }}>
            <Head>Maintenance Information</Head>
            <div style={{ padding: '4px 8px' }}>
              <Line label="Last Maintenance:" w={96} right>{text('Last Maintenance', 'lastMaint', 88)}</Line>
              <Line label="Next Maintenance:" w={96} right>{text('Next Maintenance', 'nextMaint', 88)}</Line>
              <Line label="Maintenance Note:" w={96} right>{text('Maintenance Note', 'maintNote', 314)}</Line>
            </div>
          </div>
        </div>
        <div style={{ padding: '6px 8px', borderTop: '1px solid #a0a0a0' }}>
          <Line label="General Note:" w={76} style={{ alignItems: 'flex-start' }}>
            <PBTextArea rows={3} w={556} value={S(draft.generalNote)} onChange={(e) => set({ generalNote: e.target.value })} data-tutorial-id={fieldId('General Note')} />
          </Line>
        </div>
        <Head>Scheduler Settings</Head>
        <div style={{ padding: '4px 8px 8px' }}>
          {block('Time Slots', 'timeSlots', '(number of time slots per appointment)')}
          {block('Daybook', 'daybook', '(appointment block / row height)')}
          {block('Week View', 'weekView', '(appointment block / column width)')}
          {block('Three Resource', 'threeResource', '(appointment block / column width)')}
          {block('Eight Resource', 'eightResource', '(appointment block / column width)')}
        </div>
      </div>
      <Footer>
        <Btn command="save-changes-f2" w={112} onClick={save}>Save Changes (F2)</Btn>
        <Btn command="cancel" w={108} onClick={close}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}

/* ===========================================================================
   Facility Detail                      303209 `d84a442ab9f6…` (679x580, 1:1)

   Facility Information — Code (locked), Description, Status ☑ Active,
   Default ☐ Default — over a Locations band with New / Delete and a nested
   Code / Description / Default / Active grid.
   ======================================================================== */

function FacilityDetailWindow({ rowKey, close }: { rowKey: string; close: () => void }) {
  const host = usePBInstrumentation()
  const [rows, update] = useClinicRows('ad-facility-list')
  const [stored, setStored] = useSessionState<Record<string, ClinicRow[]> | null>(FACILITY_LOCATIONS_KEY, null)
  const row = rows.find((r) => S(r.code) === rowKey) ?? { code: rowKey }
  const [draft, setDraft] = useState<Draft>(() => ({ ...row }))
  const [locations, setLocations] = useState<ClinicRow[]>(() => (stored ?? FACILITY_LOCATIONS)[rowKey] ?? [])
  const [cur, setCur] = useState(0)
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }))
  const edit = (i: number, patch: ClinicRow) => setLocations((l) => l.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const save = () => {
    patchRow(update, 'ad-facility-list', rowKey, draft)
    setStored((prev) => ({ ...(prev ?? FACILITY_LOCATIONS), [rowKey]: locations }))
    close()
  }
  /* the nested grid is edited in place, as 303057's "Enter the Code for the
     location and the description" says */
  const cell = (key: string) => (r: ClinicRow, i: number) => (
    <PBInput
      w="100%"
      value={S(r[key])}
      onChange={(e) => edit(i, { [key]: e.target.value })}
      style={{ border: 0, background: 'transparent', padding: 0 }}
      data-tutorial-id={`host.mois.field.location-${key}-${i + 1}`}
    />
  )
  return (
    <DemographicModal title="Facility Detail" width={680} height={580} onClose={close} dialog="facility-detail">
      <NavyBand>Facility</NavyBand>
      <Head>Facility Information</Head>
      <div className="pb-row" style={{ alignItems: 'flex-start', padding: '4px 8px', gap: 0, flex: 'none', background: 'var(--pb-face)' }}>
        <div style={{ flex: '1 1 0' }}>
          <Line label="Code:" w={76}><PBInput w={147} value={S(draft.code)} readOnly style={LOCKED} data-tutorial-id={fieldId('Code')} /></Line>
          <Line label="Description:" w={76}>
            <PBInput w={310} value={S(draft.desc)} onChange={(e) => set({ desc: e.target.value })} data-tutorial-id={fieldId('Description')} />
          </Line>
        </div>
        <div style={{ flex: '0 0 200px' }}>
          <Line label="Status:" w={52} right><PBCheckbox label="Active" checked={Boolean(draft.active)} onChange={(v) => set({ active: v })} tutorialId={fieldId('Active')} /></Line>
          <Line label="Default:" w={52} right><PBCheckbox label="Default" checked={Boolean(draft.default)} onChange={(v) => set({ default: v })} tutorialId={fieldId('Default')} /></Line>
        </div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid #8a8a8a' }}>
        <PBBand
          right={['New', 'Delete'].map((b) => (
            <PBButton
              key={b}
              size="sm"
              data-tutorial-id={host?.anchor('command', `locations-${pbSlug(b)}`)}
              onClick={() => {
                host?.report('command', { command: `locations-${pbSlug(b)}` })
                /* 303057: "Select 'New' to enter a location" — a new location
                   starts active */
                if (b === 'New') { setLocations((l) => [...l, { code: '', desc: '', default: false, active: true }]); setCur(locations.length) }
                else { setLocations((l) => l.filter((_, i) => i !== cur)); setCur(0) }
              }}
            >
              {b}
            </PBButton>
          ))}
        >
          Locations
        </PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#ffffff' }}>
          <PBDataWindow<ClinicRow>
            rows={locations}
            current={cur}
            onCurrentChange={setCur}
            empty=" "
            columns={[
              { key: 'code', header: 'Code', width: 136, render: cell('code') },
              { key: 'desc', header: 'Description', width: 342, render: cell('desc') },
              { key: 'default', header: 'Default', width: 68, align: 'center', render: (r, i) => <PBCheckbox checked={Boolean(r.default)} onChange={(v) => edit(i, { default: v })} /> },
              { key: 'active', header: 'Active', width: 68, align: 'center', render: (r, i) => <PBCheckbox checked={Boolean(r.active)} onChange={(v) => edit(i, { active: v })} /> },
            ]}
          />
        </div>
      </div>
      <Footer>
        <Btn command="save-changes-f2" w={108} onClick={save}>Save Changes (F2)</Btn>
        <Btn command="cancel" w={108} onClick={close}>Cancel</Btn>
      </Footer>
    </DemographicModal>
  )
}
