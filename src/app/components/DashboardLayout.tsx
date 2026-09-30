'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setUser(data.user);
      });
  }, [router]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  if (!user) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const sidebarContent = (
    <>
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--skybank-navy)', margin: 0, fontSize: '1.5rem', letterSpacing: '-0.5px', textAlign: 'left' }}>
            SkyBank<span style={{ color: 'var(--skybank-accent)' }}>.</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--skybank-text-secondary)', textAlign: 'left' }}>Educational Simulation</p>
        </div>
        {/* Mobile close button (only visible on mobile layout via CSS, but we can just inline it if menu is open) */}
        <button 
          className="hide-on-desktop" 
          onClick={() => setMobileMenuOpen(false)}
          style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem', color: 'var(--skybank-text-secondary)' }}
          aria-label="Close menu"
        >
          ×
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, textAlign: 'left' }}>
        <NavItem href="/" label="Overview" current={pathname === '/'} />
        <NavItem href="/transfer" label="Transfers" current={pathname === '/transfer'} />
        <NavItem href="/transactions" label="Transactions" current={pathname === '/transactions'} />
        <div style={{ padding: '1rem 1.5rem 0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--skybank-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Security
        </div>
        <NavItem href="/crypto-lab" label="Cryptography Lab" current={pathname === '/crypto-lab'} />
        <NavItem href="/security-tests" label="Security Tests" current={pathname === '/security-tests'} />
        <NavItem href="/audit" label="Audit Logs" current={pathname === '/audit'} />
      </nav>

      <div style={{ padding: '1.5rem', textAlign: 'left' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--skybank-text-primary)', marginBottom: '0.5rem' }}>
          {user.fullName}
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-desktop { display: none; }
        .mobile-topbar { display: flex; }
        .hide-on-desktop { display: block; }
        .main-content { padding: 1.5rem; }
        
        @media (min-width: 769px) {
          .sidebar-desktop { display: flex; }
          .mobile-topbar { display: none; }
          .hide-on-desktop { display: none !important; }
          .main-content { padding: 3rem 4rem; }
        }
      `}} />

      {/* Mobile Top Bar */}
      <header className="mobile-topbar" style={{ 
        height: '60px', 
        backgroundColor: 'var(--skybank-surface)', 
        borderBottom: '1px solid var(--skybank-border)',
        alignItems: 'center',
        padding: '0 1rem',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <h1 style={{ color: 'var(--skybank-navy)', margin: 0, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
          SkyBank<span style={{ color: 'var(--skybank-accent)' }}>.</span>
        </h1>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}
          aria-label="Open menu"
        >
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'var(--skybank-navy)' }}></span>
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'var(--skybank-navy)' }}></span>
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'var(--skybank-navy)' }}></span>
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        <aside className="sidebar-desktop" style={{
          width: '240px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--skybank-border)',
          flexDirection: 'column',
          padding: '1.5rem 0',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto'
        }}>
          {sidebarContent}
        </aside>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(16, 42, 67, 0.4)',
              zIndex: 45
            }}
          />
        )}

        {/* Mobile Drawer */}
        <aside style={{
          position: 'fixed',
          top: 0, bottom: 0, left: 0,
          width: '260px',
          backgroundColor: '#FFFFFF',
          zIndex: 50,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 250ms ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
          overflowY: 'auto'
        }}>
          {sidebarContent}
        </aside>

        {/* Main Content */}
        <main className="main-content" style={{ flex: 1, backgroundColor: 'var(--skybank-background)', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, label, current }: { href: string, label: string, current: boolean }) {
  return (
    <Link 
      href={href} 
      style={{
        padding: '0.625rem 1.5rem',
        textDecoration: 'none',
        color: current ? 'var(--skybank-navy)' : 'var(--skybank-text-secondary)',
        backgroundColor: current ? '#F0F4F8' : 'transparent',
        borderRight: current ? '3px solid var(--skybank-accent)' : '3px solid transparent',
        fontWeight: current ? 500 : 400,
        fontSize: '0.875rem',
        display: 'block'
      }}
    >
      {label}
    </Link>
  );
}
