import type { Session, User } from "@supabase/supabase-js";

export type AuthSession = Session | null;
export type AuthUser = User | null;

export type LoginInput = {
  email: string;
  password: string;
};
