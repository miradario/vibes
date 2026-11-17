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
  bookableDays, REQUEST_TIMES, requestDays, SESSION_DURATIONS, sessionDayLabel, sessionError, sessionTime,
  sessionWhen, startOptions, toISO, whatsappLink, type AvailabilityWindow,
} from "../src/sessions/sessions";
import { findReservedBooking } from "../src/sessions/sessionsApi";
import { useOrganizerAvailability, useOrganizerContact, useProfessionals, useSessionMutation } from "../src/sessions/sessionsQueries";
import * as ds from "../src/theme/tokens";

type Draft = { availabilityId: string; startsAt: string; duration: number; outside: boolean };
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
  const mutation = useSessionMutation();
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
  const whatsapp = whatsappLink(contact.data?.whatsapp_phone, `Hola ${organizerName}, te escribo desde Vibes para consultar por una sesión.`);
  const reqDays = requestDays();
  const reqDay = reqDays.includes(requestDay) ? requestDay : reqDays[0];

  const submit = (value: Draft) => {
    setNotice("");
    void mutation.mutateAsync({ action: "reserve", organizerId, availabilityId: value.availabilityId, startsAt: value.startsAt, duration: value.duration })
      .then((data) => {
        setDraft(null); setRequestOpen(false); setStart("");
        const booking = findReservedBooking(data as never, organizerId, value.startsAt);
        if (booking) nav.navigate("SessionDetail", { id: booking.id });
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
          <Text style={ui.body}>A coordinar con el facilitador.</Text>
        </View>
        <Button label="Reservar sesión" disabled={!activeStart || mutation.isPending}
          onPress={() => activeStart && setDraft({ availabilityId: activeStart.availabilityId, startsAt: activeStart.startsAt, duration, outside: false })} />
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
      <Text style={ui.muted}>El pago se coordina con el facilitador. Podés cancelar hasta que empiece la sesión.</Text>
      <Button label={mutation.isPending ? "Reservando…" : "Confirmar reserva"} disabled={mutation.isPending || !draft} onPress={() => draft && submit(draft)} />
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
          <View style={[bannerStyles.base, bannerStyles.info]}><Text style={ui.body}>Pago: a coordinar con el facilitador.</Text></View>
          <Button label={mutation.isPending ? "Enviando…" : "Enviar solicitud"} disabled={mutation.isPending || !requestTime}
            onPress={() => submit({ availabilityId: selected.id, startsAt: toISO(reqDay, requestTime), duration, outside: true })} />
        </> : <Text style={ui.body}>{organizerName} todavía no habilitó solicitudes desde la app.{whatsapp ? " Escribile por WhatsApp para coordinar." : " Volvé a intentarlo más adelante."}</Text>}
        {whatsapp ? <Button secondary label="Escribir por WhatsApp" onPress={() => void Linking.openURL(whatsapp).catch(() => {})} /> : null}
        {mutation.isError ? <Text accessibilityRole="alert" style={ui.body}>{sessionError(mutation.error)}</Text> : null}
        <Button secondary label="Volver" disabled={mutation.isPending} onPress={() => setRequestOpen(false)} />
      </ScrollView>
    </AnimatedSheetModal>
  </>;
}

const s = StyleSheet.create({
  label: { ...ds.textStyles.label, color: ds.colors.text.secondary },
  block: { gap: ds.spacing[2] },
  grid: { gap: ds.spacing[2] },
  sheetContent: { gap: ds.spacing[4] },
});
