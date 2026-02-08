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
  const matchesWithLikes = [
    { id: "likes-you", name: "Likes you", image: matches[0]?.image },
    ...matches,
  ];

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
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

              <TouchableOpacity
                style={styles.flowSectionHeader}
                onPress={() => navigation.navigate("Soulmates" as never)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name="heart" color="#FF6F66" size={16} />
                  <Text style={[styles.flowSectionTitle, { marginLeft: 8 }]}>
                    New Connections
                  </Text>
                </View>
                <View style={styles.flowSectionCount}>
                  <Text style={styles.flowSectionCountText}>{matches.length}</Text>
                </View>
              </TouchableOpacity>

              <FlatList
                horizontal
                data={matchesWithLikes}
                keyExtractor={(item, index) => `match-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.matchesRow}
                renderItem={({ item }) => {
                  const isLikesYou = item.id === "likes-you";
                  return (
                    <TouchableOpacity
                      style={styles.matchItem}
                      onPress={() => {
                        if (isLikesYou) {
                          navigation.navigate("Soulmates" as never);
                        } else {
                          navigation.navigate("Chat" as never, { profile: item } as never);
                        }
                      }}
                    >
                      <View style={styles.matchAvatarWrap}>
                        <Image
                          source={item.image}
                          style={styles.matchAvatar}
                          blurRadius={isLikesYou ? 12 : 0}
                        />
                        <View style={styles.matchDot} />
                      </View>
                      <Text style={styles.matchName}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
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
