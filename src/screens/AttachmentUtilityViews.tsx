import { useState } from 'react'
import { ATTACH_FILES, SCAN_FILES } from '../data/exchange'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBInput, PBLookup, PBSelect, PBTabs, PBTextArea,
  PBViewHeader, pbSlug,
} from '../pb'
import { Lbl } from './ExchangeKit'
import type { ExchangeGo } from './ExchangeView'

/* ============================================================================
   Data Exchange ▸ Attachment Utilities — 303382, 303488 and 1826262.

   Scan Files takes files off a scanner into a folder and splits and merges
   them; Attach Files turns each file into a record on a chart. The file
   lists are the captures' own; the preview is a text rendering of the page
   the capture shows, since the stage has no PDF viewer.
   ========================================================================= */

/** The preview pane's toolbar, as drawn over both previews (af49f461). */
function PreviewToolbar({ zoom }: { zoom: string }) {
  return (
    <div className="pb-row" style={{ gap: 8, padding: '2px 6px', background: 'var(--pb-face)', borderBottom: '1px solid #b8b8b8', flex: 'none' }}>
      <span>✋</span><span>📷</span><span>⌖</span><span>🔍 Zoom In ▾</span><span>1:1</span><span>⤢</span><span>↔</span>
      <PBInput w={52} readOnly value={zoom} /><span>⊖ ──○── ⊕</span>
    </div>
  )
}

function Page({ lines, anchor }: { lines: string[]; anchor: string }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#808080', padding: 8 }}>
      <pre data-tutorial-id={anchor} style={{ margin: 0, background: '#fff', padding: '28px 30px', minHeight: '100%', fontSize: 11 }}>
        {lines.join('\n')}
      </pre>
    </div>
  )
}

/* --- Scan Files — 303382 image af49f461 (v02.21.15) ------------------------
   Start Scan / Refresh / Close Window; Folder with Browse… and the Run OCR
   After Scanning Finishes tick; Split / Merge / Delete over a Select /
   Order / Filename list; Show my files and the document count; a Preview
   pane with Rotate Pages… and Print. Merge joins the ticked files in the
   order they were ticked (the Order column counts up from 1). */
export function ScanFilesView() {
  const [files, setFiles] = useState(SCAN_FILES.files)
  const [order, setOrder] = useState<string[]>([])
  const [cur, setCur] = useState(SCAN_FILES.current)
  const [ocr, setOcr] = useState(true)
  const [mine, setMine] = useState(false)
  const [scanned, setScanned] = useState(0)
  useScreenReport({ rows: files.length, selected: order.length })

  const tick = (f: string) => setOrder((o) => (o.includes(f) ? o.filter((x) => x !== f) : [...o, f]))
  const merge = () => {
    if (order.length < 2) return
    const name = `merged_${files.filter((f) => f.startsWith('merged_')).length + 1}.pdf`
    setFiles((all) => [...all.filter((f) => !order.includes(f)), name])
    setOrder([])
  }
  const split = () => {
    if (!order.length) return
    setFiles((all) => all.flatMap((f) => (order.includes(f) ? [f.replace(/\.pdf$/, '_p1.pdf'), f.replace(/\.pdf$/, '_p2.pdf')] : [f])))
    setOrder([])
  }
  const start = () => {
    setScanned((n) => n + 1)
    setFiles((all) => [...all, `20260918_0930${String(scanned).padStart(2, '0')}.pdf`])
  }

  return (
    <>
      <PBViewHeader title="Scan Files" />
      <PBCommandRow commands={[
        { label: 'Start Scan', onClick: start },
        { label: 'Refresh' },
        { label: 'Close Window' },
      ]} />
      <div className="pb-row" data-tutorial-id="host.mois.group.scan-folder" style={{ gap: 8, padding: '6px 8px', background: 'var(--pb-face)', flex: 'none' }}>
        <Lbl w={60}>Folder:</Lbl>
        <PBSelect w={420} options={[SCAN_FILES.folder]} />
        <PBButton data-tutorial-id="host.mois.command.browse">Browse...</PBButton>
        <span style={{ width: 30 }} />
        <PBCheckbox label="Run OCR After Scanning Finishes" checked={ocr} onChange={setOcr} tutorialId="host.mois.field.run-ocr-after-scanning-finishes" />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3, padding: '0 3px 3px' }}>
        <div style={{ width: 300, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <div className="pb-row" data-tutorial-id="host.mois.group.split-merge" style={{ gap: 0, padding: '2px 0 2px 54px', background: 'var(--pb-face)' }}>
            <PBButton style={{ width: 82 }} data-tutorial-id="host.mois.command.split" onClick={split}>Split</PBButton>
            <PBButton style={{ width: 82 }} data-tutorial-id="host.mois.command.merge" onClick={merge}>Merge</PBButton>
            <PBButton style={{ width: 82 }} data-tutorial-id="host.mois.command.delete" onClick={() => setFiles((all) => all.filter((f) => !order.includes(f)))}>Delete</PBButton>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '50px 44px 1fr', background: '#c8dcfa', padding: '1px 0', textAlign: 'center' }}>
            <span>Select</span><span>Order</span><span>Filename</span>
          </div>
          <div data-tutorial-id="host.mois.group.scan-list" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
            {files.map((f, i) => (
              <div
                key={f}
                onMouseDown={() => setCur(i)}
                style={{ display: 'grid', gridTemplateColumns: '50px 44px 1fr', alignItems: 'center', height: 24, borderBottom: '1px solid #e0e0e0', background: i === cur ? '#3875d7' : undefined, color: i === cur ? '#fff' : undefined }}
              >
                <span style={{ textAlign: 'center' }}>
                  <PBCheckbox checked={order.includes(f)} onChange={() => tick(f)} tutorialId={`host.mois.check.scan-${pbSlug(f)}`} />
                </span>
                <span style={{ textAlign: 'center' }}>{order.includes(f) ? order.indexOf(f) + 1 : ''}</span>
                <span style={{ paddingLeft: 6 }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '4px 4px 0', background: 'var(--pb-face)' }}>
            <PBCheckbox label="Show my files" checked={mine} onChange={setMine} tutorialId="host.mois.field.show-my-files" />
            <div>{files.length + 19} Documents</div>
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #888' }}>
          <div className="pb-band">
            <span>Preview</span><span className="pb-band__spacer" />
            <PBButton data-tutorial-id="host.mois.command.rotate-pages">Rotate Pages...</PBButton>
            <PBButton style={{ width: 90 }}>Print</PBButton>
          </div>
          <PreviewToolbar zoom="66%" />
          <Page lines={SCAN_FILES.preview} anchor="host.mois.field.scan-preview" />
        </div>
      </div>
    </>
  )
}

/* --- Attach Files — 303488 image bf17b446, 303382 image 2315eccf ------------
   Attach, Unattach, Delete File, Refresh, Open Chart, Link to Order, Print,
   Tear Off, Close Window. A Files band (the folder in a drop-down with an
   ellipsis — the How-To's "Select Folder"), the file list with Show my
   files, Preview and OCR Text tabs, and the Record band: CHART NUM, TYPE,
   Clear After Attaching, with History and Distribute beside it. Attach
   files the current file and drops it greyed to the bottom of the list;
   Unattach lifts it back. */
export function AttachFilesView({ go }: { go: ExchangeGo }) {
  const [files, setFiles] = useState(ATTACH_FILES.files.map((name) => ({ name, attached: false })))
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('Preview')
  const [type, setType] = useState('')
  const [chart, setChart] = useState('')
  const [clear, setClear] = useState(false)
  const current = files[cur]
  useScreenReport({
    attached: files.filter((f) => f.attached).length,
    rows: files.length,
  })

  const attach = () => {
    if (!current || current.attached) return
    setFiles((all) => [...all.filter((_, i) => i !== cur), { ...current, attached: true }])
    if (clear) { setType(''); setChart('') }
  }
  const unattach = () => {
    if (!current?.attached) return
    setFiles((all) => [{ ...current, attached: false }, ...all.filter((_, i) => i !== cur)])
    setCur(0)
  }

  return (
    <>
      <PBViewHeader title="Attach Files" />
      <PBCommandRow commands={ATTACH_FILES.commands.map((label) => ({
        label,
        onClick: label === 'Attach' ? attach
          : label === 'Unattach' ? unattach
          /* 303488: removes the file from the list "AND will permanently
             delete it from the folder on your computer" */
          : label === 'Delete File' ? () => { setFiles((all) => all.filter((_, i) => i !== cur)); setCur(0) }
          : label === 'Open Chart' ? () => go.node('summary')
          : label === 'Link to Order' ? () => go.open('order-linking-service')
          : undefined,
      }))} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3, padding: '0 3px', position: 'relative' }}>
        <div style={{ width: 198, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <PBBand>Files</PBBand>
          <div className="pb-row" data-tutorial-id="host.mois.group.files-folder" style={{ gap: 2, padding: 3, background: 'var(--pb-face)' }}>
            <PBSelect w={164} options={[ATTACH_FILES.folder]} />
            <PBButton size="sm" data-tutorial-id="host.mois.command.select-folder">…</PBButton>
          </div>
          <div data-tutorial-id="host.mois.group.attach-list" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
            {files.map((f, i) => (
              <div key={f.name} onMouseDown={() => setCur(i)}
                data-tutorial-id={`host.mois.row.file-${pbSlug(f.name)}`}
                style={{ display: 'grid', gridTemplateColumns: '28px 1fr', alignItems: 'center', height: 18, borderBottom: '1px solid #e0e0e0',
                  background: i === cur ? '#3875d7' : undefined, color: i === cur ? '#fff' : f.attached ? '#a0a0a0' : undefined }}>
                <span style={{ textAlign: 'center' }}><PBCheckbox checked={false} /></span>
                <span>{f.name}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 3, background: 'var(--pb-face)' }}><PBCheckbox label="Show my files" checked={false} /></div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBTabs tabs={['Preview', 'OCR Text']} active={tab} onChange={setTab} compact>
            {tab === 'Preview' ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
                <PreviewToolbar zoom="71%" />
                <Page lines={ATTACH_FILES.preview} anchor="host.mois.field.attach-preview" />
              </div>
            ) : (
              /* 303382 "OCR Text Tab Options": Run OCR, Keep Only Selected,
                 Copy to Record ("copies all of the text in the OCR Text tab
                 into the report field of the selected record") and Disable
                 Text Formatting. No capture shows the tab itself, so the
                 four sit in one row here. */
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 4, gap: 4 }}>
                <div className="pb-row" style={{ gap: 6 }}>
                  <PBButton data-tutorial-id="host.mois.command.run-ocr">Run OCR</PBButton>
                  <PBButton data-tutorial-id="host.mois.command.keep-only-selected">Keep Only Selected</PBButton>
                  <PBButton data-tutorial-id="host.mois.command.copy-to-record">Copy to Record</PBButton>
                  <PBCheckbox label="Disable Text Formatting" checked={false} />
                </div>
                <PBTextArea data-tutorial-id="host.mois.field.ocr-text" defaultValue={ATTACH_FILES.preview.join('\n')} style={{ flex: '1 1 auto', resize: 'none', fontFamily: 'var(--pb-font-mono)' }} />
              </div>
            )}
          </PBTabs>
        </div>
      </div>

      {/* --- the Record band -------------------------------------------- */}
      <div style={{ flex: 'none', height: 214, display: 'flex', gap: 3, padding: 3 }}>
        <div className="pb-groupbox" data-tutorial-id="host.mois.group.record" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand right={<PBCheckbox label="Clear After Attaching" checked={clear} onChange={setClear} tutorialId="host.mois.field.clear-after-attaching" />}>Record</PBBand>
          <div style={{ background: 'linear-gradient(#1e86c8, #0b5fa0)', color: '#fff', padding: '4px 8px', display: 'grid', gridTemplateColumns: '80px 110px 1fr 40px 110px', gap: '3px 6px', alignItems: 'center' }}>
            <span>CHART NUM:</span>
            <PBLookup w={104} value={chart} onChange={setChart} />
            <span />
            <span>PHN:</span><span />
            <span>TYPE:</span>
            <PBSelect w={104} options={ATTACH_FILES.types} value={type} onChange={(e) => setType(e.target.value)} data-tutorial-id="host.mois.field.record-type" />
            <span />
            <span>DOB:</span><span />
          </div>
          {type ? (
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 3, padding: '4px 8px', flex: '1 1 auto' }}>
              <Lbl>Date:</Lbl><PBInput w={90} />
              <Lbl>Description:</Lbl><PBLookup w={300} />
              <Lbl>Report:</Lbl><PBTextArea rows={3} data-tutorial-id="host.mois.field.report" style={{ resize: 'none' }} />
            </div>
          ) : <div style={{ flex: '1 1 auto' }} />}
        </div>
        <div style={{ width: 220, flex: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div className="pb-groupbox" style={{ flex: '1 1 auto' }}>
            <PBBand>{type ? 'History (+/- 15 days from discharged)' : 'History Not Applicable'}</PBBand>
          </div>
          <div className="pb-groupbox" data-tutorial-id="host.mois.group.distribute" style={{ height: 90, flex: 'none' }}>
            <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>Distribute</PBBand>
            <div style={{ background: '#c8dcfa', padding: '1px 16px' }}>User Name</div>
            {ATTACH_FILES.distribute.map((u) => <div key={u} style={{ padding: '1px 8px', background: '#e8e8e8' }}>*&nbsp; {u}</div>)}
          </div>
        </div>
      </div>

    </>
  )
}
