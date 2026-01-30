import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseOptions = {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
} as any;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

const authAny = supabase.auth as any;
if (typeof authAny.getSession !== "function") {
  authAny.getSession = async () => ({
    data: { session: authAny.session?.() ?? null },
    error: null,
  });
}
