import { http } from './http'
import { auth } from '../utils/auth'
import { MESSAGES_LIMIT } from '../constants/api'
import type { Message, SSEEvent } from '../types'

export async function getMessages(
  conversationId: string,
  before?: string,
): Promise<{ data: Message[]; hasMore: boolean }> {
  const params: Record<string, string> = { limit: String(MESSAGES_LIMIT) }
  if (before) params.before = before
  const { data } = await http.get<{ data: Message[]; hasMore: boolean }>(
    `/chat/conversations/${conversationId}/messages`,
    { params },
  )
  return data
}

export async function* sendMessageStream(
  conversationId: string,
  content: string,
  fileIds?: string[],
): AsyncGenerator<SSEEvent> {
  const response = await fetch('/api/chat/messages/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth.getToken() ? { Authorization: `Bearer ${auth.getToken()}` } : {}),
    },
    body: JSON.stringify({ conversationId, content, ...(fileIds?.length ? { fileIds } : {}) }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Stream request failed' }))
    throw new Error(err.message ?? 'Stream request failed')
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') return
          try {
            yield JSON.parse(raw) as SSEEvent
          } catch { /* ignore malformed lines */ }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
