import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthChangeEvent = string;

export const signInWithPassword = async (email: string, password: string) => {
  const auth = supabase.auth as any;
  if (typeof auth.signInWithPassword === "function") {
    return auth.signInWithPassword({ email, password });
  }
  return auth.signIn({ email, password });
};

export const signUp = async (email: string, password: string) => {
  const auth = supabase.auth as any;
  if (typeof auth.signUp === "function") {
    return auth.signUp({ email, password });
  }
  return auth.signIn({ email, password });
};

export const signOut = async () => supabase.auth.signOut();

export const getSession = async (): Promise<Session | null> => {
  const auth = supabase.auth as any;
  if (typeof auth.getSession === "function") {
    const { data, error } = await auth.getSession();
    if (error) {
      return null;
    }
    return data.session ?? null;
  }

  return auth.session() ?? null;
};

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};
