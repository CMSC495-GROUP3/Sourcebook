/**
 * SourcePane — the right-hand page of the book. Opens beside an answer when a
 * citation is clicked and shows the cited document's indexed passages, so the
 * reader can check the answer without leaving the conversation.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, X } from 'lucide-react'
import { findDocumentByTitle } from '../../api/documents'
import DocumentReader from './DocumentReader'
import type { PolicyDocument } from '../../types'

interface Props {
  title: string
  onClose: () => void
  /** Rendered inside a dialog that owns Escape and focus; skip the pane's own Escape handler. */
  modal?: boolean
}

// Each result remembers the title it answers, so a pane that switches title
// shows "loading" until the matching response lands and ignores stale ones.
type Resolved =
  | { title: string; status: 'missing' }
  | { title: string; status: 'error' }
  | { title: string; status: 'ready'; document: PolicyDocument }

export default function SourcePane({ title, onClose, modal = false }: Props) {
  const [resolved, setResolved] = useState<Resolved | null>(null)

  useEffect(() => {
    let cancelled = false
    findDocumentByTitle(title)
      .then((document) => {
        if (cancelled) return
        setResolved(document ? { title, status: 'ready', document } : { title, status: 'missing' })
      })
      .catch(() => {
        if (!cancelled) setResolved({ title, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [title])

  const resolution = resolved?.title === title ? resolved : { status: 'loading' as const }

  useEffect(() => {
    if (modal) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, modal])

  return (
    <section aria-label="Source" className="flex h-full flex-col bg-paper-3">
      <header className="flex h-15 shrink-0 items-center justify-between border-b border-rule pr-2.5 pl-5">
        <span className="caps text-ink-3">Source</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close source"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {resolution.status === 'loading' && <p className="text-[13px] text-ink-3">Loading…</p>}
        {resolution.status === 'error' && (
          <p role="alert" className="text-[13px] text-brick">Could not load this source right now.</p>
        )}
        {resolution.status === 'missing' && (
          <div className="flex flex-col gap-2">
            <p className="font-display text-[20px] leading-tight text-ink">{title}</p>
            <p className="text-[13.5px] text-ink-2">
              This document is no longer in the library index. It may have been renamed or removed since the answer was written.
            </p>
          </div>
        )}
        {resolution.status === 'ready' && (
          <DocumentReader
            document={resolution.document}
            actions={
              <Link
                to={`/documents?source=${encodeURIComponent(resolution.document.source)}&q=${encodeURIComponent(resolution.document.title)}`}
                className="inline-flex items-center gap-1.5 text-[13px] text-accent underline-offset-3 hover:text-accent-ink hover:underline"
              >
                <BookOpen size={14} aria-hidden="true" />
                Open in the Policy Library
              </Link>
            }
          />
        )}
      </div>
    </section>
  )
}
