import { http } from './http'
import { auth } from '../utils/auth'

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/login', { email, password })
  auth.setToken(data.accessToken)
  return data
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/register', { name, email, password })
  auth.setToken(data.accessToken)
  return data
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await http.get<AuthUser>('/auth/me')
  return data
}
