/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
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
import DEMO from "../assets/data/demo";

const EventChat = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const event = (route.params as any)?.event;
  const [message, setMessage] = useState("");

  const participants = DEMO.slice(0, 3);

  const messages = [
    {
      id: "1",
      sender: "Vale Martínez",
      text: "Hola! Bienvenidos 😊\nLos espero a las 18 en los lagos.\nCada uno puede traer algo para sentarse. ¡Qué lindo vernos pronto!",
      time: "10:25",
      avatar: require("../assets/images/01.jpg"),
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ImageBackground
        source={
          event?.image ||
          require("../assets/images/events/evento_meditation.png")
        }
        style={styles.eventChatBackground}
      >
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
                key={index}
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
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

export default EventChat;
