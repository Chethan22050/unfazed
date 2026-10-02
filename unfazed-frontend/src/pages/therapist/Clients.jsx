import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axiosInstance'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('createdAt')
  const [direction, setDirection] = useState('desc')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = { sort, direction }
    if (status) params.status = status
    if (search) params.search = search
    api.get('/clients', { params })
      .then(({ data }) => setClients(data.clients))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Could not load clients.'))
      .finally(() => setLoading(false))
  }, [status, sort, direction, search])

  const submitSearch = (event) => {
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar"><Link className="wordmark" to="/dashboard">unfazed<span>.</span></Link><div className="topbar-actions"><Link className="public-link" to="/dashboard">Profile</Link><Link className="public-link" to="/dashboard/schedule">Schedule</Link></div></header>
      <main className="dashboard-content crm-content">
        <div className="dashboard-heading"><div><p className="eyebrow">THERAPIST DASHBOARD / CLIENTS</p><h1>People in your care.</h1><p className="dashboard-subtitle">A private, therapist-only view of your client relationships.</p></div><span className="client-count">{clients.length}<small>shown</small></span></div>

        <div className="crm-toolbar">
          <form className="client-search" onSubmit={submitSearch}><label className="sr-only" htmlFor="client-search">Search clients</label><input id="client-search" type="search" placeholder="Search name, email, or tag" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button className="button button-primary" type="submit">Search</button></form>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All clients</option><option value="lead">Leads</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
          <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="createdAt">Date added</option><option value="name">Name</option><option value="lastSessionAt">Last session</option></select></label>
          <button className="button button-quiet sort-direction" type="button" onClick={() => setDirection((current) => current === 'asc' ? 'desc' : 'asc')} aria-label={`Sort ${direction === 'asc' ? 'descending' : 'ascending'}`}>{direction === 'asc' ? '↑' : '↓'}</button>
        </div>

        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {loading ? <p className="empty-inline">Loading client records…</p> : clients.length === 0 ? <div className="crm-empty"><p className="eyebrow">YOUR CLIENT LIST IS QUIET</p><h2>New intake forms will appear here.</h2><p>Share your therapist profile to invite clients to complete intake and consent.</p></div> : <div className="client-table-wrap"><table className="client-table"><thead><tr><th>Client</th><th>Status</th><th>Tags</th><th>Consent</th><th>Last session</th><th /></tr></thead><tbody>
          {clients.map((client) => <tr key={client._id}><td><Link className="client-name" to={`/clients/${client._id}`}>{client.name}</Link><span className="client-email">{client.email}</span></td><td><span className={`status-pill status-${client.status}`}>{client.status}</span></td><td><div className="client-tags">{client.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></td><td>{client.consent?.accepted ? <span className="consent-status">Recorded</span> : <span className="muted-status">Pending</span>}</td><td>{client.lastSessionAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(client.lastSessionAt)) : '—'}</td><td><Link className="table-arrow" to={`/clients/${client._id}`} aria-label={`Open ${client.name} record`}>↗</Link></td></tr>)}
        </tbody></table></div>}
      </main>
    </div>
  )
}