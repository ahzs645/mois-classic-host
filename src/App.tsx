import { MoisClassicShell } from './host/MoisClassicShell'

/* ============================================================================
   The standalone viewer: the same shell Webforms embeds, opened the way MOIS
   opens on a Windows desktop.

   MOIS is a PowerBuilder application and its windows are painted, not laid
   out. Resizing the frame changes how much window face and how much coloured
   band you see; it never adds a column, a row or a field. The two captures
   this screen is built from are the same window at two different heights with
   identical content (`reference/patient-summary-3598.png` at 1000x736 and
   `-3924.png` at 1000x718), and the desktop capture of a smaller window shows
   the grid growing a scrollbar rather than reflowing.

   So the window opens at its painted size, centred, and the desktop it sits
   on is the whole page — sizing the *desktop* to the window instead is what
   clips the frame, since the frame is positioned inside it. The window is
   movable, resizable and maximisable from there, as the real one is.
   ========================================================================= */

/** The window size the 2026-09-29 TRAINING captures were taken at: 1004 x
    744, the frame edge to edge and the title bar's top to the status bar's
    foot (set 3 c34, 2008 x 1490 at 2x). The older Patient Summary captures
    were 1000 x 736. */
const WINDOW = { width: 1004, height: 744 }

export default function App() {
  return (
    <MoisClassicShell
      windowSize={WINDOW}
      onOpenKit={() => { window.location.hash = 'kit' }}
    />
  )
}
