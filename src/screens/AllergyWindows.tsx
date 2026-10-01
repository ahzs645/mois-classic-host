import { useState, type CSSProperties } from 'react'
import type { MoisRecord } from '../data/charts'
import { MOIS_TODAY } from '../data/patients'
import { addReactionRisk, type AgentType } from '../data/allergySession'
import { usePatient } from '../data/patient-context'
import { registerScreenWindows, useScreenWindow } from '../host/screen-windows'
import { PBBand, PBButton, PBCheckbox, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea } from '../pb'
import {
  ADVERSE_WINDOWS, AdverseEventWindows, EventAgentsPane, EventDetailPane, EventReactionsPane, LinkPickerWindow,
  LinkedRisksPane, useAllergyIndex,
} from './AdverseEventWindows'
import { FooterButton, StageWindow } from './StageWindow'

/* ============================================================================
   Allergy / Intolerances: the New Reaction Risk window, the Adverse Events
   Recommendations tab, and the read-only Text Viewer a locked comment opens.
   ========================================================================= */

export const ALLERGY_WINDOWS = {
  newRisk: 'new-reaction-risk',
  textViewer: 'text-viewer',
} as const

registerScreenWindows(Object.values(ALLERGY_WINDOWS))

/* --- New Reaction Risk -----------------------------------------------------
   303210 `b9130e47…png` (v02.17.19): Reaction Type Allergy / Intolerance;
   Agent Type Drug (Specific) / Food / Drug (Category) / Environmental; Date of
   Onset (today) and Stopped; Agent Code "…" and Description (the salmon
   required field); Reaction 1–3, each a code "…" and a description; Severity
   ▾; Comments; More… · Link Event(s)…; Save (F2) · Cancel.

   Save files the risk into data/allergySession.ts (which also drops a
   `** NO KNOWN **` assertion, 303131). Link Event(s)… opens the Link Event(s)
   pick list over this window (303131: "Opens a new window to allow adverse
   events to be linked" — the list is INFERRED); the ticked events are linked
   when the risk is saved. More… stays inert. */
export const SEVERITIES = ['', 'MILD', 'MODERATE', 'SEVERE', 'SEVERE TO LIFE THREATENING']

export function NewReactionRiskWindow({ onSaved, onClose }: {
  onSaved: () => void
  onClose: () => void
}) {
  const { chart } = usePatient()
  const ix = useAllergyIndex()
  const [linking, setLinking] = useState(false)
  const [linkEvents, setLinkEvents] = useState<string[]>([])
  const [onset, setOnset] = useState(MOIS_TODAY)
  const [stopped, setStopped] = useState('')
  const [agentCode, setAgentCode] = useState('')
  const [comments, setComments] = useState('')
  const [type, setType] = useState<'Allergy' | 'Intolerance'>('Allergy')
  const [agentType, setAgentType] = useState('Drug (Specific)')
  const [agent, setAgent] = useState('')
  const [reactions, setReactions] = useState(['', '', ''])
  const [severity, setSeverity] = useState('')
  const save = () => {
    addReactionRisk(chart, {
      reactionType: type, agentType: agentType as AgentType, agentCode, agentTerm: agent,
      reactions: reactions.filter(Boolean).map((term) => ({ code: '', term })),
      severity, firstOccurrence: onset || MOIS_TODAY, stopped, comments, linkEvents,
    })
    onSaved()
  }
  const radio = (label: string) => (
    <PBRadio name="agent-type" label={label} checked={agentType === label} onChange={() => setAgentType(label)} />
  )
  return (
    <StageWindow id={ALLERGY_WINDOWS.newRisk} title="New Reaction Risk" width={620} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={save} tutorialId="host.mois.command.reaction-risk-save">Save (F2)</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div style={{ margin: '8px 10px 0', border: '1px solid var(--pb-border)', padding: '10px 14px', display: 'grid', gridTemplateColumns: '92px 1fr', gap: '8px 8px', alignItems: 'center' }}>
        <span>Reaction Type:</span>
        <div className="pb-row" style={{ gap: 90 }} data-tutorial-id="host.mois.field.reaction-type">
          <PBRadio name="reaction-type" label="Allergy" checked={type === 'Allergy'} onChange={() => setType('Allergy')} />
          <PBRadio name="reaction-type" label="Intolerance" checked={type === 'Intolerance'} onChange={() => setType('Intolerance')} />
        </div>
        <span style={{ alignSelf: 'start' }}>Agent Type:</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 0' }} data-tutorial-id="host.mois.field.agent-type">
          {radio('Drug (Specific)')}{radio('Food')}{radio('Drug (Category)')}{radio('Environmental')}
        </div>
        <span>Date of Onset:</span>
        <div className="pb-row"><PBInput w={74} align="center" value={onset} onChange={(e) => setOnset(e.target.value)} /><span style={{ marginLeft: 20 }}>Stopped:</span><PBInput w={74} value={stopped} onChange={(e) => setStopped(e.target.value)} /></div>
        <span />
        <div className="pb-row" style={{ gap: 0 }}><span style={{ width: 124 }}>Code</span><span>Description</span></div>
        <span>Agent:</span>
        <div className="pb-row" style={{ gap: 0 }} data-tutorial-id="host.mois.field.reaction-agent">
          <PBLookup w={124} value={agentCode} onChange={setAgentCode} />
          <PBInput w="100%" value={agent} onChange={(e) => setAgent(e.target.value)} style={{ background: 'var(--pb-dw-flag, #f8c7a8)', flex: '1 1 auto' }} />
        </div>
        {[0, 1, 2].map((i) => (
          <span key={`l${i}`} style={{ display: 'contents' }}>
            <span>Reaction {i + 1}:</span>
            <div className="pb-row" style={{ gap: 0 }} data-tutorial-id={i === 0 ? 'host.mois.field.reactions' : undefined}>
              <PBLookup w={124} />
              <PBInput w="100%" style={{ flex: '1 1 auto' }} value={reactions[i]} onChange={(e) => setReactions((r) => r.map((x, j) => (j === i ? e.target.value : x)))} />
            </div>
          </span>
        ))}
        <span>Severity:</span>
        <span data-tutorial-id="host.mois.field.reaction-severity"><PBSelect w={124} value={severity} options={SEVERITIES} onChange={(e) => setSeverity(e.target.value)} /></span>
        <span style={{ alignSelf: 'start' }}>Comments:</span>
        <PBTextArea rows={6} w="100%" value={comments} onChange={(e) => setComments(e.target.value)} data-tutorial-id="host.mois.field.reaction-comments" />
        <span />
        <div className="pb-row" style={{ justifyContent: 'flex-end' }}>
          {linkEvents.length > 0 && <span style={{ marginRight: 'auto' }} data-tutorial-id="host.mois.field.reaction-linked-events">{linkEvents.length} event(s) to link</span>}
          <PBButton wide>More...</PBButton>
          <PBButton wide command="reaction-risk-link-events" onClick={() => setLinking(true)}>Link Event(s)...</PBButton>
        </div>
      </div>
      {linking && (
        <LinkPickerWindow id="reaction-risk-link-events" title="Link Event(s)" band="Adverse Events"
          rows={ix.events.map(({ record: _r, ...e }) => e)}
          columns={[{ key: 'onset', header: 'Onset', width: 86 }, { key: 'agents', header: 'Agents' }, { key: 'reactions', header: 'Reactions', width: 200 }]}
          onOk={(ids) => { setLinkEvents(ids); setLinking(false) }} onClose={() => setLinking(false)} />
      )}
    </StageWindow>
  )
}

/* --- Adverse Events ▸ Recommendations --------------------------------------
   303212 `268301a3…png`: "Recommendations for Further Administration" with
   its seven checkboxes, Name, Professional Status (MOH/MHO · MD · RN · Other,
   specify), Comments, Phone / Ext. / Date, View Recommendation History, and —
   once signed — the red "Recommendations are LOCKED." and Unsign
   Recommendations. Signed, the whole tab is read only, and the Comments box
   never takes focus: clicking it opens the Text Viewer.

   Geometry: 2026-09-29 TRAINING capture c16 (unsigned, chart 2429): every
   box 17 tall, the ticks on a 19 pitch in two columns (15 and 287 in), Name
   and Comments from 115 to 793, the radios at 115 / 205 / 295 / 385, Phone
   88 · Ext. 47 · Date 83.5; under the form View Recommendation History (159)
   at the left and Sign Recommendations (157.5) at the right, 22 tall. An
   unsigned event's button reads Sign Recommendations. */
const R_AT = (left: number, top: number, width?: number): CSSProperties => ({ position: 'absolute', left, top, width })
const R_LAB = (left: number, top: number): CSSProperties => ({ ...R_AT(left, top), lineHeight: '17px', whiteSpace: 'nowrap' })

export function RecommendationsPane({ record, onOpenText }: { record?: MoisRecord; onOpenText: () => void }) {
  const locked = record?.stp_record_state === 'SIGNED'
  const y = (k: string) => record?.[k] === 'Y'
  const status = record?.str_recommend_status ?? ''
  const box = (left: number, top: number, w: number, extra?: CSSProperties) => (
    <PBInput style={{ ...R_AT(left, top, w), height: 17, ...extra }} readOnly={locked} />
  )
  const tick = (left: number, top: number, label: string, k: string) => (
    <span style={{ ...R_AT(left, top), lineHeight: '17px' }}><PBCheckbox label={label} checked={y(k)} disabled={locked} /></span>
  )
  const radio = (left: number, label: string, on: boolean) => (
    <span style={{ ...R_AT(left, 104), lineHeight: '17px' }}><PBRadio name="prof-status" label={label} checked={on} disabled={locked} /></span>
  )
  return (
    <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--pb-face)', '--pb-band-h': '22px' } as CSSProperties} data-tutorial-id="host.mois.group.recommendations">
      <div style={{ flex: 'none', border: '1px solid #b6b6b6', borderTop: 0 }}>
        <PBBand>Recommendations for Further Administration</PBBand>
        <div style={{ position: 'relative', height: 274, borderTop: '1px solid #b6b6b6' }}>
          {tick(15, 7, 'No Changes to Administration Schedule', 'str_no_change')}
          {tick(287, 7, 'Controlled Setting for Next Administration', 'str_controlled_setting')}
          {tick(15, 26, 'Expert Referral, specify:', 'str_expert_referral')}
          {box(147.5, 26, 125.5)}
          {tick(287, 26, 'No Further Administrations With', 'str_no_immunizations')}
          {box(457, 26, 62)}
          <span style={R_LAB(521, 26)}>, specify:</span>
          {box(570, 26, 156)}
          {tick(15, 45.5, 'Determine Protective Antibody Level', 'str_protective_antibody')}
          {tick(287, 45.5, 'Active Follow-up for Recurrence After Next Administration', 'str_follow_up_aefi')}
          {tick(287, 64.5, 'Other, specify:', 'str_immunization_other')}
          {box(375.5, 64.5, 169)}
          <span style={R_LAB(14, 84)}>Name:</span>
          <PBInput style={{ ...R_AT(115, 84, 678), height: 17 }} readOnly={locked} defaultValue={record?.str_recommend_name ?? ''} />
          <span style={R_LAB(14, 104)}>Professional Status:</span>
          {radio(115, 'MOH/MHO', status === 'MOH/MHO')}
          {radio(205, 'MD', status === 'MD')}
          {radio(295, 'RN', status === 'RN')}
          {radio(385, 'Other, specify:', false)}
          {box(481, 104, 312)}
          <span style={R_LAB(14, 124)}>Comments:</span>
          {/* read only, the box never takes focus: a click is what opens the
              Text Viewer, which is the only way to read past what fits */}
          <div
            className="pb-field"
            data-tutorial-id="host.mois.field.recommendation-comments"
            onClick={locked ? onOpenText : undefined}
            style={{ ...R_AT(115, 124, 678), height: 125, overflow: 'hidden', whiteSpace: 'pre-wrap', background: locked ? 'var(--pb-face)' : '#fff', cursor: 'default', padding: '2px 4px' }}
          >
            {record?.str_comment ?? ''}
          </div>
          <span style={R_LAB(14, 251.5)}>Phone:</span>
          {box(115, 251.5, 88)}
          <span style={R_LAB(219, 251.5)}>Ext.:</span>
          {box(244, 251.5, 47)}
          <span style={R_LAB(326, 251.5)}>Date:</span>
          {box(361, 251.5, 83.5)}
        </div>
      </div>
      <div className="pb-row" style={{ flex: 'none', padding: '5px 0 0 1.5px', gap: 0 }}>
        <PBButton style={{ width: 159, minWidth: 0, height: 22, padding: 0 }}>View Recommendation History</PBButton>
        <span className="pb-row__spacer" style={{ flex: '1 1 auto', textAlign: 'center' }}>
          {locked && <span style={{ color: '#d00' }} data-tutorial-id="host.mois.field.recommendations-locked">Recommendations are LOCKED.</span>}
        </span>
        <PBButton style={{ width: 157.5, minWidth: 0, height: 22, padding: 0 }}>{locked ? 'Unsign Recommendations' : 'Sign Recommendations'}</PBButton>
      </div>
    </div>
  )
}

/* --- Text Viewer ------------------------------------------------------------
   303212 `31645e8c…png`: a grey header naming what is being read ("
   Recommendations - Read Only"), a Text Viewer group box with the whole text
   scrolling inside it, and one Close. */
export function TextViewerWindow({ heading, text, onClose }: { heading: string; text: string; onClose: () => void }) {
  return (
    <StageWindow id={ALLERGY_WINDOWS.textViewer} title="Text Viewer" width={880} height={634} onClose={onClose}
      footer={<><span className="pb-footer__spacer" /><FooterButton primary onClick={onClose} tutorialId="host.mois.command.text-viewer-close">Close</FooterButton><span className="pb-footer__spacer" /></>}>
      <div style={{ background: '#8a8a8a', color: '#fff', fontWeight: 700, fontSize: '1.25em', padding: '3px 8px', flex: 'none' }}>{heading}</div>
      <fieldset className="pb-fieldset pb-fieldset--fill" style={{ margin: '6px 10px 0', flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <legend className="pb-fieldset__legend">Text Viewer</legend>
        <div className="pb-field" style={{ flex: '1 1 auto', height: 'auto', minHeight: 0, overflow: 'auto', whiteSpace: 'pre-wrap', background: '#fff', padding: '3px 5px' }} data-tutorial-id="host.mois.field.text-viewer">
          {text}
        </div>
      </fieldset>
    </StageWindow>
  )
}

/* --- Adverse Events: the tabs other than Recommendations -------------------
   Recommendations is the captured one (above). Detail, Agents, Reactions and
   Linked Reaction Risks are screens/AdverseEventWindows.tsx (303131
   `4f7a5861…`, `0d3d5d53…`, `b7ebbce5…`, `10f68120…`). */
export function AdverseEventTab({ tab, record }: { tab: string; record?: MoisRecord }) {
  const win = useScreenWindow()
  if (tab === 'Recommendations') {
    return <RecommendationsPane record={record}
      onOpenText={() => win.open(ALLERGY_WINDOWS.textViewer, { heading: 'Recommendations - Read Only' })} />
  }
  if (tab === 'Agents') return <EventAgentsPane key={record?.id_adverse_event} record={record} />
  if (tab === 'Reactions') return <EventReactionsPane key={record?.id_adverse_event} record={record} />
  if (tab === 'Linked Reaction Risks') {
    return <LinkedRisksPane key={record?.id_adverse_event} record={record}
      onLink={() => win.open(ADVERSE_WINDOWS.linkRisks, { event: record?.id_adverse_event ?? '' })} />
  }
  return <EventDetailPane record={record} />
}

/* The windows a report folder raises through the frame's by-name switch. */
export function AllergyFolderWindows({ record, onMark }: { record?: MoisRecord; onMark: (what: string, top?: boolean) => void }) {
  const win = useScreenWindow()
  return (
    <>
      {win.is(ALLERGY_WINDOWS.newRisk) && (
        <NewReactionRiskWindow onClose={win.close} onSaved={() => { onMark('saved', true); win.close() }} />
      )}
      <AdverseEventWindows win={win} onMark={onMark} />
      {win.is(ALLERGY_WINDOWS.textViewer) && (
        <TextViewerWindow
          heading={typeof win.window?.args?.heading === 'string' ? win.window.args.heading : 'Recommendations - Read Only'}
          text={record?.str_comment ?? ''}
          onClose={win.close}
        />
      )}
    </>
  )
}
