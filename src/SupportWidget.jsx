import { useEffect, useState } from 'react'
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
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRequests = async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('support_requests')
      .select('id,subject,category,message,status,admin_response,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (loadError) setError(loadError.message || 'Could not load your support requests.')
    else setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!open || !user?.id) return

    let active = true

    const fetchRequests = async () => {
      const { data, error: loadError } = await supabase
        .from('support_requests')
        .select('id,subject,category,message,status,admin_response,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!active) return

      if (loadError) {
        setError(loadError.message || 'Could not load your support requests.')
      } else {
        setRequests(data || [])
      }

      setLoading(false)
    }

    fetchRequests()

    return () => {
      active = false
    }
  }, [open, user?.id])

  const submitRequest = async event => {
    event.preventDefault()
    if (!user?.id) {
      setError('Please sign in again to contact support.')
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    const { error: submitError } = await supabase
      .from('support_requests')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category,
        message: message.trim(),
      })

    setSending(false)

    if (submitError) {
      setError(submitError.message || 'Your request could not be submitted. Please try again.')
      return
    }

    setSubject('')
    setMessage('')
    setSuccess('Your support request was submitted successfully.')
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
          <p>Send a message and track your request here.</p>
        </div>
        <button type="button" className="support-widget-close" onClick={() => setOpen(false)} aria-label="Close support panel">×</button>
      </div>

      {error && <p className="support-widget-error" role="alert">{error}</p>}
      {success && <p className="support-widget-success" role="status">{success}</p>}

      <form className="support-widget-form" onSubmit={submitRequest}>
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
          <textarea value={message} onChange={event => setMessage(event.target.value)} minLength={10} maxLength={5000} required rows={4} placeholder="Explain how we can help (10–5000 characters)" />
        </label>
        <button className="support-widget-submit" type="submit" disabled={sending}>
          {sending ? 'Submitting…' : 'Submit support request'}
        </button>
      </form>

      <div className="support-widget-history">
        <div className="support-widget-history-head">
          <strong>Your recent requests</strong>
          <button type="button" onClick={loadRequests} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        {requests.length === 0
          ? <p className="support-widget-muted">{loading ? 'Loading requests…' : 'Your submitted requests will appear here.'}</p>
          : requests.map(request => <article className="support-widget-request" key={request.id}>
              <div><strong>{request.subject}</strong><span className={`support-widget-status status-${request.status}`}>{statusLabel[request.status] || request.status}</span></div>
              <p>{request.message}</p>
              {request.admin_response && <div className="support-widget-response"><strong>Admin response</strong><p>{request.admin_response}</p></div>}
              <small>{new Date(request.created_at).toLocaleString()}</small>
            </article>)}
      </div>
      <p className="support-widget-note">Never send passwords, verification codes, or full card details in a support message.</p>
    </section>}
  </>
}
