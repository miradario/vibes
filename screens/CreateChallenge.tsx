import DiscoverPathCards from "../components/DiscoverPathCards";
import { readCommunities, canonicalCommunity } from "../src/lib/communities";
import * as ds from "../src/theme/tokens";

// Hidden for now: challenges are not filtered by community. Existing tags are kept when editing.
const SHOW_COMMUNITY_PICKER = false;
import ScreenContainer from "../components/ScreenContainer";
import {creationFormStyles} from "../src/theme/creationFormStyles";
import { launchAppCamera } from "../components/AppCamera";
import ChallengeDaysSection from "../components/challengeDays/ChallengeDaysSection";
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
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import {
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
  const [communities, setCommunities] = useState<string[]>(()=>readCommunities(editing?.tags));
  const [title, setTitle] = useState(editing?.title ?? "");
  const [subtitle, setSubtitle] = useState(editing?.description?.trim() ? editing.description : editing?.subtitle ?? "");
  const [days, setDays] = useState(editing?.durationDays ? String(editing.durationDays) : "");
  const [visibility, setVisibility] = useState<ChallengeVisibility>(editing?.visibility ?? "public");
  const [challengeStartDate, setChallengeStartDate] = useState<Date | null>(
    editing?.startsAt ? new Date(editing.startsAt) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [challengeImageUri, setChallengeImageUri] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const subtitleInputRef = useRef<TextInput>(null);
  const daysInputRef = useRef<TextInput>(null);
  const parsedDays = days.trim() ? Number.parseInt(days, 10) : 0;
  const isFormReady =
    title.trim().length > 0 &&
    subtitle.trim().length > 0 &&
    Boolean(challengeImageUri || editing?.image || editing?.imageUrl) &&
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
      const result = await launchAppCamera({
        cameraType: Platform.OS === "android" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
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
    if (createChallengeMutation.isPending || updateChallengeMutation.isPending) return;
    const missing: string[] = [];

    if (!title.trim()) missing.push("título");
    if (!subtitle.trim()) missing.push("descripción");
    if (!challengeImageUri && !editing?.image && !editing?.imageUrl) missing.push("foto de portada");
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
        tags: [...(editing?.tags ?? []).filter(tag=>!canonicalCommunity(tag)), ...communities],
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
      const createdChallenge = await createChallengeMutation.mutateAsync(input);
      navigation.dispatch(
        StackActions.replace("CreateChallenge", {
          event: createdChallenge,
          showDayContent: true,
        })
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
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={localStyles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <AppHeader
          title={editing ? "Editar desafío" : "Crear desafío"}
          showBack
          onBack={() => navigation.goBack()}
          style={[localStyles.fixedHeader,{paddingHorizontal:ds.spacing[6],marginHorizontal:0}]}
          titleStyle={localStyles.screenTitle}
        />

        <ScrollView
          style={{flex:1}}
          contentContainerStyle={[
            localStyles.content,
            { paddingBottom: ds.spacing[6] },
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
              {challengeImageUri || editing?.image || editing?.imageUrl ? (
                <>
                  <Image
                    source={challengeImageUri || editing?.imageUrl ? { uri: challengeImageUri || editing!.imageUrl! } : typeof editing?.image === "string" ? { uri: editing.image } : editing?.image}
                    style={localStyles.coverImage}
                  />
                  <View style={localStyles.coverScrim} />
                  <View style={localStyles.coverChangeBadge}>
                    <Icon name="camera-outline" size={ds.iconSize.sm} color={WHITE} />
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
                      size={ds.iconSize.xl}
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
              <Icon name="calendar" size={ds.iconSize.md} color={DARK_GRAY} />
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

            <Text style={localStyles.label}>Descripción</Text>
            <TextInput
              ref={subtitleInputRef}
              style={[localStyles.input, localStyles.descriptionInput]}
              placeholder="Contá el objetivo, cómo participar y qué van a hacer cada día."
              placeholderTextColor={TEXT_SECONDARY}
              value={subtitle}
              onChangeText={setSubtitle}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              submitBehavior="newline"
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

            <View style={localStyles.dayContentCard}>
              <View style={localStyles.dayContentIcon}>
                <Icon
                  name="calendar-outline"
                  size={ds.iconSize.lg}
                  color={PRIMARY_COLOR}
                />
              </View>
              <View style={localStyles.dayContentCopy}>
                <Text style={localStyles.dayContentTitle}>
                  Contenido de los días
                </Text>
                <Text style={localStyles.dayContentText}>
                  Agregá consignas, imágenes, audios y links de YouTube para
                  un día específico o para todos los días del desafío.
                </Text>
              </View>
              {!editing ? (
                <TouchableOpacity
                  style={[
                    localStyles.dayContentButton,
                    (!isFormReady || createChallengeMutation.isPending) &&
                      localStyles.createButtonDisabled,
                  ]}
                  onPress={handleCreate}
                  disabled={!isFormReady || createChallengeMutation.isPending}
                  activeOpacity={0.86}
                >
                  <Text style={localStyles.dayContentButtonText}>
                    {createChallengeMutation.isPending
                      ? "Guardando..."
                      : "Guardar y personalizar días"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {editing?.id ? (
              <View style={localStyles.dayContentEditor}>
                <ChallengeDaysSection
                  challengeId={editing.id}
                  totalDays={parsedDays}
                  currentDay={1}
                  isCreator
                  isJoined
                />
              </View>
            ) : null}

            {SHOW_COMMUNITY_PICKER ? <>
              <Text style={localStyles.label}>Comunidad</Text>
              <DiscoverPathCards selected={communities} onToggle={value=>setCommunities(previous=>previous.includes(value)?previous.filter(item=>item!==value):[...previous,value])} onClear={()=>setCommunities([])} />
            </> : null}
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
                        size={ds.iconSize.md}
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
                        size={ds.iconSize.md}
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
            { paddingBottom: Math.max(insets.bottom + ds.spacing[3], ds.spacing[8]) },
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
    </ScreenContainer>
  );
};

const legacyStyles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  screenTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.title,
  },
  fixedHeader: {
    paddingHorizontal: 0,
    marginHorizontal: ds.spacing[3],
    marginBottom: ds.spacing[1],
  },
  content: {
    paddingBottom: /* ds-lint-allow DS-TODO: paddingBottom 132 fuera de escala (>48), parece layout */ 132,
  },
  formCard: {
    backgroundColor: WHITE,
    marginTop: ds.spacing[4],
    borderRadius: ds.radii.lg,
    padding: ds.spacing[4],
    shadowColor: BLACK,
    shadowOpacity: ds.shadows.sm.shadowOpacity,
    shadowRadius: ds.shadows.sm.shadowRadius,
    shadowOffset: ds.shadows.sm.shadowOffset,
    elevation: ds.shadows.sm.elevation,
  },
  label: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitle,
    marginBottom: ds.spacing[2],
    marginTop: ds.spacing[3],
  },
  helperText: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.labelMedium,
    marginTop: -ds.spacing[1],
    marginBottom: ds.spacing[3],
  },
  input: {
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.md,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    color: DARK_GRAY,
    ...ds.textStyles.heading,
  },
  descriptionInput: {
    minHeight: 160,
    lineHeight: /* ds-lint-allow DS-TODO: lineHeight 25 suelto (sin fontSize en el mismo estilo) */ 25,
  },
  coverPicker: {
    marginTop: ds.spacing[2],
    height: 190,
    borderRadius: ds.radii.lg,
    overflow: "hidden",
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    justifyContent: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
  },
  coverChangeBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[2],
    borderRadius: ds.radii.pill,
    backgroundColor: /* ds-lint-allow DS-TODO: ink al 62%: no hay opacidad cercana (más cercana 0.45) */ "rgba(43, 43, 43, 0.62)",
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
  coverChangeText: {
    color: WHITE,
    ...ds.textStyles.labelMedium,
  },
  coverEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ds.spacing[8],
  },
  coverIconCircle: {
    width: 58,
    height: 58,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.bg.selected,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ds.spacing[4],
  },
  uploadImageTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
  },
  uploadImageHint: {
    marginTop: ds.spacing[2],
    color: TEXT_SECONDARY,
    ...ds.textStyles.labelMedium,
    textAlign: "center",
  },
  dateButton: {
    marginTop: ds.spacing[2],
    backgroundColor: WHITE,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  dateButtonText: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
  },
  datePickerWrap: {
    marginTop: ds.spacing[3],
    borderRadius: ds.radii.lg,
    overflow: "hidden",
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  visibilityStack: {
    gap: ds.spacing[3],
    marginTop: ds.spacing[1],
  },
  visibilityCard: {
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  visibilityCardSelected: {
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
    backgroundColor: ds.colors.bg.selected,
  },
  visibilityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.selected,
  },
  visibilityCopy: {
    flex: 1,
  },
  visibilityTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitle,
  },
  visibilitySubtitle: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.caption,
    marginTop: ds.spacing[1],
  },
  dayContentCard: {
    marginTop: ds.spacing[4],
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.strong),
    backgroundColor: ds.colors.feedback.infoBg,
    padding: ds.spacing[4],
    gap: ds.spacing[3],
  },
  dayContentIcon: {
    width: 42,
    height: 42,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    alignItems: "center",
    justifyContent: "center",
  },
  dayContentCopy: {
    gap: ds.spacing[1],
  },
  dayContentTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.heading,
  },
  dayContentText: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.labelMedium,
  },
  dayContentButton: {
    minHeight: 46,
    borderRadius: ds.radii.lg,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
  },
  dayContentButtonText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
    textAlign: "center",
  },
  dayContentEditor: {
    marginTop: ds.spacing[4],
  },
  createButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.xl,
    paddingVertical: ds.spacing[4],
    alignItems: "center",
    shadowOpacity: /* ds-lint-allow DS-TODO: sombra de color (PRIMARY_COLOR): ¿glow de marca o ds.shadows? */ 0.2,
    shadowRadius: /* ds-lint-allow DS-TODO: misma sombra de color */ 12,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: /* ds-lint-allow DS-TODO: misma sombra de color */ { width: 0, height: 6 },
  },
  createButtonDisabled: {
    opacity: 0.45,
  },
  createButtonText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
  fixedFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: ds.spacing[4],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[8],
    backgroundColor: ds.colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: ds.colors.border.subtle,
  },
  photoSheet: {
    backgroundColor: WHITE,
    paddingHorizontal: ds.spacing[4],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[4],
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.border.default,
    marginBottom: ds.spacing[4],
  },
  modalTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.heading,
    textAlign: "center",
    marginBottom: ds.spacing[4],
  },
  modalPrimaryButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.lg,
    paddingVertical: ds.spacing[4],
    alignItems: "center",
  },
  modalPrimaryText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  modalSecondaryButton: {
    marginTop: ds.spacing[3],
    backgroundColor: ds.colors.bg.selected,
    borderRadius: ds.radii.lg,
    paddingVertical: ds.spacing[4],
    alignItems: "center",
  },
  modalSecondaryText: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
  },
  modalCancelButton: {
    marginTop: ds.spacing[3],
    paddingVertical: ds.spacing[3],
    alignItems: "center",
  },
  modalCancelText: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.labelMedium,
  },
});

export default CreateChallenge;

const localStyles = {...legacyStyles, ...creationFormStyles};
