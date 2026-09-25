/** @format */

import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
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
import { useCreateChallengeMutation, useUpdateChallengeMutation, type EventFeedItem } from "../src/queries/events.queries";
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
  const route = useRoute<any>();
  const editing = route.params?.event as EventFeedItem | undefined;
  const insets = useSafeAreaInsets();
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const createChallengeMutation = useCreateChallengeMutation();
  const updateChallengeMutation = useUpdateChallengeMutation();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [subtitle, setSubtitle] = useState(editing?.description ?? editing?.subtitle ?? "");
  const [days, setDays] = useState(editing?.durationDays ? String(editing.durationDays) : "");
  const [visibility, setVisibility] = useState<ChallengeVisibility>(editing?.visibility ?? "public");
  const [challengeStartDate, setChallengeStartDate] = useState<Date | null>(
    editing?.startsAt ? new Date(editing.startsAt) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [challengeImageUri, setChallengeImageUri] = useState<string | null>(
    editing?.imageUrl && /^https?:\/\//i.test(editing.imageUrl) ? editing.imageUrl : null
  );
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const subtitleInputRef = useRef<TextInput>(null);
  const daysInputRef = useRef<TextInput>(null);
  const parsedDays = days.trim() ? Number.parseInt(days, 10) : 0;
  const isFormReady =
    title.trim().length > 0 &&
    subtitle.trim().length > 0 &&
    Boolean(challengeImageUri || editing?.image) &&
    Boolean(challengeStartDate || editing) &&
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
        cameraType: ImagePicker.CameraType.back,
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
    requestAnimationFrame(() => setShowDatePicker(true));
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
    if (!challengeImageUri && !editing?.image) missing.push("foto de portada");
    if (!challengeStartDate && !editing) missing.push("fecha de comienzo");

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
      const input = {
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
      };
      if (editing) {
        await updateChallengeMutation.mutateAsync({ ...input, id: editing.id });
        navigation.goBack();
        return;
      }
      await createChallengeMutation.mutateAsync(input);

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
        <AppHeader
          title={editing ? "Editar desafío" : "Crear desafío"}
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.fixedHeader}
          titleStyle={localStyles.screenTitle}
        />

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
          <View style={localStyles.formCard}>
            <Text style={localStyles.label}>Título</Text>
            <TextInput
              ref={titleInputRef}
              style={localStyles.input}
              placeholder="Ej: 21 días de gratitud"
              placeholderTextColor={TEXT_SECONDARY}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => subtitleInputRef.current?.focus()}
            />

            <Text style={localStyles.label}>Foto de portada</Text>
            <TouchableOpacity
              style={localStyles.coverPicker}
              activeOpacity={0.88}
              onPress={() => setPhotoModalVisible(true)}
            >
              {challengeImageUri || editing?.image ? (
                <>
                  <Image
                    source={challengeImageUri ? { uri: challengeImageUri } : typeof editing?.image === "string" ? { uri: editing.image } : editing?.image}
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

            {editing ? <Text style={localStyles.uploadImageHint}>La fecha y la duración se conservan para mantener el progreso de los participantes.</Text> : null}
            <Text style={localStyles.label}>Fecha de comienzo</Text>
            <TouchableOpacity
              style={localStyles.dateButton}
              onPress={openDatePicker}
              disabled={Boolean(editing)}
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
                  display={Platform.OS === "ios" ? "spinner" : "default"}
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
              ref={subtitleInputRef}
              style={[localStyles.input, localStyles.descriptionInput]}
              placeholder="Ej: Un hábito diario para sostener en comunidad"
              placeholderTextColor={TEXT_SECONDARY}
              value={subtitle}
              onChangeText={setSubtitle}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => daysInputRef.current?.focus()}
            />

            <Text style={localStyles.label}>Duración en días</Text>
            <TextInput
              ref={daysInputRef}
                editable={!editing}
              style={localStyles.input}
              placeholder="Ej: 21"
              placeholderTextColor={TEXT_SECONDARY}
              value={days}
              onChangeText={(value) => setDays(normalizeDaysInput(value))}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
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
              (!isFormReady || (createChallengeMutation.isPending || updateChallengeMutation.isPending)) &&
                localStyles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!isFormReady || (createChallengeMutation.isPending || updateChallengeMutation.isPending)}
          >
            <Text style={localStyles.createButtonText}>
              {(createChallengeMutation.isPending || updateChallengeMutation.isPending)
                ? "Guardando..."
                : editing ? "Guardar cambios" : "Crear desafío"}
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
    fontSize: 28,
    lineHeight: 32,
    fontFamily: vibesTheme.fonts.semibold,
  },
  fixedHeader: {
    paddingHorizontal: 0,
    marginHorizontal: 10,
    marginBottom: 4,
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
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.semibold,
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
    backgroundColor: vibesTheme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: vibesTheme.fonts.regular,
  },
  descriptionInput: {
    minHeight: 92,
    lineHeight: 23,
  },
  coverPicker: {
    marginTop: 6,
    height: 190,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    justifyContent: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43, 43, 43, 0.18)",
  },
  coverChangeBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(43, 43, 43, 0.62)",
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
    borderColor: "rgba(43, 43, 43, 0.08)",
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
    backgroundColor: vibesTheme.colors.background,
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
    borderColor: "rgba(43, 43, 43, 0.08)",
    backgroundColor: vibesTheme.colors.background,
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
    fontSize: 17,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.bold,
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
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.semibold,
  },
  fixedFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: "rgba(254, 254, 253, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(43, 43, 43, 0.08)",
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
    backgroundColor: "rgba(43, 43, 43, 0.14)",
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
    color: vibesTheme.colors.primaryText,
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
