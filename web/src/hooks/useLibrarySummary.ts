import { useEffect, useState } from 'react'
import { listCategories, searchDocuments } from '../api/documents'

export interface LibrarySummary {
  total: number | null
  categories: string[]
}

/** How much is indexed, for the home page. Missing data just hides the strip or the facing page's body. */
export function useLibrarySummary(): LibrarySummary {
  const [summary, setSummary] = useState<LibrarySummary>({ total: null, categories: [] })

  useEffect(() => {
    let cancelled = false
    Promise.all([searchDocuments({ limit: 1 }), listCategories()])
      .then(([docs, categories]) => {
        if (!cancelled) setSummary({ total: docs.total, categories })
      })
      .catch(() => {
        // The strip is informational; the page works without it.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return summary
}
