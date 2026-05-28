"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { PlatformAdminRole } from "@/types/platform";

type PlatformAuthContextValue = {
  role: PlatformAdminRole;
  user: {
    email: string;
    name: string | null;
  };
  canManage: boolean;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function PlatformAuthProvider({
  children,
  role,
  user,
}: {
  children: ReactNode;
  role: PlatformAdminRole;
  user: PlatformAuthContextValue["user"];
}) {
  return (
    <PlatformAuthContext.Provider
      value={{
        role,
        user,
        canManage: role === "PLATFORM_ADMIN",
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext);

  if (!context) {
    throw new Error("usePlatformAuth must be used within PlatformAuthProvider.");
  }

  return context;
}
