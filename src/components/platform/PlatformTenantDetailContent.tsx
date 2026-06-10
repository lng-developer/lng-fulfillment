"use client";

import {
  AlertTriangle,
  Loader2,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ErrorState } from "@/components/ui/ErrorState";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, getErrorMessage } from "@/lib/api/base";
import {
  createPlatformTenantMember,
  getPlatformTenant,
  getPlatformTenantMembers,
  updatePlatformTenant,
  updatePlatformTenantMember,
} from "@/lib/api/platform";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  PlatformMember,
  PlatformMembershipStatus,
  PlatformTenantDetail,
  PlatformTenantRole,
  PlatformTenantStatus,
  PlatformTenantType,
} from "@/types/platform";
import { usePlatformAuth } from "./PlatformAuthContext";

const TENANT_NAME_MAX_LENGTH = 120;
const MEMBER_NAME_MAX_LENGTH = 120;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 256;
const TENANT_TYPES: PlatformTenantType[] = ["CLIENT", "INTERNAL", "PARTNER"];
const TENANT_STATUSES: PlatformTenantStatus[] = ["ACTIVE", "DISABLED"];
const TENANT_ROLES: PlatformTenantRole[] = [
  "OWNER",
  "ADMIN",
  "OPERATOR",
  "VIEWER",
];
const EDITABLE_MEMBER_STATUSES: Array<Extract<PlatformMembershipStatus, "ACTIVE" | "DISABLED">> = [
  "ACTIVE",
  "DISABLED",
];

type TenantFormErrors = Partial<Record<"name" | "type" | "status", string>>;
type MemberFormErrors = Partial<
  Record<"email" | "name" | "password" | "role" | "membershipStatus", string>
>;
type TenantUpdatePayload = {
  name: string;
  type: PlatformTenantType;
  status: PlatformTenantStatus;
};
type MemberUpdatePayload = {
  role: PlatformTenantRole;
  membershipStatus: Extract<PlatformMembershipStatus, "ACTIVE" | "DISABLED">;
};

export function PlatformTenantDetailContent({
  canManage: canManageProp,
  tenantId,
}: {
  canManage?: boolean;
  tenantId: string;
}) {
  const platformAuth = usePlatformAuth();
  const canManage = canManageProp ?? platformAuth.canManage;
  const [tenant, setTenant] = useState<PlatformTenantDetail | null>(null);
  const [members, setMembers] = useState<PlatformMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const [tenantResult, memberResult] = await Promise.all([
        getPlatformTenant(tenantId, { signal }),
        getPlatformTenantMembers(tenantId, { signal }),
      ]);
      setTenant(tenantResult);
      setMembers(memberResult);
    } catch (fetchError) {
      if (isAbortError(fetchError)) {
        return;
      }

      setError(getErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [tenantId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);

    return () => controller.abort();
  }, [fetchData, reloadKey]);

  if (isLoading) return <TenantDetailSkeleton />;
  if (error) return <ErrorState message={error} retry={fetchData} />;
  if (!tenant) {
    return (
      <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)] shadow-soft">
        Tenant detail is unavailable.
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      {!canManage ? <ReadOnlyNotice /> : null}
      <TenantProfileCard
        canManage={canManage}
        onUpdated={setTenant}
        tenant={tenant}
      />
      <MembersSection
        canManage={canManage}
        members={members}
        onChanged={refetch}
        tenantId={tenantId}
      />
    </div>
  );
}

function TenantProfileCard({
  canManage,
  tenant,
  onUpdated,
}: {
  canManage: boolean;
  tenant: PlatformTenantDetail;
  onUpdated: (tenant: PlatformTenantDetail) => void;
}) {
  const [name, setName] = useState(tenant.name);
  const [type, setType] = useState<PlatformTenantType>(tenant.type);
  const [status, setStatus] = useState<PlatformTenantStatus>(tenant.status);
  const [errors, setErrors] = useState<TenantFormErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [pendingUpdate, setPendingUpdate] =
    useState<TenantUpdatePayload | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setName(tenant.name);
    setType(tenant.type);
    setStatus(tenant.status);
    setErrors({});
  }, [tenant]);

  function validate() {
    const nextErrors: TenantFormErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      nextErrors.name = "Tenant name is required.";
    } else if (trimmedName.length > TENANT_NAME_MAX_LENGTH) {
      nextErrors.name = `Tenant name must be ${TENANT_NAME_MAX_LENGTH} characters or less.`;
    }

    if (!TENANT_TYPES.includes(type)) {
      nextErrors.type = "Select a valid tenant type.";
    }

    if (!TENANT_STATUSES.includes(status)) {
      nextErrors.status = "Select a valid tenant status.";
    }

    setErrors(nextErrors);

    if (nextErrors.name) {
      nameRef.current?.focus();
    } else if (nextErrors.type) {
      typeRef.current?.focus();
    } else if (nextErrors.status) {
      statusRef.current?.focus();
    }

    if (Object.keys(nextErrors).length) {
      return null;
    }

    return {
      name: trimmedName,
      type,
      status,
    };
  }

  async function save(payload: TenantUpdatePayload) {
    if (isPending) return;

    setIsPending(true);
    try {
      const updatedTenant = await updatePlatformTenant(tenant.id, payload);
      toastSuccess("Tenant updated.");
      onUpdated(updatedTenant);
      setPendingUpdate(null);
    } catch (error) {
      toastError(getPlatformMutationMessage(error, "tenant"));
    } finally {
      setIsPending(false);
    }
  }

  function submit() {
    if (isPending) return;

    const payload = validate();
    if (!payload) return;

    if (tenant.status !== "DISABLED" && payload.status === "DISABLED") {
      setPendingUpdate(payload);
      return;
    }

    void save(payload);
  }

  return (
    <section className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {tenant.name}
            </h2>
            <StatusBadge status={tenant.status} />
          </div>
          <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
            {tenant.slug}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)]">
          <Users className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
          {tenant.membersCount} members
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <ReadOnlyField label="Tenant name" value={tenant.name} />
          <ReadOnlyField label="Slug" mono value={tenant.slug} />
          <ReadOnlyField label="Type" value={tenant.type} />
          <ReadOnlyField label="Status" value={<StatusBadge status={tenant.status} />} />
          <ReadOnlyField label="Created" value={formatDateTime(tenant.createdAt)} />
          <ReadOnlyField label="Updated" value={formatDateTime(tenant.updatedAt)} />
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Metric label="Members" value={tenant.membersCount} />
          <Metric label="Owners" value={tenant.ownersCount} />
          <Metric label="Orders" value={tenant.ordersCount} />
          <Metric label="Shipments" value={tenant.shipmentsCount} />
          <Metric label="Carrier accounts" value={tenant.carrierAccountsCount} />
        </div>

        {canManage ? (
          <div className="grid gap-4 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--brand)]" aria-hidden />
              Edit tenant profile
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <TextInput
                error={errors.name}
                inputRef={nameRef}
                label="Name"
                maxLength={TENANT_NAME_MAX_LENGTH}
                onChange={setName}
                value={name}
              />
              <SelectField
                error={errors.type}
                label="Type"
                onChange={(value) => setType(value as PlatformTenantType)}
                options={TENANT_TYPES}
                refObject={typeRef}
                value={type}
              />
              <SelectField
                error={errors.status}
                label="Status"
                onChange={(value) => setStatus(value as PlatformTenantStatus)}
                options={TENANT_STATUSES}
                refObject={statusRef}
                value={status}
              />
            </div>
            {status === "DISABLED" && tenant.status !== "DISABLED" ? (
              <div className="flex gap-2 rounded-sm border border-[#fcd34d] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning-text)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Disabling a tenant can block tenant users from normal operations.
                Confirmation is required before this change is saved.
              </div>
            ) : null}
            <div className="flex justify-end">
              <button
                aria-label="Save tenant profile changes"
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                disabled={isPending}
                onClick={submit}
                type="button"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Save changes
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {pendingUpdate ? (
        <ConfirmationModal
          confirmLabel="Disable tenant"
          description="This tenant will be set to DISABLED. Tenant users may lose operational access until it is re-enabled."
          onCancel={() => setPendingUpdate(null)}
          onConfirm={() => save(pendingUpdate)}
          requireCheckbox="I understand this tenant will be disabled."
          title="Disable tenant?"
          variant="danger"
        />
      ) : null}
    </section>
  );
}

function MembersSection({
  canManage,
  members,
  tenantId,
  onChanged,
}: {
  canManage: boolean;
  members: PlatformMember[];
  tenantId: string;
  onChanged: () => void;
}) {
  return (
    <section className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Members
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Tenant-scoped users and roles.
          </p>
        </div>
        {canManage ? (
          <AddMemberForm onCreated={onChanged} tenantId={tenantId} />
        ) : (
          <span className="rounded-full bg-[var(--brand-light)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-dark)]">
            Read-only support view
          </span>
        )}
      </div>

      {!canManage ? (
        <div className="border-b border-[var(--border)] px-4 py-3">
          <ReadOnlyNotice compact />
        </div>
      ) : null}

      {members.length === 0 ? (
        <div className="m-4 rounded-sm border border-dashed border-[var(--border)] bg-[var(--bg-surface2)] p-6 text-center">
          <Users
            className="mx-auto h-8 w-8 text-[var(--text-muted)]"
            aria-hidden
          />
          <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
            No members found.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Add a tenant owner or admin before onboarding this tenant.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[var(--bg-surface2)]">
                {[
                  "Email",
                  "Name",
                  "Role",
                  "Membership",
                  "User status",
                  "Created",
                  "Updated",
                  ...(canManage ? ["Actions"] : []),
                ].map((header) => (
                  <th
                    className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]"
                    key={header}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <MemberRow
                  canManage={canManage}
                  key={member.membershipId}
                  member={member}
                  onUpdated={onChanged}
                  tenantId={tenantId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddMemberForm({
  tenantId,
  onCreated,
}: {
  tenantId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PlatformTenantRole>("VIEWER");
  const [membershipStatus, setMembershipStatus] =
    useState<Extract<PlatformMembershipStatus, "ACTIVE" | "DISABLED">>("ACTIVE");
  const [errors, setErrors] = useState<MemberFormErrors>({});
  const [isPending, setIsPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);

  function resetForm() {
    setEmail("");
    setName("");
    setPassword("");
    setRole("VIEWER");
    setMembershipStatus("ACTIVE");
    setErrors({});
  }

  function close() {
    if (isPending) return;
    resetForm();
    setOpen(false);
  }

  function validate() {
    const nextErrors: MemberFormErrors = {};
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (trimmedName.length > MEMBER_NAME_MAX_LENGTH) {
      nextErrors.name = `Name must be ${MEMBER_NAME_MAX_LENGTH} characters or less.`;
    }

    if (password) {
      if (
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
      ) {
        nextErrors.password = `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`;
      }
    }

    if (!TENANT_ROLES.includes(role)) {
      nextErrors.role = "Select a valid role.";
    }

    if (!EDITABLE_MEMBER_STATUSES.includes(membershipStatus)) {
      nextErrors.membershipStatus = "Select a valid membership status.";
    }

    setErrors(nextErrors);

    if (nextErrors.email) {
      emailRef.current?.focus();
    } else if (nextErrors.name) {
      nameRef.current?.focus();
    } else if (nextErrors.password) {
      passwordRef.current?.focus();
    } else if (nextErrors.role) {
      roleRef.current?.focus();
    } else if (nextErrors.membershipStatus) {
      statusRef.current?.focus();
    }

    if (Object.keys(nextErrors).length) {
      return null;
    }

    return {
      email: normalizedEmail,
      name: trimmedName || undefined,
      password: password || undefined,
      role,
      membershipStatus,
    };
  }

  async function submit() {
    if (isPending) return;

    const payload = validate();
    if (!payload) return;

    setIsPending(true);
    try {
      await createPlatformTenantMember(tenantId, payload);
      toastSuccess("Member added.");
      resetForm();
      setOpen(false);
      onCreated();
    } catch (error) {
      toastError(getPlatformMutationMessage(error, "member-create"));
      setPassword("");
      passwordRef.current?.focus();
    } finally {
      setIsPending(false);
    }
  }

  if (!open) {
    return (
      <button
        aria-label="Add tenant member"
        className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-2.5 text-xs font-medium text-white"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Plus className="h-3 w-3" aria-hidden />
        Add member
      </button>
    );
  }

  return (
    <div className="w-full rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3 md:max-w-[760px]">
      <div className="mb-3 rounded-sm border border-[var(--brand-mid)] bg-[var(--brand-light)] p-3 text-xs text-[var(--brand-dark)]">
        Existing users are attached to this tenant. New users are created only
        when a password is provided; if the server cannot find the email, it
        will request a password.
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <TextInput
          autoComplete="off"
          error={errors.email}
          inputRef={emailRef}
          label="Email"
          onChange={setEmail}
          type="email"
          value={email}
        />
        <TextInput
          autoComplete="off"
          error={errors.name}
          inputRef={nameRef}
          label="Name"
          maxLength={MEMBER_NAME_MAX_LENGTH}
          onChange={setName}
          value={name}
        />
        <TextInput
          autoComplete="new-password"
          error={errors.password}
          inputRef={passwordRef}
          label="Password if new"
          onChange={setPassword}
          type="password"
          value={password}
        />
        <SelectField
          error={errors.role}
          label="Role"
          onChange={(value) => setRole(value as PlatformTenantRole)}
          options={TENANT_ROLES}
          refObject={roleRef}
          value={role}
        />
        <SelectField
          error={errors.membershipStatus}
          label="Status"
          onChange={(value) =>
            setMembershipStatus(
              value as Extract<PlatformMembershipStatus, "ACTIVE" | "DISABLED">,
            )
          }
          options={EDITABLE_MEMBER_STATUSES}
          refObject={statusRef}
          value={membershipStatus}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs"
          disabled={isPending}
          onClick={close}
          type="button"
        >
          Cancel
        </button>
        <button
          aria-label="Submit add tenant member form"
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isPending}
          onClick={submit}
          type="button"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : null}
          Add
        </button>
      </div>
    </div>
  );
}

function MemberRow({
  canManage,
  tenantId,
  member,
  onUpdated,
}: {
  canManage: boolean;
  tenantId: string;
  member: PlatformMember;
  onUpdated: () => void;
}) {
  const [role, setRole] = useState<PlatformTenantRole>(member.role);
  const [status, setStatus] =
    useState<Extract<PlatformMembershipStatus, "ACTIVE" | "DISABLED">>(
      member.membershipStatus === "DISABLED" ? "DISABLED" : "ACTIVE",
    );
  const [isPending, setIsPending] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<MemberUpdatePayload | null>(
    null,
  );
  const hasChanges =
    role !== member.role ||
    status !==
      (member.membershipStatus === "DISABLED" ? "DISABLED" : "ACTIVE");

  useEffect(() => {
    setRole(member.role);
    setStatus(member.membershipStatus === "DISABLED" ? "DISABLED" : "ACTIVE");
    setPendingUpdate(null);
  }, [member]);

  async function save(payload: MemberUpdatePayload) {
    if (isPending) return;

    setIsPending(true);
    try {
      await updatePlatformTenantMember(tenantId, member.membershipId, payload);
      toastSuccess("Member updated.");
      onUpdated();
      setPendingUpdate(null);
    } catch (error) {
      toastError(getPlatformMutationMessage(error, "member-update"));
    } finally {
      setIsPending(false);
    }
  }

  function requestSave() {
    if (isPending || !hasChanges) return;
    setPendingUpdate({ role, membershipStatus: status });
  }

  return (
    <>
      <tr className="border-b border-[var(--border)] last:border-b-0">
        <td className="px-3.5 py-3 text-xs font-medium">{member.email}</td>
        <td className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
          {member.name ?? "-"}
        </td>
        <td className="px-3.5 py-3">
          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={member.role} />
              <select
                aria-label={`Role for ${member.email}`}
                className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 text-xs"
                disabled={isPending}
                onChange={(event) =>
                  setRole(event.target.value as PlatformTenantRole)
                }
                value={role}
              >
                {TENANT_ROLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <RoleBadge role={member.role} />
          )}
        </td>
        <td className="px-3.5 py-3">
          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={member.membershipStatus} />
              <select
                aria-label={`Membership status for ${member.email}`}
                className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 text-xs"
                disabled={isPending}
                onChange={(event) =>
                  setStatus(
                    event.target.value as Extract<
                      PlatformMembershipStatus,
                      "ACTIVE" | "DISABLED"
                    >,
                  )
                }
                value={status}
              >
                {EDITABLE_MEMBER_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <StatusBadge status={member.membershipStatus} />
          )}
        </td>
        <td className="px-3.5 py-3">
          <StatusBadge status={member.userStatus} />
        </td>
        <td className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
          {formatDateTime(member.createdAt)}
        </td>
        <td className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
          {formatDateTime(member.updatedAt)}
        </td>
        {canManage ? (
          <td className="px-3.5 py-3">
            <button
              aria-label={`Save member changes for ${member.email}`}
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending || !hasChanges}
              onClick={requestSave}
              type="button"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : null}
              Save
            </button>
          </td>
        ) : null}
      </tr>

      {pendingUpdate ? (
        <tr>
          <td className="p-0" colSpan={8}>
            <ConfirmationModal
              confirmLabel="Save member changes"
              description={`This will update ${member.email} to role ${pendingUpdate.role} with membership status ${pendingUpdate.membershipStatus}.`}
              onCancel={() => setPendingUpdate(null)}
              onConfirm={() => save(pendingUpdate)}
              title="Update member?"
              variant="default"
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ReadOnlyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex gap-2 rounded-sm border border-[var(--brand-mid)] bg-[var(--brand-light)] text-xs text-[var(--brand-dark)] ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>Platform Support read-only access — editing is disabled.</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
      <p className="text-[10px] font-medium text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
      <p className="text-[10px] font-medium text-[var(--text-muted)]">
        {label}
      </p>
      <div
        className={`mt-1 text-xs font-semibold text-[var(--text-primary)] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  error,
  inputRef,
  type = "text",
  maxLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
}) {
  const id = fieldId(label);
  const errorId = `${id}-error`;

  return (
    <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
      {label}
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        ref={inputRef}
        type={type}
        value={value}
      />
      {error ? (
        <span className="text-[11px] font-medium text-[var(--danger)]" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  refObject,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
  refObject: RefObject<HTMLSelectElement | null>;
}) {
  const id = fieldId(label);
  const errorId = `${id}-error`;

  return (
    <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
      {label}
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
        onChange={(event) => onChange(event.target.value)}
        ref={refObject}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-[11px] font-medium text-[var(--danger)]" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TenantDetailSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
        <div className="h-16 animate-pulse border-b border-[var(--border)] bg-[var(--bg-surface2)]" />
        <div className="grid gap-3 p-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="h-20 animate-pulse rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)]"
              key={index}
            />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
        <div className="h-14 animate-pulse border-b border-[var(--border)] bg-[var(--bg-surface2)]" />
        <div className="grid gap-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="h-11 animate-pulse rounded-sm bg-[var(--bg-surface2)]"
              key={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function fieldId(label: string) {
  return `platform-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getPlatformMutationMessage(
  error: unknown,
  context: "tenant" | "member-create" | "member-update",
) {
  if (!(error instanceof ApiError)) {
    return getErrorMessage(error);
  }

  const message = error.message.toLowerCase();

  if (error.status === 400 || error.code === "VALIDATION_ERROR") {
    if (message.includes("password is required")) {
      return "Password is required when creating a new user.";
    }

    if (message.includes("password") && message.includes("length")) {
      return "Password must meet the password length policy.";
    }

    if (message.includes("email")) {
      return "Enter a valid email address.";
    }

    return "Please check the form fields and try again.";
  }

  if (error.status === 409) {
    if (context === "member-update") {
      return "This member update conflicts with tenant safety rules. Keep at least one active owner.";
    }

    if (context === "member-create") {
      return "This user is already attached to the tenant or conflicts with an existing membership.";
    }

    return "This tenant update conflicts with existing data. Please refresh and try again.";
  }

  return getErrorMessage(error);
}
