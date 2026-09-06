import { fetchPassages } from '../api/documents'
import { useDocumentRequest } from './useDocumentRequest'

interface PassagesState {
  passages: string[]
  loading: boolean
  error: string
}

const ERROR = 'Could not load this document.'

/** The indexed passages for `source`, in order. Skipped when `source` is null. */
export function usePassages(source: string | null): PassagesState {
  const { value, loading, error } = useDocumentRequest(source, fetchPassages, ERROR)
  return { passages: value ?? [], loading, error }
}
