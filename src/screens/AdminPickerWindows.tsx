import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  PBButton, PBCheckbox, PBDataWindow, PBDropGlyph, PBInput, PBRadio, PBSelect, PBTextArea,
  pbSlug, usePBInstrumentation,
} from '../pb'
import { clinicListSpec, type ClinicRow } from '../data/clinicManagement'
import type { ServiceCodeRow } from '../data/encounterPickers'
import { userListSpec } from '../data/userManagement'
import { useScreenReport } from '../host/screen-state'
import { CmdButton } from './CmdButton'
import { ServiceCodeLookupDialog } from './CodeLookupDialogs'
import { DemographicModal } from './DemographicDialogs'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   Administration ▸ Provider window — the pickers its buttons raise.

     change-associated-user   Alias ID / Workspace ▸ Change...   user capture
                              2026-09-25 #69, #71 (v02.31.23)
     user-search              New Associated User's drop-down    #70
     service-concept-search   Service tab ▸ Service cell "…"     #72
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

const S = (v: unknown) => (v == null ? '' : String(v))

/** The salmon "Search For:" box with its "…" (#72, #74). */
const SEARCH_FILL = '#f7c6a2'

export function SearchForBox({ value, onChange, name, style }: {
  value: string; onChange: (v: string) => void; name: string; style?: CSSProperties
}) {
  const host = usePBInstrumentation()
  return (
    <span className="pb-inputgroup" style={{ flex: '1 1 auto', minWidth: 0, ...style }}>
      <input
        type="text"
        className="pb-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: SEARCH_FILL }}
        data-tutorial-id={`host.mois.field.${name}`}
      />
      <button
        type="button"
        className="pb-inputgroup__btn pb-inputgroup__btn--dots"
        data-tutorial-id={host?.anchor('lookup', name)}
        onClick={() => host?.report('lookup', { field: name })}
      >
        …
      </button>
    </span>
  )
}

/** A caption over a light-blue strip, the way #69 and #70 head a block. */
const BlueStrip = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ background: 'linear-gradient(#e6effb, #d2e1f5)', color: '#000080', fontWeight: 700, padding: '3px 5px', flex: 'none', ...style }}>
    {children}
  </div>
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
        <div className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label" style={{ width: 128 }}>Current Associated User:</span>
          <PBInput w={260} value={current} readOnly style={{ background: '#e8e8e8' }} data-tutorial-id="host.mois.field.current-associated-user" />
        </div>
      </div>
      <div style={{ height: 1, background: '#a0a0a0', flex: 'none' }} />
      <div style={{ padding: '6px 10px 6px', background: '#ffffff', flex: 'none' }}>
        <div className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label" style={{ width: 128 }}>New Associated User:</span>
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
        </div>
        <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 3 }}>
          <span className="pb-form__label" style={{ width: 128 }}>Note (optional):</span>
          <PBTextArea rows={3} w={260} value={note} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.note-optional" />
        </div>
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
      <div className="pb-row" style={{ justifyContent: 'center', gap: 8, padding: '12px 0', flex: 'none' }}>
        <CmdButton command="associated-user-continue" style={{ width: 74 }} onClick={() => { if (picked) onContinue(picked, note); else onClose() }}>Continue</CmdButton>
        <CmdButton command="associated-user-cancel" style={{ width: 74 }} onClick={onClose}>Cancel</CmdButton>
      </div>
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
  const caption = (text: string) => <span style={{ fontWeight: 400, color: '#000' }}>{text}</span>
  return (
    <DemographicModal title="MOIS - Search Window" width={1000} height={730} onClose={onClose} dialog="user-search">
      <div style={{ margin: '6px 8px 0', border: '1px solid #8a8a8a', background: '#fff', flex: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '500px 135px 230px 1fr', background: 'linear-gradient(#e6effb, #d2e1f5)', padding: '3px 5px' }}>
          {caption('Search for:')}{caption('Include:')}{caption('Membership')}{caption('Record Status:')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '500px 135px 230px 1fr', padding: '6px 5px 8px', alignItems: 'start' }}>
          <div>
            {([['Name:', name, setName], ['Group:', group, setGroup], ['Provider:', provider, setProvider]] as const).map(([label, value, set]) => (
              <div key={label} className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
                <span className="pb-form__label" style={{ width: 72 }}>{label}</span>
                <PBInput w={220} value={value} onChange={(e) => set(e.target.value)} data-tutorial-id={`host.mois.field.search-${pbSlug(label)}`} />
              </div>
            ))}
            <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
              <span className="pb-form__label" style={{ width: 72 }}>Members of:</span>
              <PBSelect w={220} options={groups} value={membersOf} onChange={(e) => setMembersOf(e.target.value)} data-tutorial-id="host.mois.field.search-members-of" />
            </div>
          </div>
          <div>
            <div><PBCheckbox label="Users" checked={users} onChange={setUsers} tutorialId="host.mois.field.include-users" /></div>
            <div style={{ paddingTop: 4 }}><PBCheckbox label="Providers" checked={providers} onChange={setProviders} tutorialId="host.mois.field.include-providers" /></div>
          </div>
          <div><PBCheckbox label="Limit to My Active Memberships" checked={mine} onChange={setMine} /></div>
          <div>
            <div><PBCheckbox label="Active" checked={active} onChange={(v) => { setActive(v); setCur(0) }} tutorialId="host.mois.field.status-active" /></div>
            <div style={{ paddingTop: 4 }}><PBCheckbox label="Inactive" checked={inactive} onChange={(v) => { setInactive(v); setCur(0) }} tutorialId="host.mois.field.status-inactive" /></div>
          </div>
        </div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '6px 8px 0', border: '1px solid #8a8a8a', background: '#fff' }}>
        <PBDataWindow<SearchRow>
          rows={rows}
          current={current}
          onCurrentChange={setCur}
          onActivate={(r) => onPick(r.name)}
          rowTutorialId={(r) => `host.mois.row.user-search-${pbSlug(r.name)}`}
          empty="No users or providers match."
          columns={[
            { key: 'name', header: 'Name', width: 274, headAlign: 'left' },
            { key: 'role', header: 'Role / Group', width: 209, headAlign: 'left' },
            { key: 'type', header: 'Type', width: 137, headAlign: 'left' },
            { key: 'members', header: 'Associated Provider(s) / Members', width: 244, headAlign: 'left' },
            { key: 'status', header: 'Status', width: 68, align: 'center' },
          ]}
        />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 8, padding: '10px 0', flex: 'none' }}>
        <CmdButton command="user-search-ok" style={{ width: 74 }} disabled={!row} onClick={() => row && onPick(row.name)}>Ok</CmdButton>
        <CmdButton command="user-search-cancel" style={{ width: 74 }} onClick={onClose}>Cancel</CmdButton>
      </div>
    </DemographicModal>
  )
}

/* ===========================================================================
   MOIS - Universal Search Window, from the Service tab (#72).

   The same window the encounter's Health Issues "…" opens, with two
   differences the capture shows: the caption carries no chart ("MOIS -
   Universal Search Window" — there is no patient in Administration), and
   the only code system offered is SNOMED-CT, ticked, with nothing to filter
   to under Reference Set(s). It looks up the service concept a provider
   offers. About 1150 x 850 in the capture.

   Select hands the term back to the Service cell. Select & Add Health Issue
   is drawn, as captured, but disabled: there is no chart to add one to.
   ======================================================================== */

export type ConceptRow = { term: string; category: string; code: string; system: string }

/* a first page of SNOMED CT concepts, alphabetical, as the window opens on
   one — public terminology, uppercase the way MOIS prints it */
const SNOMED_PAGE: ConceptRow[] = [
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
].map(([term, category, code]) => ({ term: term!, category: category!, code: code!, system: 'SNOMED-CT' }))

export function ServiceConceptSearchWindow({ onPick, onClose }: {
  onPick: (row: ConceptRow) => void
  onClose: () => void
}) {
  const [systems, setSystems] = useState(true)
  const [scope, setScope] = useState('Code Systems')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('Active')
  const [limit, setLimit] = useState('200')
  const [search, setSearch] = useState('')
  const [cur, setCur] = useState(0)
  const rows = SNOMED_PAGE.filter((r) => (
    systems
    && r.term.includes(search.trim().toUpperCase())
    && r.code.includes(code.trim())
    && r.category.includes(category.trim().toUpperCase())
  )).slice(0, Math.max(0, Number(limit) || 0))
  const row = rows[Math.min(cur, Math.max(0, rows.length - 1))]
  const paneHead = (title: string, links: boolean) => (
    <div className="pb-row" style={{ gap: 10, padding: '2px 5px', color: '#808080', background: 'linear-gradient(#e6effb, #d2e1f5)' }}>
      <span style={{ flex: '1 1 auto' }}>{title}</span>
      {links && <><button type="button" className="pb-link" onClick={() => setSystems(true)}>All</button><button type="button" className="pb-link" onClick={() => setSystems(false)}>Clear</button></>}
    </div>
  )
  return (
    <DemographicModal title="MOIS - Universal Search Window" width={1000} height={740} onClose={onClose} dialog="service-concept-search">
      <div style={{ display: 'flex', flex: 'none', margin: '4px 4px 0', border: '1px solid #8a8a8a', background: '#fff', height: 112 }}>
        <div style={{ width: 266, borderRight: '1px solid #8a8a8a' }}>
          {paneHead('Select from Code System(s)', true)}
          <div style={{ padding: '3px 6px' }}><PBCheckbox label="SNOMED-CT" checked={systems} onChange={setSystems} tutorialId="host.mois.field.code-system-snomed-ct" /></div>
        </div>
        <div style={{ width: 266, borderRight: '1px solid #8a8a8a' }}>
          {paneHead('Filter to Reference Set(s)', true)}
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div className="pb-row" style={{ gap: 8, padding: '2px 5px', background: 'linear-gradient(#e6effb, #d2e1f5)' }}>
            <span style={{ color: '#808080' }}>Parameters:</span>
            <span style={{ color: '#808080' }}>Select from</span>
            {['Code Systems', 'Health Issues', 'Encounter History'].map((v) => (
              <PBRadio key={v} name="service-concept-scope" label={v} checked={scope === v} onChange={() => setScope(v)} />
            ))}
          </div>
          <div style={{ padding: '4px 6px', display: 'grid', gridTemplateColumns: '84px 1fr', rowGap: 3, alignItems: 'center' }}>
            <span className="pb-form__label" style={{ textAlign: 'right', paddingRight: 6 }}>Code is</span>
            <PBInput w={92} value={code} onChange={(e) => setCode(e.target.value)} />
            <span className="pb-form__label" style={{ textAlign: 'right', paddingRight: 6 }}>Category is like</span>
            <PBInput w={256} value={category} onChange={(e) => setCategory(e.target.value)} />
            <span className="pb-form__label" style={{ textAlign: 'right', paddingRight: 6 }}>Status is</span>
            <span className="pb-row" style={{ gap: 8 }}>
              {['Active', 'Inactive', 'Either'].map((v) => (
                <PBRadio key={v} name="service-concept-status" label={v} checked={status === v} onChange={() => setStatus(v)} />
              ))}
            </span>
            <span className="pb-form__label" style={{ textAlign: 'right', paddingRight: 6 }}>Limit list to</span>
            <span className="pb-row" style={{ gap: 6 }}><PBInput w={64} value={limit} onChange={(e) => setLimit(e.target.value)} />records</span>
          </div>
        </div>
      </div>

      <div className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none' }}>
        <span style={{ color: 'var(--pb-link)' }}>Search For:</span>
        <SearchForBox value={search} onChange={(v) => { setSearch(v); setCur(0) }} name="service-concept-search" />
        <PBButton style={{ minWidth: 76 }} data-tutorial-id="host.mois.command.service-concept-search-run">Search</PBButton>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 4px', border: '1px solid #8a8a8a', background: '#fff' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow<ConceptRow>
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            onActivate={(r) => onPick(r)}
            rowTutorialId={(r) => `host.mois.row.concept-${r.code}`}
            empty="No term matches those parameters."
            columns={[
              { key: 'term', header: <span style={{ color: '#808080' }}>Term</span>, width: 490, headAlign: 'left' },
              { key: 'category', header: <span style={{ color: '#808080' }}>Category</span>, width: 214, headAlign: 'left' },
              { key: 'code', header: <span style={{ color: '#808080' }}>Code</span>, width: 82, headAlign: 'left' },
              { key: 'system', header: <span style={{ color: '#808080' }}>Code System</span>, width: 120, headAlign: 'left' },
            ]}
          />
        </div>
        {/* the count is the limit asked for, whatever is painted (#72) */}
        <div style={{ padding: '2px 16px', color: '#808080', flex: 'none' }}>Rows: {limit}</div>
      </div>
      <div style={{ flex: 'none', margin: '0 4px', border: '1px solid #8a8a8a', borderTop: 0, background: '#fff' }}>
        <div style={{ padding: '2px 16px', color: '#808080', background: 'linear-gradient(#e6effb, #d2e1f5)' }}>
          Alternate Terms&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[{row ? 1 : 0}]
        </div>
        <div style={{ height: 56, padding: '3px 16px' }}>{row ? `${row.term} (${row.category})` : ''}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 4px', flex: 'none' }}>
        <span className="pb-row" style={{ gap: 8 }}>
          <PBButton style={{ minWidth: 132 }}>Save My Default Settings</PBButton>
          <PBButton style={{ minWidth: 132 }}>Restore System Settings</PBButton>
        </span>
        <span className="pb-row" style={{ gap: 6 }}>
          <CmdButton command="service-concept-select" style={{ width: 74 }} disabled={!row} onClick={() => row && onPick(row)}>Select</CmdButton>
          <CmdButton command="service-concept-cancel" style={{ width: 74 }} onClick={onClose}>Cancel</CmdButton>
        </span>
        <span className="pb-row" style={{ justifyContent: 'flex-end' }}>
          <PBButton style={{ minWidth: 132 }} disabled>Select &amp; Add Health Issue</PBButton>
        </span>
      </div>
    </DemographicModal>
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
