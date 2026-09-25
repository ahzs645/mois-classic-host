import { PBInput, PBTextArea } from '../pb'

/** Report and Detail are different DataWindows. Geometry checked in the
 * live TRAINING client on 2026-09-21; values come only from the selected row. */
export function MeasureReportPane({ detail, row }: { detail: boolean; row?: Record<string, string> }) {
  const value = (key: string) => row?.[key] ?? ''
  const input = (key?: string, width?: number) => <PBInput w={width ?? '100%'} value={key ? value(key) : ''} readOnly />
  return <div className="pb-measure-pane">
    <div className="pb-measure-pane__top">
      <div className="pb-measure-pane__result">
        <span>Test Name:</span>{input('test')}
        <span>Value:</span><div className="pb-row">{input('value', 100)}{input('units', 60)}<span>Flag:</span>{input('flag', 58)}</div>
        <span>Ref. Ranges:</span><div className="pb-row"><PBInput w={62} className="pb-measure-range" value={value('lower')} readOnly /><span>to</span><PBInput w={62} className="pb-measure-range" value={value('upper')} readOnly /><span>Status:</span>{input('status', 58)}</div>
      </div>
      <div className="pb-measure-pane__ordering">
        {detail ? <>
          <span>Facility:</span>{input('facility')}
          <span>Facility Loc.:</span>{input('facilityLocation')}
          <span>Facility Ref.:</span>{input('facilityReference')}
        </> : <>
          <span>Order Date:</span><div className="pb-row">{input('orderDate', 98)}<span>Order #:</span>{input('orderNumber')}</div>
          <span>Ordered By:</span>{input('by')}
          <span>Copies To:</span>{input('copiesTo')}
        </>}
      </div>
    </div>
    {detail ? <>
      <div className="pb-measure-pane__codes"><span>MOIS Code:</span>{input('code', 100)}<span>LOINC:</span>{input('loinc', 150)}</div>
      <div className="pb-measure-pane__provenance">
        {[
          ['Perform By:', 'performedBy', 'performedDate', 'Ord. Name:', 'orderName'],
          ['Report By:', 'reportedBy', 'reportedDate', 'Volume:', 'volume'],
          ['Transcribed:', 'transcribedBy', 'transcribedDate', 'Category:', 'category'],
          ['Collect By:', 'collectedBy', 'collected', 'Specimen Src.:', 'specimen'],
        ].map(([label, by, date, right, key]) => <div className="pb-measure-pane__provenance-row" key={label}>
          <span>{label}</span>{input(by)}<span>Date:</span>{input(date)}<PBInput w={40} value="" readOnly /><span>{right}</span>{input(key)}
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
