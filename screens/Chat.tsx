import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Icon } from "../components";
import styles, { DARK_GRAY } from "../assets/styles";

const Chat = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const profile = route?.params?.profile;

  return (
    <View style={styles.bg}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={22} color={DARK_GRAY} />
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <View style={styles.chatAvatarWrap}>
            <Icon name="person" size={16} color={DARK_GRAY} />
          </View>
          <Text style={styles.chatName}>{profile?.name || "Chat"}</Text>
        </View>
        <TouchableOpacity>
          <Icon name="ellipsis-horizontal" size={20} color={DARK_GRAY} />
        </TouchableOpacity>
      </View>

      <View style={styles.chatBody}>
        <Text style={styles.chatMatchedText}>
          You connected with {profile?.name || "them"} on 11/07/2023.
        </Text>

        <View style={styles.chatBubbleLeft}>
          <Text style={styles.chatBubbleTextLeft}>
            Hey, what's up with dog pics?
          </Text>
        </View>

        <View style={styles.chatBubbleRight}>
          <Text style={styles.chatBubbleTextRight}>cuz em a dog 🐶</Text>
          <Text style={styles.chatSent}>Sent</Text>
        </View>
      </View>

      <View style={styles.chatInputBar}>
        <Text style={styles.chatInputPlaceholder}>Type a message ...</Text>
        <Text style={styles.chatSend}>SEND</Text>
      </View>

      <View style={styles.chatTools}>
        <TouchableOpacity style={styles.chatToolButton}>
          <Icon name="person" size={16} color={DARK_GRAY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatToolPill}>
          <Text style={styles.chatToolText}>GIF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatToolButton}>
          <Icon name="star" size={16} color={DARK_GRAY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatToolButton}>
          <Icon name="musical-notes" size={16} color={DARK_GRAY} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Chat;
