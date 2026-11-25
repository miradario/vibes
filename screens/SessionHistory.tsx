import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../components/Typography";
import Icon from "../components/Icon";
import Tag from "../components/ui/Tag";
import { cardStyles } from "../components/ui/surfaceStyles";
import { CardRowSkeleton, SkeletonGroup } from "../components/ui/Skeleton";
import { Button, Empty, Page, ui } from "../components/learning/LearningUI";
import { useSesionesEnabled } from "../src/featureFlags/useSesionesEnabled";
import { useStudentSessions } from "../src/sessions/sessionsQueries";
import { pastSessions, sessionError, sessionStatusLabel, sessionWhen } from "../src/sessions/sessions";
import * as ds from "../src/theme/tokens";

const LINES = [{ text: "subtitle", width: "70%" }, { text: "bodySmall", width: "50%" }, { text: "bodySmall", width: "65%" }] as const;

/** Historial de sesiones tomadas o canceladas. El detalle se abre en SessionDetail con `readOnly`. */
export default function SessionHistoryScreen() {
  const nav = useNavigation<any>();
  const enabled = useSesionesEnabled();
  const query = useStudentSessions();
  const items = pastSessions(query.data?.sessions ?? []);
  if (!enabled) return <Page title="Historial de sesiones"><Empty text="Las sesiones no están disponibles por el momento." /></Page>;
  return (
    <Page title="Historial de sesiones">
      {query.isLoading ? <SkeletonGroup label="Cargando tu historial de sesiones">{[0, 1, 2].map((index) => <CardRowSkeleton key={index} chevron lines={LINES} />)}</SkeletonGroup> : null}
      {query.isError ? (
        <View style={[ui.notice, ui.error]}>
          <Text accessibilityRole="alert" style={ui.body}>{sessionError(query.error)}</Text>
          <Button secondary label="Reintentar" onPress={() => void query.refetch()} />
        </View>
      ) : null}
      {items.map((session) => {
        const cancelled = session.status === "cancelled";
        return (
          <TouchableOpacity
            key={session.id}
            accessibilityRole="button"
            accessibilityLabel={`Ver sesión ${session.title} con ${session.organizer_name}`}
            activeOpacity={ds.opacity.pressed}
            onPress={() => nav.navigate("SessionDetail", { id: session.id, readOnly: true })}
            style={[cardStyles.base, cardStyles.padding, s.row]}
          >
            <View style={s.copy}>
              <Text style={s.title} numberOfLines={2}>{session.title}</Text>
              <Text style={s.meta} numberOfLines={1}>{session.organizer_name}</Text>
              <Text style={s.meta}>{sessionWhen(session)}</Text>
              {cancelled ? <Tag label={sessionStatusLabel(session)} /> : null}
            </View>
            <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} />
          </TouchableOpacity>
        );
      })}
      {query.data && !items.length ? <Empty text="Todavía no hay sesiones en tu historial." /> : null}
    </Page>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  copy: { flex: 1, gap: ds.spacing[1], minWidth: 0 },
  title: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  meta: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
});
