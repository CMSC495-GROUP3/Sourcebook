/**
 * ChatPage — the main chat interface.
 *
 * Empty state: mark, headline and a short list of starter questions.
 * Active state: MessageList + ChatInput.
 *
 * session_id lives in the URL (?session_id=uuid). When a new conversation is
 * created (first message sent), useChat calls onSessionCreated which updates the URL.
 */
import { useSearchParams } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { APP_HEADLINE, APP_TAGLINE } from '../config'
import { useChat } from '../hooks/useChat'
import { BrandMark } from '../components/Layout/Brand'
import MessageList from '../components/Chat/MessageList'
import ChatInput from '../components/Chat/ChatInput'

const STARTER_PROMPTS = [
  'How many PTO days do I get in my first year?',
  'How long do I have to enroll in benefits after starting?',
  'How much does the company match on my 401(k)?',
  'What is the meal limit when travelling for work?',
]

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const { messages, loading, streaming, sendMessage, markEscalated } = useChat({
    sessionId,
    onSessionCreated: (id) => {
      // Update the URL with the new session_id without re-mounting the component
      setSearchParams({ session_id: id }, { replace: true })
    },
  })

  const hasMessages = messages.length > 0
  const busy = loading || streaming

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {hasMessages ? (
        <MessageList
          messages={messages}
          sessionId={sessionId}
          loading={loading}
          streaming={streaming}
          onFollowUp={sendMessage}
          onEscalated={markEscalated}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 pt-8 pb-10 sm:px-8 sm:pb-16">
          <div className="flex w-full max-w-155 flex-col gap-8 sm:gap-9">
            <header className="flex flex-col gap-2.5">
              <BrandMark size={40} />
              <h1 className="mt-3 font-display text-[32px] leading-[1.1] font-medium tracking-tight text-ink sm:text-[40px]">
                {APP_HEADLINE}
              </h1>
              <p className="text-[15px] leading-normal text-ink-2 sm:text-[16px]">{APP_TAGLINE}</p>
            </header>
            <ul className="flex flex-col border-t border-rule" aria-label="Example questions">
              {STARTER_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={busy}
                    className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 border-b border-rule py-2.5 text-left text-[15px] text-ink transition-colors hover:text-accent disabled:cursor-default disabled:text-ink-3"
                  >
                    <span>{prompt}</span>
                    <ArrowUpRight size={15} aria-hidden="true" className="shrink-0 text-ink-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="shrink-0">
        <ChatInput onSend={sendMessage} disabled={busy} />
      </div>
    </div>
  )
}
