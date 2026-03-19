import { useState } from 'react'
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatPage from './features/chat/ChatPage'
import ConversationList from './features/chat/ConversationList'
import ComponentsPage from './pages/ComponentsPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { auth } from './utils/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ChatLayout() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const [isPendingNewConv, setIsPendingNewConv] = useState(false)

  const conversationId = id ?? null

  const handleSelect = (id: string) => {
    if (id) navigate(`/chat/${id}`)
    else navigate('/')
  }

  const handlePendingConversation = () => setIsPendingNewConv(true)

  const handleConversationCreated = () => {
    setIsPendingNewConv(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <Sidebar />
      <ConversationList
        conversationId={conversationId}
        onSelect={handleSelect}
        onNew={() => navigate('/')}
        refreshKey={refreshKey}
        showPending={isPendingNewConv}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ChatPage
          conversationId={conversationId}
          setConversationId={(id) => navigate(`/chat/${id}`)}
          onPendingConversation={handlePendingConversation}
          onConversationCreated={handleConversationCreated}
        />
      </main>
    </div>
  )
}

function ComponentsLayout() {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <ComponentsPage />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RequireAuth><ChatLayout /></RequireAuth>} />
      <Route path="/chat/:id" element={<RequireAuth><ChatLayout /></RequireAuth>} />
      <Route path="/components" element={<RequireAuth><ComponentsLayout /></RequireAuth>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
    </Routes>
  )
}
