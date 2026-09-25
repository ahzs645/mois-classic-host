import { useState } from 'react'
import type { MoisRecord } from '../data/charts'
import { MOIS_TODAY } from '../data/patients'
import { useChartExport } from '../data/chart-records'
import { registerScreenWindows, useScreenWindow } from '../host/screen-windows'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea } from '../pb'
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
   ▾; Comments; More… · Link Event(s)…; Save (F2) · Cancel. */
export const SEVERITIES = ['', 'MILD', 'MODERATE', 'SEVERE', 'SEVERE TO LIFE THREATENING']

export function NewReactionRiskWindow({ onSave, onClose }: {
  onSave: (row: Record<string, string>) => void
  onClose: () => void
}) {
  const [type, setType] = useState<'Allergy' | 'Intolerance'>('Allergy')
  const [agentType, setAgentType] = useState('Drug (Specific)')
  const [agent, setAgent] = useState('')
  const [reactions, setReactions] = useState(['', '', ''])
  const [severity, setSeverity] = useState('')
  const drug = agentType.startsWith('Drug')
  const save = () => onSave({
    onset: MOIS_TODAY, tilde: '',
    type: `${drug ? 'DRUG' : agentType.toUpperCase()} ${type.toUpperCase()}`,
    category: drug ? '✓' : '', code: '', agent: agent.toUpperCase(),
    reactions: reactions.filter(Boolean).join(', ').toUpperCase(), severity, m: '',
  })
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
        <div className="pb-row"><PBInput w={74} align="center" defaultValue={MOIS_TODAY} /><span style={{ marginLeft: 20 }}>Stopped:</span><PBInput w={74} /></div>
        <span />
        <div className="pb-row" style={{ gap: 0 }}><span style={{ width: 124 }}>Code</span><span>Description</span></div>
        <span>Agent:</span>
        <div className="pb-row" style={{ gap: 0 }} data-tutorial-id="host.mois.field.reaction-agent">
          <PBLookup w={124} />
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
        <PBTextArea rows={6} w="100%" data-tutorial-id="host.mois.field.reaction-comments" />
        <span />
        <div className="pb-row" style={{ justifyContent: 'flex-end' }}>
          <PBButton wide>More...</PBButton><PBButton wide>Link Event(s)...</PBButton>
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Adverse Events ▸ Recommendations --------------------------------------
   303212 `268301a3…png`: "Recommendations for Further Administration" with
   its seven checkboxes, Name, Professional Status (MOH/MHO · MD · RN · Other,
   specify), Comments, Phone / Ext. / Date, View Recommendation History, and —
   once signed — the red "Recommendations are LOCKED." and Unsign
   Recommendations. Signed, the whole tab is read only, and the Comments box
   never takes focus: clicking it opens the Text Viewer. */
export function RecommendationsPane({ record, onOpenText }: { record?: MoisRecord; onOpenText: () => void }) {
  const locked = record?.stp_record_state === 'SIGNED'
  const y = (k: string) => record?.[k] === 'Y'
  const status = record?.str_recommend_status ?? ''
  return (
    <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }} data-tutorial-id="host.mois.group.recommendations">
      <PBBand>Recommendations for Further Administration</PBBand>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px', padding: '6px 14px' }}>
        <PBCheckbox label="No Changes to Administration Schedule" checked={y('str_no_change')} disabled={locked} />
        <PBCheckbox label="Controlled Setting for Next Administration" checked={y('str_controlled_setting')} disabled={locked} />
        <div className="pb-row"><PBCheckbox label="Expert Referral, specify:" checked={y('str_expert_referral')} disabled={locked} /><PBInput w={120} readOnly={locked} /></div>
        <div className="pb-row"><PBCheckbox label="No Further Administrations With" checked={y('str_no_immunizations')} disabled={locked} /><PBInput w={60} readOnly={locked} /><span>, specify:</span><PBInput w={110} readOnly={locked} /></div>
        <PBCheckbox label="Determine Protective Antibody Level" checked={y('str_protective_antibody')} disabled={locked} />
        <PBCheckbox label="Active Follow-up for Recurrence After Next Administration" checked={y('str_follow_up_aefi')} disabled={locked} />
        <span />
        <div className="pb-row"><PBCheckbox label="Other, specify:" checked={y('str_immunization_other')} disabled={locked} /><PBInput w={160} readOnly={locked} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '98px 1fr', gap: '4px 6px', padding: '0 14px', alignItems: 'center' }}>
        <span>Name:</span><PBInput w="100%" readOnly={locked} defaultValue={record?.str_recommend_name ?? ''} />
        <span>Professional Status:</span>
        <div className="pb-row" style={{ gap: 26 }}>
          {['MOH/MHO', 'MD', 'RN'].map((s) => <PBRadio key={s} name="prof-status" label={s} checked={status === s} disabled={locked} />)}
          <PBRadio name="prof-status" label="Other, specify:" checked={false} disabled={locked} /><PBInput w={150} readOnly={locked} />
        </div>
        <span style={{ alignSelf: 'start' }}>Comments:</span>
        {/* read only, the box never takes focus: a click is what opens the
            Text Viewer, which is the only way to read past what fits */}
        <div
          className="pb-field"
          data-tutorial-id="host.mois.field.recommendation-comments"
          onClick={locked ? onOpenText : undefined}
          style={{ height: 58, overflow: 'hidden', whiteSpace: 'pre-wrap', background: locked ? 'var(--pb-face)' : '#fff', cursor: 'default', padding: '2px 4px' }}
        >
          {record?.str_comment ?? ''}
        </div>
        <span>Phone:</span>
        <div className="pb-row"><PBInput w={90} readOnly={locked} /><span>Ext.:</span><PBInput w={48} readOnly={locked} /><span style={{ marginLeft: 30 }}>Date:</span><PBInput w={84} readOnly={locked} /></div>
      </div>
      <div className="pb-row" style={{ padding: '6px 8px', marginTop: 'auto' }}>
        <PBButton wide>View Recommendation History</PBButton>
        <span className="pb-row__spacer" style={{ flex: '1 1 auto' }} />
        {locked && <span style={{ color: '#d00' }} data-tutorial-id="host.mois.field.recommendations-locked">Recommendations are LOCKED.</span>}
        <span className="pb-row__spacer" style={{ flex: '1 1 auto' }} />
        <PBButton wide disabled={!locked}>Unsign Recommendations</PBButton>
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

/* --- Adverse Events: the tabs other than Reactions -------------------------
   Recommendations is the captured one (above). Agents and Linked Reaction
   Risks list the event's adverse_agent and adverse_link rows; the Detail
   tab's layout is not captured, so it shows only the event's dated fields. */
export function AdverseEventTab({ tab, record }: { tab: string; record?: MoisRecord }) {
  const data = useChartExport()
  const win = useScreenWindow()
  const id = record?.id_adverse_event
  if (tab === 'Recommendations') {
    return <RecommendationsPane record={record}
      onOpenText={() => win.open(ALLERGY_WINDOWS.textViewer, { heading: 'Recommendations - Read Only' })} />
  }
  if (tab === 'Agents') {
    const rows = (data?.adverse_agent ?? []).filter((a) => a.id_adverse_event === id)
      .map((a) => ({ code: a.str_agent_code ?? '', agent: a.str_agent ?? '', trade: a.str_trade_name ?? '', maker: a.str_manufacturer ?? '', route: a.str_route ?? '', site: a.str_site ?? '' }))
    return (
      <div style={{ flex: '1 1 auto', display: 'flex', padding: 3 }}>
        <PBDataWindow flush gutter={false} rows={rows} empty="No agents recorded."
          columns={[
            { key: 'code', header: 'Code', width: 76 }, { key: 'agent', header: 'Generic Name' },
            { key: 'trade', header: 'Brand Name', width: 210 }, { key: 'maker', header: 'Manufacturer', width: 140 },
            { key: 'route', header: 'Route', width: 70 }, { key: 'site', header: 'Site', width: 50 },
          ]} />
      </div>
    )
  }
  if (tab === 'Linked Reaction Risks') {
    const linked = new Set((data?.adverse_link ?? []).filter((l) => l.id_adverse_event === id).map((l) => l.id_allergy))
    const rows = (data?.allergy ?? []).filter((a) => linked.has(a.id_allergy))
      .map((a) => ({ onset: (a.dtm_start ?? '').replace(/\//g, '.'), type: a.str_intolerance_type ?? '', agent: a.str_substance ?? '', reactions: a.str_reactions ?? '' }))
    return (
      <div style={{ flex: '1 1 auto', display: 'flex', padding: 3 }}>
        <PBDataWindow flush gutter={false} rows={rows} empty="No linked reaction risks."
          columns={[{ key: 'onset', header: 'Onset', width: 86 }, { key: 'type', header: 'Type', width: 130 }, { key: 'agent', header: 'Agent' }, { key: 'reactions', header: 'Reactions', width: 200 }]} />
      </div>
    )
  }
  const hm = [record?.num_administered_hr, record?.num_administered_min].every(Boolean)
    ? `${record!.num_administered_hr!.padStart(2, '0')}:${record!.num_administered_min!.padStart(2, '0')}` : ''
  return (
    <div className="pb-form" style={{ gridTemplateColumns: '110px 200px 110px 1fr', padding: '8px', gap: '4px 6px', alignContent: 'start' }}>
      <span className="pb-form__label pb-form__label--right">Onset:</span>
      <div className="pb-row"><PBInput w={84} readOnly value={(record?.dtm_administered ?? '').replace(/\//g, '.')} /><PBInput w={46} readOnly value={hm} /></div>
      <span className="pb-form__label pb-form__label--right">Report Type:</span><PBInput w={160} readOnly value={record?.str_report_type ?? ''} />
      <span className="pb-form__label pb-form__label--right">Intolerance Type:</span><PBInput w={160} readOnly value={record?.str_intolerance_type ?? ''} />
      <span className="pb-form__label pb-form__label--right">Severity:</span><PBInput w={220} readOnly value={record?.str_severity ?? ''} />
    </div>
  )
}

/* The windows a report folder raises through the frame's by-name switch. */
export function AllergyFolderWindows({ record, onFile }: { record?: MoisRecord; onFile: (row: Record<string, string>) => void }) {
  const win = useScreenWindow()
  return (
    <>
      {win.is(ALLERGY_WINDOWS.newRisk) && (
        <NewReactionRiskWindow onClose={win.close} onSave={(row) => { onFile(row); win.close() }} />
      )}
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
