/**
 * ConfidenceBadge — retrieval-similarity meter shown with an answer.
 *
 * This is the mean similarity of the passages the answer was drawn from, not a
 * probability that the answer is correct. The label says "match" for exactly
 * that reason: calling it "confidence" invites readers to treat it as a
 * correctness score, which it is not. The explanation is behind a real
 * button, so keyboard and touch users can reach it.
 */
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Info } from 'lucide-react'

const STRONG_MATCH = 70
const PARTIAL_MATCH = 40

interface Props {
  confidence: number | null | undefined
}

export default function ConfidenceBadge({ confidence }: Props) {
  if (confidence == null) return null

  const level =
    confidence >= STRONG_MATCH
      ? { label: 'Strong match', fill: 'bg-moss' }
      : confidence >= PARTIAL_MATCH
      ? { label: 'Partial match', fill: 'bg-ochre' }
      : { label: 'Weak match', fill: 'bg-brick' }
  const width = Math.max(0, Math.min(100, confidence))

  return (
    <span className="inline-flex items-center gap-2.5 text-[12.5px] text-ink-2">
      <span className="relative h-1.5 w-28 overflow-hidden rounded-full bg-rule" aria-hidden="true">
        <span className={`absolute inset-y-0 left-0 rounded-full ${level.fill}`} style={{ width: `${width}%` }} />
      </span>
      <span className="tnum">
        <span className="font-medium text-ink">{level.label}</span> · {confidence}%
      </span>
      <Popover className="relative flex">
        <PopoverButton
          aria-label="What the match means"
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-ink-3 transition-colors hover:text-ink data-open:text-ink"
        >
          <Info size={14} aria-hidden="true" />
        </PopoverButton>
        <PopoverPanel
          anchor="bottom start"
          className="z-50 w-72 rounded-lg border border-rule-strong bg-paper-3 p-3 text-[12.5px] leading-normal text-ink-2 shadow-float [--anchor-gap:6px] focus:outline-none"
        >
          How closely the retrieved passages match your question, averaged. It says how well the policy text fits the question, not whether the answer is correct.
        </PopoverPanel>
      </Popover>
    </span>
  )
}
