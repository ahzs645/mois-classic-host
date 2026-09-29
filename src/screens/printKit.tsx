import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { PBButton, PBGroup, PBInput, PBRadio, PBSelect } from '../pb'
import { DialogButton } from './WorkspaceDialogFrame'

/* ============================================================================
   The Print Preview window's left rail — the classic PowerBuilder DataWindow
   print panel (303518 `8fec3b9c`, 303590 `c7cb3ccf`, 303496 `8d18b9db`):
   the `Zoom To` group (200% · 100% · 75% · 50% · 25%), Percent, Copies,
   Apply, Change Header (greyed), Sort, a gap, [Fax — v02.31.23], Print All,
   Print Range, the range box, `Ex. 1,2,5-10,39`, Cancel, Save As and
   Printer Type.

   Three windows draw it, each built separately and each a little
   differently, so the rail keeps one item order and three skins — one per
   copy — that reproduce each copy's markup exactly:

   `skin="report"` — PrintPreviewWindow.tsx 100-140 (the Reports module's
     `print-preview`): everything inside one fieldset (legend in black,
     `margin: 0`), labels `pb-form__label`, DialogButtons 84 wide anchored
     `preview-*`, the range box 86, the hint 11px, Printer Type a PBSelect 88.
     Props: `zooms={['200', '100', '75', '50', '25']} zoomLabel={(z) => \`${z}%\`}
     zoomName="preview-zoom" zoom={zoom} onZoom={pickZoom} fax
     percent={{ value: percent, onChange: (e) => setPercent(e.target.value) }}
     copies={{ value: copies, onChange: … }} range={{ value: range, onChange: … }}
     onApply={…} onPrintAll={() => setPrinted('all')} onPrintRange={…}
     onCancel={close} printerTypes={['Report Printer', 'Form Printer']}`
   `skin="group"` — CarePlanWindows.tsx 152-175 (`care-plan-print-preview`):
     everything inside a PBGroup, each radio and button in its own div with
     the capture's top margins, plain-div labels, Print All the default
     button, ids `pp-*` / `print-all` / `print-range`, range box 88.
     Props: `zoomName="pp-zoom" zoom={zoom} onZoom={setZoom}
     percent={{ value: '125', readOnly: true }} copies={{ defaultValue: '1' }}
     range={{ defaultValue: 'All Pages' }} onPrintAll={close} onCancel={close}
     printerTypes={['Report Printer']}`
   `skin="split"` — ExchangeKit.tsx 163-200 (the Chart Export / Import log's
     `PrintPreviewWindow`): only zoom / Percent / Copies in the fieldset, the
     buttons below it as bare PBButtons (Cancel anchored
     `host.mois.command.cancel`, the rest unanchored), range box 100%, hint
     10px, Printer Type a read-only box.
     Props: `zoomName="zoom" zoom={zoom} onZoom={setZoom}
     percent={{ defaultValue: '125' }} copies={{ defaultValue: '1' }}
     range={{ defaultValue: 'All Pages' }} onCancel={onClose}
     printerTypes={['Report Printer']}`

   The rest of each window — its frame, the page pane, the Printer line —
   differs from copy to copy and stays the window's; PrintPreviewFrame is
   only the row that sets the rail beside it.
   ========================================================================= */

export type PrintRailSkin = 'report' | 'group' | 'split'
/** the props spread onto a rail edit box: `{ value, onChange }`, `{ value, readOnly }` or `{ defaultValue }` */
export type RailBox = InputHTMLAttributes<HTMLInputElement>

type RailIds = {
  apply: string; changeHeader: string; sort: string; fax: string
  printAll: string; printRange: string; cancel: string; saveAs: string
}

/* the command ids each skin's copy anchors its buttons with (`split` anchors
   only Cancel, and bare: `host.mois.command.cancel`) */
const IDS: Record<'report' | 'group', RailIds> = {
  report: {
    apply: 'preview-apply', changeHeader: 'preview-change-header', sort: 'preview-sort', fax: 'preview-fax',
    printAll: 'preview-print-all', printRange: 'preview-print-range', cancel: 'preview-cancel', saveAs: 'preview-save-as',
  },
  group: {
    apply: 'pp-apply', changeHeader: 'pp-change-header', sort: 'pp-sort', fax: 'pp-fax',
    printAll: 'print-all', printRange: 'print-range', cancel: 'pp-cancel', saveAs: 'pp-save-as',
  },
}

const ZOOMS = ['200%', '100%', '75%', '50%', '25%']
const HINT = 'Ex. 1,2,5-10,39'

export function PrintPreviewRail({
  skin, zooms = ZOOMS, zoomLabel = (z) => z, zoomName, zoom, onZoom,
  percent, copies, range, fax, ids,
  onApply, onPrintAll, onPrintRange, onCancel, printerTypes = ['Report Printer'],
}: {
  skin: PrintRailSkin
  /** the radio values, top down; default '200%' … '25%' */
  zooms?: readonly string[]
  /** a radio's label from its value; default the value */
  zoomLabel?: (z: string) => string
  /** the zoom radios' `name` */
  zoomName: string
  zoom: string
  onZoom: (z: string) => void
  percent: RailBox
  copies: RailBox
  range: RailBox
  /** v02.31.23's Fax button above Print All (dialog skins) */
  fax?: boolean
  /** override a dialog skin's command ids */
  ids?: Partial<RailIds>
  onApply?: () => void
  onPrintAll?: () => void
  onPrintRange?: () => void
  onCancel: () => void
  /** Printer Type's choices; `split` shows the first in a read-only box */
  printerTypes?: readonly string[]
}) {
  const radios = (wrap: boolean) => zooms.map((z) => {
    const radio = <PBRadio key={z} name={zoomName} label={zoomLabel(z)} checked={zoom === z} onChange={() => onZoom(z)} />
    return wrap ? <div key={z}>{radio}</div> : radio
  })

  if (skin === 'split') {
    return (
      <div style={{ width: 96, flex: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <fieldset className="pb-fieldset">
          <legend className="pb-fieldset__legend">Zoom To</legend>
          <div className="pb-fieldset__body" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {radios(false)}
            <span>Percent:</span><PBInput w={40} {...percent} />
            <span>Copies:</span><PBInput w={40} {...copies} />
          </div>
        </fieldset>
        <PBButton onClick={onApply}>Apply</PBButton>
        <PBButton disabled>Change Header</PBButton>
        <PBButton>Sort</PBButton>
        <span style={{ height: 14 }} />
        {fax && <PBButton>Fax</PBButton>}
        <PBButton onClick={onPrintAll}>Print All</PBButton>
        <PBButton onClick={onPrintRange}>Print Range</PBButton>
        <PBInput w="100%" {...range} />
        <span style={{ fontSize: 10 }}>{HINT}</span>
        <PBButton data-tutorial-id="host.mois.command.cancel" onClick={onCancel}>Cancel</PBButton>
        <PBButton>Save As</PBButton>
        <span>Printer Type</span>
        <PBInput w="100%" readOnly defaultValue={printerTypes[0]} />
      </div>
    )
  }

  const id = { ...IDS[skin], ...ids }

  if (skin === 'group') {
    /* each control in its own div, spaced by the capture's top margins */
    const at = (marginTop: number | undefined, node: ReactNode) => <div style={marginTop ? { marginTop } : undefined}>{node}</div>
    return (
      <div style={{ width: 100, flex: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <PBGroup title="Zoom To">
          {radios(true)}
          <div style={{ marginTop: 6 }}>Percent:</div><PBInput w={40} {...percent} />
          <div>Copies:</div><PBInput w={40} {...copies} />
          {at(6, <DialogButton id={id.apply} width={84} onClick={onApply}>Apply</DialogButton>)}
          {at(6, <DialogButton id={id.changeHeader} width={84} disabled>Change Header</DialogButton>)}
          {at(3, <DialogButton id={id.sort} width={84}>Sort</DialogButton>)}
          {fax
            ? <>{at(14, <DialogButton id={id.fax} width={84}>Fax</DialogButton>)}{at(3, <DialogButton id={id.printAll} width={84} isDefault onClick={onPrintAll}>Print All</DialogButton>)}</>
            : at(14, <DialogButton id={id.printAll} width={84} isDefault onClick={onPrintAll}>Print All</DialogButton>)}
          {at(3, <DialogButton id={id.printRange} width={84} onClick={onPrintRange}>Print Range</DialogButton>)}
          <PBInput w={88} {...range} />
          <div style={{ fontSize: 11 }}>{HINT}</div>
          {at(6, <DialogButton id={id.cancel} width={84} onClick={onCancel}>Cancel</DialogButton>)}
          {at(3, <DialogButton id={id.saveAs} width={84}>Save As</DialogButton>)}
          <div style={{ marginTop: 6 }}>Printer Type</div>
          <PBSelect w={88} options={printerTypes} />
        </PBGroup>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch', width: 96, flex: 'none' }}>
      <fieldset className="pb-fieldset" style={{ margin: 0 }}>
        <legend className="pb-fieldset__legend" style={{ color: '#000' }}>Zoom To</legend>
        <div className="pb-fieldset__body" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {radios(false)}
          <span className="pb-form__label" style={{ marginTop: 6 }}>Percent:</span>
          <PBInput w={38} {...percent} />
          <span className="pb-form__label">Copies:</span>
          <PBInput w={38} {...copies} />
          <DialogButton id={id.apply} width={84} onClick={onApply}>Apply</DialogButton>
          <DialogButton id={id.changeHeader} width={84} disabled>Change Header</DialogButton>
          <DialogButton id={id.sort} width={84}>Sort</DialogButton>
          <span style={{ height: 14 }} />
          {/* v02.31.23 adds Fax above Print All (user capture 2026-09-25 #23, #31) */}
          {fax && <DialogButton id={id.fax} width={84}>Fax</DialogButton>}
          <DialogButton id={id.printAll} width={84} onClick={onPrintAll}>Print All</DialogButton>
          <DialogButton id={id.printRange} width={84} onClick={onPrintRange}>Print Range</DialogButton>
          <PBInput w={86} {...range} />
          <span style={{ fontSize: 11 }}>{HINT}</span>
          <DialogButton id={id.cancel} width={84} onClick={onCancel}>Cancel</DialogButton>
          <DialogButton id={id.saveAs} width={84}>Save As</DialogButton>
          <span className="pb-form__label">Printer Type</span>
          <PBSelect w={88} options={printerTypes} />
        </div>
      </fieldset>
    </div>
  )
}

/**
 * The row that sets the rail beside the window's page pane (`children`).
 * `report`: `gap: 8, padding: '4px 6px 6px'` (PrintPreviewWindow 97);
 * `group` and `split`: `gap: 6, padding: 6` (CarePlanWindows 151, ExchangeKit 162).
 * The page pane itself — a fieldset, a PBGroup, a grey-backed fieldset body —
 * and the Printer line are each copy's own and go in as `children`.
 */
export function PrintPreviewFrame({ children, style, ...rail }: Parameters<typeof PrintPreviewRail>[0] & {
  children: ReactNode
  style?: CSSProperties
}) {
  const row: CSSProperties = rail.skin === 'report'
    ? { display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 8, padding: '4px 6px 6px' }
    : { display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: 6 }
  return (
    <div style={{ ...row, ...style }}>
      <PrintPreviewRail {...rail} />
      {children}
    </div>
  )
}
