/**
 * FollowUpButtons — suggested follow-up questions, as a short list.
 * Only rendered on the last assistant message. Clicking one fires sendMessage immediately.
 */
import { ArrowUpRight } from 'lucide-react'

interface Props {
  questions: string[]
  onSelect: (q: string) => void
}

export default function FollowUpButtons({ questions, onSelect }: Props) {
  if (!questions.length) return null

  return (
    <div className="flex flex-col border-t border-rule">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b border-rule py-2 text-left text-[13.5px] text-accent transition-colors hover:text-accent-ink"
        >
          <ArrowUpRight size={14} aria-hidden="true" className="shrink-0 text-ink-3" />
          {q}
        </button>
      ))}
    </div>
  )
}
