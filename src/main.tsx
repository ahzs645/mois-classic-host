import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './pb/index.css'
import App from './App'
import { UiKit } from './screens/UiKit'

/* #kit opens the component gallery; anything else is the MOIS recreation. */
const isKit = window.location.hash === '#kit'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isKit ? <UiKit /> : <App />}</StrictMode>,
)

window.addEventListener('hashchange', () => window.location.reload())
