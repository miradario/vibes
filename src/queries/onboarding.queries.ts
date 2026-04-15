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

export type OnboardingDraft = {
  displayName?: string;
  birthDate?: string;
  country?: string;
  genderId?: number;
  orientation?: string[];
  intentId?: number;
  spiritualPath?: string[];
  spiritualPathDetails?: SpiritualPathDetails;
  photoUris?: string[];
  primaryPhotoUri?: string;
};

const defaultDraft: OnboardingDraft = {
  displayName: "",
  birthDate: "",
  country: "",
  genderId: undefined,
  orientation: [],
  intentId: undefined,
  spiritualPath: [],
  spiritualPathDetails: {},
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

export const useCompleteOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, CompleteOnboardingInput>({
    mutationFn: async ({ userId, draft }) => {
      const payload: Record<string, unknown> = {
        id: userId,
        display_name: draft.displayName?.trim() ?? "",
        intent_id: draft.intentId ?? DEFAULT_INTENT_ID,
      };

      if (draft.birthDate) payload.birth_date = draft.birthDate;
      if (draft.genderId) payload.gender_id = draft.genderId;
      if (draft.orientation?.length) payload.orientation = draft.orientation;

      console.log("completeOnboarding:payload", payload);
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.log("completeOnboarding:error", error);
        console.log("completeOnboarding:error_message", error.message);
        if ("details" in error) {
          console.log(
            "completeOnboarding:error_details",
            (error as any).details
          );
        }
        if ("hint" in error) {
          console.log("completeOnboarding:error_hint", (error as any).hint);
        }
        throw error;
      }

      await upsertUserPreferences(userId, {
        spiritual_path: draft.spiritualPath ?? [],
        spiritual_path_details: draft.spiritualPathDetails ?? {},
      });

      // Upload photos to Supabase Storage + profile_photos table
      if (draft.photoUris?.length) {
        await uploadOnboardingPhotos(userId, draft.photoUris);
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
    gender_id: null,
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
