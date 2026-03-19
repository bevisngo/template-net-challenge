import { http } from './http'
import { inferMimeType } from '../utils/mime'
import { sleep } from '../utils/polling'
import { FILE_POLLING_MAX_ATTEMPTS, FILE_POLLING_INTERVAL_MS } from '../constants/api'
import type { UploadedFile } from '../types'

export async function initiatePresignedUpload(
  filename: string,
  mimeType: string,
  size: number,
): Promise<{ fileId: string; uploadUrl: string }> {
  const { data } = await http.post<{ fileId: string; uploadUrl: string }>(
    '/files/presigned-upload',
    { filename, mimeType, size },
  )
  return data
}

export async function putFileToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload to storage failed (${res.status})`)
}

export async function confirmUpload(fileId: string): Promise<UploadedFile> {
  const { data } = await http.post<UploadedFile>(`/files/${fileId}/confirm`)
  return data
}

export async function getFileStatus(id: string): Promise<UploadedFile> {
  const { data } = await http.get<UploadedFile>(`/files/${id}`)
  return data
}

export async function waitForFileReady(id: string): Promise<UploadedFile> {
  for (let i = 0; i < FILE_POLLING_MAX_ATTEMPTS; i++) {
    const file = await getFileStatus(id)
    if (file.status === 'ready') return file
    if (file.status === 'failed') throw new Error('File processing failed')
    await sleep(FILE_POLLING_INTERVAL_MS)
  }
  throw new Error('File processing timed out')
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const mimeType = inferMimeType(file)
  const { fileId, uploadUrl } = await initiatePresignedUpload(file.name, mimeType, file.size)
  await putFileToPresignedUrl(uploadUrl, file)
  await confirmUpload(fileId)
  return waitForFileReady(fileId)
}

export async function getPresignedDownloadUrl(id: string): Promise<{ url: string }> {
  const { data } = await http.get<{ url: string }>(`/files/${id}/url`)
  return data
}
