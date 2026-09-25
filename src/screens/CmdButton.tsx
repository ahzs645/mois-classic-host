import type { ButtonHTMLAttributes } from 'react'
import { PBButton, usePBInstrumentation } from '../pb'

/**
 * A button a lesson can ring and press: anchored `host.mois.command.{command}`
 * and reported as `host.mois.command` when clicked, the way a command-row
 * button is — so practice mode sees a learner's click, and autoplay's
 * `host.mois.command` presses the very same control.
 */
export function CmdButton({ command, onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { command: string; size?: 'sm'; wide?: boolean }) {
  const host = usePBInstrumentation()
  return <PBButton {...rest} data-tutorial-id={host?.anchor('command', command)}
    onClick={e => { host?.report('command', { command }); onClick?.(e) }} />
}
