import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import client from '../../api/client'
import EscalateButton from './EscalateButton'

function axiosError(status: number): AxiosError {
  return new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: 'Error',
    data: {},
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  })
}

describe('EscalateButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing before a conversation exists', () => {
    const { container } = render(
      <EscalateButton
        sessionId={null}
        messageIndex={0}
        reason="refused"
        onEscalated={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('opens the HR form and posts message_id, not the question text', async () => {
    const user = userEvent.setup()
    const onEscalated = vi.fn()
    vi.spyOn(client, 'post').mockResolvedValue({
      data: { escalation_id: 'esc-abcdef12xxxx' },
    } as AxiosResponse)

    render(
      <EscalateButton
        sessionId="sess-1"
        messageId="msg-9"
        messageIndex={3}
        reason="refused"
        prominent
        onEscalated={onEscalated}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ask Human Resources' }))
    expect(screen.getByRole('heading', { name: 'Send to Human Resources' })).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Note for Human Resources (optional)'),
      '  manager said this changed  ',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(client.post).toHaveBeenCalledWith('/api/escalations', {
      session_id: 'sess-1',
      message_id: 'msg-9',
      reason: 'refused',
      note: 'manager said this changed',
    })
    const body = vi.mocked(client.post).mock.calls[0][1] as Record<string, unknown>
    expect(body).not.toHaveProperty('question')
    expect(body).not.toHaveProperty('message_index')
    expect(onEscalated).toHaveBeenCalledWith('esc-abcdef12xxxx')
  })

  it('falls back to message_index when the turn has no server id', async () => {
    const user = userEvent.setup()
    vi.spyOn(client, 'post').mockResolvedValue({
      data: { escalation_id: 'esc-no-id' },
    } as AxiosResponse)

    render(
      <EscalateButton
        sessionId="sess-1"
        messageIndex={4}
        reason="unhelpful"
        onEscalated={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Ask Human Resources/ }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(client.post).toHaveBeenCalledWith('/api/escalations', {
      session_id: 'sess-1',
      message_index: 4,
      reason: 'unhelpful',
      note: null,
    })
  })

  it('shows the reference once escalated', () => {
    render(
      <EscalateButton
        sessionId="sess-1"
        messageIndex={1}
        reason="unhelpful"
        escalationId="esc-xyz98765"
        onEscalated={vi.fn()}
      />,
    )
    expect(screen.getByText(/Sent to Human Resources/)).toBeInTheDocument()
    expect(screen.getByText(/ref esc-xyz9/)).toBeInTheDocument()
  })

  it('explains a 400 and returns to idle on cancel', async () => {
    const user = userEvent.setup()
    vi.spyOn(client, 'post').mockRejectedValue(axiosError(400))
    render(
      <EscalateButton
        sessionId="sess-1"
        messageIndex={1}
        reason="unhelpful"
        onEscalated={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Ask Human Resources/ }))
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(
      await screen.findByText('This conversation is out of sync. Reload the page and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Send to Human Resources' })).not.toBeInTheDocument()
  })

  it('explains a 429 rate limit', async () => {
    const user = userEvent.setup()
    vi.spyOn(client, 'post').mockRejectedValue(axiosError(429))
    render(
      <EscalateButton
        sessionId="sess-1"
        messageIndex={1}
        reason="unhelpful"
        onEscalated={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Ask Human Resources/ }))
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(
      await screen.findByText('Too many requests. Wait a minute and try again.'),
    ).toBeInTheDocument()
  })

  it('explains a generic failure when Human Resources cannot be reached', async () => {
    const user = userEvent.setup()
    vi.spyOn(client, 'post').mockRejectedValue(new Error('offline'))
    render(
      <EscalateButton
        sessionId="sess-1"
        messageIndex={1}
        reason="unhelpful"
        onEscalated={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Ask Human Resources/ }))
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(
      await screen.findByText('Could not reach Human Resources right now. Try again in a moment.'),
    ).toBeInTheDocument()
  })
})
