/** @format */

import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import styles, {
  BLACK,
  DARK_GRAY,
  PRIMARY_COLOR,
  TEXT_SECONDARY,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useCreateChallengeMutation } from "../src/queries/events.queries";

const IMAGE_MEDIA_TYPE =
  (ImagePicker as any).MediaType?.Images
    ? [(ImagePicker as any).MediaType.Images]
    : ["images"];

const normalizeDaysInput = (value: string) => value.replace(/\D+/g, "");

const CreateChallenge = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const createChallengeMutation = useCreateChallengeMutation();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [days, setDays] = useState("");
  const [challengeImageUri, setChallengeImageUri] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const pickFromGallery = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    const permission =
      current.status === "granted"
        ? current
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Permiso requerido", "Permite acceso a la galería.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: IMAGE_MEDIA_TYPE,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setChallengeImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error opening gallery for challenge image", error);
      Alert.alert("Error", "No se pudo abrir la galería.");
    }
  };

  const takePhoto = async () => {
    const current = await ImagePicker.getCameraPermissionsAsync();
    const permission =
      current.status === "granted"
        ? current
        : await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Permiso requerido", "Permite acceso a la cámara.");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: IMAGE_MEDIA_TYPE,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setChallengeImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error opening camera for challenge image", error);
      Alert.alert("Error", "No se pudo abrir la cámara.");
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Faltan datos", "Completá al menos el título del challenge.");
      return;
    }

    if (!session?.user?.id) {
      Alert.alert("Sesión requerida", "Necesitás iniciar sesión para crear un challenge.");
      return;
    }

    const parsedDays = days.trim() ? Number.parseInt(days, 10) : 0;
    const hostName =
      (typeof profile?.displayName === "string" && profile.displayName.trim()) ||
      session.user.email?.split("@")[0] ||
      null;
    const hostImage =
      Array.isArray(profile?.photos) &&
      typeof profile.photos[0]?.url === "string" &&
      profile.photos[0].url.trim()
        ? profile.photos[0].url.trim()
        : null;

    try {
      await createChallengeMutation.mutateAsync({
        createdBy: session.user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || "Challenge creado por la comunidad",
        description: subtitle.trim() || null,
        durationDays: parsedDays,
        imageUri: challengeImageUri,
        hostName,
        hostImage,
      });

      navigation.navigate(
        "Tab" as never,
        {
          screen: "Soulmates",
          params: { section: "challenge" },
        } as never,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el challenge.";
      Alert.alert("Error", message);
    }
  };

  return (
    <View style={styles.bg}>
      <ScrollView
        style={styles.editContainer}
        contentContainerStyle={localStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title}>Crear challenge</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        <View style={localStyles.formCard}>
          <Text style={localStyles.label}>Título</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Ej: 21 días de gratitud"
            placeholderTextColor={TEXT_SECONDARY}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={localStyles.label}>Imagen del challenge</Text>
          <TouchableOpacity
            style={localStyles.imagePickerButton}
            onPress={() => setPhotoModalVisible(true)}
          >
            <Icon name="image" size={16} color={WHITE} />
            <Text style={localStyles.imagePickerButtonText}>
              {challengeImageUri ? "Cambiar imagen" : "Subir imagen"}
            </Text>
          </TouchableOpacity>
          <Image
            source={
              challengeImageUri
                ? { uri: challengeImageUri }
                : require("../assets/images/logo.png")
            }
            style={localStyles.imagePreview}
          />

          <Text style={localStyles.label}>Descripción corta</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Ej: Un hábito diario para sostener en comunidad"
            placeholderTextColor={TEXT_SECONDARY}
            value={subtitle}
            onChangeText={setSubtitle}
          />

          <Text style={localStyles.label}>Duración en días</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Ej: 21"
            placeholderTextColor={TEXT_SECONDARY}
            value={days}
            onChangeText={(value) => setDays(normalizeDaysInput(value))}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={localStyles.createButton}
          onPress={handleCreate}
          disabled={createChallengeMutation.isPending}
        >
          <Text style={localStyles.createButtonText}>
            {createChallengeMutation.isPending ? "Creando..." : "Crear challenge"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalCard}>
            <Text style={localStyles.modalTitle}>Imagen del challenge</Text>
            <TouchableOpacity
              style={localStyles.modalPrimaryButton}
              onPress={async () => {
                setPhotoModalVisible(false);
                await new Promise((resolve) => setTimeout(resolve, 200));
                await takePhoto();
              }}
            >
              <Text style={localStyles.modalPrimaryText}>Usar cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={localStyles.modalSecondaryButton}
              onPress={async () => {
                setPhotoModalVisible(false);
                await new Promise((resolve) => setTimeout(resolve, 200));
                await pickFromGallery();
              }}
            >
              <Text style={localStyles.modalSecondaryText}>Elegir de galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={localStyles.modalCancelButton}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Text style={localStyles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: WHITE,
    marginTop: 18,
    borderRadius: 18,
    padding: 18,
    shadowColor: BLACK,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: {
    color: DARK_GRAY,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
  },
  imagePickerButton: {
    marginTop: 6,
    backgroundColor: "#F6F6F4",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E4B76E",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 3 },
  },
  imagePickerButtonText: {
    color: DARK_GRAY,
    fontWeight: "700",
  },
  imagePreview: {
    marginTop: 10,
    width: "100%",
    height: 170,
    borderRadius: 12,
  },
  createButton: {
    marginTop: 20,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
  },
  createButtonText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 43, 43, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
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
  modalTitle: {
    fontSize: 18,
    color: DARK_GRAY,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalPrimaryButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: "center",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 5 },
  },
  modalPrimaryText: {
    color: WHITE,
    fontWeight: "700",
  },
  modalSecondaryButton: {
    backgroundColor: "#F6F6F4",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E4B76E",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 3 },
  },
  modalSecondaryText: {
    color: DARK_GRAY,
    fontWeight: "600",
  },
  modalCancelButton: {
    marginTop: 14,
    alignItems: "center",
  },
  modalCancelText: {
    color: TEXT_SECONDARY,
    fontWeight: "600",
  },
});

export default CreateChallenge;
