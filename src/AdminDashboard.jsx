import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const accountStatuses = ['pending_provider', 'active', 'restricted', 'closed']
const walletStatuses = ['active', 'frozen', 'closed']

const dateLabel = value => value
  ? new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  : '—'

const money = (minor, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(minor || 0) / 100)

export default function AdminDashboard({ user, onSignOut }) {
  const [access, setAccess] = useState('checking')
  const [data, setData] = useState({
    profiles: [],
    accounts: [],
    wallets: [],
    transactions: [],
    supportRequests: [],
  })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [notificationSettings, setNotificationSettings] = useState({ mode: 'support', category: 'VAT' })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [supportReplyDrafts, setSupportReplyDrafts] = useState({})
  const [supportSaving, setSupportSaving] = useState('')

  const loadData = useCallback(async () => {
    try {
      const { data: allowed, error: accessError } =
        await supabase.rpc('is_app_admin')

      // Wait for the access check before updating React state. This avoids
      // synchronous state updates from the effect that starts the initial load.
      // Update loading state after the administrator-access check resolves.
      setLoading(true)
      setError('')

      if (accessError) throw accessError

      if (allowed !== true) {
        setAccess('denied')
        return
      }

      setAccess('allowed')

      const results = await Promise.all([
        supabase
          .from('profiles')
          .select('id,full_name,email,created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('customer_accounts')
          .select('id,user_id,status,created_at,updated_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('internal_wallet_accounts')
          .select('id,user_id,account_number,currency,status,created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('internal_transactions')
          .select('id,user_id,counterparty_user_id,reference,direction,amount_minor,currency,description,status,created_at')
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'transfer_notification')
          .maybeSingle(),

        supabase
          .from('support_requests')
          .select('id,user_id,subject,category,message,status,admin_response,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      const failure = results.find(result => result.error)
      if (failure) throw failure.error

      setData({
        profiles: results[0].data || [],
        accounts: results[1].data || [],
        wallets: results[2].data || [],
        transactions: results[3].data || [],
        supportRequests: results[5].data || [],
      })

      const savedNotification = results[4].data?.value || {}
      setNotificationSettings({
        mode: ['support', 'review', 'normal'].includes(savedNotification.mode)
          ? savedNotification.mode
          : 'support',
        category: ['VAT', 'COT', 'IRS'].includes(savedNotification.category)
          ? savedNotification.category
          : 'VAT',
      })
    } catch (err) {
      setError(err.message || 'Unable to load admin data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadData])

  useEffect(() => {
    if (access !== 'allowed') return undefined

    const channel = supabase
      .channel('admin-support-requests-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_requests',
      }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [access, loadData])

  const profilesById = useMemo(
    () => Object.fromEntries(data.profiles.map(profile => [profile.id, profile])),
    [data.profiles],
  )

  const filteredProfiles = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return data.profiles

    return data.profiles.filter(profile =>
      [profile.full_name, profile.email, profile.id]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(term)),
    )
  }, [data.profiles, query])

  const updateStatus = async (table, id, status) => {
    const key = `${table}:${id}`
    setSaving(key)
    setError('')
    setMessage('')

    try {
      const { error: updateError } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id)

      if (updateError) throw updateError

      setMessage('Status updated successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to update status.')
    } finally {
      setSaving('')
    }
  }

  const saveSupportReply = async request => {
    const reply = (supportReplyDrafts[request.id] ?? request.admin_response ?? '').trim()
    if (!reply) {
      setError('Write a response before sending it.')
      return
    }

    setSupportSaving(request.id)
    setError('')
    setMessage('')

    try {
      const { error: replyError } = await supabase
        .from('support_requests')
        .update({
          admin_response: reply,
          status: request.status === 'open' ? 'in_progress' : request.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (replyError) throw replyError

      setMessage('Reply sent to the customer.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to send the support reply.')
    } finally {
      setSupportSaving('')
    }
  }

  const saveNotificationSettings = async () => {
    setSettingsSaving(true)
    setError('')
    setMessage('')

    try {
      const { error: saveError } = await supabase
        .from('app_settings')
        .upsert({
          key: 'transfer_notification',
          value: notificationSettings,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }, { onConflict: 'key' })

      if (saveError) throw saveError

      setMessage('Transfer notification settings saved.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to save notification settings.')
    } finally {
      setSettingsSaving(false)
    }
  }

  if (access === 'checking' || loading && access !== 'denied') {
    return <main className="container app-page">
      <p>Verifying administrator access…</p>
    </main>
  }

  if (access === 'denied') {
    return <main className="container app-page">
      <section className="panel">
        <h1>Admin access denied</h1>
        <p>Your signed-in account does not have administrator privileges.</p>
        <button className="button red" onClick={onSignOut}>Sign out</button>
      </section>
    </main>
  }

  return <main className="container app-page admin-dashboard">
    <div className="admin-top">
      <div>
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>Admin dashboard</h1>
        <p>Manage application records and review internal ledger activity.</p>
        <p className="fine">Signed in as {user?.email}</p>
      </div>
      <div className="admin-actions">
        <button className="button secondary" onClick={loadData} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
        <button className="button red" onClick={onSignOut}>Sign out</button>
      </div>
    </div>

    {error && <p className="error admin-message" role="alert">{error}</p>}
    {message && <p className="success admin-message" role="status">{message}</p>}

    <div className="stats admin-stats">
      <article className="stat">
        <small>Registered profiles</small>
        <strong>{data.profiles.length}</strong>
      </article>
      <article className="stat">
        <small>Customer records</small>
        <strong>{data.accounts.length}</strong>
      </article>
      <article className="stat">
        <small>Internal wallets</small>
        <strong>{data.wallets.length}</strong>
      </article>
      <article className="stat">
        <small>Recent ledger entries</small>
        <strong>{data.transactions.length}</strong>
      </article>
    </div>

    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Customers</h2>
          <p>{filteredProfiles.length} matching profile(s)</p>
        </div>
        <input
          className="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search name or email…"
          aria-label="Search customers"
        />
      </div>

      {filteredProfiles.length === 0
        ? <p className="muted">No matching customers found.</p>
        : <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Registered</th>
                <th>Customer status</th>
                <th>Wallet status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map(profile => {
                const account = data.accounts.find(item => item.user_id === profile.id)
                const wallet = data.wallets.find(item => item.user_id === profile.id)

                return <tr key={profile.id}>
                  <td>
                    <strong>{profile.full_name || 'Unnamed customer'}</strong>
                    <br />
                    <small>{profile.email || profile.id}</small>
                  </td>
                  <td>{dateLabel(profile.created_at)}</td>
                  <td>
                    {account
                      ? <select
                          value={account.status}
                          disabled={saving === `customer_accounts:${account.id}`}
                          onChange={event => updateStatus(
                            'customer_accounts', account.id, event.target.value,
                          )}
                          aria-label={`Customer status for ${profile.email}`}
                        >
                          {accountStatuses.map(status =>
                            <option key={status} value={status}>{status}</option>,
                          )}
                        </select>
                      : <span className="muted">No record</span>}
                  </td>
                  <td>
                    {wallet
                      ? <select
                          value={wallet.status}
                          disabled={saving === `internal_wallet_accounts:${wallet.id}`}
                          onChange={event => updateStatus(
                            'internal_wallet_accounts', wallet.id, event.target.value,
                          )}
                          aria-label={`Wallet status for ${profile.email}`}
                        >
                          {walletStatuses.map(status =>
                            <option key={status} value={status}>{status}</option>,
                          )}
                        </select>
                      : <span className="muted">No wallet</span>}
                  </td>
                </tr>
              })}
            </tbody>
          </table>
        </div>}
    </section>

    <section className="panel admin-support-panel">
      <div className="panel-heading">
        <div>
          <h2>Customer support</h2>
          <p>{data.supportRequests.filter(request => request.status === 'open' || request.status === 'in_progress').length} request(s) need attention. Replies update the customer widget in real time.</p>
        </div>
      </div>

      {!data.supportRequests.length
        ? <p className="muted">No customer support requests yet.</p>
        : <div className="admin-support-list">
          {data.supportRequests.map(request => {
            const customer = profilesById[request.user_id]
            const draft = supportReplyDrafts[request.id] ?? request.admin_response ?? ''
            return <article className="admin-support-request" key={request.id}>
              <div className="admin-support-request-top">
                <div>
                  <h3>{request.subject}</h3>
                  <p>{customer?.full_name || 'Customer'} · {customer?.email || request.user_id}</p>
                  <small>{request.category} · {dateLabel(request.created_at)}</small>
                </div>
                <span className={`admin-support-status status-${request.status}`}>{request.status.replace('_', ' ')}</span>
              </div>
              <p className="admin-support-message">{request.message}</p>
              {request.admin_response && <div className="admin-support-existing-reply">
                <strong>Current response sent to customer</strong>
                <p>{request.admin_response}</p>
                <small>Last updated {dateLabel(request.updated_at)}</small>
              </div>}
              <label className="admin-support-reply-label">
                {request.admin_response ? 'Edit response' : 'Write a response'}
                <textarea
                  rows="3"
                  maxLength="5000"
                  value={draft}
                  onChange={event => setSupportReplyDrafts(current => ({ ...current, [request.id]: event.target.value }))}
                  placeholder="Write a helpful reply to the customer…"
                />
              </label>
              <div className="admin-support-actions">
                <label>
                  Request status
                  <select
                    value={request.status}
                    disabled={supportSaving === request.id}
                    onChange={async event => {
                      const nextStatus = event.target.value
                      setSupportSaving(request.id)
                      setError('')
                      setMessage('')
                      try {
                        const { error: statusError } = await supabase
                          .from('support_requests')
                          .update({ status: nextStatus, updated_at: new Date().toISOString() })
                          .eq('id', request.id)
                        if (statusError) throw statusError
                        setMessage('Support request status updated.')
                        await loadData()
                      } catch (err) {
                        setError(err.message || 'Unable to update support status.')
                      } finally {
                        setSupportSaving('')
                      }
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <button
                  className="button red"
                  onClick={() => saveSupportReply(request)}
                  disabled={supportSaving === request.id || !draft.trim()}
                >
                  {supportSaving === request.id ? 'Sending…' : request.admin_response ? 'Update and send reply' : 'Send reply'}
                </button>
              </div>
            </article>
          })}
        </div>}

      <style>{`
        .admin-support-list{display:grid;gap:16px}
        .admin-support-request{border:1px solid var(--line);border-radius:10px;padding:16px;min-width:0}
        .admin-support-request-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
        .admin-support-request h3{margin:0 0 5px;font-size:16px;overflow-wrap:anywhere}
        .admin-support-request-top p,.admin-support-request small{margin:0;color:var(--muted);font-size:11px;overflow-wrap:anywhere}
        .admin-support-status{display:inline-block;white-space:nowrap;padding:5px 8px;border-radius:20px;background:#f1f1f4;color:#4b4b53;font-size:10px;font-weight:800;text-transform:capitalize}
        .admin-support-status.status-open{background:#fff2d9;color:#815400}
        .admin-support-status.status-in_progress{background:#eaf1ff;color:#2854a0}
        .admin-support-status.status-resolved,.admin-support-status.status-closed{background:#e8f6ed;color:#28764e}
        .admin-support-message{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;font-size:13px}
        .admin-support-existing-reply{padding:10px 12px;background:var(--surface, #f7f7f8);border-left:3px solid var(--red, #b51f2a);margin:12px 0}
        .admin-support-existing-reply p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;margin:7px 0}
        .admin-support-reply-label{display:grid;gap:7px;font-size:12px;font-weight:700}
        .admin-support-reply-label textarea{width:100%;resize:vertical;padding:10px;border:1px solid var(--line);border-radius:6px;font:inherit;font-size:12px;box-sizing:border-box}
        .admin-support-actions{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:12px;flex-wrap:wrap}
        .admin-support-actions label{display:grid;gap:6px;font-size:11px;color:var(--muted)}
        .admin-support-actions select{min-width:140px}
      `}</style>
    </section>

    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Transfer notification settings</h2>
          <p>Choose the notice shown after a customer submits a beneficiary request.</p>
        </div>
      </div>

      <div className="auth-fields">
        <label>
          Notification mode
          <select
            value={notificationSettings.mode}
            onChange={event => setNotificationSettings(current => ({
              ...current,
              mode: event.target.value,
            }))}
          >
            <option value="support">Support notice</option>
            <option value="review">Under review</option>
            <option value="normal">Normal simulated request</option>
          </select>
        </label>

        {notificationSettings.mode === 'support' && (
          <label>
            Support enquiry category
            <select
              value={notificationSettings.category}
              onChange={event => setNotificationSettings(current => ({
                ...current,
                category: event.target.value,
              }))}
            >
              <option value="VAT">VAT</option>
              <option value="COT">COT</option>
              <option value="IRS">IRS</option>
            </select>
          </label>
        )}

        <button
          className="button red"
          onClick={saveNotificationSettings}
          disabled={settingsSaving}
        >
          {settingsSaving ? 'Saving…' : 'Save notification settings'}
        </button>
      </div>
    </section>

    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Internal wallets</h2>
          <p>Application ledger records; not external bank accounts.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Account reference</th>
              <th>Customer</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.wallets.map(wallet => (
              <tr key={wallet.id}>
                <td>{wallet.account_number}</td>
                <td>{profilesById[wallet.user_id]?.email || wallet.user_id}</td>
                <td>{wallet.currency}</td>
                <td>{wallet.status}</td>
                <td>{dateLabel(wallet.created_at)}</td>
              </tr>
            ))}
            {!data.wallets.length && <tr><td colSpan="5">No wallets found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Recent internal transactions</h2>
          <p>Latest 100 ledger entries, newest first.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Direction</th>
              <th>Reference</th>
              <th>Status</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map(tx => (
              <tr key={tx.id}>
                <td>{dateLabel(tx.created_at)}</td>
                <td>{profilesById[tx.user_id]?.email || tx.user_id}</td>
                <td>{tx.direction}</td>
                <td>{tx.reference}</td>
                <td>{tx.status}</td>
                <td className="right">
                  {money(tx.amount_minor, tx.currency || 'USD')}
                </td>
              </tr>
            ))}
            {!data.transactions.length && <tr><td colSpan="6">No transactions found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <style>{`
      .admin-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:25px}
      .admin-top h1{font-size:clamp(30px,4vw,42px);margin:8px 0}
      .admin-top p{color:var(--muted);font-size:12px}
      .admin-actions{display:flex;gap:10px;flex-wrap:wrap}
      .admin-stats{grid-template-columns:repeat(4,minmax(0,1fr))}
      .admin-stats .stat{min-height:110px}
      .admin-dashboard select{max-width:180px;padding:8px;border:1px solid var(--line);border-radius:5px;background:white;color:var(--ink)}
      .admin-dashboard td small{color:var(--muted)}
      .admin-message{margin:12px 0}
      @media(max-width:760px){.admin-top{flex-direction:column}.admin-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-actions{width:100%}}
    `}</style>
  </main>
}
