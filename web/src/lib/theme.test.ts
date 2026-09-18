import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { darkScheme } from '../test/setup'

async function loadTheme() {
  vi.resetModules()
  return import('./theme')
}

describe('useTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.querySelector('meta[name="theme-color"]')?.remove()
    localStorage.removeItem('theme')
    darkScheme.matches = false
    darkScheme.listeners.clear()
  })

  it('defaults to light when the system is not dark and persists a toggle', async () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)

    const { useTheme } = await loadTheme()
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')

    act(() => {
      result.current.toggle()
    })

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(meta.getAttribute('content')).toBe('#1E1A16')

    act(() => {
      result.current.toggle()
    })
    expect(result.current.theme).toBe('light')
    expect(meta.getAttribute('content')).toBe('#F9F6F1')
  })

  it('follows the system until the user has chosen, then ignores further changes', async () => {
    darkScheme.matches = true
    const { useTheme } = await loadTheme()
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    darkScheme.matches = false
    act(() => {
      darkScheme.listeners.forEach((listener) => listener({ matches: false }))
    })
    expect(result.current.theme).toBe('light')

    act(() => {
      result.current.toggle()
    })
    expect(localStorage.getItem('theme')).toBe('dark')

    darkScheme.matches = false
    act(() => {
      darkScheme.listeners.forEach((listener) => listener({ matches: false }))
    })
    expect(result.current.theme).toBe('dark')
  })
})
