/** @format */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  FlatList,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components";
import DEMO from "../assets/data/demo";
import styles, { DARK_GRAY } from "../assets/styles";

const Matches = () => {
  const navigation = useNavigation();
  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <View style={styles.soulmateScreen}>
        <View style={styles.soulmateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.soulmateTitle}>Resonances</Text>
          <View style={{ width: 22 }} />
        </View>

        <FlatList
          data={DEMO}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.soulmateList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.soulmateItem}
              onPress={() =>
                navigation.navigate(
                  "Match" as never,
                  { profile: item } as never,
                )
              }
            >
              <View style={styles.soulmateHaloWrap}>
                <Image
                  source={require("../assets/images/sparklings.png")}
                  style={styles.soulmateSparkles}
                  resizeMode="contain"
                />
                <Image
                  source={require("../assets/images/halo.png")}
                  style={styles.soulmateHalo}
                  resizeMode="contain"
                />
                <Image source={item.image} style={styles.soulmateAvatar} />
              </View>
              <Text style={styles.soulmateName}>{item.name}</Text>
              <Text style={styles.soulmateCity}>
                {item.location || "Buenos Aires"}
              </Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity style={styles.soulmateFooterButton}>
          <Text style={styles.soulmateFooterText}>See previous resonances</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

export default Matches;
