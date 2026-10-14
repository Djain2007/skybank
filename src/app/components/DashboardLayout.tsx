"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import type { Session } from "@/lib/types";
import { SessionContext } from "./Session";
import { LogoMark, Wordmark } from "./Logo";
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
} from "./Icons";
import styles from "./DashboardLayout.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

interface NavGroup {
  label: string;
  /** The security group is coloured purple: it is the cryptographic layer. */
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
    label: "Security",
    tone: "security",
    items: [
      { href: "/crypto-lab", label: "Cryptography lab", icon: FlaskIcon },
      { href: "/security-tests", label: "Security tests", icon: ShieldIcon },
      { href: "/audit", label: "Audit log", icon: FileIcon },
    ],
  },
];

function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Returns the current session, or null when the cookie is missing or expired. */
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

  // Lock page scroll and allow Escape while the drawer is open.
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (!session) {
    return <LoadingShell />;
  }

  const sidebar = (
    <Sidebar
      session={session}
      pathname={pathname}
      onLogout={handleLogout}
      onClose={() => setMenuOpen(false)}
    />
  );

  return (
    <SessionContext.Provider value={{ session, refresh }}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>{sidebar}</aside>

        <div className={styles.column}>
          <header className={styles.topbar}>
            <Link href="/" className={styles.topbarBrand} aria-label="SkyBank overview">
              <LogoMark size={26} />
              <Wordmark />
            </Link>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <MenuIcon size={22} />
            </button>
          </header>

          <main className={styles.main}>{children}</main>
        </div>

        {menuOpen && (
          <button
            type="button"
            className={styles.overlay}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
        )}
        <aside
          className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`}
          aria-hidden={!menuOpen}
        >
          {sidebar}
        </aside>
      </div>
    </SessionContext.Provider>
  );
}

interface SidebarProps {
  session: Session;
  pathname: string;
  onLogout: () => void;
  onClose: () => void;
}

function Sidebar({ session, pathname, onLogout, onClose }: SidebarProps) {
  return (
    <>
      <div className={styles.brand}>
        <Link href="/" className={styles.brandLink} aria-label="SkyBank overview">
          <LogoMark />
          <span className={styles.brandText}>
            <Wordmark />
            <span className={styles.brandSub}>Educational simulator</span>
          </span>
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

      <nav className={styles.nav} aria-label="Main">
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
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.user}>
        <div className={styles.avatar} aria-hidden="true">
          {initialsOf(session.user.fullName)}
        </div>
        <div className={styles.userText}>
          <div className={styles.userName}>{session.user.fullName}</div>
          <div className={`${styles.userAccount} mono`}>{session.account.accountNumber}</div>
        </div>
        <button type="button" className="icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
          <LogOutIcon size={18} />
        </button>
      </div>
    </>
  );
}

/** Skeleton shown while the session is being fetched, so the layout doesn't jump. */
function LoadingShell() {
  return (
    <div className={styles.shell} aria-busy="true" aria-live="polite">
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <LogoMark />
          <span className={styles.brandText}>
            <Wordmark />
            <span className={styles.brandSub}>Educational simulator</span>
          </span>
        </div>
        <div className={styles.nav}>
          <div className={styles.group}>
            {[88, 72, 104].map((w, i) => (
              <span key={i} className="skeleton" style={{ height: 14, width: w, margin: "11px 10px" }} />
            ))}
          </div>
          <div className={styles.group}>
            {[124, 110, 80].map((w, i) => (
              <span key={i} className="skeleton" style={{ height: 14, width: w, margin: "11px 10px" }} />
            ))}
          </div>
        </div>
      </aside>
      <div className={styles.column}>
        <header className={styles.topbar}>
          <span className={styles.topbarBrand}>
            <LogoMark size={26} />
            <Wordmark />
          </span>
        </header>
        <main className={styles.main}>
          <span className="skeleton" style={{ height: 26, width: 220, marginBottom: 12 }} />
          <span className="skeleton" style={{ height: 14, width: 320, marginBottom: 32 }} />
          <span className="skeleton" style={{ height: 180, width: "100%", maxWidth: 680, borderRadius: 12 }} />
          <span className="sr-only">Loading your account</span>
        </main>
      </div>
    </div>
  );
}
