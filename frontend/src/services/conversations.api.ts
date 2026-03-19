import { http } from './http'
import type { Conversation } from '../types'

export async function createConversation(firstMessage?: string): Promise<Conversation> {
  const { data } = await http.post<Conversation>('/chat/conversations', { firstMessage })
  return data
}

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await http.get<Conversation[]>('/chat/conversations')
  return data
}

export async function updateConversation(id: string, title: string): Promise<Conversation> {
  const { data } = await http.patch<Conversation>(`/chat/conversations/${id}`, { title })
  return data
}

export async function deleteConversation(id: string): Promise<void> {
  await http.delete(`/chat/conversations/${id}`)
}
