"use client";

import { createContext, useContext } from "react";
import type { Session } from "@/lib/types";

interface SessionContextValue {
  session: Session;
  /** Re-fetch the current user and balance (for example after a transfer). */
  refresh: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Access the signed-in user and account. Only valid inside <DashboardLayout>,
 * which fetches the session once and renders its children after it has loaded.
 */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside <DashboardLayout>");
  }
  return value;
}
