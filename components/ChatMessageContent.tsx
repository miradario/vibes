import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "./Typography";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { photoPath } from "../src/lib/chatPhotos";
import { supabase } from "../src/lib/supabase";
import { useAuthSession } from "../src/auth/auth.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function ChatMessageContent({
  body,
  textStyle,
  onLongPress,
}: {
  body: string;
  textStyle?: StyleProp<TextStyle>;
  onLongPress?: () => void;
}) {
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
  if (!path) return <Text style={textStyle}>{body}</Text>;
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ver foto"
        style={s.thumbnail}
        onLongPress={onLongPress}
        onPress={() => {
          if (photo.isError || imageFailed) void photo.refetch();
          else if (photo.data) setExpanded(true);
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
      <AnimatedSheetModal
        visible={expanded}
        fullScreen
        onClose={() => setExpanded(false)}
        sheetStyle={s.sheet}
      >
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setExpanded(false)}
          style={s.close}
        >
          <Text style={s.error}>Cerrar</Text>
        </TouchableOpacity>
        <View style={s.full}>
          {photo.data && (
            <Image
              source={{ uri: photo.data }}
              style={s.image}
              resizeMode="contain"
            />
          )}
        </View>
      </AnimatedSheetModal>
    </>
  );
}
const s = StyleSheet.create({
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
  sheet: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
    paddingTop: 48,
    paddingBottom: 32,
  },
  close: { alignSelf: "flex-end", minHeight: 44 },
  full: { flex: 1 },
});
