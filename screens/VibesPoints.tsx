import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenContainer from "../components/ScreenContainer";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import Icon from "../components/Icon";
import { Text } from "../components/Typography";
import VibesLoader from "../components/VibesLoader";
import {
  useVibesHistory,
  useVibesSummary,
  useRegisterVibesMeditation,
  type VibesEntry,
} from "../src/queries/vibesPoints.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
const c = vibesTheme.colors;
const rules = [
  {
    icon: "share-social-outline",
    title: "Compartí por Vibes",
    hint: "Una vez por actividad · Hasta 3 por día",
    points: 5,
  },
  {
    icon: "calendar-outline",
    title: "Asistí a una clase",
    hint: "Con asistencia confirmada",
    points: 50,
  },
  {
    icon: "trophy-outline",
    title: "Completá un desafío",
    hint: "Todos los días del desafío",
    points: 100,
  },
] as const;
const iconByKind: Record<VibesEntry["kind"], "leaf-outline" | (typeof rules)[number]["icon"]> = {
  meditation: "leaf-outline",
  share: "share-social-outline",
  attendance: "calendar-outline",
  challenge: "trophy-outline",
};
export default function VibesPoints() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const summary = useVibesSummary();
  const history = useVibesHistory();
  const [info, setInfo] = useState(false);
  const [openMeditationAfterInfo, setOpenMeditationAfterInfo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const meditation = useRegisterVibesMeditation();
  const [meditating, setMeditating] = useState(false);
  const [duration, setDuration] = useState(10);
  const [kind, setKind] = useState<"silent" | "guided">("silent");
  const [meditationResult, setMeditationResult] = useState("");
  const entries = history.data?.pages.flat() ?? [];
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([summary.refetch(), history.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };
  const number = (value?: number) =>
    value === undefined ? "—" : value.toLocaleString("es-AR");
  return (
    <ScreenContainer
      style={s.screen}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={s.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={s.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={27} color={c.primaryText} />
        </TouchableOpacity>
        <Text style={s.title}>Tus Vibes</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cómo funcionan tus Vibes"
          style={s.iconButton}
          onPress={() => setInfo(true)}
        >
          <Icon
            name="information-circle-outline"
            size={26}
            color={c.accentBlue}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={c.accentBlue}
          />
        }
      >
        {summary.isError ? (
          <View accessibilityRole="alert" style={s.card}>
            <Text style={s.body}>No pudimos cargar tus Vibes.</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void summary.refetch()}
              style={s.retry}
            >
              <Text style={s.link}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.hero}>
              <View style={s.heroCopy}>
                <Text style={s.overline}>VIBES ACUMULADOS</Text>
                <Text
                  accessibilityRole="header"
                  style={s.total}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {number(summary.data?.total)}
                </Text>
                <Text style={s.hint}>No tienen valor monetario.</Text>
              </View>
              <Svg
                width={64}
                height={64}
                viewBox="0 0 100 100"
                accessible={false}
              >
                <Circle
                  cx={50}
                  cy={50}
                  r={46}
                  fill={c.accentMustard}
                  opacity={0.12}
                />
                <Path
                  d="M3 60 C18 60 20 30 31 50 S43 85 52 35 S64 38 68 61 S80 49 86 58 L97 60"
                  fill="none"
                  stroke={c.accentMustard}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={s.stats}>
              <View style={[s.card, s.stat]}>
                <Icon
                  name="trending-up-outline"
                  size={25}
                  color={c.accentMustard}
                />
                <View style={s.statCopy}>
                  <Text style={s.statValue}>
                    {number(summary.data?.thisMonth)}
                  </Text>
                  <Text style={s.hint}>este mes</Text>
                </View>
              </View>
              <View style={[s.card, s.stat]}>
                <Icon name="people-outline" size={25} color={c.accentCoral} />
                <View style={s.statCopy}>
                  <Text style={s.statValue}>
                    {number(summary.data?.contributions)}
                  </Text>
                  <Text style={s.hint}>aportes</Text>
                </View>
              </View>
            </View>
          </>
        )}
        <Text style={s.sectionTitle}>Tu actividad</Text>
        {history.isLoading ? (
          <VibesLoader size={32} />
        ) : history.isError ? (
          <View accessibilityRole="alert">
            <Text style={s.body}>No pudimos cargar tu actividad.</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={s.retry}
              onPress={() => void history.refetch()}
            >
              <Text style={s.link}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : entries.length ? (
          entries.map((entry) => (
            <View key={entry.id} style={s.activity}>
              <View style={s.activityIcon}>
                <Icon
                  name={iconByKind[entry.kind]}
                  size={23}
                  color={c.primaryText}
                />
              </View>
              <View style={s.rowCopy}>
                <Text style={s.body}>{entry.title}</Text>
                <Text style={s.hint}>
                  {new Date(entry.occurred_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <Text style={s.points}>+{entry.points}</Text>
            </View>
          ))
        ) : (
          <Text style={s.hint}>
            Todavía no hay aportes registrados. Tu próximo paso ya puede sumar
            Vibes.
          </Text>
        )}
        {history.hasNextPage ? (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={history.isFetchingNextPage}
            style={s.more}
            onPress={() => void history.fetchNextPage()}
          >
            <Text style={s.link}>
              {history.isFetchingNextPage ? "Cargando…" : "Ver más actividad"}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          style={s.more}
          onPress={() => setInfo(true)}
        >
          <Text style={s.link}>Seguí sumando</Text>
        </TouchableOpacity>
      </ScrollView>
      <AnimatedSheetModal
        visible={meditating}
        onClose={() => {
          if (!meditation.isPending) setMeditating(false);
        }}
        closeOnBackdropPress={!meditation.isPending}
        sheetStyle={s.sheet}
      >
        <ScrollView
          contentContainerStyle={[
            s.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
        >
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Tu meditación de hoy</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar registro"
              disabled={meditation.isPending}
              style={s.iconButton}
              onPress={() => setMeditating(false)}
            >
              <Icon name="close" size={25} color={c.primaryText} />
            </TouchableOpacity>
          </View>
          <Text style={s.body}>
            Registrá una meditación que ya hiciste. Suma 10 Vibes una vez por
            día (UTC), sin importar su duración.
          </Text>
          <Text style={s.rowTitle}>Duración</Text>
          <View style={s.choices}>
            {[5, 10, 20].map((value) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: duration === value }}
                disabled={meditation.isPending}
                style={[s.choice, duration === value && s.selected]}
                onPress={() => setDuration(value)}
              >
                <Text style={s.body}>{value} min</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.rowTitle}>Tipo de meditación</Text>
          <View style={s.choices}>
            {(["silent", "guided"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: kind === value }}
                disabled={meditation.isPending}
                style={[s.choice, kind === value && s.selected]}
                onPress={() => setKind(value)}
              >
                <Text style={s.body}>
                  {value === "silent" ? "En silencio" : "Guiada"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.hint}>El registro es privado.</Text>
          {meditation.isError ? (
            <Text accessibilityRole="alert" style={s.body}>
              No pudimos guardar tu meditación. Intentá de nuevo.
            </Text>
          ) : null}
          {meditationResult ? (
            <Text accessibilityLiveRegion="polite" style={s.body}>
              {meditationResult}
            </Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={meditation.isPending || Boolean(meditationResult)}
            style={s.register}
            onPress={() =>
              meditation.mutate(
                { duration, meditation_kind: kind },
                {
                  onSuccess: (inserted) =>
                    setMeditationResult(
                      inserted
                        ? "Meditación registrada. Sumaste 10 Vibes."
                        : "Ya registraste tu meditación de hoy. No se suman Vibes por duplicado."
                    ),
                }
              )
            }
          >
            <Text style={s.registerText}>
              {meditation.isPending
                ? "Guardando…"
                : meditationResult
                ? "Registrado"
                : "Ya medité · Guardar"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </AnimatedSheetModal>
      <AnimatedSheetModal
        visible={info}
        onClosed={() => {
          if (openMeditationAfterInfo) {
            setOpenMeditationAfterInfo(false);
            setMeditating(true);
          }
        }}
        onClose={() => setInfo(false)}
        sheetStyle={s.sheet}
      >
        <ScrollView
          contentContainerStyle={[
            s.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
        >
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Seguí sumando</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={s.iconButton}
              onPress={() => setInfo(false)}
            >
              <Icon name="close" size={25} color={c.primaryText} />
            </TouchableOpacity>
          </View>
        {rules.map((rule) => (
          <View key={rule.title} style={[s.card, s.row]}>
            <Icon name={rule.icon} size={26} color={c.accentBlue} />
            <View style={s.rowCopy}>
              <Text style={s.rowTitle}>{rule.title}</Text>
              <Text style={s.hint}>{rule.hint}</Text>
            </View>
            <View style={s.pointsBadge}>
              <Text style={s.points}>+{rule.points}</Text>
            </View>
          </View>
        ))}
          <Text style={s.body}>
            Tus Vibes reconocen lo que aportás a la comunidad. Se incluyen las
            acciones anteriores que quedaron registradas.
          </Text>
          <Text style={s.body}>
            Completar un desafío suma una sola vez al registrar todos sus días.
          </Text>
          <Text style={s.body}>
            Compartir una actividad por el chat de Vibes suma una vez por
            actividad, con un máximo de tres actividades por día (UTC). Abrir el
            menú de compartir o enviar otra vez la misma actividad no suma.
          </Text>
          <Text style={s.body}>
            La asistencia suma cuando el responsable confirma que estuviste en
            una clase. Reservar un lugar no suma. Si se corrige una asistencia,
            también se corrige el puntaje.
          </Text>
          <Text style={s.body}>
            Los Vibes no tienen valor monetario ni se pueden comprar, transferir
            o canjear por dinero.
          </Text>
        </ScrollView>
      </AnimatedSheetModal>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  register: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.accentMustard,
  },
  registerText: {
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: c.primaryText,
  },
  choices: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    minHeight: 48,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${c.primaryText}24`,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: `${c.accentBlue}24`, borderColor: c.accentBlue },
  screen: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 26,
    lineHeight: 32,
    color: c.primaryText,
  },
  content: { padding: 24, paddingTop: 8, paddingBottom: 32, gap: 16 },
  subtitle: {
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: c.secondaryText,
    textAlign: "center",
    marginBottom: 8,
  },
  hero: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: `${c.accentMustard}14`,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroCopy: { flex: 1, gap: 6 },
  overline: {
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1,
    color: c.primaryText,
  },
  total: {
    fontFamily: vibesTheme.fonts.extraBold,
    fontSize: 38,
    lineHeight: 46,
    color: c.primaryText,
  },
  body: {
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: c.primaryText,
  },
  hint: {
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: c.secondaryText,
  },
  card: {
    borderWidth: 1,
    borderColor: `${c.primaryText}14`,
    borderRadius: 16,
    padding: 16,
    backgroundColor: c.surface,
  },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  statCopy: { flex: 1 },
  statValue: {
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    color: c.primaryText,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 25,
    lineHeight: 29,
    color: c.primaryText,
    flexShrink: 1,
    marginTop: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: {
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: c.primaryText,
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: `${c.accentMustard}24`,
  },
  points: {
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: c.primaryText,
  },
  activity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${c.primaryText}14`,
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${c.accentBlue}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: c.accentBlue,
  },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  more: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: `${c.accentCoral}14`,
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  sheetContent: { padding: 24, paddingBottom: 40, gap: 18 },
});
