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
import { READING_COLUMN, READING_GUTTER } from '../lib/layout'
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
  // The debounced search reads the URL through this ref so a late timer builds
  // on the params of the latest render, not the render that scheduled it.
  const searchParamsRef = useRef(searchParams)
  useEffect(() => {
    searchParamsRef.current = searchParams
  }, [searchParams])

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

  // Keep ?q= and ?category= honest after the first load, so a reload or a
  // shared link reproduces what is on screen. Replaced, not pushed: typing and
  // filtering are not places Back should return to.
  function syncFilters(q: string, category: string) {
    const next = new URLSearchParams(searchParamsRef.current)
    if (q.trim()) next.set('q', q)
    else next.delete('q')
    if (category) next.set('category', category)
    else next.delete('category')
    setSearchParams(next, { replace: true })
  }

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      syncFilters(value, activeCategory)
      fetchDocuments(value, activeCategory)
    }, DEBOUNCE_MS)
  }

  function handleCategory(category: string) {
    const next = category === activeCategory ? '' : category
    setActiveCategory(next)
    setLoading(true)
    syncFilters(query, next)
    fetchDocuments(query, next)
  }

  function select(document: PolicyDocument | null) {
    const source = document?.source ?? null
    // Re-clicking the open row would only add a history entry for Back to walk.
    if (source === selectedSource) return
    const next = new URLSearchParams(searchParams)
    if (source) next.set('source', source)
    else next.delete('source')
    setSearchParams(next)
  }

  const selected = documents.find((doc) => doc.source === selectedSource) ?? null

  // Two panes with nothing in the reader is a wasted page. Open the first
  // result when no document is named in the URL.
  useEffect(() => {
    if (!twoPane || selectedSource || documents.length === 0) return
    const next = new URLSearchParams(searchParams)
    next.set('source', documents[0].source)
    setSearchParams(next, { replace: true })
  }, [twoPane, selectedSource, documents, searchParams, setSearchParams])
  const filtered = Boolean(query.trim() || activeCategory)
  const count = loading
    ? 'Loading…'
    : filtered
    ? `${total} matching`
    : `${total} indexed`

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-15 shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 pt-[19px]">
        <h1 className="font-display text-[22px] leading-none font-medium tracking-tight text-ink">
          Policy Library
        </h1>
        <span className="tnum text-[12.5px] text-ink-2" aria-live="polite">{count}</span>
      </header>
      <div className="flex flex-col gap-3 px-5 pt-4 pb-3">
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
            {['', ...categories].map((category) => {
              const active = category === activeCategory
              return (
                <button
                  key={category || '__all__'}
                  type="button"
                  onClick={() => (category ? handleCategory(category) : handleCategory(activeCategory))}
                  aria-pressed={active}
                  className={`h-7 cursor-pointer rounded-full border px-3 text-[12.5px] transition-colors ${
                    active
                      ? 'border-accent bg-accent text-paper'
                      : 'border-rule bg-paper-3 text-ink-2 hover:border-ink-3 hover:text-ink'
                  }`}
                >
                  {category || 'All'}
                </button>
              )
            })}
          </div>
        )}
      </div>

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
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex h-15 shrink-0 items-center gap-4 border-b border-rule ${READING_GUTTER}`}>
        {twoPane ? (
          <span className="caps text-ink-3">{selected.category ?? 'Policy'}</span>
        ) : (
          <button
            type="button"
            onClick={() => select(null)}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All policies
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`${READING_GUTTER} py-7 sm:py-8`}>
          <div className={READING_COLUMN}>
            <DocumentReader document={selected} />
          </div>
        </div>
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
