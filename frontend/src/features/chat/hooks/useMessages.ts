import { useState, useCallback, useRef, useEffect } from 'react'
import { createConversation } from '../../../services/conversations.api'
import { getMessages, sendMessageStream } from '../../../services/messages.api'
import { uploadFile } from '../../../services/files.api'
import type { Message } from '../../../types'

interface UseMessagesOptions {
  conversationId: string | null
  setConversationId: (id: string) => void
  onPendingConversation: () => void
  onConversationCreated: () => void
}

export function useMessages({
  conversationId,
  setConversationId,
  onPendingConversation,
  onConversationCreated,
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  // Skip the getMessages fetch when we just created the conversation ourselves —
  // the optimistic messages are already in state and the DB is empty at that point.
  const skipNextFetch = useRef(false)

  useEffect(() => {
    if (!conversationId) { setMessages([]); setHasMore(false); return }
    if (skipNextFetch.current) { skipNextFetch.current = false; return }
    getMessages(conversationId)
      .then(({ data, hasMore }) => { setMessages(data); setHasMore(hasMore) })
      .catch(() => setError('Failed to load messages.'))
  }, [conversationId])

  const handleLoadMore = useCallback(async () => {
    if (!conversationId || isFetchingMore || !hasMore) return
    const oldestId = messages[0]?.id
    if (!oldestId) return
    setIsFetchingMore(true)
    try {
      const { data, hasMore: more } = await getMessages(conversationId, oldestId)
      setMessages((prev) => [...data, ...prev])
      setHasMore(more)
    } catch {
      setError('Failed to load more messages.')
    } finally {
      setIsFetchingMore(false)
    }
  }, [conversationId, isFetchingMore, hasMore, messages])

  const handleSend = useCallback(async (text: string, file: File | null) => {
    if (!text.trim() && !file) return
    setError(null)

    const isFirstMessage = !conversationId
    let createdNewConversation = false

    const tmpUserId = `tmp-user-${Date.now()}`
    const tmpAiId = `tmp-ai-${Date.now()}`

    try {
      let convId = conversationId
      let uploadedFileId: string | undefined
      let fileName: string | undefined

      if (isFirstMessage) {
        onPendingConversation()
        setMessages([
          {
            id: tmpUserId,
            role: 'user',
            content: text,
            fileIds: null,
            conversationId: '',
            createdAt: new Date().toISOString(),
            _fileName: file?.name,
          },
          {
            id: tmpAiId,
            role: 'assistant',
            content: '',
            fileIds: null,
            conversationId: '',
            createdAt: new Date().toISOString(),
          },
        ])
        setIsLoading(true)

        const [conv, uploadResult] = await Promise.all([
          createConversation(text),
          file ? uploadFile(file) : Promise.resolve(null),
        ])
        convId = conv.id
        uploadedFileId = uploadResult?.id
        fileName = file?.name

        skipNextFetch.current = true
        setConversationId(convId)
        createdNewConversation = true
      } else {
        if (file) {
          const ready = await uploadFile(file)
          fileName = file.name
          uploadedFileId = ready.id
        }

        setMessages((prev) => [
          ...prev,
          {
            id: tmpUserId,
            role: 'user',
            content: text,
            fileIds: uploadedFileId ? [uploadedFileId] : null,
            conversationId: convId!,
            createdAt: new Date().toISOString(),
            _fileName: fileName,
          },
          {
            id: tmpAiId,
            role: 'assistant',
            content: '',
            fileIds: null,
            conversationId: convId!,
            createdAt: new Date().toISOString(),
          },
        ])
        setIsLoading(true)
      }

      for await (const event of sendMessageStream(
        convId!,
        text,
        uploadedFileId ? [uploadedFileId] : undefined,
      )) {
        if (event.type === 'userMessage') {
          setMessages((prev) =>
            prev.map((m) => (m.id === tmpUserId ? { ...event.data, _fileName: fileName } : m))
          )
        } else if (event.type === 'chunk') {
          setMessages((prev) =>
            prev.map((m) => (m.id === tmpAiId ? { ...m, content: m.content + event.data } : m))
          )
        } else if (event.type === 'aiMessage') {
          setMessages((prev) => prev.map((m) => (m.id === tmpAiId ? event.data : m)))
        } else if (event.type === 'conversationTitle') {
          onConversationCreated()
          createdNewConversation = false
        } else if (event.type === 'error') {
          throw new Error(event.data)
        }
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string }
      const backendMsg = axiosErr.response?.data?.message
      const msg = (Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg) ?? axiosErr.message ?? 'Something went wrong. Please try again.'
      setError(msg)
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('tmp-')))
    } finally {
      setIsLoading(false)
      if (isFirstMessage || createdNewConversation) {
        onConversationCreated()
      }
    }
  }, [conversationId, setConversationId, onPendingConversation, onConversationCreated])

  return {
    messages,
    isLoading,
    error,
    hasMore,
    isFetchingMore,
    handleLoadMore,
    handleSend,
    setError,
  }
}
