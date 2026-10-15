import { Platform } from "react-native";

type MapPreviewCenter =
  | { latitude: number; longitude: number }
  | { query: string };

type MapPreviewSource = {
  uri: string;
  headers: Record<string, string>;
};

/**
 * iOS: preview de mapa vía la función `map-preview` de Supabase (la key de
 * Google queda en el servidor). Devuelve null fuera de iOS o sin sesión/config,
 * así que Android sigue usando la URL directa de Google.
 */
export const getIosMapPreviewSource = (
  center: MapPreviewCenter,
  accessToken: string | null | undefined,
  size: { width: number; height: number },
): MapPreviewSource | null => {
  if (Platform.OS !== "ios") return null;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey || !accessToken) return null;

  const params = new URLSearchParams({
    width: String(size.width),
    height: String(size.height),
    zoom: "15",
  });
  if ("query" in center) {
    const query = center.query.trim();
    if (!query) return null;
    params.set("q", query);
  } else {
    params.set("lat", String(center.latitude));
    params.set("lng", String(center.longitude));
  }

  return {
    uri: `${supabaseUrl.replace(/\/$/, "")}/functions/v1/map-preview?${params.toString()}`,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  };
};
