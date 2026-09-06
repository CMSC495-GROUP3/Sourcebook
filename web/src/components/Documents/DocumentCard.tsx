/**
 * DocumentCard — one row in the Policy Library list. Selecting it opens the
 * document in the reading pane; the row itself carries only what is needed to
 * pick the right one.
 */
import { FileText } from 'lucide-react'
import type { PolicyDocument } from '../../types'

interface Props {
  document: PolicyDocument
  selected: boolean
  onSelect: (document: PolicyDocument) => void
}

export default function DocumentCard({ document, selected, onSelect }: Props) {
  const meta = [
    `${document.passage_count} passage${document.passage_count !== 1 ? 's' : ''}`,
    document.effective_date && `effective ${document.effective_date}`,
  ].filter(Boolean).join(' · ')

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(document)}
        aria-current={selected ? 'true' : undefined}
        className={`flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-3 text-left transition-colors ${
          selected ? 'bg-accent-soft' : 'hover:bg-paper-3'
        }`}
      >
        <FileText size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-3" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={`text-[14.5px] leading-snug font-medium ${selected ? 'text-accent-ink' : 'text-ink'}`}>
            {document.title}
          </span>
          {document.preview && (
            <span className="line-clamp-2 text-[12.5px] leading-normal text-ink-2">{document.preview}</span>
          )}
          <span className="tnum flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-3">
            {document.category && <span className="caps text-[10px]">{document.category}</span>}
            <span>{meta}</span>
          </span>
        </span>
      </button>
    </li>
  )
}
