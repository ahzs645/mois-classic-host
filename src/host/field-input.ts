/* ============================================================================
   host/field-input — replaying "type into / pick from / tick" a field.

   `host.mois.setField {field, value}` is what autoplay does where a learner
   would type a date, pick a Status Code or tick a box: it finds the control
   behind `host.mois.field.{field}` and changes it the way the learner's hand
   would, through the events React listens for, so the window's own onChange
   runs and nothing is written around it.

   - a checkbox is clicked until it reads `value` (true / false);
   - a <select> takes `value` as the option's value;
   - a drop-down DataWindow (`.pb-dddw`) is opened and the list row whose text
     contains `value` is picked, as a click on it would;
   - any other input or text area is typed into.
   ========================================================================= */

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

function nativeSet(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
    : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value)
}

export async function setFieldValue(root: HTMLElement, field: string, value: unknown): Promise<void> {
  const id = `host.mois.field.${field}`
  const anchor = [...root.querySelectorAll<HTMLElement>('[data-tutorial-id]')]
    .find((node) => node.getAttribute('data-tutorial-id') === id)
  const control = anchor?.matches('input, textarea, select')
    ? anchor
    : anchor?.querySelector<HTMLElement>('input, textarea, select')
  if (!control) throw new Error(`No MOIS field is on screen for ${id}.`)

  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    if (control.checked !== (value === true || value === 'true')) control.click()
    return
  }
  const text = String(value ?? '')
  if (control instanceof HTMLSelectElement) {
    nativeSet(control, text)
    control.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }
  if (control instanceof HTMLInputElement && control.closest('.pb-dddw')) {
    control.focus()
    await nextFrame()
    const want = text.toUpperCase()
    const row = [...document.querySelectorAll<HTMLElement>('.pb-dddw__list tbody tr')]
      .find((tr) => (tr.textContent ?? '').toUpperCase().includes(want))
    if (!row) throw new Error(`${id} has no list entry "${text}".`)
    row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    return
  }
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    nativeSet(control, text)
    control.dispatchEvent(new Event('input', { bubbles: true }))
  }
}
