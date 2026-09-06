/**
 * Document library calls, shared by the Policy Library page and the source
 * pane in chat. The API is title-searchable only, so a citation (which names
 * a document by title) is resolved with a search and an exact-title match.
 */
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

/** Resolve a cited title to its library record; null when the corpus no longer has it. */
export async function findDocumentByTitle(title: string): Promise<PolicyDocument | null> {
  const { items } = await searchDocuments({ q: title, limit: 5 })
  return items.find((doc) => doc.title === title) ?? items[0] ?? null
}
