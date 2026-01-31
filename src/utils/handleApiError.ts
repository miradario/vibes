import type { ToastShowParams } from "react-native-toast-message";

import { normalizeAxiosError } from "../api/http/errors";
import { showToast } from "./toast";

export type ApiErrorPayload = {
  status?: number;
  message: string;
};

export type HandleApiErrorOptions = {
  onToast?: (message: string) => void;
  showToast?: boolean;
  toastTitle?: string;
  fallbackMessage?: string;
  toastOptions?: Partial<ToastShowParams>;
};

const resolveOptions = (options?: unknown): HandleApiErrorOptions => {
  if (!options || typeof options !== "object") return {};
  const candidate = options as HandleApiErrorOptions;

  if (
    "onToast" in candidate ||
    "fallbackMessage" in candidate ||
    "showToast" in candidate ||
    "toastOptions" in candidate ||
    "toastTitle" in candidate
  ) {
    return candidate;
  }

  return {};
};

export const handleApiError = (
  error: unknown,
  options?: HandleApiErrorOptions
): ApiErrorPayload => {
  const resolvedOptions = resolveOptions(options);
  const normalized = normalizeAxiosError(error);
  const fallbackMessage = resolvedOptions.fallbackMessage ?? "Unknown error";
  const message = normalized.message?.trim()
    ? normalized.message
    : fallbackMessage;
  const payload: ApiErrorPayload = {
    status: normalized.status,
    message,
  };

  console.log(payload);

  if (resolvedOptions.onToast) {
    resolvedOptions.onToast(message);
  } else if (resolvedOptions.showToast ?? true) {
    const title = resolvedOptions.toastTitle?.trim();
    const toastPayload: Partial<ToastShowParams> = {
      text1: title || undefined,
      text2: title ? message : undefined,
      ...resolvedOptions.toastOptions,
    };

    showToast(message, toastPayload);
  }

  return payload;
};
