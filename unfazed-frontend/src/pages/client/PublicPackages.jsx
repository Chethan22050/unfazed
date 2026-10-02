import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axiosInstance'
import loadRazorpay from '../../utils/loadRazorpay'

function formatAmount(paise, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(paise / 100)
}

export default function PublicPackages() {
  const { slug } = useParams()
  const [therapist, setTherapist] = useState(null)
  const [packages, setPackages] = useState([])
  const [currency, setCurrency] = useState('INR')
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [pendingPayment, setPendingPayment] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.get(`/therapists/${encodeURIComponent(slug)}`), api.get(`/payments/therapists/${encodeURIComponent(slug)}/packages`)])
      .then(([therapistResponse, packageResponse]) => {
        setTherapist(therapistResponse.data.therapist)
        setPackages(packageResponse.data.packages)
        setCurrency(packageResponse.data.currency || 'INR')
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Could not load packages.'))
      .finally(() => setLoading(false))
  }, [slug])

  const confirmDemo = async () => {
    if (!pendingPayment) return
    setBusy(true)
    try {
      await api.post(`/payments/${pendingPayment.paymentId}/confirm`)
      setMessage('Payment confirmed. Your session credits are ready to use.')
      setPendingPayment((current) => ({ ...current, confirmed: true }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not confirm payment.')
    } finally {
      setBusy(false)
    }
  }

  const buyPackage = async (event) => {
    event.preventDefault()
    if (!selectedPackage) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const { data } = await api.post(`/payments/packages/${selectedPackage._id}/purchase`, form)
      const pending = { paymentId: data.payment.id, clientPackageId: data.clientPackage._id, order: data.order }
      setPendingPayment(pending)
      setMessage(data.order.provider === 'demo' ? 'Package reserved. Complete the local demo payment to activate it.' : 'Package reserved. Complete payment to activate your credits.')
      if (data.order.provider === 'razorpay') {
        await loadRazorpay()
        if (!window.Razorpay) throw new Error('Payment checkout could not load. Refresh and try again.')
        const checkout = new window.Razorpay({
          key: data.order.keyId,
          amount: data.order.amount,
          currency: data.order.currency,
          name: therapist.name,
          description: selectedPackage.title,
          order_id: data.order.id,
          handler: async (response) => {
            try {
              await api.post(`/payments/${data.payment.id}/confirm`, { orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature })
              setPendingPayment((current) => ({ ...current, confirmed: true }))
              setMessage('Payment confirmed. Your session credits are ready to use.')
            } catch (requestError) {
              setError(requestError.response?.data?.message || 'Payment confirmation failed.')
            }
          },
        })
        checkout.open()
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not start package payment.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="public-state">Loading packages…</main>
  if (!therapist) return <main className="public-state"><h1>{error || 'Therapist profile not found'}</h1></main>

  return (
    <main className="public-packages-page">
      <header className="public-topbar"><Link className="wordmark" to={`/${slug}`}>unfazed<span>.</span></Link><span className="public-label">SESSION PACKAGES</span></header>
      <div className="public-packages-content">
        <div className="package-intro"><p className="eyebrow">WITH {therapist.name.toUpperCase()}</p><h1>Make space for the work.</h1><p>Choose a package and keep your sessions together.</p></div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}{message && <p className="notice notice-success" role="status">{message}</p>}
        {packages.length === 0 ? <p className="empty-inline">No session packages are available right now.</p> : <div className="public-package-grid">{packages.map((plan) => <button className={`public-package-card${selectedPackage?._id === plan._id ? ' package-selected' : ''}`} type="button" aria-pressed={selectedPackage?._id === plan._id} key={plan._id} onClick={() => setSelectedPackage(plan)}><span className="eyebrow">{plan.sessionCount} SESSIONS</span><strong>{plan.title}</strong><span className="package-price">{formatAmount(plan.amountPaise, currency)}</span><span className="package-expiry">Valid {plan.validDays} days</span></button>)}</div>}
        {selectedPackage && !pendingPayment?.confirmed && <form className="package-purchase-form" onSubmit={buyPackage}><p className="eyebrow">PURCHASING {selectedPackage.title.toUpperCase()}</p><div className="form-grid"><label>Your name<input required minLength="2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Email address<input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label><label className="field-wide">Phone, optional<input type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label></div><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Starting checkout…' : `Continue · ${formatAmount(selectedPackage.amountPaise, currency)}`} <span aria-hidden="true">↗</span></button></form>}
        {pendingPayment?.order.provider === 'demo' && !pendingPayment.confirmed && <button className="button button-primary demo-pay-button" type="button" disabled={busy} onClick={confirmDemo}>{busy ? 'Confirming…' : 'Complete demo payment'}</button>}
        {pendingPayment?.confirmed && <Link className="button button-primary package-book-link" to={`/book/${slug}?clientPackageId=${pendingPayment.clientPackageId}`}>Book a session with your package <span aria-hidden="true">↗</span></Link>}
        <Link className="text-link package-back-link" to={`/${slug}`}>← Back to therapist profile</Link>
      </div>
    </main>
  )
}