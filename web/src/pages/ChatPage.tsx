/**
 * ChatPage — ask a question, read the answer beside its source.
 *
 * Home (no session): one large question box, example questions, and a strip
 * showing what is indexed. Thread (session): the Q&A column with a composer
 * for follow-ups, and a source pane that opens when a citation is clicked.
 * The pane docks beside the column on wide screens and slides over it below
 * that.
 *
 * session_id lives in the URL (?session_id=uuid). When a new conversation is
 * created (first message sent), useChat calls onSessionCreated which updates the URL.
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { APP_HEADLINE, APP_TAGLINE } from '../config'
import { useChat } from '../hooks/useChat'
import { useLibrarySummary } from '../hooks/useLibrarySummary'
import { useMediaQuery } from '../hooks/useMediaQuery'
import MessageList from '../components/Chat/MessageList'
import ChatInput from '../components/Chat/ChatInput'
import SourcePane from '../components/Documents/SourcePane'

const STARTER_PROMPTS = [
  'How many PTO days do I get in my first year?',
  'How long do I have to enroll in benefits after starting?',
  'How much does the company match on my 401(k)?',
  'What is the meal limit when travelling for work?',
]

/** Tailwind's `xl`. From here the source pane docks beside the conversation. */
const DOCKED_PANE_QUERY = '(min-width: 1280px)'

interface HomeProps {
  onAsk: (question: string) => void
  busy: boolean
}

function Home({ onAsk, busy }: HomeProps) {
  const library = useLibrarySummary()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-180 flex-col gap-10 px-5 pt-10 pb-16 sm:px-8 sm:pt-[12vh] sm:pb-20">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-[32px] leading-[1.1] font-medium tracking-tight text-ink sm:text-[40px]">
            {APP_HEADLINE}
          </h1>
          <p className="max-w-130 text-[15px] leading-normal text-ink-2 sm:text-[16px]">{APP_TAGLINE}</p>
        </header>

        <ChatInput variant="hero" onSend={onAsk} disabled={busy} />

        <section className="flex flex-col gap-3" aria-labelledby="examples-heading">
          <h2 id="examples-heading" className="caps text-ink-3">Try one of these</h2>
          <ul className="grid grid-cols-1 border-t border-rule sm:grid-cols-2 sm:gap-x-8">
            {STARTER_PROMPTS.map((prompt) => (
              <li key={prompt} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => onAsk(prompt)}
                  disabled={busy}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left text-[14.5px] text-ink transition-colors hover:text-accent disabled:cursor-default disabled:text-ink-3"
                >
                  <span>{prompt}</span>
                  <ArrowUpRight size={15} aria-hidden="true" className="shrink-0 text-ink-3" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {library.total != null && (
          <section className="flex flex-col gap-3 rounded-lg border border-rule bg-paper-2/60 px-5 py-4" aria-labelledby="indexed-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="indexed-heading" className="text-[14px] font-medium text-ink">
                <span className="tnum">{library.total}</span> polic{library.total === 1 ? 'y' : 'ies'} indexed
              </h2>
              <Link
                to="/documents"
                className="inline-flex items-center gap-1.5 text-[13px] text-accent underline-offset-3 hover:text-accent-ink hover:underline"
              >
                <BookOpen size={14} aria-hidden="true" />
                Browse the library
              </Link>
            </div>
            {library.categories.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Categories">
                {library.categories.map((category) => (
                  <li key={category}>
                    <Link
                      to={`/documents?category=${encodeURIComponent(category)}`}
                      className="inline-flex h-7 items-center rounded-full border border-rule bg-paper-3 px-3 text-[12.5px] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[12.5px] text-ink-3">
              If a policy is not in the library, the assistant cannot answer from it.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const docked = useMediaQuery(DOCKED_PANE_QUERY)

  const { messages, loading, streaming, sendMessage, markEscalated } = useChat({
    sessionId,
    onSessionCreated: (id) => {
      // Update the URL with the new session_id without re-mounting the component
      setSearchParams({ session_id: id }, { replace: true })
    },
  })

  // The open source belongs to one conversation. Switching conversations
  // closes it during the same render, the same way useChat clears messages.
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [sourceSessionId, setSourceSessionId] = useState(sessionId)
  if (sessionId !== sourceSessionId) {
    setSourceSessionId(sessionId)
    setActiveSource(null)
  }

  const hasMessages = messages.length > 0
  const busy = loading || streaming
  const closeSource = () => setActiveSource(null)

  if (!hasMessages) {
    return <Home onAsk={sendMessage} busy={busy} />
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <MessageList
          messages={messages}
          sessionId={sessionId}
          loading={loading}
          streaming={streaming}
          activeSource={activeSource}
          onOpenSource={(title) => setActiveSource((current) => (current === title ? null : title))}
          onFollowUp={sendMessage}
          onEscalated={markEscalated}
        />
        <div className="shrink-0">
          <ChatInput onSend={sendMessage} disabled={busy} />
        </div>
      </div>

      {activeSource && docked && (
        <aside className="w-100 shrink-0 border-l border-rule">
          <SourcePane title={activeSource} onClose={closeSource} />
        </aside>
      )}

      {activeSource && !docked && (
        <>
          <div className="fixed inset-0 z-30 bg-ink/35" onClick={closeSource} aria-hidden="true" />
          <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-105 shadow-drawer">
            <SourcePane title={activeSource} onClose={closeSource} />
          </aside>
        </>
      )}
    </div>
  )
}
