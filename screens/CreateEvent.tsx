/** @format */

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Modal,
  Platform,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { ResizeMode } from "expo-av";
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
import AppHeader from "../components/AppHeader";
import VibesLoader from "../components/VibesLoader";
import LoopingVideo from "../components/LoopingVideo";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import {
  useCreateEventMutation,
  type EventModality,
  type EventPricingType,
  useUpdateEventMutation,
} from "../src/queries/events.queries";
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

const getStaticMapPreviewUrl = (
  lat: number,
  lng: number,
  apiKey: string,
) =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=800x360&scale=2&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${apiKey}`;

const normalizeExternalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isValidExternalUrl = (value: string) => {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const getMissingEventFields = (params: {
  title: string;
  subtitle: string;
  eventDateTime: Date | null;
  location: string;
  pricingType: EventPricingType;
  paymentLink: string;
  modality: EventModality;
  onlineLink: string;
  capacity: string;
  hasSelectedImage: boolean;
}) => {
  const missing: string[] = [];

  if (!params.title.trim()) missing.push("título");
  if (!params.subtitle.trim()) missing.push("descripción corta");
  if (!params.eventDateTime) missing.push("fecha y hora");
  if (params.modality === "in_person" && !params.location.trim()) {
    missing.push("ubicación");
  }
  if (params.modality === "online" && !params.onlineLink.trim()) {
    missing.push("link online");
  }
  if (params.pricingType === "paid" && !params.paymentLink.trim()) {
    missing.push("link de pago");
  }
  if (!params.capacity.trim()) missing.push("cupos");
  if (!params.hasSelectedImage) missing.push("imagen");

  return missing;
};

const getInvalidEventLinks = (params: {
  eventLink: string;
  pricingType: EventPricingType;
  paymentLink: string;
  modality: EventModality;
  onlineLink: string;
}) => {
  const invalid: string[] = [];

  if (params.eventLink.trim() && !isValidExternalUrl(params.eventLink)) {
    invalid.push("link del evento");
  }
  if (
    params.pricingType === "paid" &&
    params.paymentLink.trim() &&
    !isValidExternalUrl(params.paymentLink)
  ) {
    invalid.push("link de pago");
  }
  if (
    params.modality === "online" &&
    params.onlineLink.trim() &&
    !isValidExternalUrl(params.onlineLink)
  ) {
    invalid.push("link online");
  }

  return invalid;
};

const CreateEvent = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const editingEvent = route?.params?.event ?? null;
  const isEditing = Boolean(editingEvent?.id);
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const createEventMutation = useCreateEventMutation();
  const updateEventMutation = useUpdateEventMutation();
  const [title, setTitle] = useState(
    typeof editingEvent?.title === "string" ? editingEvent.title : "",
  );
  const [subtitle, setSubtitle] = useState(
    typeof editingEvent?.description === "string" && editingEvent.description.trim()
      ? editingEvent.description
      : typeof editingEvent?.subtitle === "string"
        ? editingEvent.subtitle
        : "",
  );
  const [eventDateTime, setEventDateTime] = useState<Date | null>(() => {
    if (typeof editingEvent?.startsAt === "string" && editingEvent.startsAt.trim()) {
      const parsed = new Date(editingEvent.startsAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  });
  const [capacity, setCapacity] = useState(
    typeof editingEvent?.capacity === "number" && editingEvent.capacity > 0
      ? String(editingEvent.capacity)
      : "",
  );
  const [eventLink, setEventLink] = useState(
    typeof editingEvent?.eventLink === "string" ? editingEvent.eventLink : "",
  );
  const [pricingType, setPricingType] = useState<EventPricingType>(
    editingEvent?.pricingType === "paid" ? "paid" : "free",
  );
  const [paymentLink, setPaymentLink] = useState(
    typeof editingEvent?.paymentLink === "string" ? editingEvent.paymentLink : "",
  );
  const [modality, setModality] = useState<EventModality>(
    editingEvent?.modality === "online" ? "online" : "in_person",
  );
  const [onlineLink, setOnlineLink] = useState(
    typeof editingEvent?.onlineLink === "string" ? editingEvent.onlineLink : "",
  );
  const [location, setLocation] = useState(
    typeof editingEvent?.location === "string" ? editingEvent.location : "",
  );
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [eventImageUri, setEventImageUri] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] =
    useState<ChallengeMediaPresetId | null>(
      editingEvent
        ? editingEvent?.imagePresetId ?? null
        : "challenge",
    );
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [validatedLocation, setValidatedLocation] = useState<{
    address: string;
    lat: number | null;
    lng: number | null;
  } | null>(null);
  const [mapPreviewFailed, setMapPreviewFailed] = useState(false);
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const activePreset =
    challengeMediaPresets.find((preset) => preset.id === selectedPresetId) ??
    null;
  const hasSelectedImage = Boolean(
    eventImageUri || editingEvent?.imageUrl || activePreset?.image,
  );
  const missingFields = getMissingEventFields({
    title,
    subtitle,
    eventDateTime,
    location,
    pricingType,
    paymentLink,
    modality,
    onlineLink,
    capacity,
    hasSelectedImage,
  });
  const invalidLinks = getInvalidEventLinks({
    eventLink,
    pricingType,
    paymentLink,
    modality,
    onlineLink,
  });
  const isFormComplete = missingFields.length === 0;

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

    const useManualLocationFallback = (message: string) => {
      setValidatedLocation({
        address: trimmedLocation,
        lat: null,
        lng: null,
      });
      setMapPreviewFailed(false);
      Alert.alert("Ubicación guardada", message);
    };

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      useManualLocationFallback(
        "Google Maps no está configurado. Vamos a usar la ubicación escrita manualmente.",
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

      if (
        data?.status === "REQUEST_DENIED" ||
        typeof data?.error_message === "string"
      ) {
        useManualLocationFallback(
          "La API de Google Maps no está habilitada para este proyecto. Vamos a usar la ubicación escrita manualmente.",
        );
        return;
      }

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
      setMapPreviewFailed(false);
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
    if (!isFormComplete) {
      Alert.alert(
        "Faltan datos",
        `Completá: ${missingFields.join(", ")}.`,
      );
      return;
    }

    if (invalidLinks.length > 0) {
      Alert.alert(
        "Links inválidos",
        `Revisá: ${invalidLinks.join(", ")}.`,
      );
      return;
    }

    if (!session?.user?.id) {
      Alert.alert("Sesión requerida", "Necesitás iniciar sesión para crear un evento.");
      return;
    }

    const resolvedStartsAt = eventDateTime?.toISOString();
    if (!resolvedStartsAt) {
      Alert.alert("Falta fecha", "Elegí una fecha y hora para el evento.");
      return;
    }

    const parsedCapacity = capacity.trim() ? Number.parseInt(capacity, 10) : 0;
    const resolvedLocation =
      modality === "in_person"
        ? validatedLocation?.address || location.trim()
        : null;
    const resolvedEventLink = eventLink.trim()
      ? normalizeExternalUrl(eventLink)
      : null;
    const resolvedPaymentLink =
      pricingType === "paid" ? normalizeExternalUrl(paymentLink) : null;
    const resolvedOnlineLink =
      modality === "online" ? normalizeExternalUrl(onlineLink) : null;
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
      let savedEvent;
      if (isEditing) {
        savedEvent = await updateEventMutation.mutateAsync({
          eventId: editingEvent.id,
          title: title.trim(),
          subtitle: subtitle.trim() || "Evento creado por la comunidad",
          description: subtitle.trim() || null,
          startsAt: resolvedStartsAt,
          location: resolvedLocation,
          eventLink: resolvedEventLink,
          pricingType,
          paymentLink: resolvedPaymentLink,
          modality,
          onlineLink: resolvedOnlineLink,
          capacity: parsedCapacity,
          imageUri: eventImageUri || editingEvent.imageUrl || null,
          imagePresetId: eventImageUri ? null : selectedPresetId,
        });
      } else {
        savedEvent = await createEventMutation.mutateAsync({
          createdBy: session.user.id,
          title: title.trim(),
          subtitle: subtitle.trim() || "Evento creado por la comunidad",
          description: subtitle.trim() || null,
          startsAt: resolvedStartsAt,
          location: resolvedLocation,
          eventLink: resolvedEventLink,
          pricingType,
          paymentLink: resolvedPaymentLink,
          modality,
          onlineLink: resolvedOnlineLink,
          capacity: parsedCapacity,
          imageUri: eventImageUri,
          imagePresetId: eventImageUri ? null : selectedPresetId,
          hostName,
          hostImage,
        });
      }

      if (isEditing) {
        navigation.navigate(
          "EventDetail" as never,
          { event: savedEvent } as never,
        );
      } else {
        navigation.navigate(
          "Tab" as never,
          {
            screen: "Events",
            params: { section: "event" },
          } as never,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el evento.";
      Alert.alert("Error", message);
    }
  };

  const handleOpenValidatedLocation = async () => {
    const target = validatedLocation?.address || location.trim();
    if (!target) return;

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;

    try {
      await Linking.openURL(mapsUrl);
    } catch {
      Alert.alert("Mapa", "No se pudo abrir el mapa.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.bg}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <View style={styles.bg}>
      <ScrollView
        style={styles.editContainer}
        contentContainerStyle={localStyles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <AppHeader
          title={isEditing ? "Editar evento" : "Crear evento"}
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.header}
          titleStyle={styles.title}
        />

        <View style={localStyles.formCard}>
          <Text style={localStyles.label}>Título</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Meditación de luna llena"
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

          <Text style={localStyles.label}>Descripción corta</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Respiración, calma, conexión"
            placeholderTextColor={TEXT_SECONDARY}
            value={subtitle}
            onChangeText={setSubtitle}
          />

          <Text style={localStyles.label}>Link del evento</Text>
          <TextInput
            style={localStyles.input}
            placeholder="https://mipagina.com/evento"
            placeholderTextColor={TEXT_SECONDARY}
            value={eventLink}
            onChangeText={setEventLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
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
                numberOfLines={1}
              >
                {eventDateTime ? formatEventDate(eventDateTime) : "Fecha"}
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
                numberOfLines={1}
              >
                {eventDateTime ? formatEventTime(eventDateTime) : "Hora"}
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

          <Text style={localStyles.label}>Tipo de evento</Text>
          <View style={localStyles.choiceRow}>
            <TouchableOpacity
              style={[
                localStyles.choiceChip,
                modality === "in_person" && localStyles.choiceChipActive,
              ]}
              onPress={() => setModality("in_person")}
            >
              <Text
                style={[
                  localStyles.choiceChipText,
                  modality === "in_person" && localStyles.choiceChipTextActive,
                ]}
              >
                Presencial
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                localStyles.choiceChip,
                modality === "online" && localStyles.choiceChipActive,
              ]}
              onPress={() => {
                setModality("online");
                setValidatedLocation(null);
                setMapPreviewFailed(false);
              }}
            >
              <Text
                style={[
                  localStyles.choiceChipText,
                  modality === "online" && localStyles.choiceChipTextActive,
                ]}
              >
                Online
              </Text>
            </TouchableOpacity>
          </View>

          {modality === "in_person" ? (
            <>
              <Text style={localStyles.label}>Ubicación</Text>
              <TextInput
                style={localStyles.input}
                placeholder="Palermo, Buenos Aires"
                placeholderTextColor={TEXT_SECONDARY}
                value={location}
                onChangeText={(value) => {
                  setLocation(value);
                  setValidatedLocation(null);
                  setMapPreviewFailed(false);
                }}
              />
              <TouchableOpacity
                style={localStyles.validateButton}
                onPress={handleValidateLocation}
                disabled={isValidatingLocation}
              >
                {isValidatingLocation ? (
                  <VibesLoader size={30} />
                ) : (
                  <Text style={localStyles.validateButtonText}>
                    Validar ubicación
                  </Text>
                )}
              </TouchableOpacity>
              {validatedLocation ? (
                <View style={localStyles.validatedLocationBlock}>
                  <Text style={localStyles.validatedText}>
                    Ubicación válida: {validatedLocation.address}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={localStyles.mapPreviewCard}
                    onPress={handleOpenValidatedLocation}
                  >
                    {typeof validatedLocation.lat === "number" &&
                    typeof validatedLocation.lng === "number" &&
                    googleMapsApiKey &&
                    !mapPreviewFailed ? (
                      <Image
                        source={{
                          uri: getStaticMapPreviewUrl(
                            validatedLocation.lat,
                            validatedLocation.lng,
                            googleMapsApiKey,
                          ),
                        }}
                        style={localStyles.mapPreviewImage}
                        onError={() => setMapPreviewFailed(true)}
                      />
                    ) : (
                      <View style={localStyles.mapPreviewFallback}>
                        <View style={localStyles.mapPreviewFallbackPin}>
                          <Icon name="location" size={26} color={PRIMARY_COLOR} />
                        </View>
                        <Text style={localStyles.mapPreviewFallbackTitle}>
                          Ubicación lista para abrir
                        </Text>
                        <Text style={localStyles.mapPreviewFallbackText}>
                          {validatedLocation.address}
                        </Text>
                        {typeof validatedLocation.lat === "number" &&
                        typeof validatedLocation.lng === "number" ? (
                          <Text style={localStyles.mapPreviewFallbackMeta}>
                            {validatedLocation.lat.toFixed(4)},{" "}
                            {validatedLocation.lng.toFixed(4)}
                          </Text>
                        ) : null}
                      </View>
                    )}
                    <View style={localStyles.mapPreviewOverlay}>
                      <View style={localStyles.mapPreviewBadge}>
                        <Icon name="navigate" size={14} color={WHITE} />
                        <Text style={localStyles.mapPreviewBadgeText}>
                          Ver mapa
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={localStyles.label}>Link online</Text>
              <TextInput
                style={localStyles.input}
                placeholder="https://meet.google.com/..."
                placeholderTextColor={TEXT_SECONDARY}
                value={onlineLink}
                onChangeText={setOnlineLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </>
          )}

          <Text style={localStyles.label}>Acceso</Text>
          <View style={localStyles.choiceRow}>
            <TouchableOpacity
              style={[
                localStyles.choiceChip,
                pricingType === "free" && localStyles.choiceChipActive,
              ]}
              onPress={() => setPricingType("free")}
            >
              <Text
                style={[
                  localStyles.choiceChipText,
                  pricingType === "free" && localStyles.choiceChipTextActive,
                ]}
              >
                Gratis
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                localStyles.choiceChip,
                pricingType === "paid" && localStyles.choiceChipActive,
              ]}
              onPress={() => setPricingType("paid")}
            >
              <Text
                style={[
                  localStyles.choiceChipText,
                  pricingType === "paid" && localStyles.choiceChipTextActive,
                ]}
              >
                Pago
              </Text>
            </TouchableOpacity>
          </View>

          {pricingType === "paid" ? (
            <>
              <Text style={localStyles.label}>Link de pago</Text>
              <TextInput
                style={localStyles.input}
                placeholder="https://mipagina.com/pago"
                placeholderTextColor={TEXT_SECONDARY}
                value={paymentLink}
                onChangeText={setPaymentLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </>
          ) : null}

          <Text style={localStyles.label}>Cupos</Text>
          <TextInput
            style={localStyles.input}
            placeholder="20"
            placeholderTextColor={TEXT_SECONDARY}
            value={capacity}
            onChangeText={(value) => setCapacity(normalizeCapacityInput(value))}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={[
            localStyles.createButton,
            !isFormComplete && localStyles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={createEventMutation.isPending || updateEventMutation.isPending}
        >
          <Text style={localStyles.createButtonText}>
            {createEventMutation.isPending || updateEventMutation.isPending
              ? isEditing
                ? "Guardando..."
                : "Creando..."
              : isEditing
                ? "Guardar cambios"
                : "Crear evento"}
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
    </KeyboardAvoidingView>
  );
};

const localStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    marginBottom: 4,
  },
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
  choiceRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  choiceChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.1)",
    backgroundColor: "#F6F6F4",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  choiceChipText: {
    color: DARK_GRAY,
    fontSize: 14,
    fontWeight: "600",
  },
  choiceChipTextActive: {
    color: WHITE,
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
  createButtonDisabled: {
    opacity: 0.72,
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
  validatedLocationBlock: {
    marginTop: 8,
    gap: 10,
  },
  mapPreviewCard: {
    height: 168,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#EFE7D9",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.32)",
  },
  mapPreviewImage: {
    width: "100%",
    height: "100%",
  },
  mapPreviewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 22,
    backgroundColor: "#FBF5EA",
  },
  mapPreviewFallbackPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.14)",
  },
  mapPreviewFallbackTitle: {
    color: DARK_GRAY,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  mapPreviewFallbackText: {
    color: DARK_GRAY,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  mapPreviewFallbackMeta: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  mapPreviewOverlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
  },
  mapPreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(43, 43, 43, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapPreviewBadgeText: {
    color: WHITE,
    fontSize: 12,
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
  presetImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  presetImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
