import { useEffect, useState } from 'react'

interface Result<T> {
  source: string
  value: T | null
  error: string
}

/** What the reader shows when any request for a document fails. */
export const LOAD_ERROR = 'Could not load this document.'

export interface DocumentRequest<T> {
  /** The fetched value, or null while loading, on error, or when `source` is null. */
  value: T | null
  loading: boolean
  error: string
}

/**
 * One request for a document, keyed by its source. The result remembers which
 * source it answers, so "loading" is derived from the request rather than set,
 * and a late response for a source the caller has moved on from is dropped.
 * A null `source` skips the request, which lets a component decide per render
 * whether it needs this data at all.
 *
 * `fetcher` and `errorMessage` are effect dependencies, so pass module-level
 * values, not ones created during render.
 */
export function useDocumentRequest<T>(
  source: string | null,
  fetcher: (source: string) => Promise<T>,
  errorMessage: string,
): DocumentRequest<T> {
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    fetcher(source)
      .then((value) => {
        if (!cancelled) setResult({ source, value, error: '' })
      })
      .catch(() => {
        if (!cancelled) setResult({ source, value: null, error: errorMessage })
      })
    return () => {
      cancelled = true
    }
  }, [source, fetcher, errorMessage])

  const current = source && result?.source === source ? result : null
  return {
    value: current?.value ?? null,
    error: current?.error ?? '',
    loading: Boolean(source) && !current,
  }
}
