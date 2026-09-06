/**
 * MessageList — the conversation, laid out as a Q&A column of turns.
 *
 * When a question is added (or a conversation loads), that question scrolls
 * to the top of the view, so the reader starts at the question rather than
 * chasing the bottom of a growing answer. From the second turn on, the last
 * turn is at least a viewport tall so the question can actually reach the
 * top before its answer exists; the first turn stays as tall as its content
 * so a one-answer page is not mostly empty. Shows a status line while
 * retrieval runs and before the first token.
 */
import { useEffect, useRef } from 'react'
import Message from './Message'
import type { ChatMessage } from '../../hooks/useChat'

interface Props {
  messages: ChatMessage[]
  sessionId: string | null
  loading: boolean
  streaming: boolean
  activeSource: string | null
  onOpenSource: (title: string) => void
  onFollowUp: (q: string) => void
  onEscalated: (index: number, escalationId: string) => void
}

interface Turn {
  question: number
  answer?: number
}

/** Pair each question with the answer that follows it. */
function groupTurns(messages: ChatMessage[]): Turn[] {
  const turns: Turn[] = []
  messages.forEach((message, index) => {
    const last = turns[turns.length - 1]
    if (message.role === 'user' || !last) {
      turns.push({ question: index })
    } else {
      last.answer = index
    }
  })
  return turns
}

export default function MessageList({
  messages, sessionId, loading, streaming, activeSource, onOpenSource, onFollowUp, onEscalated,
}: Props) {
  const questionRefs = useRef(new Map<number, HTMLElement>())
  const turns = groupTurns(messages)
  const lastIndex = messages.length - 1
  const lastQuestion = turns.length ? turns[turns.length - 1].question : -1

  // Instant rather than smooth: a smooth scroll is cancelled by the layout
  // changes that follow (the status line, then streaming tokens). sessionId
  // is a dependency because two conversations with the same number of turns
  // share a lastQuestion index, and switching between them must still scroll.
  useEffect(() => {
    questionRefs.current.get(lastQuestion)?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [lastQuestion, sessionId])

  const renderMessage = (index: number) => (
    <Message
      key={index}
      ref={(el) => {
        if (el) questionRefs.current.set(index, el)
        else questionRefs.current.delete(index)
      }}
      message={messages[index]}
      index={index}
      sessionId={sessionId}
      isLast={index === lastIndex && messages[index].role === 'assistant'}
      isStreaming={streaming && index === lastIndex && messages[index].role === 'assistant'}
      activeSource={activeSource}
      onOpenSource={onOpenSource}
      onFollowUp={onFollowUp}
      onEscalated={onEscalated}
    />
  )

  return (
    <div className="flex flex-col gap-8 pt-[22px] pb-8">
      {turns.map((turn, t) => {
        const isLastTurn = t === turns.length - 1
        return (
          <div
            key={turn.question}
            className={`flex flex-col gap-5 ${isLastTurn && turns.length > 1 ? 'min-h-[calc(100svh-9rem)]' : ''}`}
          >
            {renderMessage(turn.question)}
            {turn.answer != null && renderMessage(turn.answer)}
            {isLastTurn && loading && (
              <p role="status" className="flex items-center gap-2.5 text-[13px] text-ink-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none" aria-hidden="true" />
                Searching the indexed policies…
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
