import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axiosInstance'
import ChatWindow from '../../components/chat/ChatWindow'

export default function ClientPortal() {
  const { clientId } = useParams()
  const accessToken = window.location.hash.slice(1)
  const [portalState, setPortalState] = useState(() => ({
    key: accessToken ? '' : clientId,
    profile: null,
    notes: [],
    error: accessToken ? '' : 'This private portal link is missing its access token.',
  }))
  const loading = Boolean(accessToken) && portalState.key !== clientId
  const profile = loading ? null : portalState.profile
  const notes = loading ? [] : portalState.notes
  const error = loading ? '' : portalState.error

  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    if (!accessToken) return

    const headers = { Authorization: `Bearer ${accessToken}` }
    Promise.all([api.get('/portal/profile', { headers }), api.get('/notes/portal/shared', { headers })])
      .then(([profileResponse, notesResponse]) => setPortalState({ key: clientId, profile: profileResponse.data, notes: notesResponse.data.notes, error: '' }))
      .catch((requestError) => setPortalState({
        key: clientId,
        profile: null,
        notes: [],
        error: requestError.response?.data?.message || 'This portal link is invalid or expired.',
      }))
  }, [clientId, accessToken])

  if (loading) return <main className="public-state">Opening your private portal…</main>
  if (error || !profile) return <main className="public-state"><p className="eyebrow">PRIVATE CLIENT PORTAL</p><h1>{error || 'Portal unavailable'}</h1></main>

  return (
    <main className="client-portal-page">
      <header className="public-topbar"><Link className="wordmark" to={`/${profile.therapist.slug}`}>unfazed<span>.</span></Link><span className="public-label">PRIVATE CLIENT PORTAL</span></header>
      <div className="portal-content">
        <section className="portal-welcome"><p className="eyebrow">WELCOME, {profile.client.name.toUpperCase()}</p><h1>Your care, in one place.</h1><p>Connected with {profile.therapist.name}.</p></section>
        <section className="portal-section"><p className="eyebrow">APPOINTMENTS</p><h2>Sessions</h2>{profile.sessions.length === 0 ? <p className="empty-inline">No upcoming sessions are listed.</p> : <div className="portal-session-list">{profile.sessions.map((session) => <article className="portal-session" key={session._id}><div><strong>{new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short', timeZone: session.therapistTimezone }).format(new Date(session.startAt))}</strong><span>{session.durationMinutes} minutes</span></div><span className={`status-pill status-${session.status}`}>{session.status.replace('_', ' ')}</span></article>)}</div>}</section>
        <section className="portal-section"><p className="eyebrow">SHARED WITH YOU</p><h2>Session notes</h2>{notes.length === 0 ? <p className="empty-inline">Shared notes from your therapist will appear here.</p> : <div className="portal-note-list">{notes.map((note) => <article className="portal-note" key={note._id}><p className="eyebrow">{note.session?.startAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: note.session.therapistTimezone }).format(new Date(note.session.startAt)) : 'SESSION NOTE'}</p><h3>{note.title}</h3><p>{note.content || Object.entries(note.sections || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('\n') || 'No note text.'}</p></article>)}</div>}</section>
        <section className="portal-section"><ChatWindow clientId={profile.client._id} role="client" token={accessToken} /></section>
      </div>
    </main>
  )
}