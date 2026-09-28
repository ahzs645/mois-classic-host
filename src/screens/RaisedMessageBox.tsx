import type { ComponentProps } from 'react'
import { PBMessageBox } from '../pb'

/* ============================================================================
   A PBMessageBox raised above the dialog that asked it.

   PBMessageBox paints its layer at z-index 70, which is right over a folder
   but under the WorkspaceDialogFrame windows (80 and up). A prompt a window
   raises about itself — "Would you like to delete the selected
   appointments?" over Appointment Series, a refusal over Clone Group
   Booking — has to sit in front of that window, as a Win32 message box
   does, so it is lifted into its own layer at `zIndex` (default 96).
   ========================================================================= */

export function RaisedMessageBox({ zIndex = 96, ...props }: ComponentProps<typeof PBMessageBox> & { zIndex?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex }}>
      <PBMessageBox {...props} />
    </div>
  )
}
