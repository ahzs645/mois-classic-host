import { createContext, useContext, useEffect, useRef } from 'react'
import type { HostValue } from './types'

/* ============================================================================
   host/screen-state — structural state a screen owns, reported to the frame.

   Most windows in the work area keep their own React state: the New User
   dialog a User Accounts `New Record` raises, the band a System Settings
   `+` opens, the row the learner has clicked. The frame never sees any of
   it, so a practice check could only ever grade `host.node` while its
   overlay talked about a dialog.

   A screen calls `useScreenReport({ dialog: 'new-user' })` while the thing
   is on screen. The frame merges every mounted report into `host.screen.*`,
   and a reported `dialog` also becomes `host.dialog` when the frame has no
   dialog of its own. The report is withdrawn when the component unmounts —
   which is also what happens when the navigator moves to another node.

   Slugs and counts only, never typed values: the same privacy boundary the
   rest of the snapshot keeps.
   ========================================================================= */

export type ScreenReport = Record<string, HostValue>

/** (token, report | null) — null withdraws the token's report. */
export type ScreenReporter = (token: object, report: ScreenReport | null) => void

const ScreenStateContext = createContext<ScreenReporter | null>(null)

export const ScreenStateProvider = ScreenStateContext.Provider

/**
 * Report `fields` into `host.screen` for as long as the calling component is
 * mounted. Later-mounted reporters win a key, so a dialog opened over a list
 * reports over the list.
 */
export function useScreenReport(fields: ScreenReport) {
  const report = useContext(ScreenStateContext)
  const token = useRef<object>({})
  const key = JSON.stringify(fields)
  useEffect(() => {
    if (!report) return
    report(token.current, JSON.parse(key) as ScreenReport)
  }, [report, key])
  useEffect(() => {
    if (!report) return
    const own = token.current
    return () => report(own, null)
  }, [report])
}

/** Merge mounted reports, oldest first, so the newest wins a key. */
export function mergeScreenReports(reports: Map<object, ScreenReport>): ScreenReport {
  const merged: ScreenReport = {}
  for (const report of reports.values()) Object.assign(merged, report)
  return merged
}
