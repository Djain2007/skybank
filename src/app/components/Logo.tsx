/**
 * SkyBank brand mark: two overlapping layers — the banking layer in blue,
 * the cryptographic layer in purple. Pass `onDark` when it sits on the
 * deep-blue surfaces.
 */
export function LogoMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="19" height="19" rx="6" fill={onDark ? "#ffffff" : "#2f5bea"} />
      <rect
        x="11"
        y="11"
        width="19"
        height="19"
        rx="6"
        fill="#6b4fd8"
        stroke={onDark ? "#1a2d73" : "#ffffff"}
        strokeWidth="2"
      />
    </svg>
  );
}

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      style={{
        fontSize: 17,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: onDark ? "#fff" : "var(--ink)",
        lineHeight: 1,
      }}
    >
      SkyBank
    </span>
  );
}
