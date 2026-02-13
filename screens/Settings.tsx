/** @format */

import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useLogoutMutation } from "../src/auth/auth.queries";

const Settings = () => {
  const navigation = useNavigation();
  const { mutate: logout, isLoading: isLoggingOut } = useLogoutMutation();
  const items = [
    { label: "Cuenta" },
    { label: "Notificaciones" },
    { label: "Privacidad" },
    { label: "Pagos" },
    { label: "Idioma" },
    { label: "Cerrar sesión", isLogout: true },
  ];
  const personalItems = [
    { icon: "eye", label: "Open to", key: "open_to" },
    { icon: "globe", label: "Idiomas", key: "languages" },
    { icon: "moon", label: "Zodiaco", key: "zodiac" },
    { icon: "school", label: "Educación", key: "education" },
    { icon: "people", label: "Plan familiar", key: "family_plan" },
    { icon: "medkit", label: "Vacuna", key: "vaccine" },
    { icon: "grid", label: "Personalidad", key: "personality" },
    {
      icon: "chatbubble",
      label: "Estilo de comunicación",
      key: "communication_style",
    },
    { icon: "heart", label: "Estilo de amor", key: "love_style" },
    { icon: "leaf", label: "Mascotas", key: "pets" },
    { icon: "leaf", label: "Vegetariano", key: "vegetarian" },
    { icon: "flame", label: "Fuma", key: "smoking" },
  ];

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <ScrollView
        style={styles.settingsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Preferences</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.settingsSection}>
          <View style={styles.settingsSectionHeader}>
            <Text style={styles.settingsSectionTitle}>Gustos personales</Text>
            <View style={styles.settingsTag}>
              <Text style={styles.settingsTagText}>Nuevo</Text>
            </View>
          </View>
          <View style={styles.settingsCard}>
            {personalItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingsRow,
                  index === personalItems.length - 1 && styles.settingsRowLast,
                ]}
                onPress={() =>
                  navigation.navigate(
                    "PreferenceDetail" as never,
                    {
                      label: item.label,
                      key: item.key,
                    } as never,
                  )
                }
              >
                <View style={styles.settingsRowLeft}>
                  <Icon name={item.icon} size={16} color={DARK_GRAY} />
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                </View>
                <View style={styles.settingsRowRight}>
                  <Text style={styles.settingsAdd}>Agregar</Text>
                  <Icon name="chevron-forward" size={16} color={DARK_GRAY} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default Settings;
