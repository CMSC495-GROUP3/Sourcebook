import { ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react'

type Kind = 'menu' | 'close' | 'collapse' | 'expand' | 'collapse-source' | 'close-source'

interface Props {
  /**
   * Which affordance this is: the phone hamburger, the drawer's close, the
   * desktop collapse/expand, or the source pane's collapse (docked) and close
   * (over the thread). The source pane is the right-hand sidebar, so its
   * chevrons point right, the way the left sidebar's point left.
   */
  kind: Kind
  onToggle: () => void
  /** Whether the sidebar is open now; defaults to what the kind implies (a close button implies open). */
  open?: boolean
  /** The id of the element this button shows or hides. The left sidebar unless told otherwise. */
  controls?: string
  className?: string
}

const ICONS = {
  menu: { Icon: Menu, label: 'Open menu', expanded: false },
  close: { Icon: X, label: 'Close menu', expanded: true },
  collapse: { Icon: ChevronsLeft, label: 'Collapse sidebar', expanded: true },
  expand: { Icon: ChevronsRight, label: 'Expand sidebar', expanded: false },
  'collapse-source': { Icon: ChevronsRight, label: 'Collapse source', expanded: true },
  'close-source': { Icon: X, label: 'Close source', expanded: true },
} as const

/** The buttons that open, close, collapse, or expand a sidebar; the sidebar's id is their target. */
export default function SidebarToggle({
  kind,
  onToggle,
  open,
  controls = 'app-sidebar',
  className = '',
}: Props) {
  const { Icon, label, expanded } = ICONS[kind]
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-expanded={open ?? expanded}
      aria-controls={controls}
      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink ${className}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
