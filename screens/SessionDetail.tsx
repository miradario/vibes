import React, { useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/Typography";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { Button, Empty, Page, ui } from "../components/learning/LearningUI";
import { cardStyles, bannerStyles } from "../components/ui/surfaceStyles";
import { useSesionesEnabled } from "../src/featureFlags/useSesionesEnabled";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  canCancelSession, formatCountdown, formatMoney, holdSecondsLeft, NO_REFUND_NOTE, PAYMENT_METHOD_LABELS,
  sessionAwaiting, sessionError, sessionPayment, sessionStatusLabel, sessionTime, sessionWhen, whatsappLink,
  type StudentSession,
} from "../src/sessions/sessions";
import { useOrganizerContact, useSessionCheckout, useSessionMutation, useStudentSessions } from "../src/sessions/sessionsQueries";
import * as ds from "../src/theme/tokens";

type Pending = "cancel" | "decline" | null;

export default function SessionDetailScreen() {
  const params = useRoute().params as { id?: string; checkout?: string } | undefined;
  const id = typeof params?.id === "string" ? params.id : "";
  const checkoutOrder = typeof params?.checkout === "string" ? params.checkout : undefined;
  const enabled = useSesionesEnabled();
  const { data: auth } = useAuthSession();
  const query = useStudentSessions();
  const session = query.data?.sessions.find((item) => item.id === id);
  if (!enabled) return <Page title="Sesión"><Empty text="Las sesiones no están disponibles por el momento." /></Page>;
  if (!auth?.user?.id) return <Page title="Sesión"><Text style={ui.body}>Iniciá sesión con tu cuenta de Vibes para ver esta sesión.</Text></Page>;
  return (
    <Page title="Sesión">
      {query.isLoading ? <Text style={ui.muted}>Cargando la sesión…</Text> : null}
      {query.isError ? (
        <View style={[ui.notice, ui.error]}>
          <Text accessibilityRole="alert" style={ui.body}>{sessionError(query.error)}</Text>
          <Button secondary label="Reintentar" onPress={() => void query.refetch()} />
        </View>
      ) : null}
      {query.data && !session ? <Empty text="No encontramos esta sesión. Puede que se haya cancelado o que ya haya terminado." /> : null}
      {session ? <SessionBody session={session} respondSupported={query.data?.respondSupported ?? false} checkoutOrder={checkoutOrder} /> : null}
    </Page>
  );
}

/** Re-renders every second while `active` (hold countdown). */
function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function SessionBody({ session, respondSupported, checkoutOrder }: { session: StudentSession; respondSupported: boolean; checkoutOrder?: string }) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const mutation = useSessionMutation();
  const checkout = useSessionCheckout();
  const contact = useOrganizerContact(session.organizer_id);
  const [pending, setPending] = useState<Pending>(null);
  const [notice, setNotice] = useState("");
  const awaiting = sessionAwaiting(session);
  const payment = sessionPayment(session);
  const cancellable = canCancelSession(session);
  const phone = session.whatsapp_phone ?? contact.data?.whatsapp_phone ?? null;
  const whatsapp = whatsappLink(phone, `Hola ${session.organizer_name}, te escribo por la sesión "${session.title}" (${sessionWhen(session)}).`);
  const busy = mutation.isPending || checkout.isPending;
  const now = useNow(payment.kind === "hold");
  const holdLeft = payment.kind === "hold" ? holdSecondsLeft(payment.expiresAt, now) : 0;
  // Right after booking with Mercado Pago, open the checkout once (the slot is already held).
  const autoCheckout = useRef(false);
  useEffect(() => {
    if (autoCheckout.current || !checkoutOrder || payment.kind !== "hold" || payment.orderId !== checkoutOrder) return;
    autoCheckout.current = true;
    nav.setParams({ checkout: undefined });
    void checkout.mutateAsync(payment.orderId).catch(() => {});
  }, [checkoutOrder, payment, checkout, nav]);
  const run = (input: Parameters<typeof mutation.mutateAsync>[0], success: string) => {
    setNotice("");
    void mutation.mutateAsync(input).then(() => setNotice(success)).catch(() => {}).finally(() => setPending(null));
  };
  return (
    <>
      <View style={[cardStyles.base, cardStyles.padding, s.block]}>
        <Text accessibilityRole="header" style={ui.title}>{session.title}</Text>
        <Text style={ui.body}>{session.organizer_name}</Text>
        <Text style={ui.muted}>{sessionWhen(session)}</Text>
        {session.location ? <Text style={ui.muted}>{session.location}</Text> : null}
        <View style={[s.pill, session.status === "pending" ? s.pillPending : null]}><Text style={s.pillText}>{sessionStatusLabel(session)}</Text></View>
      </View>

      {awaiting === "student" && cancellable ? (
        <View style={[bannerStyles.base, bannerStyles.warning, s.block]}>
          <Text style={ui.body}>{session.organizer_name} te agendó esta sesión. Confirmala para reservar el horario o rechazala si no podés.</Text>
          <Button label={mutation.isPending ? "Guardando…" : "Confirmar sesión"} disabled={busy || !respondSupported}
            onPress={() => run({ action: "accept", id: session.id }, "Listo, la sesión quedó confirmada.")} />
          <Button secondary label="Rechazar" disabled={busy} onPress={() => setPending("decline")} />
          {!respondSupported ? <Text style={ui.muted}>La confirmación desde la app todavía no está habilitada. Mientras tanto, avisale al facilitador.</Text> : null}
        </View>
      ) : null}
      {payment.kind === "hold" ? (
        <View style={[bannerStyles.base, bannerStyles.warning, s.block]}>
          {holdLeft > 0
            ? <Text style={ui.body}>Guardamos tu horario hasta las {sessionTime(payment.expiresAt)} (quedan {formatCountdown(holdLeft)}). Pagá con Mercado Pago para confirmarla; si el pago no se acredita a tiempo, el horario se libera.</Text>
            : <Text style={ui.body}>Se terminó el tiempo para pagar. Si ya pagaste, puede tardar unos minutos en acreditarse; si no, el horario se libera.</Text>}
        </View>
      ) : null}
      {awaiting === "facilitator" ? (
        <View style={[bannerStyles.base, bannerStyles.info, s.block]}>
          <Text style={ui.body}>Tu solicitud está pendiente hasta que {session.organizer_name} la confirme. El horario queda reservado mientras tanto.</Text>
        </View>
      ) : null}

      <View style={[cardStyles.base, cardStyles.padding, s.block]}>
        <Text style={s.label}>Pago</Text>
        {payment.kind === "coordinate" ? <Text style={ui.body}>A coordinar con el facilitador.</Text> : null}
        {payment.kind === "free" ? <Text style={ui.body}>Sin cargo.</Text> : null}
        {payment.kind === "awaiting_confirmation" ? <Text style={ui.body}>{formatMoney(payment.amount, payment.currency)}. Vas a poder pagar cuando la sesión esté confirmada.</Text> : null}
        {payment.kind === "paid" ? <>
          <Text style={ui.body}>{formatMoney(payment.amount, payment.currency)} · Pago acreditado.</Text>
          <Text style={ui.muted}>{NO_REFUND_NOTE}</Text>
        </> : null}
        {payment.kind === "offline" ? <>
          <Text style={ui.body}>Total: {formatMoney(payment.amount, payment.currency)} · {PAYMENT_METHOD_LABELS[payment.method]}</Text>
          <Text style={ui.muted}>Le pagás a {session.organizer_name} {payment.method === "cash" ? "en efectivo" : "por transferencia"}; en la app no se cobra nada.</Text>
          {payment.instructions ? <Text style={ui.muted}>{payment.instructions}</Text> : null}
        </> : null}
        {payment.kind === "offline_paid" ? <Text style={ui.body}>{formatMoney(payment.amount, payment.currency)} · {PAYMENT_METHOD_LABELS[payment.method]} · Pago registrado por el facilitador.</Text> : null}
        {payment.kind === "late" ? <Text style={ui.body}>Pagaste {formatMoney(payment.amount, payment.currency)}, pero la reserva ya no estaba vigente. Escribile a {session.organizer_name} para resolverlo.</Text> : null}
        {payment.kind === "hold" ? <>
          <Text style={ui.body}>Total: {formatMoney(payment.amount, payment.currency)}</Text>
          <Button label={checkout.isPending ? "Abriendo el pago…" : "Pagar con Mercado Pago"} disabled={busy || holdLeft <= 0}
            onPress={() => void checkout.mutateAsync(payment.orderId).catch(() => {})} />
          <Text style={ui.muted}>El pago va directo a la cuenta de {session.organizer_name}. Cuando se acredite, la sesión se confirma sola. {NO_REFUND_NOTE}</Text>
        </> : null}
        {payment.kind === "refunded" ? <Text style={ui.body}>{formatMoney(payment.amount, payment.currency)} · Pago reintegrado.</Text> : null}
        {payment.kind === "pay" ? <>
          <Text style={ui.body}>Total: {formatMoney(payment.amount, payment.currency)}</Text>
          <Button label={checkout.isPending ? "Abriendo el pago…" : "Pagar"} disabled={busy}
            onPress={() => void checkout.mutateAsync(payment.orderId).catch(() => {})} />
          <Text style={ui.muted}>El pago se hace con Mercado Pago en una ventana segura y va directo a la cuenta de {session.organizer_name}. Cuando lo acrediten, lo vas a ver acá. {NO_REFUND_NOTE}</Text>
        </> : null}
        {checkout.isError ? <Text accessibilityRole="alert" style={ui.body}>{checkout.error instanceof Error ? checkout.error.message : "No pudimos abrir el pago."}</Text> : null}
      </View>

      {whatsapp ? <Button secondary label="Escribir por WhatsApp" onPress={() => void Linking.openURL(whatsapp).catch(() => {})} /> : null}
      {cancellable && awaiting !== "student" ? <Button secondary label={payment.kind === "hold" ? "Cancelar reserva" : "Cancelar sesión"} disabled={busy} onPress={() => setPending("cancel")} /> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text> : null}
      {mutation.isError ? <Text accessibilityRole="alert" style={ui.body}>{sessionError(mutation.error)}</Text> : null}
      <Button secondary label="Ver mis reservas" onPress={() => nav.navigate("Tab", { screen: "ClassesTab", params: { section: "mine" } })} />

      <AnimatedSheetModal visible={pending !== null} onClose={() => { if (!mutation.isPending) setPending(null); }}
        closeOnBackdropPress={!mutation.isPending} sheetStyle={[ui.sheet, { paddingBottom: Math.max(insets.bottom, ds.spacing[6]) }]}>
        <Text style={ui.title}>{pending === "decline" ? "Rechazar sesión" : "Cancelar sesión"}</Text>
        <Text style={ui.body}>Vas a liberar el horario de {session.title} con {session.organizer_name}.{payment.kind === "paid" || payment.kind === "offline_paid" || payment.kind === "hold" ? ` ${NO_REFUND_NOTE}` : ""}</Text>
        <Button label={mutation.isPending ? "Guardando…" : pending === "decline" ? "Rechazar sesión" : "Confirmar cancelación"} disabled={mutation.isPending}
          onPress={() => pending === "decline" ? run({ action: "decline", id: session.id }, "Rechazaste la sesión.") : run({ action: "cancel", id: session.id }, "Cancelaste la sesión.")} />
        <Button secondary label="Volver" disabled={mutation.isPending} onPress={() => setPending(null)} />
      </AnimatedSheetModal>
    </>
  );
}

const s = StyleSheet.create({
  block: { gap: ds.spacing[2] },
  label: { ...ds.textStyles.label, color: ds.colors.text.secondary },
  pill: { alignSelf: "flex-start", paddingHorizontal: ds.spacing[2], paddingVertical: ds.spacing[1], borderRadius: ds.radii.pill, backgroundColor: ds.colors.feedback.infoBg },
  pillPending: { backgroundColor: ds.colors.bg.selected },
  pillText: { ...ds.textStyles.caption, color: ds.colors.text.primary },
});
