"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role } from "@/lib/rbac";
import { getMe } from "./api/auth";

type AuthUser = { id?: string; email: string; name?: string | null };

type AuthMembership = {
  tenantId?: string;
  tenantName: string;
  tenantSlug: string;
  role: Role;
  status: string;
};

interface AuthContextValue {
  user: AuthUser | null;
  membership: AuthMembership | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
  initialMembership = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
  initialMembership?: AuthMembership | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [membership, setMembership] =
    useState<AuthMembership | null>(initialMembership);
  const [isLoading, setIsLoading] = useState(!initialUser || !initialMembership);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMe();
      const activeMembership =
        result.tenantMemberships.find((item) => item.status === "ACTIVE") ??
        result.tenantMemberships[0] ??
        null;

      setUser(result.user);
      setMembership(
        activeMembership
          ? {
              tenantId: activeMembership.tenantId,
              tenantName: activeMembership.tenantName,
              tenantSlug: activeMembership.tenantSlug,
              role: activeMembership.role,
              status: activeMembership.status,
            }
          : null,
      );
    } catch {
      setUser(null);
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialUser || !initialMembership) {
      void refetch();
    }
  }, [initialMembership, initialUser, refetch]);

  const value = useMemo(
    () => ({ user, membership, isLoading, refetch }),
    [isLoading, membership, refetch, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
