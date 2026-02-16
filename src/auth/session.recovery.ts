import { supabase } from "../lib/supabase";

const INVALID_REFRESH_TOKEN_PATTERNS = [
  "invalid refresh token",
  "refresh token not found",
];

const hasInvalidRefreshToken = (error: unknown) => {
  if (!error) return false;
  const message =
    typeof error === "string"
      ? error
      : typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  const normalized = message.toLowerCase();
  return INVALID_REFRESH_TOKEN_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
};

export const recoverInvalidRefreshToken = async (error: unknown) => {
  if (!hasInvalidRefreshToken(error)) return false;

  try {
    const auth = supabase.auth as any;
    if (typeof auth.signOut === "function") {
      await auth.signOut({ scope: "local" });
    } else {
      await supabase.auth.signOut();
    }
    console.warn("Auth recovery: cleared invalid refresh token from local session.");
  } catch (clearError) {
    console.warn("Auth recovery: failed to clear local session.", clearError);
  }

  return true;
};
