/** @format */

import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import styles, {
  BLACK,
  DARK_GRAY,
  PRIMARY_COLOR,
  TEXT_SECONDARY,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useCreateChallengeMutation } from "../src/queries/events.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import type { ChallengeVisibility } from "../src/queries/events.queries";

const VISIBILITY_OPTIONS: Array<{
  value: ChallengeVisibility;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  {
    value: "public",
    title: "Público",
    subtitle: "Cualquiera lo puede descubrir y unirse",
    icon: "earth-outline",
  },
  {
    value: "friends",
    title: "Solo amigos",
    subtitle: "Visible para tus conexiones",
    icon: "people-outline",
  },
  {
    value: "private",
    title: "Privado",
    subtitle: "Un espacio íntimo y personal",
    icon: "lock-closed-outline",
  },
];

const normalizeDaysInput = (value: string) => value.replace(/\D+/g, "");
const IMAGE_MEDIA_TYPE = (ImagePicker as any).MediaType?.Images
  ? [(ImagePicker as any).MediaType.Images]
  : ["images"];
const formatChallengeDate = (value: Date) =>
  value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const CreateChallenge = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const createChallengeMutation = useCreateChallengeMutation();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [days, setDays] = useState("");
  const [visibility, setVisibility] = useState<ChallengeVisibility>("public");
  const [challengeStartDate, setChallengeStartDate] = useState<Date | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [challengeImageUri, setChallengeImageUri] = useState<string | null>(
    null
  );
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const parsedDays = days.trim() ? Number.parseInt(days, 10) : 0;
  const isFormReady =
    title.trim().length > 0 &&
    subtitle.trim().length > 0 &&
    Boolean(challengeImageUri) &&
    Boolean(challengeStartDate) &&
    Number.isFinite(parsedDays) &&
    parsedDays > 0;

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
        aspect: [16, 9],
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
        aspect: [16, 9],
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

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedValue?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedValue) {
      return;
    }

    const nextDate = challengeStartDate
      ? new Date(challengeStartDate)
      : new Date();

    nextDate.setFullYear(
      selectedValue.getFullYear(),
      selectedValue.getMonth(),
      selectedValue.getDate()
    );
    nextDate.setHours(12, 0, 0, 0);
    setChallengeStartDate(nextDate);
  };

  const handleCreate = async () => {
    const missing: string[] = [];

    if (!title.trim()) missing.push("título");
    if (!subtitle.trim()) missing.push("descripción corta");
    if (!challengeImageUri) missing.push("foto de portada");
    if (!challengeStartDate) missing.push("fecha de comienzo");

    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      missing.push("duración en días");
    }

    if (missing.length > 0) {
      const fields = missing.join(", ");
      Alert.alert("Faltan datos", `Completá: ${fields}.`);
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(
        "Sesión requerida",
        "Necesitás iniciar sesión para crear un desafío."
      );
      return;
    }

    const hostName =
      (typeof profile?.displayName === "string" &&
        profile.displayName.trim()) ||
      session.user.email?.split("@")[0] ||
      null;
    try {
      await createChallengeMutation.mutateAsync({
        createdBy: session.user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || "Desafío creado por la comunidad",
        description: subtitle.trim() || null,
        durationDays: parsedDays,
        startsAt: challengeStartDate?.toISOString() ?? null,
        imageUri: challengeImageUri,
        imagePresetId: null,
        hostName,
        hostImage: null,
        visibility,
      });

      navigation.navigate(
        "Tab" as never,
        {
          screen: "Flow",
          params: { section: "challenge" },
        } as never
      );
    } catch (error) {
      console.log("createChallenge:error", error);
      const fallback = "No se pudo crear el desafío.";
      const message =
        error instanceof Error
          ? error.message || fallback
          : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message || fallback)
          : fallback;
      const details =
        typeof error === "object" && error !== null && "details" in error
          ? String((error as { details?: unknown }).details || "")
          : "";
      const hint =
        typeof error === "object" && error !== null && "hint" in error
          ? String((error as { hint?: unknown }).hint || "")
          : "";
      Alert.alert("Error", [message, details, hint].filter(Boolean).join("\n"));
    }
  };

  return (
    <SafeAreaView style={styles.bg} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={localStyles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Math.max(insets.top - 8, 0)}
      >
        <ScrollView
          style={styles.editContainer}
          contentContainerStyle={[
            localStyles.content,
            { paddingBottom: 132 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          contentInsetAdjustmentBehavior="automatic"
        >
          <AppHeader
            title="Crear desafío"
            showBack
            onBack={() => navigation.goBack()}
            style={styles.top}
            titleStyle={localStyles.screenTitle}
          />

          <View style={localStyles.formCard}>
            <Text style={localStyles.label}>Título</Text>
            <TextInput
              style={localStyles.input}
              placeholder="Ej: 21 días de gratitud"
              placeholderTextColor={TEXT_SECONDARY}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            <Text style={localStyles.label}>Foto de portada</Text>
            <TouchableOpacity
              style={localStyles.coverPicker}
              activeOpacity={0.88}
              onPress={() => setPhotoModalVisible(true)}
            >
              {challengeImageUri ? (
                <>
                  <Image
                    source={{ uri: challengeImageUri }}
                    style={localStyles.coverImage}
                  />
                  <View style={localStyles.coverScrim} />
                  <View style={localStyles.coverChangeBadge}>
                    <Icon name="camera-outline" size={17} color={WHITE} />
                    <Text style={localStyles.coverChangeText}>
                      Cambiar portada
                    </Text>
                  </View>
                </>
              ) : (
                <View style={localStyles.coverEmptyState}>
                  <View style={localStyles.coverIconCircle}>
                    <Icon
                      name="image-outline"
                      size={28}
                      color={PRIMARY_COLOR}
                    />
                  </View>
                  <Text style={localStyles.uploadImageTitle}>
                    Subir foto de portada
                  </Text>
                  <Text style={localStyles.uploadImageHint}>
                    Elegí una foto horizontal de tu galería o sacá una ahora
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={localStyles.label}>Fecha de comienzo</Text>
            <TouchableOpacity
              style={localStyles.dateButton}
              onPress={openDatePicker}
            >
              <Icon name="calendar" size={18} color={DARK_GRAY} />
              <Text style={localStyles.dateButtonText}>
                {challengeStartDate
                  ? formatChallengeDate(challengeStartDate)
                  : "Seleccionar fecha"}
              </Text>
            </TouchableOpacity>
            {showDatePicker ? (
              <View style={localStyles.datePickerWrap}>
                <DateTimePicker
                  value={challengeStartDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  accentColor={PRIMARY_COLOR}
                  textColor={DARK_GRAY}
                  themeVariant="light"
                />
              </View>
            ) : null}

            <Text style={localStyles.label}>Descripción corta</Text>
            <TextInput
              style={[localStyles.input, localStyles.descriptionInput]}
              placeholder="Ej: Un hábito diario para sostener en comunidad"
              placeholderTextColor={TEXT_SECONDARY}
              value={subtitle}
              onChangeText={setSubtitle}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              returnKeyType="default"
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

            <Text style={localStyles.label}>Quién puede verlo</Text>
            <Text style={localStyles.helperText}>
              Elegí si querés abrirlo a la comunidad, compartirlo con tus
              conexiones o sostenerlo sólo para vos.
            </Text>
            <View style={localStyles.visibilityStack}>
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = visibility === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      localStyles.visibilityCard,
                      isSelected && localStyles.visibilityCardSelected,
                    ]}
                    onPress={() => setVisibility(option.value)}
                    activeOpacity={0.9}
                  >
                    <View style={localStyles.visibilityIconWrap}>
                      <Icon
                        name={option.icon as any}
                        size={18}
                        color={isSelected ? PRIMARY_COLOR : DARK_GRAY}
                      />
                    </View>
                    <View style={localStyles.visibilityCopy}>
                      <Text style={localStyles.visibilityTitle}>
                        {option.title}
                      </Text>
                      <Text style={localStyles.visibilitySubtitle}>
                        {option.subtitle}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Icon
                        name="checkmark-circle"
                        size={20}
                        color={PRIMARY_COLOR}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            localStyles.fixedFooter,
            { paddingBottom: Math.max(insets.bottom + 12, 28) },
          ]}
        >
          <TouchableOpacity
            style={[
              localStyles.createButton,
              (!isFormReady || createChallengeMutation.isPending) &&
                localStyles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!isFormReady || createChallengeMutation.isPending}
          >
            <Text style={localStyles.createButtonText}>
              {createChallengeMutation.isPending
                ? "Creando..."
                : "Crear desafío"}
            </Text>
          </TouchableOpacity>
        </View>

        <AnimatedSheetModal
          visible={photoModalVisible}
          onClose={() => setPhotoModalVisible(false)}
          offsetY={300}
          sheetStyle={localStyles.photoSheet}
        >
          <View style={localStyles.sheetHandle} />
          <Text style={localStyles.modalTitle}>Foto de portada</Text>
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
            <Text style={localStyles.modalSecondaryText}>
              Elegir de galería
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.modalCancelButton}
            onPress={() => setPhotoModalVisible(false)}
          >
            <Text style={localStyles.modalCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </AnimatedSheetModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  screenTitle: {
    color: DARK_GRAY,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: vibesTheme.fonts.thin,
  },
  content: {
    paddingBottom: 132,
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
    fontFamily: vibesTheme.fonts.medium,
    marginBottom: 8,
    marginTop: 12,
  },
  helperText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -2,
    marginBottom: 10,
    fontFamily: vibesTheme.fonts.medium,
  },
  input: {
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
  },
  descriptionInput: {
    minHeight: 92,
    lineHeight: 20,
  },
  coverPicker: {
    marginTop: 6,
    height: 190,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F6F6F4",
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.08)",
    justifyContent: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 17, 15, 0.18)",
  },
  coverChangeBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(20, 17, 15, 0.62)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coverChangeText: {
    color: WHITE,
    fontSize: 13,
    fontFamily: vibesTheme.fonts.medium,
  },
  coverEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  coverIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(228, 183, 110, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  uploadImageTitle: {
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  uploadImageHint: {
    marginTop: 6,
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
  },
  dateButton: {
    marginTop: 6,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateButtonText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.28)",
  },
  visibilityStack: {
    gap: 10,
    marginTop: 4,
  },
  visibilityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.08)",
    backgroundColor: "#FFFDF8",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  visibilityCardSelected: {
    borderColor: "rgba(228, 183, 110, 0.42)",
    backgroundColor: "rgba(228, 183, 110, 0.10)",
  },
  visibilityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.12)",
  },
  visibilityCopy: {
    flex: 1,
  },
  visibilityTitle: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.thin,
  },
  visibilitySubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  createButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
  },
  createButtonDisabled: {
    opacity: 0.45,
  },
  createButtonText: {
    color: WHITE,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  fixedFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: "rgba(251, 247, 244, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(43,43,43,0.08)",
  },
  photoSheet: {
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(43,43,43,0.14)",
    marginBottom: 14,
  },
  modalTitle: {
    color: DARK_GRAY,
    fontSize: 20,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
    marginBottom: 18,
  },
  modalPrimaryButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: WHITE,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  modalSecondaryButton: {
    marginTop: 10,
    backgroundColor: "rgba(228, 183, 110, 0.14)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: DARK_GRAY,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
});

export default CreateChallenge;
