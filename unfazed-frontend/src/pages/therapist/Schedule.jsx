import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axiosInstance'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const durations = [30, 45, 60, 90]

function defaultAvailability() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    weekly: [],
    overrides: [],
    sessionDurations: [30, 45, 60, 90],
    sessionRates: [],
    bufferMinutes: 0,
  }
}

function localDateTime(value, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value))
}

export default function Schedule() {
  const [availability, setAvailability] = useState(defaultAvailability)
  const [currency, setCurrency] = useState('INR')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const refreshSessions = async () => {
    const { data } = await api.get('/scheduling/sessions')
    setSessions(data.sessions)
  }

  useEffect(() => {
    Promise.all([api.get('/scheduling/availability'), api.get('/scheduling/sessions')])
      .then(([availabilityResponse, sessionResponse]) => {
        if (availabilityResponse.data.availability) setAvailability(availabilityResponse.data.availability)
        setCurrency(availabilityResponse.data.currency || 'INR')
        setSessions(sessionResponse.data.sessions)
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Could not load your schedule.'))
      .finally(() => setLoading(false))
  }, [])

  const updateWeekly = (dayOfWeek, property, value) => {
    setAvailability((current) => {
      const existing = current.weekly.find((window) => window.dayOfWeek === dayOfWeek)
      if (!existing) {
        return { ...current, weekly: [...current.weekly, { dayOfWeek, startTime: '09:00', endTime: '17:00', [property]: value }] }
      }
      return {
        ...current,
        weekly: current.weekly.map((window) => window.dayOfWeek === dayOfWeek ? { ...window, [property]: value } : window),
      }
    })
  }

  const toggleDay = (dayOfWeek, checked) => {
    setAvailability((current) => ({
      ...current,
      weekly: checked
        ? [...current.weekly, { dayOfWeek, startTime: '09:00', endTime: '17:00' }]
        : current.weekly.filter((window) => window.dayOfWeek !== dayOfWeek),
    }))
  }

  const updateOverride = (index, field, value) => {
    setAvailability((current) => ({
      ...current,
      overrides: current.overrides.map((override, itemIndex) => itemIndex === index ? { ...override, [field]: value } : override),
    }))
  }

  const updateSessionRate = (durationMinutes, value) => {
    setAvailability((current) => {
      const sessionRates = current.sessionRates.filter((rate) => rate.durationMinutes !== durationMinutes)
      if (!value || Number(value) <= 0) return { ...current, sessionRates }
      sessionRates.push({ durationMinutes, amountPaise: Math.round(Number(value) * 100) })
      return { ...current, sessionRates: sessionRates.sort((first, second) => first.durationMinutes - second.durationMinutes) }
    })
  }

  const addOverride = () => setAvailability((current) => ({
    ...current,
    overrides: [...current.overrides, { date: new Date().toISOString().slice(0, 10), type: 'blocked', startTime: '09:00', endTime: '17:00' }],
  }))

  const saveAvailability = async (event) => {
    event.preventDefault()
    setNotice('')
    setError('')
    setSaving(true)
    try {
      const { data } = await api.put('/scheduling/availability', availability)
      setAvailability(data.availability)
      setNotice('Availability saved. Clients can now request these times.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save availability.')
    } finally {
      setSaving(false)
    }
  }

  const cancelSession = async (sessionId) => {
    try {
      await api.patch(`/scheduling/sessions/${sessionId}/cancel`)
      await refreshSessions()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not cancel appointment.')
    }
  }

  if (loading) return <main className="page-loading">Loading schedule…</main>

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <Link className="wordmark" to="/dashboard">unfazed<span>.</span></Link>
        <div className="topbar-actions"><Link className="public-link" to="/dashboard">Profile</Link><Link className="public-link" to="/clients">Clients</Link><Link className="public-link" to="/dashboard/payments">Payments</Link></div>
      </header>
      <main className="dashboard-content schedule-content">
        <div className="dashboard-heading">
          <div><p className="eyebrow">THERAPIST DASHBOARD / SCHEDULE</p><h1>Make time for care.</h1><p className="dashboard-subtitle">Set your weekly rhythm and keep one-time changes in view.</p></div>
          <span className="timezone-chip">{availability.timezone}</span>
        </div>

        {notice && <p className="notice notice-success" role="status">{notice}</p>}
        {error && <p className="notice notice-error" role="alert">{error}</p>}

        <form className="schedule-editor" onSubmit={saveAvailability}>
          <div className="schedule-section-head"><div><p className="eyebrow">01 / WEEKLY HOURS</p><h2>When are you available?</h2></div></div>
          <label className="timezone-field">Practice timezone
            <input required value={availability.timezone} onChange={(event) => setAvailability((current) => ({ ...current, timezone: event.target.value }))} placeholder="Asia/Kolkata" />
            <span className="field-hint">Use an IANA timezone, for example Asia/Kolkata or Europe/London.</span>
          </label>
          <div className="weekly-grid">
            {weekdays.map((day, dayOfWeek) => {
              const window = availability.weekly.find((item) => item.dayOfWeek === dayOfWeek)
              return (
                <div className={`weekday-row${window ? ' weekday-active' : ''}`} key={day}>
                  <label className="weekday-toggle"><input type="checkbox" checked={Boolean(window)} onChange={(event) => toggleDay(dayOfWeek, event.target.checked)} /><span>{day}</span></label>
                  {window ? <div className="time-range">
                    <input aria-label={`${day} start time`} type="time" value={window.startTime} onChange={(event) => updateWeekly(dayOfWeek, 'startTime', event.target.value)} />
                    <span>to</span>
                    <input aria-label={`${day} end time`} type="time" value={window.endTime} onChange={(event) => updateWeekly(dayOfWeek, 'endTime', event.target.value)} />
                  </div> : <span className="day-off">Unavailable</span>}
                </div>
              )
            })}
          </div>

          <div className="schedule-options">
            <fieldset className="duration-options"><legend>Session lengths</legend><div className="check-row">
              {durations.map((duration) => <label key={duration}><input type="checkbox" checked={availability.sessionDurations.includes(duration)} onChange={(event) => setAvailability((current) => ({ ...current, sessionDurations: event.target.checked ? [...current.sessionDurations, duration].sort((a, b) => a - b) : current.sessionDurations.filter((item) => item !== duration) }))} />{duration} min</label>)}
            </div></fieldset>
            <label>Buffer between sessions
              <select value={availability.bufferMinutes} onChange={(event) => setAvailability((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))}>
                {[0, 5, 10, 15, 20, 30].map((minutes) => <option value={minutes} key={minutes}>{minutes} minutes</option>)}
              </select>
            </label>
          </div>

          <div className="rate-options">
            <div><p className="eyebrow">OPTIONAL / ADVANCE PAYMENT</p><h3>Set a price per session</h3><p>When a price is set, clients confirm their appointment after payment.</p></div>
            <div className="rate-inputs">{durations.filter((duration) => availability.sessionDurations.includes(duration)).map((duration) => {
              const amountPaise = availability.sessionRates?.find((rate) => rate.durationMinutes === duration)?.amountPaise
              return <label key={duration}>{duration} min <span>{currency}</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={amountPaise ? String(amountPaise / 100) : ''} onChange={(event) => updateSessionRate(duration, event.target.value)} placeholder="Not set" /></label>
            })}</div>
          </div>

          <div className="override-heading"><div><p className="eyebrow">02 / ONE-TIME CHANGES</p><h2>Overrides</h2></div><button className="button button-quiet" type="button" onClick={addOverride}>Add date</button></div>
          {availability.overrides.length === 0 ? <p className="empty-inline">Add a date to open extra hours or block time off.</p> : <div className="override-list">
            {availability.overrides.map((override, index) => <div className="override-row" key={`${override.date}-${index}`}>
              <input aria-label="Override date" type="date" required value={override.date} onChange={(event) => updateOverride(index, 'date', event.target.value)} />
              <select aria-label="Override type" value={override.type} onChange={(event) => updateOverride(index, 'type', event.target.value)}><option value="blocked">Block time</option><option value="available">Open extra hours</option></select>
              <input aria-label="Override start time" type="time" required value={override.startTime} onChange={(event) => updateOverride(index, 'startTime', event.target.value)} />
              <input aria-label="Override end time" type="time" required value={override.endTime} onChange={(event) => updateOverride(index, 'endTime', event.target.value)} />
              <button className="icon-button" type="button" aria-label={`Remove override for ${override.date}`} onClick={() => setAvailability((current) => ({ ...current, overrides: current.overrides.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>
            </div>)}
          </div>}
          <div className="editor-footer"><span className="form-footnote">Available slots use this timezone; client times are localized for each visitor.</span><button className="button button-primary" type="submit" disabled={saving || availability.sessionDurations.length === 0}>{saving ? 'Saving…' : 'Save availability'} <span aria-hidden="true">↗</span></button></div>
        </form>

        <section className="appointments-section">
          <div className="schedule-section-head"><div><p className="eyebrow">03 / APPOINTMENTS</p><h2>Upcoming bookings</h2></div></div>
          {sessions.filter((session) => ['confirmed', 'pending'].includes(session.status)).length === 0 ? <p className="empty-inline">No appointments yet. New bookings will appear here.</p> : <div className="appointment-list">
            {sessions.filter((session) => ['confirmed', 'pending'].includes(session.status)).map((session) => <article className="appointment-row" key={session._id}>
              <div className="appointment-time"><strong>{localDateTime(session.startAt, session.therapistTimezone)}</strong><span>{session.durationMinutes} minutes</span></div>
              <div className="appointment-client"><strong>{session.client?.name || session.clientName}</strong><span>{session.client?.email || session.clientEmail}</span></div>
              <button className="button button-quiet" type="button" onClick={() => cancelSession(session._id)}>Cancel</button>
            </article>)}
          </div>}
        </section>
      </main>
    </div>
  )
}