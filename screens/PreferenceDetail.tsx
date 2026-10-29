import SelectablePill from "../components/onboarding/SelectablePill";
import { vibesTheme } from "../src/theme/vibesTheme";
import { PROFILE_PREFERENCE_OPTIONS } from "../src/lib/profilePreferenceOptions";
import React, { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Text } from "../components/Typography";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, {
} from "../assets/styles";
import AppHeader from "../components/AppHeader";
import { useAuthSession } from "../src/auth/auth.queries";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { showToast } from "../src/utils/toast";
import * as ds from "../src/theme/tokens";

const toCamelKey = (key: string) =>
  key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase()
  );

const PreferenceDetail = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const label = route?.params?.label || "Preferencia";
  const prefKey = route?.params?.key as string | undefined;
  const { data: session } = useAuthSession();
  const { data: prefs, refetch } = useUserPreferencesQuery(session?.user?.id);

  const config = useMemo(() => {
    const options = PROFILE_PREFERENCE_OPTIONS;

    if (!prefKey || !(prefKey in options)) {
      return {
        label,
        multiple: false,
        options: ["Opción 1", "Opción 2", "Opción 3"],
      };
    }

    return (options as any)[prefKey];
  }, [label, prefKey]);

  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!prefKey) return;
    const current = prefs?.[prefKey] ?? prefs?.[toCamelKey(prefKey)];
    if (config.multiple) {
      const next = Array.isArray(current) ? current : [];
      setSelected(next);
    } else {
      const next = typeof current === "string" ? [current] : [];
      setSelected(next);
    }
  }, [prefs, prefKey, config.multiple]);

  const toggleOption = (option: string) => {
    if (config.multiple) {
      setSelected((prev) =>
        prev.includes(option)
          ? prev.filter((item) => item !== option)
          : [...prev, option]
      );
      return;
    }
    setSelected([option]);
  };

  const handleSave = async () => {
    const userId = session?.user?.id;
    if (!userId || !prefKey) {
      Alert.alert("Error", "No se pudo guardar.");
      return;
    }

    const value = config.multiple ? selected : selected[0] ?? null;
    try {
      await upsertUserPreferences(userId, {
        [prefKey]: value,
      });
    } catch (error: any) {
      console.log("user_preferences upsert error:", error);
      Alert.alert("Error", error?.message || "No se pudo guardar.");
      return;
    }

    await refetch();
    navigation.goBack();
    setTimeout(() => {
      showToast("Preferencia guardada", {
        type: "success",
        text1: "Preferencia guardada",
      });
    }, 180);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.settingsContainer}>
        <AppHeader
          title={config.label}
          showBack
          onBack={() => navigation.goBack()}
          style={{ paddingHorizontal: 0, marginBottom: ds.spacing[2] }}
          titleStyle={styles.settingsTitle}
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.preferenceCard}>
            <Text style={styles.preferenceText}>
              Seleccioná tu preferencia para{" "}
              <Text style={styles.preferenceEmphasis}>{config.label}</Text>.
            </Text>

            <View style={{ marginTop: ds.spacing[2], flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[3] }}>
              {config.options.map((option: string) => (
                <SelectablePill key={option} label={option} selected={selected.includes(option)} onPress={() => toggleOption(option)} />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.editPrimaryButton,
                !selected.length && { opacity: 0.6 },
              ]}
              onPress={handleSave}
              disabled={!selected.length}
            >
              <Text style={styles.editPrimaryText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default PreferenceDetail;
