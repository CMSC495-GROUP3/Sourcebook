import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { resetTheme, useTheme } from './theme'
import { darkScheme } from '../test/setup'

describe('useTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.querySelector('meta[name="theme-color"]')?.remove()
    localStorage.removeItem('theme')
    darkScheme.matches = false
    resetTheme()
  })

  it('defaults to light when the system is not dark and persists a toggle', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
    resetTheme()

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

  it('follows the system until the user has chosen, then ignores further changes', () => {
    darkScheme.matches = true
    resetTheme()

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
