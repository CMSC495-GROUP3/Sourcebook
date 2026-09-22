import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosResponse } from 'axios'
import client, { TOKEN_KEY } from '../api/client'

const signOut = vi.hoisted(() => vi.fn())

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    signOut,
  }
})

import { useChat } from './useChat'

function axiosData<T>(data: T): AxiosResponse<T> {
  return { data } as AxiosResponse<T>
}

/** SSE body the chat stream parser accepts (`data: …` lines). */
function sseBody(events: Record<string, unknown>[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const text = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

function jsonResponse(body: ReadableStream<Uint8Array>, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

async function mountChat(sessionId: string | null) {
  const hook = renderHook(
    (props: { sessionId: string | null }) =>
      useChat({ sessionId: props.sessionId, onSessionCreated: vi.fn() }),
    { initialProps: { sessionId } },
  )
  if (sessionId) {
    await waitFor(() => expect(client.get).toHaveBeenCalled())
    await act(async () => {
      await Promise.resolve()
    })
  }
  return hook
}

describe('useChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    signOut.mockReset()
    localStorage.setItem(TOKEN_KEY, 'test-token')
    vi.spyOn(client, 'get').mockResolvedValue(axiosData({ messages: [] }))
  })

  it('creates a session, streams the answer, and never sends chat history', async () => {
    vi.spyOn(client, 'post').mockResolvedValue(axiosData({ session_id: 'sess-1' }))
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        sseBody([
          { chunk: 'You get ' },
          { chunk: '15 days.' },
          { done: true, sources: ['PTO Policy'], confidence: 82, refused: false, message_id: 'm-1' },
          { follow_ups: ['How do I request time off?'] },
        ]),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const onSessionCreated = vi.fn()
    const { result } = renderHook(() => useChat({ sessionId: null, onSessionCreated }))

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })

    expect(client.post).toHaveBeenCalledWith('/api/conversations', {
      title: 'How much PTO do I get?',
    })
    expect(onSessionCreated).toHaveBeenCalledWith('sess-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' })
    expect(JSON.parse(String(init.body))).toEqual({
      question: 'How much PTO do I get?',
      session_id: 'sess-1',
    })
    expect(String(init.body)).not.toContain('history')
    expect(result.current.messages).toEqual([
      { role: 'user', content: 'How much PTO do I get?' },
      {
        role: 'assistant',
        content: 'You get 15 days.',
        sources: ['PTO Policy'],
        confidence: 82,
        refused: false,
        message_id: 'm-1',
        follow_ups: ['How do I request time off?'],
      },
    ])
    expect(result.current.loading).toBe(false)
    expect(result.current.streaming).toBe(false)
  })

  it('marks a refused stream so the refusal card can render', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        sseBody([
          { chunk: 'I cannot answer that from the indexed policies.' },
          { done: true, sources: [], confidence: 41, refused: true, message_id: 'm-ref' },
        ]),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('What is the boiling point of mercury?')
    })

    const assistant = result.current.messages[1]
    expect(assistant.refused).toBe(true)
    expect(assistant.sources).toEqual([])
    expect(assistant.message_id).toBe('m-ref')
  })

  it('loads a stored conversation and maps message fields', async () => {
    vi.mocked(client.get).mockResolvedValue(
      axiosData({
        messages: [
          { role: 'user', content: 'How much PTO?' },
          {
            role: 'assistant',
            content: '15 days.',
            sources: ['PTO Policy'],
            confidence: 82,
            refused: false,
            escalation_id: 'esc-1',
            message_id: 'm-1',
            follow_ups: ['How do I request it?'],
          },
        ],
      }),
    )

    const { result } = renderHook(() =>
      useChat({ sessionId: 'sess-stored', onSessionCreated: vi.fn() }),
    )

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })
    expect(client.get).toHaveBeenCalledWith('/api/conversations/sess-stored')
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: '15 days.',
      sources: ['PTO Policy'],
      confidence: 82,
      refused: false,
      escalation_id: 'esc-1',
      message_id: 'm-1',
      follow_ups: ['How do I request it?'],
    })
  })

  it('treats a missing messages array as an empty conversation', async () => {
    vi.mocked(client.get).mockResolvedValue(axiosData({}))

    const { result } = renderHook(() =>
      useChat({ sessionId: 'sess-empty', onSessionCreated: vi.fn() }),
    )

    await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/conversations/sess-empty'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.messages).toEqual([])
  })

  it('clears messages when leaving a conversation and drops a late load', async () => {
    let resolveGet: (value: AxiosResponse<{ messages: { role: string; content: string }[] }>) => void
    vi.mocked(client.get).mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve
      }),
    )

    const { result, rerender } = renderHook(
      ({ sessionId }) => useChat({ sessionId, onSessionCreated: vi.fn() }),
      { initialProps: { sessionId: 'sess-a' as string | null } },
    )

    rerender({ sessionId: null })
    await act(async () => {
      resolveGet(axiosData({ messages: [{ role: 'user', content: 'late' }] }))
    })
    expect(result.current.messages).toEqual([])
  })

  it('skips the conversation refetch after creating a session from the first message', async () => {
    vi.spyOn(client, 'post').mockResolvedValue(axiosData({ session_id: 'sess-1' }))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          sseBody([
            { chunk: '15 days.' },
            { done: true, sources: [], confidence: 80, refused: false, message_id: 'm-1' },
          ]),
        ),
      ),
    )

    const { result, rerender } = renderHook(
      ({ sessionId }) => useChat({ sessionId, onSessionCreated: vi.fn() }),
      { initialProps: { sessionId: null as string | null } },
    )

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })
    rerender({ sessionId: 'sess-1' })

    expect(client.get).not.toHaveBeenCalled()
    expect(result.current.messages[1]?.content).toBe('15 days.')
  })

  it('signs the user out on a 401 from the stream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(result.current.messages[1]?.error).toBeUndefined()
  })

  it('shows a client error bubble when the stream returns a non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })

    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Sorry, something went wrong. Please try again.',
      error: true,
    })
  })

  it('shows a client error bubble when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })

    expect(result.current.messages[1]?.error).toBe(true)
  })

  it('applies a stream error before any assistant token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          sseBody([{ error: 'The assistant is busy. Try again in a moment.' }]),
        ),
      ),
    )

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })

    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'The assistant is busy. Try again in a moment.',
      error: true,
    })
  })

  it('replaces a partial answer when the stream reports an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          sseBody([
            { chunk: 'You get ' },
            { error: 'The connection dropped.' },
          ]),
        ),
      ),
    )

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })

    expect(result.current.messages[1]).toMatchObject({
      content: 'The connection dropped.',
      error: true,
    })
  })

  it('ignores blank, non-data, and malformed SSE lines', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: ping\n\n'))
        controller.enqueue(encoder.encode('data: \n'))
        controller.enqueue(encoder.encode('data: not-json\n'))
        controller.enqueue(encoder.encode('data: {"chun'))
        controller.enqueue(encoder.encode('k":"15 days."}\n\n'))
        controller.enqueue(
          encoder.encode(
            'data: {"done":true,"sources":[],"confidence":80,"refused":false,"message_id":"m-1"}\n\n',
          ),
        )
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(stream)))

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })

    expect(result.current.messages[1]).toMatchObject({
      content: '15 days.',
      message_id: 'm-1',
    })
  })

  it('discards remaining chunks when the user leaves mid-stream', async () => {
    const encoder = new TextEncoder()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode('data: {"chunk":"Hi"}\n\n'))
        await gate
        controller.enqueue(encoder.encode('data: {"chunk":" leftover"}\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(stream)))
    vi.mocked(client.get).mockReturnValue(new Promise(() => {}))

    const { result, rerender } = renderHook(
      ({ sessionId }) => useChat({ sessionId, onSessionCreated: vi.fn() }),
      { initialProps: { sessionId: 'sess-a' } },
    )

    let sendPromise: Promise<void> = Promise.resolve()
    await act(async () => {
      sendPromise = result.current.sendMessage('Hello')
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(result.current.messages[1]?.content).toBe('Hi')
    })

    rerender({ sessionId: 'sess-b' })
    await act(async () => {
      release()
      await sendPromise
    })

    expect(result.current.messages.some((message) => message.content.includes('leftover'))).toBe(
      false,
    )
  })

  it('does not send a second question while a stream is in flight', async () => {
    let resolveFetch!: (value: Response) => void
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = await mountChat('sess-open')

    let first: Promise<void> = Promise.resolve()
    await act(async () => {
      first = result.current.sendMessage('first')
    })
    await waitFor(() => expect(result.current.loading).toBe(true))

    await act(async () => {
      await result.current.sendMessage('second')
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFetch(
        jsonResponse(
          sseBody([
            { chunk: 'ok' },
            { done: true, sources: [], confidence: 80, refused: false, message_id: 'm-1' },
          ]),
        ),
      )
      await first
    })
    expect(result.current.messages.filter((message) => message.role === 'user')).toHaveLength(1)
  })

  it('records an escalation id on the matching message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          sseBody([
            { chunk: '15 days.' },
            { done: true, sources: [], confidence: 80, refused: false, message_id: 'm-1' },
          ]),
        ),
      ),
    )

    const { result } = await mountChat('sess-open')

    await act(async () => {
      await result.current.sendMessage('How much PTO do I get?')
    })
    await act(() => {
      result.current.markEscalated(1, 'esc-9')
    })
    expect(result.current.messages[1]?.escalation_id).toBe('esc-9')
    expect(result.current.messages[0]?.escalation_id).toBeUndefined()
  })
})
