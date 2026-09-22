import { useState } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { stamp } from '../data/charts/detail'
import { goalTargets } from '../data/charts/relations'
import { goalLinkedTabs, goalRows } from '../data/mois'
import { usePatient } from '../data/patient-context'
import {
  PBCheckbox,
  PBCommandRow, PBDataWindow,
  PBIdentityStrip,
  PBInput, PBLookup, PBRadio,
  PBSection, PBSelect,
  PBSlider,
  PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'

type Goal = typeof goalRows[number]

const TABS = ['Detail', 'Quantitative Settings', 'Evaluation', 'Linked Health Issue(s)', 'Linked Action(s)']

export function GoalsView({ onNew }: { onNew?: () => void }) {
  const patient = usePatient()
  const data = useChartExport()
  const records = useNodeRecords('goals')
  const goalRows = records.map(r => ({ start: r.dtm_start?.replace(/\//g, '.') ?? '', end: r.dtm_end?.replace(/\//g, '.') ?? '', goal: r.str_goal ?? '', phase: r.str_phase ?? '', quant: r.str_quantitative === 'Y', commit: r.num_commitment ?? '', importance: r.num_importance ?? '', s: r.str_sensitive === 'Y', clip: r.num_attachments ?? '' }))
  const [tab, setTab] = useState('Quantitative Settings')
  const [cur, setCur] = useState(0)
  const record = records[cur]
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
        <div key={cur} className="pb-tabs__page">
          {activeTab === 'Quantitative Settings' && <QuantitativePage goal={goalRows[cur]?.goal ?? ''} record={record} />}
          {activeTab === 'Detail' && <DetailPage goal={goalRows[cur]?.goal ?? ''} record={record} />}
          {activeTab === 'Evaluation' && (
            <div className="pb-dw__empty" style={{ padding: 24 }}>No evaluations recorded.</div>
          )}
          {(activeTab === 'Linked Health Issue(s)' || activeTab === 'Linked Action(s)') && <LinkedPage title={activeTab} rows={goalTargets(data, record, activeTab === 'Linked Action(s)')} />}
        </div>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created: {stamp(record)}</span>
        <span className="pb-row__spacer" />
        {record?.id_encounter && <button className="pb-link">ENC# {record.id_encounter}</button>}
      </div>
    </>
  )
}

/* The quantitative page is a stack of rule-separated sections, not a single
   grid — each band holds one logical setting. */
function QuantitativePage({ goal, record }: { goal: string; record?: MoisRecord }) {
  const [by, setBy] = useState<'Code' | 'Concept'>(record?.str_code ? 'Code' : 'Concept')
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
          <PBSelect options={['', 'MEASURE', 'OBSERVATION', 'LAB RESULT']} defaultValue={record?.str_type ?? ''} w={136} />

          <span className="pb-form__label">Identified By:</span>
          <div className="pb-row pb-row--gap-lg">
            <PBRadio name="idby" label="Code" checked={by === 'Code'} onChange={() => setBy('Code')} />
            <PBRadio name="idby" label="Concept" checked={by === 'Concept'} onChange={() => setBy('Concept')} />
          </div>

          <span className="pb-form__label">Concept:</span>
          <PBLookup w="100%" defaultValue={record?.str_concept ?? record?.str_code ?? ''} />
        </div>
      </PBSection>

      <PBSection>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '100px 1fr' }}>
          <span className="pb-form__label">Target Value:</span>
          <div className="pb-row">
            <PBSelect options={['', '=', '<', '<=', '>', '>=', 'between']} defaultValue={record?.str_operator ?? ''} w={84} />
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

function DetailPage({ goal, record }: { goal: string; record?: MoisRecord }) {
  const [levels, setLevels] = useState({ commitment: record?.num_commitment ?? '', confidence: record?.num_confidence ?? '', importance: record?.num_importance ?? '' })
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
        <PBTextArea rows={5} w="100%" defaultValue={record?.str_reason ?? ''} />
        <span className="pb-form__label" style={{ lineHeight: '14px' }}>Expected<br />Outcome:</span>
        <PBTextArea rows={5} w="100%" defaultValue={record?.str_outcome_expected ?? ''} />
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
              {levels[key] !== '' ? <PBSlider
                value={Number(levels[key])}
                onChange={(v) => setLevels({ ...levels, [key]: String(v) })}
                style={{ flex: '1 1 auto' }}
              /> : <span className="pb-row__spacer" />}
              <PBInput w={40} align="center" value={String(levels[key])} readOnly />
              <span>(/10)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LinkedPage({ title, rows }: { title: keyof typeof goalLinkedTabs; rows: Record<string, string>[] }) {
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
          rows={rows}
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
