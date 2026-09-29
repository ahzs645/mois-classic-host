import { useSyncExternalStore } from 'react'

/* ============================================================================
   Session stores: in-memory state a frame's screens share, outside React.

   A record a lesson files (a preference, a goal, a quick-entry template, a
   letter in flight) has to outlive the window that filed it and be seen by
   the folder that lists it, so it lives in a module-level store. The rules
   every one of them keeps:
     · in memory only — nothing is written to browser storage, and a reload
       starts the session over, the way signing out of MOIS would;
     · a new frame starts clean: each store registers its reset here, and the
       frame calls `resetSessionStores()` once as it mounts, so a lesson opens
       on the records as they started, not as the previous lesson left them.

   Two shapes cover the stores:
     createStore(initial)   one immutable value, replaced on each write
     createSignal(reset)    a change counter for a store that keeps its own
                            (usually per-chart) data and bumps on each write
   ========================================================================= */

const resets = new Set<() => void>()

/** Register a reset to run when a new frame starts. */
export function onSessionReset(reset: () => void): void {
  resets.add(reset)
}

/** Start every session store over — the frame calls this as it mounts. */
export function resetSessionStores(): void {
  resets.forEach((reset) => reset())
}

export type Store<T> = {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (listener: () => void) => () => void
  /** back to the initial value (runs on every session reset) */
  reset: () => void
  /** the current value, re-rendering on change */
  use: () => T
}

/** A store holding one value. `initial` may be a factory, for a value that
    must be fresh on every reset (a mutable array or map). */
export function createStore<T>(initial: T | (() => T), options: { reset?: boolean } = {}): Store<T> {
  const fresh = () => (typeof initial === 'function' ? (initial as () => T)() : initial)
  let value = fresh()
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  const store: Store<T> = {
    get: () => value,
    set: (next) => {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      emit()
    },
    subscribe: (l) => { listeners.add(l); return () => { listeners.delete(l) } },
    reset: () => { value = fresh(); emit() },
    use: () => useSyncExternalStore(store.subscribe, store.get, store.get),
  }
  if (options.reset !== false) onSessionReset(store.reset)
  return store
}

export type Signal = {
  /** tell every reader the store changed */
  emit: () => void
  subscribe: (listener: () => void) => () => void
  /** the change count (a snapshot for useSyncExternalStore) */
  version: () => number
  /** re-render on every change */
  use: () => number
}

/** A change counter for a store that keeps its own data. `reset` clears that
    data and runs on every session reset (omit it for a store a frame must
    not clear). */
export function createSignal(reset?: () => void): Signal {
  let version = 0
  const listeners = new Set<() => void>()
  const signal: Signal = {
    emit: () => { version += 1; listeners.forEach((l) => l()) },
    subscribe: (l) => { listeners.add(l); return () => { listeners.delete(l) } },
    version: () => version,
    use: () => useSyncExternalStore(signal.subscribe, signal.version, signal.version),
  }
  if (reset) onSessionReset(() => { reset(); signal.emit() })
  return signal
}
