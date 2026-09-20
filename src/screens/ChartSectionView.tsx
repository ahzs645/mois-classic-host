import { useState, type ReactNode } from 'react'
import {
  PBCommandRow, PBDataWindow, PBIdentityStrip, PBLookup, PBTabs, PBTextArea,
  PBViewHeader, type PBColumn, type PBCommand,
} from '../pb'
import { usePatient } from '../data/patient-context'
import type { ChartScreen } from '../data/chartScreens'


/* The window most Patient Chart and Scheduler nodes open into. Everything
   that varies between them lives in chartScreens / schedulerScreens. */
export function ChartSectionView({ screen, content }: {
  screen: ChartScreen
  /** replaces the DataWindow with host content — a live form under Dynamic Forms */
  content?: ReactNode
}) {
  const patient = usePatient()
  const [tab, setTab] = useState(screen.tabs?.[0] ?? '')

  /* MOIS lights Save and Undo the moment a record is started and puts them
     back out when it is saved or thrown away — the same New Record / Save
     cycle the Encounters list runs. A screen that lists them as disabled is
     describing its resting state, not a permanent one. */
  const [dirty, setDirty] = useState(false)
  const commands: PBCommand[] = screen.commands.map((c) => {
    if (c === null) return null
    const gated = screen.disabled?.includes(c) ?? false
    if (c === 'New Record' || c === 'Quick Entry') {
      return { label: c, onClick: () => setDirty(true) }
    }
    if (gated && (c === 'Save' || c === 'Undo')) {
      return { label: c, disabled: !dirty, onClick: () => setDirty(false) }
    }
    return { label: c, disabled: gated }
  })

  const columns: PBColumn<Record<string, string>>[] = screen.columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
  }))

  const grid = (
    <PBDataWindow
      columns={columns}
      rows={screen.rows ?? []}
      empty={`No ${screen.title.toLowerCase()} on file.`}
    />
  )

  return (
    <>
      <PBViewHeader title={screen.title} />
      <PBCommandRow commands={commands} />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter={screen.noEncounter ? undefined : 'NO ENCOUNTER'}
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      {content ? (
        <div className="pb-host-slot">{content}</div>
      ) : screen.tabs && screen.gridOnly ? (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '3px' }}>
          <PBTabs tabs={screen.tabs} active={tab} onChange={setTab} compact>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>{grid}</div>
          </PBTabs>
        </div>
      ) : screen.tabs ? (
        <>
          <div style={{ padding: '0 3px', height: 142, display: 'flex' }}>{grid}</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
            <PBTabs tabs={screen.tabs} active={tab} onChange={setTab} compact>
              <div style={{ flex: '1 1 auto', minHeight: 0, padding: 4, display: 'flex' }}>
                {tab === screen.tabs[0] ? (
                  <PBTextArea style={{ flex: '1 1 auto', height: '100%' }} />
                ) : (
                  <div className="pb-dw__empty" style={{ margin: 'auto' }}>
                    {tab} — nothing to display.
                  </div>
                )}
              </div>
            </PBTabs>
          </div>
        </>
      ) : (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>{grid}</div>
      )}
    </>
  )
}
