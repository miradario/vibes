import React, { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/Typography";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { Button, Chips, Empty, Page, Photo, ui } from "../components/learning/LearningUI";
import { bannerStyles, cardStyles } from "../components/ui/surfaceStyles";
import { useSesionesEnabled } from "../src/featureFlags/useSesionesEnabled";
import {
  bookableDays, formatMoney, NO_REFUND_NOTE, PAYMENT_METHOD_LABELS, REQUEST_TIMES, requestDays, SESSION_DURATIONS,
  sessionDayLabel, sessionError, servicePricing, sessionTime, sessionWhen, startOptions, toISO, whatsappLink,
  type AvailabilityWindow, type ServicePricing, type SessionPaymentMethod,
} from "../src/sessions/sessions";
import { findReservedBooking, type BookSessionResult } from "../src/sessions/sessionsApi";
import { useOrganizerAvailability, useOrganizerContact, useProfessionals, useServicePricing, useSessionMutation } from "../src/sessions/sessionsQueries";
import * as ds from "../src/theme/tokens";

type Draft = { availabilityId: string; startsAt: string; duration: number; outside: boolean; pricing: ServicePricing | null; method: SessionPaymentMethod | null };
const serviceKey = (item: Pick<AvailabilityWindow, "title" | "location">) => `${item.title}\u0000${item.location}`;

export default function ProfessionalDetailScreen() {
  const params = useRoute().params as { id?: string } | undefined;
  const id = typeof params?.id === "string" ? params.id : "";
  const enabled = useSesionesEnabled();
  const professionals = useProfessionals();
  const profile = professionals.data?.find((item) => item.id === id);
  if (!enabled) return <Page title="Profesional"><Empty text="Las sesiones no están disponibles por el momento." /></Page>;
  return (
    <Page title="Profesional">
      {professionals.isLoading ? <Text style={ui.muted}>Cargando perfil…</Text> : null}
      {professionals.isError ? <View style={[ui.notice, ui.error]}><Text accessibilityRole="alert" style={ui.body}>{sessionError(professionals.error)}</Text><Button secondary label="Reintentar" onPress={() => void professionals.refetch()} /></View> : null}
      {professionals.data && !profile ? <Empty text="Este perfil no está disponible." /> : null}
      {profile ? <>
        <View style={ui.row}>
          <Photo key={profile.image_url} url={profile.image_url} />
          <View style={ui.grow}>
            <Text accessibilityRole="header" style={ui.heading}>{profile.name}</Text>
            {profile.specialties.length ? <Text style={ui.muted}>{profile.specialties.join(" · ")}</Text> : null}
            {profile.location ? <Text style={ui.muted}>{profile.location}</Text> : null}
          </View>
        </View>
        {profile.description ? <Text style={ui.body}>{profile.description}</Text> : null}
        <Booking organizerId={profile.id} organizerName={profile.name} />
      </> : null}
    </Page>
  );
}

function Booking({ organizerId, organizerName }: { organizerId: string; organizerName: string }) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const availability = useOrganizerAvailability(organizerId);
  const contact = useOrganizerContact(organizerId);
  const pricingQuery = useServicePricing(organizerId);
  const mutation = useSessionMutation();
  const [method, setMethod] = useState<SessionPaymentMethod | "">("");
  const [service, setService] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [day, setDay] = useState("");
  const [start, setStart] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDay, setRequestDay] = useState("");
  const [requestTime, setRequestTime] = useState("");
  const [notice, setNotice] = useState("");
  const windows = availability.data?.availability ?? [];
  const services = useMemo(() => {
    const map = new Map<string, AvailabilityWindow>();
    for (const item of [...(availability.data?.services ?? []), ...windows]) if (item.organizer_id === organizerId && !map.has(serviceKey(item))) map.set(serviceKey(item), item);
    return [...map.values()];
  }, [availability.data, organizerId, windows]);
  const selected = services.find((item) => serviceKey(item) === service) ?? services[0];
  const days = selected ? bookableDays(windows, selected, duration) : [];
  const activeDay = days.includes(day) ? day : days[0] ?? "";
  const starts = selected && activeDay ? startOptions(windows, selected, activeDay, duration) : [];
  const activeStart = starts.find((item) => item.startsAt === start) ?? null;
  // null: no price set (or backend not deployed yet) → payment coordinated with the facilitator.
  const pricing = pricingQuery.data?.supported ? servicePricing(pricingQuery.data.services, selected) : null;
  const priced = !!pricing && pricing.price > 0;
  const methods = priced ? pricing.payment_methods : [];
  const activeMethod: SessionPaymentMethod | null = priced ? (methods.find((item) => item === method) ?? (methods.length === 1 ? methods[0] : null)) : null;
  const holdMinutes = pricingQuery.data?.holdMinutes ?? 15;
  // Don't book before knowing the price: a priced service must go through 'book'.
  const pricingReady = pricingQuery.isSuccess;
  const whatsapp = whatsappLink(contact.data?.whatsapp_phone, `Hola ${organizerName}, te escribo desde Vibes para consultar por una sesión.`);
  const reqDays = requestDays();
  const reqDay = reqDays.includes(requestDay) ? requestDay : reqDays[0];

  const submit = (value: Draft) => {
    setNotice("");
    // Priced services go through portal_student_sessions('book'), also for out-of-hours requests
    // (the chosen method is kept until the facilitator approves and the order is created).
    // Services without a price keep the scheduler reservation (payment coordinated).
    const priced = !!value.pricing;
    const action = priced
      ? mutation.mutateAsync({ action: "book", availabilityId: value.availabilityId, startsAt: value.startsAt, duration: value.duration, paymentMethod: value.method })
      : mutation.mutateAsync({ action: "reserve", organizerId, availabilityId: value.availabilityId, startsAt: value.startsAt, duration: value.duration });
    void action
      .then((data) => {
        setDraft(null); setRequestOpen(false); setStart("");
        const result = data as BookSessionResult;
        const bookingId = priced ? result?.booking_id : findReservedBooking(data as never, organizerId, value.startsAt)?.id;
        // Mercado Pago: open the checkout right away from the session detail (the slot is held meanwhile).
        if (bookingId) nav.navigate("SessionDetail", { id: bookingId, checkout: value.method === "mercadopago" ? result?.order_id ?? undefined : undefined });
        else setNotice(value.outside ? "Enviamos tu solicitud. Queda pendiente hasta que la confirme el facilitador." : "Listo, reservaste la sesión.");
      })
      .catch(() => setDraft(null));
  };

  return <>
    <Text accessibilityRole="header" style={ui.title}>Reservar una sesión</Text>
    {availability.isLoading ? <Text style={ui.muted}>Consultando disponibilidad…</Text> : null}
    {availability.isError ? <View style={[ui.notice, ui.error]}><Text accessibilityRole="alert" style={ui.body}>{sessionError(availability.error)}</Text><Button secondary label="Reintentar" onPress={() => void availability.refetch()} /></View> : null}
    {availability.data && !services.length ? <Text style={ui.body}>{organizerName} todavía no publicó horarios. Podés consultarle por un horario fuera de turno.</Text> : null}
    {selected ? <>
      {services.length > 1 ? <><Text style={s.label}>Servicio</Text><Chips value={serviceKey(selected)} onChange={(value) => { setService(value); setStart(""); }} options={services.map((item) => ({ value: serviceKey(item), label: item.location ? `${item.title} · ${item.location}` : item.title }))} /></> : <Text style={ui.body}>{selected.title}{selected.location ? ` · ${selected.location}` : ""}</Text>}
      <Text style={s.label}>Duración</Text>
      <Chips value={String(duration)} onChange={(value) => { setDuration(Number(value)); setStart(""); }} options={SESSION_DURATIONS.map((value) => ({ value: String(value), label: `${value} min` }))} />
      {days.length ? <>
        <Text style={s.label}>Día</Text>
        <Chips value={activeDay} onChange={(value) => { setDay(value); setStart(""); }} options={days.map((value) => ({ value, label: sessionDayLabel(value) }))} />
        <Text style={s.label}>Horario</Text>
        <View style={s.grid}><Chips value={activeStart?.startsAt ?? ""} onChange={setStart} options={starts.map((item) => ({ value: item.startsAt, label: sessionTime(item.startsAt) }))} /></View>
        <View style={[cardStyles.base, cardStyles.padding, s.block]}>
          <Text style={s.label}>Pago</Text>
          {pricingQuery.isLoading ? <Text style={ui.muted}>Consultando el precio…</Text> : null}
          {pricingQuery.isError ? <><Text accessibilityRole="alert" style={ui.body}>{sessionError(pricingQuery.error)}</Text><Button secondary label="Reintentar" onPress={() => void pricingQuery.refetch()} /></> : null}
          {pricingReady && !pricing ? <Text style={ui.body}>A coordinar con el facilitador.</Text> : null}
          {pricing && !priced ? <Text style={ui.body}>Sin cargo.</Text> : null}
          {priced ? <>
            <Text style={ui.body}>Precio: {formatMoney(pricing.price, pricing.currency)}</Text>
            {methods.length > 1 ? <Chips value={activeMethod ?? ""} onChange={(value) => setMethod(value as SessionPaymentMethod)} options={methods.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))} /> : null}
            {methods.length === 1 ? <Text style={ui.body}>Forma de pago: {PAYMENT_METHOD_LABELS[methods[0]]}</Text> : null}
            {!methods.length ? <Text style={ui.muted}>{organizerName} todavía no habilitó formas de pago. Escribile para coordinar.</Text> : null}
            {methods.length > 1 && !activeMethod ? <Text style={ui.muted}>Elegí cómo vas a pagar.</Text> : null}
            {activeMethod ? <Text style={ui.muted}>{paymentMethodHint(activeMethod, holdMinutes)}</Text> : null}
          </> : null}
        </View>
        <Button label="Reservar sesión" disabled={!activeStart || mutation.isPending || !pricingReady || (priced && !activeMethod)}
          onPress={() => activeStart && setDraft({ availabilityId: activeStart.availabilityId, startsAt: activeStart.startsAt, duration, outside: false, pricing, method: activeMethod })} />
      </> : <Text style={ui.muted}>No hay horarios libres para esta duración en las próximas semanas.</Text>}
    </> : null}

    <View style={[cardStyles.base, cardStyles.padding, s.block]}>
      <Text style={ui.body}>¿Ninguno de estos horarios te sirve?</Text>
      <Button secondary label="Consultar por horarios fuera de turno" disabled={mutation.isPending} onPress={() => { setNotice(""); setRequestOpen(true); }} />
      {whatsapp ? <Button secondary label="Escribir por WhatsApp" onPress={() => void Linking.openURL(whatsapp).catch(() => {})} /> : null}
    </View>
    {notice ? <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text> : null}
    {mutation.isError ? <Text accessibilityRole="alert" style={ui.body}>{sessionError(mutation.error)}</Text> : null}

    <AnimatedSheetModal visible={!!draft} onClose={() => { if (!mutation.isPending) setDraft(null); }} closeOnBackdropPress={!mutation.isPending}
      sheetStyle={[ui.sheet, { paddingBottom: Math.max(insets.bottom, ds.spacing[6]) }]}>
      <Text style={ui.title}>Confirmar reserva</Text>
      {draft ? <Text style={ui.body}>{selected?.title} con {organizerName}, {sessionWhen({ starts_at: draft.startsAt, ends_at: new Date(Date.parse(draft.startsAt) + draft.duration * 60000).toISOString() })}.</Text> : null}
      {draft ? <DraftPayment draft={draft} organizerName={organizerName} holdMinutes={holdMinutes} /> : null}
      <Button label={mutation.isPending ? "Reservando…" : draft?.method === "mercadopago" ? "Reservar y pagar" : "Confirmar reserva"} disabled={mutation.isPending || !draft} onPress={() => draft && submit(draft)} />
      <Button secondary label="Volver" disabled={mutation.isPending} onPress={() => setDraft(null)} />
    </AnimatedSheetModal>

    <AnimatedSheetModal visible={requestOpen} onClose={() => { if (!mutation.isPending) setRequestOpen(false); }} closeOnBackdropPress={!mutation.isPending}
      sheetStyle={[ui.sheet, { paddingBottom: Math.max(insets.bottom, ds.spacing[6]) }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetContent}>
        <Text style={ui.title}>Consultar fuera de turno</Text>
        {selected ? <>
          <Text style={ui.body}>Proponé día y horario. Queda pendiente hasta que {organizerName} lo confirme.</Text>
          <Text style={s.label}>Día</Text>
          <Chips value={reqDay} onChange={setRequestDay} options={reqDays.map((value) => ({ value, label: sessionDayLabel(value) }))} />
          <Text style={s.label}>Horario</Text>
          <Chips value={requestTime} onChange={setRequestTime} options={REQUEST_TIMES.map((value) => ({ value, label: value }))} />
          <Text style={s.label}>Duración</Text>
          <Chips value={String(duration)} onChange={(value) => setDuration(Number(value))} options={SESSION_DURATIONS.map((value) => ({ value: String(value), label: `${value} min` }))} />
          {priced ? <View style={s.block}>
            <Text style={s.label}>Pago</Text>
            <Text style={ui.body}>Precio: {formatMoney(pricing.price, pricing.currency)}</Text>
            {methods.length > 1 ? <Chips value={activeMethod ?? ""} onChange={(value) => setMethod(value as SessionPaymentMethod)} options={methods.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))} /> : null}
            {methods.length === 1 ? <Text style={ui.body}>Forma de pago: {PAYMENT_METHOD_LABELS[methods[0]]}</Text> : null}
            <View style={[bannerStyles.base, bannerStyles.info]}><Text style={ui.body}>No se cobra nada ahora. Si {organizerName} la confirma, vas a poder pagar{activeMethod === "mercadopago" ? " con Mercado Pago desde la sesión" : ""}. {NO_REFUND_NOTE}</Text></View>
          </View> : <View style={[bannerStyles.base, bannerStyles.info]}><Text style={ui.body}>{pricing ? "Sin cargo." : "Pago: a coordinar con el facilitador."}</Text></View>}
          <Button label={mutation.isPending ? "Enviando…" : "Enviar solicitud"} disabled={mutation.isPending || !requestTime || !pricingReady || (priced && methods.length > 1 && !activeMethod)}
            onPress={() => submit({ availabilityId: selected.id, startsAt: toISO(reqDay, requestTime), duration, outside: true, pricing, method: activeMethod })} />
        </> : <Text style={ui.body}>{organizerName} todavía no habilitó solicitudes desde la app.{whatsapp ? " Escribile por WhatsApp para coordinar." : " Volvé a intentarlo más adelante."}</Text>}
        {whatsapp ? <Button secondary label="Escribir por WhatsApp" onPress={() => void Linking.openURL(whatsapp).catch(() => {})} /> : null}
        {mutation.isError ? <Text accessibilityRole="alert" style={ui.body}>{sessionError(mutation.error)}</Text> : null}
        <Button secondary label="Volver" disabled={mutation.isPending} onPress={() => setRequestOpen(false)} />
      </ScrollView>
    </AnimatedSheetModal>
  </>;
}

function paymentMethodHint(method: SessionPaymentMethod, holdMinutes: number): string {
  if (method === "mercadopago") return `Pagás en la app con Mercado Pago. Guardamos el horario ${holdMinutes} minutos mientras pagás y la sesión se confirma sola cuando se acredita.`;
  return method === "cash" ? "Pagás en efectivo directamente al facilitador. La sesión queda confirmada al reservar." : "Pagás por transferencia directamente al facilitador. La sesión queda confirmada al reservar.";
}

/** Payment summary in the "Confirmar reserva" sheet. */
function DraftPayment({ draft, organizerName, holdMinutes }: { draft: Draft; organizerName: string; holdMinutes: number }) {
  const pricing = draft.pricing;
  if (!pricing) return <Text style={ui.muted}>El pago se coordina con el facilitador. Podés cancelar hasta que empiece la sesión.</Text>;
  if (pricing.price <= 0 || !draft.method) return <Text style={ui.muted}>Sin cargo. Podés cancelar hasta que empiece la sesión.</Text>;
  const total = formatMoney(pricing.price, pricing.currency);
  const instructions = draft.method !== "mercadopago" ? pricing.payment_instructions?.trim() : "";
  return <View style={s.block}>
    <Text style={ui.body}>Total: {total} · {PAYMENT_METHOD_LABELS[draft.method]}</Text>
    {draft.method === "mercadopago"
      ? <Text style={ui.muted}>Al confirmar abrimos Mercado Pago. El horario queda guardado {holdMinutes} minutos: si el pago no se acredita en ese tiempo, se libera. El pago va directo a la cuenta de {organizerName}.</Text>
      : <Text style={ui.muted}>Le pagás a {organizerName} {draft.method === "cash" ? "en efectivo" : "por transferencia"}; en la app no se cobra nada.</Text>}
    {instructions ? <Text style={ui.muted}>{instructions}</Text> : null}
    <Text style={ui.muted}>Podés cancelar hasta que empiece la sesión. {NO_REFUND_NOTE}</Text>
  </View>;
}

const s = StyleSheet.create({
  label: { ...ds.textStyles.label, color: ds.colors.text.secondary },
  block: { gap: ds.spacing[2] },
  grid: { gap: ds.spacing[2] },
  sheetContent: { gap: ds.spacing[4] },
});
