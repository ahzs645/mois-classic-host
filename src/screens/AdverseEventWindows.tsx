import { useMemo, useState, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import {
  addAdverseEvent, addReactionRisk, effectiveLinks, eventItem, linkEventRisk, riskItem, setEventParts, storedEvent,
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
  PBBand, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea, usePBInstrumentation,
} from '../pb'
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

   INFERRED (no capture):
   · the Link Reaction Risk(s) / Link Event(s) pick windows ("This will open a
     list of the recorded reaction risks to select from") — a tick per row;
   · the Link to Existing Reaction Risks page of the New Adverse Event, drawn
     as that same tick list;
   · the "Select a Drug Category or Non-Drug Agent" band caption, and which
     agents each radio lists (the Category tick decides);
   · every drop-down's entries beyond the captured DRUG ALLERGY, MILD TO
     MODERATE and the export's SEVERE TO LIFE THREATENING;
   · the message No Known gives when Reaction Risks are already on file (the
     article only describes the empty case);
   · the Detail tab's Owned by / Record State lines (named in the article's
     table, not in the v02.20 capture), placed under Event Type.
   Left out: New AEFI / Edit AEFI (the Edit AEFI form), the Agent and
   Reaction code "…" lookups (the field takes typed text), the hyperlinks'
   jump to the other folder, and the multi-category prompt Elevate gives.
   ========================================================================= */

export const ADVERSE_WINDOWS = {
  newEvent: 'new-adverse-event',
  elevate: 'elevate-event-to-risk',
  linkRisks: 'link-reaction-risks',
  linkEvents: 'link-adverse-events',
  noKnownBlocked: 'no-known-reaction-risks',
} as const

registerScreenWindows(Object.values(ADVERSE_WINDOWS))

export const EVENT_TYPES = ['', 'DRUG ALLERGY', 'DRUG INTOLERANCE', 'FOOD ALLERGY', 'FOOD INTOLERANCE', 'ENVIRONMENTAL ALLERGY', 'ENVIRONMENTAL INTOLERANCE']
export const EVENT_SEVERITIES = ['', 'MILD', 'MILD TO MODERATE', 'MODERATE', 'SEVERE', 'SEVERE TO LIFE THREATENING']
const CERTAINTY = ['', 'UNLIKELY', 'LIKELY', 'CONFIRMED']
const CRITICALITY = ['', 'LOW', 'HIGH', 'UNABLE TO ASSESS']
const RISK_STATUS = ['', 'ACTIVE', 'INACTIVE', 'RESOLVED']
const PHASES = ['', 'INFANT', 'CHILD', 'ADOLESCENT', 'ADULT']
const PERSONS = ['', 'PATIENT', 'FAMILY MEMBER', 'CAREGIVER', 'PROVIDER']
const ROUTES = ['', 'ORAL', 'IM', 'SC', 'ID', 'IN', 'IV', 'TOPICAL']
const SITES = ['', 'LA', 'RA', 'LT', 'RT', 'PO', 'NA']

export const blankAgent = (): EventAgent => ({
  category: false, code: '', agent: '', brand: '', manufacturer: '', lot: '', series: '', doseQty: '', doseUnit: '', route: '', site: '',
})

/* --- shared bits ------------------------------------------------------------ */

/** A band of flat command buttons inside a tab or window (New Agent |
    Delete Agent …), each anchored and reported as `host.mois.command.{id}`. */
function BandCommands({ commands }: { commands: { id: string; label: string; onClick?: () => void; disabled?: boolean }[] }) {
  const host = usePBInstrumentation()
  return (
    <div className="pb-cmdrow" style={{ flex: 'none', background: 'var(--pb-face)' }}>
      {commands.map((c) => (
        <button key={c.id} type="button" className="pb-cmdrow__btn" disabled={c.disabled}
          data-tutorial-id={host?.anchor('command', c.id)}
          onClick={() => { host?.report('command', { command: c.id }); c.onClick?.() }}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

/** A dialog tab strip whose anchors cannot collide with the folder's own
    Detail / Linked Reaction Risks tabs behind the window. */
function DialogTabs({ prefix, tabs, active, onChange, children }: {
  prefix: string; tabs: string[]; active: string; onChange: (t: string) => void; children: ReactNode
}) {
  const host = usePBInstrumentation()
  const slug = (t: string) => `${prefix}-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <div className="pb-tabs" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '8px 10px 0' }}>
      <div className="pb-tabs__strip">
        {tabs.map((t) => (
          <button key={t} type="button" className={`pb-tabs__tab${t === active ? ' is-active' : ''}`}
            data-tutorial-id={host?.anchor('tab', slug(t))}
            onClick={() => { host?.report('selectTab', { tab: slug(t) }); onChange(t) }}>
            {t}
          </button>
        ))}
      </div>
      <div className="pb-tabs__page pb-tabs__page--face" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
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

function AgentBlock({ agent, index, count, current, onPick, onChange, anchor }: {
  agent: EventAgent; index: number; count: number; current: boolean
  onPick: () => void; onChange: (a: EventAgent) => void
  /** `host.mois.field.{anchor}-…` on the first block's fields */
  anchor?: string
}) {
  const set = (k: keyof EventAgent) => (v: string | boolean) => onChange({ ...agent, [k]: v })
  const id = (f: string) => (anchor && index === 0 ? `host.mois.field.${anchor}-${f}` : undefined)
  return (
    <div onMouseDown={onPick} style={{
      display: 'grid', gridTemplateColumns: '46px 330px 1fr', gap: '3px 6px', padding: '4px 6px',
      borderBottom: '1px solid #c8c8c8', background: current ? '#fff' : 'transparent',
    }}>
      <span style={{ textAlign: 'center' }}><PBCheckbox checked={agent.category} onChange={set('category')} tutorialId={id('category')} /></span>
      <PBLookup w="100%" value={agent.agent} onChange={set('agent')} fieldId={id('agent')} />
      <div className="pb-row" style={{ gap: 4 }}>
        <FormLabel w={120}>Lot Number:</FormLabel><PBInput w={108} value={agent.lot} onChange={(e) => set('lot')(e.target.value)} />
        <FormLabel w={48}>Route:</FormLabel><PBSelect w={136} options={ROUTES} value={agent.route} onChange={(e) => set('route')(e.target.value)} />
      </div>
      <span />
      <PBInput w="100%" value={agent.brand} onChange={(e) => set('brand')(e.target.value)} data-tutorial-id={id('brand')} />
      <div className="pb-row" style={{ gap: 4 }}>
        <FormLabel w={120}>Series Number:</FormLabel><PBInput w={108} value={agent.series} onChange={(e) => set('series')(e.target.value)} />
        <FormLabel w={48}>Site:</FormLabel><PBSelect w={136} options={SITES} value={agent.site} onChange={(e) => set('site')(e.target.value)} />
      </div>
      <span style={{ textAlign: 'center' }}>{index + 1} of {count}</span>
      <PBInput w="100%" value={agent.manufacturer} onChange={(e) => set('manufacturer')(e.target.value)} />
      <div className="pb-row" style={{ gap: 4 }}>
        <FormLabel w={120}>Dose (qnty/unit):</FormLabel>
        <PBInput w={46} value={agent.doseQty} onChange={(e) => set('doseQty')(e.target.value)} />
        <PBInput w={58} value={agent.doseUnit} onChange={(e) => set('doseUnit')(e.target.value)} />
      </div>
    </div>
  )
}

function AgentList({ agents, cur, setCur, onChange, anchor }: {
  agents: EventAgent[]; cur: number; setCur: (i: number) => void; onChange: (next: EventAgent[]) => void; anchor?: string
}) {
  return (
    <>
      <div className="pb-row" style={{ padding: '2px 4px', gap: 0, borderBottom: '2px solid #000', flex: 'none' }}>
        <span style={{ width: 54 }}>Category</span>
        <span style={{ width: 430 }}>Agent / Brand Name / Manufacturer</span>
        <span>Drug Administration Information</span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }} data-tutorial-id={anchor ? `host.mois.group.${anchor}s` : undefined}>
        {agents.map((a, i) => (
          <AgentBlock key={i} agent={a} index={i} count={agents.length} current={i === cur} onPick={() => setCur(i)} anchor={anchor}
            onChange={(next) => onChange(agents.map((x, j) => (j === i ? next : x)))} />
        ))}
      </div>
    </>
  )
}

function ReactionGrid({ reactions, cur, setCur, onChange, anchor }: {
  reactions: EventReaction[]; cur: number; setCur: (i: number) => void; onChange: (next: EventReaction[]) => void; anchor?: string
}) {
  const edit = (i: number, k: keyof EventReaction, v: string) => onChange(reactions.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  return (
    <PBDataWindow flush gutter={false} rows={reactions} current={cur} onCurrentChange={setCur}
      rowTutorialId={anchor ? (_r, i) => `host.mois.row.${anchor}-${i}` : undefined}
      columns={[
        { key: 'code', header: 'Code', width: 100, render: (r, i) => <PBInput w="100%" value={r.code} onChange={(e) => edit(i, 'code', e.target.value)} /> },
        { key: 'dots', header: '', width: 16, dots: true, render: () => '…' },
        {
          key: 'term', header: 'Reaction',
          render: (r, i) => <PBInput w="100%" value={r.term} onChange={(e) => edit(i, 'term', e.target.value)}
            data-tutorial-id={anchor && i === reactions.length - 1 ? `host.mois.field.${anchor}` : undefined} />,
        },
        { key: 'rank', header: 'Rank', width: 60, align: 'right', render: (r, i) => <PBInput w="100%" align="right" value={r.rank} onChange={(e) => edit(i, 'rank', e.target.value)} /> },
      ]} />
  )
}

/* --- New Adverse Event ------------------------------------------------------ */

type LinkMode = 'none' | 'new' | 'existing'

export function NewAdverseEventWindow({ onClose, onFiled }: { onClose: () => void; onFiled: () => void }) {
  const ix = useAllergyIndex()
  const [tab, setTab] = useState('Detail')
  const [onset, setOnset] = useState('')
  const [time, setTime] = useState(' : ')
  const [type, setType] = useState('')
  const [severity, setSeverity] = useState('')
  const [comment, setComment] = useState('')
  const {
    rows: agents, setRows: setAgents, cur: agentCur, setCur: setAgentCur, add: addAgent, remove: removeAgent,
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
        agentType: riskCategory ? 'Drug (Category)' : /^FOOD/.test(t) ? 'Food' : /^ENVIRONMENTAL/.test(t) ? 'Environmental' : 'Drug (Specific)',
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
    <StageWindow id={ADVERSE_WINDOWS.newEvent} title="New Adverse Event" width={839} height={716} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={ok} tutorialId="host.mois.command.adverse-event-ok">Ok</FooterButton>
        <FooterButton onClick={onClose} tutorialId="host.mois.command.adverse-event-cancel">Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <DialogTabs prefix="adverse-event" tabs={['Detail', 'Linked Reaction Risks']} active={tab} onChange={setTab}>
        {tab === 'Detail' ? (
          <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: 4 }}>
            <PBBand>New Adverse Event</PBBand>
            <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: '4px 6px', padding: '8px 12px 4px', alignItems: 'center', flex: 'none' }}>
              <FormLabel>Onset:</FormLabel>
              <div className="pb-row" style={{ gap: 6 }}>
                <PBInput w={82} value={onset} onChange={(e) => setOnset(e.target.value)} data-tutorial-id="host.mois.field.adverse-event-onset" />
                <span>Time:</span>
                <PBInput w={44} align="center" value={time} onChange={(e) => setTime(e.target.value)} data-tutorial-id="host.mois.field.adverse-event-time" />
              </div>
              <span className="pb-row" style={{ gap: 18, paddingRight: 80 }}><span>Event Type:</span><span>NORMAL</span></span>
              <FormLabel>Type:</FormLabel>
              <PBSelect w={160} options={EVENT_TYPES} value={type} onChange={(e) => setType(e.target.value)} data-tutorial-id="host.mois.field.adverse-event-type" />
              <span />
              <FormLabel>Severity:</FormLabel>
              <PBSelect w={160} options={EVENT_SEVERITIES} value={severity} onChange={(e) => setSeverity(e.target.value)} data-tutorial-id="host.mois.field.adverse-event-severity" />
              <span />
              <span className="pb-form__label" style={{ alignSelf: 'start' }}>Comment:</span>
              <PBTextArea rows={10} w="100%" value={comment} onChange={(e) => setComment(e.target.value)} data-tutorial-id="host.mois.field.adverse-event-comment" style={{ gridColumn: '2 / span 2', width: 712 }} />
            </div>
            <BandCommands commands={[
              { id: 'adverse-event-new-agent', label: 'New Agent', onClick: () => addAgent(blankAgent()) },
              { id: 'adverse-event-delete-agent', label: 'Delete Agent', disabled: !agents.length, onClick: () => removeAgent() },
            ]} />
            <div style={{ height: 150, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
              <AgentList agents={agents} cur={agentCur} setCur={setAgentCur} onChange={(next) => setAgents(() => next)} anchor="adverse-event-agent" />
            </div>
            <BandCommands commands={[
              { id: 'adverse-event-new-reaction', label: 'New Reaction', onClick: () => addReaction({ code: '', term: '', rank: String(reactions.length) }) },
              { id: 'adverse-event-delete-reaction', label: 'Delete Reaction', disabled: !reactions.length, onClick: () => removeReaction() },
            ]} />
            <div style={{ flex: '1 1 auto', minHeight: 110, display: 'flex' }}>
              <ReactionGrid reactions={reactions} cur={reactionCur} setCur={setReactionCur} onChange={(next) => setReactions(() => next)} anchor="adverse-event-reaction" />
            </div>
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

/* --- a tick-per-row pick list (INFERRED) ----------------------------------- */

function PickList<T extends { id: string }>({ rows, picked, setPicked, columns, anchor }: {
  rows: T[]; picked: string[]; setPicked: (next: string[]) => void
  columns: { key: string; header: string; width?: number }[]; anchor: string
}) {
  const toggle = (id: string, on: boolean) => setPicked(on ? [...picked, id] : picked.filter((x) => x !== id))
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
      <PBDataWindow flush gutter={false} rows={rows as unknown as Record<string, string>[]} empty="Nothing to link."
        columns={[
          {
            key: 'pick', header: '', width: 26, align: 'center',
            render: (r, i) => <PBCheckbox checked={picked.includes(r.id)} onChange={(on) => toggle(r.id, on)} tutorialId={`host.mois.field.${anchor}-${i}`} />,
          },
          ...columns,
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
    <StageWindow id={id} title={title} width={640} height={420} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary disabled={!picked.length} onClick={() => onOk(picked)} tutorialId={`host.mois.command.${id}-ok`}>Ok</FooterButton>
        <FooterButton onClick={onClose} tutorialId={`host.mois.command.${id}-cancel`}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: 6 }}>
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
      : /^FOOD/.test(t) ? 'Food' : /^ENVIRONMENTAL/.test(t) ? 'Environmental' : 'Drug (Category)'
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

/** Adverse Events ▸ Detail (`4f7a5861…`) */
export function EventDetailPane({ record }: { record?: MoisRecord }) {
  const hm = record?.num_administered_hr && record?.num_administered_min
    ? `${record.num_administered_hr.padStart(2, '0')}:${record.num_administered_min.padStart(2, '0')}` : ' : '
  const k = record?.id_adverse_event ?? 'none'
  return (
    <div key={k} style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: '4px 6px', padding: '8px 12px', alignItems: 'center', alignContent: 'start', flex: '1 1 auto' }}>
      <FormLabel>Onset:</FormLabel>
      <div className="pb-row" style={{ gap: 6 }}>
        <PBInput w={82} align="center" defaultValue={dotted(record?.dtm_administered)} data-tutorial-id="host.mois.field.event-onset" />
        <span>Time:</span><PBInput w={44} align="center" defaultValue={hm} />
      </div>
      <span className="pb-row" style={{ gap: 18, paddingRight: 80 }} data-tutorial-id="host.mois.field.event-type">
        <span>Event Type:</span><span>{record?.str_event_type ?? (record ? 'NORMAL' : '')}</span>
      </span>
      <FormLabel>Type:</FormLabel>
      <PBSelect w={160} options={EVENT_TYPES} defaultValue={record?.str_intolerance_type ?? ''} data-tutorial-id="host.mois.field.event-intolerance-type" />
      <span className="pb-row" style={{ gap: 18, paddingRight: 80 }}><span>Owned by:</span><span>{record?.stp_user_create ?? ''}</span></span>
      <FormLabel>Severity:</FormLabel>
      <PBSelect w={160} options={EVENT_SEVERITIES} defaultValue={record?.str_severity ?? ''} data-tutorial-id="host.mois.field.event-severity" />
      <span className="pb-row" style={{ gap: 18, paddingRight: 80 }} data-tutorial-id="host.mois.field.event-record-state">
        <span>Record State:</span><span>{record ? record.stp_record_state ?? 'UNSIGNED' : ''}</span>
      </span>
      <span className="pb-form__label" style={{ alignSelf: 'start' }}>Comment:</span>
      <PBTextArea rows={10} w={712} defaultValue={record?.str_event_comment ?? ''} data-tutorial-id="host.mois.field.event-comment" style={{ gridColumn: '2 / span 2' }} />
    </div>
  )
}

/** Adverse Events ▸ Agents (`0d3d5d53…`) */
export function EventAgentsPane({ record }: { record?: MoisRecord }) {
  const ix = useAllergyIndex()
  const id = record?.id_adverse_event ?? ''
  const agents = id ? eventAgents(ix, id, record) : []
  const [cur, setCur] = useState(0)
  const save = (next: EventAgent[]) => { if (id) setEventParts(ix.chart, id, { agents: next }) }
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands commands={[
        { id: 'event-new-agent', label: 'New Agent', disabled: !id, onClick: () => { save([...agents, blankAgent()]); setCur(agents.length) } },
        { id: 'event-delete-agent', label: 'Delete Agent', disabled: !agents.length, onClick: () => { save(agents.filter((_, i) => i !== cur)); setCur(0) } },
      ]} />
      <AgentList agents={agents} cur={cur} setCur={setCur} onChange={save} anchor="event-agent" />
    </div>
  )
}

/** Adverse Events ▸ Reactions (`b7ebbce5…`) */
export function EventReactionsPane({ record }: { record?: MoisRecord }) {
  const ix = useAllergyIndex()
  const id = record?.id_adverse_event ?? ''
  const reactions = id ? eventReactions(ix, id, record) : []
  const [cur, setCur] = useState(0)
  const save = (next: EventReaction[]) => { if (id) setEventParts(ix.chart, id, { reactions: next }) }
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands commands={[
        { id: 'event-new-reaction', label: 'New Reaction', disabled: !id, onClick: () => { save([...reactions, { code: '', term: '', rank: String(reactions.length) }]); setCur(reactions.length) } },
        { id: 'event-delete-reaction', label: 'Delete Reaction', disabled: !reactions.length, onClick: () => { save(reactions.filter((_, i) => i !== cur)); setCur(0) } },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <ReactionGrid reactions={reactions} cur={cur} setCur={setCur} onChange={save} anchor="event-reaction" />
      </div>
    </div>
  )
}

const linkCell = (text: string) => <span style={{ color: 'var(--pb-link)', textDecoration: 'underline' }}>{text}</span>

/** Adverse Events ▸ Linked Reaction Risks (`10f68120…`) */
export function LinkedRisksPane({ record, onLink }: { record?: MoisRecord; onLink: () => void }) {
  const ix = useAllergyIndex()
  const id = record?.id_adverse_event ?? ''
  const mine = new Set(ix.links.filter((l) => l.event === id).map((l) => l.risk))
  const rows = ix.risks.filter((r) => mine.has(r.id)).map((r) => ({ ...r, group: 'REACTION RISKS' }))
  const [cur, setCur] = useState(0)
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
      <BandCommands commands={[
        { id: 'link-reaction-risks', label: 'Link Reaction Risk(s)', disabled: !id, onClick: onLink },
        {
          id: 'unlink-reaction-risks', label: 'Unlink Reaction Risk(s)', disabled: !rows[cur],
          onClick: () => { const r = rows[cur]; if (r) { unlinkEventRisk(ix.chart, { event: id, risk: r.id }); setCur(0) } },
        },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.group.linked-reaction-risks">
        <PBDataWindow flush rows={rows} current={cur} onCurrentChange={setCur} groupBy={(r) => r.group} groups={['REACTION RISKS']}
          groupLabel={(g) => g} rowTutorialId={(_r, i) => `host.mois.row.linked-risk-${i}`}
          columns={[
            { key: 'onset', header: 'Onset', width: 84 }, { key: 'stop', header: 'Stop', width: 72 },
            { key: 'agent', header: 'Agent', width: 320, render: (r) => linkCell(r.agent) }, { key: 'reactions', header: 'Reactions' },
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
      <BandCommands commands={[
        { id: 'link-events', label: 'Link Event(s)', disabled: !id, onClick: onLink },
        {
          id: 'unlink-events', label: 'Unlink Event(s)', disabled: !rows[cur],
          onClick: () => { const r = rows[cur]; if (r) { unlinkEventRisk(ix.chart, { event: r.id, risk: id }); setCur(0) } },
        },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.group.linked-events">
        <PBDataWindow flush rows={rows} current={cur} onCurrentChange={setCur} groupBy={(r) => r.group} groups={['EVENTS']}
          groupLabel={(g) => g} rowTutorialId={(_r, i) => `host.mois.row.linked-event-${i}`}
          columns={[
            { key: 'onset', header: 'Onset', width: 84 },
            { key: 'agents', header: 'Agents', width: 400, render: (r) => linkCell(r.agents) }, { key: 'reactions', header: 'Reactions' },
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
          <LinkPickerWindow id={ADVERSE_WINDOWS.linkRisks} title="Link Reaction Risk(s)" band="Reaction Risks"
            rows={ix.risks.filter((r) => !have.has(r.id))}
            columns={[{ key: 'onset', header: 'Onset', width: 86 }, { key: 'agent', header: 'Agent' }, { key: 'reactions', header: 'Reactions', width: 200 }]}
            onOk={(ids) => { linkEventRisk(ix.chart, ids.map((risk) => ({ event, risk }))); done('linked') }} onClose={win.close} />
        )
      })()}
      {win.is(ADVERSE_WINDOWS.linkEvents) && (() => {
        const risk = arg('risk')
        const have = linkedTo('risk', risk)
        return (
          <LinkPickerWindow id={ADVERSE_WINDOWS.linkEvents} title="Link Event(s)" band="Adverse Events"
            rows={ix.events.filter((e) => !have.has(e.id)).map(({ record: _r, ...e }) => e)}
            columns={[{ key: 'onset', header: 'Onset', width: 86 }, { key: 'agents', header: 'Agents' }, { key: 'reactions', header: 'Reactions', width: 200 }]}
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
