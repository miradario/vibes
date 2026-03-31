import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, {
  BLACK,
  DARK_GRAY,
  GRAY,
  PRIMARY_COLOR,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../src/lib/supabase";
import { useAuthSession } from "../src/auth/auth.queries";
import { createSignedProfilePhotoUrl } from "../src/lib/profilePhotoStorage";
import { useProfileQuery } from "../src/queries/profile.queries";

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
            order:
              typeof photo.order === "number" ? photo.order : index,
          };
        }

        return null;
      })
      .filter(
        (
          photo
        ): photo is {
          url: string;
          order: number;
        } => Boolean(photo)
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
        order:
          typeof photo.order === "number" ? photo.order : index,
        isPrimary:
          typeof photo.isPrimary === "boolean" ? photo.isPrimary : index === 0,
      };
    })
    .filter(
      (
        photo
      ): photo is {
        id: string | null;
        url: string | null;
        order: number;
        isPrimary: boolean;
      } => Boolean(photo)
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

const ensureProfileExists = async (
  userId: string,
  displayName?: string | null,
  genderId?: number | null,
  intentId?: number | null
) => {
  const resolvedDisplayName =
    typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim()
      : "Vibes";

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: resolvedDisplayName,
      gender_id: genderId ?? DEFAULT_GENDER_ID,
      intent_id: intentId ?? DEFAULT_INTENT_ID,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("ensureProfileExists:error", error);
    throw error;
  }
};

const EditProfile = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: profileData, refetch } = useProfileQuery(session?.user?.id);

  const maxPhotos = 6;
  const supportsMultiPhotos = Array.isArray((profileData as any)?.photos);
  const profilePhotos = buildProfilePhotosFromRow(profileData ?? null);
  const buildSlots = (photos: (string | undefined | null)[]) =>
    Array.from({ length: maxPhotos }, (_, index) => photos[index] ?? null);
  const [mediaSlots, setMediaSlots] = useState<(string | null)[]>(
    buildSlots(profilePhotos)
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

  const promptOpenSettings = () => {
    Alert.alert(
      "Permiso requerido",
      "Debes habilitar los permisos en Ajustes.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Abrir ajustes", onPress: () => Linking.openSettings() },
      ]
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
      Alert.alert("Permiso requerido", "Permite el acceso a tu cámara.");
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
      Alert.alert("Permiso requerido", "Permite el acceso a tus fotos.");
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
      (_, index) => mediaSlots[index] ?? null
    );
    optimistic[slotIndex] = uri;
    setMediaSlots(optimistic);

    await ensureProfileExists(
      userId,
      profileData?.displayName ?? session?.user?.email?.split("@")[0] ?? null,
      profileData?.genderId ?? null,
      profileData?.intentId ?? null
    );

    console.log("uploadPhoto:start", { userId, slotIndex, uri });
    const uriWithoutQuery = uri.split("?")[0];
    const rawExt = uriWithoutQuery.split(".").pop() || "jpg";
    const ext = rawExt.toLowerCase();
    const contentType = EXTENSION_TO_CONTENT_TYPE[ext] || "image/jpeg";
    const arrayBuffer = await readUriAsArrayBuffer(uri);
    const uploadBody = new Uint8Array(arrayBuffer).buffer;
    console.log("uploadPhoto:fetched_bytes", {
      contentType,
      byteLength: arrayBuffer.byteLength,
      isArrayBuffer: isArrayBuffer(uploadBody),
    });
    const filePath = `${userId}/${Date.now()}-${slotIndex}.${ext}`;
    console.log("uploadPhoto:uploading", {
      bucket: PROFILE_PICTURES_BUCKET,
      filePath,
    });

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
    console.log("uploadPhoto:signed_url", signedUrl);

    const nextPhotos = Array.from(
      { length: maxPhotos },
      (_, index) => optimistic[index] ?? null
    );
    nextPhotos[slotIndex] = signedUrl || uri;

    const existingRows = buildExistingPhotoRows(
      (profileData as Record<string, any>) ?? null
    );
    const existingForSlot = existingRows.find((photo) => photo.order === slotIndex);

    if (existingForSlot?.id) {
      const { error: deleteExistingError } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", existingForSlot.id);

      if (deleteExistingError) {
        console.error(
          "uploadPhoto:profile_photos_delete_existing_error",
          deleteExistingError
        );
        throw deleteExistingError;
      }
    }

    const { error: insertError } = await supabase.from("profile_photos").insert({
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
    await refetch();
    console.log("uploadPhoto:success", { slotIndex });
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
      Alert.alert("Error", "No se pudo abrir la galería.");
      return;
    }

    if (!result.canceled && result.assets?.[0]?.uri) {
      setBusyIndex(slotIndex);
      try {
        await uploadPhoto(result.assets[0].uri, slotIndex);
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Error uploading photo from gallery", { message, error });
        Alert.alert("Error", `No se pudo subir la foto: ${message}`);
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
        quality: 0.8,
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo abrir la cámara.");
      return;
    }

    if (!result.canceled && result.assets?.[0]?.uri) {
      setBusyIndex(slotIndex);
      try {
        await uploadPhoto(result.assets[0].uri, slotIndex);
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Error uploading photo from camera", { message, error });
        Alert.alert("Error", `No se pudo subir la foto: ${message}`);
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
      profileData?.genderId ?? null,
      profileData?.intentId ?? null
    );

    const nextPhotos = Array.from(
      { length: maxPhotos },
      (_, index) => mediaSlots[index] ?? null
    );
    nextPhotos[slotIndex] = null;

    const existingRows = buildExistingPhotoRows(
      (profileData as Record<string, any>) ?? null
    );
    const existingForSlot = existingRows.find((photo) => photo.order === slotIndex);

    if (!existingForSlot?.id) {
      setMediaSlots(nextPhotos);
      await refetch();
      return;
    }

    const { error: deleteError } = await supabase
      .from("profile_photos")
      .delete()
      .eq("id", existingForSlot.id)
      .eq("profile_id", userId);

    if (deleteError) {
      Alert.alert("Error", "No se pudo eliminar la foto.");
      return;
    }

    setMediaSlots(nextPhotos);
    await refetch();
  };

  return (
    <View style={styles.bg}>
      <ScrollView
        style={styles.editContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title}>Edit Profile</Text>
          </View>
          <TouchableOpacity>
            <Icon name="checkmark" color={DARK_GRAY} size={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>Photos</Text>
          <View style={styles.mediaGrid}>
            {mediaSlots.map((item, index) => (
              <TouchableOpacity
                key={`media-${index}`}
                style={styles.mediaSlot}
                onPress={() => handleAddMedia(index)}
              >
                {item ? (
                  <>
                    <Image
                      source={typeof item === "string" ? { uri: item } : item}
                      style={styles.mediaImage}
                    />
                    <TouchableOpacity
                      style={styles.mediaRemove}
                      onPress={(event) => {
                        event.stopPropagation();
                        handleRemove(index);
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
            ))}
          </View>
          <TouchableOpacity
            style={styles.editPrimaryButton}
            onPress={() => {
              const firstEmpty = mediaSlots.findIndex((item) => !item);
              if (firstEmpty === -1) {
                Alert.alert("Límite alcanzado", "Máximo 6 fotos.");
                return;
              }
              handleAddMedia(firstEmpty);
            }}
            disabled={busyIndex !== null}
          >
            <Text style={styles.editPrimaryText}>Add media</Text>
          </TouchableOpacity>
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
            <Text style={modalStyles.title}>Agregar foto</Text>
            <Text style={modalStyles.subtitle}>Elige una opción</Text>

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
                <Text style={modalStyles.primaryText}>Cámara</Text>
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
                <Text style={modalStyles.secondaryText}>Galería</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Text style={modalStyles.cancelText}>Cancelar</Text>
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
