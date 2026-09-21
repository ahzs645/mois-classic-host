import type { ReactNode } from 'react'
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'

/* ============================================================================
   pb/mdi — PowerBuilder-style MDI sheet management.

   In PowerBuilder a window like w_encounter is a *class*; `OpenSheet` creates
   an instance of it bound to one record, and several instances can be open at
   once. This models that: a registry of window classes, and a stack of live
   instances each keyed by the record it opened for, so selecting the same
   encounter twice focuses the existing sheet instead of opening a duplicate.

   Instances are draggable by their title bar, come to front on mouse-down,
   and close independently.
   ========================================================================= */

export type PBWindowClass<P = any> = (props: P & { instance: PBInstance }) => ReactNode

export type PBInstance = {
  /** window class name, e.g. 'encounter' */
  kind: string
  /** unique per record — reopening the same key focuses rather than duplicates */
  key: string
  title: string
  props: Record<string, unknown>
  x: number
  y: number
  z: number
}

type Ctx = {
  instances: PBInstance[]
  open: (spec: { kind: string; key: string; title: string; props?: Record<string, unknown> }) => void
  close: (key: string) => void
  focus: (key: string) => void
  closeAll: () => void
}

const MdiContext = createContext<Ctx | null>(null)

export function useMdi() {
  const ctx = useContext(MdiContext)
  if (!ctx) throw new Error('useMdi must be used inside <PBMdiProvider>')
  return ctx
}

/* new sheets cascade down-right from the frame origin, as MDI children do */
const CASCADE = 24
/* below the frame's title bar (30px) and menu bar (22px) plus its 18px desktop
   inset, so a child's title bar never covers the frame's menus */
const ORIGIN = { x: 140, y: 84 }

export function PBMdiProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<PBInstance[]>([])
  const top = useRef(10)

  const focus = useCallback((key: string) => {
    setInstances((list) => {
      const cur = list.find((i) => i.key === key)
      if (!cur || cur.z === top.current) return list
      top.current += 1
      return list.map((i) => (i.key === key ? { ...i, z: top.current } : i))
    })
  }, [])

  const open = useCallback<Ctx['open']>((spec) => {
    setInstances((list) => {
      const existing = list.find((i) => i.key === spec.key)
      top.current += 1
      if (existing) {
        return list.map((i) => (i.key === spec.key ? { ...i, z: top.current } : i))
      }
      const n = list.length
      return [...list, {
        kind: spec.kind,
        key: spec.key,
        title: spec.title,
        props: spec.props ?? {},
        x: ORIGIN.x + (n % 6) * CASCADE,
        y: ORIGIN.y + (n % 6) * CASCADE,
        z: top.current,
      }]
    })
  }, [])

  const close = useCallback((key: string) => {
    setInstances((list) => list.filter((i) => i.key !== key))
  }, [])

  const closeAll = useCallback(() => setInstances([]), [])

  const value = useMemo(
    () => ({ instances, open, close, focus, closeAll }),
    [instances, open, close, focus, closeAll],
  )
  return <MdiContext.Provider value={value}>{children}</MdiContext.Provider>
}

/* --- PBMdiHost — renders every live sheet ------------------------------- */
export function PBMdiHost({ classes }: { classes: Record<string, PBWindowClass> }) {
  const { instances, close, focus } = useMdi()
  const [dragKey, setDragKey] = useState<string | null>(null)
  const drag = useRef({ dx: 0, dy: 0 })
  const [, force] = useState(0)
  const posRef = useRef<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    for (const key of Object.keys(posRef.current)) {
      if (!instances.some((instance) => instance.key === key)) delete posRef.current[key]
    }
  }, [instances])

  /* dragging writes to a ref and repaints, so a fast drag does not queue a
     state update per mousemove */
  useEffect(() => {
    if (!dragKey) return
    const move = (e: MouseEvent) => {
      posRef.current[dragKey] = {
        x: Math.max(0, e.clientX - drag.current.dx),
        y: Math.max(0, e.clientY - drag.current.dy),
      }
      force((n) => n + 1)
    }
    const up = () => setDragKey(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [dragKey])

  return (
    <>
      {instances.map((inst) => {
        const Klass = classes[inst.kind]
        if (!Klass) return null
        const pos = posRef.current[inst.key] ?? { x: inst.x, y: inst.y }
        return (
          <div
            key={inst.key}
            className="pb-mdi__sheet"
            style={{
              left: pos.x, top: pos.y, zIndex: inst.z,
              ...(inst.kind === 'encounter' ? {
                width: `min(940px, calc(100% - ${pos.x + 8}px))`,
                height: `min(870px, calc(100% - ${pos.y + 8}px))`,
              } : {}),
            }}
            onMouseDown={() => focus(inst.key)}
            onMouseDownCapture={(e) => {
              const bar = (e.target as HTMLElement).closest('.pb-titlebar')
              const btn = (e.target as HTMLElement).closest('.pb-titlebar__btn')
              if (!bar || btn) return
              const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
              drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top }
              setDragKey(inst.key)
            }}
          >
            <Klass
              {...inst.props}
              instance={inst}
              onClose={() => close(inst.key)}
            />
          </div>
        )
      })}
    </>
  )
}
