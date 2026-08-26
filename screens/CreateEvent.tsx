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
  Platform,
  Linking,
  Keyboard,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
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
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import {
  useCreateEventMutation,
  type EventModality,
  type EventPricingType,
  useUpdateEventMutation,
} from "../src/queries/events.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

const IMAGE_MEDIA_TYPE =
  (ImagePicker as any).MediaType?.Images
    ? [(ImagePicker as any).MediaType.Images]
    : ["images"];
const PLACEHOLDER_COLOR = "rgba(43, 43, 43, 0.34)";

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
    const hasSupportedProtocol =
      parsed.protocol === "http:" || parsed.protocol === "https:";
    const hasPublicHostname =
      parsed.hostname === "localhost" || parsed.hostname.includes(".");
    return hasSupportedProtocol && hasPublicHostname;
  } catch {
    return false;
  }
};

const showAlertAfterKeyboard = (title: string, message: string) => {
  Keyboard.dismiss();
  setTimeout(() => {
    Alert.alert(title, message);
  }, Platform.OS === "android" ? 180 : 80);
};

const getMissingEventFields = (params: {
  title: string;
  subtitle: string;
  eventDateTime: Date | null;
  location: string;
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
  if (!params.capacity.trim()) missing.push("cupos");
  if (!params.hasSelectedImage) missing.push("foto de portada");

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
  const insets = useSafeAreaInsets();
  const editingEvent = route?.params?.event ?? null;
  const isEditing = Boolean(editingEvent?.id);
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const createEventMutation = useCreateEventMutation();
  const updateEventMutation = useUpdateEventMutation();
  const isSubmitting =
    createEventMutation.isPending || updateEventMutation.isPending;
  const submitButtonLabel = isSubmitting
    ? isEditing
      ? "Guardando..."
      : "Creando..."
    : isEditing
      ? "Guardar cambios"
      : "Crear evento";
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
  const [eventLinkTouched, setEventLinkTouched] = useState(false);
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
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [validatedLocation, setValidatedLocation] = useState<{
    address: string;
    lat: number | null;
    lng: number | null;
  } | null>(() => {
    if (!editingEvent?.location) return null;
    return {
      address: editingEvent.location,
      lat:
        typeof editingEvent.locationLatitude === "number"
          ? editingEvent.locationLatitude
          : null,
      lng:
        typeof editingEvent.locationLongitude === "number"
          ? editingEvent.locationLongitude
          : null,
    };
  });
  const [mapPreviewFailed, setMapPreviewFailed] = useState(false);
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const existingCoverImageUri = editingEvent?.imagePresetId
    ? null
    : editingEvent?.imageUrl || null;
  const coverImageUri = eventImageUri || existingCoverImageUri;
  const hasSelectedImage = Boolean(coverImageUri);
  const missingFields = getMissingEventFields({
    title,
    subtitle,
    eventDateTime,
    location,
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
  const hasEventLink = Boolean(eventLink.trim());
  const isEventLinkValid = hasEventLink && isValidExternalUrl(eventLink);
  const isEventLinkInvalid = hasEventLink && !isEventLinkValid;
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
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setEventImageUri(result.assets[0].uri);
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
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setEventImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error opening camera for event image", error);
      Alert.alert("Error", "No se pudo abrir la cámara.");
    }
  };

  const handleValidateLocation = async () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      showAlertAfterKeyboard("Falta ubicación", "Ingresá una ubicación para validar.");
      return;
    }

    const useManualLocationFallback = (message: string) => {
      setValidatedLocation({
        address: trimmedLocation,
        lat: null,
        lng: null,
      });
      setMapPreviewFailed(false);
      showAlertAfterKeyboard("Ubicación guardada", message);
    };

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setIsValidatingLocation(true);
      try {
        const permission = await ExpoLocation.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          useManualLocationFallback(
            "Guardamos la dirección escrita. Podés habilitar ubicación para validarla en el mapa.",
          );
          return;
        }

        const matches = await ExpoLocation.geocodeAsync(trimmedLocation);
        const firstMatch = matches[0];
        if (!firstMatch) {
          useManualLocationFallback(
            "No pudimos ubicarla automáticamente; guardamos la dirección escrita.",
          );
          return;
        }

        setValidatedLocation({
          address: trimmedLocation,
          lat: firstMatch.latitude,
          lng: firstMatch.longitude,
        });
        setMapPreviewFailed(false);
        showAlertAfterKeyboard("Ubicación validada", trimmedLocation);
      } catch (error) {
        console.error("Error validating location with the native geocoder", error);
        useManualLocationFallback(
          "No pudimos consultar el mapa; guardamos la dirección escrita.",
        );
      } finally {
        setIsValidatingLocation(false);
      }
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
        showAlertAfterKeyboard(
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
      showAlertAfterKeyboard("Ubicación validada", firstResult.formatted_address);
    } catch (error) {
      console.error("Error validating location with Google Maps", error);
      showAlertAfterKeyboard("Error", "No se pudo validar la ubicación.");
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
      pricingType === "paid" && paymentLink.trim()
        ? normalizeExternalUrl(paymentLink)
        : null;
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
          updatedBy: session.user.id,
          title: title.trim(),
          subtitle: subtitle.trim() || "Evento creado por la comunidad",
          description: subtitle.trim() || null,
          startsAt: resolvedStartsAt,
          location: resolvedLocation,
          locationLatitude:
            modality === "in_person" ? validatedLocation?.lat ?? null : null,
          locationLongitude:
            modality === "in_person" ? validatedLocation?.lng ?? null : null,
          eventLink: resolvedEventLink,
          pricingType,
          paymentLink: resolvedPaymentLink,
          modality,
          onlineLink: resolvedOnlineLink,
          capacity: parsedCapacity,
          imageUri: eventImageUri || existingCoverImageUri,
          imagePresetId: null,
        });
      } else {
        savedEvent = await createEventMutation.mutateAsync({
          createdBy: session.user.id,
          title: title.trim(),
          subtitle: subtitle.trim() || "Evento creado por la comunidad",
          description: subtitle.trim() || null,
          startsAt: resolvedStartsAt,
          location: resolvedLocation,
          locationLatitude:
            modality === "in_person" ? validatedLocation?.lat ?? null : null,
          locationLongitude:
            modality === "in_person" ? validatedLocation?.lng ?? null : null,
          eventLink: resolvedEventLink,
          pricingType,
          paymentLink: resolvedPaymentLink,
          modality,
          onlineLink: resolvedOnlineLink,
          capacity: parsedCapacity,
          imageUri: eventImageUri,
          imagePresetId: null,
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
          style={[
            localStyles.header,
            { marginTop: Math.max(insets.top + 8, 24) },
          ]}
          titleStyle={styles.title}
        />

        <View style={localStyles.formCard}>
          <Text style={localStyles.label}>Título</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Meditación de luna llena"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={localStyles.label}>Foto de portada</Text>
          <TouchableOpacity
            style={localStyles.coverPicker}
            activeOpacity={0.88}
            onPress={() => setPhotoModalVisible(true)}
          >
            {coverImageUri ? (
              <>
                <Image
                  source={{ uri: coverImageUri }}
                  style={localStyles.coverImage}
                />
                <View style={localStyles.coverScrim} />
                <View style={localStyles.coverChangeBadge}>
                  <Icon name="camera-outline" size={17} color={WHITE} />
                  <Text style={localStyles.coverChangeText}>Cambiar portada</Text>
                </View>
              </>
            ) : (
              <View style={localStyles.coverEmptyState}>
                <View style={localStyles.coverIconCircle}>
                  <Icon name="image-outline" size={28} color={PRIMARY_COLOR} />
                </View>
                <Text style={localStyles.uploadImageTitle}>Subir foto de portada</Text>
                <Text style={localStyles.uploadImageHint}>
                  Elegí una foto horizontal de tu galería o sacá una ahora
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={localStyles.label}>Descripción corta</Text>
          <TextInput
            style={localStyles.input}
            placeholder="Respiración, calma, conexión"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={subtitle}
            onChangeText={setSubtitle}
          />

          <Text style={localStyles.label}>Link del evento (opcional)</Text>
          <TextInput
            style={[
              localStyles.input,
              eventLinkTouched && isEventLinkInvalid && localStyles.inputInvalid,
              eventLinkTouched && isEventLinkValid && localStyles.inputValid,
            ]}
            placeholder="https://mipagina.com/evento"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={eventLink}
            onChangeText={setEventLink}
            onBlur={() => {
              setEventLinkTouched(true);
              if (isEventLinkValid) {
                setEventLink(normalizeExternalUrl(eventLink));
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {eventLinkTouched && hasEventLink ? (
            <View style={localStyles.linkValidationRow}>
              <Icon
                name={isEventLinkValid ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={isEventLinkValid ? "#4E8B63" : "#B45145"}
              />
              <Text
                style={[
                  localStyles.linkValidationText,
                  isEventLinkValid
                    ? localStyles.linkValidationTextValid
                    : localStyles.linkValidationTextInvalid,
                ]}
              >
                {isEventLinkValid
                  ? "Link válido"
                  : "Ingresá una URL completa, por ejemplo mipagina.com/evento"}
              </Text>
            </View>
          ) : null}

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
                placeholderTextColor={PLACEHOLDER_COLOR}
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
                placeholderTextColor={PLACEHOLDER_COLOR}
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
              <Text style={localStyles.label}>Link de pago (opcional)</Text>
              <TextInput
                style={localStyles.input}
                placeholder="https://mipagina.com/pago"
                placeholderTextColor={PLACEHOLDER_COLOR}
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
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={capacity}
            onChangeText={(value) => setCapacity(normalizeCapacityInput(value))}
            keyboardType="number-pad"
          />
        </View>

      </ScrollView>

      <View
        style={[
          localStyles.fixedFooter,
          { paddingBottom: Math.max(insets.bottom + 12, 18) },
        ]}
      >
        <TouchableOpacity
          style={[
            localStyles.createButton,
            (!isFormComplete || invalidLinks.length > 0) &&
              localStyles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={isSubmitting || isEventLinkInvalid}
        >
          {isSubmitting ? (
            <VibesLoader size={30} />
          ) : (
            <Text style={localStyles.createButtonText}>{submitButtonLabel}</Text>
          )}
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
          <Text style={localStyles.modalSecondaryText}>Elegir de galería</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.modalCancelButton}
          onPress={() => setPhotoModalVisible(false)}
        >
          <Text style={localStyles.modalCancelText}>Cancelar</Text>
        </TouchableOpacity>
      </AnimatedSheetModal>
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
    paddingBottom: 128,
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
    fontWeight: "400",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
  },
  inputInvalid: {
    borderColor: "rgba(180, 81, 69, 0.72)",
    backgroundColor: "rgba(180, 81, 69, 0.05)",
  },
  inputValid: {
    borderColor: "rgba(78, 139, 99, 0.58)",
  },
  linkValidationRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkValidationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  linkValidationTextValid: {
    color: "#4E8B63",
  },
  linkValidationTextInvalid: {
    color: "#B45145",
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
    fontWeight: "400",
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
    fontWeight: "400",
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
    fontWeight: "400",
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
    opacity: 0.72,
  },
  createButtonText: {
    color: WHITE,
    fontWeight: "400",
    fontSize: 15,
  },
  fixedFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(246, 246, 244, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(43, 43, 43, 0.06)",
    shadowColor: BLACK,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
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
    fontWeight: "400",
  },
  validatedText: {
    marginTop: 8,
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: "400",
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
    fontFamily: vibesTheme.fonts.thin,
    textAlign: "center",
  },
  mapPreviewFallbackText: {
    color: DARK_GRAY,
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  mapPreviewFallbackMeta: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "400",
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
    fontWeight: "400",
  },
  coverPicker: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.42)",
    backgroundColor: "#FBF7EF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 22, 18, 0.22)",
  },
  coverChangeBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    minHeight: 38,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    backgroundColor: "rgba(34, 30, 26, 0.78)",
  },
  coverChangeText: {
    color: WHITE,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  coverEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  coverIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "rgba(228, 183, 110, 0.16)",
  },
  uploadImageTitle: {
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
  uploadImageHint: {
    marginTop: 5,
    color: "rgba(43, 43, 43, 0.52)",
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
  },
  photoSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
    shadowColor: BLACK,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(43, 43, 43, 0.16)",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    color: DARK_GRAY,
    fontFamily: vibesTheme.fonts.thin,
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
    fontWeight: "400",
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
    fontWeight: "400",
  },
  modalCancelButton: {
    marginTop: 14,
    alignItems: "center",
  },
  modalCancelText: {
    color: TEXT_SECONDARY,
    fontWeight: "400",
  },
});

export default CreateEvent;
