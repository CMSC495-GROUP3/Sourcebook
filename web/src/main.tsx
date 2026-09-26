import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts. Each stylesheet is split by unicode-range, so
// the browser fetches only the Latin subset for an English UI.
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource-variable/ibm-plex-sans/index.css'
import './index.css'
// Applies the theme attribute and starts following the system preference.
import './lib/theme'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
