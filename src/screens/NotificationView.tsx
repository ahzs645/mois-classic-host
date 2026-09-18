import { useState } from 'react'
import {
  PBIdentityStrip, PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBTabs, PBTextArea,
  PBViewHeader, type PBColumn,
} from '../pb'
import { usePatient } from '../data/patient-context'
import { messageRows, notificationTabs } from '../data/mois'

const TABS = ['Reminders', 'Recalls', 'Tasks', 'Messages', 'Responses - READ ONLY']

export function NotificationView() {
  const patient = usePatient()
  const [tab, setTab] = useState('Messages')
  const [lower, setLower] = useState('Detail')
  const [cur, setCur] = useState(0)

  const cfg = notificationTabs[tab]
  const columns = cfg.columns as PBColumn<Record<string, string>>[]

  /* the lower tab set changes with the upper one, so keep it valid */
  const lowerTabs = cfg.lowerTabs
  const activeLower = lowerTabs?.includes(lower) ? lower : lowerTabs?.[0] ?? ''

  return (
    <>
      <PBViewHeader title="Notification" />
      <PBCommandRow
        commands={[
          { label: 'New Record' }, { label: 'Delete Record' },
          { label: 'Save', disabled: true }, { label: 'Undo', disabled: true }, { label: 'Refresh' },
        ]}
      />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:' },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '2025.01.01' },
        ]}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBTabs tabs={TABS} active={tab} onChange={setTab} justified>
          <PBBand>{cfg.list}</PBBand>

          {/* each list has its own filter row above the grid */}
          {cfg.filters !== 'none' && (
          <div className="pb-row" style={{ padding: '3px 6px', gap: 6 }}>
            {cfg.filters === 'wide' && (<><PBInput w={110} /><PBInput w={510} /><PBInput w={132} /></>)}
            {cfg.filters === 'recall' && (<><PBInput w={96} /><PBInput w={420} /></>)}
            {cfg.filters === 'task' && (
              <>
                <PBInput w={480} />
                <span style={{ width: 10 }} />
                <PBCheckbox /><span style={{ width: 22 }} /><PBCheckbox />
              </>
            )}
            {cfg.filters === 'one' && <PBInput w={520} />}
          </div>
          )}

          <div style={{ height: cfg.lowerTabs || cfg.split ? 196 : 400, display: 'flex', padding: '0 6px' }}>
            <PBDataWindow
              rows={cfg.rows}
              current={cur}
              onCurrentChange={setCur}
              columns={columns}
              empty={`No ${tab.replace(' - READ ONLY', '').toLowerCase()} for this patient.`}
            />
          </div>

          {/* Responses stacks a second read-only grid instead of a detail pane */}
          {cfg.split && cfg.lower && (
            <>
              <PBBand>{cfg.lower.list}</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
                <PBDataWindow
                  rows={[]}
                  columns={cfg.lower.columns as PBColumn<Record<string, string>>[]}
                  empty=" "
                />
              </div>
            </>
          )}

          {lowerTabs && (
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 6, padding: '5px 6px 4px' }}>
              <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex' }}>
                <PBTabs tabs={lowerTabs} active={activeLower} onChange={setLower} compact>
                  {activeLower === 'Detail' ? (
                    <div style={{ flex: '1 1 auto', minHeight: 0, padding: 4, display: 'flex' }}>
                      <PBTextArea
                        key={`${tab}-${cur}`}
                        style={{ flex: '1 1 auto', height: '100%' }}
                        defaultValue={tab === 'Messages' ? messageRows[cur]?.body ?? '' : ''}
                      />
                    </div>
                  ) : (
                    <div className="pb-dw__empty" style={{ padding: 20 }}>Nothing recorded.</div>
                  )}
                </PBTabs>
              </div>

              {/* only the message view carries recipient grids */}
              {tab === 'Messages' && (
                <div style={{ width: 210, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(['Sent To', 'Copied To'] as const).map((who) => (
                    <div key={who} style={{ flex: '1 1 0', minHeight: 0, display: 'flex' }}>
                      <PBDataWindow
                        gutter={false}
                        rows={who === 'Sent To' ? [{ to: 'JALIL, AHMAD', ack: '✓', comp: '' }] : []}
                        columns={[
                          { key: 'to', header: who, width: 116 },
                          { key: 'ack', header: 'Ack', width: 34, align: 'center' },
                          { key: 'comp', header: 'Comp', width: 40, align: 'center' },
                        ]}
                        empty=" "
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </PBTabs>
      </div>
    </>
  )
}
