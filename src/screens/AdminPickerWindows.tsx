import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { PBDataWindow, PBDropGlyph, PBInput, PBTextArea, pbSlug } from '../pb'
import { clinicListSpec, type ClinicRow } from '../data/clinicManagement'
import type { ServiceCodeRow, UniversalSearchRow } from '../data/encounterPickers'
import { S } from '../data/text'
import { userListSpec } from '../data/userManagement'
import { useScreenReport } from '../host/screen-state'
import { CmdButton } from './CmdButton'
import { ServiceCodeLookupDialog, UniversalSearchDialog } from './CodeLookupDialogs'
import { DemographicModal } from './DemographicDialogs'
import { DialogFooter, FormLine, SectionCaption } from './formKit'
import { GRID_BOX, MOIS_SEARCH_TITLE, MoisSearchWindow, PickButtons } from './lookupKit'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   Administration ▸ Provider window — the pickers its buttons raise.

     change-associated-user   Alias ID / Workspace ▸ Change...   user capture
                              2026-09-25 #69, #71 (v02.31.23)
     user-search              New Associated User's drop-down    #70
     universal-search         Service tab ▸ Service cell "…"     #72 (the
                              shared Universal Search Window)
     service-code-lookup      Billing tab ▸ a Service Code "…"   #74, #75

   Each is a top-level window floating over the MOIS frame and over the
   Provider window that raised it (the captures show them hanging off the
   desktop), so all four are portalled onto the desktop. Sizes are the
   captures' x0.87, the scale the rest of the emulator is normalised to.

   The rows are the emulator's own: the User Accounts and Provider List
   rosters (data/userManagement.ts, data/clinicManagement.ts) for the user
   picker, a first page of public SNOMED CT terms for the concept search, and
   the Master Service Code List the encounter window already uses. Nothing
   from the captures' own rosters is reproduced.
   ========================================================================= */

/** A caption over a light-blue strip, the way #69 and #70 head a block. */
const BlueStrip = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <SectionCaption rule={false} padding="3px 5px" fixed style={{ background: 'linear-gradient(#e6effb, #d2e1f5)', ...style }}>
    {children}
  </SectionCaption>
)

/* ===========================================================================
   Change Associated User — #69 (empty), #71 (a user picked).

   About 780 x 545 in the capture. Current Associated User (grey, read-only),
   a rule, New Associated User — a drop-down whose list is the MOIS - Search
   Window (#70) — and Note (optional); a light-blue "Change History" band
   over Start · Associated User · Changed By · Note, whose captions are grey
   on white rather than on the DataWindow blue; Continue / Cancel centred.
   Continue makes the pick the provider's associated user, dated today, and
   files a history row.
   ======================================================================== */

export type AssociationChange = { start: string; user: string; by: string; note: string }

export function ChangeAssociatedUserDialog({ current, history, onContinue, onClose }: {
  current: string
  history: AssociationChange[]
  onContinue: (user: string, note: string) => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState('')
  const [note, setNote] = useState('')
  const [searching, setSearching] = useState(false)
  const [cur, setCur] = useState(0)
  return (
    <DemographicModal title="Change Associated User" width={680} height={474} onClose={onClose} dialog="change-associated-user">
      <div style={{ padding: '8px 10px 6px', background: '#ffffff', flex: 'none' }}>
        <FormLine label="Current Associated User:" w={128} labelFlex={false}>
          <PBInput w={260} value={current} readOnly style={{ background: '#e8e8e8' }} data-tutorial-id="host.mois.field.current-associated-user" />
        </FormLine>
      </div>
      <div style={{ height: 1, background: '#a0a0a0', flex: 'none' }} />
      <div style={{ padding: '6px 10px 6px', background: '#ffffff', flex: 'none' }}>
        <FormLine label="New Associated User:" w={128} labelFlex={false}>
          {/* a drop-down whose list is a window of its own (#70) */}
          <span className="pb-inputgroup" style={{ width: 252 }}>
            <input
              type="text"
              className="pb-field"
              readOnly
              value={picked}
              style={{ background: picked ? '#3376d0' : undefined, color: picked ? '#fff' : undefined }}
              data-tutorial-id="host.mois.field.new-associated-user"
              onClick={() => setSearching(true)}
            />
            <CmdButton command="new-associated-user-drop" className="pb-inputgroup__btn pb-inputgroup__btn--drop" onClick={() => setSearching(true)}>
              <PBDropGlyph />
            </CmdButton>
          </span>
        </FormLine>
        <FormLine label="Note (optional):" w={128} labelFlex={false} align="flex-start" style={{ marginTop: 3 }}>
          <PBTextArea rows={3} w={260} value={note} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.note-optional" />
        </FormLine>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #8a8a8a', margin: '0 1px' }}>
        <BlueStrip>Change History</BlueStrip>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
          <PBDataWindow<AssociationChange>
            rows={history}
            current={cur}
            onCurrentChange={setCur}
            gutter={false}
            rules={false}
            head="grey"
            empty=" "
            columns={[
              { key: 'start', header: <span style={{ color: '#808080' }}>Start</span>, width: 82, headAlign: 'left' },
              { key: 'user', header: <span style={{ color: '#808080' }}>Associated User</span>, width: 218, headAlign: 'left' },
              { key: 'by', header: <span style={{ color: '#808080' }}>Changed By</span>, width: 170, headAlign: 'left' },
              { key: 'note', header: <span style={{ color: '#808080' }}>Note</span>, width: 190, headAlign: 'left' },
            ]}
          />
        </div>
      </div>
      <DialogFooter gap={8} padding="12px 0">
        <CmdButton command="associated-user-continue" style={{ width: 74 }} onClick={() => { if (picked) onContinue(picked, note); else onClose() }}>Continue</CmdButton>
        <CmdButton command="associated-user-cancel" style={{ width: 74 }} onClick={onClose}>Cancel</CmdButton>
      </DialogFooter>
      {searching && (
        <UserSearchWindow
          initial={picked || current}
          onPick={(name) => { setPicked(name); setSearching(false) }}
          onClose={() => setSearching(false)}
        />
      )}
    </DemographicModal>
  )
}

/* ===========================================================================
   MOIS - Search Window — the user / provider picker (#70).

   About 1150 x 840 in the capture. A light-blue strip of four captions —
   Search for: · Include: · Membership · Record Status: — over Name, Group,
   Provider and a Members of drop-down; ☑ Users ☑ Providers; ☐ Limit to My
   Active Memberships; ☑ Active ☐ Inactive. The grid is Name · Role / Group
   · Type (USER or PROVIDER) · Associated Provider(s) / Members · Status,
   sorted by name; Ok / Cancel centred. This is a different window from the
   provider/organization directory the Dynamic Form header opens
   (DirectorySearchWindow.tsx), though MOIS captions both the same.

   Limit to My Active Memberships is inert: the emulator has no membership
   of its own to limit to.
   ======================================================================== */

type SearchRow = { name: string; role: string; type: 'USER' | 'PROVIDER'; members: string; status: string }

const PROVIDER_ROLE: Record<string, string> = { MD: 'MEDICAL DOCTOR', RN: 'NURSING', LPN: 'NURSING' }

function searchRows(): SearchRow[] {
  const users = (userListSpec('ad-users')?.rows ?? []).map((r): SearchRow => ({
    name: S(r.display), role: S(r.role), type: 'USER', members: '', status: S(r.status) || 'A',
  }))
  const userNames = new Set(users.map((u) => u.name))
  const providers = (clinicListSpec('ad-provider-list')?.rows ?? []).map((r: ClinicRow): SearchRow => {
    const plain = S(r.name).replace(/\s*\(.*\)$/, '')
    return {
      name: S(r.name), role: PROVIDER_ROLE[S(r.ptype)] ?? '', type: 'PROVIDER',
      /* a provider row names the user it is associated with, where one exists */
      members: userNames.has(plain) ? plain : '', status: r.active === 'N' ? 'I' : 'A',
    }
  })
  return [...users, ...providers].sort((a, b) => a.name.localeCompare(b.name))
}

export function UserSearchWindow({ initial, onPick, onClose }: {
  initial?: string
  onPick: (name: string) => void
  onClose: () => void
}) {
  const all = useMemo(searchRows, [])
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [provider, setProvider] = useState('')
  const [membersOf, setMembersOf] = useState('')
  const [users, setUsers] = useState(true)
  const [providers, setProviders] = useState(true)
  const [mine, setMine] = useState(false)
  const [active, setActive] = useState(true)
  const [inactive, setInactive] = useState(false)
  const rows = all.filter((r) => (
    (r.type === 'USER' ? users : providers)
    && (r.status === 'I' ? inactive : active)
    && r.name.toUpperCase().includes(name.trim().toUpperCase())
    && r.role.toUpperCase().includes(group.trim().toUpperCase())
    && r.members.toUpperCase().includes(provider.trim().toUpperCase())
  ))
  const [cur, setCur] = useState(() => Math.max(0, rows.findIndex((r) => r.name === initial)))
  const current = Math.min(cur, Math.max(0, rows.length - 1))
  const row = rows[current]
  const groups = ['', ...(userListSpec('ad-user-groups')?.rows ?? []).map((r) => S(r.name))]
  return (
    <MoisSearchWindow<SearchRow>
      frame={(content, footer) => (
        <DemographicModal title={MOIS_SEARCH_TITLE} width={1000} height={730} onClose={onClose} dialog="user-search">{content}{footer}</DemographicModal>
      )}
      criteria={{
        layout: 'rows',
        fields: ([['Name:', name, setName], ['Group:', group, setGroup], ['Provider:', provider, setProvider]] as const).map(([label, value, set]) => (
          { label, value, onChange: set, anchor: `host.mois.field.search-${pbSlug(label)}` }
        )),
        membersOf: { options: groups, value: membersOf, onChange: setMembersOf, anchor: 'host.mois.field.search-members-of' },
        include: [
          { label: 'Users', checked: users, onChange: setUsers, tutorialId: 'host.mois.field.include-users' },
          { label: 'Providers', checked: providers, onChange: setProviders, tutorialId: 'host.mois.field.include-providers' },
        ],
        membership: { label: 'Limit to My Active Memberships', checked: mine, onChange: setMine },
        status: [
          { label: 'Active', checked: active, onChange: (v) => { setActive(v); setCur(0) }, tutorialId: 'host.mois.field.status-active' },
          { label: 'Inactive', checked: inactive, onChange: (v) => { setInactive(v); setCur(0) }, tutorialId: 'host.mois.field.status-inactive' },
        ],
      }}
      gridBox={{ ...GRID_BOX, margin: '6px 8px 0', border: '1px solid #8a8a8a', background: '#fff' }}
      grid={{
        rows,
        current,
        onCurrentChange: setCur,
        onActivate: (r) => onPick(r.name),
        rowTutorialId: (r) => `host.mois.row.user-search-${pbSlug(r.name)}`,
        empty: 'No users or providers match.',
        columns: [
          { key: 'name', header: 'Name', width: 274, headAlign: 'left' },
          { key: 'role', header: 'Role / Group', width: 209, headAlign: 'left' },
          { key: 'type', header: 'Type', width: 137, headAlign: 'left' },
          { key: 'members', header: 'Associated Provider(s) / Members', width: 244, headAlign: 'left' },
          { key: 'status', header: 'Status', width: 68, align: 'center' },
        ],
      }}
      footer={(
        <PickButtons
          className="pb-row"
          style={{ justifyContent: 'center', gap: 8, padding: '10px 0', flex: 'none' }}
          size={{ width: 74 }}
          buttons={[
            { label: 'Ok', command: 'user-search-ok', disabled: !row, onClick: () => { if (row) onPick(row.name) } },
            { label: 'Cancel', command: 'user-search-cancel', onClick: onClose },
          ]}
        />
      )}
    />
  )
}

/* ===========================================================================
   MOIS - Universal Search Window, from the Service tab (#72).

   The same window the encounter's Health Issues "…" opens
   (CodeLookupDialogs.tsx UniversalSearchDialog), in its Administration form:
   the caption carries no chart ("MOIS - Universal Search Window" — there is
   no patient in Administration) and Select & Add Health Issue is greyed,
   there being no chart to add one to. The capture also shows the only code
   system offered is SNOMED-CT, ticked, with nothing to filter to under
   Reference Set(s); those are the dialog's `systems` / `referenceSets`. It
   looks up the service concept a provider offers, over a first page of
   service concepts of its own. Portalled onto the desktop like the other
   pickers here. Select hands the term back to the Service cell.
   ======================================================================== */

/* a first page of SNOMED CT concepts, alphabetical, as the window opens on
   one — public terminology, uppercase the way MOIS prints it */
const SNOMED_PAGE: UniversalSearchRow[] = [
  ['ABDOMINAL PAIN', 'CLINICAL FINDING', '21522001'],
  ['ADDICTION MEDICINE SERVICE', 'QUALIFIER VALUE', '408468001'],
  ['ADULT MENTAL ILLNESS SERVICE', 'QUALIFIER VALUE', '310094009'],
  ['ANTENATAL CARE', 'REGIME/THERAPY', '77386006'],
  ['ASTHMA CLINIC', 'ENVIRONMENT', '702511009'],
  ['CARDIOLOGY SERVICE', 'QUALIFIER VALUE', '310100009'],
  ['CHRONIC DISEASE MANAGEMENT', 'REGIME/THERAPY', '702727009'],
  ['COMMUNITY HEALTH SERVICES', 'QUALIFIER VALUE', '310205006'],
  ['COUNSELING', 'PROCEDURE', '409063005'],
  ['DIABETIC EDUCATION', 'PROCEDURE', '385805005'],
  ['DIETETICS SERVICE', 'QUALIFIER VALUE', '310135007'],
  ['GENERAL MEDICAL PRACTICE', 'QUALIFIER VALUE', '394814009'],
  ['HOME NURSING', 'PROCEDURE', '225368008'],
  ['IMMUNIZATION', 'PROCEDURE', '127785005'],
  ['MATERNITY SERVICE', 'QUALIFIER VALUE', '310145002'],
  ['MENTAL HEALTH SERVICE', 'QUALIFIER VALUE', '722163006'],
  ['PALLIATIVE CARE SERVICE', 'QUALIFIER VALUE', '310028003'],
  ['PRIMARY CARE SERVICE', 'QUALIFIER VALUE', '708175003'],
  ['SMOKING CESSATION THERAPY', 'REGIME/THERAPY', '225323000'],
  ['WOUND CARE', 'REGIME/THERAPY', '225358003'],
].map(([term, category, code]) => ({ term: term!, category: category!, code: code!, system: 'SNOMED-CT', alternates: [] }))

const SNOMED_ONLY = ['SNOMED-CT']
const NO_SETS: string[] = []

export function ServiceConceptSearchWindow({ onPick, onClose }: {
  onPick: (row: UniversalSearchRow) => void
  onClose: () => void
}) {
  return (
    <DesktopLayer>
      <UniversalSearchDialog admin systems={SNOMED_ONLY} referenceSets={NO_SETS} page={SNOMED_PAGE} onPick={(r) => onPick(r)} onClose={onClose} />
    </DesktopLayer>
  )
}

/* ===========================================================================
   Advanced Lookup Service ▸ Master Service Code List, from the Billing
   tab's Service Code "…" (#74, #75).

   The very window the encounter's Services "…" opens
   (CodeLookupDialogs.tsx): band, salmon Search For and Status ALL, Code ·
   Description · MSP · WCB · Private · Code System · Category · Type, the
   description pane, Home / PgUp · Ok / Cancel · PgDwn / End, and Source /
   Save on Close. Here it is portalled onto the desktop so it floats over
   the Provider window, and reported as a dialog while it is up.
   ======================================================================== */

function DialogReport({ id }: { id: string }) {
  useScreenReport({ dialog: id })
  return null
}

export function BillingServiceCodeLookup({ onPick, onClose }: {
  onPick: (row: ServiceCodeRow) => void
  onClose: () => void
}) {
  return (
    <DesktopLayer>
      <DialogReport id="service-code-lookup" />
      <ServiceCodeLookupDialog onPick={onPick} onClose={onClose} />
    </DesktopLayer>
  )
}
