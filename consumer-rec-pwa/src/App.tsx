import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import Home from './pages/Home'
import Results from './pages/Results'
import Onboarding from './pages/Onboarding'
import { useUserStore } from './store/userStore'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } }
})

function AppRoutes() {
  const { isOnboarded, initProfile } = useUserStore()

  useEffect(() => { initProfile() }, [])

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={isOnboarded ? <Home /> : <Navigate to="/onboarding" replace />} />
      <Route path="/results" element={isOnboarded ? <Results /> : <Navigate to="/onboarding" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
