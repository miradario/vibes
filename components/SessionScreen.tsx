/** @format */

import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import Constants from "expo-constants";
import Gradient from "./Gradient";

let ElevenLabsProvider: React.ComponentType<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

let elevenLabsLoadError: unknown = null;
let isElevenLabsAvailable = false;

let useConversation: (params?: Record<string, unknown>) => any = () => ({
  status: "disconnected",
  startSession: async () => {
    throw new Error("ElevenLabs SDK is not available in this runtime.");
  },
  endSession: async () => undefined,
});

try {
  const sdk = require("@elevenlabs/react-native");
  ElevenLabsProvider = sdk.ElevenLabsProvider;
  useConversation = sdk.useConversation;
  isElevenLabsAvailable = true;
} catch (error) {
  try {
    const sdk = require("@elevenlabs/react-native/dist/lib.js");
    ElevenLabsProvider = sdk.ElevenLabsProvider;
    useConversation = sdk.useConversation;
    isElevenLabsAvailable = true;
  } catch (fallbackError) {
    elevenLabsLoadError = fallbackError;
    console.error("Failed to load ElevenLabs SDK:", fallbackError);
  }
}

type SessionScreenProps = {
  title?: string;
};

const SessionScreen = ({ title = "Breath Session" }: SessionScreenProps) => {
  return (
    <ElevenLabsProvider>
      <SessionScreenContent title={title} />
    </ElevenLabsProvider>
  );
};

const SessionScreenContent = ({ title }: SessionScreenProps) => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const [isStarting, setIsStarting] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const isExpoGo = Constants.appOwnership === "expo";

  const conversation = useConversation({
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log("Connected to conversation");
      setConversationId(conversationId);
    },
    onDisconnect: () => console.log("Disconnected from conversation"),
    onMessage: (message: string) => console.log("Received message:", message),
    onError: (error: unknown) => console.error("Conversation error:", error),
    onModeChange: (mode: string) => console.log("Conversation mode changed:", mode),
    onStatusChange: (prop: { status: string }) => console.log("Conversation status changed:", prop.status),
    onCanSendFeedbackChange: (prop: { canSendFeedback: boolean }) => console.log("Can send feedback changed:", prop.canSendFeedback),
    onUnhandledClientToolCall: (params: unknown) => console.log("Unhandled client tool call:", params),
  });

  const startConversation = async () => {
    if (isStarting) return;
    if (!isElevenLabsAvailable || isExpoGo) {
      console.error("ElevenLabs unavailable", {
        isExpoGo,
        loadError: elevenLabsLoadError,
      });
      Alert.alert("ElevenLabs no disponible", "Ejecuta la app en un dev build (npx expo run:android / run:ios), no en Expo Go.");
      return;
    }

    try {
      setIsStarting(true);
      await conversation.startSession({
        agentId: process.env.EXPO_PUBLIC_AGENT_ID,
        dynamicVariables: {
          user_name: session?.user?.email?.split("@")[0] || "Daro",
          session_tittle: title,
        },
      });
      console.log("Conversation started");
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    console.log("BUTTON PRESSED -> endConversation() called");
    try {
      console.log("Ending conversation...");
      await conversation.endSession();

      setTimeout(() => {
        navigation.goBack();
      }, 150);
    } catch (error) {
      console.error("Error ending conversation:", error);
    }
  };

  const canStart = conversation.status === "disconnected" && !isStarting;
  const canEnd = conversation.status === "connected";
  const isBusy = conversation.status === "connecting" || isStarting;
  const isSpeaking = conversation.status === "connected";

  return (
    <SafeAreaView style={localStyles.screen}>
      <Gradient
        position="top"
        isSpeaking={isSpeaking}
        sizeMultiplier={0.5}
        colors={{
          halo: "#AEBFD1",
          core: "#E4B76E",
          ember: "#F6F6F4",
        }}
      />

      <View style={localStyles.content}>
        <Text style={localStyles.brandTitle}>guruVibe</Text>
        <Text style={localStyles.subtitle}>A space to tune into what's present.</Text>
        <TouchableOpacity onPress={canStart ? startConversation : endConversation} disabled={isBusy || (!canStart && !canEnd)} style={[localStyles.cta, (isBusy || (!canStart && !canEnd)) && localStyles.ctaDisabled]}>
          <Text style={localStyles.ctaText}>{canStart ? "I'm ready" : "End session"}</Text>
        </TouchableOpacity>
        <Text style={localStyles.statusText}>{isBusy ? "connecting..." : conversation.status}</Text>
        {Boolean(conversationId) && <Text style={localStyles.metaText}>{conversationId}</Text>}
      </View>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F6F4",
  },
  orbOuter: {
    position: "absolute",
    top: -30,
    alignSelf: "center",
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: "rgba(228, 183, 110, 0.38)",
  },
  orbMiddle: {
    position: "absolute",
    top: 52,
    alignSelf: "center",
    width: 370,
    height: 370,
    borderRadius: 185,
    backgroundColor: "rgba(216, 140, 122, 0.33)",
    borderWidth: 1,
    borderColor: "rgba(246, 246, 244, 0.9)",
  },
  orbInner: {
    position: "absolute",
    top: 95,
    alignSelf: "center",
    width: 285,
    height: 285,
    borderRadius: 142.5,
    backgroundColor: "rgba(246, 246, 244, 0.55)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 250,
  },
  brandTitle: {
    fontSize: 64,
    lineHeight: 68,
    color: "#2B2B2B",
    fontFamily: "CormorantGaramond_500Medium",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 16,
    fontSize: 20,
    lineHeight: 30,
    color: "#2B2B2B",
    textAlign: "center",
    fontFamily: "CormorantGaramond_500Medium",
  },
  cta: {
    marginTop: 120,
    minWidth: 280,
    borderRadius: 36,
    paddingVertical: 18,
    paddingHorizontal: 36,
    alignItems: "center",
    backgroundColor: "#E4B76E",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.9)",
    shadowColor: "rgba(228, 183, 110, 0.8)",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: "#2B2B2B",
    fontSize: 22,
    fontFamily: "CormorantGaramond_500Medium",
    fontWeight: "600",
  },
  statusText: {
    marginTop: 16,
    color: "#6E6E6E",
    fontSize: 13,
    textTransform: "lowercase",
  },
  metaText: {
    marginTop: 4,
    color: "#6E6E6E",
    fontSize: 11,
  },
});

export default SessionScreen;
