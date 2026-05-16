import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";
import type { SpiritualPathDetails } from "../lib/spiritualPaths";
import { upsertUserPreferences } from "../lib/userPreferencesStore";
import { profileKeys } from "./profile.queries";
import { userPreferencesKeys } from "./userPreferences.queries";

const PROFILE_PICTURES_BUCKET = "profile pictures";

const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
  value instanceof ArrayBuffer ||
  Object.prototype.toString.call(value) === "[object ArrayBuffer]";

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const readUriAsArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  try {
    const response = await fetch(uri);
    const fetched = await response.arrayBuffer();
    if (isArrayBuffer(fetched) && fetched.byteLength > 0) return fetched.slice(0);
  } catch (_) {
    // fall through to base64 fallback
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buf = base64ToArrayBuffer(base64);
  if (!isArrayBuffer(buf) || buf.byteLength === 0) {
    throw new Error("Failed to convert file URI to ArrayBuffer");
  }
  return buf.slice(0);
};

const uploadOnboardingPhotos = async (userId: string, uris: string[]) => {
  const { data: existingRows, error: existingRowsError } = await supabase
    .from("profile_photos")
    .select("id")
    .eq("profile_id", userId);

  if (existingRowsError) {
    console.error("onboarding:photo_existing_rows_error", existingRowsError);
    throw existingRowsError;
  }

  const existingIds = (existingRows ?? [])
    .map((row) => (row as Record<string, unknown>).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (existingIds.length) {
    const { error: deleteRowsError } = await supabase
      .from("profile_photos")
      .delete()
      .in("id", existingIds);

    if (deleteRowsError) {
      console.error("onboarding:photo_delete_existing_error", deleteRowsError);
      throw deleteRowsError;
    }
  }

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const rawExt = uri.split("?")[0].split(".").pop() || "jpg";
    const ext = rawExt.toLowerCase();
    const contentType = EXTENSION_TO_CONTENT_TYPE[ext] || "image/jpeg";
    const arrayBuffer = await readUriAsArrayBuffer(uri);
    const uploadBody = new Uint8Array(arrayBuffer).buffer;
    const filePath = `${userId}/${Date.now()}-${i}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(filePath, uploadBody, { contentType, upsert: true });

    if (uploadError) {
      console.error("onboarding:photo_upload_error", uploadError);
      throw uploadError;
    }

    const { error: insertError } = await supabase
      .from("profile_photos")
      .insert({
        profile_id: userId,
        url: filePath,
        order: i,
        is_primary: i === 0,
      });

    if (insertError) {
      console.error("onboarding:photo_insert_error", insertError);
      throw insertError;
    }
  }
};

const DEFAULT_INTENT_ID = 3; // "Everyone"
const DEFAULT_GENDER_ID = 3; // "More"

const getSupabaseErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : "";
    const details = typeof record.details === "string" ? record.details : "";
    const hint = typeof record.hint === "string" ? record.hint : "";
    return [message, details, hint].filter(Boolean).join(" ");
  }
  return "Error desconocido";
};

const runOnboardingStep = async (
  label: string,
  action: () => Promise<void>,
) => {
  try {
    await action();
  } catch (error) {
    throw new Error(`${label}: ${getSupabaseErrorMessage(error)}`);
  }
};

export type OnboardingDraft = {
  displayName?: string;
  age?: string;
  ageRange?: string;
  birthDate?: string;
  purpose?: string[];
  purposeIds?: string[];
  energy?: string[];
  energyIds?: string[];
  country?: string;
  city?: string;
  neighborhood?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  orientation?: string[];
  intentId?: number;
  spiritualPath?: string[];
  spiritualPathDetails?: SpiritualPathDetails;
  briefDescription?: string;
  aboutMe?: string;
  vegetarian?: "Sí" | "No" | "";
  otherTags?: string[];
  photoUris?: string[];
  primaryPhotoUri?: string;
};

const defaultDraft: OnboardingDraft = {
  displayName: "",
  age: "",
  ageRange: "",
  birthDate: "",
  purpose: [],
  energy: [],
  country: "",
  city: "",
  neighborhood: "",
  locationLabel: "",
  latitude: undefined,
  longitude: undefined,
  orientation: [],
  intentId: undefined,
  spiritualPath: [],
  spiritualPathDetails: {},
  briefDescription: "",
  aboutMe: "",
  vegetarian: "",
  otherTags: [],
  photoUris: [],
  primaryPhotoUri: "",
};

export const onboardingKeys = {
  pending: ["onboarding", "pending"] as const,
  draft: ["onboarding", "draft"] as const,
};

export const useOnboardingPending = () => {
  return useQuery<boolean>({
    queryKey: onboardingKeys.pending,
    queryFn: async () => false,
    initialData: false,
    staleTime: Infinity,
  });
};

export const useOnboardingDraft = () => {
  const queryClient = useQueryClient();
  const query = useQuery<OnboardingDraft>({
    queryKey: onboardingKeys.draft,
    queryFn: async () => defaultDraft,
    initialData: defaultDraft,
    staleTime: Infinity,
  });

  const setDraft = (next: OnboardingDraft) => {
    queryClient.setQueryData(onboardingKeys.draft, next);
  };

  const updateDraft = (patch: Partial<OnboardingDraft>) => {
    queryClient.setQueryData(onboardingKeys.draft, (prev) => ({
      ...(prev ?? defaultDraft),
      ...patch,
    }));
  };

  const resetDraft = () => {
    queryClient.setQueryData(onboardingKeys.draft, defaultDraft);
  };

  return {
    ...query,
    draft: query.data ?? defaultDraft,
    setDraft,
    updateDraft,
    resetDraft,
  };
};

type CompleteOnboardingInput = {
  userId: string;
  draft: OnboardingDraft;
};

const upsertProfileWithFallback = async (payload: Record<string, unknown>) => {
  const workingPayload: Record<string, unknown> = { ...payload };

  while (true) {
    const { error } = await supabase
      .from("profiles")
      .upsert(workingPayload, { onConflict: "id" });

    if (!error) return;

    if (error.code === "PGRST204") {
      const match = error.message.match(/'([^']+)' column/);
      const missingColumn = match?.[1];
      if (
        missingColumn &&
        missingColumn in workingPayload &&
        missingColumn !== "id"
      ) {
        delete workingPayload[missingColumn];
        continue;
      }
    }

    throw error;
  }
};

export const useCompleteOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, CompleteOnboardingInput>({
    mutationFn: async ({ userId, draft }) => {
      const payload: Record<string, unknown> = {
        id: userId,
        display_name: draft.displayName?.trim() ?? "",
        gender_id: DEFAULT_GENDER_ID,
        intent_id: draft.intentId ?? DEFAULT_INTENT_ID,
      };

      if (draft.ageRange?.trim()) payload.age_range = draft.ageRange.trim();
      if (draft.birthDate) payload.birth_date = draft.birthDate;
      if (draft.country?.trim()) payload.country = draft.country.trim();
      if (draft.city?.trim()) payload.city = draft.city.trim();
      if (draft.neighborhood?.trim()) {
        payload.neighborhood = draft.neighborhood.trim();
      }
      if (draft.locationLabel?.trim()) payload.location_label = draft.locationLabel.trim();
      if (typeof draft.latitude === "number") payload.latitude = draft.latitude;
      if (typeof draft.longitude === "number") payload.longitude = draft.longitude;
      if (draft.orientation?.length) payload.orientation = draft.orientation;

      await runOnboardingStep("Perfil", () => upsertProfileWithFallback(payload));

      await runOnboardingStep("Preferencias", () =>
        upsertUserPreferences(userId, {
          spiritual_path: draft.spiritualPath ?? [],
          spiritual_path_details: draft.spiritualPathDetails ?? {},
          vegetarian: draft.vegetarian || "No",
          about_me: draft.aboutMe?.trim() ?? "",
          other_tags: draft.otherTags ?? [],
          open_to: draft.purpose ?? [],
        }),
      );

      // Upload photos to Supabase Storage + profile_photos table
      if (draft.photoUris?.length) {
        await runOnboardingStep("Fotos", () =>
          uploadOnboardingPhotos(userId, draft.photoUris ?? []),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: userPreferencesKeys.all });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.pending });
    },
  });
};

type ResetOnboardingInput = {
  userId: string;
};

const resetOnboardingWithFallback = async (userId: string) => {
  const workingPayload: Record<string, any> = {
    id: userId,
    display_name: "",
    birth_date: null,
    country: null,
    city: null,
    neighborhood: null,
    location_label: null,
    latitude: null,
    longitude: null,
    gender_id: DEFAULT_GENDER_ID,
    orientation: null,
    intent_id: DEFAULT_INTENT_ID,
  };

  while (true) {
    const { error } = await supabase
      .from("profiles")
      .upsert(workingPayload, { onConflict: "id" });

    if (!error) return;

    if (error.code === "PGRST204") {
      const match = error.message.match(/'([^']+)' column/);
      const missingColumn = match?.[1];
      if (missingColumn && missingColumn in workingPayload && missingColumn !== "id") {
        delete workingPayload[missingColumn];
        if (Object.keys(workingPayload).length <= 1) throw error;
        continue;
      }
    }

    throw error;
  }
};

export const useResetOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, ResetOnboardingInput>({
    mutationFn: async ({ userId }) => {
      await resetOnboardingWithFallback(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.pending });
      queryClient.invalidateQueries({ queryKey: userPreferencesKeys.all });
    },
  });
};
