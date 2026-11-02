import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "../Typography";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { reservationDates, reservationMonths, reservationWeekday, reservationDateLabel, WEEKDAYS, RESERVATION_TIMEZONE, type ReservationSource } from "../../src/learning/reservations";
import { useReservationRequests } from "../../src/learning/reservationQueries";
import { Button, Chips, useLearningAction, ui } from "./LearningUI";
import Icon from "../Icon";
import AnimatedSheetModal from "../AnimatedSheetModal";
import * as ds from "../../src/theme/tokens";
const c = vibesTheme.colors;
function ReservationSelect({ label, options, value, onChange }: { label:string; options:{id:string;label:string}[];value:string|null;onChange:(value:string)=>void }) {
  const [open,setOpen]=useState(false);
  return <View style={{gap:ds.spacing[1]}}><Text style={s.label}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label}: ${options.find(option=>option.id===value)?.label ?? "Seleccionar"}`} accessibilityState={{expanded:open}} onPress={()=>setOpen(true)} style={s.select}>
      <Text style={[ui.body,{flex:1}]}>{options.find(option=>option.id===value)?.label ?? "Seleccionar"}</Text><Icon name="chevron-down" size={ds.iconSize.md} color={c.primaryText}/>
    </TouchableOpacity>
    <AnimatedSheetModal visible={open} onClose={()=>setOpen(false)} sheetStyle={{backgroundColor:c.surface,borderTopLeftRadius:ds.radii.xl,borderTopRightRadius:ds.radii.xl,padding:ds.spacing[6],maxHeight:"75%"}}>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Text style={ui.title}>{label}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar selector" onPress={()=>setOpen(false)} style={{padding:ds.spacing[3]}}><Icon name="close" size={ds.iconSize.lg} color={c.primaryText}/></TouchableOpacity></View>
      <ScrollView>{options.map(option=><TouchableOpacity key={option.id} accessibilityRole="radio" accessibilityState={{checked:value===option.id}} onPress={()=>{onChange(option.id);setOpen(false);}} style={s.select}><Text style={[ui.body,{flex:1}]}>{option.label}</Text>{value===option.id && <Icon name="checkmark" size={ds.iconSize.md} color={c.primaryText}/>}</TouchableOpacity>)}</ScrollView>
    </AnimatedSheetModal>
  </View>;
}
export default function ClassReservationPanel({ source }: { source: ReservationSource }) {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const timezone = source.timezone ?? RESERVATION_TIMEZONE;
  const months = reservationMonths(Date.now(), timezone);
  const [mode, setMode] = useState("single");
  const [month, setMonth] = useState(months[0]);
  const [days, setDays] = useState<number[]>([]);
  const [single, setSingle] = useState("");
  const requests = useReservationRequests();
  const action = useLearningAction();
  const dates = reservationDates(source, month);
  const weekdays = [...new Set(dates.map(iso => reservationWeekday(iso, timezone)))].sort((a,b) => a-b);
  const selectedDays = days.length ? weekdays.filter(day => days.includes(day)) : weekdays;
  const selected = mode === "single" ? dates.filter(iso => iso === single) : dates.filter(iso => selectedDays.includes(reservationWeekday(iso, timezone)));
  const existing = (requests.data ?? []).filter(request => request.source_id === source.id && request.status === "pending_confirmation" && request.starts_at.some(iso => Date.parse(iso) > Date.now()));
  return <View style={s.section}>
    <Text accessibilityRole="header" style={s.heading}>¿Cómo querés participar?</Text>
    <Chips value={mode} onChange={setMode} options={[{value:"single",label:"Clase suelta"},{value:"monthly",label:"Plan mensual"}]} />
    <ReservationSelect label="Mes" options={months.map(value => ({ id: value, label: new Date(value+"T12:00:00Z").toLocaleDateString("es-AR", {month:"long",year:"numeric",timeZone:"UTC"}) }))} value={month} onChange={value => { if(value) { setMonth(value); setSingle(""); setDays([]); } }} />
    {mode === "monthly" ? <>
      <View style={{gap:ds.spacing[1]}}><Text style={s.label}>Frecuencia</Text>
      <Chips value={days.length ? days.join(",") : "all"} onChange={value => setDays(value === "all" ? [] : [Number(value)])} options={[...weekdays.map(day => ({value:String(day),label:`Solo ${WEEKDAYS[day].toLowerCase()}`})),{value:"all",label:weekdays.length > 2 ? "Todos los días" : "Todos"}]} /></View>
      <View style={s.summary}>
        <Text style={s.summaryTitle}>{selected.length} {selected.length === 1 ? "clase incluida" : "clases incluidas"}</Text>
        <View style={s.dates}>{selected.map(iso => <View key={iso} style={s.date}><Text style={s.dateLabel}>{new Date(iso).toLocaleDateString("es-AR",{timeZone:timezone,weekday:"short",day:"numeric"})}</Text></View>)}</View>
        <Text style={s.hint}>Fechas sujetas a confirmación del organizador.</Text>
      </View>
    </> : <ReservationSelect label="Elegí una fecha" options={dates.map(iso => ({id:iso,label:reservationDateLabel(iso,timezone)}))} value={single || null} onChange={value => setSingle(value ?? "")} />}
    {!dates.length && <Text style={ui.muted}>No hay fechas disponibles para este mes.</Text>}
    <Text style={s.hint}>Sin cobros. La solicitud no se envía al organizador: contactalo para confirmar tu cupo. Tendrás acceso al chat de la clase.</Text>
    <Button label={action.pending ? "Guardando…" : mode === "monthly" ? "Solicitar reserva del mes" : "Solicitar reserva de clase"} disabled={!selected.length || action.pending || requests.isLoading || requests.isError} onPress={() => action.confirm({
      name: "request_reservation", args: { p_source: source.id, p_mode: mode, p_month: month, p_days: mode === "single" ? [reservationWeekday(single,timezone)] : selectedDays, p_single: mode === "single" ? single : null },
      text: `Vas a guardar una solicitud por ${selected.length} ${selected.length === 1 ? "clase" : "clases"}. Queda pendiente de confirmación con el organizador. No se realiza ningún cobro.`,
      success: "Solicitud guardada en Mis clases. Contactá al organizador para confirmar disponibilidad y cupo.",
    })} />
    {requests.isError && <Button secondary label="Reintentar cargar mis solicitudes" onPress={() => void requests.refetch()} />}
    {existing.length > 0 && <Button secondary label="Ver chat de la clase" disabled={action.pending} onPress={() => {
      void action.run("class_chat", {p_source:source.id}, "Chat de la clase disponible.", groupId => {
        void queryClient.invalidateQueries({queryKey:["communityGroups"]});
        navigation.navigate("CommunityGroupChat",{groupId:String(groupId),name:existing[0].title,description:"Solicitudes pendientes: el chat no confirma cupo."});
      });
    }} />}
    {existing.map(request => <View key={request.id} style={s.summary}>
      <Text style={s.summaryTitle}>Solicitud pendiente de confirmación</Text>
      <Text style={ui.body}>{request.mode === "monthly" ? "Plan mensual" : "Clase suelta"} · {request.starts_at.length} {request.starts_at.length === 1 ? "fecha" : "fechas"}</Text>
      <View style={s.dates}>{request.starts_at.map(iso => <View key={iso} style={s.date}><Text style={s.dateLabel}>{reservationDateLabel(iso,timezone)}</Text></View>)}</View>
      <Button secondary label="Cancelar solicitud" disabled={action.pending} onPress={() => action.confirm({name:"cancel_reservation_request",args:{p_id:request.id},text:"Vas a cancelar esta solicitud y todas sus fechas.",success:"Solicitud cancelada."})} />
    </View>)}
    {action.elements}
  </View>;
}
const s = StyleSheet.create({
  select:{flexDirection:"row",alignItems:"center",gap:ds.spacing[2],paddingHorizontal:ds.spacing[3],paddingVertical:ds.spacing[3],minHeight:48,borderRadius:ds.radii.lg,borderWidth:1,borderColor:ds.colors.border.default,marginBottom:0},
  heading:{...ds.textStyles.heading,color:c.primaryText},
  hint:{...ds.textStyles.bodySmall,color:c.secondaryText},
  section: { gap:ds.spacing[3] }, label: {...ds.textStyles.label,color:c.primaryText},
  summary: {padding:ds.spacing[3],gap:ds.spacing[2],borderRadius:ds.radii.lg,backgroundColor:ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle)},
  summaryTitle:{...ds.textStyles.subtitle,color:c.primaryText},
  dates:{flexDirection:"row",flexWrap:"wrap",gap:ds.spacing[2]},date:{minWidth:"29%",flexGrow:1,alignItems:"center",padding:ds.spacing[2],borderRadius:ds.radii.md,backgroundColor:c.surface,borderWidth:1,borderColor:c.borderSoft},
  dateLabel:{...ds.textStyles.bodySmall,color:c.primaryText},
});
