import StudioStudentScreen from "./StudioStudent";
import { studioStudentEnabled } from "../src/learning/studioStudent";
import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Page, LearningGate, Button, Chips, Empty, useLearningAction } from "../components/learning/LearningUI";
import { Text } from "../components/Typography";
import Icon from "../components/Icon";
import { useLearningData } from "../src/learning/queries";
import { useReservationRequests } from "../src/learning/reservationQueries";
import { studentAgenda, isUpcomingStudentMeeting, type StudentMeeting } from "../src/learning/studentAgenda";
import { wallDate } from "../src/learning/utils";
import { useLocalDay } from "../src/hooks/useLocalDay";
import * as ds from "../src/theme/tokens";
const statusLabels = {confirmed:"Reserva confirmada",pending:"Pendiente de confirmación",cancelled:"Cancelada"};
export default function LearningStudentScreen() {
  return studioStudentEnabled ? <StudioStudentScreen /> : <LegacyLearningStudentScreen />;
}
export function LegacyLearningStudentScreen() {
  const query = useLearningData();
  const requests = useReservationRequests();
  const navigation = useNavigation<any>();
  const action = useLearningAction();
  const [tab,setTab] = useState("agenda");
  const [day,setDay] = useState("");
  const today = useLocalDay();
  const meetings = useMemo(() => query.data ? studentAgenda(query.data,requests.data ?? []) : [],[query.data,requests.data]);
  const upcoming = meetings.filter(meeting => isUpcomingStudentMeeting(meeting));
  const days = [...new Set(upcoming.map(meeting => wallDate(meeting.startsAt,meeting.timezone).slice(0,10)))].sort();
  const selectedDay = days.includes(day) ? day : days[0] ?? today;
  const shown = tab === "history" ? meetings.filter(meeting => !isUpcomingStudentMeeting(meeting)).reverse() : tab === "reservations" ? upcoming : upcoming.filter(meeting => wallDate(meeting.startsAt,meeting.timezone).slice(0,10) === selectedDay);
  const openMeeting = (meeting: StudentMeeting) => navigation.navigate(meeting.sourceId.startsWith("clase_") ? "ExternalCatalogDetail" : "LearningActivity",{id:meeting.sourceId});
  return <Page title="Mis clases"><LearningGate query={query}>{() => <>
    <View style={s.summary}><Text style={s.summaryTitle}>Tu próxima práctica</Text><Text style={s.body}>{upcoming[0]?.title ?? "Elegí una clase para empezar"}</Text>
      {upcoming[0] ? <Text style={s.meta}>{new Date(upcoming[0].startsAt).toLocaleString("es-AR",{timeZone:upcoming[0].timezone,weekday:"long",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · {statusLabels[upcoming[0].status]}</Text> : null}
    </View>
    <Chips value={tab} onChange={setTab} options={[{value:"agenda",label:"Agenda"},{value:"reservations",label:"Mis reservas"},{value:"history",label:"Historial"}]} />
    {requests.isLoading ? <Text style={s.meta}>Cargando tus solicitudes…</Text> : null}
    {requests.isError ? <View style={s.notice}><Text style={s.meta}>No pudimos actualizar tus solicitudes.</Text><Button secondary label="Reintentar" onPress={() => void requests.refetch()} /></View> : null}
    {tab === "agenda" && days.length ? <Chips value={selectedDay} onChange={setDay} options={days.map(value => ({value,label:new Date(value+"T12:00:00").toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"})}))} /> : null}
    {shown.map(meeting => <View key={meeting.id} style={s.card}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver ${meeting.title}`} onPress={() => openMeeting(meeting)} style={s.row}>
        <View style={s.date}><Text style={s.dateDay}>{new Date(meeting.startsAt).toLocaleDateString("es-AR",{timeZone:meeting.timezone,day:"numeric"})}</Text><Text style={s.meta}>{new Date(meeting.startsAt).toLocaleDateString("es-AR",{timeZone:meeting.timezone,month:"short"})}</Text></View>
        <View style={s.copy}><Text style={s.name}>{meeting.title}</Text><Text style={s.meta}>{new Date(meeting.startsAt).toLocaleTimeString("es-AR",{timeZone:meeting.timezone,hour:"2-digit",minute:"2-digit"})}{meeting.endsAt ? `–${new Date(meeting.endsAt).toLocaleTimeString("es-AR",{timeZone:meeting.timezone,hour:"2-digit",minute:"2-digit"})}` : ""}</Text>{meeting.location ? <Text style={s.meta}>{meeting.location}</Text> : null}</View>
        <Icon name="chevron-forward" size={ds.iconSize.md} color={ds.colors.icon.default} />
      </TouchableOpacity>
      <View style={[s.status,meeting.status === "pending" ? s.pending : null]}><Text style={s.statusText}>{statusLabels[meeting.status]}</Text></View>
      {meeting.requestId && isUpcomingStudentMeeting(meeting) ? <Button secondary label="Cancelar solicitud" disabled={action.pending} onPress={() => action.confirm({name:"cancel_reservation_request",args:{p_id:meeting.requestId},text:"Se cancelará esta solicitud y todas las fechas incluidas en ella.",success:"Solicitud cancelada."})} /> : null}
    </View>)}
    {!shown.length && !requests.isLoading ? <Empty text={tab === "history" ? "Todavía no hay encuentros en tu historial." : "No tenés encuentros reservados para esta selección."} /> : null}
    <Button secondary label="Explorar clases" onPress={() => navigation.navigate("LearningExplore")} />
    {action.elements}
  </>}</LearningGate></Page>;
}
const s=StyleSheet.create({
  summary:{padding:ds.spacing[4],gap:ds.spacing[2],borderRadius:ds.radii.xl,backgroundColor:ds.colors.bg.selected}, summaryTitle:{...ds.textStyles.heading,color:ds.colors.text.primary},body:{...ds.textStyles.body,color:ds.colors.text.primary},meta:{...ds.textStyles.bodySmall,color:ds.colors.text.secondary},
  notice:{gap:ds.spacing[2]},card:{borderWidth:1,borderColor:ds.colors.border.default,borderRadius:ds.radii.lg,padding:ds.spacing[3],gap:ds.spacing[3],backgroundColor:ds.colors.bg.surface},row:{flexDirection:"row",alignItems:"center",gap:ds.spacing[3]},date:{width:48,minHeight:56,alignItems:"center",justifyContent:"center",borderRadius:ds.radii.md,backgroundColor:ds.colors.bg.subtle},dateDay:{...ds.textStyles.heading,color:ds.colors.text.primary},copy:{flex:1,gap:ds.spacing[1]},name:{...ds.textStyles.subtitle,color:ds.colors.text.primary},status:{alignSelf:"flex-start",paddingHorizontal:ds.spacing[2],paddingVertical:ds.spacing[1],borderRadius:ds.radii.pill,backgroundColor:ds.colors.feedback.infoBg},pending:{backgroundColor:ds.colors.bg.selected},statusText:{...ds.textStyles.caption,color:ds.colors.text.primary},
});
