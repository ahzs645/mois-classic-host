import { useTemplateMeta, type DesignerStart } from '../data/letterDocs'
import { argStr } from '../data/text'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { LetterWriterWindow } from './LetterWriterWindow'

/* ============================================================================
   letter-template-designer — the MOIS Letter Writer opened to DESIGN a letter
   template: Administration ▸ Designer Section ▸ Letter Templates ▸ (a
   template's) Letter Template Detail ▸ Edit ▸ New Letter ▸ Continue.

   PROVENANCE: 303101 `d273caae…` (blank), `57c54992…` (Add Database Field),
   `a885b995…` (Add Tag), `c0dd3379…` / `d4e452ef…` (Import from a .docx);
   304753 (headers, populators and tags for CDX Referral / Consult
   templates). The window is LetterWriterWindow's `template` mode; the page
   is screens/LetterTemplateCanvas.tsx.

   CONFIRM-CURRENT: every image above is a help-site capture of an older
   build. The window is flagged for the ?confirm=1 overlay under its anchor
   `host.mois.dialog.letter-template` in screens/LetterWriterWindow.tsx.

   Args (from the Letter Template Detail's New Letter): `template` (the
   template's name), `type` (its document type), `option` ('blank' |
   'template' | 'file'), `from` (the template picked), `file` (the .docx).
   Opening it by id with no args designs a blank template named "NEW
   TEMPLATE".

   Save stores the body (data/letterDocs.ts) and the template's name and
   type, so a new template reaches Select Letter Template and the Send
   window's Use a Letter Template for its document type.
   ========================================================================= */

export const LETTER_TEMPLATE_DESIGNER = 'letter-template-designer'

function LetterTemplateDesigner({ args, close }: AreaWindowProps) {
  const start: DesignerStart = {
    template: argStr(args.template) || 'NEW TEMPLATE',
    type: typeof args.type === 'string' ? args.type : 'MISC',
    option: args.option === 'template' || args.option === 'file' ? args.option : 'blank',
    from: typeof args.from === 'string' ? args.from : undefined,
    file: typeof args.file === 'string' ? args.file : undefined,
  }
  const [, saveMeta] = useTemplateMeta()
  return (
    <LetterWriterWindow
      mode="template"
      designer={start}
      onClose={close}
      onCommand={(label) => {
        if (label === 'Save') saveMeta({ name: start.template, type: start.type, description: argStr(args.description) })
      }}
    />
  )
}

registerAreaWindow(LETTER_TEMPLATE_DESIGNER, LetterTemplateDesigner)
