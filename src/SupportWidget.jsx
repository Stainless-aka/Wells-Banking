import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './SupportWidget.css'

const categories = [
  ['general', 'General enquiry'],
  ['account', 'Account issue'],
  ['transfer', 'Transfer issue'],
  ['loan', 'Loan enquiry'],
  ['technical', 'Technical problem'],
  ['other', 'Other'],
]

const statusLabel = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export default function SupportWidget({ user }) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [replies, setReplies] = useState({})
  const [requests, setRequests] = useState([])
  const [messagesByRequest, setMessagesByRequest] = useState({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRequests = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('support_requests')
      .select('id,subject,category,message,status,admin_response,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (loadError) {
      setError(loadError.message || 'Could not load your support requests.')
      setLoading(false)
      return
    }

    const items = data || []
    setRequests(items)
    if (!items.length) {
      setMessagesByRequest({})
      setLoading(false)
      return
    }

    const { data: messageRows, error: messagesError } = await supabase
      .from('support_messages')
      .select('id,request_id,sender_id,sender_role,message,created_at')
      .in('request_id', items.map(item => item.id))
      .order('created_at', { ascending: true })

    if (messagesError) {
      setError(messagesError.message || 'Could not load conversation messages.')
    } else {
      const grouped = {}
      for (const row of messageRows || []) {
        if (!grouped[row.request_id]) grouped[row.request_id] = []
        grouped[row.request_id].push(row)
      }
      setMessagesByRequest(grouped)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!open || !user?.id) return undefined

    const timer = setTimeout(() => {
      loadRequests()
    }, 0)

    return () => clearTimeout(timer)
  }, [open, user, loadRequests])

  useEffect(() => {
    if (!open || !user?.id) return undefined

    const refresh = () => loadRequests()
    const requestsChannel = supabase
      .channel(`customer-support-requests-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_requests',
        filter: `user_id=eq.${user.id}`,
      }, refresh)
      .subscribe()

    const messagesChannel = supabase
      .channel(`customer-support-messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
      }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [open, user, loadRequests])

  const submitRequest = async event => {
    event.preventDefault()
    if (!user?.id) {
      setError('Please sign in again to contact support.')
      return
    }

    setSending('new')
    setError('')
    setSuccess('')

    const { data: created, error: submitError } = await supabase
      .from('support_requests')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category,
        message: message.trim(),
      })
      .select('id')
      .single()

    if (submitError) {
      setError(submitError.message || 'Your request could not be submitted. Please try again.')
      setSending('')
      return
    }

    const { error: firstMessageError } = await supabase
      .from('support_messages')
      .insert({
        request_id: created.id,
        sender_id: user.id,
        sender_role: 'customer',
        message: message.trim(),
      })

    setSending('')
    if (firstMessageError) {
      setError(`Your request was created, but its conversation message could not be saved: ${firstMessageError.message}`)
      await loadRequests()
      return
    }

    setSubject('')
    setMessage('')
    setSuccess('Your support request was submitted successfully.')
    await loadRequests()
  }

  const sendReply = async request => {
    const text = (replies[request.id] || '').trim()
    if (!text) return

    setSending(request.id)
    setError('')
    setSuccess('')

    const { error: replyError } = await supabase
      .from('support_messages')
      .insert({
        request_id: request.id,
        sender_id: user.id,
        sender_role: 'customer',
        message: text,
      })

    setSending('')
    if (replyError) {
      setError(replyError.message || 'Your reply could not be sent. Please try again.')
      return
    }

    setReplies(current => ({ ...current, [request.id]: '' }))
    setSuccess('Your reply was sent to customer support.')
    await loadRequests()
  }

  return <>
    <button
      type="button"
      className="support-float"
      onClick={() => { setOpen(value => !value); setError(''); setSuccess('') }}
      aria-label={open ? 'Close customer support' : 'Contact customer support'}
      aria-expanded={open}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>
      <span>{open ? 'Close support' : 'Support'}</span>
    </button>

    {open && <section className="support-widget" role="dialog" aria-modal="false" aria-labelledby="support-widget-title">
      <div className="support-widget-head">
        <div>
          <span className="support-widget-eyebrow">CUSTOMER CARE</span>
          <h2 id="support-widget-title">Contact admin</h2>
          <p>Continue your conversations and track replies here.</p>
        </div>
        <button type="button" className="support-widget-close" onClick={() => setOpen(false)} aria-label="Close support panel">×</button>
      </div>

      {error && <p className="support-widget-error" role="alert">{error}</p>}
      {success && <p className="support-widget-success" role="status">{success}</p>}

      <form className="support-widget-form" onSubmit={submitRequest}>
        <h3>Start a new request</h3>
        <label>
          Subject
          <input value={subject} onChange={event => setSubject(event.target.value)} minLength={3} maxLength={120} required placeholder="Briefly describe your issue" />
        </label>
        <label>
          Category
          <select value={category} onChange={event => setCategory(event.target.value)}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Message
          <textarea value={message} onChange={event => setMessage(event.target.value)} minLength={10} maxLength={5000} required rows={3} placeholder="Explain how we can help (10–5000 characters)" />
        </label>
        <button className="support-widget-submit" type="submit" disabled={sending !== ''}>
          {sending === 'new' ? 'Submitting…' : 'Submit support request'}
        </button>
      </form>

      <div className="support-widget-history">
        <div className="support-widget-history-head">
          <strong>Your recent requests</strong>
          <button type="button" onClick={loadRequests} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        {requests.length === 0
          ? <p className="support-widget-muted">{loading ? 'Loading requests…' : 'Your submitted requests will appear here.'}</p>
          : requests.map(request => {
              const conversation = messagesByRequest[request.id] || []
              return <article className="support-widget-request" key={request.id}>
                <div><strong>{request.subject}</strong><span className={`support-widget-status status-${request.status}`}>{statusLabel[request.status] || request.status}</span></div>
                <p className="support-widget-category">{request.category}</p>
                <div className="support-chat-history" aria-label={`Conversation for ${request.subject}`}>
                  {conversation.length === 0 && request.message && <div className="support-chat-message customer"><strong>You</strong><p>{request.message}</p><small>{new Date(request.created_at).toLocaleString()}</small></div>}
                  {conversation.map(item => <div className={`support-chat-message ${item.sender_role === 'admin' ? 'admin' : 'customer'}`} key={item.id}>
                    <strong>{item.sender_role === 'admin' ? 'Admin' : 'You'}</strong>
                    <p>{item.message}</p>
                    <small>{new Date(item.created_at).toLocaleString()}</small>
                  </div>)}
                  {conversation.length === 0 && request.admin_response && <div className="support-chat-message admin"><strong>Admin</strong><p>{request.admin_response}</p></div>}
                </div>
                <form className="support-chat-reply" onSubmit={event => { event.preventDefault(); sendReply(request) }}>
                  <textarea
                    rows={2}
                    maxLength={5000}
                    minLength={1}
                    value={replies[request.id] || ''}
                    onChange={event => setReplies(current => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="Write a reply…"
                    aria-label={`Reply to ${request.subject}`}
                    required
                  />
                  <button className="support-widget-submit" type="submit" disabled={sending !== '' || !(replies[request.id] || '').trim()}>
                    {sending === request.id ? 'Sending…' : 'Send reply'}
                  </button>
                </form>
                <small>Updated {new Date(request.updated_at || request.created_at).toLocaleString()}</small>
              </article>
            })}
      </div>
      <p className="support-widget-note">Never send passwords, verification codes, or full card details in a support message.</p>
    </section>}
  </>
}
