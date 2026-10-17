import './LandingPage.css'

const services = [
  {
    number: '01',
    title: 'Account management',
    text: 'Explore account information, balances, and account-management screens.',
    symbol: '▤',
    href: '/login',
  },
  {
    number: '02',
    title: 'Transaction activity',
    text: 'Review transaction-history interfaces and activity summaries.',
    symbol: '↗',
    href: '/login',
  },
  {
    number: '03',
    title: 'Payments and transfers',
    text: 'Explore payment and beneficiary workflows available in the application.',
    symbol: '⇄',
    href: '/login',
  },
  {
    number: '04',
    title: 'Account security',
    text: 'Access sign-in, password recovery, and account-security features.',
    symbol: '◇',
    href: '/login',
  },
  {
    number: '05',
    title: 'Home mortgage / refinance',
    text: 'Explore home-purchase financing, refinancing concepts, and mortgage information.',
    symbol: '⌂',
    href: '/services/home-mortgage',
  },
  {
    number: '06',
    title: 'Personal loans',
    text: 'Learn about personal borrowing, potential uses, and factors to consider.',
    symbol: '$',
    href: '/services/personal-loans',
  },
  {
    number: '07',
    title: 'Auto loans',
    text: 'Explore vehicle financing concepts, loan costs, and repayment considerations.',
    symbol: '↗',
    href: '/services/auto-loans',
  },
  {
    number: '08',
    title: 'Student loans',
    text: 'Review education financing concepts, borrowing considerations, and repayment planning.',
    symbol: '▤',
    href: '/services/student-loans',
  },
]

export default function LandingPage() {
  return (
    <main className="landing">
      <div className="landing-disclosure">
        Independent banking interface.
      </div>

      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="Home">
          <span className="landing-brand-mark">W</span>
          <span className="landing-brand-copy">
            <strong>WBF-Online</strong>
            <small>ACCOUNT SERVICES</small>
          </span>
        </a>

        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#security">Security</a>
          <a href="#support">Support</a>
          <a className="landing-signin" href="/login">Sign in</a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">DIGITAL ACCOUNT SERVICES</span>
          <h1>Banking tools designed around you.</h1>
          <p>
            Explore a clean, convenient account-services experience with
            account information, transaction activity, and customer tools
            available from one place.
          </p>

          <div className="landing-actions">
            <a className="landing-button landing-button-red" href="/login?mode=signup">
              Open an account <span aria-hidden="true">→</span>
            </a>
            <a className="landing-button landing-button-outline" href="/login">
              Sign in to continue
            </a>
          </div>

          <div className="landing-assurance">
            <span aria-hidden="true">◇</span>
            <span>Account access and security tools</span>
          </div>
        </div>

        <div className="landing-hero-art" aria-label="Illustration of an account dashboard">
          <div className="landing-art-circle landing-art-circle-one" />
          <div className="landing-art-circle landing-art-circle-two" />

          <div className="landing-account-card">
            <div className="landing-account-heading">
              <span className="landing-small-mark">W</span>
              <span>Account overview</span>
              <span className="landing-menu-dots">•••</span>
            </div>

            <div className="landing-account-label">ACCOUNT SUMMARY</div>
            <div className="landing-account-placeholder">
              Your account information
            </div>
            <div className="landing-account-note">
              Sign in to view information associated with your account.
            </div>

            <div className="landing-card-divider" />

            <div className="landing-account-row">
              <span className="landing-row-icon">▤</span>
              <span>
                <strong>Account details</strong>
                <small>Account information</small>
              </span>
              <span className="landing-row-arrow">→</span>
            </div>

            <div className="landing-account-row">
              <span className="landing-row-icon">↗</span>
              <span>
                <strong>Recent activity</strong>
                <small>Transaction history</small>
              </span>
              <span className="landing-row-arrow">→</span>
            </div>

            <a className="landing-card-link" href="/login">
              Continue to account access →
            </a>
          </div>

          <div className="landing-floating-note">
            <span className="landing-floating-icon">✓</span>
            <span>
              <strong>Security matters</strong>
              <small>Protect your sign-in details</small>
            </span>
          </div>
        </div>
      </section>

      <section className="landing-services" id="services">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">ACCOUNT SERVICES</span>
          <h2>Banking and lending information, in one place.</h2>
          <p>
            Explore the available account-management features and customer
            service interfaces.
          </p>
        </div>

        <div className="landing-service-grid">
          {services.map((service) => (
            <article className="landing-service-card" key={service.number}>
              <div className="landing-service-top">
                <span className="landing-service-icon">{service.symbol}</span>
                <span className="landing-service-number">{service.number}</span>
              </div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <a href={service.href}>
                Explore service <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-security" id="security">
        <div className="landing-security-icon" aria-hidden="true">◇</div>
        <div>
          <span className="landing-eyebrow">ACCOUNT SECURITY</span>
          <h2>Keep your account credentials private.</h2>
          <p>
            Use a unique password, sign out on shared devices, and never share
            your password or verification codes with anyone.
          </p>
        </div>
        <a className="landing-button landing-button-outline" href="/login">
          Access account
        </a>
      </section>

      <section className="landing-support" id="support">
        <div>
          <span className="landing-eyebrow">CUSTOMER RESOURCES</span>
          <h2>Need help getting started?</h2>
          <p>
            Visit the sign-in page to access the account interface, register,
            or use the available password recovery flow.
          </p>
        </div>
        <div className="landing-support-links">
          <a href="/login">Sign in <span>→</span></a>
          <a href="/login?mode=signup">Create an account <span>→</span></a>
        </div>
      </section>

      <footer className="landing-footer">
        <a className="landing-footer-brand" href="/">WBF-Online</a>
        <span>Independent banking interface.</span>
        <a href="#security">Security information ↑</a>
      </footer>
    </main>
  )
}
