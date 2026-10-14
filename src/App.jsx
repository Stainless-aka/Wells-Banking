import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

const money = (minor, currency = 'NGN') => {
  if (minor === null || minor === undefined) return 'Not available'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(minor) / 100)
}
const dateLabel = value => value ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

function Brand({ onClick }) {
  return <button className="brand" onClick={onClick} aria-label="Wells Banking home"><span className="brand-mark">W</span><span className="brand-copy"><strong>Wells Banking</strong><small>ACCOUNT SERVICES</small></span></button>
}

function Icon({ name }) {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    wallet: 'M3 6.5A2.5 2.5 0 0 1 5.5 4H20v16H5.5A2.5 2.5 0 0 1 3 17.5zM3 8h17M16 13h4',
    history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5m4-1v5l3 2',
    shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11zm-3-11 2 2 4-4',
    logout: 'M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7',
    close: 'M18 6 6 18M6 6l12 12',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    lock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.home} /></svg>
}

function AuthForm({ onAuthenticated }) {
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!isSupabaseConfigured) throw new Error('Authentication is not configured. Add the Supabase project URL and publishable key to the environment before using this application.')
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (authError) throw authError
        if (data.session) onAuthenticated(data.session)
        else setMessage('Registration received. Check your email to confirm your address, then sign in.')
      } else if (mode === 'signin') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
        onAuthenticated(data.session)
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
        if (authError) throw authError
        setMessage('If an account exists for that email, a password reset link will be sent.')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page"><section className="auth-modal auth-card">
    <Brand onClick={() => setMode('signin')} />
    <span className="eyebrow">SECURE CUSTOMER ACCESS</span>
    <h1>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to Wells Banking'}</h1>
    <p className="muted">Your customer profile and records are stored in the connected database. No sample accounts or transactions are used.</p>
    {!isSupabaseConfigured && <p className="error" role="alert">Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable authentication.</p>}
    <form onSubmit={submit} className="auth-fields">
      {mode === 'signup' && <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" minLength="2" required /></label>}
      <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
      {mode !== 'reset' && <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="8" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>}
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="success" role="status">{message}</p>}
      <button className="button red full" disabled={busy || !isSupabaseConfigured}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in securely'}</button>
    </form>
    <div className="auth-switch">
      {mode === 'signin' && <><button onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Forgot password?</button><span>New here? <button onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Create an account</button></span></>}
      {mode !== 'signin' && <button onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Back to sign in</button>}
    </div>
    <p className="fine"><Icon name="shield" /> Never share your password or one-time codes with anyone.</p>
  </section></main>
}

function Header({ page, setPage, user, signOut }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [['overview', 'Overview'], ['accounts', 'Accounts'], ['transactions', 'Transactions']]
  return <><div className="utility"><div className="container utility-inner"><span>Customer account services</span><span><Icon name="shield" /> Secure session</span></div></div><header className="site-header"><div className="container header-inner"><Brand onClick={() => { setPage('overview'); setMenuOpen(false) }} /><button className="mobile-menu" onClick={() => setMenuOpen(open => !open)} aria-label="Toggle navigation"><span>{menuOpen ? 'Close' : 'Menu'}</span></button><nav className={menuOpen ? "nav open" : "nav"}>{links.map(([key, label]) => <button key={key} className={page === key ? 'nav-link active' : 'nav-link'} onClick={() => { setPage(key); setMenuOpen(false) }}>{label}</button>)}</nav><button className="signout" onClick={() => { setMenuOpen(false); signOut() }}><span className="avatar">{(user.email || 'U')[0].toUpperCase()}</span><span>Sign out</span><Icon name="logout" /></button></div></header></>
}

function Title({ eyebrow, title, description }) {
  return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></div>
}

function ProviderNotice() {
  return <div className="demo-alert"><Icon name="lock" /><span><strong>Banking provider not connected.</strong> Account opening, balances, deposits, withdrawals and transfers remain unavailable until a licensed provider is integrated and configured.</span></div>
}

function EmptyState({ icon = 'wallet', title, text }) {
  return <div className="empty"><Icon name={icon} /><strong>{title}</strong><span>{text}</span></div>
}

function TransactionTable({ transactions }) {
  if (!transactions.length) return <EmptyState icon="history" title="No transaction records" text="Transactions will appear here only after they are received and verified from the connected provider." />
  return <div className="table-wrap"><table><thead><tr><th>Description</th><th>Reference</th><th>Date</th><th>Status</th><th className="right">Amount</th></tr></thead><tbody>{transactions.map(tx => <tr key={tx.id}><td><span className="txn"><i className={tx.direction === 'credit' ? 'credit' : ''}>{tx.direction === 'credit' ? '↓' : '↑'}</i><span><strong>{tx.description || tx.type || 'Transaction'}</strong><small>{tx.type || 'Account activity'}</small></span></span></td><td>{tx.reference || tx.provider_transaction_id || '—'}</td><td>{dateLabel(tx.posted_at || tx.created_at)}</td><td><span className="pill">{tx.status}</span></td><td className={'right amount ' + (tx.direction === 'credit' ? 'positive' : '')}>{tx.direction === 'debit' ? '−' : tx.direction === 'credit' ? '+' : ''}{money(tx.amount_minor, tx.currency || 'NGN')}</td></tr>)}</tbody></table></div>
}

function Overview({ profile, customerAccount, accounts, transactions, setPage }) {
  const knownBalances = accounts.filter(account => account.balance_minor !== null && account.balance_minor !== undefined)
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there'
  return <main className="container app-page">
    <Title eyebrow="CUSTOMER OVERVIEW" title={'Welcome, ' + firstName} description="Your account records and verified provider activity." />
    <ProviderNotice />
    <div className="stats">
      <article className="balance-card"><span>Available balance</span><strong>{knownBalances.length ? money(knownBalances.reduce((sum, a) => sum + Number(a.balance_minor), 0), knownBalances[0].currency || 'NGN') : 'Not available'}</strong><small>{knownBalances.length ? 'Latest provider-reported balance' : 'Awaiting provider account connection'}</small></article>
      <article className="stat"><span className="service-icon"><Icon name="wallet" /></span><small>Linked bank accounts</small><strong>{accounts.length}</strong><span className="muted">Provider-linked records only</span></article>
      <article className="stat"><span className="service-icon"><Icon name="history" /></span><small>Transaction records</small><strong>{transactions.length}</strong><span className="muted">Provider-reported activity only</span></article>
    </div>
    <div className="content-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Customer record</h2><p>Your registered account details</p></div></div>
        <div className="account-row"><span className="account-icon"><Icon name="shield" /></span><div className="account-info"><strong>{profile?.full_name || 'Name not provided'}</strong><small>{profile?.email || 'No email available'}</small></div><div className="account-balance"><span className="pill">{customerAccount?.status || 'pending setup'}</span></div></div>
        <p className="fine">Customer record ID: {customerAccount?.id || 'Not provisioned'}</p>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Available services</h2><p>Services currently enabled</p></div></div>
        <button className="quick" onClick={() => setPage('accounts')}><span className="service-icon"><Icon name="wallet" /></span><span><strong>View accounts</strong><small>Review linked provider accounts</small></span><Icon name="arrow" /></button>
        <button className="quick" onClick={() => setPage('transactions')}><span className="service-icon"><Icon name="history" /></span><span><strong>View transactions</strong><small>Review provider-sourced activity</small></span><Icon name="arrow" /></button>
        <div className="info-box"><small>Money movement</small><strong>Disabled</strong><span className="fine">No transfer or payment request can be submitted by this app.</span></div>
      </section>
    </div>
    <section className="panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Verified records from your linked accounts</p></div><button className="text-link" onClick={() => setPage('transactions')}>View all <Icon name="arrow" /></button></div><TransactionTable transactions={transactions.slice(0, 5)} /></section>
  </main>
}

function Accounts({ customerAccount, accounts }) {
  return <main className="container app-page"><Title eyebrow="ACCOUNT SERVICES" title="Accounts" description="Your customer record and any accounts linked by a banking provider." /><ProviderNotice />
    <section className="panel"><div className="panel-heading"><div><h2>Customer account record</h2><p>Application status, not a deposit account or stored-value balance</p></div></div>
      <div className="account-row"><span className="account-icon"><Icon name="shield" /></span><div className="account-info"><strong>Wells Banking customer profile</strong><small>{customerAccount?.id || 'Customer record pending'}</small></div><div className="account-balance"><span className="pill">{customerAccount?.status || 'pending setup'}</span></div></div>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Linked bank accounts</h2><p>Only provider-created account records are shown here</p></div></div>
      {accounts.length ? <div className="account-grid">{accounts.map(account => <article className="panel detail-account" key={account.id}><span className="account-icon"><Icon name="wallet" /></span><span className="eyebrow">{account.account_type || 'Bank account'}</span><strong>{account.balance_minor == null ? 'Balance unavailable' : money(account.balance_minor, account.currency || 'NGN')}</strong><small>Account ending {account.account_number_masked || 'not supplied'}</small><small>Provider: {account.provider}</small><div className="account-detail-foot"><span className="pill">{account.status}</span><span>{account.balance_as_of ? 'Updated ' + dateLabel(account.balance_as_of) : 'No balance timestamp'}</span></div></article>)}</div> : <EmptyState title="No linked bank accounts" text="No account has been provisioned by a banking provider for this customer yet." />}
    </section>
  </main>
}

function Transactions({ transactions }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => transactions.filter(tx => [tx.description, tx.reference, tx.type, tx.status, tx.provider_transaction_id].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())), [transactions, query])
  return <main className="container app-page"><Title eyebrow="ACCOUNT ACTIVITY" title="Transactions" description="Transaction records received from the connected banking provider." /><ProviderNotice />
    <section className="panel"><div className="panel-heading"><div><h2>Transaction history</h2><p>{filtered.length} record{filtered.length === 1 ? '' : 's'}</p></div><input className="search" aria-label="Search transactions" placeholder="Search reference or description…" value={query} onChange={event => setQuery(event.target.value)} /></div><TransactionTable transactions={filtered} /></section>
  </main>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [customerAccount, setCustomerAccount] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return undefined
    }
    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setDataError(error.message)
      setSession(data?.session || null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const loadCustomerData = useCallback(async () => {
    if (!session?.user?.id || !supabase) {
      setProfile(null)
      setCustomerAccount(null)
      setAccounts([])
      setTransactions([])
      return
    }
    setDataError('')
    const userId = session.user.id
    const [profileResult, customerResult, accountResult] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,created_at').eq('id', userId).maybeSingle(),
      supabase.from('customer_accounts').select('id,user_id,provider_customer_id,status,created_at,updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('bank_accounts').select('id,user_id,provider,provider_account_id,account_number_masked,account_type,currency,balance_minor,balance_as_of,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    ])
    const failure = profileResult.error || customerResult.error || accountResult.error
    if (failure) {
      setDataError(failure.message)
      return
    }
    setProfile(profileResult.data)
    setCustomerAccount(customerResult.data)
    setAccounts(accountResult.data || [])
    if ((accountResult.data || []).length) {
      const { data, error } = await supabase.from('transactions')
        .select('id,bank_account_id,provider,provider_transaction_id,reference,type,status,direction,amount_minor,currency,description,posted_at,created_at')
        .in('bank_account_id', accountResult.data.map(account => account.id))
        .order('posted_at', { ascending: false, nullsFirst: false })
        .limit(100)
      if (error) setDataError(error.message)
      setTransactions(data || [])
    } else {
      setTransactions([])
    }
  }, [session])

  useEffect(() => {
    if (!loading && session) loadCustomerData()
  }, [loading, session, loadCustomerData])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setDataError(error.message)
    else {
      setProfile(null)
      setCustomerAccount(null)
      setAccounts([])
      setTransactions([])
    }
  }

  if (loading) return <main className="auth-page"><section className="auth-modal auth-card"><Brand onClick={() => {}} /><p>Loading secure session…</p></section></main>
  if (!session) return <AuthForm onAuthenticated={setSession} />

  return <div className="app-shell"><Header page={page} setPage={setPage} user={session.user} signOut={signOut} />
    {dataError && <div className="container"><p className="error" role="alert">Unable to load account data: {dataError}. Refresh the page or contact support.</p></div>}
    {page === 'accounts' ? <Accounts customerAccount={customerAccount} accounts={accounts} /> : page === 'transactions' ? <Transactions transactions={transactions} /> : <Overview profile={profile} customerAccount={customerAccount} accounts={accounts} transactions={transactions} setPage={setPage} />}
    <footer className="footer"><div className="container footer-bottom"><span>Wells Banking · Account services</span><span>Money movement is disabled pending licensed provider integration.</span></div></footer>
  </div>
}
