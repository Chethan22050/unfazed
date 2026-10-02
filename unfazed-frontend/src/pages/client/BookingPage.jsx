import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api from '../../api/axiosInstance'
import loadRazorpay from '../../utils/loadRazorpay'

function localToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return parts
}

function formatSlot(value, timezone) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value))
}

function formatAmount(paise, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(paise / 100)
}

export default function BookingPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const clientPackageId = searchParams.get('clientPackageId')
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  const [therapist, setTherapist] = useState(null)
  const [date, setDate] = useState(localToday)
  const [duration, setDuration] = useState(30)
  const [slotState, setSlotState] = useState({ key: '', slots: [], error: '' })
  const [selectedSlotState, setSelectedSlotState] = useState({ key: '', startAt: '' })
  const [pendingPayment, setPendingPayment] = useState(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [intakeRequired, setIntakeRequired] = useState(false)
  const slotRequestKey = `${slug}|${date}|${duration}|${timezone}|${refreshNonce}`
  const slots = slotState.key === slotRequestKey ? slotState.slots : []
  const slotError = slotState.key === slotRequestKey ? slotState.error : ''
  const selectedSlot = selectedSlotState.key === slotRequestKey
    ? slots.find((slot) => slot.startAt === selectedSlotState.startAt)
    : null

  useEffect(() => {
    api.get(`/therapists/${encodeURIComponent(slug)}`)
      .then(({ data }) => setTherapist(data.therapist))
      .catch((requestError) => setError(requestError.response?.data?.message || 'This profile could not be loaded.'))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!therapist) return
    const controller = new AbortController()
    api.get(`/scheduling/therapists/${encodeURIComponent(slug)}/slots`, {
      params: { from: date, to: date, duration, timezone },
      signal: controller.signal,
    })
      .then(({ data }) => setSlotState({ key: slotRequestKey, slots: data.slots, error: '' }))
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') {
          setSlotState({
            key: slotRequestKey,
            slots: [],
            error: requestError.response?.data?.message || 'Could not load appointment times.',
          })
        }
      })
    return () => controller.abort()
  }, [therapist, slug, date, duration, timezone, slotRequestKey])

  const finishBooking = () => {
    setMessage('Your appointment is confirmed. We’ll be in touch with the details.')
    setPendingPayment(null)
    setSelectedSlotState({ key: '', startAt: '' })
    setClientName('')
    setClientEmail('')
    setRefreshNonce((current) => current + 1)
  }

  const openRazorpayCheckout = async (payment) => {
    try {
      await loadRazorpay()
    } catch (loadError) {
      setError(loadError.message)
      return
    }
    if (!window.Razorpay) {
      setError('Payment checkout could not load. Please refresh and try again.')
      return
    }
    const checkout = new window.Razorpay({
      key: payment.order.keyId,
      amount: payment.order.amount,
      currency: payment.order.currency,
      name: therapist.name,
      description: `${duration} minute session`,
      order_id: payment.order.id,
      handler: async (response) => {
        setPaymentBusy(true)
        try {
          await api.post(`/payments/${payment.id}/confirm`, {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
          finishBooking()
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Payment confirmation failed.')
        } finally {
          setPaymentBusy(false)
        }
      },
      modal: { ondismiss: () => setPaymentBusy(false) },
    })
    checkout.on('payment.failed', () => setError('Payment was not completed. Your appointment remains on hold briefly.'))
    checkout.open()
  }

  const completeDemoPayment = async () => {
    if (!pendingPayment) return
    setError('')
    setPaymentBusy(true)
    try {
      await api.post(`/payments/${pendingPayment.id}/confirm`)
      finishBooking()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not confirm the demo payment.')
    } finally {
      setPaymentBusy(false)
    }
  }

  const submitBooking = async (event) => {
    event.preventDefault()
    if (!selectedSlot) return
    setError('')
    setMessage('')
    setIntakeRequired(false)
    setSubmitting(true)
    try {
      const booking = {
        therapistSlug: slug,
        clientName,
        clientEmail,
        startAt: selectedSlot.startAt,
        durationMinutes: duration,
        clientTimezone: timezone,
      }
      if (clientPackageId) booking.clientPackageId = clientPackageId
      const { data } = await api.post('/scheduling/bookings', booking)
      if (data.payment && data.order) {
        const payment = { id: data.payment.id, order: data.order }
        setPendingPayment(payment)
        setMessage(data.order.provider === 'demo' ? 'Your appointment is held. Complete the local demo payment to confirm it.' : 'Your appointment is held. Complete advance payment to confirm it.')
        if (data.order.provider === 'razorpay') await openRazorpayCheckout(payment)
      } else {
        finishBooking()
      }
    } catch (requestError) {
      if (requestError.response?.data?.code === 'INTAKE_REQUIRED') setIntakeRequired(true)
      setError(requestError.response?.data?.message || 'That appointment could not be booked. Please choose another time.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="public-state">Loading booking details…</main>
  if (error && !therapist) return <main className="public-state"><h1>{error}</h1><Link className="text-link" to={`/${slug}`}>Back to profile</Link></main>

  return (
    <main className="booking-page">
      <header className="public-topbar"><Link className="wordmark" to={`/${slug}`}>unfazed<span>.</span></Link><span className="public-label">BOOK A SESSION</span></header>
      <div className="booking-layout">
        <section className="booking-intro">
          <p className="eyebrow">A FIRST STEP</p>
          <h1>Find a time that works for you.</h1>
          <p>Choose an available session with <strong>{therapist.name}</strong>. Times are shown in {timezone}.</p>
          <Link className="text-link" to={`/${slug}`}>← Back to therapist profile</Link>
        </section>
        <section className="booking-form-panel">
          <div className="booking-selectors">
            <label>Choose a date<input type="date" min={localToday()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Session length<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[30, 45, 60, 90].map((minutes) => <option value={minutes} key={minutes}>{minutes} minutes</option>)}</select></label>
          </div>
          <div className="slot-heading"><p className="eyebrow">AVAILABLE TIMES</p><span>{slots.length} open</span></div>
          {(error || slotError) && <p className="notice notice-error" role="alert">{error || slotError}</p>}
          {intakeRequired && <Link className="text-link intake-required-link" to={`/intake/${slug}${clientPackageId ? `?next=${encodeURIComponent(`/book/${slug}?clientPackageId=${clientPackageId}`)}` : ''}`}>Complete intake and consent <span aria-hidden="true">→</span></Link>}
          {message && <p className="notice notice-success" role="status">{message}</p>}
          {slots.length === 0 ? <p className="empty-inline">No openings for this date and session length. Try another day.</p> : <div className="slot-grid">
            {slots.map((slot) => <button className={`slot-button${selectedSlot?.startAt === slot.startAt ? ' slot-selected' : ''}`} key={slot.startAt} type="button" aria-pressed={selectedSlot?.startAt === slot.startAt} onClick={() => setSelectedSlotState({ key: slotRequestKey, startAt: slot.startAt })}>{formatSlot(slot.startAt, timezone)}</button>)}
          </div>}
          {selectedSlot && <form className="booking-client-form" onSubmit={submitBooking}>
            <p className="selected-slot">Selected: {formatSlot(selectedSlot.startAt, timezone)}</p>
            <p className="session-price">{clientPackageId ? 'This booking uses one of your package credits.' : selectedSlot.pricePaise ? `Advance payment: ${formatAmount(selectedSlot.pricePaise, selectedSlot.currency)}` : 'No advance payment is configured for this session.'}</p>
            <label>Your name<input required minLength="2" maxLength="100" autoComplete="name" value={clientName} onChange={(event) => setClientName(event.target.value)} /></label>
            <label>Email address<input required type="email" autoComplete="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} /></label>
            {!pendingPayment && <button className="button button-primary button-wide" type="submit" disabled={submitting}>{submitting ? 'Confirming…' : 'Confirm appointment'} <span aria-hidden="true">↗</span></button>}
            {pendingPayment?.order.provider === 'demo' && <button className="button button-primary button-wide" type="button" disabled={paymentBusy} onClick={completeDemoPayment}>{paymentBusy ? 'Confirming…' : 'Complete demo payment'} <span aria-hidden="true">↗</span></button>}
            {pendingPayment?.order.provider === 'razorpay' && <button className="button button-primary button-wide" type="button" disabled={paymentBusy} onClick={() => openRazorpayCheckout(pendingPayment)}>{paymentBusy ? 'Opening checkout…' : 'Open payment checkout'} <span aria-hidden="true">↗</span></button>}
          </form>}
        </section>
      </div>
    </main>
  )
}