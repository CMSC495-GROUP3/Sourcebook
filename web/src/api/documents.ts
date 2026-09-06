/**
 * Document library calls, shared by the Policy Library page and the source
 * pane in chat. The API is title-searchable only, so a citation (which names
 * a document by title) is resolved with a search and an exact-title match.
 */
import { isAxiosError } from 'axios'
import client from './client'
import type { DocumentsResponse, PolicyDocument } from '../types'

const DOCUMENTS_PAGE_SIZE = 50

interface SearchParams {
  q?: string
  category?: string
  limit?: number
  skip?: number
}

export async function searchDocuments(params: SearchParams = {}): Promise<DocumentsResponse> {
  const res = await client.get<DocumentsResponse>('/api/documents', {
    params: {
      q: params.q ?? '',
      category: params.category ?? '',
      limit: params.limit ?? DOCUMENTS_PAGE_SIZE,
      skip: params.skip ?? 0,
    },
  })
  return res.data
}

export async function listCategories(): Promise<string[]> {
  const res = await client.get<string[]>('/api/documents/categories')
  return res.data
}

/** The indexed passages of one document, in order. */
export async function fetchPassages(source: string): Promise<string[]> {
  const res = await client.get<string[]>('/api/documents/passages', { params: { source } })
  return res.data
}

/**
 * The full markdown body of one document. Null when the API has no stored body
 * for it, which happens when the corpus was ingested before bodies were kept;
 * the reader then falls back to passages. Any other failure throws.
 */
export async function fetchDocumentBody(source: string): Promise<string | null> {
  try {
    const res = await client.get<{ source: string; body: string }>('/api/documents/body', {
      params: { source },
    })
    return res.data.body
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

/** The most the documents endpoint returns per call. */
const DOCUMENTS_MAX_LIMIT = 200

/**
 * Resolve a cited title to its library record; null when the corpus no longer
 * has it. Exact title only: the pane is the audit trail for a citation, so a
 * near miss must show as missing rather than as a different document. The
 * search is a substring match sorted by title, so ask for the full page: a
 * handful of longer titles containing this one must not push it off the end.
 */
export async function findDocumentByTitle(title: string): Promise<PolicyDocument | null> {
  const { items } = await searchDocuments({ q: title, limit: DOCUMENTS_MAX_LIMIT })
  return items.find((doc) => doc.title === title) ?? null
}
