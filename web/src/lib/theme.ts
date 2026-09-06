/**
 * Light or dark, as one small store shared by every toggle.
 *
 * The default follows the operating system. An explicit choice is kept in
 * localStorage and wins from then on. index.html applies the same rule in an
 * inline script before the app loads, so the first paint is already right.
 */
import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
/** Browser chrome color, matching the paper token in each theme. */
const THEME_COLOR: Record<Theme, string> = { light: '#F9F6F1', dark: '#1E1A16' }

function readStored(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

let current: Theme = readStored() ?? systemTheme()
const listeners = new Set<() => void>()
apply(current)

// Follow the system until the user has chosen.
window.matchMedia(DARK_QUERY).addEventListener('change', () => {
  if (readStored()) return
  current = systemTheme()
  apply(current)
  listeners.forEach((listener) => listener())
})

function setTheme(theme: Theme) {
  current = theme
  apply(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private mode or blocked storage: the choice lasts for this page load.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  return {
    theme,
    toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
