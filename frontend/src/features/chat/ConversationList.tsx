import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { getConversations, deleteConversation, updateConversation } from '../../services/conversations.api'
import type { Conversation } from '../../types'

interface Props {
  conversationId: string | null
  onSelect: (id: string) => void
  onNew: (id: string) => void
  /** Increment to force a list refresh from outside */
  refreshKey?: number
  /** Show a "..." pending item at the top while a new conversation is being created */
  showPending?: boolean
}

export default function ConversationList({ conversationId, onSelect, onNew, refreshKey, showPending }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {/* silently fail if not authed */})
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  const handleNew = () => onNew('')

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (conversationId === id) onSelect('')
  }

  const startEdit = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditingTitle(conv.title || '')
  }

  const commitEdit = async (id: string) => {
    const trimmed = editingTitle.trim()
    if (trimmed) {
      const updated = await updateConversation(id, trimmed)
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)))
    }
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(id) }
    if (e.key === 'Escape') setEditingId(null)
  }

  return (
    <aside className="w-[220px] flex flex-col bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-[13px] font-semibold text-gray-700">Chats</span>
        <button
          onClick={handleNew}
          title="New conversation"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {/* Pending placeholder — shown immediately when first message is sent */}
        {showPending && (
          <div className="flex items-center gap-2 px-3 py-2 mx-1.5 rounded-lg bg-brand-light text-brand">
            <Loader2 size={13} className="flex-shrink-0 animate-spin" />
            <span className="flex-1 text-[13px] truncate leading-snug">...</span>
          </div>
        )}

        {conversations.length === 0 && !showPending ? (
          <p className="text-center text-[12px] text-gray-400 mt-8 px-4">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => editingId !== conv.id && onSelect(conv.id)}
              className={clsx(
                'group flex items-center gap-2 px-3 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors',
                conv.id === conversationId
                  ? 'bg-brand-light text-brand'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {editingId === conv.id ? (
                <input
                  ref={editInputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => commitEdit(conv.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, conv.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-[13px] leading-snug bg-transparent border-b border-brand outline-none truncate"
                />
              ) : (
                <span
                  onDoubleClick={(e) => startEdit(e, conv)}
                  className="flex-1 text-[13px] truncate leading-snug"
                >
                  {conv.title || 'New Conversation'}
                </span>
              )}
              {editingId !== conv.id && (
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
