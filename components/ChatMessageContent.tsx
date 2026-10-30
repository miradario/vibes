import { Image } from "expo-image";
import { imageCacheSource } from "../src/lib/imageCacheSource";
import VibesLoader from "./VibesLoader";
import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, type StyleProp, type TextStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getInvitedClassId, getInvitationDisplayText, getInvitedChallengeId, getInvitedEventId } from "../src/lib/eventInvites";
import { useQuery } from "@tanstack/react-query";
import { Text } from "./Typography";
import PhotoViewer from "./PhotoViewer";
import { photoPath } from "../src/lib/chatPhotos";
import { supabase } from "../src/lib/supabase";
import { useAuthSession } from "../src/auth/auth.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

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
  const invitedClassId = getInvitedClassId(body);
  const invitedEventId = getInvitedEventId(body);
  const invitedChallengeId = getInvitedChallengeId(body);
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
        {getInvitationDisplayText(body) ? <Text style={textStyle}>{getInvitationDisplayText(body)}</Text> : null}
        {invitedClassId || invitedEventId || invitedChallengeId ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={invitedClassId ? "Ver clase invitada" : invitedChallengeId ? "Ver desafío invitado" : "Ver evento invitado"}
            onLongPress={onLongPress}
            onPress={() =>
              invitedClassId
                ? navigation.navigate(invitedClassId.startsWith("clase_") ? "ExternalCatalogDetail" : "LearningActivity", {id:invitedClassId})
                : invitedChallengeId
                ? navigation.navigate("ChallengeDetailScreen", { challengeId: invitedChallengeId })
                : navigation.navigate("EventDetail", { eventId: invitedEventId })
            }
            style={s.eventLink}
          >
            <Text style={s.eventLinkText}>{invitedClassId ? "Ver clase" : invitedChallengeId ? "Ver desafío" : "Ver evento"}</Text>
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
          <VibesLoader />
        ) : photo.isError || imageFailed ? (
          <Text style={s.error}>
            No se pudo cargar la foto. Tocá para reintentar.
          </Text>
        ) : photo.data ? (
          <Image
            source={imageCacheSource({ uri: photo.data })}
            cachePolicy="memory-disk"
            allowDownscaling
            contentFit="cover"
            recyclingKey={path ?? undefined}
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
  textContent: { gap: ds.spacing[3] },
  eventLink: {
    minHeight: 44,
    paddingVertical: ds.spacing[3],
    paddingHorizontal: ds.spacing[4],
    borderRadius: ds.radii.md,
    alignItems: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  eventLinkText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  thumbnail: {
    width: 200,
    height: 220,
    borderRadius: ds.radii.md,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
  },
  image: { width: "100%", height: "100%" },
  error: {
    color: vibesTheme.colors.primaryText,
    textAlign: "center",
    padding: ds.spacing[3],
  },
});
