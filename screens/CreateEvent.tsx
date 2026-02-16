/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import styles, {
  DARK_GRAY,
  TEXT_SECONDARY,
  WHITE,
  PRIMARY_COLOR,
  BLACK,
} from "../assets/styles";
import Icon from "../components/Icon";

const IMAGE_MEDIA_TYPE =
  (ImagePicker as any).MediaType?.Images
    ? [(ImagePicker as any).MediaType.Images]
    : ["images"];

const CreateEvent = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [date, setDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [location, setLocation] = useState("");
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [eventImageUri, setEventImageUri] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [validatedLocation, setValidatedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

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

  const handleCreate = () => {
    if (!title.trim() || !date.trim() || !location.trim()) {
      Alert.alert(
        "Faltan datos",
        "Completá al menos título, fecha y ubicación.",
      );
      return;
    }

    if (!validatedLocation) {
      Alert.alert(
        "Validá la ubicación",
        "Antes de crear el evento, validá la ubicación con Google Maps.",
      );
      return;
    }

    const newEvent = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || "Evento creado por la comunidad",
      date: date.trim(),
      attendees: attendees.trim() || "0/20",
      location: validatedLocation.address,
      image:
        eventImageUri || require("../assets/images/events/event_meditation2.png"),
    };

    navigation.navigate(
      "Tab" as never,
      {
        screen: "Events",
        params: { newEvent },
      } as never
    );
  };

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
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

          <Text style={localStyles.label}>Imagen del evento</Text>
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
                : require("../assets/images/events/event_meditation2.png")
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
          <TextInput
            style={localStyles.input}
            placeholder="Ej: 21 marzo · 19:00"
            placeholderTextColor={TEXT_SECONDARY}
            value={date}
            onChangeText={setDate}
          />

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
            placeholder="Ej: 0/20"
            placeholderTextColor={TEXT_SECONDARY}
            value={attendees}
            onChangeText={setAttendees}
          />
        </View>

        <TouchableOpacity style={localStyles.createButton} onPress={handleCreate}>
          <Text style={localStyles.createButtonText}>Crear evento</Text>
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
    </ImageBackground>
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
    backgroundColor: "#F4E7DD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
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
    backgroundColor: "#FFEEDC",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3C79F",
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
    backgroundColor: "#FFEEDC",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3C79F",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 12, 24, 0.45)",
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
    backgroundColor: "#FFEEDC",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3C79F",
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
