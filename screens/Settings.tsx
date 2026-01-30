import React from "react";
import { View, Text, ImageBackground, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const Settings = () => {
  const navigation = useNavigation();
  const items = [
    "Cuenta",
    "Notificaciones",
    "Privacidad",
    "Pagos",
    "Idioma",
    "Cerrar sesión",
  ];
  const personalItems = [
    { icon: "eye", label: "Open to" },
    { icon: "globe", label: "Idiomas" },
    { icon: "moon", label: "Zodiaco" },
    { icon: "school", label: "Educación" },
    { icon: "people", label: "Plan familiar" },
    { icon: "medkit", label: "Vacuna" },
    { icon: "grid", label: "Personalidad" },
    { icon: "chatbubble", label: "Estilo de comunicación" },
    { icon: "heart", label: "Estilo de amor" },
    { icon: "leaf", label: "Mascotas" },
    { icon: "leaf", label: "Vegetariano" },
    { icon: "flame", label: "Fuma" },
    { icon: "calendar", label: "Desde cuándo" },
    { icon: "star", label: "Guru" },
    { icon: "planet", label: "Camino" },
    { icon: "time", label: "Frecuencia de práctica" },
  ];

  return (
    <ImageBackground
      source={require("../assets/images/bg.png")}
      style={styles.bg}
    >
      <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Settings</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Configuración</Text>
          <View style={styles.settingsCard}>
            {items.map((label, index) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.settingsRow,
                  index === items.length - 1 && styles.settingsRowLast,
                ]}
              >
                <Text style={styles.settingsLabel}>{label}</Text>
                <Icon name="chevron-forward" size={16} color={DARK_GRAY} />
              </TouchableOpacity>
            ))}
          </View>
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
                  navigation.navigate("PreferenceDetail" as never, {
                    label: item.label,
                  } as never)
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
