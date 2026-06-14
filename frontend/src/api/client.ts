/**
 * Typed HTTP client for the call-booking API.
 *
 * The client is built with `openapi-fetch` against the `paths` generated from
 * the OpenAPI contract (`schema.ts`), so request/response shapes are checked at
 * compile time. The base URL comes from `config.ts` (the Prism mock in dev).
 *
 * `normalizeError` collapses the contract's distinct error bodies
 * (`ValidationError` / `NotFoundError` / `SlotConflictError`) into a single
 * `ApiError` the UI can branch on by `code`.
 */
import createClient from "openapi-fetch";
import { API_BASE_URL } from "../config";
import type { paths } from "./schema";
import type {
  NotFoundError,
  SlotConflictError,
  ValidationError,
} from "./types";

export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL });

/** Discriminating codes the UI branches on, plus a fallback. */
export type ApiErrorCode =
  | "validation_error"
  | "not_found"
  | "slot_conflict"
  | "unknown";

/** A non-2xx response normalized into a single, UI-friendly shape. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Field-level messages, present on `validation_error` responses. */
  readonly details?: string[];

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: string[],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** The union of error bodies the contract can return. */
type ErrorBody = ValidationError | NotFoundError | SlotConflictError;

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

const STATUS_FALLBACK: Record<number, ApiErrorCode> = {
  400: "validation_error",
  404: "not_found",
  409: "slot_conflict",
};

/**
 * Map a non-2xx error body (typically the `error` returned by an
 * `openapi-fetch` call, or a parsed response body) into an {@link ApiError}.
 * The body's own `code` is trusted when it is one the contract defines;
 * otherwise the HTTP status is used to infer one so callers always get a typed
 * error. A `message` on the body is preserved even when the code is inferred.
 */
export function normalizeError(body: unknown, status: number): ApiError {
  const fallbackCode = STATUS_FALLBACK[status] ?? "unknown";
  const obj = asObject(body);

  const rawCode = obj?.code;
  const code: ApiErrorCode =
    rawCode === "validation_error" ||
    rawCode === "not_found" ||
    rawCode === "slot_conflict"
      ? rawCode
      : fallbackCode;

  const message =
    typeof obj?.message === "string" && obj.message.length > 0
      ? obj.message
      : defaultMessage(code);

  const details =
    code === "validation_error"
      ? (obj as ErrorBody as ValidationError | undefined)?.details
      : undefined;

  return new ApiError(code, message, status, details);
}

function defaultMessage(code: ApiErrorCode): string {
  switch (code) {
    case "validation_error":
      return "The request was invalid.";
    case "not_found":
      return "The requested resource was not found.";
    case "slot_conflict":
      return "That time slot is no longer available.";
    default:
      return "An unexpected error occurred.";
  }
}
