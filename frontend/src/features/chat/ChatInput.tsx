import { useState, useRef, useCallback } from 'react'
import { Plus, X, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { TEXTAREA_MAX_HEIGHT_PX } from '../../constants/api'

interface Props {
  onSend: (text: string, file: File | null) => void
  isLoading: boolean
}

export default function ChatInput({ onSend, isLoading }: Props) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (isLoading || !text.trim()) return
    onSend(text.trim(), file)
    setText('')
    setFile(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }, [text, file, isLoading, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
    e.target.value = ''
  }

  const canSend = text.trim().length > 0 && !isLoading

  return (
    <div className="flex-shrink-0 px-5 pb-4 pt-3 bg-surface">
      <div
        className={clsx(
          'max-w-chat mx-auto bg-white border rounded-2xl px-3.5 pt-3.5 pb-2.5 flex flex-col gap-2.5 shadow-input transition-all duration-150',
          'focus-within:border-brand focus-within:shadow-input-focus border-[#cfd6dd]'
        )}
      >
        {/* File preview */}
        {file && (
          <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 w-fit max-w-full text-[13px] text-gray-700">
            <span className="text-base flex-shrink-0">📎</span>
            <span className="truncate max-w-[220px]">{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="flex items-center justify-center text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors flex-shrink-0"
              title="Remove file"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="w-full border-none outline-none resize-none text-sm leading-relaxed text-gray-900 bg-transparent min-h-[26px] max-h-[180px] overflow-y-auto placeholder:text-gray-400 disabled:opacity-60"
          placeholder="Ask template.net"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-2">
          {/* Upload button */}
          <button
            title="Upload file"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Plus size={18} strokeWidth={2} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,text/markdown,application/json"
          />

          <div className="flex-1" />

          {/* Generate Free button */}
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={clsx(
              'flex items-center gap-1.5 text-[13px] font-semibold px-4 py-1.5 rounded-full text-white transition-all duration-150 whitespace-nowrap',
              canSend
                ? 'bg-brand hover:bg-brand-dark cursor-pointer'
                : 'bg-brand opacity-40 cursor-not-allowed',
              isLoading && 'opacity-80 cursor-wait'
            )}
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
            ) : (
              <Sparkles size={14} strokeWidth={2} />
            )}
            <span>{isLoading ? 'Generating…' : 'Generate Free'}</span>
          </button>
        </div>
      </div>

      <p className="max-w-chat mx-auto mt-1.5 text-[11px] text-gray-300 text-center">
        Template.net AI can make mistakes. Verify important information.
      </p>
    </div>
  )
}
