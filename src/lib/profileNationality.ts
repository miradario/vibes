import { supabase } from "./supabase";
import { isCountryCode } from "../constants/countries";

export const saveProfileNationality = async (userId: string, code: string | null) => {
  if (!userId || (code !== null && !isCountryCode(code))) throw new Error("Nacionalidad inválida");
  const { data, error } = await supabase.from("profiles")
    .update({ nationality_code: code }).eq("id", userId)
    .select("id, nationality_code").single();
  if (error) throw error;
  if (!data) throw new Error("No se pudo guardar la nacionalidad");
  return data.nationality_code as string | null;
};
