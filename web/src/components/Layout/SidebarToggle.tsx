import { ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react'

type Kind = 'menu' | 'close' | 'collapse' | 'expand'

interface Props {
  /** Which affordance this is: the phone hamburger, the drawer's close, or the desktop collapse/expand. */
  kind: Kind
  onToggle: () => void
  /** Whether the sidebar is open now; defaults to what the kind implies (a close button implies open). */
  open?: boolean
  className?: string
}

const ICONS = {
  menu: { Icon: Menu, label: 'Open menu', expanded: false },
  close: { Icon: X, label: 'Close menu', expanded: true },
  collapse: { Icon: ChevronsLeft, label: 'Collapse sidebar', expanded: true },
  expand: { Icon: ChevronsRight, label: 'Expand sidebar', expanded: false },
} as const

/** The buttons that open, close, collapse, or expand the sidebar; the sidebar's id is their target. */
export default function SidebarToggle({ kind, onToggle, open, className = '' }: Props) {
  const { Icon, label, expanded } = ICONS[kind]
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-expanded={open ?? expanded}
      aria-controls="app-sidebar"
      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink ${className}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
