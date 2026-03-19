export interface UploadedFile {
  id: string
  originalName: string
  mimeType: string
  size: number
  status: 'processing' | 'ready' | 'failed'
  userId: string
  createdAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  fileIds: string[] | null
  conversationId: string
  createdAt: string
  /** Frontend-only: file name shown in the bubble while uploading/after send */
  _fileName?: string
}

export interface Conversation {
  id: string
  title: string
  userId: string
  messages?: Message[]
  createdAt: string
  updatedAt: string
}

export type SSEEvent =
  | { type: 'userMessage'; data: Message }
  | { type: 'chunk'; data: string }
  | { type: 'aiMessage'; data: Message }
  | { type: 'conversationTitle'; data: string }
  | { type: 'error'; data: string }
