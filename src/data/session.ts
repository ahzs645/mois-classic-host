/* ============================================================================
   Who is signed in to the stage, React-free.

   One user runs every lesson. MOIS shows them two ways, and a third name is
   the provider the desktop starts on:
     SESSION_USER             'JALIL, AHMAD'  the display name MOIS stamps on
                              records (Created By, Record History, snapshots;
                              data/userManagement.ts, the chart export's own
                              stp_user_modify)
     SESSION_LOGIN            'JALA2'         the login the status bar shows
                              (makeStatusCells: `User: JALA2`)
     DESKTOP_PROVIDER_DEFAULT 'TECHNICAL SUPPORT'  the Desktop Provider a frame
                              opens on (art. 304393; the v02.31 capture's
                              "Desktop For:" strip) — chart-basics-state.ts keeps
                              the one the learner picks
   ========================================================================= */

/** the signed-in user's display name, as MOIS stamps records */
export const SESSION_USER = 'JALIL, AHMAD'

/** the signed-in user's login, as the status bar shows it */
export const SESSION_LOGIN = 'JALA2'

/** the Desktop Provider a new frame starts on */
export const DESKTOP_PROVIDER_DEFAULT = 'TECHNICAL SUPPORT'
