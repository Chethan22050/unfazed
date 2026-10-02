import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../../api/axiosInstance'
import UpgradePrompt from '../../components/common/UpgradePrompt'

export default function IntakeForm() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [therapist, setTherapist] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', ageRange: '', pronouns: '', presentingConcern: '', history: '' })
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [upgradeInfo, setUpgradeInfo] = useState(null)

  useEffect(() => {
    api.get(`/therapists/${encodeURIComponent(slug)}`)
      .then(({ data }) => setTherapist(data.therapist))
      .catch((requestError) => setError(requestError.response?.data?.message || 'This therapist profile could not be loaded.'))
  }, [slug])

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const submitIntake = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setUpgradeInfo(null)
    setSubmitting(true)
    try {
      await api.post(`/clients/intake/${encodeURIComponent(slug)}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        demographics: { ageRange: form.ageRange, pronouns: form.pronouns },
        presentingConcern: form.presentingConcern,
        history: form.history,
        consentAccepted,
      })
      setMessage('Your intake and consent have been securely shared with your therapist.')
      setForm({ name: '', email: '', phone: '', ageRange: '', pronouns: '', presentingConcern: '', history: '' })
      setConsentAccepted(false)
      const next = searchParams.get('next')
      if (next?.startsWith(`/book/${slug}`)) navigate(next, { state: { message: 'Intake and consent received. Choose an appointment time.' } })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit intake. Please try again.')
      if (requestError.response?.data?.upgradeRequired) setUpgradeInfo(requestError.response.data)
    } finally {
      setSubmitting(false)
    }
  }

  if (!therapist && !error) return <main className="public-state">Loading intake form…</main>
  if (!therapist) return <main className="public-state"><h1>{error}</h1><Link className="text-link" to={`/${slug}`}>Back to profile</Link></main>

  return (
    <main className="intake-page">
      <header className="public-topbar"><Link className="wordmark" to={`/${slug}`}>unfazed<span>.</span></Link><span className="public-label">PRIVATE INTAKE</span></header>
      <div className="intake-layout">
        <section className="intake-intro"><p className="eyebrow">BEFORE YOUR FIRST SESSION</p><h1>A little context, at your pace.</h1><p>This information goes to {therapist.name} and is kept within your therapist’s practice workspace.</p><Link className="text-link" to={`/${slug}`}>← Back to profile</Link></section>
        <form className="intake-form" onSubmit={submitIntake}>
          <p className="eyebrow">YOUR DETAILS</p>
          {message && <p className="notice notice-success" role="status">{message}</p>}
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          {upgradeInfo?.upgradeRequired && <UpgradePrompt featureKey={upgradeInfo.featureKey} currentTier={upgradeInfo.tier?.key} message={upgradeInfo.message} />}
          <div className="form-grid">
            <label>Name<input autoComplete="name" required minLength="2" maxLength="100" value={form.name} onChange={updateField('name')} /></label>
            <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={updateField('email')} /></label>
            <label>Phone, optional<input type="tel" autoComplete="tel" maxLength="32" value={form.phone} onChange={updateField('phone')} /></label>
            <label>Age range, optional<select value={form.ageRange} onChange={updateField('ageRange')}><option value="">Prefer not to say</option><option>Under 18</option><option>18–24</option><option>25–34</option><option>35–44</option><option>45–54</option><option>55+</option></select></label>
            <label>Pronouns, optional<input maxLength="40" value={form.pronouns} onChange={updateField('pronouns')} /></label>
            <label className="field-wide">What brings you here?<textarea rows="4" maxLength="4000" value={form.presentingConcern} onChange={updateField('presentingConcern')} /></label>
            <label className="field-wide">Anything else you’d like your therapist to know? <span className="field-hint">Optional</span><textarea rows="5" maxLength="8000" value={form.history} onChange={updateField('history')} /></label>
          </div>
          <label className="consent-checkbox"><input type="checkbox" required checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} /><span>I consent to sharing these intake details with {therapist.name} for the purpose of providing therapy. I understand I can ask my therapist about how this information is used.</span></label>
          <button className="button button-primary button-wide" type="submit" disabled={submitting}>{submitting ? 'Sending securely…' : 'Submit intake'} <span aria-hidden="true">↗</span></button>
        </form>
      </div>
    </main>
  )
}