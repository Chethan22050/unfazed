import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../../api/axiosInstance'
import UpgradePrompt from '../../components/common/UpgradePrompt'

function formatMoney(paise, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(paise / 100)
}

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [revenueGate, setRevenueGate] = useState(null)
  const [tier, setTier] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.get('/analytics/dashboard'), api.get('/entitlements/me')])
      .then(([summaryResponse, entitlementResponse]) => {
        if (!active) return
        setSummary(summaryResponse.data.summary)
        setTier(entitlementResponse.data.entitlements.tier)
        api.get('/analytics/revenue', { params: { months: 6 } })
          .then(({ data }) => {
            if (active) setRevenue(data.revenue.map((item) => ({
              month: new Date(item._id.year, item._id.month - 1).toLocaleDateString(undefined, { month: 'short' }),
              revenue: item.amountPaise / 100,
              payments: item.payments,
            })))
          })
          .catch((requestError) => {
            if (active && requestError.response?.data?.upgradeRequired) setRevenueGate(requestError.response.data)
            else if (active) setError(requestError.response?.data?.message || 'Could not load revenue trend.')
          })
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Could not load analytics.')
      })
    return () => { active = false }
  }, [])

  if (error) return <main className="public-state"><h1>{error}</h1><Link className="text-link" to="/dashboard">Back to dashboard</Link></main>
  if (!summary || !tier) return <main className="page-loading">Loading practice analytics…</main>

  const stats = [
    { label: 'Active clients', value: summary.activeClients },
    { label: 'Upcoming sessions', value: summary.upcomingSessions },
    { label: 'Revenue this month', value: formatMoney(summary.monthRevenuePaise, summary.currency) },
    ...(summary.noShowRate !== undefined ? [{ label: 'No-show rate', value: `${(summary.noShowRate * 100).toFixed(1)}%` }] : []),
  ]

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar"><Link className="wordmark" to="/dashboard">unfazed<span>.</span></Link><div className="topbar-actions"><Link className="public-link" to="/clients">Clients</Link><Link className="public-link" to="/dashboard/schedule">Schedule</Link><Link className="public-link" to="/dashboard/payments">Payments</Link></div></header>
      <main className="dashboard-content analytics-content">
        <div className="dashboard-heading"><div><p className="eyebrow">THERAPIST DASHBOARD / ANALYTICS</p><h1>See the shape of your practice.</h1><p className="dashboard-subtitle">A live view from your client, session, and payment records.</p></div><span className="timezone-chip">{tier.name} plan</span></div>
        <div className="analytics-stats">{stats.map((stat) => <article className="analytics-stat" key={stat.label}><p className="eyebrow">{stat.label}</p><strong>{stat.value}</strong></article>)}</div>
        <section className="analytics-chart-section"><div className="schedule-section-head"><div><p className="eyebrow">REVENUE / LAST SIX MONTHS</p><h2>Collected payments</h2></div></div>
          {revenueGate ? <UpgradePrompt featureKey={revenueGate.featureKey} currentTier={tier.key} message={revenueGate.message} /> : revenue.length === 0 ? <p className="empty-inline">Paid transactions will build this trend over time.</p> : <div className="revenue-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={revenue} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}><CartesianGrid stroke="#d9ded5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#78837b', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#78837b', fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value)} /><Tooltip formatter={(value) => formatMoney(value * 100, summary.currency)} contentStyle={{ borderColor: '#d9ded5', borderRadius: 5, color: '#20352f' }} /><Line type="monotone" dataKey="revenue" stroke="#214b40" strokeWidth={3} dot={{ r: 3, fill: '#dd725b', strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>}
        </section>
        <div className="analytics-footnote"><span className="eyebrow">DATA SCOPE</span><span>Metrics are calculated from saved MongoDB records. Revenue includes confirmed payments only.</span></div>
      </main>
    </div>
  )
}