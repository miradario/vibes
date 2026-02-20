/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, {
  DARK_GRAY,
  GRAY,
  PRIMARY_COLOR,
  TEXT_SECONDARY,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import { supabase } from "../src/lib/supabase";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";

const SPIRITUAL_OPTIONS = ["Meditación", "Yoga", "Astrología", "Reiki"];
const OTHER_DEFAULT_OPTIONS = ["Viajes", "Animales", "Arte"];

const Settings = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: prefs, refetch } = useUserPreferencesQuery(session?.user?.id);

  const [spiritualPath, setSpiritualPath] = useState<string[]>([]);
  const [vegetarian, setVegetarian] = useState<"Sí" | "No">("No");
  const [aboutMe, setAboutMe] = useState("");
  const [smoking, setSmoking] = useState<"Sí" | "No">("No");
  const [otherOptions, setOtherOptions] = useState<string[]>(
    OTHER_DEFAULT_OPTIONS
  );
  const [selectedOtherTags, setSelectedOtherTags] = useState<string[]>(
    OTHER_DEFAULT_OPTIONS
  );
  const [customTag, setCustomTag] = useState("");

  useEffect(() => {
    if (!prefs) return;
    setSpiritualPath(
      Array.isArray(prefs.spiritualPath) ? prefs.spiritualPath : []
    );
    if (prefs.vegetarian === "Sí" || prefs.vegetarian === "No") {
      setVegetarian(prefs.vegetarian);
    }
    if (prefs.smoking === "Sí" || prefs.smoking === "No") {
      setSmoking(prefs.smoking);
    }
    if (typeof prefs.aboutMe === "string") {
      setAboutMe(prefs.aboutMe);
    }
    if (Array.isArray(prefs.otherTags) && prefs.otherTags.length) {
      setSelectedOtherTags(prefs.otherTags);
      setOtherOptions((prev) =>
        Array.from(new Set([...prev, ...prefs.otherTags]))
      );
    }
  }, [prefs]);

  const selectedOthers = useMemo(
    () => new Set(selectedOtherTags),
    [selectedOtherTags]
  );

  const toggleSpiritualPath = (item: string) => {
    setSpiritualPath((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]
    );
  };

  const toggleOther = (item: string) => {
    setSelectedOtherTags((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]
    );
  };

  const addCustomTag = () => {
    const next = customTag.trim();
    if (!next) {
      Alert.alert("Falta texto", "Escribí un interés antes de agregar.");
      return;
    }
    if (otherOptions.includes(next)) {
      Alert.alert("Ya existe", "Ese interés ya está en la lista.");
      setCustomTag("");
      return;
    }
    setOtherOptions((prev) => [...prev, next]);
    setSelectedOtherTags((prev) => [...prev, next]);
    setCustomTag("");
  };

  const upsertPreferencesWithFallback = async (
    payload: Record<string, any>
  ) => {
    const working = { ...payload };
    while (true) {
      const { error } = await supabase
        .from("user_preferences")
        .upsert(working, { onConflict: "user_id" });
      if (!error) return;

      if (error.code !== "PGRST204") throw error;
      const match = error.message.match(/'([^']+)' column/);
      const missingColumn = match?.[1];
      if (!missingColumn || missingColumn === "user_id") throw error;
      if (!(missingColumn in working)) throw error;
      delete working[missingColumn];
      if (Object.keys(working).length <= 1) throw error;
    }
  };

  const handleSave = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert("Error", "No se encontró sesión activa.");
      return;
    }

    try {
      await upsertPreferencesWithFallback({
        user_id: userId,
        spiritual_path: spiritualPath,
        vegetarian,
        about_me: aboutMe,
        smoking,
        other_tags: selectedOtherTags,
      });
      await refetch();
      Alert.alert("Listo", "Preferencias guardadas.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo guardar.");
    }
  };

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[localStyles.chip, active && localStyles.chipActive]}
      onPress={onPress}
    >
      <Text
        style={[localStyles.chipText, active && localStyles.chipTextActive]}
      >
        {label}
      </Text>
      {active ? <Icon name="checkmark" size={16} color={WHITE} /> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.bg}>
      <ScrollView
        style={styles.settingsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Preferencias</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={localStyles.subtitle}>
          Comentá sobre vos y compartí tus elecciones conscientes.
        </Text>

        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <Icon name="leaf-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={localStyles.sectionTitle}>Camino espiritual</Text>
            <View style={localStyles.line} />
          </View>
          <View style={localStyles.chipWrap}>
            {SPIRITUAL_OPTIONS.map((item) =>
              renderChip(item, spiritualPath.includes(item), () =>
                toggleSpiritualPath(item)
              )
            )}
          </View>
        </View>

        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <Icon name="leaf-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={localStyles.sectionTitle}>Vegetarianismo</Text>
            <View style={localStyles.line} />
          </View>
          <View style={localStyles.chipWrap}>
            {renderChip("Sí", vegetarian === "Sí", () => setVegetarian("Sí"))}
            {renderChip("No", vegetarian === "No", () => setVegetarian("No"))}
          </View>
        </View>

        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <Icon name="flower-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={localStyles.sectionTitle}>Sobre mí</Text>
            <View style={localStyles.line} />
          </View>
          <TextInput
            style={localStyles.aboutInput}
            multiline
            numberOfLines={5}
            value={aboutMe}
            onChangeText={setAboutMe}
            placeholder="Escribir algo sobre vos..."
            placeholderTextColor={GRAY}
            textAlignVertical="top"
          />
        </View>

        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <Icon name="bonfire-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={localStyles.sectionTitle}>Fumar</Text>
            <View style={localStyles.line} />
          </View>
          <View style={localStyles.chipWrap}>
            {renderChip("Sí", smoking === "Sí", () => setSmoking("Sí"))}
            {renderChip("No", smoking === "No", () => setSmoking("No"))}
          </View>
        </View>

        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <Icon name="moon-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={localStyles.sectionTitle}>Otros</Text>
            <View style={localStyles.line} />
          </View>
          <View style={localStyles.chipWrap}>
            {otherOptions.map((item) =>
              renderChip(item, selectedOthers.has(item), () =>
                toggleOther(item)
              )
            )}
          </View>
          <View style={localStyles.addRow}>
            <TextInput
              style={localStyles.addInput}
              value={customTag}
              onChangeText={setCustomTag}
              placeholder="Nuevo interés"
              placeholderTextColor={GRAY}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={localStyles.addButton}
              onPress={addCustomTag}
            >
              <Text style={localStyles.addButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={localStyles.saveButton} onPress={handleSave}>
          <Text style={localStyles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  subtitle: {
    textAlign: "center",
    color: GRAY,
    fontSize: 15,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    color: DARK_GRAY,
    fontWeight: "600",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#F6F6F4",
    marginLeft: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minHeight: 42,
    borderRadius: 24,
    backgroundColor: "#F6F6F4",
    borderWidth: 1,
    borderColor: "#E4B76E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { height: 3, width: 0 },
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    color: DARK_GRAY,
    fontWeight: "500",
    fontSize: 16,
  },
  chipTextActive: {
    color: WHITE,
    fontWeight: "700",
  },
  aboutInput: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#AEBFD1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: DARK_GRAY,
    minHeight: 120,
  },
  addRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#AEBFD1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: DARK_GRAY,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#F6F6F4",
    borderWidth: 1,
    borderColor: "#E4B76E",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { height: 3, width: 0 },
  },
  addButtonText: {
    color: DARK_GRAY,
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 28,
    marginBottom: 22,
    alignSelf: "center",
    width: "72%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { height: 6, width: 0 },
  },
  saveButtonText: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "600",
  },
});

export default Settings;
