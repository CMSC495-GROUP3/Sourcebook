/**
 * SourcesList — the documents an answer was drawn from, as numbered citation
 * chips. Clicking one opens that document in the source pane beside the
 * answer, so a reader can check the passage without leaving the conversation.
 */
interface Props {
  sources: string[]
  /** Title currently open in the source pane, if any. */
  activeSource?: string | null
  onOpen: (title: string) => void
}

export default function SourcesList({ sources, activeSource, onOpen }: Props) {
  if (!sources.length) return null

  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Sources">
      {sources.map((title, i) => {
        const active = title === activeSource
        return (
          <li key={title} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => onOpen(title)}
              aria-pressed={active}
              title="Read the indexed passages"
              className={`inline-flex h-7 max-w-full cursor-pointer items-center gap-2 rounded-md border pr-2.5 pl-2 text-[12.5px] transition-colors ${
                active
                  ? 'border-accent bg-accent-soft text-accent-ink'
                  : 'border-rule bg-paper-3 text-ink hover:border-accent hover:text-accent-ink'
              }`}
            >
              <span className={`tnum ${active ? 'text-accent' : 'text-ink-3'}`} aria-hidden="true">{i + 1}</span>
              <span className="truncate">{title}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
