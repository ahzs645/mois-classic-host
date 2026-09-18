import { useState } from 'react'
import {
  PBIdentityStrip, PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBSlider,
  PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { usePatient } from '../data/patient-context'
import { carePlanScreens, linkedGoalRows, type CarePlanKey } from '../data/mois'

/* Needs for Care, Goals, Planned Actions, Barriers to Care, Risks for
   Conditions and Conditions are all the same PowerBuilder window with a
   different DataWindow bound to it: identity strip, search, a list, then a
   Detail tab beside one or more read-only "Linked X" tabs. */

type Row = Record<string, any>

export function CarePlanView({ screen, onNew }: { screen: CarePlanKey; onNew?: () => void }) {
  const patient = usePatient()
  const cfg = carePlanScreens[screen]
  const [tab, setTab] = useState<string>(cfg.tabs[0])
  const [risk, setRisk] = useState(1)

  /* each screen carries its own DataWindow, not a shared one */
  const columns: PBColumn<Row>[] = cfg.columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
    render: c.check ? () => <PBCheckbox /> : undefined,
  }))

  return (
    <>
      <PBViewHeader title={cfg.title} />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: onNew }, { label: 'Delete Record' }, { label: 'Save' },
          { label: 'Undo' }, { label: 'Refresh' }, { label: 'Attachment' },
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
        <PBDataWindow columns={columns} rows={cfg.rows} />
      </div>

      {/* tab strip is rendered by hand: MOIS puts these tabs hard against the
          left edge with no strip rule under the inactive ones */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 3px 3px' }}>
        <div className="pb-tabs__strip pb-tabs__strip--compact" style={{ paddingLeft: 4 }}>
          {cfg.tabs.map((t) => (
            <button
              key={t}
              className={`pb-tabs__tab${t === tab ? ' is-active' : ''}`}
              style={{ minWidth: 86 }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pb-tabs__page">
          {tab === 'Detail' ? (
            <DetailPage cfg={cfg} risk={risk} setRisk={setRisk} />
          ) : (
            <LinkedPage band={cfg.linkedBand} />
          )}
        </div>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created:&nbsp;&nbsp;&nbsp;2026.08.12&nbsp; 12:04&nbsp;&nbsp; JALIL, AHMAD</span>
        <span className="pb-row__spacer" />
        <button className="pb-link">ENC# EMPTY</button>
      </div>
    </>
  )
}

function DetailPage({
  cfg, risk, setRisk,
}: { cfg: (typeof carePlanScreens)[CarePlanKey]; risk: number; setRisk: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', padding: '8px 10px', gap: 14, alignItems: 'flex-start' }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>{cfg.descLabel}</span>
        <PBInput w="100%" />

        {cfg.hasRisk && (
          <>
            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Risk Rating:</span>
            <div>
              <div className="pb-row" style={{ gap: 0 }}>
                <span>{cfg.riskLow}</span>
                <span className="pb-row__spacer" />
                <span>{cfg.riskHigh}</span>
                <span style={{ width: 14 }} />
                <span>Value</span>
              </div>
              <div className="pb-row">
                <PBSlider value={risk} onChange={setRisk} style={{ flex: '1 1 auto' }} />
                <PBInput w={40} align="center" value={String(risk)} readOnly />
                <span>(/10)</span>
              </div>
            </div>
          </>
        )}

        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
        <PBTextArea rows={9} w="100%" />
      </div>

      <div style={{ width: 210, flex: 'none' }}>
        <div style={{ marginBottom: 2 }}>Participants:</div>
        <PBTextArea rows={3} w="100%" />
      </div>
    </div>
  )
}

function LinkedPage({ band }: { band: string }) {
  return (
    <>
      <PBBand>{band}</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={linkedGoalRows}
          groupBy={(r) => r.group}
          rowStatus={() => 'highlight'}
          columns={[
            { key: 'start', header: 'Start', width: 76, align: 'center' },
            { key: 'end', header: 'End', width: 70, align: 'center' },
            {
              key: 'desc', header: 'Description', width: 240,
              render: (r) => <button className="pb-link">{r.desc}</button>,
            },
            { key: 'phase', header: 'Phase', width: 86, align: 'center' },
            { key: 's', header: 'S', width: 24, align: 'center', render: () => <PBCheckbox /> },
            { key: 'by', header: 'Linked By', width: 130 },
            { key: 'when', header: 'Linked Date', width: 130 },
          ]}
          empty="Nothing linked."
        />
      </div>
    </>
  )
}
