import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Sparkles, Plus, X } from 'lucide-react'
import Message from '../features/chat/Message'
import ChatInput from '../features/chat/ChatInput'
import type { Message as MessageType } from '../types'

/* ─── Section wrapper ─────────────────────────────────────────── */
function Section({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        {children}
      </div>
    </section>
  )
}

/* ─── Color swatch ────────────────────────────────────────────── */
function Swatch({ label, bg, text }: { label: string; bg: string; text?: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[80px]">
      <div className={`w-full h-14 rounded-xl border border-gray-100 ${bg}`} />
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      {text && <span className="text-[10px] text-gray-400 font-mono">{text}</span>}
    </div>
  )
}

/* ─── Badge ───────────────────────────────────────────────────── */
function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

/* ─── Sample messages ─────────────────────────────────────────── */
const SAMPLE_USER: MessageType = {
  id: '1',
  role: 'user',
  content: 'Can you write me a professional email template for a job application?',
  fileIds: null,
  conversationId: 'demo',
  createdAt: new Date().toISOString(),
}

const SAMPLE_AI: MessageType = {
  id: '2',
  role: 'assistant',
  content: `Sure! Here's a polished job application email template:

**Subject:** Application for [Position] – [Your Name]

Dear [Hiring Manager's Name],

I am writing to express my interest in the **[Position]** role at **[Company Name]**. With [X years] of experience in [field], I am confident in my ability to contribute meaningfully to your team.

Key highlights of my background:
- [Achievement 1]
- [Achievement 2]
- [Achievement 3]

I have attached my resume for your review. Thank you for your time and consideration.

Best regards,
[Your Name]`,
  fileIds: null,
  conversationId: 'demo',
  createdAt: new Date().toISOString(),
}

const SAMPLE_WITH_FILE: MessageType = {
  id: '3',
  role: 'user',
  content: 'Please review this document.',
  fileIds: ['f1'],
  _fileName: 'resume_john_doe.pdf',
  conversationId: 'demo',
  createdAt: new Date().toISOString(),
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function ComponentsPage() {
  const [inputDemo, setInputDemo] = useState(false)

  return (
    <div className="min-h-full bg-surface">
      {/* Page header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={15} />
            Back to Chat
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-brand flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2v8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">UI Component Library</span>
            <Badge label="Template.net" className="bg-brand-light text-brand" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-10">

        {/* ── Design Tokens ── */}
        <Section title="Design Tokens" description="Core colors and brand palette.">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Brand</p>
              <div className="flex gap-4 flex-wrap">
                <Swatch label="brand" bg="bg-brand" text="#3333FF" />
                <Swatch label="brand-dark" bg="bg-brand-dark" text="#2222DD" />
                <Swatch label="brand-light" bg="bg-brand-light" text="#EFF0FF" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Surface</p>
              <div className="flex gap-4 flex-wrap">
                <Swatch label="surface" bg="bg-surface border" text="#F9FAFE" />
                <Swatch label="white" bg="bg-white border" text="#FFFFFF" />
                <Swatch label="gray-100" bg="bg-gray-100" text="#F3F4F6" />
                <Swatch label="gray-200" bg="bg-gray-200" text="#E5E7EB" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Text</p>
              <div className="flex gap-4 flex-wrap">
                <Swatch label="gray-900" bg="bg-gray-900" text="#111827" />
                <Swatch label="gray-500" bg="bg-gray-500" text="#6B7280" />
                <Swatch label="gray-400" bg="bg-gray-400" text="#9CA3AF" />
                <Swatch label="gray-300" bg="bg-gray-300" text="#D1D5DB" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section title="Typography" description="Font scale used across the interface.">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[11px] text-gray-400 font-mono flex-shrink-0">text-2xl</span>
              <span className="text-2xl font-semibold text-gray-900">How can I help you today?</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[11px] text-gray-400 font-mono flex-shrink-0">text-lg</span>
              <span className="text-lg font-semibold text-gray-900">Section Heading</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[11px] text-gray-400 font-mono flex-shrink-0">text-sm</span>
              <span className="text-sm text-gray-700">Body text — used in chat messages and descriptions.</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[11px] text-gray-400 font-mono flex-shrink-0">text-xs</span>
              <span className="text-xs text-gray-500">Caption / secondary text</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-20 text-[11px] text-gray-400 font-mono flex-shrink-0">text-[10px]</span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Label / Eyebrow</span>
            </div>
          </div>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Buttons" description="All button variants used in the chat interface.">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Primary – Generate Free */}
            <button className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-[13px] font-semibold px-4 py-1.5 rounded-full transition-colors">
              <Sparkles size={14} strokeWidth={2} />
              Generate Free
            </button>

            {/* Loading state */}
            <button className="flex items-center gap-1.5 bg-brand opacity-80 text-white text-[13px] font-semibold px-4 py-1.5 rounded-full cursor-wait">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              Generating…
            </button>

            {/* Disabled */}
            <button disabled className="flex items-center gap-1.5 bg-brand opacity-40 text-white text-[13px] font-semibold px-4 py-1.5 rounded-full cursor-not-allowed">
              <Sparkles size={14} strokeWidth={2} />
              Generate Free
            </button>

            {/* Upload (+) */}
            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors">
              <Plus size={18} strokeWidth={2} />
            </button>

            {/* Icon ghost */}
            <button className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <X size={16} />
            </button>

            {/* Back button */}
            <button className="flex items-center gap-1 text-[13px] font-medium text-gray-500 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <ChevronLeft size={16} />
              Back
            </button>

            {/* Upgrade pill */}
            <button className="flex items-center justify-center w-11 h-11 rounded-full bg-brand hover:bg-brand-dark transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </button>
          </div>

          {/* Badge variants */}
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100">
            <Badge label="Template.net" className="bg-brand-light text-brand" />
            <Badge label="Light AI" className="bg-gray-100 text-gray-600" />
            <Badge label="Pro" className="bg-amber-50 text-amber-700" />
            <Badge label="New" className="bg-green-50 text-green-700" />
          </div>
        </Section>

        {/* ── Messages ── */}
        <Section title="Message Bubbles" description="User and AI message variants.">
          <div className="flex flex-col gap-2 max-w-chat">
            <Message {...SAMPLE_USER} />
            <Message {...SAMPLE_AI} />
            <Message {...SAMPLE_WITH_FILE} />
          </div>
        </Section>

        {/* ── Typing indicator ── */}
        <Section title="Typing Indicator" description="Shown while the AI is generating a response.">
          <div className="flex gap-3 py-1">
            <div className="flex-shrink-0">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="6" fill="#3333FF" />
                <path d="M7 14h14M14 7v14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
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
        </Section>

        {/* ── Chat Input ── */}
        <Section title="Chat Input" description="The main prompt input with upload and generate controls.">
          <div className="-mx-6 -mb-6 rounded-b-2xl overflow-hidden">
            <ChatInput onSend={(t: string, f: File | null) => { console.log('demo send', t, f); setInputDemo(true) }} isLoading={inputDemo} />
            {inputDemo && (
              <div className="px-6 pb-4 -mt-2">
                <button onClick={() => setInputDemo(false)} className="text-xs text-brand hover:underline">
                  Reset loading state
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* ── Empty State ── */}
        <Section title="Empty State" description="Shown before the first message is sent.">
          <div className="flex items-center justify-center py-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M8 16h16M16 8v16" stroke="#3333FF" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">How can I help you today?</h2>
              <p className="text-sm text-gray-400">Ask me anything — I'm powered by Template.net AI.</p>
            </div>
          </div>
        </Section>

        {/* ── Error Banner ── */}
        <Section title="Error Banner" description="Shown when a request fails.">
          <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-2 rounded-lg">
            <span>Something went wrong. Please try again.</span>
            <button className="text-red-400 hover:text-red-600 px-1 transition-colors">✕</button>
          </div>
        </Section>

        <footer className="text-center text-xs text-gray-300 pb-4">
          Template.net AI Chat · UI Component Library
        </footer>
      </main>
    </div>
  )
}
