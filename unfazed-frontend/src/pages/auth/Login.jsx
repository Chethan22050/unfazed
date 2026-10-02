import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../context/useAuth'

function getErrorMessage(error) {
  if (!error.response) {
    return 'Cannot reach the backend. Start the API and confirm MongoDB Atlas allows your current IP address.'
  }
  return error.response?.data?.message || 'Could not sign in. Check your details and try again.'
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link className="wordmark wordmark-light" to="/">unfazed<span>.</span></Link>
        <div className="story-copy">
          <p className="eyebrow eyebrow-light">A calmer way to practice</p>
          <h1>Make room for the work that matters.</h1>
          <p>Your practice, your rhythm. Keep the details in order and your attention where it belongs.</p>
        </div>
        <div className="story-note"><span className="note-mark">“</span><span>Care begins with a little more space.</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">THERAPIST SPACE</p>
          <h2>Welcome back</h2>
          <p className="form-intro">Sign in to manage your practice.</p>
          {location.state?.message && <p className="notice notice-success" role="status">{location.state.message}</p>}
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>Email address
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>Password
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="button button-primary button-wide" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="form-switch">New to Unfazed? <Link to="/register">Create an account</Link></p>
        </div>
        <p className="auth-foot">A focused workspace for independent therapists.</p>
      </section>
    </main>
  )
}