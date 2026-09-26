import { useCallback } from 'react'
import { chartRowsFor } from '../data/chart-records'
import type { WcbFormState } from '../data/wcbForm'
import { usePatient } from '../data/patient-context'
import { useOpenWindow } from '../screens/areaWindowRegistry'
import { useSessionState } from './screen-windows'

/* ============================================================================
   host/encounterArea — what the Encounters and Measures lessons change that
   has to outlive one window.

   MOIS writes a saved encounter, a progress note, a link between a result
   and a visit, or a review, to the database, and every other window reads it
   back. The emulator has no database, so this is the frame's session copy
   (host/screen-windows `useSessionState`, keyed by chart): the Encounter
   Detail Window, the Encounters list, the Measures folder and the Reviewing
   window read and write it through `useEncounterSession()`.

   The frame-level windows these folders open by name (Health Maintenance
   Review, Flow Sheet Review, Encounter Link Service, Measurement Template,
   the measurement graph) are registered in screens/encounterAreaWindows.tsx.
   ========================================================================= */

/** the user the emulator's desktop is logged in as (the frame's Desktop For) */
export const DESKTOP_USER = 'TECHNICAL SUPPORT'

export type SessionEncounter = {
  id: string; date: string; hr: string; mn: string; code: string; mode: string
  nbr: string; provider: string; reason: string; loc: string
}
export type SessionNote = {
  key: string
  author: string
  text: string
  complete: boolean
  /** empty until the note is first saved */
  createdBy: string
  created: string
  modified?: string
  /** a note from the chart export */
  exported?: boolean
}
export type SessionReview = { folder: string; date: string; by: string; note: string }

export type EncounterSession = {
  /** New Record + Save on the Encounters list, newest first */
  saved: SessionEncounter[]
  /** an encounter's notes once the window has touched them */
  notes: Record<string, SessionNote[]>
  /** Encounter Link Service: measure id → encounter id */
  measureLinks: Record<string, string>
  /** Order Linking Service: measure id → the order it now answers */
  orderLinks: Record<string, string>
  /** Reviewing ▸ Mark Reviewed while an encounter was open, by encounter */
  reviews: Record<string, SessionReview[]>
  /** attachments added this session, by the record they hang from */
  attachments: Record<string, number>
  /** Action ▸ Filter Measures (Ctrl+F): the code the folder is cut to */
  measureFilter: string | null
  /** rows filed into Measures this session (New Record, a template, a
      calculator, the encounter's Measurements tab) — folder-shaped */
  measureRows: Record<string, string>[]
  /** the Measures folder's current row, for Graph / Filter Measures */
  measureSelected: Record<string, string> | null
  /** the encounters whose Encounter Detail Window is open, newest last */
  open: string[]
  /** the record Taskbar ▸ Attachment would attach to (`encounter:<id>`) */
  attachTarget: string | null
  /** WCB Forms saved (F2) this session, by form header id — the chart's
      form_wcb until the window first saves one (screens/WcbFormWindow) */
  wcbForms: Record<string, WcbFormState>
  /** "Always create new note" ticked on the New Note confirmation: New Note
      stops asking (screens/EncounterChrome `NewNoteConfirmation`) */
  alwaysNewNote: boolean
}

export const EMPTY_SESSION: EncounterSession = {
  saved: [], notes: {}, measureLinks: {}, orderLinks: {}, reviews: {}, attachments: {},
  measureFilter: null, measureRows: [], measureSelected: null, open: [], attachTarget: null, wcbForms: {},
  alwaysNewNote: false,
}

export function useEncounterSession() {
  const chart = usePatient().chart
  const [session, set] = useSessionState<EncounterSession>(`encounters:${chart}`, EMPTY_SESSION)
  const openWindow = useOpenWindow()
  const update = useCallback(
    (fn: (s: EncounterSession) => EncounterSession) => set((s) => fn({ ...EMPTY_SESSION, ...s })),
    [set],
  )
  const full = { ...EMPTY_SESSION, ...session }
  return {
    session: full,
    update,
    /** a window the frame knows by id (registered area windows included) */
    open: openWindow,
    /** the encounter the most recently opened Encounter Detail Window holds —
        the active encounter, in the one-window mode MOIS recommends (301931) */
    active: full.open.length ? full.open[full.open.length - 1]! : null,
  }
}

/** The next encounter number MOIS would hand out on this chart. */
export function nextEncounterId(chart: string, saved: SessionEncounter[]): string {
  const ids = chartRowsFor(chart, 'encounters').map((r) => Number(r.id)).filter((n) => Number.isFinite(n))
  return String(Math.max(500000, ...ids) + saved.length + 1)
}

/* ---------------------------------------------------------------------------
   Actions the shell forwards here: the encounter window's own menu bar, and
   highlighting text in a field. `ctx` is the frame's plumbing.
   ------------------------------------------------------------------------ */
export async function performEncounterAction(
  actionId: string,
  args: Record<string, unknown>,
  ctx: { root: HTMLElement | null; clickAnchor: (id: string) => void; nextFrame: () => Promise<void> },
): Promise<boolean> {
  const slug = (key: string) => {
    const value = args[key]
    if (typeof value !== 'string' || !value) throw new Error(`${actionId} needs a "${key}" argument.`)
    return value
  }
  switch (actionId) {
    case 'host.mois.encounterMenu': {
      /* Save and Close are commands on the bar itself; the others drop */
      const menu = slug('menu')
      ctx.clickAnchor(`host.mois.encounter.menu.${menu}`)
      if (typeof args.item === 'string' && args.item) {
        await ctx.nextFrame()
        ctx.clickAnchor(`host.mois.encounter.menu.${menu}.${args.item}`)
      }
      return true
    }
    case 'host.mois.selectText': {
      /* highlight the whole of a free-text field — the step before Print ▸
         Selected Text. Typing into one is host.mois.fill. */
      const id = `host.mois.field.${slug('field')}`
      const box = [...(ctx.root?.querySelectorAll<HTMLElement>('[data-tutorial-id]') ?? [])]
        .filter((el) => el.getAttribute('data-tutorial-id') === id).pop()
      if (!(box instanceof HTMLTextAreaElement || box instanceof HTMLInputElement)) throw new Error(`No MOIS field is on screen for ${id}.`)
      box.focus()
      box.setSelectionRange(0, box.value.length)
      return true
    }
    default:
      return false
  }
}

/** `host.mois.openWindow {encounter}`: an exported encounter row, by id. */
export function encounterRowById(chart: string, id: unknown): Record<string, string> | undefined {
  if (typeof id !== 'string') return undefined
  return chartRowsFor(chart, 'encounters').find((r) => r.id === id)
}
