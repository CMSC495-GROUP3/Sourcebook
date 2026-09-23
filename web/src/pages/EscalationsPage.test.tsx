import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import client from '../api/client'
import type { Escalation } from '../types'
import EscalationsPage from './EscalationsPage'

function escalation(overrides: Partial<Escalation> = {}): Escalation {
  return {
    escalation_id: 'esc-1',
    status: 'open',
    reason: 'refused',
    contact: 'Human Resources',
    session_id: 'sess-1',
    message_index: 1,
    question: 'Does Meridian reimburse pet insurance?',
    answer_excerpt: 'No matching policy.',
    refused: true,
    confidence: 41,
    sources: [],
    note: null,
    resolution: null,
    created_at: '2026-09-20T12:00:00Z',
    updated_at: '2026-09-20T12:00:00Z',
    resolved_at: null,
    delivery_status: 'failed',
    delivery_attempts: 1,
    delivery_last_attempt_at: '2026-09-20T12:00:01Z',
    delivery_claimed_at: null,
    delivery_retryable: true,
    ...overrides,
  }
}

const second = escalation({ escalation_id: 'esc-2', question: 'Is there a sabbatical program?' })

function axiosError(status: number, data: unknown): AxiosError {
  return new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  })
}

interface Api {
  open?: Escalation[]
  resolved?: Escalation[]
  total?: number
  byId?: Record<string, Escalation>
}

/** Route GETs: the list by ?status, or one record by id (404 when unknown). */
function mockApi({ open = [], resolved = [], total, byId = {} }: Api) {
  return vi.spyOn(client, 'get').mockImplementation(async (url, config) => {
    if (url === '/api/escalations') {
      const params = config?.params as { status?: string } | undefined
      const items = params?.status === 'resolved' ? resolved : open
      return { data: { items, total: total ?? items.length } } as AxiosResponse
    }
    const id = url.split('/').pop() as string
    if (byId[id]) return { data: byId[id] } as AxiosResponse
    throw axiosError(404, { detail: 'Escalation not found.' })
  })
}

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(url = '/escalations') {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/escalations" element={<><EscalationsPage /><Location /></>} />
      </Routes>
    </MemoryRouter>,
  )
  return user
}

const location = () => screen.getByTestId('location').textContent

/** Report the two-pane breakpoint as matched, on top of the shared stub. */
function stubTwoPane() {
  const original = window.matchMedia
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
    const list = original(query)
    return { ...list, matches: query.includes('1024') ? true : list.matches } as MediaQueryList
  })
}

async function openFirstRequest() {
  const user = renderPage()
  await user.click(await screen.findByRole('button', { name: /pet insurance/ }))
  return user
}

describe('EscalationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the server total, not the length of the capped page', async () => {
    mockApi({ open: [escalation()], total: 80 })
    renderPage()
    expect(await screen.findByText('80 open')).toBeInTheDocument()
  })

  describe('one pane at a time (below lg)', () => {
    it('opens a request into the URL and goes back to the list', async () => {
      mockApi({ open: [escalation()] })
      const user = await openFirstRequest()

      expect(location()).toBe('/escalations?id=esc-1')
      expect(screen.getByRole('heading', { name: /pet insurance/ })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'HR Requests' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'All requests' }))
      expect(location()).toBe('/escalations')
      expect(await screen.findByRole('heading', { name: 'HR Requests' })).toBeInTheDocument()
    })

    it('opens the request a link names', async () => {
      mockApi({ open: [escalation(), second] })
      renderPage('/escalations?id=esc-2')
      expect(await screen.findByRole('heading', { name: /sabbatical/ })).toBeInTheDocument()
    })

    it('fetches a linked request that is not on the current list page', async () => {
      const get = mockApi({ open: [escalation()], byId: { 'esc-9': escalation({ escalation_id: 'esc-9', question: 'Old one?' }) } })
      renderPage('/escalations?id=esc-9')
      expect(await screen.findByRole('heading', { name: 'Old one?' })).toBeInTheDocument()
      expect(get).toHaveBeenCalledWith('/api/escalations/esc-9')
    })

    it('says so when a linked request does not exist', async () => {
      mockApi({ open: [escalation()] })
      renderPage('/escalations?id=missing')
      expect(await screen.findByText('That request was not found.')).toBeInTheDocument()
    })
  })

  describe('list beside the request (lg and up)', () => {
    beforeEach(stubTwoPane)

    it('opens the newest request when the URL names none', async () => {
      mockApi({ open: [escalation(), second] })
      renderPage()
      expect(await screen.findByRole('heading', { name: /pet insurance/ })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'HR Requests' })).toBeInTheDocument()
      expect(location()).toBe('/escalations?id=esc-1')
    })

    it('moves to the next request after a resolve, not back to the resolved one', async () => {
      const get = mockApi({ open: [escalation(), second] })
      vi.spyOn(client, 'patch').mockImplementation(async () => {
        get.mockImplementation(async () => ({ data: { items: [second], total: 1 } }) as AxiosResponse)
        return { data: escalation({ status: 'resolved' }) } as AxiosResponse
      })
      const user = renderPage()
      await screen.findByRole('heading', { name: /pet insurance/ })

      await user.type(screen.getByLabelText('Resolution note'), 'Told them.')
      await user.click(screen.getByRole('button', { name: 'Resolve request' }))

      expect(await screen.findByRole('heading', { name: /sabbatical/ })).toBeInTheDocument()
      await waitFor(() => expect(location()).toBe('/escalations?id=esc-2'))
      expect(screen.getByText('1 open')).toBeInTheDocument()
      expect(get).not.toHaveBeenCalledWith('/api/escalations/esc-1')
    })
  })

  it('switches tabs through the URL and drops the open request', async () => {
    mockApi({ open: [escalation()], resolved: [second] })
    const user = await openFirstRequest()
    await user.click(screen.getByRole('button', { name: 'All requests' }))

    await user.click(await screen.findByRole('button', { name: 'Resolved' }))

    expect(location()).toBe('/escalations?status=resolved')
    expect(screen.getByRole('button', { name: 'Resolved' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('button', { name: /sabbatical/ })).toBeInTheDocument()
  })

  it('says so when a retried delivery fails again', async () => {
    mockApi({ open: [escalation()] })
    vi.spyOn(client, 'post').mockResolvedValue({
      data: escalation({ delivery_attempts: 2 }),
    } as AxiosResponse)
    const user = await openFirstRequest()

    await user.click(screen.getByRole('button', { name: 'Retry delivery' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Delivery was retried and failed again.')
  })

  it("shows the server's reason when a retry is refused", async () => {
    mockApi({ open: [escalation()] })
    vi.spyOn(client, 'post').mockRejectedValue(
      axiosError(409, { detail: 'Maximum delivery attempts reached.' }),
    )
    const user = await openFirstRequest()

    await user.click(screen.getByRole('button', { name: 'Retry delivery' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Maximum delivery attempts reached.')
  })

  it('labels a request with no webhook and offers no retry', async () => {
    mockApi({
      open: [
        escalation({
          delivery_status: 'not_configured',
          delivery_attempts: 0,
          delivery_last_attempt_at: null,
          delivery_retryable: false,
        }),
      ],
    })
    await openFirstRequest()

    expect(screen.getByText('No webhook configured')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Retry delivery|Send to webhook/ })).not.toBeInTheDocument()
  })

  it('explains the attempt limit instead of offering a retry that cannot send', async () => {
    mockApi({ open: [escalation({ delivery_attempts: 5, delivery_retryable: false })] })
    await openFirstRequest()

    expect(screen.getByText(/failed after 5 attempts, the most the server allows/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry delivery' })).not.toBeInTheDocument()
  })

  it('sends a request that was filed before a webhook was configured', async () => {
    mockApi({ open: [escalation({ delivery_status: 'pending', delivery_attempts: 0 })] })
    const post = vi.spyOn(client, 'post').mockResolvedValue({
      data: escalation({ delivery_status: 'delivered', delivery_attempts: 1, delivery_retryable: false }),
    } as AxiosResponse)
    const user = await openFirstRequest()

    expect(screen.getByText('This request has not been sent to the HR webhook yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send to webhook' }))

    expect(post).toHaveBeenCalledWith('/api/escalations/esc-1/retry-delivery')
    expect(await screen.findByText('Delivered')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('resolves with the trimmed note and returns to the refreshed list', async () => {
    const get = mockApi({ open: [escalation()] })
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({
      data: escalation({ status: 'resolved' }),
    } as AxiosResponse)
    const user = await openFirstRequest()

    await user.type(screen.getByLabelText('Resolution note'), '  Not covered; told them.  ')
    await user.click(screen.getByRole('button', { name: 'Resolve request' }))

    expect(patch).toHaveBeenCalledWith('/api/escalations/esc-1', {
      status: 'resolved',
      resolution: 'Not covered; told them.',
    })
    await waitFor(() => expect(location()).toBe('/escalations'))
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    // The list refetch only: the resolved request is not fetched again by id.
    expect(get).not.toHaveBeenCalledWith('/api/escalations/esc-1')
  })

  it('keeps the resolution draft to the request it was typed for', async () => {
    mockApi({ open: [escalation(), second] })
    const user = await openFirstRequest()
    await user.type(screen.getByLabelText('Resolution note'), 'Half written')

    await user.click(screen.getByRole('button', { name: 'All requests' }))
    await user.click(await screen.findByRole('button', { name: /sabbatical/ }))

    expect(screen.getByLabelText('Resolution note')).toHaveValue('')
  })

  it("shows the server's reason when a reopen fails", async () => {
    mockApi({ resolved: [escalation({ status: 'resolved', resolution: 'Done.', delivery_status: 'delivered', delivery_retryable: false })] })
    vi.spyOn(client, 'patch').mockRejectedValue(axiosError(404, { detail: 'Escalation not found.' }))
    const user = renderPage('/escalations?status=resolved&id=esc-1')

    expect(await screen.findByText('Done.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reopen request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Escalation not found.')
  })

  it('offers a retry when the list fails to load', async () => {
    const get = vi.spyOn(client, 'get').mockRejectedValue(new Error('network'))
    const user = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load HR requests.')
    get.mockResolvedValue({ data: { items: [escalation()], total: 1 } } as AxiosResponse)
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: /pet insurance/ })).toBeInTheDocument()
  })
})
