import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { ChartScreen } from '../data/chartScreens'
import type { FormListRow } from '../data/encounterForms'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { useChartRecords, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts/types'
import type { HostShellProps } from '../host/types'
import { SelectFormDialog } from './EncounterWindow'
import { LegacyDynamicFormWindow } from './LegacyDynamicFormWindow'
import {
  PBCommandRow, PBDataWindow, PBIdentityStrip, PBLookup, PBTabs, PBTextArea,
  PBViewHeader, type PBColumn, type PBCommand,
} from '../pb'


/* The window most Patient Chart and Scheduler nodes open into. Everything
   that varies between them lives in chartScreens / schedulerScreens. */
export function ChartSectionView({ screen, content, loadEncounterForms, encounterFormSlot }: {
  screen: ChartScreen
  /** replaces the DataWindow with host content — a live form under Dynamic Forms */
  content?: ReactNode
  loadEncounterForms?: HostShellProps['loadEncounterForms']
  encounterFormSlot?: HostShellProps['encounterFormSlot']
}) {
  const patient = usePatient()
  const [current, setCurrent] = useState(0)
  const [tab, setTab] = useState(screen.tabs?.[0] ?? '')
  const [openedDynamicForm, setOpenedDynamicForm] = useState<MoisRecord | null>(null)
  const [createdDynamicForms, setCreatedDynamicForms] = useState<{ formId: string; presetKey: string; name: string }[]>([])
  const [openedCreatedForm, setOpenedCreatedForm] = useState<string | null>(null)
  const [pickingDynamicForm, setPickingDynamicForm] = useState(false)
  const formData = useRef<Record<string, Record<string, unknown>>>({})
  const isDynamic = screen.title === 'Dynamic Forms'
  const dynamicForms = useNodeRecords('dynamic')
  const dynamicFields = useChartRecords('dform_data')
  const exportedCount = screen.rows?.length ?? 0
  const selectedCreatedForm = createdDynamicForms[current - exportedCount]
  const openedCreatedRow = createdDynamicForms.find((form) => form.formId === openedCreatedForm)
  const loadDynamicForms = useCallback(async () => {
    const forms = await loadEncounterForms?.() ?? []
    return forms.filter((form) => form.presetKey?.startsWith('dynamic-'))
      .map((form) => ({ ...form, type: 'DYNAMIC FORM' }))
  }, [loadEncounterForms])
  const openSelectedDynamicForm = () => {
    if (selectedCreatedForm) setOpenedCreatedForm(selectedCreatedForm.formId)
    else setOpenedDynamicForm(dynamicForms[current] ?? null)
  }

  /* MOIS lights Save and Undo the moment a record is started and puts them
     back out when it is saved or thrown away — the same New Record / Save
     cycle the Encounters list runs. A screen that lists them as disabled is
     describing its resting state, not a permanent one. */
  const [dirty, setDirty] = useState(false)
  const commands: PBCommand[] = screen.commands.map((c) => {
    if (c === null) return null
    const gated = screen.disabled?.includes(c) ?? false
    if (isDynamic && c === 'New Record') {
      return { label: c, disabled: !loadEncounterForms || !encounterFormSlot, onClick: () => setPickingDynamicForm(true) }
    }
    if (isDynamic && c === 'Open Form') {
      return { label: c, disabled: !dynamicForms[current] && !selectedCreatedForm, onClick: openSelectedDynamicForm }
    }
    if (isDynamic && c === 'Delete Record') {
      return { label: c, disabled: !selectedCreatedForm, onClick: () => {
        setCreatedDynamicForms((forms) => forms.filter((form) => form.formId !== selectedCreatedForm?.formId))
        setCurrent(0)
      } }
    }
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

  const rows = isDynamic ? [
    ...(screen.rows ?? []),
    ...createdDynamicForms.map((form) => ({ date: '', group: 'DYNAMIC FORM', title: form.name, attending: '', user: '', state: 'DRAFT' })),
  ] : screen.rows ?? []
  const grid = (
    <PBDataWindow
      columns={columns}
      rows={rows}
      current={current}
      onCurrentChange={setCurrent}
      onActivate={isDynamic ? (_, index) => {
        if (index >= exportedCount) setOpenedCreatedForm(createdDynamicForms[index - exportedCount]?.formId ?? null)
        else setOpenedDynamicForm(dynamicForms[index] ?? null)
      } : undefined}
      empty={`No ${screen.title.toLowerCase()} on file.`}
    />
  )

  return (
    <>
      <PBViewHeader title={screen.title} right={<ChartHeaderIdentity />} />
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
                  <PBTextArea value={screen.rows?.[current]?.note ?? screen.rows?.[current]?.detail ?? ''} readOnly style={{ flex: '1 1 auto', height: '100%' }} />
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
      {openedDynamicForm && (
        <LegacyDynamicFormWindow
          header={openedDynamicForm}
          records={dynamicFields}
          onClose={() => setOpenedDynamicForm(null)}
        />
      )}
      {openedCreatedRow && encounterFormSlot && (
        encounterFormSlot({
          presetKey: openedCreatedRow.presetKey,
          encounterId: '',
          formId: openedCreatedRow.formId,
          initialData: formData.current[openedCreatedRow.formId],
          onFormDataChange: (data) => { formData.current[openedCreatedRow.formId] = data },
          onClose: () => setOpenedCreatedForm(null),
        })
      )}
      {pickingDynamicForm && (
        <SelectFormDialog
          loadEncounterForms={loadDynamicForms}
          onCreate={(form: FormListRow) => {
            if (!form.presetKey) return
            const created = { formId: crypto.randomUUID(), presetKey: form.presetKey, name: form.name }
            setCreatedDynamicForms((forms) => [...forms, created])
            setCurrent(exportedCount + createdDynamicForms.length)
            setPickingDynamicForm(false)
            setOpenedCreatedForm(created.formId)
          }}
          onClose={() => setPickingDynamicForm(false)}
        />
      )}
    </>
  )
}
