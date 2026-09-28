import { NewGoalWindow } from './GoalWindows'

/* The New Goal window is registered by id (`new-goal`, screens/GoalWindows.tsx)
   so `openWindowById` reaches it; this wrapper keeps the frame's own
   `goalOpen` path working. PROVENANCE: reference/goal-standard-populated.png. */
export function GoalDialog({ onClose }: { onClose: () => void }) {
  return <NewGoalWindow args={{}} close={onClose} open={() => false} />
}
