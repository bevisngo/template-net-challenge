import ReactMarkdown from 'react-markdown'
import BrandLogo from '../../components/BrandLogo'
import type { Message as MessageType } from '../../types'

export default function Message({ role, content, fileIds, _fileName, isStreaming }: MessageType & { isStreaming?: boolean }) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 py-2 w-full max-w-chat ${isUser ? 'flex-row-reverse ml-auto' : 'flex-row'}`}>
      {/* AI avatar */}
      {!isUser && (
        <div className="mt-5 flex-shrink-0">
          <BrandLogo />
        </div>
      )}

      <div className={`flex flex-col gap-1.5 max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* AI sender label */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[13px] font-semibold text-gray-900">Template.net</span>
            <span className="text-xs text-gray-400">· Light AI</span>
          </div>
        )}

        {/* File attachment pill */}
        {isUser && (fileIds?.length || _fileName) && (
          <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-700 max-w-[260px]">
            <span className="text-base flex-shrink-0">📎</span>
            <span className="truncate">{_fileName ?? `${fileIds?.length} file(s)`}</span>
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="bg-gray-100 rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-sm text-gray-900 leading-relaxed">
            <p>{content}</p>
          </div>
        ) : (
          <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none
            prose-p:my-1.5 prose-p:last:mb-0
            prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5
            prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-[#1e1e2e] prose-pre:text-[#cdd6f4] prose-pre:rounded-lg prose-pre:p-3.5 prose-pre:overflow-x-auto
          ">
            <ReactMarkdown>{content.replace(/\n/g, '  \n')}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-[3px] h-[1em] bg-gray-500 ml-0.5 align-middle animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
