import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface Props {
  open: boolean
  onToggle: () => void
}

/** The one button that opens or closes the sidebar; the sidebar's id is its target. */
export default function SidebarToggle({ open, onToggle }: Props) {
  const Icon = open ? PanelLeftClose : PanelLeftOpen
  const label = open ? 'Close sidebar' : 'Open sidebar'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-expanded={open}
      aria-controls="app-sidebar"
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <Icon size={18} />
    </button>
  )
}
