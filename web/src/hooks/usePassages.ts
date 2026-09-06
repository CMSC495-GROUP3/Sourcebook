import { useEffect, useState } from 'react'
import { fetchPassages } from '../api/documents'

interface PassagesState {
  passages: string[]
  loading: boolean
  error: string
}

interface Result {
  source: string
  passages: string[]
  error: string
}

/**
 * The indexed passages for `source`. The result remembers which source it
 * answers, so "loading" is derived from the request rather than set, and a
 * late response for a source the caller has moved on from is dropped.
 */
export function usePassages(source: string | null): PassagesState {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    fetchPassages(source)
      .then((passages) => {
        if (!cancelled) setResult({ source, passages, error: '' })
      })
      .catch(() => {
        if (!cancelled) setResult({ source, passages: [], error: 'Could not load this document.' })
      })
    return () => {
      cancelled = true
    }
  }, [source])

  const current = source && result?.source === source ? result : null
  return {
    passages: current?.passages ?? [],
    error: current?.error ?? '',
    loading: Boolean(source) && !current,
  }
}
