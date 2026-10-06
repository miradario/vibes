import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  View,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getInvitedEventId } from "../src/lib/eventInvites";
import { useQuery } from "@tanstack/react-query";
import { Text } from "./Typography";
import PhotoViewer from "./PhotoViewer";
import { photoPath } from "../src/lib/chatPhotos";
import { supabase } from "../src/lib/supabase";
import { useAuthSession } from "../src/auth/auth.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function ChatMessageContent({
  body,
  textStyle,
  onLongPress,
  onPhotoPress,
}: {
  body: string;
  textStyle?: StyleProp<TextStyle>;
  onLongPress?: () => void;
  onPhotoPress?: (open: () => void) => void;
}) {
  const navigation = useNavigation<any>();
  const invitedEventId = getInvitedEventId(body);
  const path = photoPath(body);
  const { data: session } = useAuthSession();
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const photo = useQuery({
    queryKey: ["chatPhoto", session?.user.id, path],
    enabled: Boolean(path && session?.user.id),
    staleTime: 240000,
    refetchInterval: 240000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("chat-photos")
        .createSignedUrl(path!, 300);
      if (error) throw error;
      setImageFailed(false);
      return data.signedUrl;
    },
  });
  if (!path)
    return (
      <View style={s.textContent}>
        <Text style={textStyle}>{body}</Text>
        {invitedEventId ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ver evento invitado"
            onLongPress={onLongPress}
            onPress={() =>
              navigation.navigate("EventDetail", { eventId: invitedEventId })
            }
            style={s.eventLink}
          >
            <Text style={s.eventLinkText}>Ver evento</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ver foto"
        style={s.thumbnail}
        onLongPress={onLongPress}
        onPress={() => {
          const open = () => {
            if (photo.isError || imageFailed) void photo.refetch();
            else if (photo.data) setExpanded(true);
          };
          if (onPhotoPress) onPhotoPress(open);
          else open();
        }}
      >
        {photo.isLoading ? (
          <ActivityIndicator color={vibesTheme.colors.primaryText} />
        ) : photo.isError || imageFailed ? (
          <Text style={s.error}>
            No se pudo cargar la foto. Tocá para reintentar.
          </Text>
        ) : photo.data ? (
          <Image
            source={{ uri: photo.data }}
            style={s.image}
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </TouchableOpacity>
      <PhotoViewer
        visible={expanded}
        images={photo.data ? [{ uri: photo.data }] : []}
        onClose={() => setExpanded(false)}
      />
    </>
  );
}
const s = StyleSheet.create({
  textContent: { gap: 10 },
  eventLink: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  eventLinkText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  thumbnail: {
    width: 200,
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
  },
  image: { width: "100%", height: "100%" },
  error: {
    color: vibesTheme.colors.primaryText,
    textAlign: "center",
    padding: 12,
  },
});
