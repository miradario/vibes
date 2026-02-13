/** @format */

import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, GRAY, WHITE } from "../assets/styles";
import Icon from "../components/Icon";

const TermsConditions = () => {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Términos y condiciones</Text>
          <View style={{ width: 22 }} />
        </View>

        <Image source={require("../assets/images/logo.png")} style={localStyles.hero} />
        <Text style={localStyles.subtitle}>
          Lee con tranquilidad y conciencia nuestros términos.
        </Text>

        <ScrollView
          style={localStyles.card}
          contentContainerStyle={localStyles.cardContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={localStyles.titleText}>Bienvenido a Vibes</Text>
          <Text style={localStyles.bodyText}>
            Te invitamos a leer con conciencia estos Términos y Condiciones.
          </Text>

          <Text style={localStyles.titleText}>Aceptación</Text>
          <Text style={localStyles.bodyText}>
            Al usar Vibes, confirmás que aceptás estos términos.
          </Text>

          <Text style={localStyles.titleText}>Edad y uso</Text>
          <Text style={localStyles.bodyText}>
            Para usar Vibes, debés ser mayor de 18 años y utilizar la plataforma de forma respetuosa.
          </Text>

          <Text style={localStyles.titleText}>Privacidad</Text>
          <Text style={localStyles.bodyText}>
            Tus datos se procesan conforme a nuestra política de privacidad y se usan para mejorar tu experiencia.
          </Text>

          <Text style={localStyles.titleText}>Contenido</Text>
          <Text style={localStyles.bodyText}>
            No está permitido publicar contenido ofensivo, ilegal o que afecte la seguridad de otras personas.
          </Text>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const localStyles = StyleSheet.create({
  hero: {
    width: 160,
    height: 160,
    alignSelf: "center",
    resizeMode: "contain",
    marginTop: 8,
  },
  subtitle: {
    textAlign: "center",
    color: DARK_GRAY,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 18,
    fontFamily: "serif",
  },
  card: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8D8C7",
  },
  cardContent: {
    padding: 16,
    paddingBottom: 30,
  },
  titleText: {
    color: DARK_GRAY,
    fontSize: 17,
    fontFamily: "serif",
    marginTop: 8,
    marginBottom: 6,
  },
  bodyText: {
    color: GRAY,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
});

export default TermsConditions;
