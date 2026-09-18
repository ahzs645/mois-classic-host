import { Fragment, useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput, PBLookup,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn, type PBCommand,
} from '../pb'
import { usePatient } from '../data/patient-context'
import type { ReportField, ReportScreen } from '../data/reportScreens'


/* One component for Imaging Reports, Consult Reports, Procedure and Paper
   Forms — they are the same PowerBuilder window with a different binding. */

function Field({ f }: { f: ReportField }) {
  if (f.kind === 'gap') return <><span /><span /></>
  const label = (
    <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px', whiteSpace: 'pre-line' }}>
      {f.label}
    </span>
  )
  switch (f.kind) {
    case 'lookup':
      return <>{label}<PBLookup w={f.w ?? '100%'} defaultValue={f.value} /></>
    case 'area':
      return <>{label}<PBTextArea rows={f.rows ?? 4} w={f.w ?? '100%'} defaultValue={f.value} /></>
    case 'check':
      return <>{label}<PBCheckbox label={f.value} checked /></>
    case 'range':
      return (
        <>{label}
          <div className="pb-row">
            <PBInput w={92} style={{ background: 'var(--pb-dw-flag)' }} />
            <span>to</span>
            <PBInput w={92} style={{ background: 'var(--pb-dw-flag)' }} />
            <span style={{ marginLeft: 10 }}>Status:</span>
            <PBInput w={44} align="center" defaultValue="F" />
          </div>
        </>
      )
    case 'date':
      return (
        <>{label}
          <div className="pb-row">
            <PBInput w={f.w ?? 92} align="center" defaultValue={f.value} />
            {f.time && <PBInput w={38} align="center" defaultValue=":" />}
          </div>
        </>
      )
    default:
      return <>{label}<PBInput w={f.w ?? '100%'} defaultValue={f.value} /></>
  }
}

export function ClinicalReportView({ screen }: { screen: ReportScreen }) {
  const patient = usePatient()
  const [tab, setTab] = useState(screen.tabs?.[0] ?? '')
  const [cur, setCur] = useState(0)

  const commands: PBCommand[] = screen.commands.map((c) =>
    c === null ? null : { label: c, disabled: screen.disabled?.includes(c) },
  )
  const columns: PBColumn<Record<string, string>>[] = screen.columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
    render: c.check ? () => <PBCheckbox /> : undefined,
  }))

  const detail = (
    <div style={{ display: 'flex', gap: 10, padding: '6px 8px', alignItems: 'flex-start', minWidth: 0 }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        {screen.left.map((f, i) => <Fragment key={i}><Field f={f} /></Fragment>)}
      </div>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: 'auto 1fr', flex: 'none', alignItems: 'start' }}>
        {screen.right.map((f, i) => <Fragment key={i}><Field f={f} /></Fragment>)}
      </div>
    </div>
  )

  return (
    <>
      <PBViewHeader title={screen.title} />
      <PBCommandRow commands={commands} />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:' },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '2025.01.01' },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
        {screen.viewSelect && <PBSelect options={screen.viewSelect} w={104} />}
      </div>

      {screen.filters && (
        <div className="pb-row pb-row--gap-lg" style={{ padding: '0 8px 3px' }}>
          <span>Show:</span>
          {screen.filters.map((f) => <PBCheckbox key={f.label} label={f.label} checked={f.checked} />)}
          <span className="pb-row__spacer" />
          <span>Category:</span><PBSelect options={['', 'PSYCH', 'LAB', 'VITALS']} w={130} />
        </div>
      )}

      {screen.banner && <div style={{ padding: '2px 8px 3px', flex: 'none' }}>{screen.banner}</div>}

      <div style={{ padding: '0 3px', height: 214, display: 'flex' }}>
        <PBDataWindow
          columns={columns}
          rows={screen.rows}
          current={cur}
          onCurrentChange={setCur}
          rowStatus={(r) => (screen.flagKey && r[screen.flagKey] === 'H' ? 'flag' : 'normal')}
          empty={`No ${screen.title.toLowerCase()} on file.`}
        />
      </div>

      {/* detail body, with the acknowledgement rail alongside where present */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 4, padding: '4px 3px 0' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex' }}>
          {screen.tabs ? (
            <PBTabs tabs={screen.tabs} active={tab} onChange={setTab} compact>
              {tab === 'Office Notes (0)' ? (
                <>
                  <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                    Office Notes
                  </PBBand>
                  <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                    <PBDataWindow
                      flush gutter={false} rows={[]}
                      columns={[
                        { key: 'date', header: 'Date', width: 96, align: 'center' },
                        { key: 'author', header: 'Author', width: 150, align: 'center' },
                        { key: 'note', header: 'Note' },
                      ]}
                      empty="No office notes."
                    />
                  </div>
                </>
              ) : tab === 'Reactions' ? (
                <>
                  <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                    Reactions
                  </PBBand>
                  <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                    <PBDataWindow
                      flush gutter={false}
                      rows={[{ reaction: 'MALAISE AND FATIGUE', rank: '1', severity: '', comment: '' }]}
                      columns={[
                        { key: 'reaction', header: 'Reaction', width: 240 },
                        { key: 'rank', header: 'Rank', width: 56, align: 'center' },
                        { key: 'severity', header: 'Severity', width: 100, align: 'center' },
                        { key: 'comment', header: 'Comment' },
                      ]}
                    />
                  </div>
                </>
              ) : tab === 'Linked Events' ? (
                <>
                  <PBBand>Linked Events - Read Only</PBBand>
                  <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                    <PBDataWindow
                      flush gutter={false} rows={[]}
                      columns={[
                        { key: 'date', header: 'Date', width: 96, align: 'center' },
                        { key: 'agent', header: 'Agent', width: 240 },
                        { key: 'event', header: 'Event' },
                        { key: 'outcome', header: 'Outcome', width: 130, align: 'center' },
                      ]}
                      empty="No linked events."
                    />
                  </div>
                </>
              ) : tab === 'Panel (0)' ? (
                <div className="pb-dw__empty" style={{ padding: 24 }}>This result is not part of a panel.</div>
              ) : detail}
            </PBTabs>
          ) : (
            <div style={{ flex: '1 1 auto', minWidth: 0, background: 'var(--pb-window)', border: '1px solid var(--pb-border)', overflow: 'auto' }}>
              {detail}
            </div>
          )}
        </div>

        {screen.rail && !screen.plain && (
          <div style={{ width: 156, flex: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <PBBand>Acknowledgement History</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0 }} />
            </div>
            <div className="pb-groupbox" style={{ flex: 'none' }}>
              <PBBand>Workflow Summary</PBBand>
              <div style={{ padding: '4px 6px' }}>
                {[['Messages:', '0'], ['Tasks:', '0'], ['Acknowledgements:', '0']].map(([k, v]) => (
                  <div className="pb-row" key={k} style={{ gap: 0 }}>
                    <span>{k}</span><span className="pb-row__spacer" /><span>{v}</span>
                  </div>
                ))}
                <div style={{ textAlign: 'center', marginTop: 2 }}>
                  <button className="pb-link">View Detail…</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* the signature / provenance footer */}
      {screen.footer && !screen.plain && (
        <div className="pb-row" style={{ padding: '2px 8px 0', gap: 0 }}>
          <span style={{ width: 70 }}>Source:</span>
          <span style={{ width: 92 }}>{screen.footer.source}</span>
          <span>Sent Date:&nbsp;</span><span style={{ width: 100 }}>{screen.footer.sent ?? ''}</span>
          <span>Code:&nbsp;&nbsp;{screen.footer.code}</span>
          <span className="pb-row__spacer" />
          <button className="pb-link">{screen.footer.sign}</button>
        </div>
      )}
      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 0 }}>
        <span>Created:&nbsp;&nbsp;&nbsp;{screen.created}</span>
        <span style={{ width: 28 }} />
        <span>Last Modified:</span>
        <span className="pb-row__spacer" />
        <button className="pb-link">ENC# EMPTY</button>
      </div>
    </>
  )
}
