import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axiosInstance'
import useEntitlement from '../../hooks/useEntitlement'
import UpgradePrompt from '../../components/common/UpgradePrompt'

function formatAmount(paise, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(paise / 100)
}

function fetchPaymentDashboard() {
  return Promise.all([api.get('/payments/packages'), api.get('/payments')])
}

export default function Payments() {
  const packageAccess = useEntitlement('payments.packages')
  const [packages, setPackages] = useState([])
  const [payments, setPayments] = useState([])
  const [currency, setCurrency] = useState('INR')
  const [form, setForm] = useState({ title: '', sessionCount: 3, amount: '', validDays: 180 })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const loadPayments = async () => {
    const [packageResponse, paymentResponse] = await fetchPaymentDashboard()
    setPackages(packageResponse.data.packages)
    setPayments(paymentResponse.data.payments)
    setCurrency(paymentResponse.data.currency || 'INR')
  }

  useEffect(() => {
    let active = true
    fetchPaymentDashboard()
      .then(([packageResponse, paymentResponse]) => {
        if (!active) return
        setPackages(packageResponse.data.packages)
        setPayments(paymentResponse.data.payments)
        setCurrency(paymentResponse.data.currency || 'INR')
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Could not load payments.')
      })
    return () => { active = false }
  }, [])

  const createPackage = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/payments/packages', {
        title: form.title,
        sessionCount: Number(form.sessionCount),
        amountPaise: Math.round(Number(form.amount) * 100),
        validDays: Number(form.validDays),
        isActive: true,
      })
      setForm({ title: '', sessionCount: 3, amount: '', validDays: 180 })
      setNotice('Package saved and available to clients.')
      await loadPayments()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save package.')
    } finally {
      setSaving(false)
    }
  }

  const downloadInvoice = async (payment) => {
    try {
      const { data } = await api.get(`/payments/${payment._id}/invoice`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${payment.invoiceNumber}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not download invoice.')
    }
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar"><Link className="wordmark" to="/dashboard">unfazed<span>.</span></Link><div className="topbar-actions"><Link className="public-link" to="/clients">Clients</Link><Link className="public-link" to="/dashboard/schedule">Schedule</Link></div></header>
      <main className="dashboard-content payments-content">
        <div className="dashboard-heading"><div><p className="eyebrow">THERAPIST DASHBOARD / PAYMENTS</p><h1>Clear terms, steady practice.</h1><p className="dashboard-subtitle">Set client packages and follow payment status.</p></div></div>
        {!packageAccess.loading && !packageAccess.allowed && <UpgradePrompt featureKey={packageAccess.featureKey} currentTier={packageAccess.tier?.key} message={packageAccess.message} />}
        {error && <p className="notice notice-error" role="alert">{error}</p>}{notice && <p className="notice notice-success" role="status">{notice}</p>}
        <div className="payments-grid">
          <section className="payment-section"><p className="eyebrow">01 / SESSION PACKAGES</p><h2>Offer a package</h2><form className="package-form" onSubmit={createPackage}>
            <label>Package name<input required minLength="2" maxLength="100" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <div className="package-form-row"><label>Sessions<select value={form.sessionCount} onChange={(event) => setForm((current) => ({ ...current, sessionCount: event.target.value }))}><option value="3">3 sessions</option><option value="6">6 sessions</option><option value="12">12 sessions</option></select></label><label>Price ({currency})<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></label></div>
            <label>Valid for<input required type="number" min="1" max="730" value={form.validDays} onChange={(event) => setForm((current) => ({ ...current, validDays: event.target.value }))} /></label>
            <button className="button button-primary" type="submit" disabled={saving || packageAccess.loading || !packageAccess.allowed}>{saving ? 'Saving…' : 'Save package'} <span aria-hidden="true">↗</span></button>
          </form></section>
          <section className="payment-section"><p className="eyebrow">02 / AVAILABLE PACKAGES</p><h2>Client offers</h2>{packages.length === 0 ? <p className="empty-inline">Packages you create will appear here.</p> : <div className="package-list">{packages.map((plan) => <article className="package-row" key={plan._id}><div><strong>{plan.title}</strong><span>{plan.sessionCount} sessions · valid {plan.validDays} days</span></div><strong>{formatAmount(plan.amountPaise, currency)}</strong><span className={`status-pill ${plan.isActive ? 'status-active' : 'status-archived'}`}>{plan.isActive ? 'active' : 'inactive'}</span></article>)}</div>}</section>
        </div>
        <section className="payment-section payment-history"><p className="eyebrow">03 / TRANSACTIONS</p><h2>Payment history</h2>{payments.length === 0 ? <p className="empty-inline">Confirmed payments and pending orders will appear here.</p> : <div className="payment-list">{payments.map((payment) => <article className="payment-row" key={payment._id}><div><strong>{payment.client?.name || 'Client'}</strong><span>{payment.invoiceNumber} · {payment.provider}</span></div><strong>{formatAmount(payment.amountPaise, payment.currency || currency)}</strong><span className={`status-pill status-${payment.status}`}>{payment.status}</span>{payment.status === 'paid' ? <button className="text-link invoice-button" type="button" onClick={() => downloadInvoice(payment)}>Download invoice ↗</button> : <span className="muted-status">Invoice after payment</span>}</article>)}</div>}</section>
      </main>
    </div>
  )
}