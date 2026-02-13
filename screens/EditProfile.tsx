import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  StyleSheet,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { BLACK, DARK_GRAY, GRAY, PRIMARY_COLOR, WHITE } from "../assets/styles";
import Icon from "../components/Icon";
import DEMO from "../assets/data/demo";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../src/lib/supabase";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";

const IMAGE_MEDIA_TYPE =
  (ImagePicker as any).MediaType?.Images
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

const EditProfile = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: profileData, refetch } = useProfileQuery(session?.user?.id);
  const profile = DEMO[7];

  const maxPhotos = 6;
  const profilePhotos = Array.isArray(profileData?.photos)
    ? profileData?.photos
    : [];
  const buildSlots = (photos: (string | null)[]) =>
    Array.from({ length: maxPhotos }, (_, index) => photos[index] ?? null);
  const [mediaSlots, setMediaSlots] = useState<(string | null)[]>(
    buildSlots(profilePhotos)
  );

  useEffect(() => {
    const nextSlots = buildSlots(profilePhotos);
    const isSame =
      mediaSlots.length === nextSlots.length &&
      mediaSlots.every((item, index) => item === nextSlots[index]);
    if (!isSame) {
      setMediaSlots(nextSlots);
    }
  }, [profilePhotos, mediaSlots]);

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

    const optimistic = Array.from({ length: maxPhotos }, (_, index) =>
      mediaSlots[index] ?? null
    );
    optimistic[slotIndex] = uri;
    setMediaSlots(optimistic);

    console.log("uploadPhoto:start", { userId, slotIndex, uri });
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const uriWithoutQuery = uri.split("?")[0];
    const rawExt = uriWithoutQuery.split(".").pop() || "jpg";
    const ext = rawExt.toLowerCase();
    const contentType = EXTENSION_TO_CONTENT_TYPE[ext] || "image/jpeg";
    console.log("uploadPhoto:fetched_bytes", {
      contentType,
      byteLength: arrayBuffer.byteLength,
    });
    const filePath = `${userId}/${Date.now()}-${slotIndex}.${ext}`;
    console.log("uploadPhoto:uploading", {
      bucket: PROFILE_PICTURES_BUCKET,
      filePath,
    });

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });
    if (uploadError) {
      console.error("uploadPhoto:storage_upload_error", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .getPublicUrl(filePath);
    console.log("uploadPhoto:public_url", data?.publicUrl);

    const nextPhotos = Array.from({ length: maxPhotos }, (_, index) =>
      optimistic[index] ?? null
    );
    nextPhotos[slotIndex] = data.publicUrl || uri;

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          photos: nextPhotos,
          photo_url: nextPhotos.find((item) => Boolean(item)) ?? null,
        },
        { onConflict: "id" }
      );
    if (updateError) {
      console.error("uploadPhoto:profiles_upsert_error", updateError);
      throw updateError;
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

    const nextPhotos = Array.from({ length: maxPhotos }, (_, index) =>
      mediaSlots[index] ?? null
    );
    nextPhotos[slotIndex] = null;

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          photos: nextPhotos,
          photo_url: nextPhotos.find((item) => Boolean(item)) ?? null,
        },
        { onConflict: "id" }
      );
    if (updateError) {
      Alert.alert("Error", "No se pudo eliminar la foto.");
      return;
    }

    setMediaSlots(nextPhotos);
    await refetch();
  };

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <ScrollView style={styles.editContainer} showsVerticalScrollIndicator={false}>
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
                onPress={() => {
                  if (!item) {
                    handleAddMedia(index);
                  }
                }}
              >
                {item ? (
                  <>
                    <Image
                      source={typeof item === "string" ? { uri: item } : item}
                      style={styles.mediaImage}
                    />
                    <TouchableOpacity
                      style={styles.mediaRemove}
                      onPress={() => handleRemove(index)}
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

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>Meditations</Text>
          {(profile.meditations || []).map((item, index) => (
            <View key={`edit-med-${index}`} style={styles.editRow}>
              <View>
                <Text style={styles.editRowTitle}>{item.title}</Text>
                <Text style={styles.editRowMeta}>
                  {item.duration} · {item.access}
                </Text>
              </View>
              <TouchableOpacity style={styles.editRowAction}>
                <Icon name="pencil" size={14} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.editOutlineButton}>
            <Icon name="add" size={16} color={DARK_GRAY} />
            <Text style={styles.editOutlineText}>Add meditation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>Videos</Text>
          {(profile.videos || []).map((item, index) => (
            <View key={`edit-vid-${index}`} style={styles.editRow}>
              <View>
                <Text style={styles.editRowTitle}>{item.title}</Text>
                <Text style={styles.editRowMeta}>
                  {item.duration} · {item.access}
                </Text>
              </View>
              <TouchableOpacity style={styles.editRowAction}>
                <Icon name="pencil" size={14} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.editOutlineButton}>
            <Icon name="add" size={16} color={DARK_GRAY} />
            <Text style={styles.editOutlineText}>Add video</Text>
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
    </ImageBackground>
  );
};

export default EditProfile;

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 12, 24, 0.45)",
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
    backgroundColor: "#F4E7DD",
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
