import React from "react";
import { View, Text, ImageBackground, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const PreferenceDetail = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const label = route?.params?.label || "Preferencia";

  return (
    <ImageBackground
      source={require("../assets/images/bg.png")}
      style={styles.bg}
    >
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>{label}</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.preferenceCard}>
          <Text style={styles.preferenceText}>
            Aquí el usuario podrá completar sus gustos personales para{" "}
            <Text style={styles.preferenceEmphasis}>{label}</Text>.
          </Text>
          <TouchableOpacity style={styles.editPrimaryButton}>
            <Text style={styles.editPrimaryText}>Agregar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

export default PreferenceDetail;
