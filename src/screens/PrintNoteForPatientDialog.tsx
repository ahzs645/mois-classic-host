import { useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBCheckbox, PBSelect, PBTextArea, PBWindow } from '../pb'

/* ============================================================================
   Print Note for Patient — the Encounter Detail Window's Print ▸ Selected
   Text (Ctrl+Shift+N).

   It opens on whatever was highlighted in a free-text field of the encounter
   window. The box is editable, but "any changes made to the text in this
   window will not be reflected or saved in the original body of text"; Ok
   (F2) prints it on the desktop provider's letterhead with the patient's
   demographics and a signature line, and "Save and Attach the Note In
   Documents" files a Documents record that it was printed.

   PROVENANCE: art. 303092 `a4f8fc82…` (the window over the encounter, with
   the Print ▸ Selected Text item) and art. 301931 `f5287c2e…` (the window on
   its own, 505×490): a framed top row with `Printer Options:` [Report
   Printer ▾] on the left and `Save and Attach the Note In Documents:` [ ] on
   the right, the text box below it, and `Ok (F2)` / `Cancel` centred at the
   foot. Report Printer is the only printer either capture shows.
   ========================================================================= */

export function PrintNoteForPatientDialog({ text, onOk, onClose }: {
  /** the highlighted text the window opens on */
  text: string
  onOk: (result: { attach: boolean }) => void
  onClose: () => void
}) {
  const [body, setBody] = useState(text)
  const [attach, setAttach] = useState(false)
  useScreenReport({ saveAndAttach: attach })
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.print-note-for-patient"
        title="Print Note for Patient"
        onClose={onClose}
        style={{ width: 'min(505px, 100%)', height: 'min(490px, 100%)' }}
      >
        <div
          style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 12px 0' }}
          onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); onOk({ attach }) } }}
        >
          <div className="pb-row" style={{ border: '1px solid var(--pb-border)', borderBottom: 'none', padding: '8px 10px', gap: 6 }}>
            <span>Printer Options:</span>
            <PBSelect options={['Report Printer']} w={84} />
            <span className="pb-row__spacer" />
            <span>Save and Attach the Note In Documents:</span>
            <PBCheckbox checked={attach} onChange={setAttach} tutorialId="host.mois.cell.save-and-attach" />
          </div>
          <PBTextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-tutorial-id="host.mois.field.print-note-text"
            style={{ flex: '1 1 auto', minHeight: 0, width: '100%', resize: 'none' }}
          />
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 22, padding: '14px 0 12px', flex: 'none' }}>
          <PBButton style={{ minWidth: 95 }} data-tutorial-id="host.mois.command.print-note-ok" onClick={() => onOk({ attach })}>
            Ok (F2)
          </PBButton>
          <PBButton style={{ minWidth: 75 }} data-tutorial-id="host.mois.command.print-note-cancel" onClick={onClose}>
            Cancel
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
