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
import { ResizeMode } from "expo-av";
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
import LoopingVideo from "../components/LoopingVideo";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useCreateChallengeMutation } from "../src/queries/events.queries";
import {
  challengeMediaPresets,
  getChallengeMediaPreset,
  type ChallengeMediaPresetId,
} from "../src/constants/challengeMediaPresets";

const normalizeDaysInput = (value: string) => value.replace(/\D+/g, "");
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
  const [selectedPresetId, setSelectedPresetId] =
    useState<ChallengeMediaPresetId>("challenge");
  const [challengeStartDate, setChallengeStartDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const activePreset = getChallengeMediaPreset(selectedPresetId);
  const parsedDays = days.trim() ? Number.parseInt(days, 10) : 0;
  const isFormReady =
    title.trim().length > 0 &&
    subtitle.trim().length > 0 &&
    Boolean(challengeStartDate) &&
    Number.isFinite(parsedDays) &&
    parsedDays > 0;

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedValue?: Date,
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
      selectedValue.getDate(),
    );
    nextDate.setHours(12, 0, 0, 0);
    setChallengeStartDate(nextDate);
  };

  const handleCreate = async () => {
    const missing: string[] = [];

    if (!title.trim()) missing.push("título");
    if (!subtitle.trim()) missing.push("descripción corta");
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
      Alert.alert("Sesión requerida", "Necesitás iniciar sesión para crear un desafío.");
      return;
    }

    const hostName =
      (typeof profile?.displayName === "string" && profile.displayName.trim()) ||
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
        imagePresetId: selectedPresetId,
        hostName,
        hostImage: null,
      });

      navigation.navigate(
        "Tab" as never,
        {
          screen: "Calendar",
          params: { section: "challenge" },
        } as never,
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
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.top}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="chevron-back" size={22} color={DARK_GRAY} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.title}>Crear desafío</Text>
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
              returnKeyType="next"
            />

            <Text style={localStyles.label}>Imagen y video del desafío</Text>
            <View style={localStyles.presetGrid}>
              {challengeMediaPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;

                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      localStyles.presetCard,
                      isSelected && localStyles.presetCardSelected,
                    ]}
                    onPress={() => setSelectedPresetId(preset.id)}
                  >
                    <View style={localStyles.presetImageWrap}>
                      <Image source={preset.image} style={localStyles.presetImage} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {activePreset ? (
              <View style={localStyles.videoPreviewCard}>
                <LoopingVideo
                  source={activePreset.video}
                  posterSource={activePreset.image}
                  style={localStyles.videoPreview}
                  resizeMode={ResizeMode.CONTAIN}
                />
              </View>
            ) : null}

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
              {createChallengeMutation.isPending ? "Creando..." : "Crear desafío"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
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
  descriptionInput: {
    minHeight: 92,
    lineHeight: 20,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  presetCard: {
    width: "31%",
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.08)",
    padding: 12,
    alignItems: "center",
  },
  presetCardSelected: {
    borderColor: "#E4B76E",
    backgroundColor: "rgba(228,183,110,0.12)",
  },
  presetImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  presetImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  videoPreviewCard: {
    marginTop: 12,
    width: "100%",
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F6F6F4",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.24)",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
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
    fontWeight: "600",
  },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.28)",
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
    fontWeight: "700",
    fontSize: 15,
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
});

export default CreateChallenge;
