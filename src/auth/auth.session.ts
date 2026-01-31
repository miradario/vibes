import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

let lastSession: Session | null = null;
let lastEvent: string | null = null;

export const initAuthStateListener = () => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    lastEvent = event;
    lastSession = session;
  });

  return data?.subscription ?? null;
};

export const getLastAuthSession = () => lastSession;

export const getLastAuthEvent = () => lastEvent;
