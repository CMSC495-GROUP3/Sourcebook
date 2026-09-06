/**
 * DocumentReader — one policy document with its metadata, shared by the
 * Policy Library reading pane and the source pane beside a chat answer.
 *
 * Two modes, because the two panes answer different questions. The library
 * shows the document as it is: the original markdown, rendered. The source
 * pane shows the stored passages, because it is the audit trail for a citation
 * and should display what retrieval actually saw. A library whose corpus was
 * indexed before bodies were stored falls back to passages until ingestion is
 * re-run.
 */
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { useDocumentBody } from '../../hooks/useDocumentBody'
import { usePassages } from '../../hooks/usePassages'
import { DOCUMENT_PROSE } from '../../lib/prose'
import type { PolicyDocument } from '../../types'

interface Props {
  document: PolicyDocument
  /** Rendered under the metadata line: a link back to the library, for instance. */
  actions?: ReactNode
  /** `document` renders the full markdown; `passages` lists what retrieval indexed. */
  mode?: Mode
}

const NBSP = '\u00a0'

type Mode = 'document' | 'passages'

/**
 * Metadata line; spaces inside each item are non-breaking so items wrap whole.
 * The passage count is retrieval detail, so it appears only beside passages.
 */
function documentMeta(document: PolicyDocument, mode: Mode): string {
  return [
    document.category,
    document.effective_date && `effective${NBSP}${document.effective_date}`,
    document.owner,
    mode === 'passages' &&
      `${document.passage_count}${NBSP}passage${document.passage_count !== 1 ? 's' : ''}`,
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => item.replace(/ /g, NBSP))
    .join(' · ')
}

/** Links in a document open in a new tab; the app itself is not a place to navigate away from. */
function DocumentLink({ href, children }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

function PassageList({ passages }: { passages: string[] }) {
  return (
    <ol className="flex flex-col gap-6">
      {passages.map((passage, i) => (
        <li key={i} className="flex flex-col gap-2">
          <span className="caps text-[10.5px] text-ink-3">Passage {i + 1}</span>
          <blockquote className="border-l-2 border-rule-strong pl-4 font-display text-[16.5px] leading-[1.6] whitespace-pre-line text-ink">
            {passage}
          </blockquote>
        </li>
      ))}
    </ol>
  )
}

export default function DocumentReader({ document, actions, mode = 'document' }: Props) {
  const wantBody = mode === 'document'
  const body = useDocumentBody(wantBody ? document.source : null)
  // Passages are fetched only when they will be shown: always in passages
  // mode, and in document mode only once the body is known to be missing.
  const showPassages = !wantBody || body.unavailable
  const passages = usePassages(showPassages ? document.source : null)

  const loading = body.loading || passages.loading
  const error = body.error || passages.error

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="font-display text-[24px] leading-[1.2] font-medium tracking-tight text-ink">
          {document.title}
        </h2>
        <p className="tnum text-[12.5px] text-ink-2">{documentMeta(document, mode)}</p>
        {actions && <div className="flex flex-wrap items-center gap-3 pt-1">{actions}</div>}
      </header>

      {loading && <p className="text-[13px] text-ink-3">Loading…</p>}
      {error && <p role="alert" className="text-[13px] text-brick">{error}</p>}

      {!loading && !error && body.body !== null && (
        <div className={DOCUMENT_PROSE}>
          {/*
            This renders uploaded content. react-markdown emits raw HTML as
            text and drops javascript: URLs by default; do not add rehype-raw
            here. Images are dropped too, so a document cannot make every
            reader's browser fetch from a third-party host.
          */}
          <ReactMarkdown disallowedElements={['img']} components={{ a: DocumentLink }}>
            {body.body}
          </ReactMarkdown>
        </div>
      )}

      {!loading && !error && showPassages && (
        <>
          {wantBody && (
            <p className="text-[13px] text-ink-3">
              The full text of this document is not indexed yet. These are the passages the assistant reads.
            </p>
          )}
          <PassageList passages={passages.passages} />
        </>
      )}
    </article>
  )
}
