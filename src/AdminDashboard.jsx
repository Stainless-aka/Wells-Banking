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
  })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [notificationSettings, setNotificationSettings] = useState({ mode: 'support', category: 'VAT' })
  const [settingsSaving, setSettingsSaving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const { data: allowed, error: accessError } =
        await supabase.rpc('is_app_admin')

<<<<<<< HEAD
      // Wait for the access check before updating React state. This avoids
      // synchronous state updates from the effect that starts the initial load.
=======
      // Update loading state after the administrator-access check resolves.
>>>>>>> fd0ec22 (changes)
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
      ])

      const failure = results.find(result => result.error)
      if (failure) throw failure.error

      setData({
        profiles: results[0].data || [],
        accounts: results[1].data || [],
        wallets: results[2].data || [],
        transactions: results[3].data || [],
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
