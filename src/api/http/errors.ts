import axios from "axios";

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
};

export const normalizeAxiosError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
      (typeof data === "object" && data && "message" in data &&
        String((data as { message?: string }).message)) ||
      error.message ||
      "Request failed";

    return {
      message,
      status,
      code: error.code,
      details: data,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unknown error" };
};
