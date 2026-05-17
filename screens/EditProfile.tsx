/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  StyleSheet,
  Linking,
  TextInput,
  type LayoutChangeEvent,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import styles, {
  BLACK,
  DARK_GRAY,
  GRAY,
  PRIMARY_COLOR,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../src/lib/supabase";
import { useAuthSession } from "../src/auth/auth.queries";
import { createSignedProfilePhotoUrl } from "../src/lib/profilePhotoStorage";
import { profileKeys, useProfileQuery } from "../src/queries/profile.queries";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useI18n } from "../src/i18n";

const IMAGE_MEDIA_TYPE = (ImagePicker as any).MediaType?.Images
  ? [(ImagePicker as any).MediaType.Images]
  : ["images"];
const PROFILE_PICTURES_BUCKET = "profile pictures";
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const getErrorMessage = (error: unknown) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return JSON.stringify(error);
};

const PROFILE_SINGLE_PHOTO_KEYS = [
  "photo_url",
  "avatar_url",
  "image_url",
  "picture_url",
  "photo",
  "avatar",
  "image",
  "profile_photo",
  "profile_picture",
] as const;

const buildProfilePhotosFromRow = (profileRow: Record<string, any> | null) => {
  if (!profileRow) return [];
  if (Array.isArray(profileRow.photos)) {
    return profileRow.photos
      .map((photo: any, index: number) => {
        if (typeof photo === "string" && photo.trim().length > 0) {
          return {
            url: photo.trim(),
            order: index,
          };
        }

        if (
          photo &&
          typeof photo === "object" &&
          typeof photo.url === "string" &&
          photo.url.trim().length > 0
        ) {
          return {
            url: photo.url.trim(),
            order: typeof photo.order === "number" ? photo.order : index,
          };
        }

        return null;
      })
      .filter(
        (
          photo,
        ): photo is {
          url: string;
          order: number;
        } => Boolean(photo),
      )
      .sort((left, right) => left.order - right.order)
      .reduce<string[]>((acc, photo) => {
        acc[photo.order] = photo.url;
        return acc;
      }, []);
  }

  for (const key of PROFILE_SINGLE_PHOTO_KEYS) {
    const value = profileRow[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return [value];
    }
  }

  return [];
};

const buildExistingPhotoRows = (profileRow: Record<string, any> | null) => {
  if (!profileRow || !Array.isArray(profileRow.photos)) return [];

  return profileRow.photos
    .map((photo: any, index: number) => {
      if (!photo || typeof photo !== "object") return null;

      return {
        id: typeof photo.id === "string" ? photo.id : null,
        url: typeof photo.url === "string" ? photo.url : null,
        order: typeof photo.order === "number" ? photo.order : index,
        isPrimary:
          typeof photo.isPrimary === "boolean" ? photo.isPrimary : index === 0,
      };
    })
    .filter(
      (
        photo,
      ): photo is {
        id: string | null;
        url: string | null;
        order: number;
        isPrimary: boolean;
      } => Boolean(photo),
    );
};

const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
  typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer;

const base64ToArrayBuffer = (base64: string) => {
  if (typeof atob !== "function") {
    throw new Error("Base64 decoder is not available in this runtime");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const readUriAsArrayBuffer = async (uri: string) => {
  try {
    const response = await fetch(uri);
    const fetched = await response.arrayBuffer();
    if (isArrayBuffer(fetched) && fetched.byteLength > 0) {
      return fetched.slice(0);
    }
  } catch (error) {
    console.warn("readUriAsArrayBuffer: fetch fallback", { uri, error });
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fromBase64 = base64ToArrayBuffer(base64);
  if (!isArrayBuffer(fromBase64) || fromBase64.byteLength === 0) {
    throw new Error("Failed to convert file URI to ArrayBuffer");
  }
  return fromBase64.slice(0);
};

const DEFAULT_INTENT_ID = 3;
const DEFAULT_GENDER_ID = 3;
type PhotoSlotLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResolvedLocationMeta = {
  label: string;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};

const ensureProfileExists = async (
  userId: string,
  displayName?: string | null,
  intentId?: number | null,
) => {
  const resolvedDisplayName =
    typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim()
      : "Vibes";

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: resolvedDisplayName,
      gender_id: DEFAULT_GENDER_ID,
      intent_id: intentId ?? DEFAULT_INTENT_ID,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("ensureProfileExists:error", error);
    throw error;
  }
};

const DraggablePhotoSlot = ({
  index,
  item,
  onPress,
  onRemove,
  getSlotLayout,
  onSlotLayout,
  onDragStart,
  onDragEnd,
  onReorder,
}: {
  index: number;
  item: string | null;
  onPress: (i: number) => void;
  onRemove: (i: number) => void;
  getSlotLayout: (i: number) => PhotoSlotLayout | null;
  onSlotLayout: (i: number, event: LayoutChangeEvent) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onReorder: (from: number, to: number) => void;
}) => {
  const { t } = useI18n();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIdx = useSharedValue(1);

  const calcTarget = (fromIdx: number, dx: number, dy: number) => {
    const currentLayout = getSlotLayout(fromIdx);
    if (!currentLayout) return fromIdx;

    const draggedCenterX = currentLayout.x + currentLayout.width / 2 + dx;
    const draggedCenterY = currentLayout.y + currentLayout.height / 2 + dy;

    let bestIndex = fromIdx;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let candidateIndex = 0; candidateIndex < 6; candidateIndex += 1) {
      const candidateLayout = getSlotLayout(candidateIndex);
      if (!candidateLayout) continue;

      const candidateCenterX =
        candidateLayout.x + candidateLayout.width / 2;
      const candidateCenterY =
        candidateLayout.y + candidateLayout.height / 2;
      const distance = Math.hypot(
        draggedCenterX - candidateCenterX,
        draggedCenterY - candidateCenterY,
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = candidateIndex;
      }
    }

    return bestIndex;
  };

  const handleDrop = (dx: number, dy: number) => {
    const target = calcTarget(index, dx, dy);
    if (target !== index) onReorder(index, target);
    onDragEnd();
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .enabled(!!item)
    .onStart(() => {
      "worklet";
      scale.value = withSpring(1.1);
      zIdx.value = 100;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      "worklet";
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      "worklet";
      const dx = tx.value;
      const dy = ty.value;
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      scale.value = withSpring(1);
      zIdx.value = 1;
      runOnJS(handleDrop)(dx, dy);
    })
    .onFinalize(() => {
      "worklet";
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      scale.value = withSpring(1);
      zIdx.value = 1;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    zIndex: zIdx.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.mediaSlot, animStyle]}
        onLayout={(event) => onSlotLayout(index, event)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => onPress(index)}
          activeOpacity={0.8}
        >
          {item ? (
            <>
              <Image
                source={typeof item === "string" ? { uri: item } : item}
                style={styles.mediaImage}
              />
              {index === 0 && (
                <View style={localStyles.primaryBadge}>
                  <Text style={localStyles.primaryBadgeText}>{t("editProfile.primary")}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.mediaRemove}
                onPress={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
              >
                <Icon name="close" size={14} color={WHITE} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.mediaPlaceholder}>
              <View style={styles.mediaAdd}>
                <Icon name="add" size={16} color={WHITE} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

const EditProfile = () => {
  const { locale, setLocale, t } = useI18n();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: session } = useAuthSession();
  const { data: profileData, refetch } = useProfileQuery(session?.user?.id);

  const maxPhotos = 6;
  const supportsMultiPhotos = useMemo(
    () => Array.isArray((profileData as any)?.photos),
    [profileData],
  );
  const profilePhotos = useMemo(
    () => buildProfilePhotosFromRow(profileData ?? null),
    [profileData],
  );
  const buildSlots = (photos: (string | undefined | null)[]) =>
    Array.from({ length: maxPhotos }, (_, index) => photos[index] ?? null);
  const [mediaSlots, setMediaSlots] = useState<(string | null)[]>(
    buildSlots(profilePhotos),
  );

  useEffect(() => {
    if (!supportsMultiPhotos) return;
    const nextSlots = buildSlots(profilePhotos);
    setMediaSlots((prev) => {
      const isSame =
        prev.length === nextSlots.length &&
        prev.every((item, index) => item === nextSlots[index]);
      return isSame ? prev : nextSlots;
    });
  }, [profilePhotos, supportsMultiPhotos]);

  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const slotLayoutsRef = useRef<Record<number, PhotoSlotLayout>>({});
  const [displayName, setDisplayName] = useState(
    (profileData as any)?.displayName ?? "",
  );
  const [savingName, setSavingName] = useState(false);
  const [location, setLocation] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [currentLocationMeta, setCurrentLocationMeta] =
    useState<ResolvedLocationMeta | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const refreshProfileCache = async () => {
    const userId = session?.user?.id;
    const refreshed = await refetch();

    if (!userId || refreshed.data === undefined) return;

    queryClient.setQueryData(profileKeys.byUser(userId), refreshed.data);
    await queryClient.invalidateQueries({ queryKey: profileKeys.all });
  };

  useEffect(() => {
    const name = (profileData as any)?.displayName;
    if (typeof name === "string") setDisplayName(name);
  }, [(profileData as any)?.displayName]);

  useEffect(() => {
    const nextLocation =
      profileData?.locationLabel ??
      [profileData?.neighborhood, profileData?.city, profileData?.country]
        .filter((item) => typeof item === "string" && item.trim())
        .join(", ");

    if (typeof nextLocation === "string") {
      setLocation(nextLocation);
    }
  }, [
    profileData?.city,
    profileData?.country,
    profileData?.locationLabel,
    profileData?.neighborhood,
  ]);

  useEffect(() => {
    let active = true;

    const loadCurrentLocation = async () => {
      setIsResolvingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active || permission.status !== "granted") return;

        const current = await Location.getCurrentPositionAsync({});
        if (!active) return;

        const [address] = await Location.reverseGeocodeAsync({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        if (!active) return;

        const neighborhood =
          (address as any)?.district ??
          address?.subregion ??
          address?.name ??
          null;
        const city =
          address?.city ?? address?.region ?? null;
        const country = address?.country ?? null;
        const label = [neighborhood, city, country].filter(Boolean).join(", ");

        if (!label) return;

        setCurrentLocation(label);
        setCurrentLocationMeta({
          label,
          neighborhood,
          city,
          country,
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch (_error) {
        // Keep editing available even if geolocation fails.
      } finally {
        if (active) {
          setIsResolvingLocation(false);
        }
      }
    };

    loadCurrentLocation();

    return () => {
      active = false;
    };
  }, []);

  const saveDisplayName = async () => {
    const userId = session?.user?.id;
    if (!userId || !displayName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", userId);
      if (error) {
        Alert.alert(t("common.error"), t("editProfile.saveNameError"));
        console.error("saveDisplayName:error", error);
      } else {
        await refreshProfileCache();
      }
    } catch (err) {
      console.error("saveDisplayName:error", err);
    } finally {
      setSavingName(false);
    }
  };

  const saveLocation = async (nextValue?: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    const trimmedLocation = (nextValue ?? location).trim();
    setSavingLocation(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          location_label: trimmedLocation || null,
        })
        .eq("id", userId);

      if (error) {
        Alert.alert(t("common.error"), t("settings.saveError"));
        console.error("saveLocation:error", error);
      } else {
        await refreshProfileCache();
      }
    } catch (error) {
      console.error("saveLocation:error", error);
    } finally {
      setSavingLocation(false);
    }
  };

  const applyCurrentLocation = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    if (!currentLocationMeta) {
      if (currentLocation) {
        setLocation(currentLocation);
        await saveLocation(currentLocation);
      }
      return;
    }

    setLocation(currentLocationMeta.label);
    setSavingLocation(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          location_label: currentLocationMeta.label,
          neighborhood: currentLocationMeta.neighborhood,
          city: currentLocationMeta.city,
          country: currentLocationMeta.country,
          latitude: currentLocationMeta.latitude,
          longitude: currentLocationMeta.longitude,
        })
        .eq("id", userId);

      if (error) {
        Alert.alert(t("common.error"), t("settings.saveError"));
        console.error("applyCurrentLocation:error", error);
      } else {
        await refreshProfileCache();
      }
    } catch (error) {
      console.error("applyCurrentLocation:error", error);
    } finally {
      setSavingLocation(false);
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const userId = session?.user?.id;
    if (!userId) return;

    const previousSlots = [...mediaSlots];
    const nextSlots = [...previousSlots];
    const temp = nextSlots[fromIndex];
    nextSlots[fromIndex] = nextSlots[toIndex];
    nextSlots[toIndex] = temp;
    setMediaSlots(nextSlots);

    try {
      const existingRows = buildExistingPhotoRows(
        (profileData as Record<string, any>) ?? null,
      );
      const rowsByCurrentOrder = new Map(
        existingRows
          .filter((row) => row.id && typeof row.order === "number")
          .map((row) => [row.order, row] as const),
      );

      const finalRows = nextSlots
        .map((url, order) => {
          if (!url) return null;
          const sourceOrder = previousSlots.findIndex((slot) => slot === url);
          if (sourceOrder === -1) return null;
          const row = rowsByCurrentOrder.get(sourceOrder);
          if (!row?.id) return null;
          return {
            id: row.id,
            order,
            isPrimary: order === 0,
          };
        })
        .filter(
          (
            row,
          ): row is {
            id: string;
            order: number;
            isPrimary: boolean;
          } => Boolean(row),
        );

      for (let index = 0; index < finalRows.length; index += 1) {
        const row = finalRows[index];
        const { error } = await supabase
          .from("profile_photos")
          .update({ order: -(index + 1), is_primary: false })
          .eq("id", row.id);

        if (error) throw error;
      }

      for (const row of finalRows) {
        const { error } = await supabase
          .from("profile_photos")
          .update({ order: row.order, is_primary: row.isPrimary })
          .eq("id", row.id);

        if (error) throw error;
      }

      await refreshProfileCache();
    } catch (error) {
      console.error("handleReorder:error", error);
      setMediaSlots(previousSlots);
      await refreshProfileCache();
    }
  };

  const promptOpenSettings = () => {
    Alert.alert(
      t("editProfile.permissionsTitle"),
      t("editProfile.openSettingsBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("editProfile.openSettingsAction"), onPress: () => Linking.openSettings() },
      ],
    );
  };

  const ensureCameraPermission = async () => {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.status === "granted") return true;

    const requested = await ImagePicker.requestCameraPermissionsAsync();
    if (requested.status === "granted") return true;
    if (!requested.canAskAgain) {
      promptOpenSettings();
    } else {
      Alert.alert(t("editProfile.permissionsTitle"), t("editProfile.cameraPermissionBody"));
    }
    return false;
  };

  const ensureLibraryPermission = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.status === "granted") return true;

    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requested.status === "granted") return true;
    if (!requested.canAskAgain) {
      promptOpenSettings();
    } else {
      Alert.alert(t("editProfile.permissionsTitle"), t("editProfile.galleryPermissionBody"));
    }
    return false;
  };

  const uploadPhoto = async (uri: string, slotIndex: number) => {
    const userId = session?.user?.id;
    if (!userId) {
      console.error("uploadPhoto: missing session userId");
      throw new Error("Missing user session");
    }

    const optimistic = Array.from(
      { length: maxPhotos },
      (_, index) => mediaSlots[index] ?? null,
    );
    optimistic[slotIndex] = uri;
    setMediaSlots(optimistic);

    await ensureProfileExists(
      userId,
      profileData?.displayName ?? session?.user?.email?.split("@")[0] ?? null,
      profileData?.intentId ?? null,
    );

    const uriWithoutQuery = uri.split("?")[0];
    const rawExt = uriWithoutQuery.split(".").pop() || "jpg";
    const normalizedExt = rawExt.toLowerCase();
    const ext = EXTENSION_TO_CONTENT_TYPE[normalizedExt] ? normalizedExt : "jpg";
    const contentType = EXTENSION_TO_CONTENT_TYPE[ext] || "image/jpeg";
    const arrayBuffer = await readUriAsArrayBuffer(uri);
    const uploadBody = new Uint8Array(arrayBuffer).buffer;
    const filePath = `${userId}/${Date.now()}-${slotIndex}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(filePath, uploadBody, {
        contentType,
        upsert: true,
      });
    if (uploadError) {
      console.error("uploadPhoto:storage_upload_error", uploadError);
      throw uploadError;
    }

    const signedUrl = await createSignedProfilePhotoUrl(filePath);

    const nextPhotos = Array.from(
      { length: maxPhotos },
      (_, index) => optimistic[index] ?? null,
    );
    nextPhotos[slotIndex] = signedUrl || uri;

    const existingRows = buildExistingPhotoRows(
      (profileData as Record<string, any>) ?? null,
    );
    const existingForSlot = existingRows.find(
      (photo) => photo.order === slotIndex,
    );

    if (existingForSlot?.id) {
      const { error: deleteExistingError } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", existingForSlot.id);

      if (deleteExistingError) {
        console.error(
          "uploadPhoto:profile_photos_delete_existing_error",
          deleteExistingError,
        );
        throw deleteExistingError;
      }
    }

    const { error: insertError } = await supabase
      .from("profile_photos")
      .insert({
        profile_id: userId,
        url: filePath,
        order: slotIndex,
        is_primary: slotIndex === 0,
      });

    if (insertError) {
      console.error("uploadPhoto:profile_photos_insert_error", insertError);
      throw insertError;
    }

    setMediaSlots(nextPhotos);
    await refreshProfileCache();
  };

  const pickFromLibrary = async (slotIndex: number) => {
    const hasPermission = await ensureLibraryPermission();
    if (!hasPermission) {
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: IMAGE_MEDIA_TYPE,
        allowsEditing: true,
        quality: 0.8,
      });
    } catch (error) {
      Alert.alert(t("common.error"), t("editProfile.galleryError"));
      return;
    }

    if (!result.canceled && result.assets?.[0]?.uri) {
      setBusyIndex(slotIndex);
      try {
        await uploadPhoto(result.assets[0].uri, slotIndex);
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Error uploading photo from gallery", { message, error });
        Alert.alert(t("common.error"), t("editProfile.uploadError", { message }));
      } finally {
        setBusyIndex(null);
      }
    }
  };

  const takePhoto = async (slotIndex: number) => {
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) {
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: IMAGE_MEDIA_TYPE,
        allowsEditing: true,
        cameraType: (ImagePicker as any).CameraType?.front ?? "front",
        quality: 0.8,
      });
    } catch (error) {
      Alert.alert(t("common.error"), t("editProfile.cameraError"));
      return;
    }

    if (!result.canceled && result.assets?.[0]?.uri) {
      setBusyIndex(slotIndex);
      try {
        await uploadPhoto(result.assets[0].uri, slotIndex);
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Error uploading photo from camera", { message, error });
        Alert.alert(t("common.error"), t("editProfile.uploadError", { message }));
      } finally {
        setBusyIndex(null);
      }
    }
  };

  const handleAddMedia = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setPhotoModalVisible(true);
  };

  const handleRemove = async (slotIndex: number) => {
    const userId = session?.user?.id;
    if (!userId) return;

    await ensureProfileExists(
      userId,
      profileData?.displayName ?? session?.user?.email?.split("@")[0] ?? null,
      profileData?.intentId ?? null,
    );

    const nextPhotos = Array.from(
      { length: maxPhotos },
      (_, index) => mediaSlots[index] ?? null,
    );
    nextPhotos[slotIndex] = null;

    const existingRows = buildExistingPhotoRows(
      (profileData as Record<string, any>) ?? null,
    );
    const existingForSlot = existingRows.find(
      (photo) => photo.order === slotIndex,
    );

    if (!existingForSlot?.id) {
      setMediaSlots(nextPhotos);
      await refreshProfileCache();
      return;
    }

    const { error: deleteError } = await supabase
      .from("profile_photos")
      .delete()
      .eq("id", existingForSlot.id)
      .eq("profile_id", userId);

    if (deleteError) {
      Alert.alert(t("common.error"), t("editProfile.deleteError"));
      return;
    }

    setMediaSlots(nextPhotos);
    await refreshProfileCache();
  };

  return (
    <View style={styles.bg}>
      <ScrollView
        style={styles.editContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={localStyles.scrollContent}
      >
        <AppHeader
          title={t("editProfile.title")}
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.header}
          titleStyle={styles.title}
          right={
            <TouchableOpacity
              onPress={async () => {
                await saveDisplayName();
                await saveLocation();
                navigation.goBack();
              }}
            >
              <Icon name="checkmark" color={DARK_GRAY} size={22} />
            </TouchableOpacity>
          }
        />

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>{t("editProfile.photos")}</Text>
          <View style={styles.mediaGrid}>
            {mediaSlots.map((item, index) => (
              <DraggablePhotoSlot
                key={`media-${index}`}
                index={index}
                item={item}
                onPress={handleAddMedia}
                onRemove={handleRemove}
                getSlotLayout={(slotIndex) =>
                  slotLayoutsRef.current[slotIndex] ?? null
                }
                onSlotLayout={(slotIndex, event) => {
                  const { x, y, width, height } = event.nativeEvent.layout;
                  slotLayoutsRef.current[slotIndex] = { x, y, width, height };
                }}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
                onReorder={handleReorder}
              />
            ))}
          </View>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>{t("editProfile.name")}</Text>
          <TextInput
            style={localStyles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={saveDisplayName}
            onSubmitEditing={saveDisplayName}
            placeholder={t("editProfile.namePlaceholder")}
            placeholderTextColor={GRAY}
            returnKeyType="done"
            editable={!savingName}
            maxLength={50}
          />
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>{t("settings.language")}</Text>
          <View style={localStyles.languageRow}>
            <TouchableOpacity
              style={[
                localStyles.languageChip,
                locale === "es" && localStyles.languageChipActive,
              ]}
              onPress={() => void setLocale("es")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  localStyles.languageChipText,
                  locale === "es" && localStyles.languageChipTextActive,
                ]}
              >
                {t("settings.spanish")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                localStyles.languageChip,
                locale === "en" && localStyles.languageChipActive,
              ]}
              onPress={() => void setLocale("en")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  localStyles.languageChipText,
                  locale === "en" && localStyles.languageChipTextActive,
                ]}
              >
                {t("settings.english")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>{t("editProfile.email")}</Text>
          <View style={localStyles.readOnlyField}>
            <Text style={localStyles.readOnlyValue}>
              {session?.user?.email ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>{t("editProfile.location")}</Text>
          {currentLocation ? (
            <View style={localStyles.currentLocationCard}>
              <Text style={localStyles.currentLocationLabel}>
                {t("settings.currentLocation")}
              </Text>
              <Text style={localStyles.currentLocationValue}>
                {currentLocation}
              </Text>
              <TouchableOpacity
                style={localStyles.currentLocationButton}
                onPress={() => void applyCurrentLocation()}
                disabled={savingLocation}
              >
                <Text style={localStyles.currentLocationButtonText}>
                  {t("settings.useCurrentLocation")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isResolvingLocation ? (
            <Text style={localStyles.helperText}>
              {t("settings.resolvingLocation")}
            </Text>
          ) : null}
          <TextInput
            style={localStyles.nameInput}
            value={location}
            onChangeText={setLocation}
            onBlur={() => void saveLocation()}
            onSubmitEditing={() => void saveLocation()}
            placeholder={t("settings.locationPlaceholder")}
            placeholderTextColor={GRAY}
            autoCapitalize="words"
            returnKeyType="done"
            editable={!savingLocation}
          />
        </View>
      </ScrollView>

      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>{t("editProfile.addPhoto")}</Text>
            <Text style={modalStyles.subtitle}>{t("editProfile.chooseOption")}</Text>

            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={modalStyles.primaryButton}
                onPress={async () => {
                  if (selectedSlot === null) return;
                  setPhotoModalVisible(false);
                  await new Promise((resolve) => setTimeout(resolve, 250));
                  await takePhoto(selectedSlot);
                }}
              >
                <Text style={modalStyles.primaryText}>{t("editProfile.camera")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.secondaryButton}
                onPress={async () => {
                  if (selectedSlot === null) return;
                  setPhotoModalVisible(false);
                  await new Promise((resolve) => setTimeout(resolve, 250));
                  await pickFromLibrary(selectedSlot);
                }}
              >
                <Text style={modalStyles.secondaryText}>{t("editProfile.gallery")}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Text style={modalStyles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default EditProfile;

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(43, 43, 43, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: BLACK,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  title: {
    fontSize: 18,
    color: DARK_GRAY,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: GRAY,
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    color: WHITE,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: DARK_GRAY,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 14,
    alignItems: "center",
  },
  cancelText: {
    color: GRAY,
    fontWeight: "600",
  },
});

const localStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  scrollContent: {
    paddingBottom: 72,
  },
  primaryBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "700",
  },
  nameInput: {
    backgroundColor: "rgba(246, 246, 244, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: DARK_GRAY,
    borderWidth: 1,
    borderColor: "rgba(216, 140, 122, 0.25)",
  },
  readOnlyField: {
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(174, 191, 209, 0.8)",
  },
  readOnlyValue: {
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
  helperText: {
    color: GRAY,
    fontSize: 14,
    marginBottom: 10,
  },
  currentLocationCard: {
    backgroundColor: "#F6F6F4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(216, 140, 122, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  currentLocationLabel: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  currentLocationValue: {
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
  currentLocationButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  currentLocationButtonText: {
    color: WHITE,
    fontSize: 14,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  languageRow: {
    flexDirection: "row",
    gap: 10,
  },
  languageChip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(216, 140, 122, 0.35)",
    backgroundColor: "#F6F6F4",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  languageChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  languageChipText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  languageChipTextActive: {
    color: WHITE,
  },
});
