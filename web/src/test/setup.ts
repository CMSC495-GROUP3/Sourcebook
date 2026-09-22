import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

/** Shared `prefers-color-scheme: dark` stub so theme tests can flip the system preference. */
export const darkScheme = {
  matches: false,
  listeners: new Set<(event: { matches: boolean }) => void>(),
}

function matchesQuery(query: string): boolean {
  if (query.includes('prefers-color-scheme: dark')) return darkScheme.matches
  if (query.includes('min-width: 1024')) return false
  if (query.includes('min-width: 768')) return true
  return false
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => {
    const isDarkQuery = query.includes('prefers-color-scheme: dark')
    return {
      get matches() {
        return isDarkQuery ? darkScheme.matches : matchesQuery(query)
      },
      media: query,
      onchange: null,
      addListener: (cb: (event: { matches: boolean }) => void) => {
        if (isDarkQuery) darkScheme.listeners.add(cb)
      },
      removeListener: (cb: (event: { matches: boolean }) => void) => {
        darkScheme.listeners.delete(cb)
      },
      addEventListener: (_event: string, cb: (event: { matches: boolean }) => void) => {
        if (isDarkQuery) darkScheme.listeners.add(cb)
      },
      removeEventListener: (_event: string, cb: (event: { matches: boolean }) => void) => {
        darkScheme.listeners.delete(cb)
      },
      dispatchEvent: vi.fn(),
    }
  },
})

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  darkScheme.matches = false
})
