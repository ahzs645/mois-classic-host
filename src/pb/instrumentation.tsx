import type { ReactNode } from 'react'
import { createContext, useContext, useMemo, useRef } from 'react'

/* ============================================================================
   pb/instrumentation — tutorial hooks for the kit.

   A host page (Webforms' tutorial stage) wraps the shell in
   `PBInstrumentationProvider`. Inside it, command rows, tab strips and the
   menu bar stamp `data-tutorial-id` anchors on their buttons and report the
   learner's clicks as semantic actions. Outside a provider the kit renders
   exactly as before — no attributes, no callbacks.

   Reports carry slugs only (a command label reduced to `new-record`), never
   patient data or typed values, which is the privacy boundary the tutorial
   layer keeps everywhere.
   ========================================================================= */

export type PBInstrumentationValue = string | number | boolean | null
export type PBInstrumentationPayload = Record<string, PBInstrumentationValue>

export interface PBInstrumentation {
  /** `<namespace>.<kind>.<segment>…`, e.g. `host.mois.command.new-record`. */
  anchor(kind: string, ...segments: string[]): string
  /** Report `<namespace>.<action>` with a slug-only payload. */
  report(action: string, payload?: PBInstrumentationPayload): void
}

const PBInstrumentationContext = createContext<PBInstrumentation | null>(null)

export function usePBInstrumentation(): PBInstrumentation | null {
  return useContext(PBInstrumentationContext)
}

/** Reduce a control label to the slug used in anchors and payloads. */
export function pbSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function PBInstrumentationProvider({
  namespace, onAction, children,
}: {
  namespace: string
  onAction?: (action: string, payload?: PBInstrumentationPayload) => void
  children: ReactNode
}) {
  /* the callback changes identity on every host render; keep the context
     value stable so instrumented controls do not re-render for it */
  const onActionRef = useRef(onAction)
  onActionRef.current = onAction

  const value = useMemo<PBInstrumentation>(() => ({
    anchor: (kind, ...segments) => [namespace, kind, ...segments].join('.'),
    report: (action, payload) => onActionRef.current?.(`${namespace}.${action}`, payload),
  }), [namespace])

  return <PBInstrumentationContext.Provider value={value}>{children}</PBInstrumentationContext.Provider>
}
