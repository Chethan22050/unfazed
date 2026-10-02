import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import api from '../../api/axiosInstance'

export default function ChatWindow({ clientId, role, token }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const socketRef = useRef(null)
  const messageListRef = useRef(null)

  useEffect(() => {
    if (!clientId || !token) return
    let active = true
    const historyPath = role === 'client' ? '/chat/portal/messages' : `/chat/clients/${clientId}/messages`
    api.get(historyPath, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => { if (active) setMessages(data.messages) })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Could not load messages.') })

    const apiOrigin = new URL(api.defaults.baseURL).origin
    const socket = io(apiOrigin, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.on('connect', () => {
      setConnected(true)
      socket.emit('conversation:join', { clientId }, (result) => {
        if (result?.error) setError(result.error)
      })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setError('Live chat is temporarily unavailable.'))
    socket.on('message:new', (message) => {
      if (message.client?.toString() === clientId.toString()) {
        setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message])
      }
    })

    return () => {
      active = false
      socket.disconnect()
      socketRef.current = null
    }
  }, [clientId, role, token])

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = (event) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !socketRef.current?.connected) return
    setSending(true)
    socketRef.current.emit('message:send', { body }, (result) => {
      if (result?.error) setError(result.error)
      else setDraft('')
      setSending(false)
    })
  }

  return (
    <section className={`chat-panel chat-${role}`}>
      <div className="chat-heading"><div><p className="eyebrow">LIVE CONVERSATION</p><h2>Messages</h2></div><span className={`chat-connection${connected ? ' is-connected' : ''}`}>{connected ? 'Live' : 'Connecting'}</span></div>
      {error && <p className="chat-error" role="alert">{error}</p>}
      <div className="chat-message-list" ref={messageListRef} aria-live="polite">{messages.length === 0 ? <p className="empty-inline">Messages between you and your therapist will appear here.</p> : messages.map((message) => <article className={`chat-message${message.senderRole === role ? ' chat-message-own' : ''}`} key={message._id}><p>{message.body}</p><time>{new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.createdAt))}</time></article>)}</div>
      <form className="chat-composer" onSubmit={sendMessage}><label className="sr-only" htmlFor={`chat-message-${clientId}`}>Write a message</label><textarea id={`chat-message-${clientId}`} rows="2" maxLength="5000" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" /><button className="button button-primary" type="submit" disabled={!connected || sending || !draft.trim()}>{sending ? 'Sending…' : 'Send'} <span aria-hidden="true">↗</span></button></form>
    </section>
  )
}