import { cloneElement, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import {
  addAdverseEvent, addReactionRisk, effectiveLinks, eventItem, linkEventRisk, riskItem, setEventParts, storedEvent, storedRiskReactions,
  unlinkEventRisk, useAllergySession,
  type AgentType, type EventAgent, type EventReaction, type EventRiskLink, type ReactionRiskInput,
} from '../data/allergySession'
import { SESSION_USER } from '../data/chartSession'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { practiceRecords } from '../data/practiceRecords'
import { argStr } from '../data/text'
import { registerScreenWindows } from '../host/screen-windows'
import {
  PB_MESSAGE_ICONS, PBBand, PBButton, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea,
  usePBInstrumentation,
} from '../pb'
import { MasterReactionAgentList } from './CodeListLookupWindows'
import { FormLabel } from './formKit'
import { useRecordList } from './listKit'
import { FooterButton, StageMessageBox, StageWindow } from './StageWindow'

/* ============================================================================
   Allergy / Intolerances ▸ Events — entering an Adverse Event, elevating one
   to a Reaction Risk, and linking events and risks both ways; plus Reaction
   Risks' `** NO KNOWN **` assertion.

   PROVENANCE: art. 303131 "Allergy/Intolerances" (v02.17.19 – v02.24.41):
   · `5e7f94bd…` Adverse Events folder: New Record · New AEFI · Edit AEFI ·
     Delete Record · Save · Undo · Refresh · Attachment · Elevate To Risk;
     tabs Detail · Agents · Reactions · Recommendations · Linked Reaction Risks.
   · `8f620729…` New Adverse Event ▸ Detail (839 × 716): "New Adverse Event"
     band; Onset [ ] Time [ : ]; Type ▾; Severity ▾; Comment; "Event Type:
     NORMAL" at the right; a New Agent | Delete Agent band over "Category ·
     Agent / Brand Name / Manufacturer · Drug Administration Information";
     a New Reaction | Delete Reaction band over Code · … · Reaction · Rank;
     Ok · Cancel.
   · `b30bb011…` New Adverse Event ▸ Linked Reaction Risks: ◯ Do Not Link a
     Reaction Risk · ◉ Link to a New Reaction Risk · ◯ Link to Existing
     Reaction Risks; the "Link to a New Reaction Risk" band over Date of
     Onset · Stop Date · Phase at Onset / Certainty ▾ · Risk Status ▾ ·
     Informant ▾ / Criticality ▾ · Severity ▾ · Observer ▾ / Type ▾ ·
     Category ☐ · Documenter ▾ / Agent [code …][description] · Agent Category
     [greyed …] / Comment.
   · `891207c0…` Elevate Event To a Reaction Risk (820 × 710): ◉ Elevate a
     Specific Drug to a Reaction Risk · ◯ Elevate a Drug Category or Non-Drug
     to a Reaction Risk; "Select a Specific Drug Agent" band over Agent Code ·
     Agent; Ok · Cancel.
   · `4f7a5861…` event Detail tab; `0d3d5d53…` Agents tab (the agent block:
     Category ☐ and "1 of 1", agent "…", brand, manufacturer; Lot Number,
     Series Number, Dose (qnty/unit), Route ▾, Site ▾); `b7ebbce5…` Reactions
     tab; `10f68120…` Linked Reaction Risks tab (Link Reaction Risk(s) ·
     Unlink Reaction Risk(s); a REACTION RISKS band over Onset · Stop · Agent
     (a hyperlink) · Reactions); `1a8f753b…` a risk's Linked Events tab (Link
     Event(s) · Unlink Event(s); an EVENTS band over Onset · Agents ·
     Reactions).
   · `8ed81b2c…` `** NO KNOWN **` at the right of the review-notice line.

   2026-09-29 TRAINING captures c05–c18 (chart 2429, FLO AARONSON; v02.31),
   which win over the article's v02.20 pictures wherever they differ:
   · c05 New Adverse Event (834 × 719): Detail | Linked Reaction Risks tabs,
     138 wide (the selected one 142); the "New Adverse Event" band; Onset
     [83] Time [44]; Type / Severity [161] ▾; Comment [713 × 171]; "Event
     Type:  NORMAL" at the right; the New Agent | Delete Agent band (117 +
     117, white flat buttons on the band grey); the Category · Agent / Brand
     Name / Manufacturer · Drug Administration Information header over a
     2px black rule; the New Reaction | Delete Reaction band (131 + 117) over
     Code 101 · … 15 · Reaction 609 · Rank 62; Ok · Cancel (75 × 21), no
     default outline. Delete Agent / Delete Reaction are never greyed.
   · c05: an empty Onset holding focus shows its mask, 0000.00.00.
   · c06 the Type drop-down: Type | Description, six rows (DRUG ALLERGY …
     FOOD INTOLERANCE); the field shows the Type column.
   · c07 the Severity drop-down: one Description column, MILD … FATAL.
   · c08 after New Agent the window's caption reads "<Master Window>"; the
     agent block: Category tick, agent [318] with "…", brand, manufacturer,
     "1 of 1"; Lot Number [108] · Route [138] ▾ / Series Number · Site ▾ /
     Dose (qnty/unit) [47][60]; rows 17 tall on an 18 pitch.
   · c09 the Category tick's balloon: "Drug Category or Non-Drug Agent" /
     "Identifies the agent as a drug category or non-drug".
   · c10 the agent "…" opens the Advanced Lookup Service ▸ Master Reaction
     Agent List (CodeListLookupWindows.tsx).
   · c11 the Site drop-down (Site | Description) and c12 the Route
     drop-down (one column captioned Code) — the rows the captures show.
   · c13–c16, c18 the folder's Detail · Agents · Reactions ·
     Recommendations · Linked Reaction Risks pages; c17 the "Reaction
     Risks" window Link Reaction Risk(s) opens: a "Link Reaction Risks" band
     over Select · Onset · Agent · Reactions, Ok · Cancel.

   INFERRED (no capture):
   · the Link Event(s) pick window, drawn as c17's Link Reaction Risks;
   · the Link to Existing Reaction Risks page of the New Adverse Event, drawn
     as that same tick list;
   · the "Select a Drug Category or Non-Drug Agent" band caption, and which
     agents each radio lists (the Category tick decides);
   · the Route and Site rows below what c11 / c12 show (both lists scroll
     on), and which Site column fills the field once picked (Description);
   · the Link to a New Reaction Risk drop-downs (certainty, criticality …);
   · the message No Known gives when Reaction Risks are already on file (the
     article only describes the empty case).
   New AEFI / Edit AEFI open the AEFI form, screens/AefiWindow.tsx.
   Left out: the Reaction code
   "…" lookup (the field takes typed text), the hyperlinks' jump to the
   other folder, and the multi-category prompt Elevate gives. The Detail
   page's Owned by / Record State lines are gone: c13 shows neither.
   ========================================================================= */

export const ADVERSE_WINDOWS = {
  newEvent: 'new-adverse-event',
  elevate: 'elevate-event-to-risk',
  linkRisks: 'link-reaction-risks',
  linkEvents: 'link-adverse-events',
  noKnownBlocked: 'no-known-reaction-risks',
  /** New AEFI / Edit AEFI: the AEFI form (screens/AefiWindow.tsx) */
  aefi: 'edit-aefi',
} as const

registerScreenWindows(Object.values(ADVERSE_WINDOWS))

/** c06: the Type drop-down, verbatim */
export const EVENT_TYPE_ROWS = [
  { type: 'DRUG ALLERGY', description: 'DRUG ALLERGY (DISORDER)' },
  { type: 'DRUG INTOLERANCE', description: 'DRUG INTOLERANCE (DISORDER)' },
  { type: 'ENV ALLERGY', description: 'ENVIRONMENTAL ALLERGY (DISORDER)' },
  { type: 'ENV INTOLERANCE', description: 'ENVIRONMENTAL INTOLERANCE (DISORDER)' },
  { type: 'FOOD ALLERGY', description: 'FOOD ALLERGY (DISORDER)' },
  { type: 'FOOD INTOLERANCE', description: 'FOOD INTOLERANCE (DISORDER)' },
]
export const EVENT_TYPES = ['', ...EVENT_TYPE_ROWS.map((t) => t.type)]
/** c07: the Severity drop-down, verbatim */
export const EVENT_SEVERITIES = ['', 'MILD', 'MILD TO MODERATE', 'MODERATE', 'MODERATE TO SEVERE', 'SEVERE', 'SEVERE TO LIFE THREATENING', 'LIFE THREATENING', 'FATAL']
const SEVERITY_ROWS = EVENT_SEVERITIES.filter(Boolean).map((description) => ({ description }))
const CERTAINTY = ['', 'UNLIKELY', 'LIKELY', 'CONFIRMED']
const CRITICALITY = ['', 'LOW', 'HIGH', 'UNABLE TO ASSESS']
const RISK_STATUS = ['', 'ACTIVE', 'INACTIVE', 'RESOLVED']
const PHASES = ['', 'INFANT', 'CHILD', 'ADOLESCENT', 'ADULT']
const PERSONS = ['', 'PATIENT', 'FAMILY MEMBER', 'CAREGIVER', 'PROVIDER']
/** c12: the Route drop-down's rows as far as the capture shows them (it scrolls on) */
const ROUTE_ROWS = [
  'INTRAMUSCULAR', 'INFILTRATION ROUTE', 'NASAL', 'ORAL', 'SUBCUTANEOUS', 'ARTERIOVENOUS FISTULA', 'BUCCAL', 'COLOSTOMY',
  'CONJUNCTIVAL', 'CUTANEOUS', 'ENTERAL', 'EPIDURAL', 'GASTRONOMY', 'ILEOSTOMY', 'INHALATION', 'INTERSTITIAL',
].map((code) => ({ code }))
/** c11: the Site drop-down's rows as far as the capture shows them (it scrolls on) */
const SITE_ROWS = [
  ['113345001', 'ABDOMEN'], ['4164462003', 'WOUND'], ['46862004', 'BUTTOCK'], ['723608007', 'NARES - LEFT'],
  ['723609004', 'NARES - RIGHT'], ['723979003', 'BUTTOCK - LEFT'], ['723980000', 'BUTTOCK - RIGHT'], ['LA', 'LEFT ARM'],
  ['LDG', 'BUTTOCK - LEFT DORSOGLUTEAL'], ['LG', 'LEFT DORSOGLUTEAL'], ['LL', 'LEFT LEG'], ['LVG', 'BUTTOCK - LEFT VENTROGLUTEAL'],
  ['LVG', 'LEFT VENTROGLUTEAL'], ['NAS', 'NASAL'], ['PO', 'ORAL'], ['RA', 'RIGHT ARM'],
].map(([site, description]) => ({ site, description }))

/** the captures' 17px boxes (c05, c08: every edit, drop-down and lookup) */
const BOX_17 = { '--pb-row-h': '17px' } as CSSProperties
/** the band grey behind the New Agent / New Reaction buttons (c05 219,215,211) */
const BAND_GREY = '#dbd7d3'
const at = (left: number, top: number, width?: number): CSSProperties => ({ position: 'absolute', left, top, width })

export const blankAgent = (): EventAgent => ({
  category: false, code: '', agent: '', brand: '', manufacturer: '', lot: '', series: '', doseQty: '', doseUnit: '', route: '', site: '',
})

/* --- shared bits ------------------------------------------------------------ */

/** A band of flat command buttons inside a tab or window (New Agent |
    Delete Agent …), each anchored and reported as `host.mois.command.{id}`:
    white buttons, a hard 1px frame, on the band grey (c05, c14, c18). */
export function BandCommands({ commands, height = 21 }: {
  commands: { id: string; label: string; w: number; onClick?: () => void; disabled?: boolean }[]
  height?: number
}) {
  return (
    <div className="pb-cmdrow" style={{ flex: 'none', height, background: BAND_GREY }}>
      {commands.map((c, i) => (
        <PBButton key={c.id} bare className="pb-cmdrow__btn" disabled={c.disabled} command={c.id} onClick={() => c.onClick?.()}
          style={{ width: c.w, height, background: c.disabled ? undefined : '#fff', marginLeft: i ? -1 : 0 }}>
          {c.label}
        </PBButton>
      ))}
    </div>
  )
}

/** A dialog tab strip whose anchors cannot collide with the folder's own
    Detail / Linked Reaction Risks tabs behind the window. c05: the tabs are
    a fixed 138 (the selected one stands 2px proud each side: 142). */
function DialogTabs({ prefix, tabs, active, onChange, children, tabW = 138 }: {
  prefix: string; tabs: string[]; active: string; onChange: (t: string) => void; children: ReactNode; tabW?: number
}) {
  const host = usePBInstrumentation()
  const slug = (t: string) => `${prefix}-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <div className="pb-tabs" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '12px 8.5px 0' }}>
      <div className="pb-tabs__strip" style={{ paddingLeft: 2 }}>
        {tabs.map((t) => (
          <button key={t} type="button" className={`pb-tabs__tab${t === active ? ' is-active' : ''}`}
            style={{ width: t === active ? tabW + 4 : tabW, minWidth: 0 }}
            data-tutorial-id={host?.anchor('tab', slug(t))}
            onClick={() => { host?.report('selectTab', { tab: slug(t) }); onChange(t) }}>
            {t}
          </button>
        ))}
      </div>
      <div className="pb-tabs__page pb-tabs__page--face" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: '1px solid #dbdbdb' }}>
        {children}
      </div>
    </div>
  )
}

/** The Win10 balloon a MOIS control's tip opens in: a blue (i), a bold
    title, the text under it (c09, the Category tick). */
function BalloonTip({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  const [show, setShow] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const icon = cloneElement(PB_MESSAGE_ICONS.info, { width: 16, height: 16 })
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => { timer.current = window.setTimeout(() => setShow(true), 500) }}
      onMouseLeave={() => { window.clearTimeout(timer.current); setShow(false) }}>
      {children}
      {show && (
        <span role="tooltip" data-tutorial-id="host.mois.field.agent-category-tip" style={{
          position: 'absolute', left: 0, top: 'calc(100% + 14px)', zIndex: 120, display: 'flex', gap: 6, alignItems: 'flex-start',
          padding: '1px 6px 1px 5px', border: '1px solid #767676', background: '#fff', whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: '15px',
        }}>
          <span style={{ flex: 'none', paddingTop: 5 }}>{icon}</span>
          <span><b>{title}</b><br />{text}</span>
        </span>
      )}
    </span>
  )
}

/* --- what the folders know about events and risks ------------------------- */

export type RiskInfo = { id: string; onset: string; stop: string; agent: string; reactions: string }
export type EventInfo = { id: string; onset: string; agents: string; reactions: string; record: MoisRecord }

const dotted = (d?: string) => (d ?? '').slice(0, 10).replace(/\//g, '.')

/** Every Reaction Risk and Adverse Event the open chart has — filed this
    session, the practice records, the export — and the links between them. */
export function useAllergyIndex() {
  const data = useChartExport()
  const { chart } = usePatient()
  const session = useAllergySession(chart)
  return useMemo(() => {
    const riskRecords = [...session.risks.map((r) => riskItem(r).record), ...(data?.allergy ?? [])]
    const risks: RiskInfo[] = riskRecords.map((r) => ({
      id: r.id_allergy ?? '', onset: dotted(r.dtm_start), stop: dotted(r.dtm_end),
      agent: r.str_substance ?? '', reactions: r.str_reactions ?? r.str_reaction ?? '',
    }))
    const eventRecords = [
      ...session.events.map((e) => eventItem(e).record),
      ...(practiceRecords.events ?? []).map((p) => p.record),
      ...(data?.adverse_event ?? []),
    ]
    const events: EventInfo[] = eventRecords.map((r) => ({
      id: r.id_adverse_event ?? '', onset: dotted(r.dtm_administered), agents: r.str_agents ?? '', reactions: r.str_reactions ?? '', record: r,
    }))
    const exported: EventRiskLink[] = (data?.adverse_link ?? [])
      .map((l) => ({ event: l.id_adverse_event ?? '', risk: l.id_allergy ?? '' }))
    return { chart, data, session, risks, events, links: effectiveLinks(chart, exported) }
  }, [chart, data, session])
}

/** an event's agents: edited on its tab, filed with it, the export's, or its one-line summary */
export function eventAgents(ix: ReturnType<typeof useAllergyIndex>, id: string, record?: MoisRecord): EventAgent[] {
  const edited = ix.session.parts[id]?.agents
  if (edited) return edited
  const filed = storedEvent(ix.chart, id)
  if (filed) return filed.agents
  const exported = (ix.data?.adverse_agent ?? []).filter((a) => a.id_adverse_event === id)
  if (exported.length) {
    return exported.map((a) => ({
      ...blankAgent(), category: a.str_is_drug === 'N', code: a.str_agent_code ?? '', agent: a.str_agent ?? '',
      brand: a.str_trade_name ?? '', manufacturer: a.str_manufacturer ?? '', route: a.str_route ?? '', site: a.str_site ?? '',
      lot: a.str_lot_number ?? '', series: a.str_series_number ?? '',
    }))
  }
  return record?.str_agents ? [{ ...blankAgent(), agent: record.str_agents }] : []
}

export function eventReactions(ix: ReturnType<typeof useAllergyIndex>, id: string, record?: MoisRecord): EventReaction[] {
  const edited = ix.session.parts[id]?.reactions
  if (edited) return edited
  const filed = storedEvent(ix.chart, id)
  if (filed) return filed.reactions
  const exported = (ix.data?.reaction_event ?? []).filter((r) => r.id_adverse_event === id)
  if (exported.length) return exported.map((r) => ({ code: r.str_reaction_code ?? '', term: r.str_reaction ?? '', rank: r.num_rank ?? '0' }))
  return record?.str_reactions ? [{ code: '', term: record.str_reactions, rank: '0' }] : []
}

/* --- the agent block (Agents tab and New Adverse Event) -------------------- */

/* c08 / c14: one agent is a 61px block of three 17px rows on an 18 pitch,
   ruled off underneath; x in the block's own coordinates. */
function AgentBlock({ agent, index, count, onPick, onChange, onLookup, anchor }: {
  agent: EventAgent; index: number; count: number
  onPick: () => void; onChange: (a: EventAgent) => void
  /** the agent's "…": the Master Reaction Agent List (c10) */
  onLookup?: () => void
  /** `host.mois.field.{anchor}-…` on the first block's fields */
  anchor?: string
}) {
  const set = (k: keyof EventAgent) => (v: string | boolean) => onChange({ ...agent, [k]: v })
  const id = (f: string) => (anchor && index === 0 ? `host.mois.field.${anchor}-${f}` : undefined)
  const label = (text: string, right: number, top: number) => (
    <span style={{ ...at(right - 120, top, 120), textAlign: 'right', lineHeight: '17px', pointerEvents: 'none' }}>{text}</span>
  )
  const text = (k: 'brand' | 'manufacturer' | 'lot' | 'series' | 'doseQty' | 'doseUnit', left: number, top: number, w: number, tid?: string) => (
    <PBInput style={{ ...at(left, top, w), height: 17 }} value={agent[k]} onChange={(e) => set(k)(e.target.value)} data-tutorial-id={tid} />
  )
  return (
    <div onMouseDown={onPick} style={{ ...BOX_17, position: 'relative', height: 61, flex: 'none', borderBottom: '3px double #c6c6c6' }}>
      <span style={at(10.5, 6)}>
        <BalloonTip title="Drug Category or Non-Drug Agent" text="Identifies the agent as a drug category or non-drug">
          <PBCheckbox checked={agent.category} onChange={set('category')} tutorialId={id('category')} />
        </BalloonTip>
      </span>
      <span style={at(46.5, 4, 337)}>
        <PBLookup w={337} value={agent.agent} onChange={set('agent')} fieldId={id('agent')} onDots={onLookup} name={anchor ? `${anchor}-${index}` : undefined} />
      </span>
      {text('brand', 46.5, 22, 318, id('brand'))}
      <span style={{ ...at(3.5, 40), lineHeight: '17px' }}>{index + 1} of {count}</span>
      {text('manufacturer', 46.5, 40, 318)}
      {label('Lot Number:', 470.5, 4)}
      {text('lot', 478.5, 4, 108)}
      {label('Series Number:', 470.5, 22)}
      {text('series', 478.5, 22, 108)}
      {label('Dose (qnty/unit):', 470.5, 40)}
      {text('doseQty', 478.5, 40, 47)}
      {text('doseUnit', 526.5, 40, 59)}
      {label('Route:', 629, 4)}
      <span style={at(638.5, 4)}>
        <PBDropDownDataWindow w={138} listW={237} rows={ROUTE_ROWS} value={agent.route} columns={[{ key: 'code', header: 'Code' }]}
          onSelect={(r) => set('route')(r.code)} />
      </span>
      {label('Site:', 629, 22)}
      <span style={at(638.5, 22)}>
        <PBDropDownDataWindow w={138} listW={406} rows={SITE_ROWS} value={agent.site} display="description"
          columns={[{ key: 'site', header: 'Site', width: 74 }, { key: 'description', header: 'Description', width: 290 }, { key: 'pad', header: '' }]}
          onSelect={(r) => set('site')(r.description)} />
      </span>
    </div>
  )
}

export function AgentList({ agents, setCur, onChange, onLookup, anchor }: {
  agents: EventAgent[]; setCur: (i: number) => void; onChange: (next: EventAgent[]) => void
  onLookup?: (i: number) => void; anchor?: string
}) {
  return (
    <>
      {/* c05: the captions on the face, a white hairline over them, a 2px black rule under */}
      <div style={{ position: 'relative', height: 27, flex: 'none', borderTop: '1px solid #fafafa', borderBottom: '2px solid #000', lineHeight: '24px' }}>
        <span style={at(1.5, 0)}>Category</span>
        <span style={at(54.5, 0)}>Agent / Brand Name / Manufacturer</span>
        <span style={at(484.5, 0)}>Drug Administration Information</span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }} data-tutorial-id={anchor ? `host.mois.group.${anchor}s` : undefined}>
        {agents.map((a, i) => (
          <AgentBlock key={i} agent={a} index={i} count={agents.length} onPick={() => setCur(i)} anchor={anchor}
            onLookup={onLookup ? () => onLookup(i) : undefined}
            onChange={(next) => onChange(agents.map((x, j) => (j === i ? next : x)))} />
        ))}
      </div>
    </>
  )
}

/* c05 / c15: Code 101 · "…" 15 · Reaction 609 · Rank 62 on the white body,
   no "no rows" line; the header stops at Rank. */
function ReactionGrid({ reactions, cur, setCur, onChange, anchor }: {
  reactions: EventReaction[]; cur: number; setCur: (i: number) => void; onChange: (next: EventReaction[]) => void; anchor?: string
}) {
  const edit = (i: number, k: keyof EventReaction, v: string) => onChange(reactions.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const cell: CSSProperties = { height: 17, border: 0, background: 'transparent', padding: '0 3px' }
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff', padding: '1.5px 0 0 1.5px' }}>
      <PBDataWindow flush gutter={false} empty={false} rows={reactions} current={cur} onCurrentChange={setCur}
        rowTutorialId={anchor ? (_r, i) => `host.mois.row.${anchor}-${i}` : undefined}
        style={{ '--pb-dw-row-h': '18px', width: 787, flex: 'none' } as CSSProperties}
        columns={[
          { key: 'code', header: 'Code', width: 101, headAlign: 'center', render: (r, i) => <PBInput w="100%" style={cell} value={r.code} onChange={(e) => edit(i, 'code', e.target.value)} /> },
          { key: 'dots', header: '', width: 15, dots: true, render: () => '…' },
          {
            key: 'term', header: 'Reaction', width: 609, headAlign: 'center',
            render: (r, i) => <PBInput w="100%" style={cell} value={r.term} onChange={(e) => edit(i, 'term', e.target.value)}
              data-tutorial-id={anchor && i === reactions.length - 1 ? `host.mois.field.${anchor}` : undefined} />,
          },
          { key: 'rank', header: 'Rank', width: 62, align: 'center', render: (r, i) => <PBInput w="100%" align="center" style={cell} value={r.rank} onChange={(e) => edit(i, 'rank', e.target.value)} /> },
        ]} />
    </div>
  )
}

/* --- New Adverse Event ------------------------------------------------------ */

const lab = (left: number, top: number): CSSProperties => ({ ...at(left, top), lineHeight: '17px', whiteSpace: 'nowrap' })

/** An empty Onset that holds focus shows its edit mask (c05: 0000.00.00). */
function OnsetField({ value, onChange, tutorialId, autoFocus, left = 65.5, top = 15.5 }: {
  value: string; onChange?: (v: string) => void; tutorialId?: string; autoFocus?: boolean; left?: number; top?: number
}) {
  return (
    <>
      <style>{'.ae-onset::placeholder{color:transparent}.ae-onset:focus::placeholder{color:#000;opacity:1}'}</style>
      <PBInput className="ae-onset" style={{ ...at(left, top, 83), height: 17 }} placeholder="0000.00.00" autoFocus={autoFocus}
        value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={!onChange} data-tutorial-id={tutorialId} />
    </>
  )
}

/** The Detail form the New Adverse Event (c05) and the folder's Detail page
    (c13) share: x / y in the form's own coordinates, measured off c05. */
function EventForm({ onset, time, type, onType, typeId, severity, onSeverity, severityId, eventType, eventTypeId, comment, style }: {
  onset: ReactNode; time: ReactNode; comment: ReactNode
  type: string; onType: (v: string) => void; typeId?: string
  severity: string; onSeverity: (v: string) => void; severityId?: string
  eventType: string; eventTypeId?: string; style?: CSSProperties
}) {
  return (
    <div style={{ ...BOX_17, position: 'relative', height: 247, flex: 'none', ...style }}>
      <span style={lab(12, 15.5)}>Onset:</span>
      {onset}
      <span style={lab(155, 15.5)}>Time:</span>
      {time}
      <span style={lab(588, 15.5)}>Event Type:</span>
      <span style={lab(663, 15.5)} data-tutorial-id={eventTypeId}>{eventType}</span>
      <span style={lab(12, 35.5)}>Type:</span>
      <span style={at(65.5, 35.5)}>
        <PBDropDownDataWindow w={161} listW={403} rows={EVENT_TYPE_ROWS} value={type} tutorialId={typeId} onSelect={(r) => onType(r.type)}
          columns={[{ key: 'type', header: 'Type', width: 135 }, { key: 'description', header: 'Description', width: 258 }, { key: 'pad', header: '' }]} />
      </span>
      <span style={lab(12, 55.5)}>Severity:</span>
      <span style={at(65.5, 55.5)}>
        <PBDropDownDataWindow w={161} listW={193} rows={SEVERITY_ROWS} value={severity} tutorialId={severityId} onSelect={(r) => onSeverity(r.description)}
          columns={[{ key: 'description', header: 'Description' }]} />
      </span>
      <span style={lab(12, 75.5)}>Comment:</span>
      {comment}
    </div>
  )
}

/** c05 / c17: Ok · Cancel, 75 × 21.5, centred, neither drawn as the default. */
function AdverseFooter({ ok, onClose, okId, cancelId, okDisabled, above = 7, below = 7.5, left = 4.5 }: {
  ok: () => void; onClose: () => void; okId: string; cancelId: string; okDisabled?: boolean
  /** face above / below the buttons past the footer's own 7px, and how far
      left of centre the pair sits (c05: 7 / 7.5 / 4.5; c17: 8 / 12 / 26) */
  above?: number; below?: number; left?: number
}) {
  const size: CSSProperties = { width: 75, minWidth: 0, height: 21.5, padding: 0 }
  return (
    <>
      <span className="pb-footer__spacer" />
      <PBButton command={okId} disabled={okDisabled} onClick={ok} style={{ ...size, margin: `${above}px 0 ${below}px` }}>Ok</PBButton>
      <PBButton command={cancelId} onClick={onClose} style={{ ...size, margin: `${above}px ${left * 2}px ${below}px -3px` }}>Cancel</PBButton>
      <span className="pb-footer__spacer" />
    </>
  )
}

type LinkMode = 'none' | 'new' | 'existing'

/** agent picked in the Master Reaction Agent List (c10) */
export function pickAgent(a: EventAgent, row: { code: string; description: string }): EventAgent {
  return { ...a, code: row.code, agent: row.description }
}

export function NewAdverseEventWindow({ onClose, onFiled }: { onClose: () => void; onFiled: () => void }) {
  const ix = useAllergyIndex()
  const [tab, setTab] = useState('Detail')
  /* c08: once New Agent is pressed the window's caption reads <Master Window> */
  const [master, setMaster] = useState(false)
  const [lookup, setLookup] = useState<number | null>(null)
  const [onset, setOnset] = useState('')
  const [time, setTime] = useState(' : ')
  const [type, setType] = useState('')
  const [severity, setSeverity] = useState('')
  const [comment, setComment] = useState('')
  const {
    rows: agents, setRows: setAgents, setCur: setAgentCur, add: addAgent, remove: removeAgent,
  } = useRecordList<EventAgent>([])
  const {
    rows: reactions, setRows: setReactions, cur: reactionCur, setCur: setReactionCur, add: addReaction, remove: removeReaction,
  } = useRecordList<EventReaction>([])
  const [mode, setMode] = useState<LinkMode>('none')
  const [risk, setRisk] = useState<Record<string, string>>({})
  const [riskCategory, setRiskCategory] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const r = (k: string) => risk[k] ?? ''
  const setR = (k: string) => (v: string) => setRisk((x) => ({ ...x, [k]: v }))

  const ok = () => {
    const id = addAdverseEvent(ix.chart, { onset, time: time.trim() === ':' ? '' : time, type, severity, comment, agents, reactions })
    if (mode === 'new') {
      const t = r('type') || type
      const input: ReactionRiskInput = {
        reactionType: /INTOLERANCE/.test(t) ? 'Intolerance' : 'Allergy',
        agentType: riskCategory ? 'Drug (Category)' : /^FOOD/.test(t) ? 'Food' : /^ENV/.test(t) ? 'Environmental' : 'Drug (Specific)',
        agentCode: r('agentCode'),
        agentTerm: r('agent') || agents[0]?.agent || '',
        reactions: reactions.map((x) => ({ code: x.code, term: x.term })),
        severity: r('severity') || severity,
        firstOccurrence: r('onset') || onset || MOIS_TODAY,
        stopped: r('stop'),
        comments: r('comment'),
        certainty: r('certainty'), criticality: r('criticality'), riskStatus: r('status'),
        phaseAtOnset: r('phase'), informant: r('informant'), observer: r('observer'), documenter: r('documenter'),
        linkEvents: [id],
      }
      addReactionRisk(ix.chart, input)
    }
    if (mode === 'existing' && picked.length) linkEventRisk(ix.chart, picked.map((risk) => ({ event: id, risk })))
    onFiled()
  }

  const sel = (k: string, options: string[], w = 132) => (
    <PBSelect w={w} options={options} value={r(k)} onChange={(e) => setR(k)(e.target.value)} data-tutorial-id={`host.mois.field.link-risk-${k}`} />
  )

  return (
    <StageWindow id={ADVERSE_WINDOWS.newEvent} title={master ? '<Master Window>' : 'New Adverse Event'} width={834} height={719} onClose={onClose}
      footer={<AdverseFooter ok={ok} onClose={onClose} okId="adverse-event-ok" cancelId="adverse-event-cancel" />}>
      <DialogTabs prefix="adverse-event" tabs={['Detail', 'Linked Reaction Risks']} active={tab} onChange={setTab}>
        {tab === 'Detail' ? (
          <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '4.5px 5px 4.5px 3px', '--pb-band-h': '21px', background: 'var(--pb-face)' } as CSSProperties}>
            <PBBand>New Adverse Event</PBBand>
            <EventForm
              onset={<OnsetField value={onset} onChange={setOnset} tutorialId="host.mois.field.adverse-event-onset" autoFocus />}
              time={<PBInput style={{ ...at(183, 15.5, 44), height: 17 }} align="center" value={time} onChange={(e) => setTime(e.target.value)} data-tutorial-id="host.mois.field.adverse-event-time" />}
              type={type} onType={setType} typeId="host.mois.field.adverse-event-type"
              severity={severity} onSeverity={setSeverity} severityId="host.mois.field.adverse-event-severity"
              eventType="NORMAL"
              comment={<PBTextArea style={{ ...at(65.5, 75.5, 713), height: 171.5, resize: 'none' }} value={comment} onChange={(e) => setComment(e.target.value)} data-tutorial-id="host.mois.field.adverse-event-comment" />}
            />
            <BandCommands commands={[
              { id: 'adverse-event-new-agent', label: 'New Agent', w: 117.5, onClick: () => { setMaster(true); addAgent(blankAgent()) } },
              { id: 'adverse-event-delete-agent', label: 'Delete Agent', w: 118, onClick: () => { if (agents.length) removeAgent() } },
            ]} height={20.5} />
            <div style={{ height: 156, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
              <AgentList agents={agents} setCur={setAgentCur} onChange={(next) => setAgents(() => next)} anchor="adverse-event-agent"
                onLookup={(i) => { setAgentCur(i); setLookup(i) }} />
            </div>
            <BandCommands commands={[
              { id: 'adverse-event-new-reaction', label: 'New Reaction', w: 131.5, onClick: () => addReaction({ code: '', term: '', rank: String(reactions.length) }) },
              { id: 'adverse-event-delete-reaction', label: 'Delete Reaction', w: 118, onClick: () => { if (reactions.length) removeReaction() } },
            ]} />
            <ReactionGrid reactions={reactions} cur={reactionCur} setCur={setReactionCur} onChange={(next) => setReactions(() => next)} anchor="adverse-event-reaction" />
            {lookup !== null && agents[lookup] && (
              <MasterReactionAgentList onClose={() => setLookup(null)}
                onPick={(row) => setAgents((list) => list.map((a, j) => (j === lookup ? pickAgent(a, row) : a)))} />
            )}
          </div>
        ) : (
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: 4 }}>
            <div className="pb-row" style={{ justifyContent: 'space-around', padding: '12px 0', flex: 'none' }}>
              <PBRadio name="ae-link" label="Do Not Link a Reaction Risk" checked={mode === 'none'} onChange={() => setMode('none')} tutorialId="host.mois.field.adverse-event-link-none" />
              <PBRadio name="ae-link" label="Link to a New Reaction Risk" checked={mode === 'new'} onChange={() => setMode('new')} tutorialId="host.mois.field.adverse-event-link-new" />
              <PBRadio name="ae-link" label="Link to Existing Reaction Risks" checked={mode === 'existing'} onChange={() => setMode('existing')} tutorialId="host.mois.field.adverse-event-link-existing" />
            </div>
            {mode === 'new' && (
              <div className="pb-groupbox" style={{ flex: 'none' }} data-tutorial-id="host.mois.group.link-new-reaction-risk">
                <PBBand>Link to a New Reaction Risk</PBBand>
                <div style={{ display: 'grid', gridTemplateColumns: '84px 150px 84px 150px 1fr', gap: '4px 6px', padding: '8px 10px', alignItems: 'center' }}>
                  <FormLabel>Date of Onset:</FormLabel><PBInput w={100} value={r('onset')} onChange={(e) => setR('onset')(e.target.value)} data-tutorial-id="host.mois.field.link-risk-onset" />
                  <FormLabel>Stop Date:</FormLabel><PBInput w={100} value={r('stop')} onChange={(e) => setR('stop')(e.target.value)} />
                  <span className="pb-row" style={{ justifyContent: 'flex-end' }}><FormLabel>Phase at Onset:</FormLabel>{sel('phase', PHASES)}</span>
                  <FormLabel>Certainty:</FormLabel>{sel('certainty', CERTAINTY)}
                  <FormLabel>Risk Status:</FormLabel>{sel('status', RISK_STATUS)}
                  <span className="pb-row" style={{ justifyContent: 'flex-end' }}><FormLabel>Informant:</FormLabel>{sel('informant', PERSONS)}</span>
                  <FormLabel>Criticality:</FormLabel>{sel('criticality', CRITICALITY)}
                  <FormLabel>Severity:</FormLabel>{sel('severity', EVENT_SEVERITIES)}
                  <span className="pb-row" style={{ justifyContent: 'flex-end' }}><FormLabel>Observer:</FormLabel>{sel('observer', PERSONS)}</span>
                  <FormLabel>Type:</FormLabel>{sel('type', EVENT_TYPES)}
                  <FormLabel>Category:</FormLabel><PBCheckbox checked={riskCategory} onChange={setRiskCategory} tutorialId="host.mois.field.link-risk-category" />
                  <span className="pb-row" style={{ justifyContent: 'flex-end' }}><FormLabel>Documenter:</FormLabel>{sel('documenter', ['', SESSION_USER])}</span>
                  <FormLabel>Agent:</FormLabel>
                  <div className="pb-row" style={{ gap: 0, gridColumn: '2 / span 3' }}>
                    <PBLookup w={100} value={r('agentCode')} onChange={setR('agentCode')} />
                    <PBInput w="100%" style={{ flex: '1 1 auto' }} value={r('agent')} onChange={(e) => setR('agent')(e.target.value)} data-tutorial-id="host.mois.field.link-risk-agent" />
                  </div>
                  <span className="pb-row" style={{ justifyContent: 'flex-end' }}><FormLabel>Agent Category:</FormLabel><PBLookup w={220} disabled /></span>
                  <span className="pb-form__label" style={{ alignSelf: 'start' }}>Comment:</span>
                  <PBTextArea rows={8} w="100%" value={r('comment')} onChange={(e) => setR('comment')(e.target.value)} style={{ gridColumn: '2 / span 4' }} />
                </div>
              </div>
            )}
            {mode === 'existing' && (
              <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <PBBand>Link to Existing Reaction Risks</PBBand>
                <PickList rows={ix.risks} picked={picked} setPicked={setPicked} anchor="adverse-event-link-risk"
                  columns={[{ key: 'onset', header: 'Onset', width: 86 }, { key: 'agent', header: 'Agent' }, { key: 'reactions', header: 'Reactions', width: 220 }]} />
              </div>
            )}
          </div>
        )}
      </DialogTabs>
    </StageWindow>
  )
}

/* --- a tick-per-row pick list (c17) ----------------------------------------
   c17 "Reaction Risks": a Link Reaction Risks band over a blue header —
   Select 67.5 (a centred tick) · Onset 69 · Agent 326 · Reactions 325 — on
   white, no gutter, no banding; Ok · Cancel under it. */

function PickList<T extends { id: string }>({ rows, picked, setPicked, columns, anchor }: {
  rows: T[]; picked: string[]; setPicked: (next: string[]) => void
  columns: { key: string; header: string; width?: number }[]; anchor: string
}) {
  const toggle = (id: string, on: boolean) => setPicked(on ? [...picked, id] : picked.filter((x) => x !== id))
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff', padding: '1.5px 0 0 1.5px' }}>
      <PBDataWindow flush gutter={false} zebra={false} empty={false} rows={rows as unknown as Record<string, string>[]}
        style={{ '--pb-dw-row-h': '18px', width: 787.5, flex: 'none' } as CSSProperties}
        columns={[
          {
            key: 'pick', header: 'Select', width: 67.5, align: 'center',
            render: (r, i) => <PBCheckbox checked={picked.includes(r.id)} onChange={(on) => toggle(r.id, on)} tutorialId={`host.mois.field.${anchor}-${i}`} />,
          },
          ...columns.map((c) => ({ ...c, headAlign: 'center' as const })),
        ]} />
    </div>
  )
}

export function LinkPickerWindow({ id, title, band, rows, columns, onOk, onClose }: {
  id: string; title: string; band: string
  rows: { id: string }[]; columns: { key: string; header: string; width?: number }[]
  onOk: (ids: string[]) => void; onClose: () => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  return (
    <StageWindow id={id} title={title} width={832} height={649} onClose={onClose}
      footer={<AdverseFooter ok={() => (picked.length ? onOk(picked) : onClose())} onClose={onClose} okId={`${id}-ok`} cancelId={`${id}-cancel`} above={8} below={12} left={26} />}>
      <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '12px 8px 0 6px', '--pb-band-h': '20px' } as CSSProperties}>
        <PBBand>{band}</PBBand>
        <PickList rows={rows} picked={picked} setPicked={setPicked} columns={columns} anchor={`${id}-pick`} />
      </div>
    </StageWindow>
  )
}

/* --- Elevate Event To a Reaction Risk -------------------------------------- */

export function ElevateToRiskWindow({ eventId, onClose, onFiled }: { eventId: string; onClose: () => void; onFiled: () => void }) {
  const ix = useAllergyIndex()
  const event = ix.events.find((e) => e.id === eventId)
  const agents = eventAgents(ix, eventId, event?.record)
  const [specific, setSpecific] = useState(true)
  const listed = agents.filter((a) => a.category !== specific)
  const [cur, setCur] = useState(0)
  const chosen = listed[cur]
  const ok = () => {
    if (!chosen) return
    const t = event?.record.str_intolerance_type ?? ''
    const agentType: AgentType = specific ? 'Drug (Specific)'
      : /^FOOD/.test(t) ? 'Food' : /^ENV/.test(t) ? 'Environmental' : 'Drug (Category)'
    addReactionRisk(ix.chart, {
      reactionType: /INTOLERANCE/.test(t) ? 'Intolerance' : 'Allergy',
      agentType,
      agentCode: chosen.code,
      agentTerm: chosen.agent,
      reactions: eventReactions(ix, eventId, event?.record).map((x) => ({ code: x.code, term: x.term })),
      severity: event?.record.str_severity ?? '',
      firstOccurrence: event?.onset || MOIS_TODAY,
      linkEvents: [eventId],
    })
    onFiled()
  }
  return (
    <StageWindow id={ADVERSE_WINDOWS.elevate} title="Elevate Event To a Reaction Risk" width={820} height={710} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={!chosen} onClick={ok} tutorialId="host.mois.command.elevate-ok">Ok</FooterButton>
        <FooterButton onClick={onClose} tutorialId="host.mois.command.elevate-cancel">Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: 8 }}>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 70, padding: '8px 0', flex: 'none' }}>
          <PBRadio name="elevate" label="Elevate a Specific Drug to a Reaction Risk" checked={specific}
            onChange={() => { setSpecific(true); setCur(0) }} tutorialId="host.mois.field.elevate-specific-drug" />
          <PBRadio name="elevate" label="Elevate a Drug Category or Non-Drug to a Reaction Risk" checked={!specific}
            onChange={() => { setSpecific(false); setCur(0) }} tutorialId="host.mois.field.elevate-category-or-non-drug" />
        </div>
        <PBBand>{specific ? 'Select a Specific Drug Agent' : 'Select a Drug Category or Non-Drug Agent'}</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow flush gutter={false} current={cur} onCurrentChange={setCur}
            rows={listed.map((a) => ({ code: a.code, agent: a.agent }))}
            rowTutorialId={(_r, i) => `host.mois.row.elevate-agent-${i}`}
            empty="This event has no agent of this kind."
            columns={[{ key: 'code', header: 'Agent Code', width: 120 }, { key: 'agent', header: 'Agent' }]} />
        </div>
      </div>
    </StageWindow>
  )
}

/* --- the folder tabs ------------------------------------------------------- */

/** Adverse Events ▸ Detail (`4f7a5861…`; c13): the New Adverse Event's
    form without its band, 9px further in and 3.5px lower. */
export function EventDetailPane({ record }: { record?: MoisRecord }) {
  const k = record?.id_adverse_event ?? 'none'
  return <EventDetailForm key={k} record={record} />
}

function EventDetailForm({ record }: { record?: MoisRecord }) {
  const hm = record?.num_administered_hr && record?.num_administered_min
    ? `${record.num_administered_hr.padStart(2, '0')}:${record.num_administered_min.padStart(2, '0')}` : ' : '
  const [type, setType] = useState(record?.str_intolerance_type ?? '')
  const [severity, setSeverity] = useState(record?.str_severity ?? '')
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}>
      <EventForm style={{ margin: '3.5px 0 0 9px' }}
        onset={<PBInput style={{ ...at(65.5, 15.5, 83), height: 17 }} align="center" defaultValue={dotted(record?.dtm_administered)} data-tutorial-id="host.mois.field.event-onset" />}
        time={<PBInput style={{ ...at(183, 15.5, 44), height: 17 }} align="center" defaultValue={hm} />}
        type={type} onType={setType} typeId="host.mois.field.event-intolerance-type"
        severity={severity} onSeverity={setSeverity} severityId="host.mois.field.event-severity"
        eventType={record?.str_event_type ?? (record ? 'NORMAL' : '')} eventTypeId="host.mois.field.event-type"
        comment={<PBTextArea style={{ ...at(65.5, 75.5, 713), height: 173, resize: 'none' }} defaultValue={record?.str_event_comment ?? ''} data-tutorial-id="host.mois.field.event-comment" />}
      />
    </div>
  )
}

/** Adverse Events ▸ Agents (`0d3d5d53…`; c14) */
export function EventAgentsPane({ record }: { record?: MoisRecord }) {
  const ix = useAllergyIndex()
  const id = record?.id_adverse_event ?? ''
  const agents = id ? eventAgents(ix, id, record) : []
  const [cur, setCur] = useState(0)
  const [lookup, setLookup] = useState<number | null>(null)
  const save = (next: EventAgent[]) => { if (id) setEventParts(ix.chart, id, { agents: next }) }
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands commands={[
        { id: 'event-new-agent', label: 'New Agent', w: 117, disabled: !id, onClick: () => { save([...agents, blankAgent()]); setCur(agents.length) } },
        { id: 'event-delete-agent', label: 'Delete Agent', w: 117, onClick: () => { if (agents.length) { save(agents.filter((_, i) => i !== cur)); setCur(0) } } },
      ]} />
      <AgentList agents={agents} setCur={setCur} onChange={save} anchor="event-agent" onLookup={(i) => { setCur(i); setLookup(i) }} />
      {lookup !== null && agents[lookup] && (
        <MasterReactionAgentList onClose={() => setLookup(null)}
          onPick={(row) => save(agents.map((a, j) => (j === lookup ? pickAgent(a, row) : a)))} />
      )}
    </div>
  )
}

/** Adverse Events ▸ Reactions (`b7ebbce5…`; c15) */
export function EventReactionsPane({ record }: { record?: MoisRecord }) {
  const ix = useAllergyIndex()
  const id = record?.id_adverse_event ?? ''
  const reactions = id ? eventReactions(ix, id, record) : []
  const [cur, setCur] = useState(0)
  const save = (next: EventReaction[]) => { if (id) setEventParts(ix.chart, id, { reactions: next }) }
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands commands={[
        { id: 'event-new-reaction', label: 'New Reaction', w: 117, disabled: !id, onClick: () => { save([...reactions, { code: '', term: '', rank: String(reactions.length) }]); setCur(reactions.length) } },
        { id: 'event-delete-reaction', label: 'Delete Reaction', w: 117, onClick: () => { if (reactions.length) { save(reactions.filter((_, i) => i !== cur)); setCur(0) } } },
      ]} />
      <ReactionGrid reactions={reactions} cur={cur} setCur={setCur} onChange={save} anchor="event-reaction" />
    </div>
  )
}

/** Reaction Risks ▸ Reactions (evidence/MATRIX-R0681-code … R0683-rank, MOIS
    DEV v02.31.23): the event's own page — a New Reaction | Delete Reaction
    band over Code · … · Reaction · Rank, no Severity or Comment column. The
    rows are the risk's reactions (the export's tdt_reaction_risk, or what a
    window filed this session); an added or deleted line lasts while the
    record is open (INFERRED: no capture shows a risk reaction saved). */
export function RiskReactionsPane({ record }: { record?: MoisRecord }) {
  const ix = useAllergyIndex()
  const id = record?.id_allergy ?? ''
  const filed = useMemo<EventReaction[]>(() => {
    const rows = id.startsWith('session-') ? storedRiskReactions(ix.chart, id) : (ix.data?.reaction_risk ?? []).filter((r) => r.id_allergy === id)
    return rows.map((r, i) => ({ code: r.str_reaction_code ?? '', term: r.str_reaction ?? '', rank: r.num_rank ?? String(i) }))
  }, [ix.chart, ix.data, id])
  const [reactions, setReactions] = useState<EventReaction[]>(filed)
  const [cur, setCur] = useState(0)
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands commands={[
        { id: 'risk-new-reaction', label: 'New Reaction', w: 117, disabled: !id, onClick: () => { setReactions([...reactions, { code: '', term: '', rank: String(reactions.length) }]); setCur(reactions.length) } },
        { id: 'risk-delete-reaction', label: 'Delete Reaction', w: 117, onClick: () => { if (reactions.length) { setReactions(reactions.filter((_, i) => i !== cur)); setCur(0) } } },
      ]} />
      <ReactionGrid reactions={reactions} cur={cur} setCur={setCur} onChange={setReactions} anchor="risk-reaction" />
    </div>
  )
}

const linkCell = (text: string) => <span style={{ color: 'var(--pb-link)', textDecoration: 'underline' }}>{text}</span>

/* c18: plain captions on the face, a blue group band, the current row yellow,
   a 28px gutter carrying the ">" and the band's ⊟. */
const ink = (caption: string) => <span style={{ color: '#000' }}>{caption}</span>
const LINKED_GRID = {
  '--pb-dw-gutter-width': '30.5px', '--pb-dw-row-h': '20px', '--pb-dw-select': '#ffff84', '--pb-dw-group': '#c8dcfa',
} as CSSProperties

/** Adverse Events ▸ Linked Reaction Risks (`10f68120…`; c18) */
export function LinkedRisksPane({ record, onLink }: { record?: MoisRecord; onLink: () => void }) {
  const ix = useAllergyIndex()
  const id = record?.id_adverse_event ?? ''
  const mine = new Set(ix.links.filter((l) => l.event === id).map((l) => l.risk))
  const rows = ix.risks.filter((r) => mine.has(r.id)).map((r) => ({ ...r, group: 'REACTION RISKS' }))
  const [cur, setCur] = useState(0)
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands height={22} commands={[
        { id: 'link-reaction-risks', label: 'Link Reaction Risk(s)', w: 117, disabled: !id, onClick: onLink },
        {
          id: 'unlink-reaction-risks', label: 'Unlink Reaction Risk(s)', w: 121.5, disabled: !rows[cur],
          onClick: () => { const r = rows[cur]; if (r) { unlinkEventRisk(ix.chart, { event: id, risk: r.id }); setCur(0) } },
        },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }} data-tutorial-id="host.mois.group.linked-reaction-risks">
        <PBDataWindow flush head="caption" zebra={false} empty={false} style={LINKED_GRID} rows={rows} current={cur} onCurrentChange={setCur}
          groupBy={(r) => r.group} groups={['REACTION RISKS']} groupLabel={(g) => <b>{g}</b>} rowTutorialId={(_r, i) => `host.mois.row.linked-risk-${i}`}
          columns={[
            { key: 'onset', header: ink('Onset'), width: 87 }, { key: 'stop', header: ink('Stop'), width: 70 },
            { key: 'agent', header: ink('Agent'), width: 323, render: (r) => linkCell(r.agent) }, { key: 'reactions', header: ink('Reactions') },
          ]} />
      </div>
    </div>
  )
}

/** Reaction Risks ▸ Linked Events (`1a8f753b…`) */
export function LinkedEventsPane({ record, onLink }: { record?: MoisRecord; onLink: () => void }) {
  const ix = useAllergyIndex()
  const id = record?.id_allergy ?? ''
  const mine = new Set(ix.links.filter((l) => l.risk === id).map((l) => l.event))
  const rows = ix.events.filter((e) => mine.has(e.id)).map(({ record: _r, ...e }) => ({ ...e, group: 'EVENTS' }))
  const [cur, setCur] = useState(0)
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands height={22} commands={[
        { id: 'link-events', label: 'Link Event(s)', w: 117, disabled: !id, onClick: onLink },
        {
          id: 'unlink-events', label: 'Unlink Event(s)', w: 117, disabled: !rows[cur],
          onClick: () => { const r = rows[cur]; if (r) { unlinkEventRisk(ix.chart, { event: r.id, risk: id }); setCur(0) } },
        },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }} data-tutorial-id="host.mois.group.linked-events">
        <PBDataWindow flush head="caption" zebra={false} empty={false} style={LINKED_GRID} rows={rows} current={cur} onCurrentChange={setCur}
          groupBy={(r) => r.group} groups={['EVENTS']} groupLabel={(g) => <b>{g}</b>} rowTutorialId={(_r, i) => `host.mois.row.linked-event-${i}`}
          columns={[
            { key: 'onset', header: ink('Onset'), width: 87 },
            { key: 'agents', header: ink('Agents'), width: 393, render: (r) => linkCell(r.agents) }, { key: 'reactions', header: ink('Reactions') },
          ]} />
      </div>
    </div>
  )
}

/* --- ** NO KNOWN ** --------------------------------------------------------- */

/** `** NO KNOWN **`, right-aligned on the notice line under Search For (`8ed81b2c…`). */
export function NoKnownMark({ node }: { node: string }) {
  const { chart } = usePatient()
  const s = useAllergySession(chart)
  if ((node !== 'reaction' && node !== 'allergy') || !s.noKnown.reaction) return null
  return <b style={{ marginLeft: 'auto', paddingRight: 10, letterSpacing: 0.5 }} data-tutorial-id="host.mois.field.no-known">** NO KNOWN **</b>
}

/* --- the windows a folder raises by id ------------------------------------- */

export function AdverseEventWindows({ win, onMark }: {
  win: { window: { id: string; args?: Record<string, unknown> } | null; is: (id: string) => boolean; close: () => void }
  onMark: (what: string, top?: boolean) => void
}) {
  const ix = useAllergyIndex()
  const arg = (k: string) => argStr(win.window?.args?.[k])
  const done = (what: string, top = false) => { onMark(what, top); win.close() }
  const linkedTo = (key: 'event' | 'risk', id: string) => new Set(ix.links.filter((l) => l[key] === id).map((l) => (key === 'event' ? l.risk : l.event)))
  return (
    <>
      {win.is(ADVERSE_WINDOWS.newEvent) && <NewAdverseEventWindow onClose={win.close} onFiled={() => done('saved', true)} />}
      {win.is(ADVERSE_WINDOWS.elevate) && <ElevateToRiskWindow eventId={arg('event')} onClose={win.close} onFiled={() => done('elevated')} />}
      {win.is(ADVERSE_WINDOWS.linkRisks) && (() => {
        const event = arg('event')
        const have = linkedTo('event', event)
        return (
          <LinkPickerWindow id={ADVERSE_WINDOWS.linkRisks} title="Reaction Risks" band="Link Reaction Risks"
            rows={ix.risks.filter((r) => !have.has(r.id))}
            columns={[{ key: 'onset', header: 'Onset', width: 69 }, { key: 'agent', header: 'Agent', width: 326 }, { key: 'reactions', header: 'Reactions', width: 325 }]}
            onOk={(ids) => { linkEventRisk(ix.chart, ids.map((risk) => ({ event, risk }))); done('linked') }} onClose={win.close} />
        )
      })()}
      {win.is(ADVERSE_WINDOWS.linkEvents) && (() => {
        const risk = arg('risk')
        const have = linkedTo('risk', risk)
        return (
          <LinkPickerWindow id={ADVERSE_WINDOWS.linkEvents} title="Link Event(s)" band="Adverse Events"
            rows={ix.events.filter((e) => !have.has(e.id)).map(({ record: _r, ...e }) => e)}
            columns={[{ key: 'onset', header: 'Onset', width: 69 }, { key: 'agents', header: 'Agents', width: 326 }, { key: 'reactions', header: 'Reactions', width: 325 }]}
            onOk={(ids) => { linkEventRisk(ix.chart, ids.map((event) => ({ event, risk }))); done('linked') }} onClose={win.close} />
        )
      })()}
      {win.is(ADVERSE_WINDOWS.noKnownBlocked) && (
        <StageMessageBox id={ADVERSE_WINDOWS.noKnownBlocked} title="MOIS" icon="info"
          buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={win.close}>
          Reaction Risks are recorded for this patient. A No Known assertion can only be added when the patient has no Reaction Risks.
        </StageMessageBox>
      )}
    </>
  )
}
