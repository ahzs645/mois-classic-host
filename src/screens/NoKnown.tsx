import { useState } from 'react'
import { clearNoKnown, setNoKnown, useAllergySession } from '../data/allergySession'
import { SESSION_USER } from '../data/chartSession'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import { PBMessageBox, type PBCommand } from '../pb'

/* ============================================================================
   Health Issues ▸ Conditions: the `No Known` command and its assertion.

   Art. 303447 "No Known" (added in 2.24): "When pressing "No Known", if there
   are no Health Conditions present, a **NO KNOWN** assertion will be added
   under the Search bar in the Conditions window" — `9bd93bd8…png` paints it
   bold, right-aligned on the "Health Conditions have not been reviewed for
   this patient" line. It is removed either by the Review button (the
   Reviewing: Health Condition window lists it in its Review History with a
   Delete button; Delete, then Mark Reviewed — `13fe2dc8…png`,
   screens/ReviewingDialog.tsx) or automatically "when a condition is added
   to this window", which here is the Save that files one.

   The assertion is kept per chart, per folder, in data/allergySession.ts
   (`noKnown.conditions`) — the store Reaction Risks' No Known uses and the
   Reviewing window reads — and reported as `host.screen.noKnown` while it
   stands.

   INFERRED: what MOIS says when No Known is pressed with conditions on file
   (the article only describes the empty case); the message below refuses.

   Anchors: host.mois.command.no-known (the command row),
   host.mois.field.no-known (the assertion), host.mois.command.no-known-ok.
   ========================================================================= */

export function useNoKnown(folder: string, rows: number) {
  const { chart } = usePatient()
  const asserted = !!useAllergySession(chart).noKnown[folder]
  const [refused, setRefused] = useState(false)
  useScreenReport(folder ? { noKnown: asserted && rows === 0 } : {})

  const commands = (cmds: PBCommand[]): PBCommand[] => (!folder ? cmds : cmds.map((c) => {
    if (!c) return c
    if (c.label === 'No Known') {
      return { ...c, onClick: () => (rows > 0 ? setRefused(true) : setNoKnown(chart, folder, SESSION_USER)) }
    }
    if (c.label === 'Save') {
      /* a condition filed on the folder ends the assertion */
      return { ...c, onClick: () => { c.onClick?.(); if (asserted && rows > 0) clearNoKnown(chart, folder) } }
    }
    return c
  }))

  const label = asserted && rows === 0
    /* drawn as Reaction Risks' NoKnownMark draws it (AdverseEventWindows.tsx) */
    ? <b style={{ marginLeft: 'auto', paddingRight: 10, letterSpacing: 0.5, whiteSpace: 'nowrap' }} data-tutorial-id="host.mois.field.no-known">** NO KNOWN **</b>
    : null

  const windows = refused && (
    <PBMessageBox
      title="MOIS" icon="info" onClose={() => setRefused(false)}
      buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.no-known-ok' }]}
    >
      Health Conditions are on file for this patient.<br />
      No Known can only be recorded when there are no Health Conditions.
    </PBMessageBox>
  )

  return { commands, label, windows, asserted }
}
