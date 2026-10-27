// Sugerencias de ubicación mientras se escribe (crear/editar evento).
// Usa la misma key de Google Maps que ya valida direcciones: primero Places
// Autocomplete (New); si esa API no está habilitada para la key, cae a la
// Geocoding API, que ya se usa hoy para "Validar ubicación".

export const LOCATION_SUGGESTION_MIN_CHARS = 3;
export const LOCATION_SUGGESTION_DEBOUNCE_MS = 300;
export const LOCATION_SUGGESTION_LIMIT = 5;

// Buenos Aires, para sesgar cuando no hay ubicación del usuario ni del perfil.
export const ARGENTINA_BIAS = { latitude: -34.6037, longitude: -58.3816, radiusMeters: 50000 };

export type LocationBias = { latitude: number; longitude: number; radiusMeters: number };

export type LocationSuggestion = {
  id: string;
  primaryText: string;
  secondaryText: string;
  placeId?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export type ResolvedLocation = { address: string; lat: number; lng: number };

type GoogleClient = { apiKey: string; headers: Record<string, string> };

export const normalizeLocationQuery = (value: string) => value.trim().replace(/\s+/g, " ");

export const shouldSearchLocation = (value: string) =>
  normalizeLocationQuery(value).length >= LOCATION_SUGGESTION_MIN_CHARS;

export const createPlacesSessionToken = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });

export const buildAutocompleteBody = (
  query: string,
  sessionToken: string,
  bias: LocationBias | null,
  regionCode = "ar",
) => ({
  input: normalizeLocationQuery(query),
  sessionToken,
  languageCode: "es",
  regionCode,
  includedRegionCodes: [regionCode],
  ...(bias
    ? {
        locationBias: {
          circle: {
            center: { latitude: bias.latitude, longitude: bias.longitude },
            radius: Math.min(Math.max(bias.radiusMeters, 1000), 50000),
          },
        },
      }
    : {}),
});

export const parseAutocompleteResponse = (data: any): LocationSuggestion[] => {
  const items = Array.isArray(data?.suggestions) ? data.suggestions : [];
  return items
    .map((item: any) => item?.placePrediction)
    .filter((prediction: any) => prediction?.placeId)
    .slice(0, LOCATION_SUGGESTION_LIMIT)
    .map((prediction: any) => {
      const primaryText =
        prediction.structuredFormat?.mainText?.text || prediction.text?.text || "";
      return {
        id: String(prediction.placeId),
        placeId: String(prediction.placeId),
        primaryText,
        secondaryText: prediction.structuredFormat?.secondaryText?.text || "",
        address: prediction.text?.text || primaryText,
      };
    })
    .filter((suggestion: LocationSuggestion) => suggestion.primaryText);
};

export const parseGeocodeResponse = (data: any): LocationSuggestion[] => {
  if (data?.status !== "OK" || !Array.isArray(data?.results)) return [];
  return data.results
    .filter((result: any) =>
      typeof result?.geometry?.location?.lat === "number" &&
      typeof result?.geometry?.location?.lng === "number" &&
      result?.formatted_address,
    )
    .slice(0, LOCATION_SUGGESTION_LIMIT)
    .map((result: any, index: number) => {
      const address = String(result.formatted_address);
      const [primaryText, ...rest] = address.split(", ");
      return {
        id: String(result.place_id || `${address}-${index}`),
        primaryText,
        secondaryText: rest.join(", "),
        address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      };
    });
};

export const isPlacesUnavailableResponse = (status: number, data: any) =>
  status === 403 ||
  data?.error?.status === "PERMISSION_DENIED" ||
  data?.error?.status === "UNAUTHENTICATED";

let placesUnavailable = false;

const fetchGeocodeSuggestions = async (
  query: string,
  client: GoogleClient,
  regionCode: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      normalizeLocationQuery(query),
    )}&language=es&region=${regionCode}&components=country:${regionCode.toUpperCase()}&key=${client.apiKey}`,
    { headers: client.headers, signal },
  );
  const data = await response.json();
  if (data?.status === "REQUEST_DENIED") throw new Error("geocode_denied");
  return parseGeocodeResponse(data);
};

export const fetchLocationSuggestions = async (params: {
  query: string;
  client: GoogleClient;
  bias: LocationBias | null;
  sessionToken: string;
  regionCode?: string;
  signal?: AbortSignal;
}): Promise<LocationSuggestion[]> => {
  const { query, client, bias, sessionToken, signal } = params;
  const regionCode = params.regionCode || "ar";
  if (!placesUnavailable) {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        ...client.headers,
        "Content-Type": "application/json",
        "X-Goog-Api-Key": client.apiKey,
      },
      body: JSON.stringify(buildAutocompleteBody(query, sessionToken, bias, regionCode)),
      signal,
    });
    const data = await response.json().catch(() => null);
    if (response.ok) return parseAutocompleteResponse(data);
    if (!isPlacesUnavailableResponse(response.status, data)) throw new Error("places_error");
    placesUnavailable = true;
  }
  return fetchGeocodeSuggestions(query, client, regionCode, signal);
};

export const resolveLocationSuggestion = async (params: {
  suggestion: LocationSuggestion;
  client: GoogleClient;
  sessionToken: string;
}): Promise<ResolvedLocation> => {
  const { suggestion, client, sessionToken } = params;
  if (typeof suggestion.lat === "number" && typeof suggestion.lng === "number") {
    return { address: suggestion.address || suggestion.primaryText, lat: suggestion.lat, lng: suggestion.lng };
  }
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(
      suggestion.placeId || suggestion.id,
    )}?languageCode=es&sessionToken=${encodeURIComponent(sessionToken)}`,
    {
      headers: {
        ...client.headers,
        "X-Goog-Api-Key": client.apiKey,
        "X-Goog-FieldMask": "location,formattedAddress,displayName",
      },
    },
  );
  const data = await response.json().catch(() => null);
  const lat = data?.location?.latitude;
  const lng = data?.location?.longitude;
  if (!response.ok || typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("place_details_error");
  }
  const name = data?.displayName?.text;
  const formatted = data?.formattedAddress || suggestion.address || suggestion.primaryText;
  const address = name && !String(formatted).startsWith(name) ? `${name}, ${formatted}` : formatted;
  return { address, lat, lng };
};

// Fallback sin key (geocoder nativo de expo-location): arma una etiqueta legible.
export const formatNativeAddress = (address: {
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
}) => {
  const street = [address.street, address.streetNumber].filter(Boolean).join(" ");
  const primaryText = street || address.name || address.district || address.city || "";
  const secondaryText = [address.district, address.city, address.region, address.country]
    .filter((part, index, list) => part && part !== primaryText && list.indexOf(part) === index)
    .join(", ");
  return { primaryText, secondaryText };
};

// País por defecto de las sugerencias: perfil → región del dispositivo → AR.
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  argentina: "ar", uruguay: "uy", chile: "cl", paraguay: "py", bolivia: "bo",
  brasil: "br", brazil: "br", peru: "pe", colombia: "co", venezuela: "ve",
  ecuador: "ec", mexico: "mx", espana: "es", spain: "es", "estados unidos": "us",
  "united states": "us", usa: "us", italia: "it", italy: "it", francia: "fr",
  france: "fr", alemania: "de", germany: "de", portugal: "pt", "reino unido": "gb",
  "united kingdom": "gb", canada: "ca", "costa rica": "cr", panama: "pa",
  guatemala: "gt", "republica dominicana": "do", cuba: "cu", "el salvador": "sv",
  honduras: "hn", nicaragua: "ni", "puerto rico": "pr", india: "in",
};

const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const countryToRegionCode = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = stripAccents(value.trim().toLowerCase());
  if (!cleaned) return null;
  if (/^[a-z]{2}$/.test(cleaned)) return cleaned;
  if (COUNTRY_NAME_TO_CODE[cleaned]) return COUNTRY_NAME_TO_CODE[cleaned];
  // location_label tipo "Palermo, Buenos Aires, Argentina": probar el último tramo.
  const last = cleaned.split(",").pop()?.trim();
  return last && last !== cleaned ? countryToRegionCode(last) : null;
};

export const localeToRegionCode = (locale: unknown): string | null => {
  if (typeof locale !== "string") return null;
  const match = locale.match(/[-_]([A-Za-z]{2})(?:[-_@.]|$)/);
  return match ? match[1].toLowerCase() : null;
};

export type SuggestionCountrySource = "profile" | "device" | "default";

export const resolveSuggestionCountry = (params: {
  profileCountry?: unknown;
  profileLocationLabel?: unknown;
  deviceLocale?: unknown;
}): { regionCode: string; source: SuggestionCountrySource } => {
  const fromProfile =
    countryToRegionCode(params.profileCountry) ?? countryToRegionCode(params.profileLocationLabel);
  if (fromProfile) return { regionCode: fromProfile, source: "profile" };
  const fromDevice = localeToRegionCode(params.deviceLocale);
  if (fromDevice) return { regionCode: fromDevice, source: "device" };
  return { regionCode: "ar", source: "default" };
};

export const getDeviceLocale = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || null;
  } catch {
    return null;
  }
};
