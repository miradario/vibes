/** @format */

import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useCreateChallengeMutation } from "../src/queries/events.queries";
import {
  challengeMediaPresets,
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
    try {
      await createChallengeMutation.mutateAsync({
        createdBy: session.user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || "Challenge creado por la comunidad",
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
          screen: "Soulmates",
          params: { section: "challenge" },
        } as never,
      );
    } catch (error) {
      console.log("createChallenge:error", error);
      const fallback = "No se pudo crear el challenge.";
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

          <Text style={localStyles.label}>Imagen y video del challenge</Text>
          <View style={localStyles.presetGrid}>
            {challengeMediaPresets.map((preset) => {
              const isSelected = selectedPresetId === preset.id;

              return (
                <Pressable
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
                  <Text style={localStyles.presetLabel}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Image
            source={
              challengeMediaPresets.find(
                (preset) => preset.id === selectedPresetId,
              )?.image
            }
            style={localStyles.imagePreview}
          />

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
            <DateTimePicker
              value={challengeStartDate ?? new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          ) : null}

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
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  presetCard: {
    width: "48%",
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
    width: 56,
    height: 56,
    resizeMode: "contain",
  },
  presetImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  presetLabel: {
    color: DARK_GRAY,
    fontWeight: "600",
    fontSize: 14,
  },
  imagePreview: {
    marginTop: 10,
    width: "100%",
    height: 170,
    borderRadius: 12,
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
});

export default CreateChallenge;
