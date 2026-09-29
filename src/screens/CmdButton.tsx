import type { ButtonHTMLAttributes } from 'react'
import { PBButton } from '../pb'

/**
 * A button a lesson can ring and press: anchored `host.mois.command.{command}`
 * and reported as `host.mois.command` when clicked, the way a command-row
 * button is — so practice mode sees a learner's click, and autoplay's
 * `host.mois.command` presses the very same control. (PBButton's `command`.)
 */
export function CmdButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { command: string; size?: 'sm'; wide?: boolean }) {
  return <PBButton {...props} />
}
