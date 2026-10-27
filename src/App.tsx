import { lazy } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import Home from './pages/Home'
import SetupNeeded from './pages/SetupNeeded'

// Split each page into its own chunk so the home page loads fast
const AuthPage = lazy(() => import('./pages/AuthPage'))
const BecomeCleaner = lazy(() => import('./pages/BecomeCleaner'))
const Bookings = lazy(() => import('./pages/Bookings'))
const CleanerProfile = lazy(() => import('./pages/CleanerProfile'))
const FindCleaners = lazy(() => import('./pages/FindCleaners'))
const NotFound = lazy(() => import('./pages/NotFound'))

// HashRouter keeps deep links working on GitHub Pages (no server-side rewrites there).
export default function App() {
  if (!isConfigured) return <SetupNeeded />
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="find" element={<FindCleaners />} />
            <Route path="cleaners/:id" element={<CleanerProfile />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="become-a-cleaner" element={<BecomeCleaner />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
