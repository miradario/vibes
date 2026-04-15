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
import VibesHeader from "../src/components/VibesHeader";
import SpiritualPathDetailsModal from "../components/SpiritualPathDetailsModal";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  getSelectedSpiritualPaths,
  hasSpiritualPathDetail,
  normalizeSpiritualPathDetail,
  normalizeSpiritualPathDetails,
  SPIRITUAL_PATH_OPTIONS,
  type SpiritualPathDetail,
  type SpiritualPathDetails,
} from "../src/lib/spiritualPaths";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";

const OTHER_DEFAULT_OPTIONS = ["Viajes", "Animales", "Arte"];

const Settings = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: prefs, refetch } = useUserPreferencesQuery(session?.user?.id);

  const [spiritualPath, setSpiritualPath] = useState<string[]>([]);
  const [spiritualPathDetails, setSpiritualPathDetails] =
    useState<SpiritualPathDetails>({});
  const [activeSpiritualPath, setActiveSpiritualPath] = useState<string | null>(
    null,
  );
  const [vegetarian, setVegetarian] = useState<"Sí" | "No">("No");
  const [aboutMe, setAboutMe] = useState("");
  const [smoking, setSmoking] = useState<"Sí" | "No">("No");
  const [otherOptions, setOtherOptions] = useState<string[]>(
    OTHER_DEFAULT_OPTIONS,
  );
  const [selectedOtherTags, setSelectedOtherTags] = useState<string[]>(
    OTHER_DEFAULT_OPTIONS,
  );
  const [customTag, setCustomTag] = useState("");

  useEffect(() => {
    if (!prefs) return;

    setSpiritualPath(
      getSelectedSpiritualPaths(
        prefs.spiritualPath ?? prefs.spiritual_path,
        prefs.spiritualPathDetails ?? prefs.spiritual_path_details,
      ),
    );
    setSpiritualPathDetails(
      normalizeSpiritualPathDetails(
        prefs.spiritualPathDetails ?? prefs.spiritual_path_details,
      ),
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
        Array.from(new Set([...prev, ...prefs.otherTags])),
      );
    }
  }, [prefs]);

  const selectedOthers = useMemo(
    () => new Set(selectedOtherTags),
    [selectedOtherTags],
  );

  const openSpiritualPathEditor = (item: string) => {
    setSpiritualPath((prev) => (prev.includes(item) ? prev : [...prev, item]));
    setActiveSpiritualPath(item);
  };

  const updateSpiritualPathDetail = (
    item: string,
    nextDetail: SpiritualPathDetail,
  ) => {
    setSpiritualPathDetails((prev) => ({
      ...prev,
      [item]: normalizeSpiritualPathDetail(nextDetail),
    }));
  };

  const removeSpiritualPath = (item: string) => {
    setSpiritualPath((prev) => prev.filter((value) => value !== item));
    setSpiritualPathDetails((prev) => {
      const next = { ...prev };
      delete next[item];
      return next;
    });
    setActiveSpiritualPath(null);
  };

  const toggleOther = (item: string) => {
    setSelectedOtherTags((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item],
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

  const handleSave = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert("Error", "No se encontró sesión activa.");
      return;
    }

    try {
      await upsertUserPreferences(userId, {
        spiritual_path: spiritualPath,
        spiritual_path_details: spiritualPathDetails,
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

  // Interceptar back para guardar antes de salir
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // Si ya estamos guardando, dejar pasar
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        handleSave().finally(() => {
          navigation.dispatch(e.data.action);
        });
      }
    });
    return unsubscribe;
  }, [navigation, spiritualPath, spiritualPathDetails, vegetarian, aboutMe, smoking, selectedOtherTags]);

  return (
    <View style={styles.bg}>
      <ScrollView
        style={styles.settingsContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <VibesHeader title="Preferencias" subtitle="Comentá sobre vos y compartí tus elecciones conscientes." />

        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <Icon name="leaf-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={localStyles.sectionTitle}>Camino espiritual</Text>
            <View style={localStyles.line} />
          </View>
          <Text style={localStyles.helperText}>
            Tocá un camino para seleccionarlo y sumar datos opcionales.
          </Text>
          <View style={localStyles.chipWrap}>
            {SPIRITUAL_PATH_OPTIONS.map((item) =>
              renderChip(item, spiritualPath.includes(item), () =>
                openSpiritualPathEditor(item),
              ),
            )}
          </View>
          {spiritualPath.length > 0 ? (
            <View style={localStyles.detailList}>
              {spiritualPath.map((item) => (
                <TouchableOpacity
                  key={`${item}-detail`}
                  style={localStyles.detailItem}
                  onPress={() => setActiveSpiritualPath(item)}
                  activeOpacity={0.85}
                >
                  <Text style={localStyles.detailItemTitle}>{item}</Text>
                  <Text style={localStyles.detailItemSubtitle}>
                    {hasSpiritualPathDetail(spiritualPathDetails[item])
                      ? "Editar datos opcionales"
                      : "Agregar datos opcionales"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
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
              renderChip(item, selectedOthers.has(item), () => toggleOther(item)),
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

      </ScrollView>

      {/* Botón fijo abajo */}
      <View style={localStyles.saveButtonFixedWrap}>
        <TouchableOpacity style={localStyles.saveButton} onPress={handleSave}>
          <Text style={localStyles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <SpiritualPathDetailsModal
        visible={Boolean(activeSpiritualPath)}
        pathLabel={activeSpiritualPath}
        detail={
          activeSpiritualPath ? spiritualPathDetails[activeSpiritualPath] ?? {} : {}
        }
        onChange={(nextDetail) => {
          if (!activeSpiritualPath) return;
          updateSpiritualPathDetail(activeSpiritualPath, nextDetail);
        }}
        onClose={() => setActiveSpiritualPath(null)}
        onRemove={
          activeSpiritualPath
            ? () => removeSpiritualPath(activeSpiritualPath)
            : undefined
        }
      />
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
  helperText: {
    color: GRAY,
    fontSize: 14,
    marginBottom: 10,
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
  detailList: {
    marginTop: 12,
    gap: 10,
  },
  detailItem: {
    borderWidth: 1,
    borderColor: "rgba(168, 131, 102, 0.18)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FBF8F4",
  },
  detailItemTitle: {
    color: DARK_GRAY,
    fontSize: 17,
    fontWeight: "700",
  },
  detailItemSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 4,
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
  saveButtonFixedWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F6F6F4',
    zIndex: 10,
  },
  saveButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E4B76E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  saveButtonText: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "600",
  },
});

export default Settings;
