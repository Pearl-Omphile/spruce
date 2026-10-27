import { lazy } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { AuthProvider } from './context/AuthContext'
import { BookingDraftProvider } from './context/BookingDraft'
import Home from './pages/Home'
import Welcome from './pages/Welcome'

// Each screen loads on demand so the first screen opens fast
const AuthPage = lazy(() => import('./pages/AuthPage'))
const BecomeCleaner = lazy(() => import('./pages/BecomeCleaner'))
const Bookings = lazy(() => import('./pages/Bookings'))
const Jobs = lazy(() => import('./pages/Bookings').then((m) => ({ default: m.Jobs })))
const Booked = lazy(() => import('./pages/Booked'))
const CleanerProfile = lazy(() => import('./pages/CleanerProfile'))
const Explore = lazy(() => import('./pages/Explore'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Admin = lazy(() => import('./pages/Admin'))
const Chat = lazy(() => import('./pages/Chat'))
const book = (step: 'BookService' | 'BookDetails' | 'BookSchedule' | 'BookCleaner' | 'BookReview') =>
  lazy(() => import('./pages/Book').then((m) => ({ default: m[step] })))
const BookService = book('BookService')
const BookDetails = book('BookDetails')
const BookSchedule = book('BookSchedule')
const BookCleaner = book('BookCleaner')
const BookReview = book('BookReview')

// HashRouter keeps deep links working on GitHub Pages (no server-side rewrites there).
export default function App() {
  return (
    <AuthProvider>
      <BookingDraftProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="welcome" element={<Welcome />} />
              <Route path="explore" element={<Explore />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="profile/cleaner" element={<BecomeCleaner />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="book" element={<BookService />} />
              <Route path="book/details" element={<BookDetails />} />
              <Route path="book/schedule" element={<BookSchedule />} />
              <Route path="book/cleaner" element={<BookCleaner />} />
              <Route path="book/review" element={<BookReview />} />
              <Route path="booked/:id" element={<Booked />} />
              <Route path="cleaners/:id" element={<CleanerProfile />} />
              <Route path="auth" element={<AuthPage />} />
              <Route path="admin" element={<Admin />} />
              <Route path="chat/:id" element={<Chat />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </BookingDraftProvider>
    </AuthProvider>
  )
}
