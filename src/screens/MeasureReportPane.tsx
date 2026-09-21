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
        <span>Value:</span><div className="pb-row">{input('value', 100)}{input(undefined, 60)}<span>Flag:</span>{input('flag', 58)}</div>
        <span>Ref. Ranges:</span><div className="pb-row"><PBInput w={62} className="pb-measure-range" readOnly /><span>to</span><PBInput w={62} className="pb-measure-range" readOnly /><span>Status:</span>{input('status', 58)}</div>
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
