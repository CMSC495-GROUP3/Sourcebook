import { fetchDocumentBody } from '../api/documents'
import { useDocumentRequest } from './useDocumentRequest'

interface DocumentBodyState {
  /** The markdown body. Null while loading, on error, or when the corpus has no stored body for it. */
  body: string | null
  loading: boolean
  error: string
  /** The document is indexed but its body is not: ingestion predates stored bodies. */
  unavailable: boolean
}

const ERROR = 'Could not load this document.'

/** The full markdown body for `source`. Skipped when `source` is null. */
export function useDocumentBody(source: string | null): DocumentBodyState {
  const { value, loading, error } = useDocumentRequest(source, fetchDocumentBody, ERROR)
  return {
    body: value,
    loading,
    error,
    unavailable: Boolean(source) && !loading && !error && value === null,
  }
}
