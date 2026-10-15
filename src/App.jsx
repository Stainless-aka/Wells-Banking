import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

const money = (minor, currency = 'NGN') => {
  if (minor === null || minor === undefined) return 'Not available'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(minor) / 100)
}
const dateLabel = value => value ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

function Brand({ onClick }) {
  return <button className="brand" onClick={onClick} aria-label="THEOS X DIGITAL TECH Customer Portal home"><span className="brand-mark">T</span><span className="brand-copy"><strong>THEOS X DIGITAL TECH</strong><small>ACCOUNT SERVICES</small></span></button>
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
    refresh: 'M20 7v5h-5M4 17v-5h5M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3',
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
    <span className="eyebrow">CUSTOMER ACCOUNT PORTAL</span>
    <h1>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to THEOS X DIGITAL TECH Customer Portal'}</h1>
    {!isSupabaseConfigured && <p className="error" role="alert">Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable authentication.</p>}
    <p className="brand-disclaimer" role="note"><strong>Independent customer portal.</strong> This application is an independent portal operated by THEOS X DIGITAL TECH. Do not enter credentials for any external bank or financial institution. This portal does not provide real banking services.</p>
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

function Header({ page, setPage, user, signOut, onRefresh, refreshing }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [['overview', 'Overview'], ['accounts', 'Accounts'], ['transactions', 'Transactions'], ['transfers', 'Transfers']]
  return <><div className="utility"><div className="container utility-inner"><span>Customer account services</span><span><Icon name="shield" /> Secure session</span></div></div><header className="site-header"><div className="container header-inner"><Brand onClick={() => { setPage('overview'); setMenuOpen(false) }} /><button className="mobile-menu" onClick={() => setMenuOpen(open => !open)} aria-label="Toggle navigation"><span>{menuOpen ? 'Close' : 'Menu'}</span></button><nav className={menuOpen ? "nav open" : "nav"}>{links.map(([key, label]) => <button key={key} className={page === key ? 'nav-link active' : 'nav-link'} onClick={() => { setPage(key); setMenuOpen(false) }}>{label}</button>)}</nav><button className="text-link refresh-action" onClick={onRefresh} disabled={refreshing} aria-label="Refresh customer records"><Icon name="refresh" />{refreshing ? 'Refreshing…' : 'Refresh data'}</button><button className="signout" onClick={() => { setMenuOpen(false); signOut() }}><span className="avatar">{(user.email || 'U')[0].toUpperCase()}</span><span>Sign out</span><Icon name="logout" /></button></div></header></>
}

function Title({ eyebrow, title, description }) {
  return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></div>
}

function ProviderNotice() {
  return <div className="demo-alert"><Icon name="lock" /><span><strong>External banking provider not connected.</strong> Internal transfers between registered app accounts are available from Transfers. Deposits, withdrawals and transfers to real bank accounts require an authorized payment provider.</span></div>
}

function EmptyState({ icon = 'wallet', title, text }) {
  return <div className="empty"><Icon name={icon} /><strong>{title}</strong><span>{text}</span></div>
}

function TransactionTable({ transactions }) {
  if (!transactions.length) return <EmptyState icon="history" title="No transaction records" text="Transactions appear here after a completed internal transfer or when verified provider records are received." />
  return <div className="table-wrap"><table><thead><tr><th>Description</th><th>Reference</th><th>Date</th><th>Status</th><th className="right">Amount</th></tr></thead><tbody>{transactions.map(tx => <tr key={tx.id}><td><span className="txn"><i className={tx.direction === 'credit' ? 'credit' : ''}>{tx.direction === 'credit' ? '↓' : '↑'}</i><span><strong>{tx.description || tx.type || 'Transaction'}</strong><small>{tx.type || 'Account activity'}</small></span></span></td><td>{tx.reference || tx.provider_transaction_id || '—'}</td><td>{dateLabel(tx.posted_at || tx.created_at)}</td><td><span className="pill">{tx.status}</span></td><td className={'right amount ' + (tx.direction === 'credit' ? 'positive' : '')}>{tx.direction === 'debit' ? '−' : tx.direction === 'credit' ? '+' : ''}{money(tx.amount_minor, tx.currency || 'NGN')}</td></tr>)}</tbody></table></div>
}

function Overview({ profile, customerAccount, accounts, transactions, setPage }) {
  const knownBalances = accounts.filter(account => account.balance_minor !== null && account.balance_minor !== undefined)
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there'
  const currencies = [...new Set(knownBalances.map(account => account.currency || 'NGN'))]
  return <main className="container app-page">
    <Title eyebrow="CUSTOMER OVERVIEW" title={'Welcome, ' + firstName} description="Your customer records and internal application activity." />
    <ProviderNotice />
    <div className="stats">
      <article className="balance-card"><span>Available balance</span><strong>{knownBalances.length ? (currencies.length > 1 ? 'Multiple currencies' : money(knownBalances.reduce((sum, a) => sum + Number(a.balance_minor), 0), currencies[0])) : 'Not available'}</strong><small>{knownBalances.length ? 'Latest provider-reported balance' : 'Awaiting provider account connection'}</small></article>
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
    <section className="panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Internal ledger and provider records</p></div><button className="text-link" onClick={() => setPage('transactions')}>View all <Icon name="arrow" /></button></div><TransactionTable transactions={transactions.slice(0, 5)} /></section>
  </main>
}

function Accounts({ customerAccount, accounts }) {
  return <main className="container app-page"><Title eyebrow="ACCOUNT SERVICES" title="Accounts" description="Your customer record and any accounts linked by a banking provider." /><ProviderNotice />
    <section className="panel"><div className="panel-heading"><div><h2>Customer account record</h2><p>Application status, not a deposit account or stored-value balance</p></div></div>
      <div className="account-row"><span className="account-icon"><Icon name="shield" /></span><div className="account-info"><strong>THEOS X DIGITAL TECH Customer Portal customer profile</strong><small>{customerAccount?.id || 'Customer record pending'}</small></div><div className="account-balance"><span className="pill">{customerAccount?.status || 'pending setup'}</span></div></div>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Linked bank accounts</h2><p>Only provider-created account records are shown here</p></div></div>
      {accounts.length ? <div className="account-grid">{accounts.map(account => <article className="panel detail-account" key={account.id}><span className="account-icon"><Icon name="wallet" /></span><span className="eyebrow">{account.account_type || 'Bank account'}</span><strong>{account.balance_minor == null ? 'Balance unavailable' : money(account.balance_minor, account.currency || 'NGN')}</strong><small>Account ending {account.account_number_masked || 'not supplied'}</small><small>Provider: {account.provider}</small><div className="account-detail-foot"><span className="pill">{account.status}</span><span>{account.balance_as_of ? 'Updated ' + dateLabel(account.balance_as_of) : 'No balance timestamp'}</span></div></article>)}</div> : <EmptyState title="No linked bank accounts" text="No account has been provisioned by a banking provider for this customer yet." />}
    </section>
  </main>
}

function Transactions({ transactions }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => transactions.filter(tx => [tx.description, tx.reference, tx.type, tx.status, tx.provider_transaction_id].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())), [transactions, query])
  return <main className="container app-page"><Title eyebrow="ACCOUNT ACTIVITY" title="Transactions" description="Internal app transfers and any verified records received from a connected provider." /><ProviderNotice />
    <section className="panel"><div className="panel-heading"><div><h2>Transaction history</h2><p>{filtered.length} record{filtered.length === 1 ? '' : 's'}</p></div><input className="search" aria-label="Search transactions" placeholder="Search reference or description…" value={query} onChange={event => setQuery(event.target.value)} /></div><TransactionTable transactions={filtered} /></section>
  </main>
}



function Transfers({ wallet, onTransferComplete, onRefresh, refreshing }) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async event => {
    event.preventDefault()
    setError('')
    setMessage('')
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    const amountMinor = Math.round(numericAmount * 100)
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      setError('Enter a valid amount with no more than two decimal places.')
      return
    }
    setBusy(true)
    try {
      const { data, error: transferError } = await supabase.rpc('transfer_internal', {
        p_recipient_email: recipient.trim(),
        p_amount_minor: amountMinor,
        p_description: description.trim() || 'Internal transfer',
        p_idempotency_key: crypto.randomUUID(),
      })
      if (transferError) throw transferError
      const result = Array.isArray(data) ? data[0] : data
      setMessage('Internal transfer completed. Reference: ' + (result?.reference || 'recorded'))
      setRecipient('')
      setAmount('')
      setDescription('')
      await onTransferComplete()
    } catch (err) {
      setError(err?.message || 'Transfer could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="container app-page">
    <Title eyebrow="INTERNAL TRANSFERS" title="Transfer funds" description="Send funds to another registered account in this application." />
    <div className="demo-alert"><Icon name="lock" /><span><strong>Application-only transfers.</strong> These transactions are recorded in this app's Supabase ledger. They do not move money through Wells Fargo or any external bank. Wallets begin with a zero balance; deposits are not enabled.</span></div>
    <div className="stats">
      <article className="balance-card"><span>Available app balance</span><strong>{wallet ? money(wallet.balance_minor, wallet.currency || 'NGN') : 'Loading…'}</strong><small>Calculated from completed internal ledger entries</small></article>
      <article className="stat"><span className="service-icon"><Icon name="wallet" /></span><small>Internal account number</small><strong className="account-number">{wallet?.account_number || 'Preparing account'}</strong><span className="muted">Not a bank account number</span></article>
    </div>
    <section className="panel transfer-panel">
      <div className="panel-heading"><div><h2>New internal transfer</h2><p>Recipient must have registered in this application</p></div></div>
      <form className="auth-fields transfer-fields" onSubmit={submit}>
        <label>Recipient email<input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} autoComplete="off" required placeholder="recipient@example.com" /></label>
        <label>Amount (NGN)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" /></label>
        <label>Description (optional)<input value={description} onChange={e => setDescription(e.target.value)} maxLength="120" placeholder="What is this transfer for?" /></label>
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}
        <button className="button red" disabled={busy || !wallet || wallet.status !== 'active'}>{busy ? 'Processing transfer…' : 'Transfer funds'}</button>
      </form>
      <p className="fine">The database checks account status and available balance and records both the debit and credit in one atomic operation. Insufficient funds or an unknown recipient will fail without posting a transfer.</p>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Internal transfers saved to Supabase</p></div><button className="text-link" onClick={onRefresh} disabled={refreshing}><Icon name="refresh" /> Refresh</button></div><p className="muted">Your completed internal transfers also appear in Transaction history.</p></section>
  </main>
}

function PasswordRecovery({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const submit = async event => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 8) return setError('Use a password with at least 8 characters.')
    if (password !== confirmation) return setError('The passwords do not match.')
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) setError(updateError.message)
    else {
      setMessage('Your password has been updated.')
      onComplete()
    }
  }
  return <main className="auth-page"><section className="auth-modal auth-card">
    <Brand onClick={() => {}} />
    <span className="eyebrow">ACCOUNT SECURITY</span>
    <h1>Choose a new password</h1>
    <p className="muted">Use a unique password you do not use for another account.</p>
    <form className="auth-fields" onSubmit={submit}>
      <label>New password<input type="password" minLength="8" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <label>Confirm new password<input type="password" minLength="8" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="success" role="status">{message}</p>}
      <button className="button red full" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>
  </section></main>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [customerAccount, setCustomerAccount] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [wallet, setWallet] = useState(null)
  const [internalTransactions, setInternalTransactions] = useState([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [dataError, setDataError] = useState('')
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setDataError(error.message)
      setSession(data?.session || null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (mounted) {
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
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
      setWallet(null)
      setInternalTransactions([])
      setDataLoading(false)
      return
    }

    setDataLoading(true)
    setDataError('')
    try {
      const userId = session.user.id
      const [profileResult, customerResult, accountResult] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,created_at').eq('id', userId).maybeSingle(),
        supabase.from('customer_accounts').select('id,user_id,provider_customer_id,status,created_at,updated_at').eq('user_id', userId).maybeSingle(),
        supabase.from('bank_accounts').select('id,user_id,provider,provider_account_id,account_number_masked,account_type,currency,balance_minor,balance_as_of,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      const failure = profileResult.error || customerResult.error || accountResult.error
      if (failure) throw failure

      setProfile(profileResult.data)
      setCustomerAccount(customerResult.data)
      const accountRows = accountResult.data || []
      setAccounts(accountRows)

      const [providerTransactionsResult, walletResult, internalTransactionsResult] = await Promise.all([
        accountRows.length
          ? supabase.from('transactions').select('id,bank_account_id,provider,provider_transaction_id,reference,type,status,direction,amount_minor,currency,description,posted_at,created_at').in('bank_account_id', accountRows.map(account => account.id)).order('posted_at', { ascending: false, nullsFirst: false }).limit(100)
          : Promise.resolve({ data: [], error: null }),
        supabase.rpc('get_my_internal_wallet'),
        supabase.from('internal_transactions').select('id,transfer_id,user_id,counterparty_user_id,reference,direction,amount_minor,currency,description,status,created_at').order('created_at', { ascending: false }).limit(100),
      ])
      const transactionFailure = providerTransactionsResult.error || walletResult.error || internalTransactionsResult.error
      if (transactionFailure) throw transactionFailure
      setTransactions(providerTransactionsResult.data || [])
      const walletRow = Array.isArray(walletResult.data) ? walletResult.data[0] : walletResult.data
      setWallet(walletRow || null)
      setInternalTransactions((internalTransactionsResult.data || []).map(tx => ({
        ...tx,
        provider: 'internal',
        provider_transaction_id: tx.transfer_id,
        type: 'Internal transfer',
        posted_at: tx.created_at,
      })))
    } catch (error) {
      setDataError(error?.message || 'Unable to load customer records. Please retry.')
    } finally {
      setDataLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (!loading && session) Promise.resolve().then(loadCustomerData)
  }, [loading, session, loadCustomerData])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setDataError(error.message)
    else {
      setProfile(null)
      setCustomerAccount(null)
      setAccounts([])
      setTransactions([])
      setWallet(null)
      setInternalTransactions([])
      setPasswordRecovery(false)
    }
  }

  if (loading) return <main className="auth-page"><section className="auth-modal auth-card"><Brand onClick={() => {}} /><p>Loading secure session…</p></section></main>
  if (passwordRecovery && session) return <PasswordRecovery onComplete={() => { setPasswordRecovery(false); setPage('overview') }} />
  if (!session) return <AuthForm onAuthenticated={setSession} />

  const allTransactions = [...internalTransactions, ...transactions].sort((a, b) => new Date(b.posted_at || b.created_at || 0) - new Date(a.posted_at || a.created_at || 0))

  return <div className="app-shell"><Header page={page} setPage={setPage} user={session.user} signOut={signOut} onRefresh={loadCustomerData} refreshing={dataLoading} />
    {dataError && <div className="container"><p className="error" role="alert">Unable to load account data: {dataError}. Use Refresh data to retry, or contact support if the problem continues.</p></div>}
    {page === 'accounts' ? <Accounts customerAccount={customerAccount} accounts={accounts} /> : page === 'transactions' ? <Transactions transactions={allTransactions} /> : page === 'transfers' ? <Transfers wallet={wallet} onTransferComplete={loadCustomerData} onRefresh={loadCustomerData} refreshing={dataLoading} /> : <Overview profile={profile} customerAccount={customerAccount} accounts={accounts} transactions={allTransactions} setPage={setPage} />}
    <footer className="footer"><div className="container footer-bottom"><span>THEOS X DIGITAL TECH Customer Portal · Account services</span><span>Independent customer portal. No real deposit accounts or money movement are provided.</span></div></footer>
  </div>
}
