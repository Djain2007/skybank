/**
 * SkyBank brand mark: two overlapping layers — the banking layer in blue,
 * the cryptographic layer in purple. Pass `onDark` when it sits on dark surfaces.
 */
export function LogoMark({ size = 26, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="19" height="19" rx="5" fill={onDark ? "#ffffff" : "#3156d9"} />
      <rect
        x="11"
        y="11"
        width="19"
        height="19"
        rx="5"
        fill="#5b43d6"
        stroke={onDark ? "#131c38" : "#ffffff"}
        strokeWidth="2"
      />
    </svg>
  );
}

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      style={{
        fontSize: 16.5,
        fontWeight: 650,
        letterSpacing: "-0.02em",
        color: onDark ? "#ffffff" : "var(--ink)",
        lineHeight: 1,
      }}
    >
      SkyBank
    </span>
  );
}
