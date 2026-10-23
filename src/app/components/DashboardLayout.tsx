"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import type { Session } from "@/lib/types";
import { SessionContext } from "./Session";
import { LogoMark, Wordmark } from "./Logo";
import { ToastProvider } from "./Toast";
import CopyButton from "./CopyButton";
import {
  CloseIcon,
  FileIcon,
  FlaskIcon,
  GridIcon,
  ListIcon,
  LogOutIcon,
  MenuIcon,
  ShieldIcon,
  TransferIcon,
  LockIcon,
} from "./Icons";
import styles from "./DashboardLayout.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

interface NavGroup {
  label: string;
  tone: "banking" | "security";
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: "Banking",
    tone: "banking",
    items: [
      { href: "/", label: "Overview", icon: GridIcon },
      { href: "/transfer", label: "Transfer", icon: TransferIcon },
      { href: "/transactions", label: "Transactions", icon: ListIcon },
    ],
  },
  {
    label: "Security & Cryptography",
    tone: "security",
    items: [
      { href: "/crypto-lab", label: "Cryptography Lab", icon: FlaskIcon },
      { href: "/security-tests", label: "Security Tests", icon: ShieldIcon },
      { href: "/audit", label: "Audit Log", icon: FileIcon },
    ],
  },
];

const bottomNavItems = [
  { href: "/", label: "Overview", icon: GridIcon },
  { href: "/transfer", label: "Transfer", icon: TransferIcon },
  { href: "/transactions", label: "Activity", icon: ListIcon },
  { href: "/security-tests", label: "Security", icon: ShieldIcon },
];

function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function fetchSession(): Promise<Session | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Session;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((data) => {
      if (cancelled) return;
      if (!data) {
        router.replace("/login");
        return;
      }
      setSession(data);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const refresh = useCallback(async () => {
    const data = await fetchSession();
    if (data) setSession(data);
  }, []);

  // Lock page scroll and allow Escape while drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Close drawer on path change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (!session) {
    return <LoadingShell />;
  }

  const sidebarContent = (
    <SidebarContent
      session={session}
      pathname={pathname}
      onLogout={handleLogout}
      onClose={() => setMenuOpen(false)}
    />
  );

  return (
    <ToastProvider>
      <SessionContext.Provider value={{ session, refresh }}>
        <div className={styles.shell}>
          {/* Desktop Left Sidebar */}
          <aside className={styles.sidebar}>{sidebarContent}</aside>

          {/* Main Column */}
          <div className={styles.column}>
            {/* Mobile / Tablet Top Bar */}
            <header className={styles.topbar}>
              <Link href="/" className={styles.topbarBrand} aria-label="SkyBank Overview">
                <LogoMark size={28} />
                <span className={styles.brandTitle}>
                  <Wordmark />
                  <span className={styles.badgeSim}>SIMULATOR</span>
                </span>
              </Link>

              <div className={styles.topbarActions}>
                <div className={styles.topbarUser}>
                  <span className={styles.avatarSm}>{initialsOf(session.user.fullName)}</span>
                </div>
                <button
                  type="button"
                  className={`icon-btn ${styles.menuTrigger}`}
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open navigation menu"
                  aria-expanded={menuOpen}
                >
                  <MenuIcon size={22} />
                </button>
              </div>
            </header>

            {/* Page Main Content */}
            <main className={styles.main}>{children}</main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className={styles.bottomNav} aria-label="Mobile Navigation">
              {bottomNavItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.bottomNavItem} ${active ? styles.bottomNavActive : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={20} />
                    <span className={styles.bottomNavLabel}>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                className={`${styles.bottomNavItem} ${menuOpen ? styles.bottomNavActive : ""}`}
                onClick={() => setMenuOpen(true)}
                aria-label="More navigation options"
              >
                <MenuIcon size={20} />
                <span className={styles.bottomNavLabel}>More</span>
              </button>
            </nav>
          </div>

          {/* Off-canvas mobile drawer */}
          {menuOpen && (
            <div
              className={styles.overlay}
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
          )}
          <aside
            className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`}
            aria-hidden={!menuOpen}
            aria-label="Main menu"
          >
            {sidebarContent}
          </aside>
        </div>
      </SessionContext.Provider>
    </ToastProvider>
  );
}

interface SidebarProps {
  session: Session;
  pathname: string;
  onLogout: () => void;
  onClose: () => void;
}

function SidebarContent({ session, pathname, onLogout, onClose }: SidebarProps) {
  return (
    <div className={styles.sidebarInner}>
      <div className={styles.brand}>
        <Link href="/" className={styles.brandLink} aria-label="SkyBank overview" onClick={onClose}>
          <LogoMark size={30} />
          <div className={styles.brandText}>
            <div className={styles.brandRow}>
              <Wordmark />
              <span className={styles.badgeSim}>SECURE</span>
            </div>
            <span className={styles.brandSub}>Educational Simulator</span>
          </div>
        </Link>
        <button
          type="button"
          className={`icon-btn ${styles.drawerClose}`}
          onClick={onClose}
          aria-label="Close menu"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      <nav className={styles.nav} aria-label="Main Navigation">
        {navigation.map((group) => (
          <div key={group.label} className={styles.group} data-tone={group.tone}>
            <div className={styles.groupLabel}>{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.item} ${active ? styles.itemActive : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                >
                  <span className={styles.itemIcon}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.itemLabel}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Security Status Card in Sidebar */}
      <div className={styles.cryptoPill}>
        <LockIcon size={14} />
        <span>Hybrid Cryptography Active</span>
      </div>

      {/* User profile tile at bottom */}
      <div className={styles.user}>
        <div className={styles.avatar} aria-hidden="true">
          {initialsOf(session.user.fullName)}
        </div>
        <div className={styles.userText}>
          <div className={styles.userName}>{session.user.fullName}</div>
          <div className={styles.userAccountRow}>
            <span className={`${styles.userAccount} mono`}>{session.account.accountNumber}</span>
            <CopyButton value={session.account.accountNumber} toastLabel="Account number copied" size="sm" />
          </div>
        </div>
        <button
          type="button"
          className={`icon-btn ${styles.logoutBtn}`}
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
        >
          <LogOutIcon size={18} />
        </button>
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className={styles.shell} aria-busy="true" aria-live="polite">
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <LogoMark size={30} />
          <div className={styles.brandText}>
            <Wordmark />
            <span className={styles.brandSub}>Educational Simulator</span>
          </div>
        </div>
        <div className={styles.nav}>
          <div className={styles.group}>
            {[100, 80, 110].map((w, i) => (
              <span key={i} className="skeleton" style={{ height: 36, width: "100%", margin: "4px 0", borderRadius: 8 }} />
            ))}
          </div>
          <div className={styles.group}>
            {[120, 110, 90].map((w, i) => (
              <span key={i} className="skeleton" style={{ height: 36, width: "100%", margin: "4px 0", borderRadius: 8 }} />
            ))}
          </div>
        </div>
      </aside>
      <div className={styles.column}>
        <header className={styles.topbar}>
          <span className={styles.topbarBrand}>
            <LogoMark size={28} />
            <Wordmark />
          </span>
        </header>
        <main className={styles.main}>
          <span className="skeleton" style={{ height: 32, width: 240, marginBottom: 12, borderRadius: 8 }} />
          <span className="skeleton" style={{ height: 16, width: 340, marginBottom: 32, borderRadius: 6 }} />
          <span className="skeleton" style={{ height: 210, width: "100%", maxWidth: 680, borderRadius: 14 }} />
          <span className="sr-only">Loading your account</span>
        </main>
      </div>
    </div>
  );
}
