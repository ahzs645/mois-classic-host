import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBGroupBox, PBInput, PBSelect,
  PBTabs, PBViewHeader, PBWindow, pbSlug,
} from '../pb'
import {
  CDX, CDX_COMMAND_W, CDX_GLOSSARY, CDX_GRID, INBOUND_COLUMNS, INBOUND_COMMANDS,
  INBOUND_FILTERS, INBOUND_ROWS, INBOUND_TABS, MESSAGE_DETAIL_ACTIONS,
  MESSAGE_DETAIL_COLUMNS, MESSAGE_DETAIL_MATCH_TEXT, MESSAGE_DETAIL_PATIENT,
  MESSAGE_DETAIL_PREVIEW, MESSAGE_DETAIL_ROWS, OUTBOUND_COLUMNS, OUTBOUND_COMMANDS,
  OUTBOUND_FILTERS, OUTBOUND_ROWS, PAP_NAVIGATOR, QUALITY_REVIEW_COLUMNS, QUALITY_REVIEW_FILTERS,
  QUALITY_REVIEW_ROWS, RECORD_NAVIGATOR_COLUMNS, RECORD_NAVIGATOR_MESSAGE,
  RECORD_NAVIGATOR_REPORT, RECORD_NAVIGATOR_ROWS, TRANSMISSION_LOG,
  TRANSMISSION_LOG_COLUMNS,
  type CdxColumn, type NavigatorRecord, type QualityReviewRow,
} from '../data/cdxMessages'
import { setTornOff, useTornOff } from '../data/exchangeStore'
import { usePatient } from '../data/patient-context'

/* ============================================================================
   CDX secure messaging: Inbound Messages, Outbound Messages, and the two
   windows they open.

   `304753/1dd503bc0674` (1024x745, 1:1, 2067 colours) is the true-colour
   reference capture for this whole family, and every grid colour below is
   measured from it rather than from a palettised classic shot.

   What the capture disagrees with the prose about, and where the capture
   wins:
     - the inbound grid has NINE columns, not the five the prose names;
     - the outbound grid carries `Sex` and a paperclip count the prose has
       no entry for;
     - `Quality Review (0)` in one capture, bare `Quality Review` in another
       that simultaneously shows 18 errors and 23 warnings, so the number in
       the caption does not track the grid.

   Measurements and their citations live in `data/cdxMessages.ts`.

   The view-header band measures exactly (0,64,128); the kit's `--pb-navy` is
   #004081, one step off, so these screens set the token to the measured value
   rather than letting a one-bit difference through.
   ========================================================================= */

/** the #c0ffc0 filter panel above every CDX list */
function FilterBand({ children, anchor }: { children: ReactNode; anchor: string }) {
  return (
    /* The band's contents were transcribed in order, but their x positions
       were not measured, so the wrap below is layout, not geometry. */
    <div
      className="pb-row pb-row--wrap"
      data-tutorial-id={anchor}
      style={{
        background: CDX.filterBand,
        padding: '4px 6px',
        gap: '4px 8px',
        flex: 'none',
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  )
}

const L = ({ children }: { children: ReactNode }) => (
  <span className="pb-form__label">{children}</span>
)

/** every CDX grid: 16px header band, 17px rows, #e8e8e8 zebra, salmon current */
const gridStyle = {
  ['--pb-dw-row-h' as string]: `${CDX_GRID.rowPitch}px`,
  ['--pb-dw-header' as string]: CDX.gridHeader,
  ['--pb-dw-row-alt' as string]: CDX.rowAlt,
  ['--pb-dw-select' as string]: CDX.select,
}

/** a column list turned into PBDataWindow columns, with the vendor's own
    glossary hung off each caption as its tooltip */
function columns<T extends Record<string, any>>(
  cols: CdxColumn[],
  cell?: (col: CdxColumn, row: T, index: number) => ReactNode,
) {
  return cols.map((c) => ({
    key: c.key,
    header: CDX_GLOSSARY[c.header]
      ? <span title={CDX_GLOSSARY[c.header]}>{c.header}</span>
      : c.header,
    width: c.width,
    align: c.align,
    render: cell ? (row: T, i: number) => cell(c, row, i) : undefined,
  }))
}

/* ===========================================================================
   Inbound Messages
   ======================================================================== */
export function InboundMessagesView({
  onOpenDetail, onTearOff,
}: {
  onOpenDetail?: () => void
  onTearOff?: () => void
}) {
  const [tab, setTab] = useState(INBOUND_TABS[0]!)
  const [cur, setCur] = useState(0)
  const [includeWarnings, setIncludeWarnings] = useState(true)

  return (
    <div
      className="pb-screen"
      style={{ ['--pb-navy' as string]: CDX.viewHeader }}
    >
      <PBViewHeader title="Inbound Messages" right={<span>CDX E2E Messaging</span>} />
      <PBCommandRow
        commands={INBOUND_COMMANDS.map((label) => ({
          label,
          width: CDX_COMMAND_W,
          onClick: label.startsWith('Open Detail') ? onOpenDetail : undefined,
        }))}
      />

      <PBTabs tabs={[...INBOUND_TABS]} active={tab} onChange={setTab} compact>
        {tab === INBOUND_TABS[0] ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            <FilterBand anchor="host.mois.group.cdx-filter">
              <L>Date Range:</L>
              <PBInput w={76} align="center" defaultValue={INBOUND_FILTERS.from} data-tutorial-id="host.mois.field.date-range-from" />
              <span>(optional)</span>
              <PBInput w={76} align="center" defaultValue={INBOUND_FILTERS.to} data-tutorial-id="host.mois.field.date-range-to" />
              <span>(inclusive)</span>
              <L>Processing Status:</L>
              <PBSelect w={96} options={[...INBOUND_FILTERS.processingStatus]} data-tutorial-id="host.mois.field.processing-status" />
              <L>Batch Ref.:</L>
              <PBSelect w={130} options={[...INBOUND_FILTERS.batchRef]} data-tutorial-id="host.mois.field.batch-ref" />
              <L>PHN:</L>
              <PBInput w={100} data-tutorial-id="host.mois.field.phn" />
              <L>Chart Num.:</L>
              <PBInput w={60} data-tutorial-id="host.mois.field.chart-num" />
              <L>Patient Name:</L>
              <PBInput w={140} data-tutorial-id="host.mois.field.patient-name" />
              <L>Message From:</L>
              <PBInput w={150} data-tutorial-id="host.mois.field.message-from" />
            </FilterBand>

            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
              <PBDataWindow
                rows={INBOUND_ROWS}
                current={cur}
                onCurrentChange={setCur}
                onActivate={onOpenDetail}
                style={gridStyle}
                /* a full-width row is too wide to ring, so the anchors sit on
                   the two cells a lesson actually talks about */
                columns={columns(INBOUND_COLUMNS, (c, row) => (
                  c.key === 'patient' || c.key === 'status'
                    ? (
                      <span data-tutorial-id={`host.mois.cell.${pbSlug(c.key)}-${pbSlug(String(row.patient))}`}>
                        {String(row[c.key] ?? '')}
                      </span>
                    )
                    : String(row[c.key] ?? '')
                ))}
                empty="No messages retrieved."
              />
            </div>
          </div>
        ) : (
          <QualityReviewTab
            includeWarnings={includeWarnings}
            onIncludeWarnings={setIncludeWarnings}
            onTearOff={onTearOff}
          />
        )}
      </PBTabs>
    </div>
  )
}

/* --- the Quality Review tab ----------------------------------------------
   Shared by Inbound Messages and Data Exchange ▸ Lab Results: 303384 says
   the Quality Review "is available from both the Lab Results and Inbound
   Messages folders" and "the list of records is the same for both". */
export function QualityReviewTab({
  includeWarnings, onIncludeWarnings, onTearOff,
}: {
  includeWarnings: boolean
  onIncludeWarnings: (v: boolean) => void
  /** the row whose Tear Off was pressed, `''` for Tear Off All */
  onTearOff?: (item: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      <div
        className="pb-band"
        data-tutorial-id="host.mois.group.messages-flagged-for-review"
        style={{ background: CDX.bandClassic }}
      >
        <span>Messages Flagged for Review</span>
        <span className="pb-band__spacer" />
        {/* checked in the capture */}
        <PBCheckbox label="Include Warnings" checked={includeWarnings} onChange={onIncludeWarnings} />
      </div>

      <FilterBand anchor="host.mois.group.quality-review-filter">
        <L>Downloaded From:</L>
        <PBInput w={76} align="center" defaultValue={QUALITY_REVIEW_FILTERS.from} data-tutorial-id="host.mois.field.downloaded-from" />
        <L>To:</L>
        <PBInput w={76} align="center" defaultValue={QUALITY_REVIEW_FILTERS.to} data-tutorial-id="host.mois.field.downloaded-to" />
        <span>(optional)</span>
      </FilterBand>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={QUALITY_REVIEW_ROWS}
          style={gridStyle}
          rowTutorialId={(r: QualityReviewRow) => (
            r.total ? 'host.mois.row.quality-review-total' : `host.mois.row.${pbSlug(r.item)}`
          )}
          columns={QUALITY_REVIEW_COLUMNS.map((c) => ({
            key: c.key,
            header: c.header,
            width: c.width,
            align: c.align,
            render: (r: QualityReviewRow) => {
              if (c.key === 'tear') {
                return (
                  <PBButton
                    size="sm"
                    data-tutorial-id={
                      r.total ? 'host.mois.command.tear-off-all' : `host.mois.command.tear-off-${pbSlug(r.item)}`
                    }
                    onClick={() => { setTornOff(r.item); onTearOff?.(r.item) }}
                  >
                    {r.total ? 'Tear Off All' : 'Tear Off'}
                  </PBButton>
                )
              }
              const v = String(r[c.key as keyof QualityReviewRow] ?? '')
              /* the total row is bold in the capture */
              return r.total ? <b>{v}</b> : v
            },
          }))}
        />
      </div>
    </div>
  )
}

/* ===========================================================================
   Outbound Messages
   ======================================================================== */
export function OutboundMessagesView({
  onOpenDetail, onOpenChart,
}: {
  onOpenDetail?: () => void
  onOpenChart?: () => void
}) {
  const [cur, setCur] = useState(0)
  /* the log is drawn bottom-up in the capture: SENT_OK is the selected row,
     and it is the newest of the three */
  const [logCur, setLogCur] = useState(0)

  return (
    <div className="pb-screen" style={{ ['--pb-navy' as string]: CDX.viewHeader }}>
      <PBViewHeader title="Outbound Messages" right={<span>CDX E2E Messaging</span>} />
      <PBCommandRow
        commands={OUTBOUND_COMMANDS.map((label) => ({
          label,
          width: CDX_COMMAND_W,
          onClick: label === 'Open Chart'
            ? onOpenChart
            : label.startsWith('Open Detail') ? onOpenDetail : undefined,
        }))}
      />

      <FilterBand anchor="host.mois.group.cdx-filter">
        <L>Date Range:</L>
        <PBInput w={76} align="center" data-tutorial-id="host.mois.field.date-range-from" />
        <PBInput w={76} align="center" data-tutorial-id="host.mois.field.date-range-to" />
        <L>Transmission Status:</L>
        <PBSelect w={110} options={[...OUTBOUND_FILTERS.transmissionStatus]} data-tutorial-id="host.mois.field.transmission-status" />
        <L>Chart Num.:</L>
        <PBInput w={60} data-tutorial-id="host.mois.field.chart-num" />
        <L>Patient Name:</L>
        <PBInput w={140} data-tutorial-id="host.mois.field.patient-name" />
        <L>Message From:</L>
        <PBInput w={150} data-tutorial-id="host.mois.field.message-from" />
      </FilterBand>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={OUTBOUND_ROWS}
          current={cur}
          onCurrentChange={setCur}
          onActivate={onOpenDetail}
          style={gridStyle}
          columns={columns(OUTBOUND_COLUMNS, (c, row) => (
            c.key === 'patient' || c.key === 'status'
              ? (
                <span data-tutorial-id={`host.mois.cell.${pbSlug(c.key)}-${pbSlug(String(row.patient))}`}>
                  {String(row[c.key] ?? '')}
                </span>
              )
              : String(row[c.key] ?? '')
          ))}
          empty="No messages retrieved."
        />
      </div>

      {/* --- the lower group: the selected message's transmission log ----- */}
      <div
        data-tutorial-id="host.mois.group.transmission-log"
        style={{ flex: 'none', height: 118, display: 'flex', padding: '0 3px 3px' }}
      >
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Transmission Log</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              rows={TRANSMISSION_LOG}
              current={logCur}
              onCurrentChange={setLogCur}
              style={gridStyle}
              flush
              rowTutorialId={(r) => `host.mois.row.${pbSlug(r.status)}`}
              columns={columns(TRANSMISSION_LOG_COLUMNS)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===========================================================================
   Patient Message Detail — what `Open Detail (F4)` opens on an inbound row.
   304753/70a523664c14, 1004x717.
   ======================================================================== */
export function PatientMessageDetailWindow({ onClose }: { onClose?: () => void }) {
  const [cur, setCur] = useState(0)
  const stat = (label: string, value: string) => (
    <div className="pb-row" key={label} style={{ gap: 6 }}>
      <span className="pb-form__label" style={{ width: 74 }}>{label}</span>
      <b>{value}</b>
    </div>
  )

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Patient Message Detail"
        onClose={onClose}
        style={{ width: 'min(1004px, calc(100vw - 40px))', height: 'min(717px, calc(100vh - 60px))' }}
      >
        <div
          data-tutorial-id="host.mois.dialog.patient-message-detail"
          style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0, gap: 4, padding: 5 }}>
            <div className="pb-row" style={{ gap: 6, alignItems: 'stretch' }}>
              <PBGroupBox title="Patient Data From Message" style={{ flex: '1 1 auto' }}>
                {stat('Patient:', MESSAGE_DETAIL_PATIENT.patient)}
                {stat('DOB:', MESSAGE_DETAIL_PATIENT.dob)}
                {stat('Sex:', MESSAGE_DETAIL_PATIENT.sex)}
                {stat('Insurance:', MESSAGE_DETAIL_PATIENT.insurance)}
                {/* the identifier sub-panel: one row per scheme */}
                <div style={{ border: '1px solid #b6b6b6', marginTop: 4, padding: '2px 4px' }}>
                  {MESSAGE_DETAIL_PATIENT.identifiers.map((id) => (
                    <div className="pb-row" key={id.scheme} style={{ gap: 6 }}>
                      <span className="pb-form__label" style={{ width: 62 }}>{id.scheme}</span>
                      <b>{id.value}</b>
                    </div>
                  ))}
                </div>
              </PBGroupBox>

              <PBGroupBox title="Matching Patient Chart Information" style={{ flex: '1 1 auto' }}>
                <div style={{ whiteSpace: 'normal', lineHeight: 1.35, marginBottom: 6 }}>
                  {MESSAGE_DETAIL_MATCH_TEXT}
                </div>
                <PBButton data-tutorial-id="host.mois.command.match-patient">Match Patient</PBButton>
              </PBGroupBox>
            </div>

            <div className="pb-groupbox" style={{ flex: 'none', height: 110, display: 'flex', flexDirection: 'column' }}>
              <PBBand>Messages</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                rows={MESSAGE_DETAIL_ROWS}
                current={cur}
                onCurrentChange={setCur}
                style={gridStyle}
                flush
                columns={columns(MESSAGE_DETAIL_COLUMNS, (c, row) => (
                  c.key === 'docType'
                    ? (
                      <span data-tutorial-id={`host.mois.cell.doc-type-${pbSlug(String(row.facilityRef))}`}>
                        {String(row[c.key] ?? '')}
                      </span>
                    )
                    : String(row[c.key] ?? '')
                ))}
              />
              </div>
            </div>

            {/* --- the CDX print preview: #3196bd row headers, white bold
                text, over #efefef value cells with navy text ------------- */}
            <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <PBBand>Detail</PBBand>
              <div data-tutorial-id="host.mois.field.cdx-preview" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                  <tbody>
                    {MESSAGE_DETAIL_PREVIEW.map((r) => (
                      <tr key={r.label}>
                        <th
                          style={{
                            width: 150,
                            background: CDX.previewHead,
                            color: '#ffffff',
                            fontWeight: 700,
                            textAlign: 'left',
                            padding: '2px 6px',
                            border: '1px solid #ffffff',
                          }}
                        >
                          {r.label}
                        </th>
                        <td
                          style={{
                            background: CDX.previewCell,
                            color: '#000080',
                            padding: '2px 6px',
                            border: '1px solid #ffffff',
                            whiteSpace: 'normal',
                          }}
                        >
                          {r.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- right rail: Actions ---------------------------------- */}
          <div
            data-tutorial-id="host.mois.group.actions"
            style={{ width: 240, flex: 'none', padding: '5px 6px 5px 0', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <span className="pb-form__label">Actions:</span>
            {MESSAGE_DETAIL_ACTIONS.map((a) => (
              <button
                key={a}
                className="pb-link"
                data-tutorial-id={`host.mois.command.${pbSlug(a.split(' ')[0]!)}`}
                style={{ textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.3 }}
              >
                {a}
              </button>
            ))}
            <span style={{ flex: '1 1 auto' }} />
            <PBButton onClick={onClose} data-tutorial-id="host.mois.command.close-window">Close Window</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

/* ===========================================================================
   Record Navigator — the Quality Review "tear off".
   304754/72cdbce06e3b, 753x706.

   Its selected record row is (247,199,189), a distinctly LIGHTER salmon than
   the #e89c84 every other grid uses, and unique to this window.
   ======================================================================== */
/* The Measures tear-off lists the pap result (333106, image ed8af8c2) on
   the chart the stage has open; pressing it goes to that record in the
   chart's Measurements folder, which is what 303507 means by "click on the
   record you would like to adjust to navigate to that record". The other
   rows are the CDX capture's own patients, who have no chart here, so
   pressing one of those only selects it. */
const RECORD_FOLDER: Record<string, string> = {
  MEASURE: 'measures', IMAGING: 'imaging', CONSULT: 'consults', PROCEDURE: 'procedures',
  DOCUMENT: 'documents', ORDER: 'orders', ADMISSION: 'admissions',
}

export function RecordNavigatorWindow({ onClose, onOpenRecord }: {
  onClose?: () => void
  /** go to a record on the open chart: the Patient Chart folder that holds it */
  onOpenRecord?: (node: string) => void
}) {
  const torn = useTornOff()
  const patient = usePatient()
  const pap = torn === 'Measures'
  const rows: NavigatorRecord[] = pap
    ? [{
      patient: `${patient.last}, ${patient.first}`.toUpperCase(),
      type: PAP_NAVIGATOR.type, date: PAP_NAVIGATOR.date, description: PAP_NAVIGATOR.description, detail: '',
    }]
    : RECORD_NAVIGATOR_ROWS
  const [cur, setCur] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const patients = [...new Set(rows.map((r) => r.patient))]

  return (
    /* 303507: "Keeping the Record Navigator open beside the patient's chart"
       — so it stands at the right of the desktop, not over the chart's grid */
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85, placeItems: 'center end', paddingRight: 8, pointerEvents: 'none' }}>
      <PBWindow
        child
        controls={false}
        title="Record Navigator"
        onClose={onClose}
        style={{ width: 'min(600px, calc(100vw - 40px))', height: 'min(706px, calc(100vh - 60px))', pointerEvents: 'auto' }}
      >
        <div
          data-tutorial-id="host.mois.dialog.record-navigator"
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
        >
        <div className="pb-row" style={{ gap: 12, padding: '4px 6px', flex: 'none' }}>
          <button className="pb-link" data-tutorial-id="host.mois.command.expand-all" onClick={() => setCollapsed(new Set())}>
            Expand All
          </button>
          <button className="pb-link" data-tutorial-id="host.mois.command.collapse-all" onClick={() => setCollapsed(new Set(patients))}>
            Collapse All
          </button>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 5px' }}>
          <PBDataWindow
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            groupBy={(r: NavigatorRecord) => r.patient}
            groupLabel={(patient, rows) => `${patient} [${rows.length}]`}
            groupTutorialId={(patient) => `host.mois.group.${pbSlug(patient)}`}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            style={{
              /* header #d6d3ce, patient bands (222,235,255), child rows
                 alternating (239,235,239) with white, selected (247,199,189) */
              ['--pb-dw-header' as string]: '#d6d3ce',
              ['--pb-dw-group' as string]: CDX.navGroup,
              ['--pb-dw-row-alt' as string]: CDX.navRowAlt,
              ['--pb-dw-select' as string]: CDX.navSelect,
            }}
            columns={RECORD_NAVIGATOR_COLUMNS.map((c) => ({
              key: c.key,
              header: c.header,
              width: c.width,
              align: c.align,
              render: c.key === 'description'
                ? (r: NavigatorRecord) => (
                  <span
                    data-tutorial-id={`host.mois.cell.description-${pbSlug(r.description)}`}
                    onClick={pap && RECORD_FOLDER[r.type] ? () => onOpenRecord?.(RECORD_FOLDER[r.type]!) : undefined}
                  >
                    {r.description}
                  </span>
                )
                : undefined,
            }))}
          />
        </div>

        <div style={{ flex: 'none', padding: 5, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <PBGroupBox title="Messages">
            <div className="pb-row" style={{ gap: 6 }} data-tutorial-id="host.mois.field.navigator-message">
              {pap ? (
                /* an error, not a warning: the red circle in ed8af8c2 */
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" fill="#d33" />
                  <path d="M5 5l6 6M11 5l-6 6" stroke="#fff" strokeWidth="1.8" />
                </svg>
              ) : (
                <svg width="14" height="13" viewBox="0 0 16 15" aria-hidden="true">
                  <path d="M8 1l7 13H1z" fill="#f2c200" stroke="#b08c00" />
                  <path d="M7.2 5.5h1.6v5H7.2z" fill="#3a2f00" />
                  <circle cx="8" cy="12" r="1" fill="#3a2f00" />
                </svg>
              )}
              <span>{pap ? PAP_NAVIGATOR.message : RECORD_NAVIGATOR_MESSAGE}</span>
            </div>
          </PBGroupBox>

          <div className="pb-groupbox">
            <PBBand>Report</PBBand>
            <div
              data-tutorial-id="host.mois.field.navigator-report"
              style={{
                height: 130,
                overflow: 'auto',
                background: '#fff',
                padding: '4px 8px',
                fontFamily: 'var(--pb-font-mono)',
                fontSize: 11,
                whiteSpace: 'pre',
              }}
            >
              {pap ? PAP_NAVIGATOR.report : RECORD_NAVIGATOR_REPORT}
            </div>
          </div>
        </div>
        </div>
      </PBWindow>
    </div>
  )
}
