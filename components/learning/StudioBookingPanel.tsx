import React, { useState } from "react";
import { Switch, View } from "react-native";
import { Text } from "../Typography";
import AnimatedSheetModal from "../AnimatedSheetModal";
import { Button, Chips, Empty, ui } from "./LearningUI";
import { LearningActionDock } from "./LearningActionDock";
import { useStudioStudentQuery, useStudioStudentMutation } from "../../src/learning/studioStudentQueries";
import { studioStudentError } from "../../src/learning/studioStudent";
import * as ds from "../../src/theme/tokens";
export default function StudioBookingPanel({activityId,initialSessionId}:{activityId:string;initialSessionId?:string}) {
  const query=useStudioStudentQuery();
  const mutation=useStudioStudentMutation();
  const [sessionId,setSessionId]=useState(initialSessionId??"");
  const [waitlist,setWaitlist]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [notice,setNotice]=useState("");
  const activity=query.data?.activities.find(item=>item.id===activityId);
  if(query.isLoading) return <Text style={ui.muted}>Cargando encuentros…</Text>;
  if(query.isError) return <><Text style={ui.muted}>{studioStudentError(query.error)}</Text><Button secondary label="Reintentar" onPress={()=>void query.refetch()} /></>;
  if(!activity) return <Empty text="Esta clase no está disponible en la nueva agenda." />;
  const sessions=query.data!.sessions.filter(item=>item.activity_id===activityId&&Date.parse(item.starts_at)>Date.now());
  const selected=sessions.find(item=>item.id===sessionId);
  const label=(iso:string)=>new Date(iso).toLocaleString("es-AR",{timeZone:activity.timezone,weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  const existing=query.data!.bookings.find(item=>item.session_id===sessionId&&item.status!=="cancelled");
  return <View style={{gap:ds.spacing[4]}}>
    <Text style={ui.title}>{activity.title}</Text>
    <Text style={ui.body}>Elegí un encuentro</Text>
    <Chips value={sessionId} onChange={id=>{setSessionId(id);setNotice("");}} options={sessions.map(item=>({value:item.id,label:label(item.starts_at)}))} />
    {selected ? <Text style={ui.body}>{label(selected.starts_at)}–{new Date(selected.ends_at).toLocaleTimeString("es-AR",{timeZone:activity.timezone,hour:"2-digit",minute:"2-digit"})}</Text> : null}
    {!sessions.length ? <Empty text="No hay próximos encuentros disponibles." /> : null}
    <Text style={ui.muted}>{Number(activity.price)>0 ? "Esta reserva utiliza un crédito de un pack vigente de este estudio. No se realizan cobros desde la app." : "Este encuentro es gratuito."}</Text>
    <Text style={ui.muted}>Podés cancelar hasta {activity.cancellation_hours} horas antes del inicio. La devolución de crédito se aplica según las reglas del estudio.</Text>
    {activity.waitlist_enabled ? <View style={ui.row}><View style={ui.grow}><Text style={ui.body}>Sumarme a la lista de espera si no hay cupo</Text></View><Switch accessibilityLabel="Aceptar lista de espera si no hay cupo" value={waitlist} onValueChange={setWaitlist} trackColor={{false:ds.colors.bg.subtle,true:ds.colors.base.mustard}} thumbColor={ds.colors.bg.surface} /></View> : null}
    {existing ? <Text style={ui.body}>{existing.status==="waitlist" ? "Ya estás en lista de espera para este encuentro." : "Ya tenés una reserva confirmada para este encuentro."}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text> : null}
    {mutation.isError ? <Text accessibilityRole="alert" style={ui.body}>{studioStudentError(mutation.error)}</Text> : null}
    <LearningActionDock><Button label="Reservar encuentro" disabled={!selected||!!existing||mutation.isPending} onPress={()=>setConfirm(true)} /></LearningActionDock>
    <AnimatedSheetModal visible={confirm} onClose={()=>{if(!mutation.isPending)setConfirm(false);}} closeOnBackdropPress={!mutation.isPending} sheetStyle={ui.sheet}>
      <Text style={ui.title}>Confirmar reserva</Text><Text style={ui.body}>{selected ? label(selected.starts_at) : ""}{waitlist ? ". Si no hay cupo, te sumás a la lista de espera." : ". La reserva está sujeta a disponibilidad."}</Text>
      <Button label={mutation.isPending?"Reservando…":"Confirmar"} disabled={!selected||mutation.isPending} onPress={()=>{if(!selected)return;void mutation.mutateAsync({action:"book",id:selected.id,data:{waitlist:activity.waitlist_enabled&&waitlist}}).then(()=>{setConfirm(false);setNotice("Revisá Mis reservas para ver si quedó confirmada o en espera.");}).catch(()=>setConfirm(false));}} />
      <Button secondary label="Volver" disabled={mutation.isPending} onPress={()=>setConfirm(false)} />
    </AnimatedSheetModal>
  </View>;
}
