import { useEffect, useId, useRef, useState } from 'react'
import { PBInput } from '../pb'
import { PBPopup, pbInPopup, usePBPopupOwner } from '../pb/popup'

/** Headerless PowerBuilder choice list, including its empty dropped state. */
export function PreferenceChoice({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const anchor = useRef<HTMLSpanElement>(null)
  const owner = usePBPopupOwner()
  const id = useId()
  const choices = [...new Set([...options, value].filter(Boolean))]
  const close = () => { setOpen(false); anchor.current?.querySelector('input')?.focus() }
  const choose = (item: string) => { onChange(item); close() }
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (!anchor.current?.contains(e.target as Node) && !pbInPopup(e.target, owner)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open, owner])
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open, id])
  return <span ref={anchor} className="pb-inputgroup pb-preference-choice" onKeyDown={e => {
    if (e.key === 'Escape') { e.stopPropagation(); close() }
    if (e.key === 'Tab') setOpen(false)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); setOpen(true)
      setActive(i => Math.max(0, Math.min(choices.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))))
    }
    if (e.key === 'Enter' && open) { e.preventDefault(); if (choices[active]) choose(choices[active]) }
  }}>
    <PBInput aria-label={label} role="combobox" aria-autocomplete="none" aria-expanded={open}
      aria-controls={open ? id : undefined} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
      value={value} disabled={disabled} onChange={e => onChange(e.target.value)} />
    <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--drop" aria-label={`Open ${label.toLowerCase()} choices`}
      disabled={disabled} aria-expanded={open} onClick={() => { setActive(choices.indexOf(value)); setOpen(v => !v) }}>
      <svg width="7" height="5" viewBox="0 0 7 5"><path d="M0 0h7L3.5 5z" fill="currentColor" /></svg>
    </button>
    {open && <PBPopup anchorRef={anchor} owner={owner} minWidth="anchor" className="pb-preference-choice__popup">
      <div role="listbox" id={id} aria-label={`${label} choices`} className={choices.length ? undefined : 'is-empty'}>
        {choices.map((item, i) => <div role="option" id={`${id}-${i}`} key={item} aria-selected={item === value}
          className={active === i ? 'is-current' : undefined} onMouseDown={e => { e.preventDefault(); choose(item) }}>{item}</div>)}
      </div>
    </PBPopup>}
  </span>
}
