import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../services/auth.api'
import { auth } from '../utils/auth'

interface AuthUser {
  name: string
  email: string
}

export function useAuth() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (!auth.isLoggedIn()) return
    getMe()
      .then(setUser)
      .catch(() => { auth.removeToken(); setUser(null) })
  }, [])

  const signOut = () => {
    auth.removeToken()
    setUser(null)
    navigate('/login')
  }

  return { user, signOut }
}
