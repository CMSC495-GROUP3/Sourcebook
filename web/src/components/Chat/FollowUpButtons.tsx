/**
 * FollowUpButtons — suggested follow-up questions, as chips.
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
    <div className="flex flex-col gap-2">
      <span className="caps text-ink-3">Follow up</span>
      <ul className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => onSelect(q)}
              className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-rule bg-paper-3 py-1 pr-3.5 pl-3 text-left text-[13px] text-ink transition-colors hover:border-ink-3 hover:text-accent-ink"
            >
              <ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-ink-3" />
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
