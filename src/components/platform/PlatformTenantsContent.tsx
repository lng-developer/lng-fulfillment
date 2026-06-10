"use client";

import { Building2, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ForwardedRef,
} from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, getErrorMessage } from "@/lib/api/base";
import {
  createPlatformTenant,
  getPlatformTenants,
} from "@/lib/api/platform";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  PlatformPagination,
  PlatformTenantDetail,
  PlatformTenantStatus,
  PlatformTenantSummary,
  PlatformTenantType,
} from "@/types/platform";
import { usePlatformAuth } from "./PlatformAuthContext";

type PlatformTenantsInitialData = {
  tenants: PlatformTenantSummary[];
  pagination: PlatformPagination;
};

export function PlatformTenantsContent({
  canManage: canManageProp,
  initialData,
}: {
  canManage?: boolean;
  initialData?: PlatformTenantsInitialData;
}) {
  const platformAuth = usePlatformAuth();
  const canManage = canManageProp ?? platformAuth.canManage;
  const router = useRouter();
  const skipInitialFetchRef = useRef(Boolean(initialData));
  const [tenants, setTenants] = useState<PlatformTenantSummary[]>(
    () => initialData?.tenants ?? [],
  );
  const [pagination, setPagination] = useState<PlatformPagination>({
    page: initialData?.pagination.page ?? 1,
    pageSize: initialData?.pagination.pageSize ?? 20,
    totalItems: initialData?.pagination.totalItems ?? 0,
    totalPages: initialData?.pagination.totalPages ?? 0,
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlatformTenantStatus | "">("");
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchTenants = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPlatformTenants({
        page,
        pageSize: 20,
        search,
        status,
      }, { signal });
      setTenants(result.data);
      setPagination(result.pagination);
    } catch (fetchError) {
      if (isAbortError(fetchError)) {
        return;
      }

      setTenants([]);
      setError(getErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [page, search, status]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();
    void fetchTenants(controller.signal);

    return () => controller.abort();
  }, [fetchTenants, reloadKey]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden
          />
          <input
            className="h-9 w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] pl-9 pr-3 text-xs text-[var(--text-primary)] shadow-soft"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search tenant name or slug"
            type="search"
            value={searchInput}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft"
            onChange={(event) => {
              setStatus(event.target.value as PlatformTenantStatus | "");
              setPage(1);
            }}
            value={status}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>
          {canManage ? (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
              onClick={() => setShowCreate((value) => !value)}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create tenant
            </button>
          ) : null}
        </div>
      </div>

      {canManage && showCreate ? (
        <CreateTenantForm
          onCancel={() => setShowCreate(false)}
          onCreated={(tenant) => {
            setShowCreate(false);
            setReloadKey((value) => value + 1);
            router.push(`/platform/tenants/${tenant.id}`);
          }}
        />
      ) : null}

      {isLoading ? <LoadingSkeleton rows={8} /> : null}
      {!isLoading && error ? (
        <ErrorState message={error} retry={fetchTenants} />
      ) : null}
      {!isLoading && !error ? (
        <section className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
          {tenants.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[var(--bg-surface2)]">
                    {["Tenant", "Type", "Status", "Owners", "Members", "Created"].map(
                      (header) => (
                        <th
                          className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]"
                          key={header}
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-surface2)]"
                      key={tenant.id}
                    >
                      <td className="px-3.5 py-3">
                        <Link
                          className="font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]"
                          href={`/platform/tenants/${tenant.id}`}
                        >
                          {tenant.name}
                        </Link>
                        <p className="font-mono text-[10px] text-[var(--text-muted)]">
                          {tenant.slug}
                        </p>
                      </td>
                      <td className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
                        {tenant.type}
                      </td>
                      <td className="px-3.5 py-3">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
                        {tenant.ownersCount}
                      </td>
                      <td className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
                        {tenant.membersCount}
                      </td>
                      <td className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
                        {formatDate(tenant.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description={
                canManage
                  ? "Create a tenant to onboard a customer."
                  : "No tenants are available for your support view."
              }
              heading="No tenants found"
              icon={<Building2 className="h-6 w-6" aria-hidden />}
            />
          )}
          {tenants.length ? (
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3.5 py-3 text-xs text-[var(--text-muted)]">
              <span>
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ·{" "}
                {pagination.totalItems} tenants
              </span>
              <div className="flex gap-2">
                <button
                  className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage((value) =>
                      Math.min(Math.max(pagination.totalPages, 1), value + 1),
                    )
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const TENANT_NAME_MAX_LENGTH = 120;
const TENANT_SLUG_MAX_LENGTH = 80;
const OWNER_NAME_MAX_LENGTH = 120;
const OWNER_EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 256;
const TENANT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CreateTenantField =
  | "name"
  | "slug"
  | "type"
  | "status"
  | "ownerEmail"
  | "ownerName"
  | "ownerPassword";

type CreateTenantErrors = Partial<Record<CreateTenantField | "form", string>>;

function CreateTenantForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (tenant: PlatformTenantDetail) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<PlatformTenantType>("CLIENT");
  const [status, setStatus] = useState<PlatformTenantStatus>("ACTIVE");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [errors, setErrors] = useState<CreateTenantErrors>({});
  const [isPending, setIsPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const ownerEmailRef = useRef<HTMLInputElement>(null);
  const ownerNameRef = useRef<HTMLInputElement>(null);
  const ownerPasswordRef = useRef<HTMLInputElement>(null);

  function focusFirstError(nextErrors: CreateTenantErrors) {
    const firstField = ([
      "name",
      "slug",
      "type",
      "status",
      "ownerEmail",
      "ownerName",
      "ownerPassword",
    ] as CreateTenantField[]).find((field) => nextErrors[field]);

    if (firstField) {
      getFieldRef(firstField)?.focus();
    }
  }

  function getFieldRef(field: CreateTenantField) {
    if (field === "name") return nameRef.current;
    if (field === "slug") return slugRef.current;
    if (field === "type") return typeRef.current;
    if (field === "status") return statusRef.current;
    if (field === "ownerEmail") return ownerEmailRef.current;
    if (field === "ownerName") return ownerNameRef.current;
    return ownerPasswordRef.current;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const validationErrors = validateCreateTenantForm({
      name,
      slug,
      type,
      status,
      ownerEmail,
      ownerName,
      ownerPassword,
    });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      focusFirstError(validationErrors);
      return;
    }

    setIsPending(true);
    setErrors({});
    try {
      const tenant = await createPlatformTenant({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        type,
        status,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerName: ownerName.trim() || undefined,
        ownerPassword: ownerPassword || undefined,
      });
      toastSuccess("Tenant created.");
      setName("");
      setSlug("");
      setType("CLIENT");
      setStatus("ACTIVE");
      setOwnerEmail("");
      setOwnerName("");
      setOwnerPassword("");
      onCreated(tenant);
    } catch (error) {
      const nextErrors = mapCreateTenantError(error);
      setErrors(nextErrors);
      setOwnerPassword("");
      toastError(nextErrors.form ?? "Tenant could not be created. Please review the form.");
      focusFirstError(nextErrors);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      autoComplete="off"
      className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft"
      noValidate
      onSubmit={submit}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Create tenant</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
            The owner email is attached as OWNER if that user already exists. If
            the email is new, the platform creates the owner user and requires a
            temporary password.
          </p>
        </div>
        <button
          className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium disabled:opacity-50"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
      {errors.form ? (
        <div
          className="mt-3 rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]"
          role="alert"
        >
          {errors.form}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Input
          disabled={isPending}
          error={errors.name}
          helper="Max 120 characters."
          label="Tenant name"
          onChange={(value) => {
            setName(value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          ref={nameRef}
          required
          value={name}
        />
        <Input
          disabled={isPending}
          error={errors.slug}
          helper={`Example: acme-store${slug.trim() ? ` | Preview: ${slug.trim().toLowerCase()}` : ""}`}
          label="Slug"
          onChange={(value) => {
            setSlug(value.toLowerCase());
            setErrors((current) => ({ ...current, slug: undefined }));
          }}
          ref={slugRef}
          required
          value={slug}
        />
        <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
          <span>Type <span className="text-[var(--danger)]">*</span></span>
          <select
            aria-invalid={Boolean(errors.type)}
            aria-describedby={errors.type ? "create-tenant-type-error" : undefined}
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs"
            disabled={isPending}
            onChange={(event) => {
              setType(event.target.value as PlatformTenantType);
              setErrors((current) => ({ ...current, type: undefined }));
            }}
            ref={typeRef}
            required
            value={type}
          >
            <option value="CLIENT">CLIENT</option>
            <option value="INTERNAL">INTERNAL</option>
            <option value="PARTNER">PARTNER</option>
          </select>
          {errors.type ? (
            <span className="text-[11px] text-[var(--danger)]" id="create-tenant-type-error">
              {errors.type}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
          <span>Status <span className="text-[var(--danger)]">*</span></span>
          <select
            aria-invalid={Boolean(errors.status)}
            aria-describedby={errors.status ? "create-tenant-status-error" : undefined}
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs"
            disabled={isPending}
            onChange={(event) => {
              setStatus(event.target.value as PlatformTenantStatus);
              setErrors((current) => ({ ...current, status: undefined }));
            }}
            ref={statusRef}
            required
            value={status}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>
          {errors.status ? (
            <span className="text-[11px] text-[var(--danger)]" id="create-tenant-status-error">
              {errors.status}
            </span>
          ) : null}
        </label>
        <Input
          disabled={isPending}
          error={errors.ownerEmail}
          helper="Existing users are attached. New users require a password."
          label="Owner email"
          onChange={(value) => {
            setOwnerEmail(value);
            setErrors((current) => ({ ...current, ownerEmail: undefined }));
          }}
          ref={ownerEmailRef}
          required
          type="email"
          value={ownerEmail}
        />
        <Input
          disabled={isPending}
          error={errors.ownerName}
          helper="Optional."
          label="Owner name"
          onChange={(value) => {
            setOwnerName(value);
            setErrors((current) => ({ ...current, ownerName: undefined }));
          }}
          ref={ownerNameRef}
          value={ownerName}
        />
        <Input
          disabled={isPending}
          error={errors.ownerPassword}
          helper="Required only when the owner email is not an existing user. 12-256 characters."
          label="Owner password if new user"
          onChange={(value) => {
            setOwnerPassword(value);
            setErrors((current) => ({ ...current, ownerPassword: undefined }));
          }}
          ref={ownerPasswordRef}
          type="password"
          value={ownerPassword}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          aria-label="Create tenant"
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isPending}
          type="submit"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Create tenant
        </button>
      </div>
    </form>
  );
}

const Input = forwardRef(function Input(
  {
    disabled = false,
    error,
    helper,
    label,
    value,
    onChange,
    required = false,
    type = "text",
  }: {
    disabled?: boolean;
    error?: string;
    helper?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    type?: string;
  },
  ref: ForwardedRef<HTMLInputElement>,
) {
  const inputId = `create-tenant-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const helperId = helper ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]" htmlFor={inputId}>
      <span>
        {label} {required ? <span className="text-[var(--danger)]">*</span> : null}
      </span>
      <input
        autoComplete={type === "password" ? "new-password" : undefined}
        aria-describedby={[helperId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={Boolean(error)}
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)] disabled:bg-[var(--bg-surface2)]"
        disabled={disabled}
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        ref={ref}
        required={required}
        type={type}
        value={value}
      />
      {helper ? (
        <span className="text-[11px] font-normal text-[var(--text-muted)]" id={helperId}>
          {helper}
        </span>
      ) : null}
      {error ? (
        <span className="text-[11px] font-normal text-[var(--danger)]" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
});

function validateCreateTenantForm(input: {
  name: string;
  slug: string;
  type: PlatformTenantType;
  status: PlatformTenantStatus;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
}): CreateTenantErrors {
  const nextErrors: CreateTenantErrors = {};
  const trimmedName = input.name.trim();
  const trimmedSlug = input.slug.trim().toLowerCase();
  const trimmedEmail = input.ownerEmail.trim().toLowerCase();
  const trimmedOwnerName = input.ownerName.trim();

  if (!trimmedName) {
    nextErrors.name = "Tenant name is required.";
  } else if (trimmedName.length > TENANT_NAME_MAX_LENGTH) {
    nextErrors.name = `Tenant name must be ${TENANT_NAME_MAX_LENGTH} characters or less.`;
  }

  if (!trimmedSlug) {
    nextErrors.slug = "Slug is required.";
  } else if (
    trimmedSlug.length > TENANT_SLUG_MAX_LENGTH ||
    !TENANT_SLUG_PATTERN.test(trimmedSlug)
  ) {
    nextErrors.slug = "Use lowercase letters, numbers, and dashes, like acme-store.";
  }

  if (!["CLIENT", "INTERNAL", "PARTNER"].includes(input.type)) {
    nextErrors.type = "Choose a tenant type.";
  }

  if (!["ACTIVE", "DISABLED"].includes(input.status)) {
    nextErrors.status = "Choose a tenant status.";
  }

  if (!trimmedEmail) {
    nextErrors.ownerEmail = "Owner email is required.";
  } else if (
    trimmedEmail.length > OWNER_EMAIL_MAX_LENGTH ||
    !EMAIL_PATTERN.test(trimmedEmail)
  ) {
    nextErrors.ownerEmail = "Enter a valid owner email.";
  }

  if (trimmedOwnerName.length > OWNER_NAME_MAX_LENGTH) {
    nextErrors.ownerName = `Owner name must be ${OWNER_NAME_MAX_LENGTH} characters or less.`;
  }

  if (
    input.ownerPassword &&
    (input.ownerPassword.length < PASSWORD_MIN_LENGTH ||
      input.ownerPassword.length > PASSWORD_MAX_LENGTH)
  ) {
    nextErrors.ownerPassword = `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`;
  }

  return nextErrors;
}

function mapCreateTenantError(error: unknown): CreateTenantErrors {
  if (error instanceof ApiError) {
    const safeMessage = error.message.toLowerCase();

    if (error.status === 409) {
      return {
        form: "Tenant could not be created because a matching tenant or owner membership already exists.",
        slug: "This slug may already be in use.",
      };
    }

    if (
      error.code === "VALIDATION_ERROR" &&
      safeMessage.includes("ownerpassword")
    ) {
      return {
        form: "The owner email appears to be new. Enter a temporary password to create the owner user.",
        ownerPassword: "Password is required for a new owner user.",
      };
    }

    if (error.code === "VALIDATION_ERROR" && safeMessage.includes("password")) {
      return {
        form: "Tenant could not be created. Please review the password field.",
        ownerPassword: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`,
      };
    }

    if (error.code === "VALIDATION_ERROR") {
      return {
        form: "Tenant could not be created. Please review the highlighted fields.",
      };
    }
  }

  return {
    form: getErrorMessage(error),
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
