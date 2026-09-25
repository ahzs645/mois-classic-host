import { useSessionState } from '../host/screen-windows'
import { usePatient } from './patient-context'
import { MOIS_TODAY } from './patients'

/* ============================================================================
   Reviews filed from a folder's `Review` button (Reaction Risks, Long Term
   Medication, Conditions) — the one store the Reviewing window writes and
   every folder reads.

   Once a review is filed, MOIS drops the "… have not been reviewed for this
   patient" notice, carries the date in the folder's title — `Long Term
   Medication - (2016.06.15)` (303218 `8fbac6a3…png`), `Condition -
   (2024.02.20)` (303791 `7d42bca7…png`) — and, in the v02.30 build, a `Last
   Reviewed  <date>  <user>` strip under Search For (303791). The export
   carries no review history, so a chart opens unreviewed. Kept for the life
   of the frame (host/screen-windows.tsx).
   ========================================================================= */

/** `by` is the login the Review History prints (303791 shows `admin`); `name`
    the display name the folder's Last Reviewed line prints (`LAROCHE, DEB`). */
export type FolderReview = { date: string; by: string; name: string; note: string }

/** the signed-in user, as data/chartSession.ts names them */
const LOGIN = 'JALA2'
const NAME = 'JALIL, AHMAD'

/* Reaction Risks is reached as either tree node; both are the one folder. */
export const reviewFolderOf = (node: string) => (node === 'allergy' ? 'reaction' : node)

export function useFolderReviews(node: string): [FolderReview[], (note: string) => void] {
  const { chart } = usePatient()
  const [reviews, set] = useSessionState<FolderReview[]>(`reviews:${chart}:${reviewFolderOf(node)}`, [])
  return [reviews, (note) => set((prev) => [{ date: MOIS_TODAY, by: LOGIN, name: NAME, note }, ...prev])]
}
