import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMessages } from './hooks/useMessages'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

interface Props {
  conversationId: string | null
  setConversationId: (id: string) => void
  onPendingConversation: () => void
  onConversationCreated: () => void
}

export default function ChatPage({ conversationId, setConversationId, onPendingConversation, onConversationCreated }: Props) {
  const { user, signOut } = useAuth()
  const { messages, isLoading, error, hasMore, isFetchingMore, handleLoadMore, handleSend, setError } = useMessages({
    conversationId,
    setConversationId,
    onPendingConversation,
    onConversationCreated,
  })

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 border-b border-gray-200 bg-surface min-h-[52px] flex-shrink-0">
        <div />
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-600">
              Hi, <span className="font-semibold text-gray-900">{user.name}</span>
            </span>
            <button
              onClick={signOut}
              className="text-[13px] font-semibold text-gray-700 px-4 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-[13px] font-semibold text-gray-700 px-4 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Sign In
          </Link>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-2 mx-5 mt-2 rounded-lg flex-shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 px-1 transition-colors">✕</button>
        </div>
      )}

      <MessageList
        conversationId={conversationId}
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}
        onLoadMore={handleLoadMore}
      />
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  )
}
