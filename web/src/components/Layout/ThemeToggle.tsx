import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'

interface Props {
  className?: string
}

/** Switches between light and dark. The icon shows the mode you would switch to. */
export default function ThemeToggle({ className = '' }: Props) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  const Icon = dark ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink ${className}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
