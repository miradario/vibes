import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon, Message } from "../components";
import DEMO from "../assets/data/demo";
import styles, { DARK_GRAY } from "../assets/styles";

const Messages = () => {
  const navigation = useNavigation();
  const matches = DEMO.slice(0, 6);

  return (
    <ImageBackground
      source={require("../assets/images/bg.png")}
      style={styles.bg}
    >
      <View style={styles.containerMessages}>
        <FlatList
          data={DEMO}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={
            <View>
              <View style={styles.flowTop}>
                <TouchableOpacity style={styles.flowTopIcon}>
                  <Icon name="infinite" color={DARK_GRAY} size={20} />
                </TouchableOpacity>
                <View style={styles.flowTopCenter}>
                  <Icon name="chatbubble-ellipses" color="#FF6F66" size={26} />
                </View>
                <TouchableOpacity style={styles.flowTopIcon}>
                  <Icon name="ellipsis-vertical" color={DARK_GRAY} size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.flowSectionHeader}>
                <Text style={styles.flowSectionTitle}>New Connections</Text>
                <View style={styles.flowSectionCount}>
                  <Text style={styles.flowSectionCountText}>{matches.length}</Text>
                </View>
              </View>

              <FlatList
                horizontal
                data={matches}
                keyExtractor={(item, index) => `match-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.matchesRow}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.matchItem}>
                    <View style={styles.matchAvatarWrap}>
                      <Image source={item.image} style={styles.matchAvatar} />
                      <View style={styles.matchDot} />
                    </View>
                    <Text style={styles.matchName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />

              <View style={styles.flowSectionHeader}>
                <Text style={styles.flowSectionTitle}>Messages</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.messageRow}
              onPress={() => navigation.navigate("Chat" as never, { profile: item } as never)}
            >
              <Message
                image={item.image}
                name={item.name}
                lastMessage={item.message}
              />
            </TouchableOpacity>
          )}
        />
      </View>
    </ImageBackground>
  );
};

export default Messages;
