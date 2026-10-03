import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChartScreen } from '../data/chartScreens'
import type { FormListRow } from '../data/encounterForms'
import { ChartHeaderIdentity } from '../data/patient-context'
import { useChartRecords, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts/types'
import type { HostShellProps } from '../host/types'
import { DynamicFormSelectionDialog, type DynamicFormChoice } from './DynamicFormSelectionDialog'
import { useScreenReport } from '../host/screen-state'
import { DESKTOP_USER } from '../host/encounterArea'
import { MOIS_TODAY } from '../data/patients'
import { LegacyDynamicFormWindow } from './LegacyDynamicFormWindow'
import { SearchForBand, searchFieldsFor, useFolderSearch } from './SearchForBand'
import { ChartIdentityStrip } from './patientKit'
import { useColumnFilters } from './listKit'
import {
  PBCommandRow, PBDataWindow, PBTabs, PBTextArea,
  PBViewHeader, pbSlug, type PBColumn, type PBCommand,
} from '../pb'
import './chart-section.css'


/* The window most Patient Chart and Scheduler nodes open into. Everything
   that varies between them lives in chartScreens / schedulerScreens. */
export function ChartSectionView({ screen, content, loadEncounterForms, encounterFormSlot }: {
  screen: ChartScreen
  /** replaces the DataWindow with host content — a live form under Dynamic Forms */
  content?: ReactNode
  loadEncounterForms?: HostShellProps['loadEncounterForms']
  encounterFormSlot?: HostShellProps['encounterFormSlot']
}) {
  const [current, setCurrent] = useState(0)
  const [tab, setTab] = useState(screen.tabs?.[0] ?? '')
  const [openedDynamicForm, setOpenedDynamicForm] = useState<MoisRecord | null>(null)
  const [createdDynamicForms, setCreatedDynamicForms] = useState<{ formId: string; presetKey: string; name: string; group?: string }[]>([])
  const [openedCreatedForm, setOpenedCreatedForm] = useState<string | null>(null)
  /* exported dynamic forms deleted this session, by their index in
     `screen.rows` (see Delete Record below) */
  const [removedRows, setRemovedRows] = useState<number[]>([])
  const [pickingDynamicForm, setPickingDynamicForm] = useState(false)
  const formData = useRef<Record<string, Record<string, unknown>>>({})
  const isDynamic = screen.title === 'Dynamic Forms'
  const dynamicForms = useNodeRecords('dynamic')
  const dynamicFields = useChartRecords('dform_data')
  const exportedCount = screen.rows?.length ?? 0
  const selectedCreatedForm = createdDynamicForms[current - exportedCount]
  const selectedExportedForm = current < exportedCount && !removedRows.includes(current) ? dynamicForms[current] : undefined
  const openedCreatedRow = createdDynamicForms.find((form) => form.formId === openedCreatedForm)
  /* the webform preset behind a picked dynamic form, when the host has one
     (the stage's MOIS form library) — matched on the form's name */
  const presetFor = useCallback(async (choice: DynamicFormChoice) => {
    const forms = (await loadEncounterForms?.() ?? []).filter((form) => form.presetKey?.startsWith('dynamic-'))
    const want = choice.title.toUpperCase()
    return forms.find((form) => want.includes(form.name.toUpperCase()) || form.name.toUpperCase().includes(want))
  }, [loadEncounterForms])
  useScreenReport(isDynamic && pickingDynamicForm ? { dialog: 'dynamic-form-selection' } : openedDynamicForm ? { dialog: 'dynamic-form' } : {})
  const openSelectedDynamicForm = () => {
    if (selectedCreatedForm) setOpenedCreatedForm(selectedCreatedForm.formId)
    else setOpenedDynamicForm(selectedExportedForm ?? null)
  }

  /* MOIS lights Save and Undo the moment a record is started and puts them
     back out when it is saved or thrown away — the same New Record / Save
     cycle the Encounters list runs. A screen that lists them as disabled is
     describing its resting state, not a permanent one. */
  const [dirty, setDirty] = useState(false)
  const commands: PBCommand[] = screen.commands.map((c): PBCommand => {
    if (c === null) return null
    const command = chartCommand(c)
    return command && screen.commandWidths?.[c] ? { ...command, exactWidth: screen.commandWidths[c] } : command
  })
  function chartCommand(c: string): PBCommand {
    const gated = screen.disabled?.includes(c) ?? false
    /* New Record opens the Dynamic Form Selection Window (303105 `7518af69…`)
       whether or not the host can render the form itself */
    if (isDynamic && c === 'New Record') {
      return { label: c, onClick: () => setPickingDynamicForm(true) }
    }
    if (isDynamic && c === 'Open Form') {
      return { label: c, disabled: !selectedExportedForm && !selectedCreatedForm, onClick: openSelectedDynamicForm }
    }
    /* MOIS paints Delete Record black at rest, with forms listed
       (evidence/MATRIX-R1038-form-date: all four buttons enabled). A press
       does what Delete Record does on the other chart folders
       (reportRecordEdits.tsx, art. 304655 "deletes the selected record"):
       the current row leaves the list, in this session only, with no
       confirmation — the export behind the list is never written. A form
       this session created is dropped outright. */
    if (isDynamic && c === 'Delete Record') {
      return { label: c, onClick: () => {
        if (selectedCreatedForm) {
          setCreatedDynamicForms((forms) => forms.filter((form) => form.formId !== selectedCreatedForm.formId))
        } else if (current < exportedCount && !removedRows.includes(current)) {
          setRemovedRows((removed) => [...removed, current])
        } else return
        /* the row above becomes current, the way the chart folders move
           (useDraftRecords' `deleteMoves: 'previous'`); the first row's
           successor when there is none above. Dropping a created form
           shifts the created rows after it up by one. */
        const left = shown.filter((x) => x.index !== current)
        const above = left.filter((x) => x.index < current).pop()
        const below = left[0]
        setCurrent(above ? above.index : below ? below.index - (selectedCreatedForm ? 1 : 0) : 0)
      } }
    }
    if (c === 'New Record' || c === 'Quick Entry') {
      return { label: c, onClick: () => setDirty(true) }
    }
    if (gated && (c === 'Save' || c === 'Undo')) {
      return { label: c, disabled: !dirty, onClick: () => setDirty(false) }
    }
    return { label: c, disabled: gated }
  }

  const columns: PBColumn<Record<string, string>>[] = screen.columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
  }))

  const rows: Record<string, string>[] = isDynamic ? [
    ...(screen.rows ?? []),
    ...createdDynamicForms.map((form) => ({ date: MOIS_TODAY, group: form.group ?? 'DYNAMIC FORM', title: form.name, attending: '', user: DESKTOP_USER, state: 'DRAFT' })),
  ] : screen.rows ?? []
  /* Search For filters the grid (SearchForBand.tsx); the rows keep their
     own indexes, so the current record and the dynamic-form mapping below
     still address the unfiltered list */
  const searchFields = useMemo(() => searchFieldsFor(screen.title, screen.columns), [screen.title, screen.columns])
  const search = useFolderSearch(screen.title, searchFields)
  /* A window with `filterColumns` filters per column instead
     (evidence/MATRIX-R1045-date): a box over each listed column, in the
     grey band PBDataWindow's `filters` row draws above the headers. */
  const filters = useColumnFilters(
    rows.map((row, index) => ({ row, index })).filter((x) => !removedRows.includes(x.index) && search.test(x.row)),
    screen.columns.map((c) => (screen.filterColumns?.includes(c.key) ? {
      key: c.key,
      value: (x: { row: Record<string, string> }) => x.row[c.key],
      ariaLabel: `Filter ${c.header}`,
      anchor: `filter-${pbSlug(c.header)}`,
    } : null)),
  )
  const shown = filters.shown
  const grid = (
    <PBDataWindow
      /* a DataWindow fills its frame and keeps its painted column widths, so
         past the last sized column runs the grid's own white
         (evidence/MATRIX-R1045-date: Attending ends at 1185, white beyond) */
      style={{ flex: '1 1 auto' }}
      filters={screen.filterColumns ? filters.filterRow : undefined}
      columns={columns}
      rows={shown.map((x) => x.row)}
      current={Math.max(0, shown.findIndex((x) => x.index === current))}
      onCurrentChange={(i) => setCurrent(shown[i]?.index ?? 0)}
      onActivate={isDynamic ? (_, filtered) => {
        const index = shown[filtered]?.index ?? filtered
        if (index >= exportedCount) setOpenedCreatedForm(createdDynamicForms[index - exportedCount]?.formId ?? null)
        else setOpenedDynamicForm(dynamicForms[index] ?? null)
      } : undefined}
      empty={`No ${screen.title.toLowerCase()} on file.`}
    />
  )

  if (screen.placeholder) {
    return (
      <>
        <PBViewHeader title={screen.title} />
        <PBCommandRow commands={commands} />
        <div className="pb-dw__empty" data-tutorial-id="host.mois.placeholder" style={{ margin: 'auto', maxWidth: 420, textAlign: 'center' }}>
          {screen.title} is not built on this practice stage yet.
        </div>
      </>
    )
  }

  return (
    <>
      <PBViewHeader title={screen.title} right={screen.noPatient ? undefined : <ChartHeaderIdentity />} />
      <PBCommandRow commands={commands} />

      {!screen.noPatient && <ChartIdentityStrip
        noEncounter={screen.noEncounter}
        /* a screen with per-column filters has no Search For band (chartScreens `noSearch`) */
        search={!screen.noSearch && <SearchForBand context={screen.title} fields={searchFields} value={search.text} onChange={search.setText} style={{ padding: 0, flex: '1 1 auto' }} />}
      />}

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
        <div className={screen.filterColumns ? 'pb-chart-section--filters' : undefined} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>{grid}</div>
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
        <DynamicFormSelectionDialog
          onOk={(choice: DynamicFormChoice) => {
            setPickingDynamicForm(false)
            void presetFor(choice).then((form: FormListRow | undefined) => {
              const created = { formId: crypto.randomUUID(), presetKey: form?.presetKey ?? '', name: choice.title, group: choice.group }
              setCreatedDynamicForms((forms) => [...forms, created])
              setCurrent(exportedCount + createdDynamicForms.length)
              if (created.presetKey && encounterFormSlot) setOpenedCreatedForm(created.formId)
            })
          }}
          onClose={() => setPickingDynamicForm(false)}
        />
      )}
    </>
  )
}
