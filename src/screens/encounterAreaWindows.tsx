import { useEffect, useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import { type MeasureTemplate } from '../data/measures'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_USER, useEncounterSession } from '../host/encounterArea'
import { PBMessageBox } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { EncounterLinkServiceDialog } from './EncounterLinkServiceDialog'
import { FlowSheetParametersDialog, FlowSheetWindow, type FlowSheetParams } from './FlowSheetWindows'
import { HealthMaintenanceReviewWindow } from './HealthMaintenanceReviewWindow'
import { MeasureTemplateGridDialog, MeasureTemplateSelectionDialog, defaultMeasureTemplate } from './MeasureDialogs'
import { MeasurementGraphWindow, graphForCode } from './MeasurementGraphWindow'
import './MeasureHistoryWindow'

/* ============================================================================
   The Encounters and Measures area's frame-level windows, opened by name
   (areaWindowRegistry): the frame's Utilities ▸ Health Maintenance Review
   (Ctrl+H) and Flow Sheet Review, the Encounter Detail Window's Utilities
   menu, and the Measures folder's Action menu (302837 `b06f52f6…`: Link to
   Encounter, Measurement Template, Filter Measures, Graph Measures).
   ========================================================================= */

/* Utilities ▸ Health Maintenance Review. Its Flow Sheet button asks for the
   same date range and type as Flow Sheet Review (303225). */
function HealthMaintenanceReview({ close, open }: AreaWindowProps) {
  return <HealthMaintenanceReviewWindow onFlowSheet={() => { open('flow-sheet-review') }} onClose={close} />
}

/* Utilities ▸ Flow Sheet Review: the Flow Sheet Parameters, then the sheet */
function FlowSheetReview({ args, close, open }: AreaWindowProps) {
  return (
    <FlowSheetParametersDialog
      defaultType={typeof args.type === 'string' ? args.type : undefined}
      onOk={(params: FlowSheetParams) => { open('flow-sheet', params) }}
      onClose={close}
    />
  )
}

function FlowSheet({ args, close }: AreaWindowProps) {
  return <FlowSheetWindow params={args as FlowSheetParams} onClose={close} />
}

/* Measures ▸ Action ▸ Link to Encounter (303069) */
function EncounterLinkService({ close }: AreaWindowProps) {
  const { session, update } = useEncounterSession()
  return (
    <EncounterLinkServiceDialog
      links={session.measureLinks}
      onLink={(encounterId, measureIds) => {
        update((s) => ({
          ...s,
          measureLinks: { ...s.measureLinks, ...Object.fromEntries(measureIds.map((id) => [id, encounterId])) },
        }))
        close()
      }}
      onClose={close}
    />
  )
}

/* Measures ▸ Action ▸ Measurement Template (older builds: Template Entry).
   "If the template is entered from the Measures folder, the measurements will
   pull from records with today's date" (303070). */
function MeasurementTemplate({ close }: AreaWindowProps) {
  const { update } = useEncounterSession()
  const measures = useChartRecords('measure')
  const [template, setTemplate] = useState<MeasureTemplate | null>(null)
  if (!template) return <MeasureTemplateSelectionDialog onOpen={setTemplate} onClose={close} />
  const today = MOIS_TODAY.replace(/\./g, '/')
  return (
    <MeasureTemplateGridDialog
      title={template.name}
      slots={template.name === defaultMeasureTemplate.name ? defaultMeasureTemplate.slots : []}
      initial={Object.fromEntries(measures
        .filter((r) => (r.dtm_collect_date ?? '').startsWith(today))
        .map((r) => [r.str_code ?? '', { value: r.str_value ?? '', flag: r.str_abnormal ?? '' }]))}
      onSave={(rows) => {
        update((s) => ({
          ...s,
          measureRows: [...rows.map((r) => ({
            collected: MOIS_TODAY, by: DESKTOP_USER, code: r.code, test: r.name, value: r.value,
            flag: r.flag || '-', units: r.units, status: '', clip: '-',
          })), ...s.measureRows],
        }))
        close()
      }}
      onClose={close}
    />
  )
}

/* Graph (Measures taskbar, the encounter's Measurements tab) and Action ▸
   Graph Measures (Ctrl+G): every value the chart holds for the code. */
function MeasurementGraph({ args, close }: AreaWindowProps) {
  const { session } = useEncounterSession()
  const measures = useChartRecords('measure')
  const code = typeof args.code === 'string' && args.code ? args.code : session.measureSelected?.code ?? ''
  const graph = graphForCode(measures, code)
  if (!graph) {
    /* MOIS refuses a measure whose values are not numeric, or one with no
       value, collected date, DoB or gender (302837 "Graphing"); the message
       box's wording was not captured */
    return (
      <PBMessageBox title="MOIS" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={close}>
        <span data-tutorial-id="host.mois.dialog.graph-refused">This measurement has no numeric values to graph.</span>
      </PBMessageBox>
    )
  }
  return <MeasurementGraphWindow {...graph} onClose={close} />
}

/* Action ▸ Filter Measures (Ctrl+F) is a toggle, not a window: it cuts the
   folder to the selected row's code, and "Ctrl+F again brings the whole list
   back" (302837). It closes itself as soon as it has flipped the filter. */
function FilterMeasures({ close }: AreaWindowProps) {
  const { session, update } = useEncounterSession()
  const code = session.measureSelected?.code ?? ''
  useEffect(() => {
    update((s) => ({ ...s, measureFilter: s.measureFilter || !code ? null : code }))
    close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

registerAreaWindow('health-maintenance-review', HealthMaintenanceReview)
registerAreaWindow('flow-sheet-review', FlowSheetReview)
registerAreaWindow('flow-sheet', FlowSheet)
registerAreaWindow('encounter-link-service', EncounterLinkService)
registerAreaWindow('measurement-template', MeasurementTemplate)
registerAreaWindow('measurement-graph', MeasurementGraph)
registerAreaWindow('filter-measures', FilterMeasures)
