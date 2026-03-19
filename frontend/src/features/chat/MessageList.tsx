import { useEffect, useRef } from 'react'
import Message from './Message'
import BrandLogo from '../../components/BrandLogo'
import { SCROLL_THRESHOLD_PX } from '../../constants/api'
import type { Message as MessageType } from '../../types'

function TypingIndicator() {
  return (
    <div className="flex gap-3 py-2">
      <div className="mt-5 flex-shrink-0">
        <BrandLogo />
      </div>
      <div className="flex flex-col gap-1.5 items-start">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[13px] font-semibold text-gray-900">Template.net</span>
          <span className="text-xs text-gray-400">· Light AI</span>
        </div>
        <div className="flex items-center gap-1.5 py-2.5 px-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s`, animationDuration: '1.2s' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-semibold text-gray-900">How can I help you today?</h2>
        <p className="text-sm text-gray-400">Ask me anything — I'm powered by Template.net AI.</p>
      </div>
    </div>
  )
}

interface Props {
  conversationId: string | null
  messages: MessageType[]
  isLoading: boolean
  hasMore: boolean
  isFetchingMore: boolean
  onLoadMore: () => void
}

export default function MessageList({ conversationId, messages, isLoading, hasMore, isFetchingMore, onLoadMore }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const isInitialLoadRef = useRef(true)

  // Reset initial-load flag whenever the conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true
  }, [conversationId])

  // Scroll to bottom — instant on initial load, smooth for new messages
  useEffect(() => {
    if (isFetchingMore) return
    if (messages.length === 0) return
    const behavior = isInitialLoadRef.current ? 'instant' : 'smooth'
    isInitialLoadRef.current = false
    bottomRef.current?.scrollIntoView({ behavior })
  }, [messages.length, isLoading, isFetchingMore])

  // Preserve scroll position after prepending older messages
  useEffect(() => {
    const el = scrollRef.current
    if (!el || prevScrollHeightRef.current === 0) return
    el.scrollTop = el.scrollHeight - prevScrollHeightRef.current
    prevScrollHeightRef.current = 0
  }, [messages])

  // Detect scroll to top
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      if (el.scrollTop <= SCROLL_THRESHOLD_PX && hasMore && !isFetchingMore) {
        prevScrollHeightRef.current = el.scrollHeight
        onLoadMore()
      }
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [hasMore, isFetchingMore, onLoadMore])

  if (messages.length === 0 && !isLoading) {
    return <EmptyState />
  }

  const lastMsg = messages[messages.length - 1]
  const showTyping = isLoading && (!lastMsg || (lastMsg.role === 'assistant' && lastMsg.content === ''))
  const streamingId = isLoading && lastMsg?.role === 'assistant' && lastMsg.content !== ''
    ? lastMsg.id
    : null

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-6 pb-2">
      <div className="max-w-chat mx-auto flex flex-col gap-1">
        {isFetchingMore && (
          <div className="flex justify-center py-2">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          </div>
        )}
        {messages
          .filter((msg) => !(msg.role === 'assistant' && msg.content === '' && isLoading))
          .map((msg) => (
            <Message key={msg.id} {...msg} isStreaming={msg.id === streamingId} />
          ))}
        {showTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
