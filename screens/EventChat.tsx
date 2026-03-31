/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, { TEXT_SECONDARY, WHITE } from "../assets/styles";
import Icon from "../components/Icon";

const EventChat = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const event = (route.params as any)?.event;
  const [message, setMessage] = useState("");
  const participants: Array<{ id: string; image: any }> = [];
  const messages: Array<{ id: string; sender: string; text: string; time: string }> = [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.eventChatBackground}>
        <View style={styles.eventChatHeader}>
          <TouchableOpacity
            style={styles.eventChatBackButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          <View style={styles.eventChatHeaderInfo}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.eventChatHeaderLogo}
            />
            <View>
              <Text style={styles.eventChatHeaderTitle}>
                {event?.title || "Meditación al atardecer"}
              </Text>
              <Text style={styles.eventChatHeaderSubtitle}>— Palermo</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.eventChatMenuButton}>
            <Icon name="ellipsis-vertical" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.eventChatParticipantsSection}>
          <View style={styles.eventChatParticipants}>
            {participants.map((participant, index) => (
              <Image
                key={participant.id || index}
                source={participant.image}
                style={[
                  styles.eventChatParticipantAvatar,
                  index > 0 && { marginLeft: -15 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.eventChatDescription}>
            Este es el espacio del evento.{"\n"}
            Usalo para coordinar, compartir{"\n"}y llegar con presencia.
          </Text>
          <View style={styles.eventChatTags}>
            <View style={styles.eventChatTag}>
              <Text style={styles.eventChatTagIcon}>🌿</Text>
              <Text style={styles.eventChatTagText}>Escucha</Text>
            </View>
            <View style={styles.eventChatTag}>
              <Text style={styles.eventChatTagIcon}>🙏</Text>
              <Text style={styles.eventChatTagText}>Respeto</Text>
            </View>
            <View style={styles.eventChatTag}>
              <Text style={styles.eventChatTagIcon}>🧘</Text>
              <Text style={styles.eventChatTagText}>Presencia</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.eventChatMessagesContainer}
          contentContainerStyle={styles.eventChatMessagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={localStyles.emptyMessages}>
              <Text style={localStyles.emptyMessagesTitle}>No event messages yet</Text>
              <Text style={localStyles.emptyMessagesText}>
                Demo chat content was removed. Load real event participants and
                messages here when that backend is ready.
              </Text>
            </View>
          ) : null}
          {messages.map((msg) => (
            <View key={msg.id} style={styles.eventChatMessageBubble}>
              <Text style={styles.eventChatMessageSender}>
                {msg.sender}
                <Text style={styles.eventChatMessageTime}> {msg.time}</Text>
              </Text>
              <Text style={styles.eventChatMessageText}>{msg.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.eventChatInputContainer}>
          <TouchableOpacity style={styles.eventChatAttachButton}>
            <Icon name="chatbubble-outline" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          <TextInput
            style={styles.eventChatInput}
            placeholder="Escribir mensaje..."
            placeholderTextColor={TEXT_SECONDARY}
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={styles.eventChatSendButton}>
            <Icon name="send" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default EventChat;

const localStyles = {
  emptyMessages: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center" as const,
  },
  emptyMessagesTitle: {
    color: "#2B2B2B",
    fontSize: 22,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center" as const,
  },
  emptyMessagesText: {
    marginTop: 10,
    color: "#6E6E6E",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center" as const,
  },
};
