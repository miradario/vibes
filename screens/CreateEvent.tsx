/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import styles, {
  DARK_GRAY,
  TEXT_SECONDARY,
  WHITE,
  PRIMARY_COLOR,
  BLACK,
} from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useCreateEventMutation } from "../src/queries/events.queries";
import {
  challengeMediaPresets,
  type ChallengeMediaPresetId,
} from "../src/constants/challengeMediaPresets";

const IMAGE_MEDIA_TYPE =
  (ImagePicker as any).MediaType?.Images
    ? [(ImagePicker as any).MediaType.Images]
    : ["images"];

const formatEventDate = (value: Date) =>
  value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });

const formatEventTime = (value: Date) =>
  value.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatEventDateTime = (value: Date) =>
  `${formatEventDate(value)} · ${formatEventTime(value)}`;

const normalizeCapacityInput = (value: string) => value.replace(/\D+/g, "");

const CreateEvent = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const createEventMutation = useCreateEventMutation();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [eventDateTime, setEventDateTime] = useState<Date | null>(null);
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [eventImageUri, setEventImageUri] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] =
    useState<ChallengeMediaPresetId | null>("challenge");
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [validatedLocation, setValidatedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  const openDatePicker = () => {
    setPickerMode("date");
  };

  const openTimePicker = () => {
    setPickerMode("time");
  };

  const handleDateTimeChange = (
    event: DateTimePickerEvent,
    selectedValue?: Date,
  ) => {
    if (Platform.OS === "android") {
      setPickerMode(null);
    }

    if (event.type === "dismissed" || !selectedValue) {
      return;
    }

    const baseDate = eventDateTime ? new Date(eventDateTime) : new Date();

    if (pickerMode === "date") {
      baseDate.setFullYear(
        selectedValue.getFullYear(),
        selectedValue.getMonth(),
        selectedValue.getDate(),
      );
    }

    if (pickerMode === "time") {
      baseDate.setHours(selectedValue.getHours(), selectedValue.getMinutes(), 0, 0);
    }

    setEventDateTime(baseDate);
  };

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
        setEventImageUri(result.assets[0].uri);
        setSelectedPresetId(null);
      }
    } catch (error) {
      console.error("Error opening gallery for event image", error);
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
        setEventImageUri(result.assets[0].uri);
        setSelectedPresetId(null);
      }
    } catch (error) {
      console.error("Error opening camera for event image", error);
      Alert.alert("Error", "No se pudo abrir la cámara.");
    }
  };

  const handleValidateLocation = async () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      Alert.alert("Falta ubicación", "Ingresá una ubicación para validar.");
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      Alert.alert(
        "Falta API Key",
        "Definí EXPO_PUBLIC_GOOGLE_MAPS_API_KEY para validar con Google Maps.",
      );
      return;
    }

    setIsValidatingLocation(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmedLocation)}&key=${apiKey}`,
      );
      const data = await response.json();
      console.log("googleMaps:geocode:request", {
        address: trimmedLocation,
      });
      console.log("googleMaps:geocode:response", data);

      if (data?.status !== "OK" || !data?.results?.length) {
        Alert.alert(
          "Ubicación inválida",
          "No encontramos esa ubicación en Google Maps.",
        );
        setValidatedLocation(null);
        return;
      }

      const firstResult = data.results[0];
      setValidatedLocation({
        address: firstResult.formatted_address,
        lat: firstResult.geometry.location.lat,
        lng: firstResult.geometry.location.lng,
      });
      setLocation(firstResult.formatted_address);
      Alert.alert("Ubicación validada", firstResult.formatted_address);
    } catch (error) {
      console.error("Error validating location with Google Maps", error);
      Alert.alert("Error", "No se pudo validar la ubicación.");
      setValidatedLocation(null);
    } finally {
      setIsValidatingLocation(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !eventDateTime || !location.trim()) {
      Alert.alert(
        "Faltan datos",
        "Completá al menos título, fecha y ubicación.",
      );
      return;
    }

    if (!session?.user?.id) {
      Alert.alert("Sesión requerida", "Necesitás iniciar sesión para crear un evento.");
      return;
    }

    const parsedCapacity = capacity.trim() ? Number.parseInt(capacity, 10) : 0;
    const resolvedLocation = validatedLocation?.address || location.trim();
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
      await createEventMutation.mutateAsync({
        createdBy: session.user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || "Evento creado por la comunidad",
        description: subtitle.trim() || null,
        startsAt: eventDateTime.toISOString(),
        location: resolvedLocation,
        capacity: parsedCapacity,
        imageUri: eventImageUri,
        imagePresetId: eventImageUri ? null : selectedPresetId,
        hostName,
        hostImage,
      });

      navigation.navigate(
        "Tab" as never,
        {
          screen: "Events",
          params: { section: "event" },
        } as never,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el evento.";
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
            <Text style={styles.title}>Crear evento</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        <View style={localStyles.formCard}>
          <Text style={localStyles.label}>Título</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Ej: Meditación de luna llena"
            placeholderTextColor={TEXT_SECONDARY}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={localStyles.label}>Imagen y video del evento</Text>
          <View style={localStyles.presetGrid}>
            {challengeMediaPresets.map((preset) => {
              const isSelected =
                !eventImageUri && selectedPresetId === preset.id;

              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    localStyles.presetCard,
                    isSelected && localStyles.presetCardSelected,
                  ]}
                  onPress={() => {
                    setEventImageUri(null);
                    setSelectedPresetId(preset.id);
                  }}
                >
                  <View style={localStyles.presetImageWrap}>
                    <Image source={preset.image} style={localStyles.presetImage} />
                  </View>
                  <Text style={localStyles.presetLabel}>{preset.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={localStyles.imagePickerButton}
            onPress={() => setPhotoModalVisible(true)}
          >
            <Icon name="image" size={16} color={WHITE} />
            <Text style={localStyles.imagePickerButtonText}>
              {eventImageUri ? "Cambiar imagen" : "Subir imagen"}
            </Text>
          </TouchableOpacity>
          <Image
            source={
              eventImageUri
                ? { uri: eventImageUri }
                : challengeMediaPresets.find(
                    (preset) => preset.id === selectedPresetId,
                  )?.image || require("../assets/images/events/event_meditation2.png")
            }
            style={localStyles.imagePreview}
          />

          <Text style={localStyles.label}>Descripción corta</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Ej: Respiración, calma, conexión"
            placeholderTextColor={TEXT_SECONDARY}
            value={subtitle}
            onChangeText={setSubtitle}
          />

          <Text style={localStyles.label}>Fecha y hora</Text>
          <View style={localStyles.dateTimeRow}>
            <TouchableOpacity
              style={localStyles.dateTimeButton}
              onPress={openDatePicker}
            >
              <Icon name="calendar" size={16} color={TEXT_SECONDARY} />
              <Text
                style={[
                  localStyles.dateTimeButtonText,
                  !eventDateTime && localStyles.dateTimePlaceholder,
                ]}
              >
                {eventDateTime ? formatEventDate(eventDateTime) : "Seleccionar fecha"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={localStyles.dateTimeButton}
              onPress={openTimePicker}
            >
              <Icon name="time" size={16} color={TEXT_SECONDARY} />
              <Text
                style={[
                  localStyles.dateTimeButtonText,
                  !eventDateTime && localStyles.dateTimePlaceholder,
                ]}
              >
                {eventDateTime ? formatEventTime(eventDateTime) : "Seleccionar hora"}
              </Text>
            </TouchableOpacity>
          </View>
          {eventDateTime ? (
            <Text style={localStyles.selectedDateTimeText}>
              {formatEventDateTime(eventDateTime)}
            </Text>
          ) : null}
          {pickerMode ? (
            <View style={localStyles.pickerWrap}>
              <DateTimePicker
                value={eventDateTime ?? new Date()}
                mode={pickerMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={pickerMode === "date" ? new Date() : undefined}
                onChange={handleDateTimeChange}
                is24Hour
              />
              {Platform.OS === "ios" ? (
                <TouchableOpacity
                  style={localStyles.pickerDoneButton}
                  onPress={() => setPickerMode(null)}
                >
                  <Text style={localStyles.pickerDoneText}>Listo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <Text style={localStyles.label}>Ubicación</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Ej: Palermo, Buenos Aires"
            placeholderTextColor={TEXT_SECONDARY}
            value={location}
            onChangeText={(value) => {
              setLocation(value);
              setValidatedLocation(null);
            }}
          />
          <TouchableOpacity
            style={localStyles.validateButton}
            onPress={handleValidateLocation}
            disabled={isValidatingLocation}
          >
            {isValidatingLocation ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={localStyles.validateButtonText}>Validar ubicación</Text>
            )}
          </TouchableOpacity>
          {validatedLocation ? (
            <Text style={localStyles.validatedText}>
              Ubicación válida: {validatedLocation.address}
            </Text>
          ) : null}

          <Text style={localStyles.label}>Cupos</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Ej: 20"
            placeholderTextColor={TEXT_SECONDARY}
            value={capacity}
            onChangeText={(value) => setCapacity(normalizeCapacityInput(value))}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={localStyles.createButton}
          onPress={handleCreate}
          disabled={createEventMutation.isPending}
        >
          <Text style={localStyles.createButtonText}>
            {createEventMutation.isPending ? "Creando..." : "Crear evento"}
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
            <Text style={localStyles.modalTitle}>Imagen del evento</Text>
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
  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateTimeButtonText: {
    color: DARK_GRAY,
    fontSize: 14,
  },
  dateTimePlaceholder: {
    color: TEXT_SECONDARY,
  },
  selectedDateTimeText: {
    marginTop: 8,
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: "600",
  },
  pickerWrap: {
    marginTop: 10,
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    overflow: "hidden",
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerDoneText: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
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
  validateButton: {
    marginTop: 10,
    backgroundColor: "#F6F6F4",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E4B76E",
    paddingVertical: 10,
    alignItems: "center",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 3 },
  },
  validateButtonText: {
    color: DARK_GRAY,
    fontWeight: "700",
  },
  validatedText: {
    marginTop: 8,
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: "600",
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
  presetImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  presetImage: {
    width: 56,
    height: 56,
    resizeMode: "contain",
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

export default CreateEvent;
