/**
 * ConfidenceBadge — retrieval-similarity indicator shown beneath an answer.
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

  const dot =
    confidence >= STRONG_MATCH ? 'bg-moss' : confidence >= PARTIAL_MATCH ? 'bg-ochre' : 'bg-brick'

  return (
    <span
      className="tnum inline-flex items-center gap-2 text-[12.5px] text-ink-2"
      title="Average similarity between your question and the retrieved passages. Not a measure of factual accuracy."
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {confidence}% retrieval match
    </span>
  )
}
