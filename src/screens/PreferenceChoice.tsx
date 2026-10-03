import { useEffect, useId, useRef, useState } from 'react'
import { PBButton, PBDropGlyph, PBInput } from '../pb'
import { PBPopup, pbInPopup, usePBPopupOwner } from '../pb/popup'

/** Headerless PowerBuilder choice list, including its empty dropped state.
 * `tutorialId` (opt-in) anchors the control `host.mois.field.{id}` — setField
 * types into its edit box — and its drop button `host.mois.command.{id}-list`.
 * `readOnly` is the protected state: value shown, list and typing locked.
 *
 * The dropped list is a DDDW's: one 19px row per entry with a faint rule
 * under each, 16 rows before it scrolls (the Reason list, Drive Mois
 * 2026-09-22 8.13.16; 19px pitch at 1:1 in the DEV field audit's
 * evidence/MATRIX-R0909-form), and as wide as the column's DDDW width says —
 * `dropWidth`, a percentage of the control: Reason 100, Form ≈125 (208 of
 * 167px at 1:1, MATRIX-R0909-form; 315 of 261 in Drive 8.13.09), Instruction
 * ≈130 (Drive 8.13.20, its empty list hanging well past the button). Entries
 * are listed as given, duplicates included — the Reason list carries one
 * description under two codes. An empty list still drops, as a blank box
 * (8.13.20). */
export function PreferenceChoice({ label, value, options, onChange, disabled, readOnly, tutorialId, dropWidth = 100 }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean
  readOnly?: boolean; tutorialId?: string; dropWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState<number>()
  const [active, setActive] = useState(-1)
  const anchor = useRef<HTMLSpanElement>(null)
  const owner = usePBPopupOwner()
  const id = useId()
  const choices = value && !options.includes(value) ? [...options, value] : options
  const close = () => { setOpen(false); anchor.current?.querySelector('input')?.focus() }
  const choose = (item: string) => { onChange(item); close() }
  /* the DDDW width in layout px, so a scaled desktop does not stretch it twice */
  const measure = () => setWidth(Math.round((anchor.current?.offsetWidth ?? 0) * dropWidth / 100) || undefined)
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
  return <span ref={anchor} className="pb-inputgroup pb-preference-choice" data-tutorial-id={tutorialId ? `host.mois.field.${tutorialId}` : undefined} onKeyDown={e => {
    if (readOnly) return
    if (e.key === 'Escape') { e.stopPropagation(); close() }
    if (e.key === 'Tab') setOpen(false)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!open) measure(); setOpen(true)
      setActive(i => Math.max(0, Math.min(choices.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))))
    }
    if (e.key === 'Enter' && open) { e.preventDefault(); if (choices[active]) choose(choices[active]) }
  }}>
    <PBInput aria-label={label} role="combobox" aria-autocomplete="none" aria-expanded={open}
      aria-controls={open ? id : undefined} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
      value={value} disabled={disabled} readOnly={readOnly} onChange={e => onChange(e.target.value)} />
    <PBButton bare className="pb-inputgroup__btn pb-inputgroup__btn--drop" aria-label={`Open ${label.toLowerCase()} choices`}
      disabled={disabled || readOnly} aria-expanded={open} aria-controls={open ? id : undefined}
      command={tutorialId ? `${tutorialId}-list` : undefined}
      onClick={() => {
        setActive(choices.indexOf(value)); measure(); setOpen(v => !v)
      }}>
      <PBDropGlyph />
    </PBButton>
    {open && <PBPopup anchorRef={anchor} owner={owner} minWidth={width ?? 'anchor'} className="pb-preference-choice__popup"
      style={width ? { width } : undefined}>
      <div role="listbox" id={id} aria-label={`${label} choices`} className={choices.length ? undefined : 'is-empty'}>
        {choices.map((item, i) => <div role="option" id={`${id}-${i}`} key={i} aria-selected={item === value}
          className={active === i ? 'is-current' : undefined} onMouseDown={e => { e.preventDefault(); choose(item) }}>{item}</div>)}
      </div>
    </PBPopup>}
  </span>
}
