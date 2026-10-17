import { useState } from 'react'
import './App.css'

const navigation = [
  ['overview', 'Overview'],
  ['accounts', 'Accounts'],
  ['wallet', 'Wallet'],
  ['transactions', 'Transactions'],
  ['transfers', 'Transfer'],
  ['service-home-mortgage', 'Home Mortgage', '/services/home-mortgage'],
  ['service-mortgage-refinance', 'Mortgage Refinance', '/services/mortgage-refinance'],
  ['service-personal-loans', 'Personal Loans', '/services/personal-loans'],
  ['service-auto-loans', 'Auto Loans', '/services/auto-loans'],
  ['service-student-loans', 'Student Loans', '/services/student-loans'],
]

function ShieldIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 11 2 2 4-4"/></svg>
}

function RefreshIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M4 17v-5h5M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></svg>
}

function LogoutIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m10 17 5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg>
}

export default function CustomerHeader({
  page = '',
  user,
  setPage,
  signOut,
  onRefresh,
  refreshing = false,
  loanPage = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const goHome = () => {
    setMenuOpen(false)
    if (loanPage) {
      window.location.href = '/'
    } else {
      setPage('overview')
    }
  }

  return <>
    <div className="utility">
      <div className="container utility-inner">
        <span>Customer account services</span>
        <span><ShieldIcon /> Secure session</span>
      </div>
    </div>

    <header className="site-header">
      <div className="container header-inner">
        <button className="brand" onClick={goHome} aria-label="Customer portal home">
          <span className="brand-mark">W</span>
          <span className="brand-copy">
            <strong>WBF-Online</strong>
            <small>ACCOUNT SERVICES</small>
          </span>
        </button>

        <button
          className="mobile-menu"
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>

        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Customer navigation">
          {navigation.map(([key, label, href]) => {
            const active = !loanPage && page === key
            const className = active ? 'nav-link active' : 'nav-link'

            if (loanPage) {
              const destination = href || '/'
              return <a
                key={key}
                className={className}
                href={destination}
                onClick={() => setMenuOpen(false)}
              >{label}</a>
            }

            return <button
              key={key}
              type="button"
              className={className}
              onClick={() => {
                setMenuOpen(false)
                if (href) {
                  window.location.href = href
                } else {
                  setPage(key)
                }
              }}
            >{label}</button>
          })}
        </nav>

        <button
          className="text-link refresh-action"
          type="button"
          onClick={onRefresh}
          disabled={refreshing || !onRefresh}
          aria-label="Refresh customer records"
        >
          <RefreshIcon />
          {refreshing ? 'Refreshing…' : 'Refresh data'}
        </button>

        <button
          className="signout"
          type="button"
          onClick={() => {
            setMenuOpen(false)
            signOut?.()
          }}
        >
          <span className="avatar">{(user?.email || 'U')[0].toUpperCase()}</span>
          <span>Sign out</span>
          <LogoutIcon />
        </button>
      </div>
    </header>
  </>
}
