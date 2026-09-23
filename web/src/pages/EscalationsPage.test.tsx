import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    ...overrides,
  }
}

function axiosError(status: number, data: unknown): AxiosError {
  return new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  })
}

function mockList(items: Escalation[], total = items.length) {
  return vi.spyOn(client, 'get').mockResolvedValue({ data: { items, total } } as AxiosResponse)
}

async function openFirstRequest() {
  const user = userEvent.setup()
  render(<EscalationsPage />)
  await user.click(await screen.findByRole('button', { name: /pet insurance/ }))
  return user
}

describe('EscalationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('shows the server total, not the length of the capped page', async () => {
    mockList([escalation()], 80)
    render(<EscalationsPage />)
    expect(await screen.findByText('80 open')).toBeInTheDocument()
  })

  it('scrolls the detail panel into view when a request is picked', async () => {
    mockList([escalation()])
    await openFirstRequest()
    expect(screen.getByText('HR Request')).toBeInTheDocument()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'smooth',
    })
  })

  it('scrolls back to an open request without clearing its note', async () => {
    mockList([escalation()])
    const user = await openFirstRequest()
    await user.type(screen.getByLabelText('Resolution note'), 'Half written')

    await user.click(screen.getByRole('button', { name: /pet insurance/ }))

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('Resolution note')).toHaveValue('Half written')
  })

  it('says so when a retried delivery fails again', async () => {
    mockList([escalation()])
    vi.spyOn(client, 'post').mockResolvedValue({
      data: escalation({ delivery_attempts: 2 }),
    } as AxiosResponse)
    const user = await openFirstRequest()

    await user.click(screen.getByRole('button', { name: 'Retry delivery' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delivery was retried and failed again.',
    )
  })

  it('shows no error when the retry is delivered', async () => {
    mockList([escalation()])
    vi.spyOn(client, 'post').mockResolvedValue({
      data: escalation({ delivery_status: 'delivered', delivery_attempts: 2 }),
    } as AxiosResponse)
    const user = await openFirstRequest()

    await user.click(screen.getByRole('button', { name: 'Retry delivery' }))

    expect(await screen.findByText('delivered', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it("shows the server's reason when a retry is refused", async () => {
    mockList([escalation()])
    vi.spyOn(client, 'post').mockRejectedValue(
      axiosError(409, { detail: 'Maximum delivery attempts reached.' }),
    )
    const user = await openFirstRequest()

    await user.click(screen.getByRole('button', { name: 'Retry delivery' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Maximum delivery attempts reached.')
  })

  it('resolves with the trimmed note and reloads the open queue', async () => {
    const get = mockList([escalation()])
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
    expect(get).toHaveBeenCalledTimes(2)
  })

  it("shows the server's reason when a reopen fails", async () => {
    mockList([escalation({ status: 'resolved', resolution: 'Done.', delivery_status: 'delivered' })])
    vi.spyOn(client, 'patch').mockRejectedValue(axiosError(404, { detail: 'Escalation not found.' }))
    const user = userEvent.setup()
    render(<EscalationsPage />)

    await user.click(await screen.findByRole('button', { name: 'Resolved' }))
    await user.click(await screen.findByRole('button', { name: /pet insurance/ }))
    await user.click(screen.getByRole('button', { name: 'Reopen request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Escalation not found.')
  })

  it('offers a retry when the list fails to load', async () => {
    vi.spyOn(client, 'get').mockRejectedValue(new Error('network'))
    render(<EscalationsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load HR requests.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
