/**
 * ConfidenceBadge — retrieval-similarity meter shown with an answer.
 *
 * This is the mean similarity of the passages the answer was drawn from, not a
 * probability that the answer is correct. The label says "retrieval match" for
 * exactly that reason: calling it "confidence" invites readers to treat it as a
 * correctness score, which it is not.
 */
const STRONG_MATCH = 70
const PARTIAL_MATCH = 40

interface Props {
  confidence: number | null | undefined
}

export default function ConfidenceBadge({ confidence }: Props) {
  if (confidence == null) return null

  const fill =
    confidence >= STRONG_MATCH ? 'bg-moss' : confidence >= PARTIAL_MATCH ? 'bg-ochre' : 'bg-brick'
  const width = Math.max(0, Math.min(100, confidence))

  return (
    <span
      className="inline-flex items-center gap-2.5 text-[12.5px] text-ink-2"
      title="Average similarity between your question and the retrieved passages. Not a measure of factual accuracy."
    >
      <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-rule" aria-hidden="true">
        <span className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${width}%` }} />
      </span>
      <span className="tnum">
        <span className="font-medium text-ink">{confidence}%</span> retrieval match
      </span>
    </span>
  )
}
