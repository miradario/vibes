import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, { DARK_GRAY, GRAY, PRIMARY_COLOR, WHITE } from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import { supabase } from "../src/lib/supabase";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";

const PreferenceDetail = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const label = route?.params?.label || "Preferencia";
  const prefKey = route?.params?.key as string | undefined;
  const { data: session } = useAuthSession();
  const { data: prefs, refetch } = useUserPreferencesQuery(session?.user?.id);

  const config = useMemo(() => {
    const options = {
      open_to: {
        label: "Open to",
        multiple: true,
        options: ["Mujeres", "Hombres", "Todos"],
      },
      languages: {
        label: "Idiomas",
        multiple: true,
        options: ["Español", "Inglés", "Portugués", "Francés", "Italiano"],
      },
      zodiac: {
        label: "Zodiaco",
        multiple: false,
        options: [
          "Aries",
          "Tauro",
          "Géminis",
          "Cáncer",
          "Leo",
          "Virgo",
          "Libra",
          "Escorpio",
          "Sagitario",
          "Capricornio",
          "Acuario",
          "Piscis",
        ],
      },
      education: {
        label: "Educación",
        multiple: false,
        options: ["Secundaria", "Técnico", "Universidad", "Posgrado"],
      },
      family_plan: {
        label: "Plan familiar",
        multiple: false,
        options: ["Quiero hijos", "No quiero", "Tal vez", "Ya tengo"],
      },
      vaccine: {
        label: "Vacuna",
        multiple: false,
        options: ["Sí", "No", "Prefiero no decir"],
      },
      personality: {
        label: "Personalidad",
        multiple: false,
        options: ["Introvertido", "Extrovertido", "Ambivertido"],
      },
      communication_style: {
        label: "Estilo de comunicación",
        multiple: false,
        options: ["Directo", "Calmado", "Humor", "Profundo"],
      },
      love_style: {
        label: "Estilo de amor",
        multiple: false,
        options: [
          "Palabras de afirmación",
          "Tiempo de calidad",
          "Regalos",
          "Actos de servicio",
          "Contacto físico",
        ],
      },
      pets: {
        label: "Mascotas",
        multiple: false,
        options: ["Tengo", "No tengo", "Me encantan", "No me gustan"],
      },
      vegetarian: {
        label: "Vegetariano",
        multiple: false,
        options: ["Sí", "No", "Pescetariano", "Vegano"],
      },
      smoking: {
        label: "Fuma",
        multiple: false,
        options: ["Sí", "No", "A veces"],
      },
    };

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
    const current = prefs?.[prefKey];
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
    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          [prefKey]: value,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.log("user_preferences upsert error:", error);
      Alert.alert("Error", error.message || "No se pudo guardar.");
      return;
    }

    await refetch();
    navigation.goBack();
  };

  return (
    <View style={styles.bg}>
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>{config.label}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.preferenceCard}>
            <Text style={styles.preferenceText}>
              Selecciona tu preferencia para{" "}
              <Text style={styles.preferenceEmphasis}>{config.label}</Text>.
            </Text>

            <View style={{ marginTop: 8 }}>
              {config.options.map((option: string) => {
                const active = selected.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => toggleOption(option)}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? PRIMARY_COLOR : "#E8D8C7",
                      backgroundColor: active ? "#FFEDE2" : WHITE,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? PRIMARY_COLOR : DARK_GRAY,
                        fontWeight: active ? "700" : "500",
                      }}
                    >
                      {option}
                    </Text>
                    {config.multiple && (
                      <Text style={{ color: GRAY, fontSize: 12, marginTop: 4 }}>
                        {active ? "Seleccionado" : "Toca para seleccionar"}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
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
