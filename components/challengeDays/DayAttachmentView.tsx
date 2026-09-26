import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Image,
  Linking,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "../Typography";
import AnimatedSheetModal from "../AnimatedSheetModal";
import ScreenContainer from "../ScreenContainer";
import {
  DayAttachment,
  DAY_MEDIA_BUCKET,
  parseDayLink,
} from "../../src/lib/challengeDayContent";
import { supabase } from "../../src/lib/supabase";
import { useAuthSession } from "../../src/auth/auth.queries";
import DayAudioPlayer from "./DayAudioPlayer";
import YouTubeFrame from "./YouTubeFrame";
import { DayButton } from "./DayButton";
import { dayStyles as s } from "./styles";
import { vibesTheme } from "../../src/theme/vibesTheme";

function LinkCard({ item }: { item: DayAttachment }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  let link: ReturnType<typeof parseDayLink> | undefined;
  try {
    link = parseDayLink(item.url ?? "");
  } catch {}
  const onState = useCallback((code: number | null) => {
    setLoading(false);
    setError(
      code === null
        ? ""
        : code === 100
        ? "Este video ya no está disponible o es privado."
        : [101, 150].includes(code)
        ? "Este video no permite reproducción integrada."
        : "No se pudo cargar el reproductor de YouTube."
    );
  }, []);
  useEffect(() => {
    if (!link?.youtubeId) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setError(
        "YouTube está tardando en responder. Podés reintentar o abrir el video en YouTube."
      );
    }, 20000);
    if (!loading) clearTimeout(timer);
    return () => clearTimeout(timer);
  }, [loading, attempt, link?.youtubeId]);
  if (!link)
    return <Text style={s.error}>El enlace guardado no es válido.</Text>;
  const open = () => {
    void Linking.openURL(link!.url).catch(() =>
      setError("No se pudo abrir el enlace. Reintentá.")
    );
  };
  const label =
    item.name && item.name !== "Video de YouTube" ? item.name : link.host;
  if (link.youtubeId) {
    return (
      <>
        {!error ? (
          <YouTubeFrame
            key={attempt}
            videoId={link.youtubeId}
            onState={onState}
          />
        ) : null}
        {loading && !error ? (
          <ActivityIndicator
            accessibilityLabel="Cargando YouTube"
            color={vibesTheme.colors.primaryText}
          />
        ) : null}
        {error ? (
          <>
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
            <DayButton
              label="Reintentar"
              onPress={() => {
                setError("");
                setLoading(true);
                setAttempt((a) => a + 1);
              }}
            />
            <DayButton
              label="Abrir en YouTube"
              onPress={open}
              style={s.secondary}
              textStyle={s.secondaryButtonText}
            />
          </>
        ) : null}
      </>
    );
  }
  return (
    <View style={s.card}>
      <TouchableOpacity
        accessibilityRole="link"
        onPress={open}
        style={{ minHeight: 44 }}
      >
        <Text style={s.text}>{label}</Text>
        <Text style={s.hint} numberOfLines={2}>
          {link.url}
        </Text>
      </TouchableOpacity>
      {error ? (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
          <DayButton
            label="Reintentar"
            onPress={() => {
              setError("");
              setLoading(true);
              setAttempt((a) => a + 1);
            }}
          />
        </>
      ) : null}
      <DayButton
        label="Abrir enlace"
        onPress={open}
        style={s.secondary}
        textStyle={s.secondaryButtonText}
      />
    </View>
  );
}
export default function DayAttachmentView({ item }: { item: DayAttachment }) {
  const { data: session } = useAuthSession();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const signed = useQuery({
    queryKey: ["dayMedia", session?.user.id, item.path],
    enabled: Boolean(item.path && session),
    staleTime: 240000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(DAY_MEDIA_BUCKET)
        .createSignedUrl(item.path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (item.type === "link") return <LinkCard item={item} />;
  if (signed.isLoading)
    return <ActivityIndicator color={vibesTheme.colors.primaryText} />;
  if (signed.isError || !signed.data || imageError)
    return (
      <View style={s.card}>
        <Text style={s.error}>
          No se pudo cargar {item.type === "photo" ? "la foto" : "el audio"}.
        </Text>
        <DayButton
          label="Reintentar"
          onPress={() => {
            setImageError(false);
            void signed.refetch();
          }}
        />
      </View>
    );
  if (item.type === "audio")
    return (
      <View style={s.card}>
        <DayAudioPlayer key={signed.data} uri={signed.data} name={item.name} />
      </View>
    );
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ampliar foto"
        onPress={() => setExpanded(true)}
      >
        <Image
          source={{ uri: signed.data }}
          style={s.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      </TouchableOpacity>
      <AnimatedSheetModal
        fullScreen
        visible={expanded}
        onClose={() => setExpanded(false)}
        sheetStyle={s.sheet}
      >
        <ScreenContainer
          edges={["left", "right"]}
          style={[
            s.sheet,
            {
              paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 60 : 28),
            },
          ]}
        >
          <DayButton label="Cerrar foto" onPress={() => setExpanded(false)} />
          <Image
            source={{ uri: signed.data }}
            style={s.fullImage}
            resizeMode="contain"
          />
        </ScreenContainer>
      </AnimatedSheetModal>
    </>
  );
}
