/**
 * DocumentLibraryPage — searchable index of every document the assistant can
 * answer from, laid out as a list beside a reading pane.
 *
 * This exists so employees can tell the difference between "the assistant won't
 * answer that" and "that policy isn't loaded yet". Search and pagination are
 * server-side (?q=&category=&limit=&skip=) so this holds up as the corpus grows.
 *
 * The URL carries the state a link needs to reproduce: ?q= seeds the search,
 * ?category= the filter, and ?source= the open document. The source pane in
 * chat links here with q and source together so the list contains the document.
 */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search } from 'lucide-react'
import { searchDocuments, listCategories } from '../api/documents'
import DocumentCard from '../components/Documents/DocumentCard'
import DocumentReader from '../components/Documents/DocumentReader'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { PolicyDocument } from '../types'

const DEBOUNCE_MS = 300
/** Tailwind's `lg`. Below it the list and the reader take turns on screen. */
const TWO_PANE_QUERY = '(min-width: 1024px)'

export default function DocumentLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSource = searchParams.get('source')
  const initialQuery = searchParams.get('q') ?? ''
  const initialCategory = searchParams.get('category') ?? ''
  const twoPane = useMediaQuery(TWO_PANE_QUERY)

  const [documents, setDocuments] = useState<PolicyDocument[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(initialQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function fetchDocuments(q: string, category: string) {
    searchDocuments({ q, category })
      .then((res) => {
        setDocuments(res.items)
        setTotal(res.total)
        setError('')
      })
      .catch(() => setError('Could not load the document library.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDocuments(initialQuery, initialCategory)
    listCategories()
      .then(setCategories)
      .catch(() => { /* filters are optional; the list still works without them */ })
    // The URL only seeds the first load. Typing and clicking take over from there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clear the pending debounce on unmount so a late timer can't fire into a
  // component that no longer exists.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetchDocuments(value, activeCategory)
    }, DEBOUNCE_MS)
  }

  function handleCategory(category: string) {
    const next = category === activeCategory ? '' : category
    setActiveCategory(next)
    setLoading(true)
    fetchDocuments(query, next)
  }

  function select(document: PolicyDocument | null) {
    const next = new URLSearchParams(searchParams)
    if (document) next.set('source', document.source)
    else next.delete('source')
    setSearchParams(next)
  }

  const selected = documents.find((doc) => doc.source === selectedSource) ?? null
  const filtered = Boolean(query.trim() || activeCategory)
  const count = loading
    ? 'Loading…'
    : filtered
    ? `${total} matching`
    : `${total} indexed`

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-4 px-5 pt-7 pb-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-[26px] leading-none font-medium tracking-tight text-ink">
            Policy Library
          </h1>
          <span className="tnum text-[12.5px] text-ink-2" aria-live="polite">{count}</span>
        </div>
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            placeholder="Search by title…"
            aria-label="Search policy documents"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-md border border-rule-strong bg-paper-3 pr-3 pl-9 text-[16px] text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none sm:text-[14px]"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            {categories.map((category) => {
              const active = category === activeCategory
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategory(category)}
                  aria-pressed={active}
                  className={`h-7 cursor-pointer rounded-full border px-3 text-[12.5px] transition-colors ${
                    active
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule bg-paper-3 text-ink-2 hover:border-ink-3 hover:text-ink'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6 sm:px-3">
        {error && <p role="alert" className="px-3 text-[14px] text-brick">{error}</p>}
        {!error && !loading && documents.length === 0 ? (
          <p className="px-3 text-[14px] text-ink-2">
            {filtered
              ? `No documents match ${query.trim() ? `"${query.trim()}"` : 'that filter'}.`
              : 'No documents indexed yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.source}
                document={doc}
                selected={doc.source === selectedSource}
                onSelect={select}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const reader = selected ? (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-170 px-5 py-7 sm:px-8 sm:py-10">
        {!twoPane && (
          <button
            type="button"
            onClick={() => select(null)}
            className="mb-5 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All policies
          </button>
        )}
        <DocumentReader document={selected} />
      </div>
    </div>
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <BookOpen size={28} strokeWidth={1.5} aria-hidden="true" className="text-ink-3" />
      <p className="max-w-80 text-[14px] leading-normal text-ink-2">
        {selectedSource
          ? 'That document is not in the current results. Clear the search or filter to find it.'
          : 'Pick a policy to read the exact passages the assistant answers from.'}
      </p>
    </div>
  )

  if (!twoPane) {
    return <div className="min-h-0 flex-1">{selectedSource ? reader : list}</div>
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[400px_minmax(0,1fr)]">
      <div className="min-h-0 border-r border-rule bg-paper-2">{list}</div>
      <div className="min-h-0 bg-paper">{reader}</div>
    </div>
  )
}
