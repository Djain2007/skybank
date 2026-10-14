import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "./Logo";
import styles from "./AuthLayout.module.css";

const steps = [
  {
    title: "A one-time AES-256 key encrypts the transfer",
    detail: "AES-GCM in your browser, so the payload is sealed before it leaves the page.",
  },
  {
    title: "Your private key signs it",
    detail: "An RSA-PSS signature over the canonical transaction proves it came from you.",
  },
  {
    title: "The AES key is wrapped for the server",
    detail: "RSA-OAEP with the server's public key. Only SkyBank can unwrap it.",
  },
  {
    title: "The server verifies before it moves money",
    detail: "Authentication tag, signature, nonce and timestamp are all checked first.",
  },
];

/**
 * Two-column frame for the sign-in and registration pages: the product's
 * explanation on the left, the form on the right.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <aside className={styles.panel}>
        <Link href="/login" className={styles.brand} aria-label="SkyBank">
          <LogoMark size={30} onDark />
          <Wordmark onDark />
        </Link>

        <div className={styles.panelBody}>
          <h2 className={styles.panelTitle}>Banking that shows you its cryptography.</h2>
          <p className={styles.panelLead}>
            SkyBank is an educational simulator. Every transfer is encrypted, signed and
            verified with real primitives, and you can inspect each one.
          </p>

          <ol className={styles.steps}>
            {steps.map((step, i) => (
              <li key={step.title} className={styles.step}>
                <span className={`${styles.stepIndex} mono`}>{i + 1}</span>
                <div>
                  <div className={styles.stepTitle}>{step.title}</div>
                  <div className={styles.stepDetail}>{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className={styles.panelFoot}>
          Built for an applied cryptography course. Not a real bank; nothing here has value.
        </p>
      </aside>

      <main className={styles.content}>
        <div className={styles.mobileBrand}>
          <LogoMark size={26} />
          <Wordmark />
        </div>
        <div className={styles.form}>{children}</div>
      </main>
    </div>
  );
}
