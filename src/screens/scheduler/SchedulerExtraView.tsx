import { ReservationListView } from './ReservationViews'
import { ShiftSchedulerView } from './ShiftViews'

/* ============================================================================
   The Scheduler set-up folders the frame routes here: Reservation Blocks ▸
   Provider / Resource and Shift Manager ▸ Provider Shifts / Resource Shifts.
   None is a chart window, so none carries a patient header.

   The two branch nodes open their first folder's window, the way the
   Waiting List branch opens Provider Lists in this emulator.
   ========================================================================= */

export const SCHEDULER_EXTRA_NODES = ['blocks', 'b-prov', 'b-res', 'shift', 's-prov', 's-res'] as const

export function SchedulerExtraView({ node }: { node: string }) {
  if (node === 'b-res') return <ReservationListView key="res" resource />
  if (node === 'blocks' || node === 'b-prov') return <ReservationListView key="prov" />
  if (node === 's-res') return <ShiftSchedulerView key="res" resource />
  return <ShiftSchedulerView key="prov" />
}
