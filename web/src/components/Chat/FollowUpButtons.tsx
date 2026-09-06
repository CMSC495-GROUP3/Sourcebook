/**
 * FollowUpButtons — suggested follow-up questions under the last answer.
 * Clicking one fires sendMessage immediately.
 */
import QuestionList from './QuestionList'

interface Props {
  questions: string[]
  onSelect: (q: string) => void
}

export default function FollowUpButtons({ questions, onSelect }: Props) {
  return <QuestionList label="Follow up" questions={questions} onSelect={onSelect} />
}
