import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/shared/errors";

export type ApiMeta = Record<string, unknown>;

export type ApiSuccessResponse<TData> = {
  success: true;
  data: TData;
  meta?: ApiMeta;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
  meta?: ApiMeta;
};

export function success<TData>(
  data: TData,
  meta?: ApiMeta,
): ApiSuccessResponse<TData> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export function failure(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  meta?: ApiMeta,
): ApiErrorResponse {
  return {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
    ...(meta ? { meta } : {}),
  };
}

export function ok<TData>(data: TData, meta?: ApiMeta) {
  return NextResponse.json(success(data, meta));
}

export function error(
  code: ApiErrorCode,
  message: string,
  status = 500,
  details?: unknown,
  meta?: ApiMeta,
) {
  return NextResponse.json(failure(code, message, details, meta), { status });
}
