/**
 * DocumentCard — one policy document in the library, expandable to read the
 * exact passages that were indexed.
 *
 * Showing stored passages rather than re-rendering the original file is
 * deliberate: this is the audit trail for a citation, so it should display what
 * retrieval actually sees.
 */
import { useState } from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronRight, FileText } from 'lucide-react'
import client from '../../api/client'
import type { PolicyDocument } from '../../types'

interface Props {
  document: PolicyDocument
}

export default function DocumentCard({ document }: Props) {
  const [passages, setPassages] = useState<string[]>([])
  const [fetched, setFetched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleOpen(open: boolean) {
    if (!open || fetched) return
    setLoading(true)
    setError('')
    try {
      const res = await client.get<string[]>('/api/documents/passages', {
        params: { source: document.source },
      })
      setPassages(res.data)
      setFetched(true)
    } catch {
      setError('Could not load this document.')
    } finally {
      setLoading(false)
    }
  }

  const meta = [
    `${document.passage_count} passage${document.passage_count !== 1 ? 's' : ''}`,
    document.effective_date && `effective ${document.effective_date}`,
    document.owner,
  ].filter(Boolean).join(' · ')

  return (
    <Disclosure>
      {({ open }) => (
        <div
          className={
            open
              ? '-mx-4 my-2 rounded-lg border border-rule-strong bg-paper-3 px-4'
              : 'border-b border-rule'
          }
        >
          <DisclosureButton
            onClick={() => handleOpen(!open)}
            className="flex w-full cursor-pointer items-start gap-3.5 py-3.5 text-left"
          >
            <FileText size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="text-[15px] font-medium text-ink">{document.title}</span>
                {document.category && (
                  <span className="caps text-[10.5px] text-accent">{document.category}</span>
                )}
              </span>
              {!open && document.preview && (
                <span className="line-clamp-2 text-[13px] leading-normal text-ink-2">
                  {document.preview}
                </span>
              )}
              <span className="tnum text-[12px] text-ink-3">{meta}</span>
            </span>
            <ChevronRight
              size={15}
              aria-hidden="true"
              className={`mt-1 shrink-0 text-ink-3 transition-transform duration-150 motion-reduce:transition-none ${
                open ? 'rotate-90' : ''
              }`}
            />
          </DisclosureButton>

          <DisclosurePanel className="pb-4 pl-[31px]">
            {loading && <p className="py-1 text-[12.5px] text-ink-3">Loading…</p>}
            {error && <p role="alert" className="py-1 text-[12.5px] text-brick">{error}</p>}
            {!loading && !error && passages.length > 0 && (
              <ol className="flex max-h-96 flex-col gap-3.5 overflow-y-auto pr-2">
                {passages.map((passage, i) => (
                  <li key={i} className="flex flex-col gap-1">
                    <span className="caps text-[10.5px] text-ink-3">Passage {i + 1}</span>
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-line text-ink-2">{passage}</p>
                  </li>
                ))}
              </ol>
            )}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  )
}
