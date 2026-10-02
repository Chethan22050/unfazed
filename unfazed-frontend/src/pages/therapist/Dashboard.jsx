import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axiosInstance'
import useAuth from '../../context/useAuth'

const toList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean)

function serviceText(services = []) {
  return services.map(({ title, description }) => `${title}${description ? ` | ${description}` : ''}`).join('\n')
}

export default function Dashboard() {
  const { therapist, refreshProfile, logout } = useAuth()
  if (!therapist) return <main className="page-loading">Loading your practice…</main>

  return <ProfileEditor key={therapist.updatedAt || 'profile-loading'} therapist={therapist} refreshProfile={refreshProfile} logout={logout} />
}

function ProfileEditor({ therapist, refreshProfile, logout }) {
  const [form, setForm] = useState(() => ({
    name: therapist.name || '',
    slug: therapist.slug || '',
    bio: therapist.bio || '',
    specializations: (therapist.specializations || []).join(', '),
    languages: (therapist.languages || []).join(', '),
  }))
  const [servicesText, setServicesText] = useState(() => serviceText(therapist.services))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)
    const services = servicesText.split('\n').map((line) => {
      const [title, ...descriptionParts] = line.split('|')
      return { title: title.trim(), description: descriptionParts.join('|').trim() }
    }).filter((service) => service.title)

    try {
      await api.put('/auth/profile', {
        ...form,
        specializations: toList(form.specializations),
        languages: toList(form.languages),
        services,
      })
      await refreshProfile()
      setMessage('Your profile is saved.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const profileUrl = `${window.location.origin}/${therapist.slug}`

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <Link className="wordmark" to="/">unfazed<span>.</span></Link>
        <div className="topbar-actions">
          <Link className="public-link" to="/dashboard/schedule">Schedule</Link>
          <Link className="public-link" to="/clients">Clients</Link>
          <Link className="public-link" to="/dashboard/payments">Payments</Link>
          <Link className="public-link" to="/dashboard/analytics">Analytics</Link>
          <a className="public-link" href={`/${therapist.slug}`} target="_blank" rel="noreferrer">View public profile <span aria-hidden="true">↗</span></a>
          <button className="button button-quiet" type="button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">THERAPIST DASHBOARD</p>
            <h1>Your practice, in focus.</h1>
            <p className="dashboard-subtitle">Set up the details clients will see on your profile.</p>
          </div>
          <div className="profile-monogram" aria-hidden="true">{therapist.name?.slice(0, 1) || 'T'}</div>
        </div>

        <div className="profile-editor-layout">
          <form className="profile-editor" onSubmit={handleSubmit}>
            <div className="editor-section-heading">
              <div><p className="eyebrow">PUBLIC PROFILE</p><h2>Profile details</h2></div>
              <span className="saved-status"><span className="status-dot" />Private workspace</span>
            </div>
            {message && <p className="notice notice-success" role="status">{message}</p>}
            {error && <p className="notice notice-error" role="alert">{error}</p>}

            <div className="form-grid">
              <label className="field-wide">Display name
                <input required maxLength="100" value={form.name} onChange={updateField('name')} />
              </label>
              <label className="field-wide">Profile link
                <div className="slug-input"><span>unfazed.in/</span><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={updateField('slug')} /></div>
                <span className="field-hint">Lowercase letters, numbers, and hyphens.</span>
              </label>
              <label className="field-wide">About your practice
                <textarea rows="5" maxLength="2000" placeholder="Share a little about your approach and the people you support." value={form.bio} onChange={updateField('bio')} />
              </label>
              <label>Specializations
                <input placeholder="Anxiety, relationships, stress" value={form.specializations} onChange={updateField('specializations')} />
                <span className="field-hint">Separate items with commas.</span>
              </label>
              <label>Languages
                <input placeholder="English, Kannada" value={form.languages} onChange={updateField('languages')} />
                <span className="field-hint">Separate items with commas.</span>
              </label>
              <label className="field-wide">Services
                <textarea rows="4" placeholder={'Individual therapy | One-to-one sessions\nCouples counselling | A space to work through change'} value={servicesText} onChange={(event) => setServicesText(event.target.value)} />
                <span className="field-hint">One service per line: title | short description.</span>
              </label>
            </div>

            <div className="editor-footer">
              <span className="form-footnote">Your email is used for sign-in and is not shown publicly.</span>
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>

          <aside className="profile-link-panel">
            <p className="eyebrow">YOUR BRANDED LINK</p>
            <div className="link-mark" aria-hidden="true">↗</div>
            <h2>One link, all about you.</h2>
            <p>Share your public profile with clients and help them understand your approach.</p>
            <a className="profile-url" href={`/${therapist.slug}`} target="_blank" rel="noreferrer">{profileUrl}</a>
            <Link className="text-link" to={`/${therapist.slug}`} target="_blank">Preview profile <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </main>
    </div>
  )
}