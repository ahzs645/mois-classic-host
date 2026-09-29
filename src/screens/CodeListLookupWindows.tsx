import { useMemo, useState } from 'react'
import { PBButton, PBDataWindow, PBInput, pbSlug } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { CmdButton } from './CmdButton'
import { DemographicModal } from './DemographicDialogs'
import { ModalWindow } from './dialogKit'
import { DialogFooter } from './formKit'
import { LookupBand, LookupPager, usePagedCursor } from './lookupKit'
import { matchesSearch, parseSearch, type SearchField } from './SearchForBand'

/* ============================================================================
   Advanced Lookup Service ▸ Master Reaction Agent List — filtering codes
   within a code list, and the synonyms that answer a search.

   PROVENANCE: 304711 / 2122622 `262f7004…` (v02.20): title "Advanced Lookup
   Service", close box only; a bordered panel with the grey band "Master
   Reaction Agent List" and a yellow "Row Count = 6" box at its right; a green
   "Search For:" strip (the search is well-formed) with its "…"; the grid
   Code · Description · Category; under it a "Synonyms:" line — the caption a
   blue underlined link, the current code's synonyms beside it
   (ACE INHIBITOR, ACEI, AECI) — then the memo "This is the master reaction
   agent (unfiltered) selection list"; Home · PgUp · Ok · Cancel · PgDwn · End.
   `ed38b1e1…`: the Synonyms link opens "Synonym Entry" — a "Synonyms" band
   over ten numbered edit lines, Ok (F2) · Cancel.

   What 304711 teaches, and how it behaves here:
   · partial words, "quoted phrases" and CHOL* / *CHOL / *CHOL* wildcards
     (SearchForBand.tsx `parseSearch`), with Description the default field;
   · a search finds a code by any of its synonyms ("Searching for ACE
     Inhibitor filters your results to anything matching that name or having
     a synonym that matches");
   · a click on a blue column title sorts by that column, then Description,
     then Code; a second click on the same title reverses it;
   · synonyms entered in Synonym Entry are the stage session's own and are
     searchable at once. (MOIS offers the link only to users with access to
     Administration ▸ Prompt Lists; the practice user has it.)

   The six agents are the capture's own; the rest are INFERRED common reaction
   agents so a filter has something to narrow. Codes are the capture's where
   it prints one, otherwise the stage's.

   Opened by name: `host.mois.openUtility {window: 'master-reaction-agent-list'}`.
   Anchors: host.mois.dialog.master-reaction-agent-list; host.mois.field.
   reaction-agent-search; host.mois.sort.<code|description|category>;
   host.mois.row.reaction-agent-<code>; host.mois.command.synonyms (the
   link), reaction-agent-ok / -cancel; Synonym Entry host.mois.dialog.
   synonym-entry, fields synonym-1 … synonym-10, commands synonym-ok /
   synonym-cancel.
   ========================================================================= */

type Agent = { code: string; description: string; category: string }

const AGENTS: Agent[] = [
  { code: '401', description: 'ACETAMINOPHEN CONTAINING COMPOUND', category: 'DRUG' },
  { code: '199', description: 'ACETIC ACID', category: 'DRUG' },
  { code: '40', description: 'ANGIOTENSIN CONVERTING ENZYME INHIBITOR', category: 'DRUG' },
  { code: '308', description: 'ANTHRACENEDIONE', category: 'DRUG' },
  { code: '282', description: 'OXACEPROL DERIVATIVE', category: 'DRUG' },
  { code: '306', description: 'ZINC ACETATE', category: 'DRUG' },
  { code: '12', description: 'ACETYLSALICYLIC ACID', category: 'DRUG' },
  { code: '57', description: 'CEPHALOSPORINS', category: 'DRUG' },
  { code: '71', description: 'CODEINE', category: 'DRUG' },
  { code: '118', description: 'HMG-COA REDUCTASE INHIBITOR', category: 'DRUG' },
  { code: '203', description: 'PENICILLINS', category: 'DRUG' },
  { code: '251', description: 'SULFONAMIDES', category: 'DRUG' },
  { code: '512', description: 'LATEX', category: 'NON-DRUG' },
  { code: '530', description: 'PEANUTS', category: 'FOOD' },
  { code: '544', description: 'SHELLFISH', category: 'FOOD' },
  { code: '560', description: 'BEE STING', category: 'NON-DRUG' },
]

const SEED_SYNONYMS: Record<string, string[]> = {
  '40': ['ACE INHIBITOR', 'ACEI', 'AECI'],
  '12': ['ASA', 'ASPIRIN'],
  '118': ['STATIN'],
  '203': ['PCN'],
  '251': ['SULFA'],
}

export const REACTION_SYNONYMS_KEY = 'admin:reaction-agent-synonyms'

const FIELDS: SearchField[] = [
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description', isDefault: true },
  { key: 'category', label: 'Category' },
]

export function MasterReactionAgentList({ onPick, onClose }: { onPick?: (agent: Agent) => void; onClose: () => void }) {
  const [synonyms, setSynonyms] = useSessionState<Record<string, string[]>>(REACTION_SYNONYMS_KEY, SEED_SYNONYMS)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: keyof Agent; desc: boolean } | null>(null)
  const [editing, setEditing] = useState(false)
  const parsed = useMemo(() => parseSearch(search, FIELDS), [search])
  const rows = useMemo(() => {
    const hit = AGENTS.filter((a) => parsed.empty || matchesSearch(a, parsed, FIELDS, (r) => synonyms[String(r.code)] ?? []))
    if (!sort) return hit
    const by = (a: Agent, b: Agent) => a[sort.key].localeCompare(b[sort.key], undefined, { numeric: sort.key === 'code' })
      || a.description.localeCompare(b.description) || a.code.localeCompare(b.code, undefined, { numeric: true })
    const out = [...hit].sort(by)
    return sort.desc ? out.reverse() : out
  }, [parsed, synonyms, sort])
  const cursor = usePagedCursor(rows.length, 20)
  const { at, setCurrent: setCur } = cursor
  const row = rows[at]
  const state = parsed.empty ? 'empty' : parsed.errors.length ? 'invalid' : 'valid'
  useScreenReport({ dialog: 'master-reaction-agent-list', lookupRows: rows.length, lookupSort: sort ? `${sort.key}${sort.desc ? '-desc' : ''}` : null, searchState: state })

  const pick = () => { if (row) { onPick?.(row); onClose() } }

  return (
    <ModalWindow id="master-reaction-agent-list" title="Advanced Lookup Service" onClose={onClose} zIndex={95}
      windowStyle={{ width: 'min(688px, 100%)', height: 'min(668px, 100%)' }}
      after={editing && row && (
        <SynonymEntry
          initial={synonyms[row.code] ?? []}
          onOk={(list) => { setSynonyms((s) => ({ ...s, [row.code]: list })); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 8px 0' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #9a9a9a', background: '#fff' }}>
          <div className="pb-row" style={{ gap: 0, background: 'linear-gradient(#ecebe8, #d8d5d0)', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
            <b style={{ flex: '1 1 auto', padding: '3px 6px' }}>Master Reaction Agent List</b>
            <span data-tutorial-id="host.mois.field.row-count" style={{ background: '#ffff00', padding: '3px 8px', minWidth: 130, borderLeft: '1px solid #9a9a9a' }}>Row Count = {rows.length}</span>
          </div>
          <div className="pb-row" style={{ gap: 4, padding: '2px 4px', flex: 'none', background: state === 'valid' ? '#a4d86e' : state === 'invalid' ? '#ff1a1a' : undefined }}>
            <span style={{ color: 'var(--pb-link)' }}>Search For:</span>
            <span className="pb-inputgroup" style={{ flex: '1 1 auto' }}>
              <input
                type="text"
                className="pb-field"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCur(0) }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && search) { e.preventDefault(); e.stopPropagation(); setSearch('') }
                  if (e.key === 'Enter') { e.preventDefault(); pick() }
                }}
                data-tutorial-id="host.mois.field.reaction-agent-search"
              />
              <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots">…</button>
            </span>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow<Agent>
              flush
              rules="white"
              rows={rows}
              current={at}
              onCurrentChange={setCur}
              onActivate={() => pick()}
              onSort={(key) => setSort((s) => (s && s.key === key ? { key: key as keyof Agent, desc: !s.desc } : { key: key as keyof Agent, desc: false }))}
              rowTutorialId={(r) => `host.mois.row.reaction-agent-${pbSlug(r.code)}`}
              empty="No reaction agent matches."
              columns={[
                { key: 'code', header: 'Code', width: 120, headAlign: 'center' },
                { key: 'description', header: 'Description', width: 322, headAlign: 'center' },
                { key: 'category', header: 'Category', headAlign: 'center' },
              ]}
            />
          </div>
          <div className="pb-row" style={{ gap: 8, padding: '2px 4px', borderTop: '1px solid #9a9a9a', flex: 'none', minHeight: 30, alignItems: 'flex-start' }}>
            <PBButton
              bare
              command="synonyms"
              className="pb-link"
              style={{ textDecoration: 'underline', fontWeight: 700 }}
              disabled={!row}
              onClick={() => { if (row) setEditing(true) }}
            >
              Synonyms:
            </PBButton>
            <span data-tutorial-id="host.mois.field.synonyms">{row ? (synonyms[row.code] ?? []).join(', ') : ''}</span>
          </div>
          <div style={{ borderTop: '1px solid #9a9a9a', height: 64, padding: '2px 4px', flex: 'none' }}>
            This is the master reaction agent (unfiltered) selection list
          </div>
        </div>
      </div>
      <LookupPager
        cursor={cursor}
        className="pb-row"
        style={{ gap: 0, padding: '10px 8px', flex: 'none' }}
        navSize={{ width: 77, minWidth: 0 }}
        pickSize={{ width: 74 }}
        pickGap={22}
        ok={{ command: 'reaction-agent-ok', disabled: !row, onClick: pick }}
        cancel={{ command: 'reaction-agent-cancel', onClick: onClose }}
      />
    </ModalWindow>
  )
}

/** Synonym Entry — `ed38b1e1…`: ten numbered lines, Ok (F2) / Cancel. */
function SynonymEntry({ initial, onOk, onClose }: { initial: string[]; onOk: (list: string[]) => void; onClose: () => void }) {
  const [lines, setLines] = useState(() => Array.from({ length: 10 }, (_, i) => initial[i] ?? ''))
  const ok = () => onOk(lines.map((l) => l.trim().toUpperCase()).filter(Boolean))
  return (
    <DemographicModal title="Synonym Entry" width={524} onClose={onClose} dialog="synonym-entry">
      <div
        style={{ margin: '8px 10px 0', border: '1px solid #9a9a9a', background: '#fff' }}
        onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); ok() } }}
      >
        <LookupBand variant="grey">Synonyms</LookupBand>
        <div style={{ padding: '4px 8px 10px' }}>
          {lines.map((l, i) => (
            <div key={i} className="pb-row" style={{ gap: 6, padding: '1px 0', background: i % 2 ? '#f0f0f0' : '#fff' }}>
              <span style={{ width: 22, textAlign: 'right' }}>{i + 1}.</span>
              <PBInput w={418} value={l} onChange={(e) => setLines(lines.map((x, j) => (j === i ? e.target.value : x)))} data-tutorial-id={`host.mois.field.synonym-${i + 1}`} />
            </div>
          ))}
        </div>
      </div>
      <DialogFooter fixed={false} gap={8} padding={10}>
        <CmdButton command="synonym-ok" style={{ width: 74 }} onClick={ok}>Ok (F2)</CmdButton>
        <CmdButton command="synonym-cancel" style={{ width: 74 }} onClick={onClose}>Cancel</CmdButton>
      </DialogFooter>
    </DemographicModal>
  )
}

registerAreaWindow('master-reaction-agent-list', ({ close }: AreaWindowProps) => <MasterReactionAgentList onClose={close} />)
