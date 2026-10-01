import { useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import { type OrderLinkRow } from '../data/chartUtilities'
import { ORDER_LINK_IDENTITY, ORDER_LINK_ORDERS, ORDER_LINK_STATUSES } from '../data/orderLinking'
import { orderStatusWord } from '../data/orderVocab'
import { usePatient } from '../data/patient-context'
import { useEncounterSession } from '../host/encounterArea'
import { PBDataWindow, PBDropDownDataWindow, PBGroup, PBLabel, PBTextArea, pbSlug } from '../pb'
import { CmdButton } from './CmdButton'
import { ModalWindow } from './dialogKit'

/* ============================================================================
   Order Linking Service — the Patient Chart's Taskbar `Link to Order`.

   Available from Measures, Imaging, Consults and Procedures. It lists the
   chart's outstanding orders; picking one and pressing `Link` ties the record
   that was selected in the folder behind to that order, and the folder row's
   `Links` cell goes from `-` to a link indicator. Invoking `Link to Order`
   again on an already-linked record unlinks it.

   PROVENANCE: 2026-09-29 TRAINING capture c04 (chart 3924, raised from a
   Measurements record's `Link to Order`) and c05 (the same window with the
   first row's Status list dropped). Both are 2x; every figure below is the
   capture's pixel ÷ 2, measured from the window's outer edge (c04 x 101,
   y 45). The earlier 1x reading (`303792 / 18088c4cd7da`) is superseded.

     window      901 x 698, centred on the frame (c04 x 101–1903, y 45–1442)
     caption     30 tall
     frame       one 1px #646464 box, x 3–896, y 34–649, holding:
       strip     27 tall, a #c1eafc → white vertical gradient, 1px rule under
       grid      header at y 62, 18px band, rule under it at y 456
       lower     window face, the Comment group box inside
     Comment     group line x 20–879, y 467–636 (pale #dcdcdc); its edit
                 x 28–868, y 477–627
     Link        x 352, Cancel x 436; both 75 x 25 at y 660 — left of centre
     row text    about half a pixel a letter wider than the kit's face; the
                 Date column centres its text, Order By sits 1px off its rule

   Left as it is (kit behaviour, not this file's): the gutter is 16 wide in
   c04 and the kit's 13, which Date absorbs; c05's dropped list has 19px
   rows, shows all sixteen statuses at once and hangs off the right of the
   MOIS window, where the kit's DDDW list is 18px rows, 232 tall (it
   scrolls) and is kept inside the desktop; the Status field's text sits 7px
   in rather than the kit field's 4.
   ========================================================================= */

const W = 901
const H = 698
const TITLEBAR_H = 30
/** the Comment legend's line box; the group's line runs through its middle */
const LEGEND_H = 14

/** capture px (2x, c04) → client x / y: half, less the 1px window edge and
    the caption */
const cx = (px: number) => (px - 101) / 2 - 1
const cy = (px: number) => (px - 45) / 2 - 1 - TITLEBAR_H

/** the identity strip's label and value stops, from c04's text runs */
const STRIP: { label: string; at: number; valueAt: number; key: 'chart' | 'patient' | 'dob' | 'sex' | 'bchn' }[] = [
  { label: 'Chart:', at: 127, valueAt: 200, key: 'chart' },
  { label: 'Patient:', at: 375, valueAt: 458, key: 'patient' },
  { label: 'DoB:', at: 888, valueAt: 950, key: 'dob' },
  { label: 'Sex:', at: 1136, valueAt: 1180, key: 'sex' },
  { label: 'BC Health No.:', at: 1298, valueAt: 1458, key: 'bchn' },
]

/** column widths off c04's header separators (x 142 · 294 · 536 · 750 · 1327
    · 1437 · 1621 · 1763 · 1853); the run past Links is empty white band.
    Date is 76 there, but c04's gutter is 16 and the kit's 13, so Date takes
    the difference and every column after it lands on its capture edge. */
const COLS = { date: 78, orderBy: 120, referral: 106, description: 288, detail: 54, status: 91, priority: 70, links: 44 }
/** c04's row text runs about half a pixel a letter wider than the kit's face
    at the same cap height (PLMS … REQUISITION: 257 against 234), which is
    what makes the long lab descriptions end in "REQUISI…" there; the
    captions above them match without it */
const spaced = (text: string, indent = 0, spacing = 0.5) => (
  <span style={{ letterSpacing: spacing, marginLeft: indent || undefined }}>{text}</span>
)

/** the gutter plus each column and its 1px rule */
const GRID_W = 13 + Object.values(COLS).reduce((sum, w) => sum + w + 1, 0)

export function OrderLinkingServiceDialog({ onLink, onClose }: {
  /** `Link` — the caller flips the source row's `Links` cell */
  onLink?: (row: OrderLinkRow) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const records = useChartRecords('order', 'dtm_ord_date')
  /* "outstanding orders" only: a completed order has nothing left to link. */
  const outstanding = records.filter(r => r.str_status !== 'CM' && r.str_status !== 'COMPLETED')
  /* A chart c04 lists (3924) shows its captured orders; an exported chart
     shows its own. */
  const captured = ORDER_LINK_ORDERS[patient.chart]
  const [rows, setRows] = useState<OrderLinkRow[]>(() => captured
    ? captured.map((r) => ({ ...r }))
    : outstanding.map(r => ({ date: date(r.dtm_ord_date), orderBy: r.str_order_by ?? '', referral: r.str_performed_by ?? '', description: r.str_description ?? '', detail: r.str_note ?? '', status: orderStatusWord(r.str_status), priority: r.str_priority_code ?? '', links: r.num_results ?? '' })))
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
        else orderLinks[id] = (captured ? undefined : outstanding[rows.indexOf(row)]?.id_order) ?? row.date
        return { ...s, orderLinks }
      })
    }
    onLink?.(row)
  }
  const [current, setCurrent] = useState(0)

  const picked = rows[Math.min(current, Math.max(0, rows.length - 1))]

  const middle = patient.middle ? ` ${patient.middle[0]}.` : ''
  const identity = {
    chart: patient.chart,
    patient: ORDER_LINK_IDENTITY[patient.chart]?.patient ?? `${patient.first}${middle} ${patient.last}`.toUpperCase(),
    dob: patient.dob,
    sex: patient.sex,
    bchn: ORDER_LINK_IDENTITY[patient.chart]?.bchn ?? patient.bchn ?? '',
  }

  return (
    <ModalWindow
      title="Order Linking Service"
      onClose={onClose}
      zIndex={80}
      windowStyle={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
    >
        <div
          data-tutorial-id="host.mois.dialog.order-linking-service"
          style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}
        >
          {/* one framed box: identity strip, order grid, Comment panel */}
          <div
            style={{
              position: 'absolute', left: cx(108), width: 893, top: cy(113), height: cy(1344) - cy(113),
              border: '1px solid #646464', boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* the chart identity strip: dim captions, bold values */}
            <div
              style={{
                position: 'relative', flex: '0 0 auto', height: 26,
                borderBottom: '1px solid #646464',
                background: 'linear-gradient(#c1eafc, #ffffff)',
              }}
            >
              {STRIP.map((s) => (
                <span key={s.key}>
                  <span style={{ position: 'absolute', left: cx(s.at) - cx(109), top: 5 }}>
                    <PBLabel dim>{s.label}</PBLabel>
                  </span>
                  <span style={{ position: 'absolute', left: cx(s.valueAt) - cx(109), top: 5, fontWeight: 700 }}>
                    {identity[s.key]}
                  </span>
                </span>
              ))}
            </div>

            {/* the grid stops at Links; the run past it is white band */}
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
              <PBDataWindow
                flush
                rows={rows}
                current={current}
                onCurrentChange={setCurrent}
                rowTutorialId={(r) => `host.mois.row.order-${pbSlug(r.date)}`}
                columns={[
                  { key: 'date', header: 'Date', width: COLS.date, align: 'center', render: (r) => spaced(r.date, 4, 0.35) },
                  /* c04 sets Order By 1px off its rule, not the band's 4 */
                  { key: 'orderBy', header: 'Order By', width: COLS.orderBy, render: (r) => spaced(r.orderBy, -3) },
                  { key: 'referral', header: 'Referral / Facility', width: COLS.referral, render: (r) => spaced(r.referral) },
                  /* c04 sets this column's text 5px in, not the band's 4 */
                  { key: 'description', header: 'Description', width: COLS.description, render: (r) => spaced(r.description, 1) },
                  { key: 'detail', header: 'Detail', width: COLS.detail, render: (r) => spaced(r.detail) },
                  {
                    key: 'status',
                    header: 'Status',
                    width: COLS.status,
                    /* an in-cell drop-down: c05 drops a Status | Description
                       list of sixteen statuses */
                    render: (r, i) => (
                      <span
                        data-tutorial-id={`host.mois.cell.status-${pbSlug(r.date)}`}
                        /* the control fits the 18px band and fills the
                           column edge to edge; its face takes the row's
                           colour (salmon, zebra grey) as c04 shows */
                        style={{
                          display: 'block', margin: '0 calc(-1 * var(--pb-dw-pad-x, 4px))',
                          ['--pb-row-h' as string]: '16px', ['--pb-field-bg' as string]: 'transparent',
                        }}
                      >
                        <PBDropDownDataWindow
                          w="100%"
                          listW={352}
                          value={r.status}
                          display="status"
                          columns={[
                            { key: 'status', header: 'Status', width: 126 },
                            { key: 'description', header: 'Description' },
                          ]}
                          rows={ORDER_LINK_STATUSES}
                          onSelect={(s) => setRows((all) => all.map((row, j) => (j === i ? { ...row, status: s.status } : row)))}
                        />
                      </span>
                    ),
                  },
                  { key: 'priority', header: 'Priority', width: COLS.priority, render: (r) => spaced(r.priority) },
                  { key: 'links', header: 'Links', width: COLS.links, align: 'center' },
                ]}
                empty="This chart has no outstanding orders."
                style={{
                  flex: `0 0 ${GRID_W}px`, minWidth: 0,
                  ['--pb-dw-row-h' as string]: '18px',
                }}
              />
            </div>

            {/* the Comment panel: window face under a rule */}
            <div
              style={{
                position: 'relative', flex: '0 0 191px',
                borderTop: '1px solid #646464', background: 'var(--pb-face)',
              }}
            >
              {/* c04: the group's line x 141–1858, y 982–1320 (a pale
                  #dcdcdc); its edit 9 in from the line at the left, 11 at
                  the right, 11 below the top line, 7 above the bottom. The
                  fieldset box starts at the legend's top, half a legend
                  above the line. */}
              <div style={{ position: 'absolute', left: 15, width: 859, top: 10 - LEGEND_H / 2, height: 171 + LEGEND_H / 2 }}>
                <PBGroup
                  title={<span style={{ fontWeight: 400, color: 'var(--pb-text)', marginLeft: 2 }}>Comment</span>}
                  fill
                  style={{ height: '100%', borderColor: '#dcdcdc', padding: `${10 - LEGEND_H / 2}px 10px 7px 8px` }}
                >
                  <PBTextArea
                    w="100%"
                    readOnly
                    value={picked?.detail ?? ''}
                    style={{ flex: '1 1 auto', minHeight: 0, background: '#fff' }}
                  />
                </PBGroup>
              </div>
            </div>
          </div>

          {/* Link / Cancel, left of centre, as c04 places them */}
          {/* not `link-to-order`: that is the Taskbar button behind this
              window, and an anchor lookup takes the first match on screen.
              CmdButtons, so a learner's press reports itself too. */}
          <CmdButton
            style={{ position: 'absolute', left: cx(807), top: cy(1365), width: 75, height: 25, minWidth: 0 }}
            command="order-linking-link"
            disabled={!picked}
            onClick={() => picked && link(picked)}
          >
            Link
          </CmdButton>
          <CmdButton
            style={{ position: 'absolute', left: cx(975), top: cy(1365), width: 75, height: 25, minWidth: 0 }}
            command="order-linking-cancel"
            onClick={onClose}
          >
            Cancel
          </CmdButton>
        </div>
    </ModalWindow>
  )
}
