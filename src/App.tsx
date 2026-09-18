import { MoisClassicShell } from './host/MoisClassicShell'

/* The standalone viewer: the same shell Webforms embeds, plus the hash route
   into the component gallery. */
export default function App() {
  return <MoisClassicShell onOpenKit={() => { window.location.hash = 'kit' }} />
}
