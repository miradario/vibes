import React, { useEffect } from "react";

/** Keeps the home gates unblocked without auto-opening the profile questions flow. */
export default function FirstHomePreferencesGate({
  onReady,
}: {
  userId: string;
  onReady?: () => void;
}) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}
