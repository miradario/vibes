import React, { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/Typography";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import Tag from "../components/ui/Tag";
import { cardStyles } from "../components/ui/surfaceStyles";
import { CardRowSkeleton, SkeletonGroup } from "../components/ui/Skeleton";
import { Button, Empty, Page, ui } from "../components/learning/LearningUI";
import { useClasesEnabled } from "../src/featureFlags/useClasesEnabled";
import { useStudioStudentMutation, useStudioStudentQuery, useStudioWhatsApp } from "../src/learning/studioStudentQueries";
import {
  studioBookingWhen,
  studioCanCancel,
  studioStudentError,
  STUDIO_BOOKING_STATUS_LABEL,
  type StudioBooking,
} from "../src/learning/studioStudent";
import { whatsappLink } from "../src/sessions/sessions";
import * as ds from "../src/theme/tokens";

/** Detalle de una reserva de clase. Desde el historial se abre en `readOnly` (sin cancelar ni WhatsApp). */
export default function ClassBookingDetailScreen() {
  const params = useRoute().params as { id?: string; readOnly?: boolean } | undefined;
  const id = typeof params?.id === "string" ? params.id : "";
  const readOnly = params?.readOnly === true;
  const enabled = useClasesEnabled();
  const query = useStudioStudentQuery();
  const booking = query.data?.bookings.find((item) => item.id === id);
  const organizerName = booking
    ? query.data?.activities.find((item) => item.organizer_id === booking.organizer_id)?.organizer_name ?? "Estudio"
    : "";
  if (!enabled) return <Page title="Reserva"><Empty text="Las clases no están disponibles por el momento." /></Page>;
  return (
    <Page title="Reserva">
      {query.isLoading ? (
        <SkeletonGroup label="Cargando la reserva">
          <CardRowSkeleton lines={[{ text: "title", width: "75%" }, { text: "body", width: "55%" }, { text: "body", width: "40%" }]} />
        </SkeletonGroup>
      ) : null}
      {query.isError ? (
        <View style={[ui.notice, ui.error]}>
          <Text accessibilityRole="alert" style={ui.body}>{studioStudentError(query.error)}</Text>
          <Button secondary label="Reintentar" onPress={() => void query.refetch()} />
        </View>
      ) : null}
      {query.data && !booking ? <Empty text="No encontramos esta reserva. Puede que se haya cancelado o que ya no esté disponible." /> : null}
      {booking ? <BookingBody booking={booking} organizerName={organizerName} readOnly={readOnly} /> : null}
    </Page>
  );
}

function BookingBody({ booking, organizerName, readOnly }: { booking: StudioBooking; organizerName: string; readOnly: boolean }) {
  const insets = useSafeAreaInsets();
  const mutation = useStudioStudentMutation();
  const contact = useStudioWhatsApp(booking.organizer_id);
  const [confirming, setConfirming] = useState(false);
  const cancellable = studioCanCancel(booking);
  const leaveWaitlist = booking.status === "waitlist";
  const whatsapp = whatsappLink(
    contact.data?.whatsapp_phone,
    `Hola ${organizerName}, te escribo por la reserva de "${booking.title}" (${studioBookingWhen(booking)}).`,
  );
  return (
    <>
      <View style={[cardStyles.base, cardStyles.padding, s.block]}>
        <Text accessibilityRole="header" style={ui.title}>{booking.title}</Text>
        <Text style={ui.body}>{organizerName}</Text>
        <Text style={ui.muted}>{studioBookingWhen(booking)}</Text>
        <Tag label={STUDIO_BOOKING_STATUS_LABEL[booking.status]} />
      </View>

      {!readOnly && cancellable ? (
        <Button
          secondary
          label={leaveWaitlist ? "Salir de la lista de espera" : "Cancelar reserva"}
          disabled={mutation.isPending}
          onPress={() => setConfirming(true)}
        />
      ) : null}
      {!readOnly && booking.status === "confirmed" && !cancellable ? (
        <Text style={ui.muted}>El plazo para cancelar ya terminó. Contactá al estudio.</Text>
      ) : null}
      {!readOnly && whatsapp ? (
        <Button secondary label="Escribir por WhatsApp" onPress={() => void Linking.openURL(whatsapp).catch(() => {})} />
      ) : null}
      {mutation.isError ? <Text accessibilityRole="alert" style={ui.body}>{studioStudentError(mutation.error)}</Text> : null}

      <AnimatedSheetModal
        visible={confirming}
        onClose={() => { if (!mutation.isPending) setConfirming(false); }}
        closeOnBackdropPress={!mutation.isPending}
        sheetStyle={[ui.sheet, { paddingBottom: Math.max(insets.bottom, ds.spacing[6]) }]}
      >
        <Text style={ui.title}>{leaveWaitlist ? "Salir de la espera" : "Cancelar reserva"}</Text>
        <Text style={ui.body}>Vas a liberar tu lugar en {booking.title}. Si usaste un crédito, se devolverá según las condiciones de tu pack.</Text>
        <Button
          label={mutation.isPending ? "Guardando…" : "Confirmar cancelación"}
          disabled={mutation.isPending}
          onPress={() => {
            void mutation.mutateAsync({ action: "cancel", id: booking.id })
              .then(() => setConfirming(false))
              .catch(() => setConfirming(false));
          }}
        />
        <Button secondary label="Volver" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
      </AnimatedSheetModal>
    </>
  );
}

const s = StyleSheet.create({
  block: { gap: ds.spacing[2] },
});
