import { useState } from 'react'
import {
  PBIdentityStrip, PBCheckbox, PBSlider, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBRadio,
  PBSection, PBSelect, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { goalLinkedTabs, goalRows, patient } from '../data/mois'

type Goal = typeof goalRows[number]

const TABS = ['Detail', 'Quantitative Settings', 'Evaluation', 'Linked Health Issue(s)', 'Linked Action(s)']

export function GoalsView({ onNew }: { onNew?: () => void }) {
  const [tab, setTab] = useState('Quantitative Settings')
  const [cur, setCur] = useState(0)
  const quant = !!goalRows[cur]?.quant
  const activeTab = tab === 'Quantitative Settings' && !quant ? 'Detail' : tab

  const columns: PBColumn<Goal>[] = [
    { key: 'start', header: 'Start', width: 76, align: 'center' },
    { key: 'end', header: 'End', width: 76, align: 'center' },
    { key: 'goal', header: 'Goal' },
    { key: 'phase', header: 'Phase', width: 118, align: 'center' },
    {
      key: 'quant', header: <>Quantitative<br />Goal</>, width: 74, align: 'center',
      render: (r) => <PBCheckbox checked={r.quant} />,
    },
    { key: 'commit', header: <>Commit<br />Level</>, width: 54, align: 'center' },
    { key: 'importance', header: <>Import<br />Level</>, width: 54, align: 'center' },
    { key: 's', header: 'S', width: 24, align: 'center', render: () => <PBCheckbox /> },
    { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
  ]

  return (
    <>
      <PBViewHeader title="Goals" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: onNew }, { label: 'Quick Entry' },
          { label: 'Delete Record' }, { label: 'Save' }, { label: 'Undo' }, { label: 'Refresh' },
        ]}
      />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      <div style={{ height: 212, display: 'flex', padding: '0 3px' }}>
        <PBDataWindow columns={columns} rows={goalRows} current={cur} onCurrentChange={setCur} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 3px 3px' }}>
        <div className="pb-tabs__strip pb-tabs__strip--justified">
          {TABS.map((t) => {
            /* MOIS greys this tab out unless the row is a quantitative goal */
            const off = t === 'Quantitative Settings' && !goalRows[cur]?.quant
            return (
              <button
                key={t}
                className={`pb-tabs__tab${t === activeTab ? ' is-active' : ''}`}
                disabled={off}
                onClick={() => !off && setTab(t)}
              >
                {t}
              </button>
            )
          })}
        </div>
        <div className="pb-tabs__page">
          {activeTab === 'Quantitative Settings' && <QuantitativePage goal={goalRows[cur]?.goal ?? ''} />}
          {activeTab === 'Detail' && <DetailPage goal={goalRows[cur]?.goal ?? ''} />}
          {activeTab === 'Evaluation' && (
            <div className="pb-dw__empty" style={{ padding: 24 }}>No evaluations recorded.</div>
          )}
          {(activeTab === 'Linked Health Issue(s)' || activeTab === 'Linked Action(s)') && <LinkedPage title={activeTab} />}
        </div>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created:&nbsp;&nbsp;&nbsp;2026.08.12&nbsp; 10:45&nbsp;&nbsp; JALIL, AHMAD</span>
        <span className="pb-row__spacer" />
        <button className="pb-link">ENC# EMPTY</button>
      </div>
    </>
  )
}

/* The quantitative page is a stack of rule-separated sections, not a single
   grid — each band holds one logical setting. */
function QuantitativePage({ goal }: { goal: string }) {
  const [by, setBy] = useState<'Code' | 'Concept'>('Concept')
  return (
    <div>
      <PBSection>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '100px 1fr' }}>
          <span className="pb-form__label">Goal:</span>
          <PBInput w="100%" key={goal} defaultValue={goal} />
        </div>
      </PBSection>

      <PBSection>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '100px 1fr' }}>
          <span className="pb-form__label">Subject:</span>
          <PBSelect options={['MEASURE', 'OBSERVATION', 'LAB RESULT']} w={136} />

          <span className="pb-form__label">Identified By:</span>
          <div className="pb-row pb-row--gap-lg">
            <PBRadio name="idby" label="Code" checked={by === 'Code'} onChange={() => setBy('Code')} />
            <PBRadio name="idby" label="Concept" checked={by === 'Concept'} onChange={() => setBy('Concept')} />
          </div>

          <span className="pb-form__label">Concept:</span>
          <PBLookup w="100%" defaultValue="BMI" />
        </div>
      </PBSection>

      <PBSection>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '100px 1fr' }}>
          <span className="pb-form__label">Target Value:</span>
          <div className="pb-row">
            <PBSelect options={['=', '<', '<=', '>', '>=', 'between']} w={84} />
            <PBInput w={148} />
          </div>
        </div>
      </PBSection>

      <PBSection>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '100px 1fr' }}>
          <span className="pb-form__label">Perform Every:</span>
          <div className="pb-row">
            <PBInput w={68} align="center" />
            <PBSelect options={['', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS']} w={116} />
            <span>Units</span>
          </div>
        </div>
      </PBSection>
    </div>
  )
}

function DetailPage({ goal }: { goal: string }) {
  const [levels, setLevels] = useState({ commitment: 1, confidence: 1, importance: 1 })
  const BARS = [
    ['Patient Commitment Level', 'Not Committed', 'Very Committed', 'commitment'],
    ['Patient Confidence Level', 'Not Confident', 'Very Confident', 'confidence'],
    ['Provider Importance Level', 'Not Important', 'Very Important', 'importance'],
  ] as const

  return (
    <div style={{ display: 'flex', gap: 14, padding: '8px 10px', alignItems: 'flex-start' }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '70px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Goal:</span>
        <PBInput w="100%" key={goal} defaultValue={goal} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Detail:</span>
        <PBTextArea rows={5} w="100%" defaultValue="DEV" />
        <span className="pb-form__label" style={{ lineHeight: '14px' }}>Expected<br />Outcome:</span>
        <PBTextArea rows={5} w="100%" defaultValue="DEV" />
      </div>

      <div style={{ width: 340, flex: 'none' }}>
        {BARS.map(([title, low, high, key]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 1 }}>{title}:</div>
            <div className="pb-row" style={{ gap: 0 }}>
              <span style={{ color: 'var(--pb-text-dim)' }}>{low}</span>
              <span className="pb-row__spacer" />
              <span style={{ color: 'var(--pb-text-dim)' }}>{high}</span>
              <span style={{ width: 12 }} />
              <span>Value</span>
            </div>
            <div className="pb-row">
              <PBSlider
                value={levels[key]}
                onChange={(v) => setLevels({ ...levels, [key]: v })}
                style={{ flex: '1 1 auto' }}
              />
              <PBInput w={40} align="center" value={String(levels[key])} readOnly />
              <span>(/10)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LinkedPage({ title }: { title: keyof typeof goalLinkedTabs }) {
  const cfg = goalLinkedTabs[title]
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        {cfg.commands.map((c) => (
          <button key={c} className="pb-cmdrow__btn" style={{ minWidth: 110 }}>{c}</button>
        ))}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={cfg.rows as unknown as Record<string, string>[]}
          groupBy={(r) => r.group}
          rowStatus={() => 'highlight'}
          columns={[
            { key: 'start', header: 'Start', width: 84, align: 'center' },
            { key: 'end', header: 'End', width: 76, align: 'center' },
            {
              key: 'desc', header: 'Description', width: 260,
              render: (r) => (r.desc ? <button className="pb-link">{r.desc}</button> : ''),
            },
            ...cfg.flags.map((f) => ({
              key: f.key,
              header: f.header,
              width: f.width,
              align: 'center' as const,
              render: () => <PBCheckbox />,
            })),
            { key: 'by', header: 'Linked By', width: 130 },
            { key: 'when', header: 'Linked Date', width: 140 },
          ]}
          empty="Nothing linked."
        />
      </div>
    </>
  )
}
