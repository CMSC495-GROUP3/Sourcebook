import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from './ThemeToggle'
import { resetTheme } from '../../lib/theme'

describe('ThemeToggle', () => {
  afterEach(() => {
    localStorage.removeItem('theme')
    resetTheme()
  })

  it('switches from light to dark and updates the accessible name', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Switch to dark mode' })
    await user.click(button)

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
