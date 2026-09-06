/**
 * DocumentReader — one policy document with its metadata, shared by the
 * Policy Library reading pane and the source pane beside a chat answer.
 *
 * Two modes, because the two panes answer different questions. The library
 * shows the document as it is: the original markdown, rendered. The source
 * pane shows the stored passages, because it is the audit trail for a citation
 * and should display what retrieval actually saw. The library falls back to
 * passages in two cases: the corpus was indexed before bodies were stored, or
 * the body cannot be rendered (a pathological document must not blank the
 * page for everyone, since the library opens the first result on its own).
 */
import { Component, type ComponentProps, type ReactNode, useState } from 'react'
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { useDocumentBody } from '../../hooks/useDocumentBody'
import { usePassages } from '../../hooks/usePassages'
import { DOCUMENT_PROSE } from '../../lib/prose'
import type { PolicyDocument } from '../../types'

type Mode = 'document' | 'passages'

interface Props {
  document: PolicyDocument
  /** Rendered under the metadata line: a link back to the library, for instance. */
  actions?: ReactNode
  /** `document` renders the full markdown; `passages` lists what retrieval indexed. */
  mode?: Mode
}

const NBSP = ' '

/**
 * Metadata line; spaces inside each item are non-breaking so items wrap whole.
 * The passage count is retrieval detail, so it appears only beside passages.
 */
function documentMeta(document: PolicyDocument, withPassageCount: boolean): string {
  return [
    document.category,
    document.effective_date && `effective${NBSP}${document.effective_date}`,
    document.owner,
    withPassageCount &&
      `${document.passage_count}${NBSP}passage${document.passage_count !== 1 ? 's' : ''}`,
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => item.replace(/ /g, NBSP))
    .join(' · ')
}

/**
 * Links in a document. An absolute link opens in a new tab, since the app is
 * not a place to navigate away from. A mail link and a fragment link (a
 * footnote, or a link to one of the document's own headings, which rehype-slug
 * gives ids) stay in the page. Anything else, such as a relative path to
 * another file, would resolve against the app and 404, so it renders as text
 * with the target beside it: the information survives even if the link cannot.
 */
function DocumentLink({ node, href, ...props }: ComponentProps<'a'> & ExtraProps) {
  void node // react-markdown's syntax-tree node, not a DOM attribute
  if (href && /^https?:/i.test(href)) {
    return <a {...props} href={href} target="_blank" rel="noopener noreferrer" />
  }
  if (href && /^(mailto:|#)/i.test(href)) return <a {...props} href={href} />
  return (
    <span>
      {props.children}
      {href && <span className="text-ink-2"> ({href})</span>}
    </span>
  )
}

/**
 * A wide table scrolls inside its own box rather than widening the reading
 * pane. The box is focusable so keyboard users can scroll it in every browser,
 * not only the ones that focus overflowing scrollers on their own.
 */
function DocumentTable({ node, ...props }: ComponentProps<'table'> & ExtraProps) {
  void node
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Table">
      <table {...props} />
    </div>
  )
}

/** Images are not shown, so a document cannot make every reader's browser fetch from a third-party host. The alt text stays. */
function DocumentImage({ alt }: ComponentProps<'img'> & ExtraProps) {
  return alt ? <span>{alt}</span> : null
}

/**
 * The document title above is an h2 under the page's h1, so body headings
 * step down one level each. This also keeps a document that starts with a
 * single `#` from adding a second h1 to the page.
 */
const MARKDOWN_COMPONENTS: Components = {
  a: DocumentLink,
  img: DocumentImage,
  table: DocumentTable,
  h1: 'h2',
  h2: 'h3',
  h3: 'h4',
  h4: 'h5',
  h5: 'h6',
  h6: 'h6',
}

const REMARK_PLUGINS = [remarkGfm]
// Heading ids, so a document's links to its own sections work.
const REHYPE_PLUGINS = [rehypeSlug]

interface BoundaryProps {
  children: ReactNode
  onError: () => void
}

/** Catches a render failure inside the markdown and reports it, so the reader can fall back. */
class RenderBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
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
  // The source whose body failed to render, if any. Keyed by source rather
  // than a boolean so switching documents clears it without an effect.
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const renderFailed = failedSource === document.source

  const wantBody = mode === 'document' && !renderFailed
  const body = useDocumentBody(wantBody ? document.source : null)
  // Passages are fetched only when they will be shown: always in passages
  // mode, and in document mode only once the body is known to be unusable.
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
        <p className="tnum text-[12.5px] text-ink-2">{documentMeta(document, showPassages)}</p>
        {actions && <div className="flex flex-wrap items-center gap-3 pt-1">{actions}</div>}
      </header>

      {loading && <p role="status" className="text-[13px] text-ink-3">Loading…</p>}
      {error && <p role="alert" className="text-[13px] text-brick">{error}</p>}

      {!loading && !error && body.body !== null && (
        <RenderBoundary key={document.source} onError={() => setFailedSource(document.source)}>
          <div className={DOCUMENT_PROSE}>
            {/*
              This renders uploaded content. react-markdown never turns raw
              HTML into elements and drops javascript: URLs; do not add
              rehype-raw here. skipHtml drops raw HTML and comments entirely
              rather than showing them as text, so an author's hidden note
              stays hidden. Images are replaced by their alt text.
            */}
            <ReactMarkdown
              remarkPlugins={REMARK_PLUGINS}
              rehypePlugins={REHYPE_PLUGINS}
              components={MARKDOWN_COMPONENTS}
              skipHtml
            >
              {body.body}
            </ReactMarkdown>
          </div>
        </RenderBoundary>
      )}

      {!loading && !error && showPassages && (
        <>
          {mode === 'document' && (
            <p className="text-[13px] text-ink-3">
              {renderFailed
                ? 'This document could not be displayed as a page. These are the passages the assistant reads.'
                : 'The full text of this document is not indexed yet. These are the passages the assistant reads.'}
            </p>
          )}
          <PassageList passages={passages.passages} />
        </>
      )}
    </article>
  )
}
