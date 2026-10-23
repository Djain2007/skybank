"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "./Icons";
import { useToast } from "./Toast";
import styles from "./CopyButton.module.css";

interface CopyButtonProps {
  value: string;
  label?: string;
  toastLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

export default function CopyButton({
  value,
  label,
  toastLabel,
  size = "sm",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(toastLabel || "Copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
      toast.info("Failed to copy");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${styles.button} ${size === "sm" ? styles.sm : styles.md} ${copied ? styles.copied : ""} ${className}`}
      aria-label={label ? `Copy ${label}` : "Copy to clipboard"}
      title={label ? `Copy ${label}` : "Copy to clipboard"}
    >
      {copied ? <CheckIcon size={size === "sm" ? 13 : 15} /> : <CopyIcon size={size === "sm" ? 13 : 15} />}
      {label && <span className={styles.label}>{copied ? "Copied" : label}</span>}
    </button>
  );
}
