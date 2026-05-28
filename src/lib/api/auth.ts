import type { Role } from "@/lib/rbac";
import { apiFetch, type ApiSuccessEnvelope, unwrapData } from "./base";

export interface MeResponse {
  user: { id: string; email: string; name?: string };
  platformAdmin: {
    role: "PLATFORM_ADMIN" | "PLATFORM_SUPPORT";
    status: "ACTIVE" | "DISABLED";
  } | null;
  tenantMemberships: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: Role;
    status: "ACTIVE" | "DISABLED";
  }[];
}

type AuthContextResponse = {
  user: { id: string; email: string; name?: string | null };
  platformAdmin: {
    role: "PLATFORM_ADMIN" | "PLATFORM_SUPPORT";
    status: "ACTIVE" | "DISABLED";
  } | null;
  tenants: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: Role;
    membershipStatus: "ACTIVE" | "DISABLED";
  }[];
};

export async function login(email: string, password: string) {
  const response = await apiFetch<ApiSuccessEnvelope<AuthContextResponse>>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return unwrapData(response);
}

export async function logout() {
  return apiFetch<ApiSuccessEnvelope<unknown>>("/api/auth/logout", {
    method: "POST",
  });
}

export async function getMe(): Promise<MeResponse> {
  const data = unwrapData(
    await apiFetch<ApiSuccessEnvelope<AuthContextResponse>>("/api/auth/me"),
  );

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name ?? undefined,
    },
    platformAdmin: data.platformAdmin,
    tenantMemberships: data.tenants.map((tenant) => ({
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      tenantSlug: tenant.tenantSlug,
      role: tenant.role,
      status: tenant.membershipStatus,
    })),
  };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return apiFetch<ApiSuccessEnvelope<{ changed: true }>>(
    "/api/auth/change-password",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
