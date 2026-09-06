/**
 * QuestionList — ruled rows of questions that can be asked with one click.
 * Used for the examples on the home page and the follow-ups under an answer,
 * so the two read as the same thing.
 */
import { CornerDownLeft } from 'lucide-react'

interface Props {
  label?: string
  questions: string[]
  onSelect: (question: string) => void
  disabled?: boolean
  /** Two columns from the `sm` breakpoint up. */
  columns?: 1 | 2
}

export default function QuestionList({ label, questions, onSelect, disabled = false, columns = 1 }: Props) {
  if (!questions.length) return null

  return (
    <section className="flex flex-col gap-2.5">
      {label && <h2 className="caps text-ink-3">{label}</h2>}
      <ul className={`grid grid-cols-1 border-t border-rule ${columns === 2 ? 'sm:grid-cols-2 sm:gap-x-8' : ''}`}>
        {questions.map((question) => (
          <li key={question} className="border-b border-rule">
            <button
              type="button"
              onClick={() => onSelect(question)}
              disabled={disabled}
              className="group flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left text-[14.5px] text-ink transition-colors hover:text-accent-ink disabled:cursor-default disabled:text-ink-3"
            >
              <span>{question}</span>
              <CornerDownLeft
                size={15}
                aria-hidden="true"
                className="shrink-0 text-ink-3 transition-colors group-hover:text-accent-ink group-disabled:text-ink-3"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
