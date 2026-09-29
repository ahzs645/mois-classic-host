import { useEffect, useRef } from 'react'
import { createStore } from './sessionStore'

/* ============================================================================
   Data Exchange menu → screen commands.

   The Data Exchange Action menu acts on the record in front of it: Save &
   Duplicate (F3) copies it, Attachments opens its attachments (303388,
   image ab0bb230). The menu is built by the frame (`data/menus/exchange.ts`)
   and the record lives in the Manual Entry screen's own state, so the menu
   item sends a command here and whichever screen is mounted handles it.
   ========================================================================= */

export type ExchangeCommand = 'save-and-duplicate' | 'attachments'

const listeners = new Set<(command: ExchangeCommand) => void>()

/** false when no mounted screen took the command */
export function sendExchangeCommand(command: ExchangeCommand): boolean {
  if (!listeners.size) return false
  listeners.forEach((listener) => listener(command))
  return true
}

/** Handle Action-menu commands while the calling screen is mounted. */
export function useExchangeCommand(handler: (command: ExchangeCommand) => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const listener = (command: ExchangeCommand) => ref.current(command)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])
}

/* --- which Quality Review row was torn off --------------------------------
   The Record Navigator is one frame-level window (it stays open beside the
   chart while the learner works through it, 303507), opened from the Quality
   Review tab of Lab Results or Inbound Messages. Which row's Tear Off opened
   it decides what it lists. */
/* a session store: a new frame has torn nothing off (before, the last
   lesson's row carried into the next) */
const tornOff = createStore('')

export function setTornOff(item: string) {
  tornOff.set(item)
}

export function useTornOff(): string {
  return tornOff.use()
}
