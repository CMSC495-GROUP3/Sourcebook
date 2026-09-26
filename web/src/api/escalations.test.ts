import { AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import client from './client'
import { escalationErrorMessage, getEscalation } from './escalations'

function axiosError(status: number, data: unknown): AxiosError {
  return new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  })
}

describe('escalationErrorMessage', () => {
  it('returns the route detail', () => {
    const error = axiosError(409, { detail: 'Maximum delivery attempts reached.' })
    expect(escalationErrorMessage(error, 'fallback')).toBe('Maximum delivery attempts reached.')
  })

  it('returns the rate limiter message, which uses `error`, not `detail`', () => {
    const error = axiosError(429, { error: 'Rate limit exceeded: 5 per 1 minute' })
    expect(escalationErrorMessage(error, 'fallback')).toBe('Rate limit exceeded: 5 per 1 minute')
  })

  it('falls back when detail is a validation list rather than a sentence', () => {
    const error = axiosError(422, { detail: [{ msg: 'field required' }] })
    expect(escalationErrorMessage(error, 'fallback')).toBe('fallback')
  })

  it('falls back when the response has no body or the error is not from axios', () => {
    expect(escalationErrorMessage(axiosError(500, ''), 'fallback')).toBe('fallback')
    expect(escalationErrorMessage(new Error('network'), 'fallback')).toBe('fallback')
  })
})

describe('escalation paths', () => {
  it('encodes the id so a crafted link cannot reach another route', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: {} } as AxiosResponse)
    await getEscalation('../documents')
    expect(get).toHaveBeenCalledWith('/api/escalations/..%2Fdocuments')
  })
})
