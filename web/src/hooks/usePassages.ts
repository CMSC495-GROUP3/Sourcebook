import { fetchPassages } from '../api/documents'
import { LOAD_ERROR, useDocumentRequest } from './useDocumentRequest'

interface PassagesState {
  passages: string[]
  loading: boolean
  error: string
}

/** The indexed passages for `source`, in order. Skipped when `source` is null. */
export function usePassages(source: string | null): PassagesState {
  const { value, loading, error } = useDocumentRequest(source, fetchPassages, LOAD_ERROR)
  return { passages: value ?? [], loading, error }
}
