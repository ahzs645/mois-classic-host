import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import type { MoisRecord } from '../data/charts/types'
import { PBButton, PBCheckbox, PBDataWindow, PBWindow } from '../pb'

/* ============================================================================
   Encounter Link Service — Patient Chart ▸ Measures ▸ Action ▸ Link to Encounter.

   Two framed grids side by side. Picking an encounter on the left lists the
   measurements collected on that encounter's date on the right; ticking
   `Select` on some of them and pressing `Link Select Items` ties them to the
   encounter (the user then saves the folder with F2).

   PROVENANCE: manual article 303069 "Link a Measurement to an Encounter",
   image `ead04b52f243…` (1015×738 @1.00x). Window x ≈10–990 (w 980), title
   bar y 124–144, frame bottom ≈734 (the capture ends at 738).
     · "Encounter List" panel x 20–432, y 155–661; caption band 20px, grid
       header 19px (#CEDFFF), row pitch ≈18.7.
       Columns: gutter 14 · Date 73 · Hr 33 · Min 26 · Slots 43 · Code 46 ·
       Visit Reason 156, then a 15px vertical scrollbar. Hr and Min print
       zero-padded (`15` `00`, `03` `10`).
     · "Measurements on the Same Day as the selected Encounter" panel
       x 440–974; no gutter. Columns: Select 40 · Date 80 · Description 255 ·
       Value 136. Value is the bare value — no units (`120/90`, `27.8`).
     · Ticked rows are painted #9CFF9C with black ink; unticked rows keep the
       white/zebra fill with grey ink.
     · `Link Select Items` x 374–474, `Cancel` x 484–584, y 682–704.
   Labels are the capture's verbatim, including the button's
   "Link Select Items" (not "Selected") and the lower-case "selected".

   Gaps: the capture cannot say whether the green rows are ones already
   linked or merely the ones the user ticked. Here a measure already linked
   to the selected encounter (by the export's id_encounter, or by `links`
   from this session) arrives ticked, and ticking paints a row green either
   way.
   ========================================================================= */

const W = 980
const H = 610
const TITLEBAR_H = 20
/** capture x → window x */
const x = (captureX: number) => captureX - 10
/** capture y → client y */
const y = (captureY: number) => captureY - 124 - TITLEBAR_H

const TICKED = '#9cff9c'
const UNTICKED_INK = '#a5a5a5'

/**
 * The measures collected on the same calendar day as `encounter` — the list
 * the right-hand grid shows. Compares `dtm_collect_date` against
 * `dtm_appoint` on the date part only; the export writes both `YYYY/MM/DD`.
 */
export function sameDayMeasures(encounter: MoisRecord, measures: MoisRecord[]): MoisRecord[] {
  const day = (encounter.dtm_appoint ?? '').split(' ')[0]
  if (!day) return []
  return measures.filter((m) => (m.dtm_collect_date ?? '').split(' ')[0] === day)
}

const pad2 = (v?: string) => (v === undefined || v === '' ? '' : v.padStart(2, '0'))

/** The newest encounter first; within a day, the latest appointment first. */
function encounterOrder(a: MoisRecord, b: MoisRecord): number {
  const key = (r: MoisRecord) =>
    `${r.dtm_appoint ?? ''} ${pad2(r.num_appoint_hr)}${pad2(r.num_appoint_min)}`
  return key(b).localeCompare(key(a))
}

type EncounterRow = { id: string; date: string; hr: string; min: string; slots: string; code: string; reason: string }
type MeasureRow = { id: string; date: string; description: string; value: string }

/** A framed panel with its bold caption band, the way both halves are drawn. */
function Panel({ title, style, children }: { title: string; style: CSSProperties; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute', display: 'flex', flexDirection: 'column',
        border: '1px solid #404040', background: '#fff', ...style,
      }}
    >
      <div
        style={{
          height: 20, flex: '0 0 auto', display: 'flex', alignItems: 'center', padding: '0 5px',
          fontWeight: 700, background: '#ded7d6', borderBottom: '1px solid #808080',
        }}
      >
        {title}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>{children}</div>
    </div>
  )
}

export function EncounterLinkServiceDialog({ links, onLink, onClose }: {
  /** measures already linked this session (measure id -> encounter id), so the lists reflect them */
  links?: Record<string, string>
  onLink: (encounterId: string, measureIds: string[]) => void
  onClose: () => void
}) {
  const encounterRecords = useChartRecords('encounter', 'dtm_appoint')
  const measureRecords = useChartRecords('measure')

  const encounters = useMemo(() => [...encounterRecords].sort(encounterOrder), [encounterRecords])
  const encounterRows = useMemo<EncounterRow[]>(() => encounters.map((r) => ({
    id: r.id_encounter ?? '',
    date: date(r.dtm_appoint),
    hr: pad2(r.num_appoint_hr),
    min: pad2(r.num_appoint_min),
    slots: r.num_time_slots ?? '',
    code: r.str_visit_code ?? '',
    reason: r.str_appt_note ?? '',
  })), [encounters])

  const [current, setCurrent] = useState(0)
  const encounter = encounters[Math.min(current, Math.max(0, encounters.length - 1))]
  const encounterId = encounter?.id_encounter ?? ''

  const linkedTo = (m: MoisRecord) => links?.[m.id_measure ?? ''] ?? m.id_encounter ?? ''

  const sameDay = useMemo(
    () => (encounter ? sameDayMeasures(encounter, measureRecords) : []),
    [encounter, measureRecords],
  )
  const measureRows = useMemo<MeasureRow[]>(() => sameDay.map((m) => ({
    id: m.id_measure ?? '',
    date: date(m.dtm_collect_date),
    description: m.str_description ?? '',
    value: m.str_value ?? '',
  })), [sameDay])

  /* Ticks belong to one encounter: choosing another starts from what is
     already linked to it. */
  const [ticks, setTicks] = useState<{ encounter: string; ids: Set<string> } | null>(null)
  const ticked: Set<string> = ticks && ticks.encounter === encounterId
    ? ticks.ids
    : new Set(sameDay.filter((m) => encounterId && linkedTo(m) === encounterId).map((m) => m.id_measure ?? ''))
  const toggle = (id: string, on: boolean) => {
    const next = new Set(ticked)
    if (on) next.add(id)
    else next.delete(id)
    setTicks({ encounter: encounterId, ids: next })
  }

  const ink = (r: MeasureRow, text: ReactNode) => (
    <span style={{ color: ticked.has(r.id) ? '#000' : UNTICKED_INK }}>{text}</span>
  )

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        title="Encounter Link Service"
        onClose={onClose}
        tutorialId="host.mois.dialog.encounter-link-service"
        style={{ width: W, height: H, maxWidth: '100%', ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
      >
        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}>
          <Panel title="Encounter List" style={{ left: x(20), width: x(432) - x(20), top: y(155), height: y(661) - y(155) }}>
            <PBDataWindow
              rows={encounterRows}
              current={current}
              onCurrentChange={setCurrent}
              rowTutorialId={(r) => `host.mois.row.link-encounter-${r.id}`}
              columns={[
                { key: 'date', header: 'Date', width: 73, align: 'center' },
                { key: 'hr', header: 'Hr', width: 33, align: 'center' },
                { key: 'min', header: 'Min', width: 26, align: 'center' },
                { key: 'slots', header: 'Slots', width: 43, align: 'center' },
                { key: 'code', header: 'Code', width: 46, align: 'center' },
                { key: 'reason', header: 'Visit Reason', headAlign: 'center' },
              ]}
              empty="This chart has no encounters."
              style={{ flex: '1 1 auto', minWidth: 0, ['--pb-dw-row-h' as string]: '19px' }}
            />
          </Panel>

          <Panel
            title="Measurements on the Same Day as the selected Encounter"
            style={{ left: x(440), width: x(974) - x(440), top: y(155), height: y(661) - y(155) }}
          >
            <PBDataWindow
              rows={measureRows}
              /* the right grid has no current row: no gutter, no salmon */
              current={-1}
              gutter={false}
              rowFill={(r) => (ticked.has(r.id) ? TICKED : undefined)}
              columns={[
                {
                  key: 'select',
                  header: 'Select',
                  width: 40,
                  align: 'center',
                  render: (r) => (
                    <PBCheckbox
                      checked={ticked.has(r.id)}
                      onChange={(v) => toggle(r.id, v)}
                      tutorialId={`host.mois.cell.link-measure-${r.id}`}
                    />
                  ),
                },
                { key: 'date', header: 'Date', width: 80, align: 'center', render: (r) => ink(r, r.date) },
                { key: 'description', header: 'Description', width: 255, headAlign: 'center', render: (r) => ink(r, r.description) },
                { key: 'value', header: 'Value', width: 136, headAlign: 'center', render: (r) => ink(r, r.value) },
              ]}
              empty=" "
              style={{ flex: '1 1 auto', minWidth: 0, ['--pb-dw-row-h' as string]: '19px' }}
            />
          </Panel>

          <PBButton
            style={{ position: 'absolute', left: x(374), top: y(682), width: 100, height: 22, minWidth: 0 }}
            data-tutorial-id="host.mois.command.link-select-items"
            disabled={!encounterId || ticked.size === 0}
            onClick={() => encounterId && onLink(encounterId, measureRows.filter((r) => ticked.has(r.id)).map((r) => r.id))}
          >
            Link Select Items
          </PBButton>
          <PBButton
            style={{ position: 'absolute', left: x(484), top: y(682), width: 100, height: 22, minWidth: 0 }}
            data-tutorial-id="host.mois.command.encounter-link-cancel"
            onClick={onClose}
          >
            Cancel
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
