import axios from "axios";

export type ApiError = Error & {
  status?: number;
  code?: string;
  details?: unknown;
};

const getBackendMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;

  if ("error" in data && (data as { error?: unknown }).error != null) {
    return String((data as { error?: unknown }).error);
  }

  if ("message" in data && (data as { message?: unknown }).message != null) {
    return String((data as { message?: unknown }).message);
  }

  return undefined;
};

export const normalizeAxiosError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const backendMessage = getBackendMessage(data);
    const message = backendMessage || error.message || "Request failed";

    const normalized = new Error(message) as ApiError;
    normalized.status = status;
    normalized.code = error.code;
    normalized.details = data;

    return normalized;
  }

  if (error instanceof Error) {
    return error as ApiError;
  }

  return new Error("Unknown error") as ApiError;
};
