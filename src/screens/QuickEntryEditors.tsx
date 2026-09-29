import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  GOAL_OPERATORS, GOAL_SUBJECTS, GOAL_UNITS, QE_AGENT_TYPES, QE_AGENTS, QE_MSP_FEES, QE_ORDER_ATTACHMENTS,
  QE_ORDER_FOR, QE_ORDER_TYPES, QE_REACTIONS,
  type QuickEntryCodeTerm, type QuickEntryGoal, type QuickEntryMsp, type QuickEntryOrder,
  type QuickEntryPreference, type QuickEntryReaction,
} from '../data/quickEntryTemplates'
import {
  PREFERENCE_IDENTIFIED_BY, PREFERENCE_INSTRUCTIONS, PREFERENCE_SUBJECTS, PREFERENCE_TYPES,
  preferenceInstructions, preferenceTerms, type PreferenceType,
} from '../data/preferenceVocab'
import { PBCheckbox, PBDataWindow, PBInput, PBLookup, PBRadio, PBSelect, PBTabs, pbSlug } from '../pb'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The "Quick Entry Detail" half of a Quick Entry template — one editor per
   Template Group — and the small code prompts its "…" buttons raise.

   The same editors paint twice:
     · editable, in Administration's Quick Entry Template - <group> windows
       (screens/QuickEntryWindows.tsx);
     · read-only, greyed under a "Read Only" watermark, in the lower half of
       the chart's Quick Entry - <group> windows, where the template's own
       settings are shown but cannot be changed (`9ce42050dd92…`,
       `8b8958b7ddc6…`, `3a1f89a73966…`, `9ac102714dc9…`).

   PROVENANCE: manual article 3071982.
     Chart Preference  `8533ea5acbce…` — a Type column of seven radios on the
                       left; Subject ▾ with Identified By: Concept / Code /
                       Free Text; Instruction ▾; Other: Mark as Sensitive,
                       Show on Demographics. (Once identified, the chart
                       capture adds the `Concept:` line under the radios.)
     Goal              `70b9b8b9c10b…` — Goal Type: ☑ Is a Quantitive Goal
                       [sic]; Subject ▾; Identified By: Code / Concept;
                       Concept: … ; Target Value: ▾ + value; Perform Every:
                       n + ▾ Units.
     Order             `b5c63c1cd136…` — Order Type ▾, Order For: …,
                       Attachment: … (the article: an Attach Files tab and an
                       Attach Form/Letter tab, OK when done).
     Reaction Risk     `0dfc31a3c0a9…` — the four navy questions: type of
                       reaction (Allergy / Intolerance), type of agent (Drug
                       (Specific) / Drug (Category) / Food / Environmental),
                       the agent (Code … / Term), reaction(s) 1–3 (Code … /
                       Term) and Severity ▾.
     MSP               `9d5aadd70276…`, `1032aefc4faf…` — Primary MSP Fee
                       Code … (fills Name and Description), then twelve
                       Secondary rows of Code … and No. Service (1).
   INFERRED: every prompt list behind a "…" (no capture opens one), and the
   Attach dialog's layout (described in text only).
   ========================================================================= */

const NAVY = '#000080'
const fieldId = (s: string) => `host.mois.field.qe-${pbSlug(s)}`

/** the light-blue caption band the Quick Entry windows are built from */
export function QeBand({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: '#c8dcfa', padding: '4px 8px', borderTop: '1px solid #a9bfe6', borderBottom: '1px solid #a9bfe6', flex: 'none', ...style }}>
      {children}
    </div>
  )
}

function Question({ children }: { children: ReactNode }) {
  return <div style={{ color: NAVY, fontWeight: 700, padding: '6px 0 4px' }}>{children}</div>
}

/* --- the "…" prompt ------------------------------------------------------- */
/** A two-column code prompt: pick a row and OK (or double-click). */
export function CodePrompt({ id, title, rows, onPick, onClose }: {
  id: string
  title: string
  rows: QuickEntryCodeTerm[]
  onPick: (row: QuickEntryCodeTerm) => void
  onClose: () => void
}) {
  const [find, setFind] = useState('')
  const [cur, setCur] = useState(0)
  const shown = rows.filter((r) => `${r.code} ${r.term}`.toLowerCase().includes(find.trim().toLowerCase()))
  const pick = (r?: QuickEntryCodeTerm) => { if (r) { onPick(r); onClose() } }
  return (
    <WorkspaceDialogFrame id={id} title={title} width={460} height={360} onClose={onClose} controls={false} zIndex={97}>
      <div className="pb-row" style={{ padding: '8px 10px 4px', flex: 'none' }}>
        <span>Find:</span>
        <PBInput w="100%" value={find} data-tutorial-id={`host.mois.field.${id}-find`} onChange={(e) => { setFind(e.target.value); setCur(0) }} />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 10px' }}>
        <PBDataWindow
          rows={shown}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => pick(r)}
          rowTutorialId={(r) => `host.mois.row.${id}-${pbSlug(r.term || r.code)}`}
          columns={[
            { key: 'code', header: 'Code', width: 100 },
            { key: 'term', header: 'Description' },
          ]}
          empty="No matching entries."
        />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '8px 0', flex: 'none' }}>
        <DialogButton id={`${id}-ok`} width={75} isDefault onClick={() => pick(shown[cur])}>OK</DialogButton>
        <DialogButton id={`${id}-cancel`} width={75} onClick={onClose}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

const asRows = (terms: string[]): QuickEntryCodeTerm[] => terms.map((t, i) => ({ code: String(i + 1).padStart(3, '0'), term: t }))

/* concepts / codes offered per subject — INFERRED */
const CONCEPTS: Record<string, string[]> = {
  CONSULTATION: ['CARDIOLOGY CONSULT', 'DIETITIAN REFERRAL', 'MENTAL HEALTH REFERRAL'],
  CONSULT: ['CARDIOLOGY CONSULT', 'DIETITIAN REFERRAL', 'MENTAL HEALTH REFERRAL'],
  IMAGE: ['MAMMOGRAM', 'BONE DENSITY', 'CHEST X-RAY'],
  INTERVENTION: ['INFLUENZA VACCINE', 'PNEUMOCOCCAL VACCINE', 'ALL VACCINES', 'CARDIOPULMONARY RESUSCITATION'],
  MEASURE: ['CIGARETTES SMOKED PACKS PER DAY', 'HBA1C', 'BLOOD PRESSURE', 'WEIGHT', 'LDL CHOLESTEROL'],
  MEDICATION: ['ALL VACCINES', 'INFLUENZA VACCINE', 'OPIOIDS'],
  PROCEDURE: ['COLONOSCOPY', 'PAP SMEAR', 'MAMMOGRAPHY'],
  OTHER: ['PHARMANET ACCESS', 'AUTOMATED CALL SERVICE', 'DISCLOSURE TO FAMILY', 'CARDIOPULMONARY RESUSCITATION'],
}
export const conceptsFor = (subject: string) => asRows(CONCEPTS[subject] ?? CONCEPTS.OTHER!)

/* --- Chart Preference ----------------------------------------------------- */
/* The Detail pane is four fixed-size panels whose borders MOIS draws whether
   or not they hold anything (`8533ea5a…` and the TRAINING captures of
   2026-09-29, 11:55:30 blank / 11:55:34 Consent picked, 150 % DPI — the
   sizes below are those ÷ 1.5):
     · the Type column, 157 wide × 252 tall — its right border stops under
       Precaution rather than running to the foot of the window;
     · on the right, under a top rule 5 px below the band, three stacked
       panels ruled off beneath: Subject / Identified By (85 tall, keeping
       room for the Concept / Code line that appears only once Identified By
       is picked), Instruction (37), and Other (no rule below).
   A new template has no Type ticked and the right-hand panels empty; picking
   a Type fills them with Identified By still unpicked. */
const PREF_TYPE_W = 157
const PREF_TYPE_H = 252
const PREF_RULE = '1px solid #c8c8c8'
const PREF_CONTROL_X = 97

export function PreferenceEditor({ value, onChange, readOnly }: {
  value: QuickEntryPreference
  onChange: (next: QuickEntryPreference) => void
  readOnly?: boolean
}) {
  const [prompt, setPrompt] = useState(false)
  const set = (patch: Partial<QuickEntryPreference>) => onChange({ ...value, ...patch })
  /* the concept / code's own instructions where it has them (CPR / DNR,
     Allow / Not Allow), else the type's — the New Preference dialog's rule */
  const instructions = [...new Set([...preferenceInstructions(value.type, value.concept), value.instruction].filter(Boolean))]
  const terms = value.identifiedBy ? preferenceTerms(value.subject, value.identifiedBy).map((x) => ({ code: x.code, term: x.description })) : []
  const setType = (type: PreferenceType) => set({
    type, instruction: PREFERENCE_INSTRUCTIONS[type].length === 1 ? PREFERENCE_INSTRUCTIONS[type][0]! : '',
  })
  const conceptLabel = value.identifiedBy === 'Concept' ? 'Concept:' : value.identifiedBy === 'Code' ? 'Code:' : 'Description:'
  const typed = !!value.type
  /* a label at the panel's left, its control lined up at PREF_CONTROL_X */
  const row = (top: number, label: ReactNode, control: ReactNode, bold = true) => (
    <div className="pb-row" style={{ position: 'absolute', top, left: 0, right: 0, height: 20, gap: 0 }}>
      <span style={{ width: PREF_CONTROL_X, flex: 'none', paddingLeft: bold ? 17 : 0, textAlign: bold ? 'left' : 'right', paddingRight: bold ? 0 : 6, fontWeight: bold ? 700 : 400 }}>{label}</span>
      {control}
    </div>
  )
  return (
    <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, alignItems: 'flex-start' }}>
      <div style={{ width: PREF_TYPE_W, height: PREF_TYPE_H, flex: 'none', borderRight: PREF_RULE, position: 'relative' }}>
        <strong style={{ position: 'absolute', top: 3, left: 9 }}>Type:</strong>
        {PREFERENCE_TYPES.map((t, i) => (
          <div key={t} style={{ position: 'absolute', top: 30 + i * 31.3, left: 9 }}>
            <PBRadio name={`qe-pref-type${readOnly ? '-ro' : ''}`} label={t} checked={value.type === t} disabled={readOnly}
              onChange={() => setType(t)} tutorialId={readOnly ? undefined : fieldId(`type-${t}`)} />
          </div>
        ))}
      </div>
      <div style={{ flex: '1 1 auto', minWidth: 0, marginTop: 5, borderTop: PREF_RULE }}>
        <div style={{ height: 85, borderBottom: PREF_RULE, position: 'relative' }}>
          {typed && row(11, 'Subject:', (
            <PBSelect w={169} options={['', ...PREFERENCE_SUBJECTS]} value={value.subject} disabled={readOnly}
              data-tutorial-id={readOnly ? undefined : fieldId('subject')}
              onChange={(e) => set({ subject: e.target.value, code: '', concept: '' })} />
          ))}
          {typed && row(36, 'Identified By:', (
            <div className="pb-row" style={{ gap: 0 }}>
              {PREFERENCE_IDENTIFIED_BY.map((b) => (
                <div key={b} style={{ width: 92 }}>
                  <PBRadio name={`qe-pref-by${readOnly ? '-ro' : ''}`} label={b} checked={value.identifiedBy === b} disabled={readOnly}
                    onChange={() => set({ identifiedBy: b, code: '', concept: '' })} tutorialId={readOnly ? undefined : fieldId(`identified-${b}`)} />
                </div>
              ))}
            </div>
          ), false)}
          {typed && value.identifiedBy && row(60, conceptLabel, value.identifiedBy === 'Free Text'
            ? <PBInput w={340} value={value.concept} readOnly={readOnly} data-tutorial-id={readOnly ? undefined : fieldId('concept')}
              onChange={(e) => set({ code: '', concept: e.target.value.toUpperCase() })} />
            : <PBLookup w={340} value={value.concept} readOnly={readOnly} disabled={readOnly} name={readOnly ? undefined : 'qe-concept'}
              fieldId={readOnly ? undefined : fieldId('concept')} onChange={(v) => set({ code: '', concept: v.toUpperCase() })}
              onDots={() => setPrompt(true)} />, false)}
        </div>
        <div style={{ height: 37, borderBottom: PREF_RULE, position: 'relative' }}>
          {typed && row(8, 'Instruction:', (
            <PBSelect w={365} options={['', ...instructions]} value={value.instruction} disabled={readOnly}
              data-tutorial-id={readOnly ? undefined : fieldId('instruction')}
              onChange={(e) => set({ instruction: e.target.value })} />
          ))}
        </div>
        {typed && (
          <div style={{ position: 'relative', height: 60 }}>
            {row(6, 'Other:', (
              <PBCheckbox label="Mark as Sensitive" checked={value.sensitive} disabled={readOnly}
                onChange={(v) => set({ sensitive: v })} tutorialId={readOnly ? undefined : fieldId('sensitive')} />
            ))}
            {row(26, '', (
              <PBCheckbox label="Show on Demographics" checked={value.showOnDemo} disabled={readOnly}
                onChange={(v) => set({ showOnDemo: v })} tutorialId={readOnly ? undefined : fieldId('show-on-demographics')} />
            ))}
          </div>
        )}
      </div>
      {prompt && (
        <CodePrompt id="qe-concept-prompt" title={value.identifiedBy === 'Code' ? 'Code Lookup' : 'Concept Lookup'}
          rows={terms.length ? terms : conceptsFor(value.subject)} onPick={(r) => set({ code: r.code, concept: r.term, instruction: '' })} onClose={() => setPrompt(false)} />
      )}
    </div>
  )
}

/* --- Goal ----------------------------------------------------------------- */
export function GoalEditor({ value, onChange, readOnly }: {
  value: QuickEntryGoal
  onChange: (next: QuickEntryGoal) => void
  readOnly?: boolean
}) {
  const [prompt, setPrompt] = useState(false)
  const set = (patch: Partial<QuickEntryGoal>) => onChange({ ...value, ...patch })
  const ro = readOnly
  return (
    <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '88px auto', rowGap: 5, alignItems: 'center', justifyContent: 'start' }}>
      <span>Goal Type:</span>
      <PBCheckbox label="Is a Quantitive Goal" checked={value.quantitative} disabled={ro}
        onChange={(v) => set({ quantitative: v })} tutorialId={ro ? undefined : fieldId('quantitative')} />
      <span>Subject:</span>
      <PBSelect w={136} options={['', ...GOAL_SUBJECTS]} value={value.subject} disabled={ro}
        data-tutorial-id={ro ? undefined : fieldId('goal-subject')} onChange={(e) => set({ subject: e.target.value, concept: '' })} />
      <span>Identified By:</span>
      <div className="pb-row" style={{ gap: 24 }}>
        {(['Code', 'Concept'] as const).map((b) => (
          <PBRadio key={b} name={`qe-goal-by${ro ? '-ro' : ''}`} label={b} checked={value.identifiedBy === b} disabled={ro}
            onChange={() => set({ identifiedBy: b, concept: '' })} tutorialId={ro ? undefined : fieldId(`goal-identified-${b}`)} />
        ))}
      </div>
      <span style={{ textAlign: 'right', paddingRight: 6 }}>{value.identifiedBy}:</span>
      <PBLookup w={288} value={value.concept} readOnly={ro} disabled={ro} name={ro ? undefined : 'qe-goal-concept'}
        fieldId={ro ? undefined : fieldId('goal-concept')} onChange={(v) => set({ concept: v.toUpperCase() })} onDots={() => setPrompt(true)} />
      <span>Target Value:</span>
      <div className="pb-row" style={{ gap: 4 }}>
        <PBSelect w={80} options={['', ...GOAL_OPERATORS]} value={value.operator} disabled={ro || !value.quantitative}
          data-tutorial-id={ro ? undefined : fieldId('target-operator')} onChange={(e) => set({ operator: e.target.value })} />
        <PBInput w={104} value={value.target} readOnly={ro} disabled={!value.quantitative}
          data-tutorial-id={ro ? undefined : fieldId('target-value')} onChange={(e) => set({ target: e.target.value })} />
      </div>
      <span>Perform Every:</span>
      <div className="pb-row" style={{ gap: 4 }}>
        <PBInput w={64} value={value.every} readOnly={ro} data-tutorial-id={ro ? undefined : fieldId('perform-every')}
          onChange={(e) => set({ every: e.target.value })} />
        <PBSelect w={104} options={['', ...GOAL_UNITS]} value={value.units} disabled={ro}
          data-tutorial-id={ro ? undefined : fieldId('perform-units')} onChange={(e) => set({ units: e.target.value })} />
        <span>Units</span>
      </div>
      {prompt && (
        <CodePrompt id="qe-goal-concept-prompt" title={value.identifiedBy === 'Code' ? 'Code Lookup' : 'Concept Lookup'}
          rows={conceptsFor(value.subject)} onPick={(r) => set({ concept: r.term })} onClose={() => setPrompt(false)} />
      )}
    </div>
  )
}

/* --- Order ---------------------------------------------------------------- */
/** Attachment "…": Attach Files / Attach Form/Letter, OK when done. INFERRED
    layout from art. 3071982's text. */
function AttachDialog({ onPick, onClose }: { onPick: (name: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState('Attach Form/Letter')
  const [cur, setCur] = useState(0)
  const [file, setFile] = useState('')
  const rows = QE_ORDER_ATTACHMENTS.map((name, i) => ({ name, kind: i < 3 ? 'PAPER FORM' : 'LETTER TEMPLATE' }))
  return (
    <WorkspaceDialogFrame id="qe-attach" title="Attachment" width={520} height={380} onClose={onClose} controls={false} zIndex={97}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 8 }}>
        <PBTabs tabs={['Attach Files', 'Attach Form/Letter']} active={tab} onChange={setTab} compact>
          {tab === 'Attach Files' ? (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="pb-row">
                <span style={{ width: 70 }}>File:</span>
                <PBInput w={300} value={file} data-tutorial-id="host.mois.field.qe-attach-file" onChange={(e) => setFile(e.target.value)} />
              </div>
              <div className="pb-row" style={{ gap: 8 }}>
                <DialogButton id="qe-attach-upload" width={150} onClick={() => setFile('C:\\Users\\Public\\Documents\\requisition.pdf')}>Upload from computer</DialogButton>
                <DialogButton id="qe-attach-cloud" width={110} onClick={() => setFile('Cloud Files\\requisition.pdf')}>Cloud Files</DialogButton>
              </div>
            </div>
          ) : (
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow flush rows={rows} current={cur} onCurrentChange={setCur}
                onActivate={(r) => { onPick(r.name); onClose() }}
                rowTutorialId={(r) => `host.mois.row.qe-attach-${pbSlug(r.name)}`}
                columns={[{ key: 'name', header: 'Name', width: 300 }, { key: 'kind', header: 'Type' }]} />
            </div>
          )}
        </PBTabs>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '6px 0 10px', flex: 'none' }}>
        <DialogButton id="qe-attach-ok" width={75} isDefault onClick={() => {
          const name = tab === 'Attach Files' ? file.split('\\').pop() ?? '' : rows[cur]?.name ?? ''
          if (name) onPick(name)
          onClose()
        }}>OK</DialogButton>
        <DialogButton id="qe-attach-cancel" width={75} onClick={onClose}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

export function OrderEditor({ value, onChange, readOnly }: {
  value: QuickEntryOrder
  onChange: (next: QuickEntryOrder) => void
  readOnly?: boolean
}) {
  const [prompt, setPrompt] = useState<null | 'for' | 'attach'>(null)
  const set = (patch: Partial<QuickEntryOrder>) => onChange({ ...value, ...patch })
  const ro = readOnly
  return (
    <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '78px auto', rowGap: 4, alignItems: 'center', justifyContent: 'start' }}>
      <span>Order Type:</span>
      <PBSelect w={160} disabled={ro} value={value.type} data-tutorial-id={ro ? undefined : fieldId('order-type')}
        options={[{ value: '', label: '' }, ...QE_ORDER_TYPES.map((t) => ({ value: t.type, label: `${t.type} - ${t.description}` }))]}
        onChange={(e) => set({ type: e.target.value, orderFor: '' })} />
      <span>Order For:</span>
      <PBLookup w={404} value={value.orderFor} readOnly={ro} disabled={ro} name={ro ? undefined : 'qe-order-for'}
        fieldId={ro ? undefined : fieldId('order-for')} onChange={(v) => set({ orderFor: v.toUpperCase() })} onDots={() => setPrompt('for')} />
      <span>Attachment:</span>
      <PBLookup w={404} value={value.attachment} readOnly={ro} disabled={ro} name={ro ? undefined : 'qe-attachment'}
        fieldId={ro ? undefined : fieldId('attachment')} onChange={(v) => set({ attachment: v })} onDots={() => setPrompt('attach')} />
      {prompt === 'for' && (
        <CodePrompt id="qe-order-for-prompt" title="Order For" rows={asRows(QE_ORDER_FOR[value.type] ?? Object.values(QE_ORDER_FOR).flat())}
          onPick={(r) => set({ orderFor: r.term })} onClose={() => setPrompt(null)} />
      )}
      {prompt === 'attach' && <AttachDialog onPick={(name) => set({ attachment: name })} onClose={() => setPrompt(null)} />}
    </div>
  )
}

/* --- Reaction Risk -------------------------------------------------------- */
export function ReactionEditor({ value, onChange, readOnly }: {
  value: QuickEntryReaction
  onChange: (next: QuickEntryReaction) => void
  readOnly?: boolean
}) {
  const [prompt, setPrompt] = useState<null | number>(null) // -1 = agent, 0..2 = reaction n
  const set = (patch: Partial<QuickEntryReaction>) => onChange({ ...value, ...patch })
  const setReaction = (i: number, r: QuickEntryCodeTerm) => set({ reactions: value.reactions.map((x, j) => (j === i ? r : x)) })
  const ro = readOnly
  const codeTerm = (key: string, v: QuickEntryCodeTerm, onSet: (r: QuickEntryCodeTerm) => void, onDots: () => void) => (
    <div style={{ display: 'grid', gridTemplateColumns: '50px auto', rowGap: 3, alignItems: 'center', paddingLeft: 16 }}>
      <span style={{ color: '#6d6d6d' }}>Code:</span>
      <PBLookup w={126} value={v.code} readOnly={ro} disabled={ro} name={ro ? undefined : `qe-${key}`}
        fieldId={ro ? undefined : fieldId(`${key}-code`)} onChange={(c) => onSet({ ...v, code: c })} onDots={onDots} />
      <span style={{ color: '#6d6d6d' }}>Term:</span>
      <PBInput w={364} value={v.term} readOnly={ro} data-tutorial-id={ro ? undefined : fieldId(`${key}-term`)}
        onChange={(e) => onSet({ ...v, term: e.target.value.toUpperCase() })} />
    </div>
  )
  return (
    <div style={{ padding: '0 8px 8px' }}>
      <Question>What type of reaction?</Question>
      <div className="pb-row" style={{ gap: 30, paddingLeft: 40 }}>
        {(['Allergy', 'Intolerance'] as const).map((t) => (
          <PBRadio key={t} name={`qe-rx-type${ro ? '-ro' : ''}`} label={t} checked={value.reactionType === t} disabled={ro}
            onChange={() => set({ reactionType: t })} tutorialId={ro ? undefined : fieldId(`reaction-${t}`)} />
        ))}
      </div>
      <Question>What is the type of agent?</Question>
      <div className="pb-row" style={{ gap: 22, paddingLeft: 36 }}>
        {QE_AGENT_TYPES.map((t) => (
          <PBRadio key={t} name={`qe-rx-agent${ro ? '-ro' : ''}`} label={t} checked={value.agentType === t} disabled={ro}
            onChange={() => set({ agentType: t, agent: { code: '', term: '' } })} tutorialId={ro ? undefined : fieldId(`agent-${t}`)} />
        ))}
      </div>
      <Question>What is the agent?</Question>
      {codeTerm('agent', value.agent, (r) => set({ agent: r }), () => setPrompt(-1))}
      <Question>What are the reaction(s)?</Question>
      {value.reactions.map((r, i) => (
        <div key={i} style={{ paddingLeft: 12 }}>
          <div style={{ padding: '4px 0 2px' }}>Reaction {i + 1}:</div>
          {codeTerm(`reaction-${i + 1}`, r, (next) => setReaction(i, next), () => setPrompt(i))}
        </div>
      ))}
      <Question>What is the severity of the reaction(s)?</Question>
      <div className="pb-row" style={{ paddingLeft: 16 }}>
        <span>Severity:</span>
        <PBSelect w={214} options={['', 'MILD', 'MODERATE', 'SEVERE', 'SEVERE TO LIFE THREATENING']} value={value.severity} disabled={ro}
          data-tutorial-id={ro ? undefined : fieldId('severity')} onChange={(e) => set({ severity: e.target.value })} />
      </div>
      {prompt !== null && (
        <CodePrompt
          id={prompt < 0 ? 'qe-agent-prompt' : 'qe-reaction-prompt'}
          title={prompt < 0 ? 'Agent Lookup' : 'Reaction Lookup'}
          rows={prompt < 0 ? QE_AGENTS[value.agentType] ?? [] : QE_REACTIONS}
          onPick={(r) => (prompt < 0 ? set({ agent: r }) : setReaction(prompt, r))}
          onClose={() => setPrompt(null)}
        />
      )}
    </div>
  )
}

/* --- MSP Secondary Claims ------------------------------------------------- */
export const MSP_SECONDARY_ROWS = 12

export function MspEditor({ value, onChange, onPrimary, readOnly }: {
  value: QuickEntryMsp
  onChange: (next: QuickEntryMsp) => void
  /** picking the primary fee code fills the template's Name and Description */
  onPrimary?: (fee: QuickEntryCodeTerm) => void
  readOnly?: boolean
}) {
  const [prompt, setPrompt] = useState<null | number>(null) // -1 = primary
  const rows = Array.from({ length: MSP_SECONDARY_ROWS }, (_, i) => value.secondary[i] ?? { code: '', term: '', services: '1' })
  const setRow = (i: number, patch: Partial<QuickEntryMsp['secondary'][number]>) =>
    onChange({ ...value, secondary: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
  const ro = readOnly
  return (
    <div style={{ padding: '10px 10px' }}>
      <div>Primary MSP Fee Code</div>
      <div className="pb-row" style={{ padding: '4px 0 14px' }}>
        <PBLookup w={110} value={value.primary.code} readOnly={ro} disabled={ro} name={ro ? undefined : 'qe-msp-primary'}
          fieldId={ro ? undefined : fieldId('msp-primary')} onChange={(c) => onChange({ ...value, primary: { ...value.primary, code: c } })}
          onDots={() => setPrompt(-1)} />
        <span style={{ color: '#6d6d6d' }}>{value.primary.term}</span>
      </div>
      <div>Secondary MSP Fee Code and Number of Service(s)</div>
      <div className="pb-row" style={{ color: '#6d6d6d', padding: '4px 0 2px', gap: 0 }}>
        <span style={{ width: 118 }}>Code</span><span>No. Service</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="pb-row" style={{ padding: '1px 0', gap: 6 }}>
          <PBLookup w={110} value={r.code} readOnly={ro} disabled={ro} name={ro ? undefined : `qe-msp-secondary-${i + 1}`}
            fieldId={ro ? undefined : fieldId(`msp-secondary-${i + 1}`)} onChange={(c) => setRow(i, { code: c })} onDots={() => setPrompt(i)} />
          <PBInput w={48} align="center" value={r.services} readOnly={ro}
            data-tutorial-id={ro ? undefined : fieldId(`msp-services-${i + 1}`)} onChange={(e) => setRow(i, { services: e.target.value })} />
          <span style={{ color: '#6d6d6d' }}>{r.term}</span>
        </div>
      ))}
      {prompt !== null && (
        <CodePrompt id="qe-msp-prompt" title="MSP Fee Code Lookup" rows={QE_MSP_FEES}
          onPick={(fee) => {
            if (prompt < 0) { onChange({ ...value, primary: fee }); onPrimary?.(fee) } else setRow(prompt, { code: fee.code, term: fee.term })
          }}
          onClose={() => setPrompt(null)} />
      )}
    </div>
  )
}

/* --- blanks -------------------------------------------------------------- */
/** a new template: no Type, no Identified By (TRAINING capture 11:55:30) */
export const BLANK_PREFERENCE: QuickEntryPreference = {
  type: '', subject: '', identifiedBy: '', concept: '', instruction: '', sensitive: false, showOnDemo: false,
}
export const BLANK_GOAL: QuickEntryGoal = {
  quantitative: true, subject: '', identifiedBy: 'Concept', concept: '', operator: '', target: '', every: '', units: '',
}
export const BLANK_ORDER: QuickEntryOrder = { type: '', orderFor: '', attachment: '' }
export const BLANK_REACTION: QuickEntryReaction = {
  reactionType: 'Allergy', agentType: 'Drug (Specific)', agent: { code: '', term: '' },
  reactions: [{ code: '', term: '' }, { code: '', term: '' }, { code: '', term: '' }], severity: '',
}
export const BLANK_MSP: QuickEntryMsp = { primary: { code: '', term: '' }, secondary: [] }
