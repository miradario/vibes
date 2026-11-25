import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../components/Typography";
import Icon from "../components/Icon";
import Tag from "../components/ui/Tag";
import { cardStyles } from "../components/ui/surfaceStyles";
import { CardRowSkeleton, SkeletonGroup } from "../components/ui/Skeleton";
import { Button, Empty, Page, ui } from "../components/learning/LearningUI";
import { useClasesEnabled } from "../src/featureFlags/useClasesEnabled";
import { useStudioStudentQuery } from "../src/learning/studioStudentQueries";
import { pastStudioBookings, studioBookingWhen, studioStudentError } from "../src/learning/studioStudent";
import * as ds from "../src/theme/tokens";

const LINES = [{ text: "subtitle", width: "70%" }, { text: "bodySmall", width: "65%" }] as const;

/** Historial de clases tomadas o canceladas. El detalle se abre en modo solo lectura. */
export default function ClassHistoryScreen() {
  const nav = useNavigation<any>();
  const enabled = useClasesEnabled();
  const query = useStudioStudentQuery();
  const items = pastStudioBookings(query.data?.bookings ?? []);
  if (!enabled) return <Page title="Historial de clases"><Empty text="Las clases no están disponibles por el momento." /></Page>;
  return (
    <Page title="Historial de clases">
      {query.isLoading ? <SkeletonGroup label="Cargando tu historial de clases">{[0, 1, 2].map((index) => <CardRowSkeleton key={index} chevron lines={LINES} />)}</SkeletonGroup> : null}
      {query.isError ? (
        <View style={[ui.notice, ui.error]}>
          <Text accessibilityRole="alert" style={ui.body}>{studioStudentError(query.error)}</Text>
          <Button secondary label="Reintentar" onPress={() => void query.refetch()} />
        </View>
      ) : null}
      {items.map((booking) => (
        <TouchableOpacity
          key={booking.id}
          accessibilityRole="button"
          accessibilityLabel={`Ver ${booking.title}`}
          activeOpacity={ds.opacity.pressed}
          onPress={() => nav.navigate("ClassBookingDetail", { id: booking.id, readOnly: true })}
          style={[cardStyles.base, cardStyles.padding, s.row]}
        >
          <View style={s.copy}>
            <Text style={s.title} numberOfLines={2}>{booking.title}</Text>
            <Text style={s.meta}>{studioBookingWhen(booking)}</Text>
            {booking.status === "cancelled" ? <Tag label="Cancelada" /> : null}
          </View>
          <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.muted} />
        </TouchableOpacity>
      ))}
      {query.data && !items.length ? <Empty text="Todavía no hay clases en tu historial." /> : null}
    </Page>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  copy: { flex: 1, gap: ds.spacing[1], minWidth: 0 },
  title: { ...ds.textStyles.subtitle, color: ds.colors.text.primary },
  meta: { ...ds.textStyles.bodySmall, color: ds.colors.text.secondary },
});
