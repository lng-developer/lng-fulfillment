export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type ApiFailureEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccessEnvelope<TData, TMeta = unknown> = {
  success: true;
  data: TData;
  meta?: TMeta;
};

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as
    | T
    | ApiFailureEnvelope
    | null;
  const isObjectBody = typeof body === "object" && body !== null;
  const failedEnvelope =
    isObjectBody && "success" in body && body.success === false;

  if (response.status === 401) {
    redirectToExpiredLogin();
    throw new ApiError(401, "UNAUTHORIZED", "Session expired");
  }

  if (!response.ok || !isObjectBody || failedEnvelope) {
    const errorBody = isObjectBody && "error" in body ? body : null;
    throw new ApiError(
      response.status,
      errorBody?.error.code ?? "REQUEST_FAILED",
      errorBody?.error.message ?? "Request failed",
    );
  }

  return body as T;
}

export function unwrapData<TData, TMeta = unknown>(
  envelope: ApiSuccessEnvelope<TData, TMeta>,
): TData {
  return envelope.data;
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }

  if (error.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (error.status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (error.status === 404) {
    return "The requested resource was not found.";
  }

  if (error.status === 409) {
    return "A conflict occurred. Please refresh and try again.";
  }

  if (error.status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (error.status >= 500) {
    return "A server error occurred. Please try again later.";
  }

  return "Something went wrong. Please try again.";
}

export function redirectToExpiredLogin() {
  if (typeof window === "undefined") {
    return;
  }

  void fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  }).finally(() => {
    window.location.replace("/login?reason=session_expired");
  });
}
