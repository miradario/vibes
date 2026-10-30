import { readCommunities, canonicalCommunity } from "../src/lib/communities";
import ScreenContainer from "../components/ScreenContainer";
import {creationFormStyles} from "../src/theme/creationFormStyles";
import DiscoverPathCards from "../components/DiscoverPathCards";
import EventRecurrenceEditor, { type EventRecurrenceDraft } from "../components/EventRecurrenceEditor";
import EventScheduleEditor from "../components/EventScheduleEditor";
import { normalizeSchedule, serializeSchedule, sessionDraft, getEventRecurrence, buildRecurringSchedule, validateScheduleDrafts } from "../src/lib/eventSchedule";
import EventClassificationPicker from "../components/EventClassificationPicker";
import { EVENT_CATEGORIES, EVENT_PARTICIPATION_TYPES, parseEventCategory, parseEventParticipationType, type EventCategory, type EventParticipationType } from "../src/constants/eventClassification";
import { launchAppCamera } from "../components/AppCamera";
/** @format */

import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Platform,
  Linking,
  Keyboard,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
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
import DraggableMapPreview from "../components/DraggableMapPreview";
import LocationSuggestionsList, { useLocationSuggestions } from "../components/LocationSuggestions";
import {
  getDeviceLocale,
  resolveSuggestionCountry,
  type LocationSuggestion,
} from "../src/lib/locationSuggestions";
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
import { getGoogleMapsClientConfig } from "../src/config/googleMaps";
import { getIosMapPreviewSource } from "../src/config/mapPreview";
import OverlayBadge, { overlayBadgeContentColor } from "../components/ui/OverlayBadge";
import * as ds from "../src/theme/tokens";

const IMAGE_MEDIA_TYPE =
  (ImagePicker as any).MediaType?.Images
    ? [(ImagePicker as any).MediaType.Images]
    : ["images"];
const PLACEHOLDER_COLOR = ds.colors.scrim;

const normalizeCapacityInput = (value: string) => value.replace(/\D+/g, "");

// Tamaños pedidos a Static Maps (en píxeles de mapa); se usan para mover el pin.
const ANDROID_MAP_PREVIEW_SIZE = { width: 800, height: 360 };
const IOS_MAP_PREVIEW_SIZE = { width: 640, height: 288 };

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
  if (!params.subtitle.trim()) missing.push("descripción");
  if (!params.eventDateTime) missing.push("fecha y hora");
  if (params.modality === "in_person" && !params.location.trim()) {
    missing.push("ubicación");
  }
  if (params.modality === "online" && !params.onlineLink.trim()) {
    missing.push("link online");
  }
  if (!/^\d+$/.test(params.capacity) || !Number.isSafeInteger(Number(params.capacity)) || Number(params.capacity) <= 0 || Number(params.capacity) > 2147483647) missing.push("cupos");
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
  const [scheduleDrafts, setScheduleDrafts] = useState(() => {
    const existing = normalizeSchedule(editingEvent?.schedule, editingEvent?.startsAt);
    return existing.length ? existing.map((entry) => ({ ...sessionDraft(entry.startsAt), ...(entry.endsAt ? { endDate: sessionDraft(entry.endsAt).date, endTime: sessionDraft(entry.endsAt).time } : {}) })) : [sessionDraft()];
  });
  const [recurrenceDraft, setRecurrenceDraft] = useState<EventRecurrenceDraft>(() => {
    const existing = getEventRecurrence(editingEvent?.schedule);
    return { frequency: existing?.frequency ?? "none", count: String(existing?.count ?? 12), weekdays: existing?.weekdays ?? [] };
  });
  const seedDate = scheduleDrafts[0]?.date ? new Date(`${scheduleDrafts[0].date}T12:00:00`) : new Date();
  const defaultWeekday = Number.isFinite(seedDate.getTime()) ? seedDate.getDay() : 1;
  const schedule = recurrenceDraft.frequency === "none" ? serializeSchedule(scheduleDrafts) : buildRecurringSchedule(scheduleDrafts[0], {
    frequency: recurrenceDraft.frequency,
    count: Number(recurrenceDraft.count),
    weekdays: recurrenceDraft.weekdays.length ? recurrenceDraft.weekdays : [defaultWeekday],
  });
  const visibleDrafts = recurrenceDraft.frequency === "none" ? scheduleDrafts : scheduleDrafts.slice(0, 1);
  const scheduleIssues = validateScheduleDrafts(visibleDrafts, isEditing ? normalizeSchedule(editingEvent?.schedule, editingEvent?.startsAt).map((entry) => entry.startsAt) : []);
  const hasPastStart = scheduleIssues.some((issue) => issue.error);
  const eventDateTime = schedule?.length ? new Date(schedule[0].startsAt) : null;
  const [unlimitedCapacity, setUnlimitedCapacity] = useState(editingEvent?.capacity === 0);
  const [category, setCategory] = useState<EventCategory | null>(parseEventCategory(editingEvent?.category));
  const [participationType, setParticipationType] = useState<EventParticipationType | null>(parseEventParticipationType(editingEvent?.participationType));
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
  const pendingPhotoAction = useRef<null | "camera" | "gallery">(null);
  const [spiritualPaths, setSpiritualPaths] = useState<string[]>(() => readCommunities(editingEvent?.tags));
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
  const titleInputRef = useRef<TextInput>(null);
  const subtitleInputRef = useRef<TextInput>(null);
  const eventLinkInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);
  const onlineLinkInputRef = useRef<TextInput>(null);
  const paymentLinkInputRef = useRef<TextInput>(null);
  const capacityInputRef = useRef<TextInput>(null);
  const googleMapsConfig = getGoogleMapsClientConfig();
  const googleMapsApiKey = googleMapsConfig.apiKey;
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [isDraggingPin, setIsDraggingPin] = useState(false);
  const suggestionCountry = resolveSuggestionCountry({
    profileCountry: profile?.country,
    profileLocationLabel: profile?.location_label,
    deviceLocale: getDeviceLocale(),
  });
  const profileBias =
    typeof profile?.latitude === "number" && typeof profile?.longitude === "number"
      ? { latitude: profile.latitude, longitude: profile.longitude, radiusMeters: 30000 }
      : null;
  const locationSuggestions = useLocationSuggestions(
    location,
    modality === "in_person" && isLocationFocused && !validatedLocation,
    googleMapsConfig,
    { regionCode: suggestionCountry.regionCode, profileBias },
  );
  // iOS: preview vía la función map-preview (Android sigue igual).
  const iosMapPreviewSource =
    typeof validatedLocation?.lat === "number" &&
    typeof validatedLocation?.lng === "number"
      ? getIosMapPreviewSource(
          { latitude: validatedLocation.lat, longitude: validatedLocation.lng },
          session?.access_token,
          IOS_MAP_PREVIEW_SIZE,
        )
      : null;
  const existingCoverImageUri = editingEvent?.imagePresetId
    ? null
    : editingEvent?.imageUrl || null;
  const coverImageUri = eventImageUri || existingCoverImageUri;
  const hasSelectedImage = Boolean(coverImageUri || editingEvent?.image);
  const keepExistingUndated = recurrenceDraft.frequency === "none" && isEditing && !normalizeSchedule(editingEvent?.schedule, editingEvent?.startsAt).length && scheduleDrafts.every((row) => !row.date && !row.time && !row.endDate && !row.endTime);
  const missingFields = getMissingEventFields({
    title,
    subtitle,
    eventDateTime,
    location,
    modality,
    onlineLink,
    capacity: unlimitedCapacity ? "1" : capacity,
    hasSelectedImage,
  });
  if (keepExistingUndated) {
    const index = missingFields.indexOf("fecha y hora");
    if (index >= 0) missingFields.splice(index, 1);
  }
  if (!category && !isEditing) missingFields.push("categoría");
  if (!participationType && !isEditing) missingFields.push("tipo");
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
      const result = await launchAppCamera({
        cameraType: Platform.OS === "android" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
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

  const handleSelectLocationSuggestion = async (suggestion: LocationSuggestion) => {
    Keyboard.dismiss();
    try {
      const resolved = await locationSuggestions.resolve(suggestion);
      setValidatedLocation(resolved);
      setLocation(resolved.address);
      setMapPreviewFailed(false);
      locationSuggestions.clear();
      setIsLocationFocused(false);
    } catch (error) {
      console.error("Error resolving location suggestion", error);
      showAlertAfterKeyboard(
        "No pudimos ubicar ese lugar",
        "Probá con otra sugerencia o tocá \"Validar ubicación\".",
      );
    }
  };

  const handleValidateLocation = async () => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      showAlertAfterKeyboard("Falta ubicación", "Ingresá una ubicación para validar.");
      return;
    }

    const promptManualLocationFallback = (message: string) => {
      Keyboard.dismiss();
      setTimeout(() => {
        Alert.alert("No pudimos validar la ubicación", message, [
          { text: "Revisar", style: "cancel" },
          {
            text: "Usar sin mapa",
            onPress: () => {
              setValidatedLocation({
                address: trimmedLocation,
                lat: null,
                lng: null,
              });
              setMapPreviewFailed(false);
            },
          },
        ]);
      }, Platform.OS === "android" ? 180 : 80);
    };

    const { apiKey, headers } = googleMapsConfig;
    if (!apiKey) {
      setIsValidatingLocation(true);
      try {
        const permission = await ExpoLocation.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          promptManualLocationFallback(
            "Podés revisar la dirección o usarla igual. Si la usás sin validar, el evento se crea sin mapa.",
          );
          return;
        }

        const matches = await ExpoLocation.geocodeAsync(trimmedLocation);
        const firstMatch = matches[0];
        if (!firstMatch) {
          promptManualLocationFallback(
            "No encontramos esa dirección automáticamente. Podés usarla igual, pero el evento se crea sin mapa.",
          );
          return;
        }

        setValidatedLocation({
          address: trimmedLocation,
          lat: firstMatch.latitude,
          lng: firstMatch.longitude,
        });
        setMapPreviewFailed(false);
      } catch (error) {
        console.error("Error validating location with the native geocoder", error);
        promptManualLocationFallback(
          "No pudimos consultar el mapa. Podés usar la dirección igual, pero el evento se crea sin mapa.",
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
        { headers },
      );
      const data = await response.json();

      if (
        data?.status === "REQUEST_DENIED" ||
        typeof data?.error_message === "string"
      ) {
        promptManualLocationFallback(
          "Google Maps no devolvió una ubicación válida. Podés usar la dirección igual, pero el evento se crea sin mapa.",
        );
        return;
      }

      if (data?.status !== "OK" || !data?.results?.length) {
        setValidatedLocation(null);
        promptManualLocationFallback(
          "No encontramos esa ubicación en Google Maps. Podés revisar la dirección o usarla sin mapa.",
        );
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
    } catch (error) {
      console.error("Error validating location with Google Maps", error);
      setValidatedLocation(null);
      promptManualLocationFallback(
        "No se pudo validar la ubicación por un error de conexión. Podés usarla sin mapa.",
      );
    } finally {
      setIsValidatingLocation(false);
    }
  };

  const handleCreate = async (allowUnvalidatedLocation = false) => {
    if (isSubmitting) return;
    if (!isFormComplete) {
      Alert.alert(
        "Faltan datos",
        `Completá: ${missingFields.join(", ")}.`,
      );
      return;
    }

    if (hasPastStart) {
      Alert.alert("Revisá las fechas", "La fecha de inicio ya pasó. Elegí una fecha futura.");
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

    const resolvedStartsAt = eventDateTime?.toISOString() ?? null;
    if (!resolvedStartsAt && !keepExistingUndated) {
      Alert.alert("Falta fecha", "Elegí una fecha y hora para el evento.");
      return;
    }

    const parsedCapacity = unlimitedCapacity ? 0 : Number.parseInt(capacity, 10);
    const hasUnvalidatedInPersonLocation =
      modality === "in_person" && location.trim() && !validatedLocation;

    if (hasUnvalidatedInPersonLocation && !allowUnvalidatedLocation) {
      Alert.alert(
        "Ubicación sin validar",
        "No pudimos confirmar esta dirección en el mapa. Podés revisarla o crear el evento sin mapa.",
        [
          { text: "Revisar", style: "cancel" },
          {
            text: "Crear sin mapa",
            onPress: () => void handleCreate(true),
          },
        ],
      );
      return;
    }

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
          schedule: schedule ?? [],
          tags: [...(editingEvent?.tags ?? []).filter((tag: string) => !canonicalCommunity(tag)), ...spiritualPaths],
          location: resolvedLocation,
          locationLatitude:
            modality === "in_person" && validatedLocation
              ? validatedLocation.lat ?? null
              : null,
          locationLongitude:
            modality === "in_person" && validatedLocation
              ? validatedLocation.lng ?? null
              : null,
          eventLink: resolvedEventLink,
          category,
          participationType,
          pricingType,
          paymentLink: resolvedPaymentLink,
          modality,
          onlineLink: resolvedOnlineLink,
          capacity: parsedCapacity,
          imageUri: eventImageUri,
          imagePresetId: eventImageUri ? null : editingEvent?.imagePresetId ?? null,
        });
      } else {
        savedEvent = await createEventMutation.mutateAsync({
          createdBy: session.user.id,
          title: title.trim(),
          subtitle: subtitle.trim() || "Evento creado por la comunidad",
          description: subtitle.trim() || null,
          startsAt: resolvedStartsAt!,
          schedule: schedule ?? [],
          tags: [...(editingEvent?.tags ?? []).filter((tag: string) => !canonicalCommunity(tag)), ...spiritualPaths],
          location: resolvedLocation,
          locationLatitude:
            modality === "in_person" && validatedLocation
              ? validatedLocation.lat ?? null
              : null,
          locationLongitude:
            modality === "in_person" && validatedLocation
              ? validatedLocation.lng ?? null
              : null,
          eventLink: resolvedEventLink,
          category,
          participationType,
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
        navigation.goBack();
      } else {
        navigation.navigate(
          "Tab" as never,
          {
            screen: "EventsTab",
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
    <ScreenContainer edges={["top","left","right"]}>
    <KeyboardAvoidingView
      style={styles.bg}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Platform.OS === "ios"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.bg}>
        <AppHeader title={isEditing ? "Editar evento" : "Crear evento"} showBack onBack={() => navigation.goBack()} style={{paddingHorizontal:ds.spacing[6],marginBottom:ds.spacing[2]}} titleStyle={localStyles.screenTitle} />
      <ScrollView
        style={{flex:1}}
        contentContainerStyle={localStyles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEnabled={!isDraggingPin}
      >
        <View style={localStyles.formCard}>
          <Text style={localStyles.label}>Título</Text>
          <TextInput
            ref={titleInputRef}
            style={localStyles.input}
            placeholder="Meditación de luna llena"
            placeholderTextColor={PLACEHOLDER_COLOR}
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
            {coverImageUri || editingEvent?.image ? (
              <>
                <Image
                  source={coverImageUri ? {uri:coverImageUri} : typeof editingEvent.image === "string" ? {uri:editingEvent.image} : editingEvent.image}
                  style={localStyles.coverImage}
                />
                <View style={localStyles.coverScrim} />
                <OverlayBadge
                    tone="dark"
                    position="bottom-right"
                    icon={<Icon name="camera-outline" size={ds.iconSize.sm} color={overlayBadgeContentColor("dark")} />}
                    label="Cambiar portada"
                  />
              </>
            ) : (
              <View style={localStyles.coverEmptyState}>
                <View style={localStyles.coverIconCircle}>
                  <Icon name="image-outline" size={ds.iconSize.xl} color={PRIMARY_COLOR} />
                </View>
                <Text style={localStyles.uploadImageTitle}>Subir foto de portada</Text>
                <Text style={localStyles.uploadImageHint}>
                  Elegí una foto horizontal de tu galería o sacá una ahora
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={localStyles.label}>Descripción</Text>
          <TextInput
            ref={subtitleInputRef}
            style={[localStyles.input, localStyles.descriptionInput]}
            placeholder="Contá de qué se trata, qué incluye y qué hay que llevar."
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={subtitle}
            onChangeText={setSubtitle}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            submitBehavior="newline"
          />

          <Text style={localStyles.label}>Link del evento (opcional)</Text>
          <TextInput
            ref={eventLinkInputRef}
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
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (modality === "in_person") {
                locationInputRef.current?.focus();
                return;
              }
              onlineLinkInputRef.current?.focus();
            }}
          />
          {eventLinkTouched && hasEventLink ? (
            <View style={localStyles.linkValidationRow}>
              <Icon
                name={isEventLinkValid ? "checkmark-circle" : "alert-circle"}
                size={ds.iconSize.sm}
                color={isEventLinkValid ? vibesTheme.colors.secondaryText : vibesTheme.colors.accentCoral}
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

          <Text style={localStyles.label}>{recurrenceDraft.frequency === "none" ? "Fechas y horarios" : "Primer encuentro de la serie"}</Text>
          <EventScheduleEditor value={visibleDrafts} issues={scheduleIssues} onChange={setScheduleDrafts} allowMultiple={recurrenceDraft.frequency === "none"} />
          <EventRecurrenceEditor value={recurrenceDraft} onChange={setRecurrenceDraft} defaultWeekday={defaultWeekday} schedule={schedule} />
          <Text style={localStyles.label}>Comunidad</Text>
          <DiscoverPathCards selected={spiritualPaths} onToggle={(path) => setSpiritualPaths((previous) => previous.includes(path) ? previous.filter((value) => value !== path) : [...previous, path])} onClear={() => setSpiritualPaths([])} style={localStyles.pathCards} />

          <EventClassificationPicker label="Categoría · qué actividad es" options={EVENT_CATEGORIES} value={category} onChange={setCategory} style={localStyles.pickerSection} labelStyle={localStyles.pickerLabel} />
          <EventClassificationPicker label="Tipo · cómo se participa" options={EVENT_PARTICIPATION_TYPES} value={participationType} onChange={setParticipationType} style={localStyles.pickerSection} labelStyle={localStyles.pickerLabel} />
          <Text style={localStyles.label}>Modalidad</Text>
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
                ref={locationInputRef}
                style={localStyles.input}
                placeholder="Palermo, Buenos Aires"
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={location}
                onChangeText={(value) => {
                  setLocation(value);
                  setValidatedLocation(null);
                  setMapPreviewFailed(false);
                }}
                onFocus={() => setIsLocationFocused(true)}
                onBlur={() => {
                  // Deja terminar el toque sobre una sugerencia antes de ocultarlas.
                  setTimeout(() => setIsLocationFocused(false), 250);
                }}
                autoCorrect={false}
                textContentType="fullStreetAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (pricingType === "paid") {
                    paymentLinkInputRef.current?.focus();
                    return;
                  }
                  capacityInputRef.current?.focus();
                }}
              />
              <LocationSuggestionsList
                status={locationSuggestions.status}
                suggestions={locationSuggestions.suggestions}
                isResolving={locationSuggestions.isResolving}
                onSelect={handleSelectLocationSuggestion}
              />
              {location.trim() && !validatedLocation ? (
                <Text style={localStyles.locationHint}>
                  Elegí una sugerencia para ubicarlo en el mapa.
                </Text>
              ) : null}
              <TouchableOpacity
                style={localStyles.validateButton}
                onPress={handleValidateLocation}
                disabled={isValidatingLocation}
              >
                {isValidatingLocation ? (
                  <VibesLoader />
                ) : (
                  <Text style={localStyles.validateButtonText}>
                    Validar ubicación
                  </Text>
                )}
              </TouchableOpacity>
              {validatedLocation ? (
                <View style={localStyles.validatedLocationBlock}>
                  {typeof validatedLocation.lat !== "number" ||
                  typeof validatedLocation.lng !== "number" ? (
                    <Text style={localStyles.validatedText}>
                      Ubicación sin validar (sin mapa)
                    </Text>
                  ) : null}
                  <View style={localStyles.mapPreviewCard}>
                    {typeof validatedLocation.lat === "number" &&
                    typeof validatedLocation.lng === "number" &&
                    (iosMapPreviewSource || googleMapsApiKey) &&
                    !mapPreviewFailed ? (
                      <DraggableMapPreview
                        source={
                          iosMapPreviewSource ?? {
                            uri: getStaticMapPreviewUrl(
                              validatedLocation.lat,
                              validatedLocation.lng,
                              googleMapsApiKey as string,
                            ),
                            headers: googleMapsConfig.headers,
                          }
                        }
                        center={{ lat: validatedLocation.lat, lng: validatedLocation.lng }}
                        imageSize={
                          iosMapPreviewSource
                            ? IOS_MAP_PREVIEW_SIZE
                            : ANDROID_MAP_PREVIEW_SIZE
                        }
                        onDragStateChange={setIsDraggingPin}
                        onMove={(next) => {
                          // Se mantiene el texto elegido; solo se ajustan las coordenadas.
                          setValidatedLocation((current) =>
                            current ? { ...current, lat: next.lat, lng: next.lng } : current,
                          );
                          setMapPreviewFailed(false);
                        }}
                        onError={() => setMapPreviewFailed(true)}
                      />
                    ) : (
                      <View style={localStyles.mapPreviewFallback}>
                        <View style={localStyles.mapPreviewFallbackPin}>
                          <Icon name="location" size={ds.iconSize.lg} color={PRIMARY_COLOR} />
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
                    <TouchableOpacity
                      style={localStyles.mapPreviewOverlay}
                      onPress={handleOpenValidatedLocation}
                      accessibilityRole="button"
                    >
                      <OverlayBadge
                        tone="dark"
                        icon={<Icon name="navigate" size={ds.iconSize.sm} color={overlayBadgeContentColor("dark")} />}
                        label="Ver mapa"
                      />
                    </TouchableOpacity>
                  </View>
                  {typeof validatedLocation.lat === "number" &&
                  typeof validatedLocation.lng === "number" &&
                  (iosMapPreviewSource || googleMapsApiKey) &&
                  !mapPreviewFailed ? (
                    <Text style={localStyles.locationHint}>
                      Podés mover el pin para ajustar el punto.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={localStyles.label}>Link online</Text>
              <TextInput
                ref={onlineLinkInputRef}
                style={localStyles.input}
                placeholder="https://meet.google.com/..."
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={onlineLink}
                onChangeText={setOnlineLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (pricingType === "paid") {
                    paymentLinkInputRef.current?.focus();
                    return;
                  }
                  capacityInputRef.current?.focus();
                }}
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
                ref={paymentLinkInputRef}
                style={localStyles.input}
                placeholder="https://mipagina.com/pago"
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={paymentLink}
                onChangeText={setPaymentLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => capacityInputRef.current?.focus()}
              />
            </>
          ) : null}

          <Text style={localStyles.label}>Cupos</Text>
          <View style={localStyles.choiceRow}>
            {[false, true].map((unlimited) => <TouchableOpacity key={String(unlimited)}
              accessibilityRole="button" accessibilityState={{ selected: unlimitedCapacity === unlimited }}
              onPress={() => setUnlimitedCapacity(unlimited)}
              style={[localStyles.choiceChip, unlimitedCapacity === unlimited && localStyles.choiceChipActive]}>
              <Text style={[localStyles.choiceChipText, unlimitedCapacity === unlimited && localStyles.choiceChipTextActive]}>{unlimited ? "Ilimitados" : "Limitados"}</Text>
            </TouchableOpacity>)}
          </View>
          {!unlimitedCapacity ? <TextInput
            ref={capacityInputRef}
            style={localStyles.input}
            placeholder="20"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={capacity}
            onChangeText={(value) => setCapacity(normalizeCapacityInput(value))}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          /> : null}
        </View>

      </ScrollView>

      <View
        style={[
          localStyles.fixedFooter,
          { paddingBottom: Math.max(insets.bottom + ds.spacing[3], ds.spacing[4]) },
        ]}
      >
        <TouchableOpacity
          style={[
            localStyles.createButton,
            (!isFormComplete || invalidLinks.length > 0) &&
              localStyles.createButtonDisabled,
          ]}
          onPress={() => void handleCreate()}
          disabled={isSubmitting || isEventLinkInvalid}
        >
          {isSubmitting ? (
            <VibesLoader />
          ) : (
            <Text style={localStyles.createButtonText}>{submitButtonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      <AnimatedSheetModal
        visible={photoModalVisible}
        onClosed={() => {
          const action = pendingPhotoAction.current;
          pendingPhotoAction.current = null;
          if (action === "camera") void takePhoto();
          if (action === "gallery") void pickFromGallery();
        }}
        onClose={() => setPhotoModalVisible(false)}
        offsetY={300}
        sheetStyle={localStyles.photoSheet}
      >
        <View style={localStyles.sheetHandle} />
        <Text style={localStyles.modalTitle}>Foto de portada</Text>
        <TouchableOpacity
          style={localStyles.modalPrimaryButton}
          onPress={() => {
            pendingPhotoAction.current = "camera";
            setPhotoModalVisible(false);
          }}
        >
          <Text style={localStyles.modalPrimaryText}>Usar cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.modalSecondaryButton}
          onPress={() => {
            pendingPhotoAction.current = "gallery";
            setPhotoModalVisible(false);
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
    </ScreenContainer>
  );
};

const legacyStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    marginBottom: ds.spacing[1],
  },
  screenTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.title,
  },
  content: {
    paddingBottom: /* ds-lint-allow layout: paddingBottom 128 (medida de layout fuera de la escala) */ 128,
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
    ...ds.textStyles.bodySmall,
    marginBottom: ds.spacing[2],
    marginTop: ds.spacing[3],
  },
  input: {
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.md,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    color: DARK_GRAY,
  },
  inputInvalid: {
    borderColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.higher),
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.subtle),
  },
  descriptionInput: {
    minHeight: 160,
    ...ds.textStyles.body,
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium),
  },
  inputValid: {
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.high),
  },
  linkValidationRow: {
    marginTop: ds.spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
  linkValidationText: {
    flex: 1,
    ...ds.textStyles.caption,
  },
  linkValidationTextValid: {
    color: vibesTheme.colors.secondaryText,
  },
  linkValidationTextInvalid: {
    color: vibesTheme.colors.accentBlue,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: ds.spacing[3],
  },
  choiceRow: {
    flexDirection: "row",
    gap: ds.spacing[3],
    marginTop: ds.spacing[1],
  },
  choiceChip: {
    flex: 1,
    borderRadius: ds.radii.pill,
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    backgroundColor: vibesTheme.colors.background,
    paddingVertical: ds.spacing[3],
    alignItems: "center",
    justifyContent: "center",
  },
  choiceChipActive: {
    backgroundColor: vibesTheme.colors.accentBlue,
    borderColor: vibesTheme.colors.accentBlue,
  },
  choiceChipText: {
    color: DARK_GRAY,
    ...ds.textStyles.bodySmall,
  },
  choiceChipTextActive: {
    color: vibesTheme.colors.surface,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.md,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
  dateTimeButtonText: {
    color: DARK_GRAY,
    ...ds.textStyles.bodySmall,
  },
  dateTimePlaceholder: {
    color: TEXT_SECONDARY,
  },
  selectedDateTimeText: {
    marginTop: ds.spacing[2],
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.bodySmall,
  },
  pickerWrap: {
    marginTop: ds.spacing[3],
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.md,
    overflow: "hidden",
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
  },
  pickerDoneText: {
    color: vibesTheme.colors.accentBlue,
    fontFamily: ds.fontFamilies.regular,
  },
  createButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.xl,
    paddingVertical: ds.spacing[4],
    alignItems: "center",
    ...ds.glow.accent,
  },
  createButtonDisabled: {
    opacity: 0.72,
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
    paddingTop: ds.spacing[3],
    paddingHorizontal: ds.spacing[5],
    backgroundColor: ds.colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: ds.colors.border.subtle,
    shadowColor: BLACK,
    shadowOpacity: ds.shadows.md.shadowOpacity,
    shadowRadius: ds.shadows.md.shadowRadius,
    shadowOffset: ds.shadows.md.shadowOffset,
    elevation: ds.shadows.md.elevation,
  },
  validateButton: {
    marginTop: ds.spacing[3],
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.xl,
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentMustard,
    paddingVertical: ds.spacing[3],
    alignItems: "center",
    ...ds.glow.accent,
  },
  validateButtonText: {
    color: DARK_GRAY,
    fontFamily: ds.fontFamilies.regular,
  },
  locationHint: {
    marginTop: ds.spacing[2],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  validatedText: {
    marginTop: ds.spacing[2],
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.bodySmall,
  },
  validatedLocationBlock: {
    marginTop: ds.spacing[2],
    gap: ds.spacing[3],
  },
  mapPreviewCard: {
    height: 168,
    borderRadius: ds.radii.lg,
    overflow: "hidden",
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  mapPreviewImage: {
    width: "100%",
    height: "100%",
  },
  mapPreviewTiles: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  mapPreviewTile: {
    position: "absolute",
    width: "33.334%",
    height: "33.334%",
  },
  mapPreviewCenterPin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 44,
    height: 44,
    marginLeft: -ds.spacing[6],
    marginTop: -ds.spacing[8],
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    shadowColor: BLACK,
    shadowOpacity: ds.shadows.sm.shadowOpacity,
    shadowRadius: ds.shadows.sm.shadowRadius,
    shadowOffset: ds.shadows.sm.shadowOffset,
    elevation: ds.shadows.sm.elevation,
  },
  mapPreviewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[3],
    paddingHorizontal: ds.spacing[6],
    backgroundColor: ds.colors.bg.selected,
  },
  mapPreviewFallbackPin: {
    width: 48,
    height: 48,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.selected,
  },
  mapPreviewFallbackTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.body,
    textAlign: "center",
  },
  mapPreviewFallbackText: {
    color: DARK_GRAY,
    ...ds.textStyles.bodySmall,
    textAlign: "center",
  },
  mapPreviewFallbackMeta: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.caption,
    textAlign: "center",
  },
  mapPreviewOverlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
  },
  coverPicker: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
    backgroundColor: ds.colors.bg.selected,
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
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
  },
  coverEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ds.spacing[8],
  },
  coverIconCircle: {
    width: 52,
    height: 52,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ds.spacing[3],
    backgroundColor: ds.colors.bg.selected,
  },
  uploadImageTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
  },
  uploadImageHint: {
    marginTop: ds.spacing[1],
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.strong),
    ...ds.textStyles.bodySmall,
    textAlign: "center",
  },
  photoSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[6],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[8],
    shadowColor: BLACK,
    shadowOpacity: ds.shadows.md.shadowOpacity,
    shadowRadius: ds.shadows.md.shadowRadius,
    shadowOffset: ds.shadows.md.shadowOffset,
    elevation: ds.shadows.md.elevation,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.border.default,
    marginBottom: ds.spacing[4],
  },
  modalTitle: {
    ...ds.textStyles.body,
    color: DARK_GRAY,
    marginBottom: ds.spacing[3],
  },
  modalPrimaryButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.xl,
    paddingVertical: ds.spacing[3],
    alignItems: "center",
    ...ds.glow.accent,
  },
  modalPrimaryText: {
    color: vibesTheme.colors.primaryText,
    fontFamily: ds.fontFamilies.regular,
  },
  modalSecondaryButton: {
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.xl,
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentMustard,
    paddingVertical: ds.spacing[3],
    alignItems: "center",
    marginTop: ds.spacing[3],
    ...ds.glow.accent,
  },
  modalSecondaryText: {
    color: DARK_GRAY,
    fontFamily: ds.fontFamilies.regular,
  },
  modalCancelButton: {
    marginTop: ds.spacing[4],
    alignItems: "center",
  },
  modalCancelText: {
    color: TEXT_SECONDARY,
    fontFamily: ds.fontFamilies.regular,
  },
});

export default CreateEvent;

const localStyles = {...legacyStyles, ...creationFormStyles};
