import { useState, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import { type OrderLinkRow } from '../data/chartUtilities'
import { usePatient } from '../data/patient-context'
import { useEncounterSession } from '../host/encounterArea'
import { PBDataWindow, PBDropField, PBGroup, PBTextArea, PBWindow, pbSlug } from '../pb'
import { CmdButton } from './CmdButton'

/* ============================================================================
   Order Linking Service — the Patient Chart's Taskbar `Link to Order`.

   Available from Measures, Imaging, Consults and Procedures. It lists the
   chart's outstanding orders; picking one and pressing `Link` ties the record
   that was selected in the folder behind to that order, and the folder row's
   `Links` cell goes from `-` to a link indicator. Invoking `Link to Order`
   again on an already-linked record unlinks it.

   PROVENANCE: `303792 / 18088c4cd7da` @1.00x — window x 402–1298 (w 897),
   y ≈128–806, ✕ at x ≈1285.

   Gaps left deliberately (spec §13): the `Status` cell's drop-down list is
   undocumented — `IN PROCESS` is the only value the corpus ever shows — so
   the arrow drops nothing. The `Link` / `Cancel` row is clipped by the bottom
   edge of the capture, so its widths and y are the report's estimates and are
   marked as such below.
   ========================================================================= */

const ORDER_STATUS: Record<string, string> = { IP: 'IN PROCESS' }

const W = 897
const H = 679
/** not measured in the capture; the flat white MOIS caption is 25 elsewhere */
const TITLEBAR_H = 25

/** capture x → window x */
const x = (captureX: number) => captureX - 402
/** capture y → client y */
const y = (captureY: number) => captureY - 128 - TITLEBAR_H

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="pb-row" style={{ gap: 5 }}>
      <span className="pb-form__label">{label}</span>
      <span>{value}</span>
    </span>
  )
}

export function OrderLinkingServiceDialog({ onLink, onClose }: {
  /** `Link` — the caller flips the source row's `Links` cell */
  onLink?: (row: OrderLinkRow) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const records = useChartRecords('order', 'dtm_ord_date')
  /* "outstanding orders" only: a completed order has nothing left to link.
     The Status cell prints the status's name — IN PROCESS in the capture,
     where the export stores IP; the other codes' names are not documented
     and print as stored. */
  const outstanding = records.filter(r => r.str_status !== 'CM' && r.str_status !== 'COMPLETED')
  const [rows, setRows] = useState<OrderLinkRow[]>(() => outstanding
    .map(r => ({ date: date(r.dtm_ord_date), orderBy: r.str_order_by ?? '', referral: r.str_performed_by ?? '', description: r.str_description ?? '', detail: r.str_note ?? '', status: ORDER_STATUS[r.str_status ?? ''] ?? r.str_status ?? '', priority: r.str_priority_code ?? '', links: r.num_results ?? '' })))
  /* Link ties the record selected in the folder behind to the order: its
     Report tab's Order # fills in (host/encounterArea session copy) */
  const encounters = useEncounterSession()
  const link = (row: OrderLinkRow) => {
    const id = encounters.session.measureSelected?.id
    if (id) {
      encounters.update((s) => {
        const orderLinks = { ...s.orderLinks }
        /* "The same button unlinks": linking a linked record again undoes it */
        if (orderLinks[id]) delete orderLinks[id]
        else orderLinks[id] = outstanding[rows.indexOf(row)]?.id_order ?? row.date
        return { ...s, orderLinks }
      })
    }
    onLink?.(row)
  }
  const [current, setCurrent] = useState(0)

  const picked = rows[Math.min(current, Math.max(0, rows.length - 1))]

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Order Linking Service"
        onClose={onClose}
        style={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
      >
        <div
          data-tutorial-id="host.mois.dialog.order-linking-service"
          style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}
        >
          {/* The chart identity strip: read-only statics on one line. The
              capture gives this row's y (163–175) and its order, but no x per
              field, so they run left to right from the grid's own left edge
              rather than at measured stops. */}
          <div className="pb-row" style={{ position: 'absolute', left: x(406), top: y(163), gap: 24 }}>
            <Stat label="Chart:" value={patient.chart} />
            <Stat label="Patient:" value={`${patient.first} ${patient.last}`} />
            <Stat label="DoB:" value={patient.dob} />
            <Stat label="Sex:" value={patient.sex} />
            <Stat label="BC Health No.:" value={patient.bchn ?? ''} />
          </div>

          {/* grid x 406–1275, header #C8DCFA y 186–201, row pitch ≈18 */}
          <div
            style={{
              position: 'absolute', left: x(406), width: x(1275) - x(406),
              top: y(186), height: y(570) - y(186), display: 'flex',
            }}
          >
            <PBDataWindow
              rows={rows}
              current={current}
              onCurrentChange={setCurrent}
              rowTutorialId={(r) => `host.mois.row.order-${pbSlug(r.date)}`}
              columns={[
                { key: 'date', header: 'Date', width: 75 },
                { key: 'orderBy', header: 'Order By', width: 120 },
                { key: 'referral', header: 'Referral / Facility', width: 106 },
                { key: 'description', header: 'Description', width: 288 },
                { key: 'detail', header: 'Detail', width: 54 },
                {
                  key: 'status',
                  header: 'Status',
                  width: 91,
                  /* an in-cell drop-down. Only `IN PROCESS` is ever shown in
                     the corpus, so the arrow has no list behind it. */
                  render: (r, i) => (
                    <span
                      data-tutorial-id={`host.mois.cell.status-${pbSlug(r.date)}`}
                      /* the control has to fit the 18px band */
                      style={{ display: 'block', ['--pb-row-h' as string]: '16px' }}
                    >
                      <PBDropField
                        w="100%"
                        value={r.status}
                        onChange={(v) => setRows((all) => all.map((row, j) => (j === i ? { ...row, status: v } : row)))}
                      />
                    </span>
                  ),
                },
                { key: 'priority', header: 'Priority', width: 70 },
                { key: 'links', header: 'Links', width: 44, align: 'center' },
              ]}
              empty="This chart has no outstanding orders."
              style={{
                flex: '1 1 auto', minWidth: 0,
                ['--pb-dw-row-h' as string]: '18px',
              }}
            />
          </div>

          {/* the framed Comment box, x ≈425–1272, y ≈585–755 */}
          <div style={{ position: 'absolute', left: x(425), width: x(1272) - x(425), top: y(585), height: y(755) - y(585) }}>
            <PBGroup title="Comment" fill style={{ height: '100%' }}>
              <PBTextArea
                w="100%"
                readOnly
                value={picked?.detail ?? ''}
                style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pb-field-ro)' }}
              />
            </PBGroup>
          </div>

          {/* Link / Cancel, centred. Both are clipped by the bottom edge of
              the capture: w ≈75, gap ≈14, y ≈783–805 are estimates, not
              measurements (spec §13.7). */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: y(783),
              display: 'flex', justifyContent: 'center', gap: 14,
            }}
          >
            {/* not `link-to-order`: that is the Taskbar button behind this
                window, and an anchor lookup takes the first match on screen.
                CmdButtons, so a learner's press reports itself too. */}
            <CmdButton
              style={{ width: 75, minWidth: 0 }}
              command="order-linking-link"
              disabled={!picked}
              onClick={() => picked && link(picked)}
            >
              Link
            </CmdButton>
            <CmdButton
              style={{ width: 75, minWidth: 0 }}
              command="order-linking-cancel"
              onClick={onClose}
            >
              Cancel
            </CmdButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
