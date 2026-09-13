"use client";

import * as React from "react";
import type { SessionUser } from "@/lib/auth";

const SessionContext = React.createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSessionUser() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSessionUser harus dipakai di dalam SessionProvider");
  return { user: ctx };
}
