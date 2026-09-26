import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { AxiosResponse } from 'axios'
import client from '../api/client'
import type { PolicyDocument } from '../types'
import DocumentLibraryPage from './DocumentLibraryPage'

function policy(overrides: Partial<PolicyDocument> = {}): PolicyDocument {
  return {
    source: 'pto.md',
    doc_id: 'doc-1',
    title: 'Paid Time Off',
    category: 'Leave',
    owner: 'Human Resources',
    effective_date: '2026-01-01',
    passage_count: 4,
    preview: 'How paid time off accrues.',
    ...overrides,
  }
}

const remote = policy({ source: 'remote.md', doc_id: 'doc-2', title: 'Remote Work', preview: 'Who can work remotely.' })

/** Route GETs: the search, the categories, and a body for any document. */
function mockApi(documents: PolicyDocument[]) {
  return vi.spyOn(client, 'get').mockImplementation(async (url, config) => {
    if (url === '/api/documents') return { data: { items: documents, total: documents.length } } as AxiosResponse
    if (url === '/api/documents/categories') return { data: ['Leave'] } as AxiosResponse
    const source = (config?.params as { source?: string } | undefined)?.source
    return { data: { source, body: 'Policy text.' } } as AxiosResponse
  })
}

function Location() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

/** The browser's Back button. */
function BrowserBack() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate(-1)}>Browser back</button>
}

/** The page opens with /elsewhere behind it, so Back can leave it. */
function renderPage(url = '/documents') {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/elsewhere', url]}>
      <Routes>
        <Route path="/documents" element={<DocumentLibraryPage />} />
        <Route path="/elsewhere" element={null} />
      </Routes>
      <Location />
      <BrowserBack />
    </MemoryRouter>,
  )
  return user
}

const location = () => screen.getByTestId('location').textContent

describe('DocumentLibraryPage below lg (#266)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a document, focuses its heading, and goes back through history', async () => {
    mockApi([policy(), remote])
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: /Remote Work/ }))
    expect(location()).toBe('/documents?source=remote.md')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Remote Work' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'All policies' }))
    expect(location()).toBe('/documents')
    await waitFor(() => expect(screen.getByRole('button', { name: /Remote Work/ })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(location()).toBe('/elsewhere')
  })

  it('pushes the list for a document opened from a link, so Back returns to it', async () => {
    mockApi([policy(), remote])
    const user = renderPage('/documents?source=remote.md')
    await screen.findByRole('heading', { name: 'Remote Work' })

    await user.click(screen.getByRole('button', { name: 'All policies' }))
    expect(location()).toBe('/documents')

    await user.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(location()).toBe('/documents?source=remote.md')
  })

  it('focuses the row that was open after the browser Back button', async () => {
    mockApi([policy(), remote])
    const user = renderPage()
    await user.click(await screen.findByRole('button', { name: /Paid Time Off/ }))

    await user.click(screen.getByRole('button', { name: 'Browser back' }))

    expect(location()).toBe('/documents')
    await waitFor(() => expect(screen.getByRole('button', { name: /Paid Time Off/ })).toHaveFocus())
  })
})
