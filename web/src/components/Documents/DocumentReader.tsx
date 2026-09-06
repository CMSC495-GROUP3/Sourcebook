/**
 * DocumentReader — one policy document, read in full as the passages that
 * retrieval sees. Shared by the Policy Library reading pane and the source
 * pane beside a chat answer.
 *
 * Showing stored passages rather than re-rendering the original file is
 * deliberate: this is the audit trail for a citation, so it should display what
 * retrieval actually sees.
 */
import type { ReactNode } from 'react'
import { usePassages } from '../../hooks/usePassages'
import type { PolicyDocument } from '../../types'

interface Props {
  document: PolicyDocument
  /** Rendered under the metadata line: a link back to the library, for instance. */
  actions?: ReactNode
}

function documentMeta(document: PolicyDocument): string {
  return [
    document.category,
    document.effective_date && `effective ${document.effective_date}`,
    document.owner,
    `${document.passage_count} passage${document.passage_count !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ')
}

export default function DocumentReader({ document, actions }: Props) {
  const { passages, loading, error } = usePassages(document.source)

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="font-display text-[24px] leading-[1.2] font-medium tracking-tight text-ink">
          {document.title}
        </h2>
        <p className="tnum text-[12.5px] text-ink-2">{documentMeta(document)}</p>
        {actions && <div className="flex flex-wrap items-center gap-3 pt-1">{actions}</div>}
      </header>

      {loading && <p className="text-[13px] text-ink-3">Loading passages…</p>}
      {error && <p role="alert" className="text-[13px] text-brick">{error}</p>}

      {!loading && !error && (
        <ol className="flex flex-col gap-5">
          {passages.map((passage, i) => (
            <li key={i} className="flex flex-col gap-1.5">
              <span className="caps text-[10.5px] text-ink-3">Passage {i + 1}</span>
              <p className="text-[14px] leading-[1.65] whitespace-pre-line text-ink">{passage}</p>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
