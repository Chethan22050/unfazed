import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axiosInstance'
import useAuth from '../../context/useAuth'
import ChatWindow from '../../components/chat/ChatWindow'
import UpgradePrompt from '../../components/common/UpgradePrompt'

export default function ClientDetail() {
  const { therapist } = useAuth()
  const { clientId } = useParams()
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [notes, setNotes] = useState([])
  const [noteForm, setNoteForm] = useState({ title: '', type: 'private', format: 'freeform', content: '', sections: { subjective: '', objective: '', assessment: '', plan: '', data: '' } })
  const [portalLink, setPortalLink] = useState('')
  const [notice, setNotice] = useState('')
  const [noteError, setNoteError] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [upgradeInfo, setUpgradeInfo] = useState(null)

  useEffect(() => {
    api.get(`/clients/${clientId}`)
      .then(({ data }) => setRecord(data))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Could not load this client record.'))
  }, [clientId])

  if (error) return <main className="public-state"><p className="eyebrow">CLIENT RECORD</p><h1>{error}</h1><Link className="text-link" to="/clients">Back to clients</Link></main>
  if (!record) return <main className="page-loading">Loading client record…</main>

  const { client, sessions, packages = [] } = record

  const loadNotes = async (sessionId) => {
    setSelectedSessionId(sessionId)
    if (!sessionId) {
      setNotes([])
      return
    }
    try {
      const { data } = await api.get(`/notes/sessions/${sessionId}`)
      setNotes(data.notes)
    } catch (requestError) {
      setNoteError(requestError.response?.data?.message || 'Could not load session notes.')
    }
  }

  const createPortalLink = async () => {
    setNoteError('')
    setUpgradeInfo(null)
    try {
      const { data } = await api.post(`/clients/${client._id}/portal-link`)
      setPortalLink(`${window.location.origin}/portal/${client._id}#${data.accessToken}`)
    } catch (requestError) {
      setNoteError(requestError.response?.data?.message || 'Could not create client portal link.')
      if (requestError.response?.data?.upgradeRequired) setUpgradeInfo(requestError.response.data)
    }
  }

  const saveNote = async (event) => {
    event.preventDefault()
    if (!selectedSessionId) return
    setSavingNote(true)
    setNoteError('')
    setNotice('')
    try {
      const { data } = await api.post(`/notes/sessions/${selectedSessionId}`, noteForm)
      setNotes((current) => [data.note, ...current])
      setNoteForm({ title: '', type: 'private', format: 'freeform', content: '', sections: { subjective: '', objective: '', assessment: '', plan: '', data: '' } })
      setNotice(data.note.type === 'shared' ? 'Shared note saved to the client portal.' : 'Private note saved to your workspace.')
    } catch (requestError) {
      setNoteError(requestError.response?.data?.message || 'Could not save this note.')
      if (requestError.response?.data?.upgradeRequired) setUpgradeInfo(requestError.response.data)
    } finally {
      setSavingNote(false)
    }
  }

  const updateNoteSection = (section, value) => setNoteForm((current) => ({ ...current, sections: { ...current.sections, [section]: value } }))

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar"><Link className="wordmark" to="/dashboard">unfazed<span>.</span></Link><Link className="public-link" to="/clients">← All clients</Link></header>
      <main className="dashboard-content client-detail-content">
        <div className="client-detail-heading"><div><p className="eyebrow">CLIENT RECORD / {client.status.toUpperCase()}</p><h1>{client.name}</h1><p className="client-detail-email">{client.email}{client.phone && ` · ${client.phone}`}</p></div><span className={client.consent?.accepted ? 'consent-stamp' : 'consent-stamp consent-pending'}>{client.consent?.accepted ? 'Consent recorded' : 'Consent pending'}</span></div>
        {upgradeInfo?.upgradeRequired && <UpgradePrompt featureKey={upgradeInfo.featureKey} currentTier={upgradeInfo.tier?.key} message={upgradeInfo.message} />}
        <section className="client-detail-section"><p className="eyebrow">INTAKE</p><div className="intake-detail-grid"><div><h2>Presenting concern</h2><p>{client.intake?.presentingConcern || 'No concern shared yet.'}</p></div><div><h2>Background</h2><p>{client.intake?.history || 'No background shared yet.'}</p></div></div><p className="consent-record">{client.consent?.acceptedAt ? `Consent recorded ${new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(client.consent.acceptedAt))}` : 'Consent has not been recorded.'}</p></section>
        <section className="client-detail-section"><p className="eyebrow">SESSION HISTORY</p><h2>Appointments</h2>{sessions.length === 0 ? <p className="empty-inline">No appointments recorded.</p> : <div className="appointment-list">{sessions.map((session) => <article className="appointment-row" key={session._id}><div className="appointment-time"><strong>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: session.therapistTimezone }).format(new Date(session.startAt))}</strong><span>{session.durationMinutes} minutes</span></div><span className={`status-pill status-${session.status}`}>{session.status.replace('_', ' ')}</span></article>)}</div>}</section>
        <section className="client-detail-section"><p className="eyebrow">SESSION PACKAGES</p><h2>Credits</h2>{packages.length === 0 ? <p className="empty-inline">No session packages purchased.</p> : <div className="package-list">{packages.map((clientPackage) => <article className="package-row" key={clientPackage._id}><div><strong>{clientPackage.package?.title || `${clientPackage.sessionCount}-session package`}</strong><span>{clientPackage.sessionsRemaining} of {clientPackage.sessionCount} sessions remaining · expires {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(clientPackage.expiresAt))}</span></div><span className={`status-pill status-${clientPackage.status}`}>{clientPackage.status}</span></article>)}</div>}</section>
        <section className="client-detail-section note-workspace">
          <p className="eyebrow">CLINICAL DOCUMENTATION</p><h2>Session notes</h2>
          {noteError && <p className="notice notice-error" role="alert">{noteError}</p>}{notice && <p className="notice notice-success" role="status">{notice}</p>}
          {sessions.length === 0 ? <p className="empty-inline">Notes can be added after an appointment is on record.</p> : <>
            <label className="session-note-picker">Appointment<select value={selectedSessionId} onChange={(event) => loadNotes(event.target.value)}><option value="">Choose a session</option>{sessions.map((session) => <option value={session._id} key={session._id}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: session.therapistTimezone }).format(new Date(session.startAt))}</option>)}</select></label>
            {selectedSessionId && <div className="notes-workspace-grid">
              <form className="note-editor-form" onSubmit={saveNote}>
                <label>Note title<input maxLength="120" value={noteForm.title} onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))} placeholder="Session note" /></label>
                <div className="package-form-row"><label>Visibility<select value={noteForm.type} onChange={(event) => setNoteForm((current) => ({ ...current, type: event.target.value }))}><option value="private">Private, therapist only</option><option value="shared">Shared with client</option></select></label><label>Format<select value={noteForm.format} onChange={(event) => setNoteForm((current) => ({ ...current, format: event.target.value }))}><option value="freeform">Freeform</option><option value="soap">SOAP</option><option value="dap">DAP</option></select></label></div>
                {noteForm.format === 'freeform' ? <label>Note<textarea rows="6" value={noteForm.content} onChange={(event) => setNoteForm((current) => ({ ...current, content: event.target.value }))} /></label> : <div className="soap-fields">{(noteForm.format === 'soap' ? [['subjective', 'Subjective'], ['objective', 'Objective'], ['assessment', 'Assessment'], ['plan', 'Plan']] : [['data', 'Data'], ['assessment', 'Assessment'], ['plan', 'Plan']]).map(([section, label]) => <label key={section}>{label}<textarea rows="3" value={noteForm.sections[section]} onChange={(event) => updateNoteSection(section, event.target.value)} /></label>)}</div>}
                <button className="button button-primary" type="submit" disabled={savingNote}>{savingNote ? 'Saving…' : 'Save note'} <span aria-hidden="true">↗</span></button>
              </form>
              <div className="saved-notes">{notes.length === 0 ? <p className="empty-inline">No notes for this session yet.</p> : notes.map((note) => <article className="saved-note" key={note._id}><div><span className={`status-pill ${note.type === 'shared' ? 'status-active' : 'status-archived'}`}>{note.type}</span><span className="note-format">{note.format.toUpperCase()}</span></div><h3>{note.title}</h3><p>{note.content || Object.entries(note.sections || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('\n') || 'No note text.'}</p></article>)}</div>
            </div>}
          </>}
        </section>
        <section className="client-detail-section portal-link-section"><p className="eyebrow">CLIENT PORTAL</p><h2>Share the private portal</h2><p>Generate a time-limited client access link for their upcoming sessions and shared notes.</p><button className="button button-quiet" type="button" onClick={createPortalLink}>Create client link <span aria-hidden="true">↗</span></button>{portalLink && <label>One-time display link<input readOnly value={portalLink} onFocus={(event) => event.target.select()} /><span className="field-hint">Copy it to share securely. This token expires in 30 days.</span></label>}</section>
        <section className="client-detail-section"><ChatWindow clientId={client._id} role="therapist" token={localStorage.getItem('unfazed_token')} therapistId={therapist?._id} /></section>
      </main>
    </div>
  )
}