/** @format */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Icon } from "../components";
import CardItem from "../components/CardItem";
import styles, { DARK_GRAY } from "../assets/styles";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useDirectMessagesQuery,
  useSendDirectMessageMutation,
  useDeleteDirectMessageMutation,
  type DirectMessage,
} from "../src/queries/matches.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";

const LOGO = require("../assets/images/logo.png");

const Chat = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const { matchId, otherUserId, otherUserName, otherUserPhoto } =
    route?.params ?? {};

  // Estado para mostrar CardItem modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { data: profile } = useProfileQuery(otherUserId);
  const { data: preferences } = useUserPreferencesQuery(otherUserId);

  const { data: session } = useAuthSession();
  const myId = session?.user?.id;

  const { data: messages, isLoading } = useDirectMessagesQuery(matchId);
  const sendMutation = useSendDirectMessageMutation();
  const deleteMutation = useDeleteDirectMessageMutation();

  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  const handleSend = () => {
    const body = text.trim();
    if (!body || !matchId) return;
    setText("");
    sendMutation.mutate(
      { matchId, body },
      {
        onError: (err) => {
          Alert.alert("Error", err.message || "Could not send message");
        },
      },
    );
  };

  const handleLongPress = (msg: DirectMessage) => {
    if (msg.senderId !== myId) return;
    Alert.alert("Delete message?", msg.text.slice(0, 60), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteMutation.mutate({ messageId: msg.id, matchId: msg.matchId }),
      },
    ]);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const isOwn = item.senderId === myId;
    const bubble = (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleLongPress(item)}
        style={[
          isOwn ? styles.chatBubbleRight : styles.chatBubbleLeft,
          localStyles.messageBubble,
        ]}
      >
        <Text
          style={isOwn ? styles.chatBubbleTextRight : styles.chatBubbleTextLeft}
        >
          {item.text}
        </Text>
        <Text
          style={[
            localStyles.msgTime,
            isOwn ? localStyles.msgTimeRight : localStyles.msgTimeLeft,
          ]}
        >
          {formatTime(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );

    if (isOwn) {
      return <View style={localStyles.ownMessageRow}>{bubble}</View>;
    }

    return (
      <View style={localStyles.incomingMessageRow}>
        <Image
          source={otherUserPhoto ? { uri: otherUserPhoto } : LOGO}
          style={localStyles.messageAvatar}
        />
        {bubble}
      </View>
    );
  };

  const matchDate = messages?.[0]?.createdAt;

  return (
    <KeyboardAvoidingView
      style={styles.bg}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={22} color={DARK_GRAY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatHeaderCenter} onPress={() => setShowProfileModal(true)}>
          <Image
            source={otherUserPhoto ? { uri: otherUserPhoto } : LOGO}
            style={styles.chatAvatarWrap}
          />
          <Text style={styles.chatName}>{otherUserName || "Chat"}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="ellipsis-horizontal" size={20} color={DARK_GRAY} />
        </TouchableOpacity>
      </View>
      {/* Modal CardItem del usuario, igual a Discover */}
      {showProfileModal && profile && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
          />
          <View style={{ width: '94%', maxHeight: '92%', borderRadius: 32, overflow: 'hidden', backgroundColor: 'transparent' }}>
            <CardItem
              variant="discover"
              name={profile.display_name || profile.name || ''}
              age={profile.birth_date ? String(new Date().getFullYear() - new Date(profile.birth_date).getFullYear()) : ''}
              image={profile.photo_url || (profile.photos && profile.photos[0]?.url) || otherUserPhoto ? { uri: otherUserPhoto } : LOGO}
              images={profile.photos?.map((p: any) => ({ uri: p.url }))}
              location={profile.location}
              description={profile.about_me}
              vibe={profile.vibe}
              intention={profile.intent}
              prompt={profile.prompt}
              tags={profile.tags}
              preferences={preferences?.otherTags}
              spiritualPath={preferences?.spiritualPath}
              spiritualPathDetails={preferences?.spiritualPathDetails}
              vegetarian={preferences?.vegetarian}
              smoking={preferences?.smoking}
              pets={preferences?.pets}
              hideDetails={false}
            />
            <TouchableOpacity style={{ padding: 18, alignItems: 'center', backgroundColor: 'transparent' }} onPress={() => setShowProfileModal(false)}>
              <Text style={{ color: '#E4B76E', fontWeight: 'bold', fontSize: 18 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Messages */}
      {isLoading ? (
        <View style={localStyles.loadingWrap}>
          <ActivityIndicator color="#E4B76E" size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={localStyles.messageList}
          ListHeaderComponent={
            <Text style={styles.chatMatchedText}>
              You connected with {otherUserName || "them"}
              {matchDate
                ? ` on ${new Date(matchDate).toLocaleDateString()}`
                : ""}
              .
            </Text>
          }
          ListEmptyComponent={
            <View style={localStyles.emptyWrap}>
              <Text style={localStyles.emptyText}>
                Say hi to {otherUserName || "your connection"}!
              </Text>
            </View>
          }
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* Input */}
      <View style={styles.chatInputBar}>
        <TextInput
          style={localStyles.input}
          placeholder="Type a message ..."
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity onPress={handleSend} disabled={!text.trim()}>
          <Text style={[styles.chatSend, !text.trim() && { opacity: 0.4 }]}>
            SEND
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default Chat;

const localStyles = {
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  incomingMessageRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    marginBottom: 12,
  },
  ownMessageRow: {
    alignItems: "flex-end" as const,
    marginBottom: 12,
  },
  messageBubble: {
    marginBottom: 0,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    marginBottom: 4,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
  },
  msgTimeRight: {
    color: "rgba(0,0,0,0.35)",
    textAlign: "right" as const,
  },
  msgTimeLeft: {
    color: "rgba(0,0,0,0.35)",
  },
  input: {
    flex: 1,
    color: "#2B2B2B",
    fontSize: 14,
    maxHeight: 80,
    marginRight: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    paddingTop: 180,
  },
  emptyText: {
    color: "#AEBFD1",
    fontSize: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
};
