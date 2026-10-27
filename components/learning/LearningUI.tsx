import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBottomTabContentPadding } from "../../src/lib/tabBarLayout";
import { useNavigation } from "@react-navigation/native";
import { BookOpen, ChevronLeft, ChevronRight, MapPin } from "lucide-react-native";
import { Text, TextInput } from "../Typography";
import ScreenContainer from "../ScreenContainer";
import VibesActionButton from "../VibesActionButton";
import Icon from "../Icon";
import AnimatedSheetModal from "../AnimatedSheetModal";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { useLearningEnabled } from "../../src/featureFlags/useLearningEnabled";
import {
  learningError,
  modalityLabels,
  priceLabel,
  sessionsFor,
  formatSession,
  statusLabels,
} from "../../src/learning/utils";
import {
  useLearningData,
  useLearningMutation,
} from "../../src/learning/queries";
import type {
  LearningData,
  LearningActivity,
  LearningProfile,
} from "../../src/learning/types";
import * as ImagePicker from "expo-image-picker";
import { uploadImageToSupabase } from "../../src/lib/supabaseStorage";
import { useAuthSession } from "../../src/auth/auth.queries";
const c = vibesTheme.colors;
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background },
  content: {
    padding: 24,
    paddingBottom: 48,
    width: "100%",
    maxWidth: 740,
    alignSelf: "center",
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  grow: { flex: 1 },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    color: c.primaryText,
    fontFamily: vibesTheme.fonts.bold,
  },
  title: { fontSize: 24, lineHeight: 30, fontFamily: vibesTheme.fonts.bold, color: c.primaryText },
  body: { fontSize: 16, lineHeight: 24, fontFamily: vibesTheme.fonts.regular, color: c.primaryText },
  muted: { fontSize: 15, lineHeight: 22, color: c.secondaryText },
  card: {
    borderWidth: 1,
    borderColor: c.borderSoft,
    borderRadius: 24,
    padding: 16,
    gap: 10,
    backgroundColor: c.surface,
  },
  input: {
    borderWidth: 1,
    borderColor: `${c.primaryText}1F`,
    borderRadius: 16,
    minHeight: 48,
    padding: 14,
    color: c.primaryText,
    fontSize: 16,
    backgroundColor: c.surface,
  },
  chip: {
    borderWidth: 1,
    borderColor: `${c.primaryText}1F`,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selected: { backgroundColor: `${c.accentMustard}24`, borderColor: c.accentMustard },
  chipText: { fontSize: 14, lineHeight: 20, fontFamily: vibesTheme.fonts.semibold, color: c.primaryText },
  selectedText: { color: c.primaryText },
  link: { color: c.accentBlue, fontSize: 18 },
  photo: { width: 92, height: 100, borderRadius: 16 },
  cover: { height: 190, width: "100%", borderRadius: 18 },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 163, 64, 0.12)",
  },
  notice: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(57, 120, 184, 0.10)",
    gap: 8,
  },
  error: { backgroundColor: "rgba(216, 140, 122, 0.15)" },
  primaryText: { color: c.primaryText },
  secondaryButton: {
    backgroundColor: c.surface,
    borderColor: c.accentBlue,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: { opacity: 0.5 },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 18, maxHeight: "85%" },
  tiny: { fontSize: 15, color: c.secondaryText },
});
export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <VibesActionButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      textStyle={ui.primaryText}
      style={[secondary && ui.secondaryButton, disabled && ui.disabled]}
    />
  );
}
export function Link({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[{ paddingVertical: 8 }, disabled && ui.disabled]}
    >
      <Text style={ui.link}>{label}</Text>
    </TouchableOpacity>
  );
}
export function ImageField({
  label,
  value,
  onChange,
  onBusy,
  compact = false,
  rectangular = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBusy: (value: boolean) => void;
  compact?: boolean;
  rectangular?: boolean;
}) {
  const { data: session } = useAuthSession();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const choose = async () => {
    if (!session?.user.id) return;
    setError("");
    setBusy(true);
    onBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0])
        onChange(
          await uploadImageToSupabase({
            uri: result.assets[0].uri,
            bucket: "event-assets",
            pathPrefix: `${session.user.id}/learning/${Date.now()}`,
          })
        );
    } catch (e) {
      setError(learningError(e));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  if (compact) return <View style={{gap:8}}>
    <Text style={ui.chipText}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={value ? `Cambiar ${label.toLocaleLowerCase()}` : `Agregar ${label.toLocaleLowerCase()}`} disabled={busy} onPress={()=>void choose()} style={{flexDirection:"row",alignItems:"center",gap:12,minHeight:64}}>
      {value ? <Image source={{uri:value}} style={{width:rectangular ? 120 : 64,height:72,borderRadius:rectangular ? 16 : 36}}/> : <View style={{width:rectangular ? 120 : 64,height:72,borderRadius:rectangular ? 16 : 36,alignItems:"center",justifyContent:"center",backgroundColor:`${c.secondaryText}14`}}><Icon name="camera-outline" size={26} color={c.secondaryText}/></View>}
      <Text style={[ui.chipText,{color:c.accentBlue}]}>{busy ? "Subiendo imagen…" : value ? "Cambiar imagen" : "Agregar imagen"}</Text>
    </TouchableOpacity>
    {!!error && <Text accessibilityRole="alert" style={ui.body}>{error}</Text>}
  </View>;
  return (
    <View style={{ gap: 10 }}>
      <Field
        label={label}
        value={value}
        onChange={onChange}
        hint="Imagen pública. Podés subir una foto o pegar una URL HTTPS."
      />
      <Button
        label={busy ? "Subiendo imagen…" : "Elegir foto"}
        secondary
        disabled={busy}
        onPress={() => void choose()}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={ui.body}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function Chips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[ui.chip, o.value === value && ui.selected]}
        >
          <Text style={[ui.chipText, o.value === value && ui.selectedText]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  keyboardType = "default",
  hint,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  hint?: string;
  editable?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.body}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={[
          ui.input,
          multiline && { minHeight: 110, textAlignVertical: "top" },
          !editable && ui.disabled,
        ]}
      />
      {hint && <Text style={ui.tiny}>{hint}</Text>}
    </View>
  );
}
export function Photo({
  url,
  cover = false,
}: {
  url?: string | null;
  cover?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    <Image
      source={{ uri: url }}
      onError={() => setFailed(true)}
      style={cover ? ui.cover : ui.photo}
      resizeMode="cover"
    />
  ) : (
    <View style={[cover ? ui.cover : ui.photo, ui.fallback]}>
      <BookOpen color={c.accentMustard} size={36} />
    </View>
  );
}
export function Page({
  title,
  embedded = false,
  children,
}: {
  title: string;
  embedded?: boolean;
  children: React.ReactNode;
}) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <ScreenContainer
      scroll
      style={ui.page}
      edges={embedded ? [] : ["top", "left", "right", "bottom"]}
      contentContainerStyle={[ui.content, embedded && {paddingBottom: getBottomTabContentPadding(insets.bottom, 48)}]}
      scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}
    >
      {!embedded && <View style={ui.row}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => nav.goBack()}
          style={{ padding: 8 }}
        >
          <ChevronLeft color={c.accentBlue} size={28} />
        </TouchableOpacity>
        <Text style={[ui.heading, ui.grow]}>{title}</Text>
      </View>}
      {children}
    </ScreenContainer>
  );
}
export function LearningGate({
  query,
  children,
}: {
  query: ReturnType<typeof useLearningData>;
  children: (data: LearningData) => React.ReactNode;
}) {
  const learningEnabled = useLearningEnabled();
  if (!learningEnabled)
    return (
      <Text style={ui.body}>
        Clases y espacios no está disponible por el momento.
      </Text>
    );
  if (!query.userId)
    return (
      <Text style={ui.body}>
        Iniciá sesión con tu cuenta de Vibes para continuar.
      </Text>
    );
  if (query.isPending)
    return (
      <View style={ui.notice}>
        <ActivityIndicator color={c.accentBlue} />
        <Text style={ui.body}>Cargando clases y espacios…</Text>
      </View>
    );
  if (query.isError || !query.data)
    return (
      <View style={[ui.notice, ui.error]}>
        <Text accessibilityRole="alert" style={ui.body}>
          {learningError(query.error)}
        </Text>
        <Button
          label="Reintentar"
          onPress={() => void query.refetch()}
          secondary
        />
      </View>
    );
  if (!query.data.access.enabled)
    return (
      <Text style={ui.body}>
        Esta sección todavía no está habilitada en este entorno.
      </Text>
    );
  return (
    <>
      {query.isRefetchError && (
        <Text style={ui.muted}>
          No se pudo actualizar. Mostramos la última información disponible.
        </Text>
      )}
      {children(query.data)}
    </>
  );
}
export function ProfileCard({
  profile,
  onPress,
}: {
  profile: LearningProfile;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${profile.name}`}
      style={[ui.card, ui.row]}
      onPress={onPress}
    >
      <Photo key={profile.image_url} url={profile.image_url} />
      <View style={ui.grow}>
        <Text style={ui.title}>{profile.name}</Text>
        <Text style={ui.muted}>{profile.specialties.join(" · ")}</Text>
        <Text style={ui.muted}>{modalityLabels[profile.modality]}</Text>
        {!!profile.location && (
          <Text style={ui.muted}>
            <MapPin size={15} color={c.secondaryText} /> {profile.location}
          </Text>
        )}
        <Text style={ui.link}>Ver perfil →</Text>
      </View>
    </TouchableOpacity>
  );
}
export function ActivityCard({
  compact = false,
  activity,
  data,
  onPress,
  status,
}: {
  activity: LearningActivity;
  data: LearningData;
  onPress: () => void;
  compact?: boolean;
  status?: string;
}) {
  const first =
    sessionsFor(data, activity.id).find(
      (s) => Date.parse(s.ends_at) > Date.now()
    ) ?? sessionsFor(data, activity.id)[0];
  const teachers = data.profiles.filter((p) =>
    activity.teacher_ids.includes(p.id)
  );
  if (compact) return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${activity.title}`} onPress={onPress} activeOpacity={0.84} style={exploreCard.row}>
      <View style={exploreCard.image}><Photo key={activity.image_url} url={activity.image_url} /></View>
      <View style={exploreCard.copy}>
        <Text style={exploreCard.title} numberOfLines={1}>{activity.title}</Text>
        {first && <Text style={exploreCard.date} numberOfLines={1}>{formatSession(first, activity.timezone)}</Text>}
        <Text style={exploreCard.meta} numberOfLines={1}>{teachers.map(p => p.name).join(" · ") || modalityLabels[activity.modality]}</Text>
        <Text style={exploreCard.meta} numberOfLines={1}>{status ?? activity.location}</Text>
      </View>
      <ChevronRight size={20} color={c.secondaryText} />
    </TouchableOpacity>
  );
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ver ${activity.title}`}
      style={ui.card}
      onPress={onPress}
    >
      <Photo key={activity.image_url} url={activity.image_url} cover />
      <Text style={ui.title}>{activity.title}</Text>
      <Text style={ui.muted}>
        {activity.kind === "course" ? "Curso" : "Clase"} ·{" "}
        {teachers.map((p) => p.name).join(", ")}
      </Text>
      {first && (
        <Text style={ui.body}>
          {formatSession(first, activity.timezone)} · {activity.timezone}
        </Text>
      )}
      <Text style={ui.muted}>
        {modalityLabels[activity.modality]}
        {activity.location ? ` · ${activity.location}` : ""}
      </Text>
      <View style={ui.row}>
        <Text style={[ui.body, ui.grow]}>
          {priceLabel(activity)}
          {activity.kind === "course" ? " · curso completo" : ""}
        </Text>
        <Text style={ui.link}>Ver actividad →</Text>
      </View>
      <Text style={ui.muted}>
        {status ??
          `${Math.max(
            0,
            activity.capacity - activity.reserved_count
          )} cupos disponibles`}
      </Text>
    </TouchableOpacity>
  );
}
export function useLearningAction() {
  const insets = useSafeAreaInsets();
  const mutation = useLearningMutation();
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    text: string;
    name: string;
    args: Record<string, unknown>;
    success: string;
    done?: () => void;
  } | null>(null);
  const run = async (
    name: string,
    args: Record<string, unknown>,
    success: string,
    done?: (value: unknown) => void
  ) => {
    setFeedback(null);
    try {
      const result = await mutation.mutateAsync({ name, args });
      setFeedback({ error: false, text: success });
      setConfirmation(null);
      done?.(result);
      return true;
    } catch (error) {
      setFeedback({ error: true, text: learningError(error) });
      return false;
    }
  };
  return {
    pending: mutation.isPending,
    run,
    confirm: setConfirmation,
    feedback,
    elements: (
      <>
        {feedback && (
          <View
            accessibilityRole="alert"
            style={[ui.notice, feedback.error && ui.error]}
          >
            <Text style={ui.body}>{feedback.text}</Text>
          </View>
        )}
        <AnimatedSheetModal
          visible={!!confirmation}
          onClose={() => {
            if (!mutation.isPending) setConfirmation(null);
          }}
          closeOnBackdropPress={!mutation.isPending}
          sheetStyle={[ui.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
        >
          <Text style={ui.title}>Confirmar acción</Text>
          <Text style={ui.body}>{confirmation?.text}</Text>
          {feedback?.error && <Text style={ui.body}>{feedback.text}</Text>}
          <Button
            label={mutation.isPending ? "Guardando…" : "Confirmar"}
            disabled={mutation.isPending}
            onPress={() => {
              if (confirmation)
                void run(
                  confirmation.name,
                  confirmation.args,
                  confirmation.success,
                  confirmation.done
                );
            }}
          />
          <Button
            label="Volver"
            secondary
            disabled={mutation.isPending}
            onPress={() => setConfirmation(null)}
          />
        </AnimatedSheetModal>
      </>
    ),
  };
}
export function Empty({
  text = "No hay resultados para estos filtros.",
}: {
  text?: string;
}) {
  return (
    <View style={ui.notice}>
      <Text style={ui.body}>{text}</Text>
    </View>
  );
}
export const modalityOptions = Object.entries(modalityLabels).map(
  ([value, label]) => ({ value, label })
);
export { statusLabels };

const exploreCard = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: `${c.primaryText}14`, backgroundColor: c.surface },
  image: { width: 92, height: 100, borderRadius: 14, overflow: "hidden" },
  copy: { flex: 1, gap: 3 },
  title: { fontFamily: vibesTheme.fonts.bold, fontSize: 17, lineHeight: 23, color: c.primaryText },
  date: { fontFamily: vibesTheme.fonts.medium, fontSize: 14, lineHeight: 20, color: c.accentBlue },
  meta: { fontSize: 13, lineHeight: 18, color: c.secondaryText },
});
