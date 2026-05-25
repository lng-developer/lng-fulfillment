"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api/auth";

type UserMenuProps = {
  user: {
    email: string;
    name: string | null;
  };
  tenant: {
    tenantName: string;
    tenantSlug: string;
    role: string;
  } | null;
};

const LOGOUT_ERROR =
  "We could not sign you out. Try again, or refresh the page.";

export function UserMenu({ user, tenant }: UserMenuProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (isPending || hasLoggedOut) {
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      await logout();
      setHasLoggedOut(true);
      router.replace("/login");
      router.refresh();
    } catch {
      setError(LOGOUT_ERROR);
      setIsPending(false);
    }
  }

  if (hasLoggedOut) {
    return (
      <section aria-live="polite" style={panelStyle}>
        <p style={mutedTextStyle}>Signed out.</p>
      </section>
    );
  }

  return (
    <section aria-label="User menu" style={panelStyle}>
      <div style={{ display: "grid", gap: "10px" }}>
        <div>
          <p style={labelStyle}>Signed in as</p>
          <p style={primaryTextStyle}>{user.name ?? user.email}</p>
          <p style={mutedTextStyle}>{user.email}</p>
        </div>

        {tenant ? (
          <div>
            <p style={labelStyle}>Current tenant</p>
            <p style={primaryTextStyle}>{tenant.tenantName}</p>
            <p style={mutedTextStyle}>
              {tenant.tenantSlug} | Role: {tenant.role}
            </p>
          </div>
        ) : (
          <p style={mutedTextStyle}>No active tenant membership found.</p>
        )}
      </div>

      {error ? (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : null}

      <button
        disabled={isPending}
        onClick={handleLogout}
        type="button"
        style={{
          ...buttonStyle,
          background: isPending ? "#7b8491" : "#17202a",
          cursor: isPending ? "not-allowed" : "pointer",
        }}
      >
        {isPending ? "Signing out..." : "Sign out"}
      </button>
    </section>
  );
}

const panelStyle = {
  background: "#ffffff",
  border: "1px solid #d9dee7",
  borderRadius: "8px",
  display: "grid",
  gap: "18px",
  marginTop: "24px",
  maxWidth: "480px",
  padding: "20px",
};

const labelStyle = {
  color: "#5d6673",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: 0,
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const primaryTextStyle = {
  color: "#17202a",
  fontSize: "16px",
  fontWeight: 700,
  lineHeight: 1.4,
  margin: 0,
};

const mutedTextStyle = {
  color: "#5d6673",
  fontSize: "14px",
  lineHeight: 1.45,
  margin: 0,
};

const errorTextStyle = {
  color: "#9f1d1d",
  fontSize: "14px",
  lineHeight: 1.45,
  margin: 0,
};

const buttonStyle = {
  border: 0,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 700,
  minHeight: "44px",
  padding: "0 16px",
  width: "100%",
};
