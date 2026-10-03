import { PBInput, PBLookup, PBTextArea } from '../pb'

/** Report and Detail are different DataWindows. Geometry checked in the
 * live TRAINING client on 2026-09-21; values come only from the selected row.
 *
 * MOIS DEV v02.31.23 (field audit, 1x): the Detail tab's result block is
 * wider than Report's — Test Name runs 320 to Report's 280, and Flag and
 * Status are 28px boxes there against 60 (evidence/MATRIX-R0502-test-name
 * against MATRIX-R0490-test-name). LOINC is a printed value, not a box; of
 * the four provenance lines only Report By has no time box, Perform By's and
 * Collect By's are masked " : " and Transcribed's is blank
 * (MATRIX-R0502, MATRIX-R0517-collect-note). */
export function MeasureReportPane({ detail, row }: { detail: boolean; row?: Record<string, string> }) {
  const value = (key: string) => row?.[key] ?? ''
  const input = (key?: string, width?: number) => <PBInput w={width ?? '100%'} value={key ? value(key) : ''} readOnly />
  const small = detail ? 28 : 58
  return <div className="pb-measure-pane">
    <div className="pb-measure-pane__top">
      <div className="pb-measure-pane__result" style={detail ? { width: 390 } : undefined}>
        <span>Test Name:</span>{input('test')}
        <span>Value:</span><div className="pb-row">{input('value', 100)}{input('units', 60)}<span>Flag:</span>{input('flag', small)}</div>
        <span>Ref. Ranges:</span><div className="pb-row"><PBInput w={62} className="pb-measure-range" value={value('lower')} readOnly /><span>to</span><PBInput w={62} className="pb-measure-range" value={value('upper')} readOnly /><span>Status:</span>{input('status', small)}</div>
      </div>
      <div className="pb-measure-pane__ordering">
        {detail ? <>
          <span>Facility:</span>{input('facility')}
          <span>Facility Loc.:</span>{input('facilityLocation')}
          <span>Facility Ref.:</span>{input('facilityReference')}
        </> : <>
          <span>Order Date:</span><div className="pb-row">{input('orderDate', 98)}<span>Order #:</span>{/* greyed, with its "…": set by Link to Order, never typed (2026-09-29 TRAINING captures c01, c02) */}<PBLookup w="100%" value={value('orderNumber')} readOnly disabled /></div>
          <span>Ordered By:</span>{input('by')}
          <span>Copies To:</span>{input('copiesTo')}
        </>}
      </div>
    </div>
    {detail ? <>
      <div className="pb-measure-pane__codes"><span>MOIS Code:</span>{input('code', 100)}<span>LOINC:</span><span>{value('loinc')}</span></div>
      <div className="pb-measure-pane__provenance">
        {[
          ['Perform By:', 'performedBy', 'performedDate', 'Ord. Name:', 'orderName', ':', 'performedTime'],
          ['Report By:', 'reportedBy', 'reportedDate', 'Volume:', 'volume', null, ''],
          ['Transcribed:', 'transcribedBy', 'transcribedDate', 'Category:', 'category', '', 'transcribedTime'],
          ['Collect By:', 'collectedBy', 'collected', 'Specimen Src.:', 'specimen', ':', 'collectedTime'],
        ].map(([label, by, date, right, key, time, timeKey]) => <div className="pb-measure-pane__provenance-row" key={label}>
          <span>{label}</span>{input(by ?? '')}<span>Date:</span>{input(date ?? '')}
          {/* Report By's line keeps the time box's place empty; the others
              print the record's time over their empty mask (302837 "Collect
              Date: The date and time that the measurement was collected";
              `3b59a254…` Collect By 2018.04.20 | 00:01). Collect By's time is
              num_collect_hr / num_collect_min (charts/to-rows.ts) */}
          {time === null ? <span style={{ width: 40 }} /> : <PBInput w={40} align="center" value={(timeKey && value(timeKey)) || time} readOnly />}
          <span>{right}</span>{input(key ?? '')}
        </div>)}
      </div>
      <div className="pb-measure-pane__note"><span>Collect Note:</span><PBTextArea value={value('collectNote')} readOnly /></div>
    </> : <>
      <div className="pb-measure-pane__note"><span>Report:</span><PBTextArea value={value('report')} readOnly /></div>
      <div className="pb-measure-pane__comments"><span>Comments:</span><PBTextArea value={value('comments')} readOnly /></div>
    </>}
  </div>
}

/* The Panel tab (302837 "Measures Panel Tab", `91cd8d02…`): the panel's name
   and Ordered By, its Panel Notes box, then every result the panel brought —
   Test Name, Value, Flag, Ref. Ranges, Units, Status. */
export function MeasurePanelPane({ panel }: {
  panel: { name: string; orderedBy: string; rows: Record<string, string>[] }
}) {
  if (!panel.rows.length) {
    return <div className="pb-dw__empty" style={{ padding: 24 }}>This result was not reported as part of a panel.</div>
  }
  const cell = { padding: '1px 4px', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }
  return <div data-tutorial-id="host.mois.field.panel-detail" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ border: '1px solid var(--pb-border)', background: '#fff', padding: '2px 6px' }}>
      <div className="pb-row" style={{ gap: 0 }}>
        <b style={{ width: 300 }}>{panel.name}</b>
        <span>Ordered By: {panel.orderedBy}</span>
      </div>
      <PBTextArea value="" readOnly rows={3} w="100%" aria-label="Panel Notes" />
    </div>
    <div style={{ border: '1px solid var(--pb-border)', background: '#fff' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: '38%' }} /><col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '16%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} /></colgroup>
        <thead><tr>{['Test Name', 'Value', 'Flag', 'Ref. Ranges', 'Units', 'Status'].map((h) => <th key={h} style={{ ...cell, textAlign: 'left', fontWeight: 400 }}>{h}</th>)}</tr></thead>
        <tbody>
          {panel.rows.map((r, i) => <tr key={i} style={{ background: i % 2 ? '#fff' : '#f0f0f0' }}>
            <td style={cell}>{r.test}</td><td style={cell}>{r.value}</td><td style={cell}>{r.flag === '-' ? '' : r.flag}</td>
            <td style={cell}>{r.lower || r.upper ? `${r.lower} - ${r.upper}` : ''}</td><td style={cell}>{r.units}</td><td style={cell}>{r.status}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>
}
