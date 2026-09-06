/**
 * DocumentLibraryPage — searchable index of every document the assistant can
 * answer from.
 *
 * This exists so employees can tell the difference between "the assistant won't
 * answer that" and "that policy isn't loaded yet". Search and pagination are
 * server-side (?q=&category=&limit=&skip=) so this holds up as the corpus grows.
 *
 * A citation under an answer links here with ?q=<title>, so the first search
 * comes from the URL when present.
 */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import client from '../api/client'
import DocumentCard from '../components/Documents/DocumentCard'
import type { PolicyDocument, DocumentsResponse } from '../types'

const LIMIT = 50
const DEBOUNCE_MS = 300

export default function DocumentLibraryPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [documents, setDocuments] = useState<PolicyDocument[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(initialQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function fetchDocuments(q: string, category: string) {
    client
      .get<DocumentsResponse>('/api/documents', {
        params: { q, category, limit: LIMIT, skip: 0 },
      })
      .then((res) => {
        setDocuments(res.data.items)
        setTotal(res.data.total)
        setError('')
      })
      .catch(() => setError('Could not load the document library.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDocuments(initialQuery, '')
    client
      .get<string[]>('/api/documents/categories')
      .then((res) => setCategories(res.data))
      .catch(() => { /* filters are optional; the list still works without them */ })
    // The URL query only seeds the first load. Typing takes over from there.
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

  const filtered = Boolean(query.trim() || activeCategory)
  const count = loading
    ? 'Loading…'
    : filtered
    ? `${total} matching document${total !== 1 ? 's' : ''}`
    : `${total} document${total !== 1 ? 's' : ''} indexed`

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-215 flex-col gap-6 px-5 py-8 sm:px-8 sm:py-11">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="font-display text-[28px] leading-[1.1] font-medium tracking-tight text-ink sm:text-[32px]">
              Policy Library
            </h1>
            <span className="tnum text-[13.5px] text-ink-2" aria-live="polite">{count}</span>
          </div>
          <p className="max-w-140 text-[14px] text-ink-2">
            Everything the assistant can answer from. If a policy is not listed here, the assistant cannot cite it.
          </p>
        </header>

        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            placeholder="Search policy documents…"
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

        {error && <p role="alert" className="text-[14px] text-brick">{error}</p>}

        {!error && !loading && documents.length === 0 ? (
          <p className="text-[14px] text-ink-2">
            {filtered ? `No documents match ${query.trim() ? `"${query.trim()}"` : 'that filter'}.` : 'No documents indexed yet.'}
          </p>
        ) : (
          <div className="flex flex-col border-t border-rule">
            {documents.map((doc) => (
              <DocumentCard key={doc.source} document={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
