import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import useAuth from '../context/useAuth'
import Dashboard from '../pages/therapist/Dashboard'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import PublicProfile from '../pages/client/PublicProfile'
import BookingPage from '../pages/client/BookingPage'
import Schedule from '../pages/therapist/Schedule'
import Clients from '../pages/therapist/Clients'
import ClientDetail from '../pages/therapist/ClientDetail'
import IntakeForm from '../pages/client/IntakeForm'
import Payments from '../pages/therapist/Payments'
import PublicPackages from '../pages/client/PublicPackages'
import ClientPortal from '../pages/client/ClientPortal'

const Analytics = lazy(() => import('../pages/therapist/Analytics'))

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) return <main className="page-loading">Opening your practice…</main>
  return token ? children : <Navigate to="/login" replace />
}

function HomeRoute() {
  const { token } = useAuth()
  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}

export default function AppRoutes() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/dashboard/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/dashboard/analytics" element={<ProtectedRoute><Suspense fallback={<main className="page-loading">Loading analytics…</main>}><Analytics /></Suspense></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/:clientId" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/intake/:slug" element={<IntakeForm />} />
      <Route path="/packages/:slug" element={<PublicPackages />} />
      <Route path="/portal/:clientId" element={<ClientPortal />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/:slug" element={<PublicProfile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}