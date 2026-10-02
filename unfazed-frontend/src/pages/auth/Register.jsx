import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../context/useAuth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const therapist = await register(form)
      navigate('/login', {
        replace: true,
        state: { message: `Your profile link is unfazed.in/${therapist.slug}. Sign in to finish setting up your profile.` },
      })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link className="wordmark wordmark-light" to="/">unfazed<span>.</span></Link>
        <div className="story-copy">
          <p className="eyebrow eyebrow-light">Your practice, thoughtfully held</p>
          <h1>Start with a space that feels like yours.</h1>
          <p>Create your therapist account and give clients one clear place to find you.</p>
        </div>
        <div className="story-note"><span className="note-mark">01</span><span>A profile link is created from your name.</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">GET STARTED</p>
          <h2>Create your account</h2>
          <p className="form-intro">Set up the foundations of your therapist profile.</p>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>Your name
              <input type="text" autoComplete="name" required maxLength="100" value={form.name} onChange={updateField('name')} />
            </label>
            <label>Email address
              <input type="email" autoComplete="email" required value={form.email} onChange={updateField('email')} />
            </label>
            <label>Password
              <input type="password" autoComplete="new-password" minLength="8" required value={form.password} onChange={updateField('password')} />
              <span className="field-hint">Use at least 8 characters.</span>
            </label>
            <button className="button button-primary button-wide" type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="form-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
        <p className="auth-foot">Your details stay in your practice workspace.</p>
      </section>
    </main>
  )
}