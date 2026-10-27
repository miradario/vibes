import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import * as ExpoLocation from "expo-location";
import { Text } from "./Typography";
import Icon from "./Icon";
import VibesLoader from "./VibesLoader";
import { vibesTheme } from "../src/theme/vibesTheme";
import {
  ARGENTINA_BIAS,
  LOCATION_SUGGESTION_DEBOUNCE_MS,
  LOCATION_SUGGESTION_LIMIT,
  createPlacesSessionToken,
  fetchLocationSuggestions,
  formatNativeAddress,
  normalizeLocationQuery,
  resolveLocationSuggestion,
  shouldSearchLocation,
  type LocationBias,
  type LocationSuggestion,
  type ResolvedLocation,
} from "../src/lib/locationSuggestions";

type Status = "idle" | "loading" | "ready" | "empty" | "error";

type Client = { apiKey: string | undefined; headers: Record<string, string> };

const loadBias = async (): Promise<LocationBias> => {
  try {
    const permission = await ExpoLocation.getForegroundPermissionsAsync();
    if (permission.status !== "granted") return ARGENTINA_BIAS;
    const position = await ExpoLocation.getLastKnownPositionAsync();
    if (!position) return ARGENTINA_BIAS;
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      radiusMeters: 30000,
    };
  } catch {
    return ARGENTINA_BIAS;
  }
};

const fetchNativeSuggestions = async (query: string): Promise<LocationSuggestion[]> => {
  const permission = await ExpoLocation.getForegroundPermissionsAsync();
  // Sin permiso no pedimos nada mientras escribe; queda "Validar ubicación".
  if (permission.status !== "granted") return [];
  const matches = (await ExpoLocation.geocodeAsync(query)).slice(0, 3);
  const results = await Promise.all(
    matches.map(async (match, index) => {
      const [address] = await ExpoLocation.reverseGeocodeAsync({
        latitude: match.latitude,
        longitude: match.longitude,
      }).catch(() => []);
      const label = address ? formatNativeAddress(address) : { primaryText: query, secondaryText: "" };
      const fullAddress = [label.primaryText, label.secondaryText].filter(Boolean).join(", ");
      return {
        id: `${match.latitude},${match.longitude},${index}`,
        primaryText: label.primaryText || query,
        secondaryText: label.secondaryText,
        address: fullAddress || query,
        lat: match.latitude,
        lng: match.longitude,
      };
    }),
  );
  return results.slice(0, LOCATION_SUGGESTION_LIMIT);
};

export const useLocationSuggestions = (query: string, enabled: boolean, client: Client) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [isResolving, setIsResolving] = useState(false);
  const sessionTokenRef = useRef(createPlacesSessionToken());
  const biasRef = useRef<LocationBias | null>(null);
  const requestIdRef = useRef(0);
  const { apiKey, headers } = client;
  const headersKey = JSON.stringify(headers);

  useEffect(() => {
    const normalized = normalizeLocationQuery(query);
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!enabled || !shouldSearchLocation(normalized)) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    setStatus("loading");
    const timer = setTimeout(async () => {
      try {
        if (!biasRef.current) biasRef.current = await loadBias();
        const next = apiKey
          ? await fetchLocationSuggestions({
              query: normalized,
              client: { apiKey, headers },
              bias: biasRef.current,
              sessionToken: sessionTokenRef.current,
              signal: controller?.signal,
            })
          : await fetchNativeSuggestions(normalized);
        if (requestId !== requestIdRef.current) return;
        setSuggestions(next);
        setStatus(next.length ? "ready" : "empty");
      } catch (error: any) {
        if (requestId !== requestIdRef.current || error?.name === "AbortError") return;
        setSuggestions([]);
        setStatus("error");
      }
    }, LOCATION_SUGGESTION_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, enabled, apiKey, headersKey]);

  const resolve = async (suggestion: LocationSuggestion): Promise<ResolvedLocation> => {
    setIsResolving(true);
    try {
      if (typeof suggestion.lat === "number" && typeof suggestion.lng === "number") {
        return { address: suggestion.address || suggestion.primaryText, lat: suggestion.lat, lng: suggestion.lng };
      }
      if (!apiKey) throw new Error("missing_key");
      return await resolveLocationSuggestion({
        suggestion,
        client: { apiKey, headers },
        sessionToken: sessionTokenRef.current,
      });
    } finally {
      // Google cobra Autocomplete + Details como una sesión; se renueva al elegir.
      sessionTokenRef.current = createPlacesSessionToken();
      setIsResolving(false);
    }
  };

  const clear = () => {
    requestIdRef.current += 1;
    setSuggestions([]);
    setStatus("idle");
  };

  return { suggestions, status, isResolving, resolve, clear };
};

type ListProps = {
  status: Status;
  suggestions: LocationSuggestion[];
  isResolving: boolean;
  onSelect: (suggestion: LocationSuggestion) => void;
};

export default function LocationSuggestionsList({ status, suggestions, isResolving, onSelect }: ListProps) {
  if (status === "idle") return null;
  return (
    <View style={styles.container} accessibilityRole="list">
      {status === "loading" || isResolving ? (
        <View style={styles.stateRow}>
          <VibesLoader size={20} />
          <Text style={styles.stateText}>{isResolving ? "Ubicando en el mapa…" : "Buscando lugares…"}</Text>
        </View>
      ) : null}
      {status === "empty" && !isResolving ? (
        <View style={styles.stateRow}>
          <Icon name="search" size={16} color={vibesTheme.colors.secondaryText} />
          <Text style={styles.stateText}>
            No encontramos ese lugar. Probá con calle y altura, o el nombre del lugar.
          </Text>
        </View>
      ) : null}
      {status === "error" && !isResolving ? (
        <View style={[styles.stateRow, styles.errorRow]}>
          <Icon name="alert-circle" size={16} color={vibesTheme.colors.primaryText} />
          <Text style={styles.errorText}>
            No pudimos buscar sugerencias. Revisá tu conexión o tocá "Validar ubicación".
          </Text>
        </View>
      ) : null}
      {status === "ready" && !isResolving
        ? suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={suggestion.id}
              style={[styles.row, index > 0 && styles.rowDivider]}
              onPress={() => onSelect(suggestion)}
              accessibilityRole="button"
              accessibilityLabel={[suggestion.primaryText, suggestion.secondaryText].filter(Boolean).join(", ")}
            >
              <Icon name="location" size={18} color={vibesTheme.colors.accentBlue} />
              <View style={styles.rowBody}>
                <Text style={styles.primaryText} numberOfLines={1}>
                  {suggestion.primaryText}
                </Text>
                {suggestion.secondaryText ? (
                  <Text style={styles.secondaryText} numberOfLines={1}>
                    {suggestion.secondaryText}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    backgroundColor: vibesTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.12)",
    overflow: "hidden",
  },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: vibesTheme.colors.borderSoft,
  },
  rowBody: { flex: 1 },
  primaryText: {
    fontSize: 15,
    lineHeight: 20,
    color: vibesTheme.colors.primaryText,
    fontWeight: "500",
  },
  secondaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: vibesTheme.colors.secondaryText,
  },
  stateRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stateText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: vibesTheme.colors.secondaryText,
  },
  errorRow: { backgroundColor: "rgba(216, 140, 122, 0.12)" },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: vibesTheme.colors.primaryText,
  },
});
